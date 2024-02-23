"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const signing_1 = require("./signing");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const io = __importStar(require("./io-utils"));
async function run() {
    try {
        if (process.env.DEBUG_ACTION === 'true') {
            core.debug("DEBUG FLAG DETECTED, SHORTCUTTING ACTION.");
            return;
        }
        const releaseDir = core.getInput('releaseDirectory');
        const signingKeyBase64 = core.getInput('signingKeyBase64');
        const alias = core.getInput('alias');
        const keyStorePassword = core.getInput('keyStorePassword');
        const keyPassword = core.getInput('keyPassword');
        console.log(`Preparing to sign key @ ${releaseDir} with signing key`);
        // 1. Find release files
        const releaseFiles = io.findReleaseFiles(releaseDir);
        if (releaseFiles !== undefined && releaseFiles.length !== 0) {
            // 3. Now that we have a release files, decode and save the signing key
            const signingKey = path_1.default.join(releaseDir, 'signingKey.jks');
            fs_1.default.writeFileSync(signingKey, signingKeyBase64, 'base64');
            // 4. Now zipalign and sign each one of the the release files
            let signedReleaseFiles = [];
            let index = 0;
            for (let releaseFile of releaseFiles) {
                core.debug(`Found release to sign: ${releaseFile.name}`);
                const releaseFilePath = path_1.default.join(releaseDir, releaseFile.name);
                let signedReleaseFile = '';
                if (releaseFile.name.endsWith('.apk')) {
                    signedReleaseFile = await (0, signing_1.signApkFile)(releaseFilePath, signingKey, alias, keyStorePassword, keyPassword);
                }
                else if (releaseFile.name.endsWith('.aab')) {
                    signedReleaseFile = await (0, signing_1.signAabFile)(releaseFilePath, signingKey, alias, keyStorePassword, keyPassword);
                }
                else {
                    core.error('No valid release file to sign, abort.');
                    core.setFailed('No valid release file to sign.');
                }
                // replace all \ with /
                signedReleaseFile = signedReleaseFile.replaceAll('\\', '/');
                // Each signed release file is stored in a separate variable + output.
                core.exportVariable(`SIGNED_RELEASE_FILE_${index}`, signedReleaseFile);
                core.setOutput(`signedReleaseFile${index}`, signedReleaseFile);
                signedReleaseFiles.push(signedReleaseFile);
                console.log(`RFN: _ ${releaseFile.name} _`);
                console.log(`SFN: _ ${signedReleaseFile} _`);
                ++index;
            }
            // All signed release files are stored in a merged variable + output.
            core.exportVariable(`SIGNED_RELEASE_FILES`, signedReleaseFiles.join(":"));
            core.setOutput('signedReleaseFiles', signedReleaseFiles.join(":"));
            core.exportVariable(`NOF_SIGNED_RELEASE_FILES`, `${signedReleaseFiles.length}`);
            core.setOutput(`nofSignedReleaseFiles`, `${signedReleaseFiles.length}`);
            // When there is one and only one signed release file, stoire it in a specific variable + output.
            if (signedReleaseFiles.length == 1) {
                core.exportVariable(`SIGNED_RELEASE_FILE`, signedReleaseFiles[0]);
                core.setOutput('signedReleaseFile', signedReleaseFiles[0]);
            }
            console.log('Releases signed!');
            console.log(signedReleaseFiles.join(":"));
        }
        else {
            core.error("No release files (.apk or .aab) could be found. Abort.");
            core.setFailed('No release files (.apk or .aab) could be found.');
        }
    }
    catch (error) {
        core.setFailed(error.message);
    }
}
run();
