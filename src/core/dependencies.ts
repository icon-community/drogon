import axios from 'axios';
var shell = require('shelljs');
import * as path from 'path';
import * as fs from 'fs';
import * as zlib from 'zlib';
var tar = require('tar');
import signale from 'signale';

import { DROGON_CONFIG_FOLDER, KURTOSIS_RELEASES_VERSION, DIVE_RELEASES_VERSION, DIVE_CLI, DIVE_CLI_REPO, KURTOSIS_CLI, KURTOSIS_CLI_REPO, DROGON_IMAGE } from '../constants';
import { getDIVEContainerId, mountAndRunCommandInContainerAsync, runAContainerInBackground, stopContainerWithName } from '../helpers/docker';
import { getContainerNameForProject } from '../helpers';

async function downloadAndExtractLatestRelease(repo: string, toolName: string, version: string): Promise<void> {

    signale.pending(`Downloading ${toolName}...`);

    const os = process.platform;
    const arch = process.arch;
    const response = await axios.get(`https://api.github.com/repos/${repo}/releases/${version}`);
    const json = response.data;

    const release = json.assets.find((asset: any) => asset.name.includes(os) && asset.name.includes(arch));

    if (!release) {
        throw new Error(`No ${toolName} release found for ${os} ${arch}`);
    }

    // const latestReleaseVersion = release.name;
    const latestReleaseUrl = release.browser_download_url;
    // console.log(`Downloading ${toolName} ${latestReleaseVersion}...`);

    const tarGzFilePath = path.join(DROGON_CONFIG_FOLDER, `${toolName}.tar.gz`);
    const stream = fs.createWriteStream(tarGzFilePath);
    const res = await axios.get(latestReleaseUrl, { responseType: 'stream' });
    await new Promise((resolve, reject) => {
        res.data.pipe(stream).on('finish', resolve).on('error', reject);
    });

    console.log(`Downloaded ${toolName} tarball to ${tarGzFilePath}`);

    // Unzip the tar.gz file
    await unzipTarGz(tarGzFilePath, DROGON_CONFIG_FOLDER);
    console.log(`Extracted ${toolName} to the drogon config folder`);
    signale.success(`Downloaded ${toolName}!`);
}

const ensureCLI = async (toolName: string, repo: string, version: string): Promise<void> => {
    const result = shell.which(`${DROGON_CONFIG_FOLDER}/${toolName}`);

    if (!result) {
        console.debug(`${toolName} CLI not found. Downloading latest release...`);
        await downloadAndExtractLatestRelease(repo, toolName, version);
    }
}

const ensureKurtosisCli = () => ensureCLI(KURTOSIS_CLI, KURTOSIS_CLI_REPO, KURTOSIS_RELEASES_VERSION);
const ensureDIVECli = () => ensureCLI(DIVE_CLI, DIVE_CLI_REPO, DIVE_RELEASES_VERSION);

const ensureDrogonConfigFolder = async () => {
    if (!fs.existsSync(DROGON_CONFIG_FOLDER)) {
        fs.mkdirSync(DROGON_CONFIG_FOLDER);
    }
}

const unzipTarGz = async (source: string, destination: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        fs.createReadStream(source)
            .pipe(zlib.createGunzip())
            .pipe(tar.extract({ cwd: destination }))
            .on('error', reject)
            .on('end', resolve);
    });
}

const ensureKurtosisClean = () => {
    shell.exec(`${DROGON_CONFIG_FOLDER}/kurtosis engine clean`, { silent: true });
}
const ensureKurtosisRunning = () => {
    shell.exec(`${DROGON_CONFIG_FOLDER}/kurtosis engine start`, { silent: true });
}
const ensureDiveStopped = () => {
    shell.exec(`${DROGON_CONFIG_FOLDER}/dive clean`, { silent: true });
}
const ensureDiveRunning = async () => {
    const container_id = await getDIVEContainerId()
    if(container_id == null){
        shell.exec(`${DROGON_CONFIG_FOLDER}/dive chain icon`, { silent: false })
    }
}
const ensureGradleInDIVEContainer = async () => {
    const container_id = await getDIVEContainerId()
    if (container_id == null) {
        throw new Error("DIVE container not found");
    }
    const command = `mkdir -p /gradle && \
    wget -O gradle-5.5.1-all.zip https://services.gradle.org/distributions/gradle-5.5.1-all.zip && \
    unzip gradle-5.5.1-all.zip && \
    mv gradle-5.5.1 /gradle`
    try {
        await mountAndRunCommandInContainerAsync(container_id, [], command, true);
    } catch (error) {
        console.error("Command failed with exit code:", error);
        throw error
    }

}
const ensureGradleDaemonIsRunning = async (projectPath: string, args:any) => {
    const container = getContainerNameForProject(
        projectPath,
        DROGON_IMAGE,
        'drogon'
    );
    if (container == null) {
        await ensureGradleDaemon(projectPath, args)
    }
}

const ensureGradleDaemon = async (projectPath: string, args: any) => {
    const command = 'tail -f /dev/null';
    await runAContainerInBackground(
        projectPath,
        DROGON_IMAGE,
        args,
        command,
        'drogon'
    )

}
const stopGradleDaemon = async (projectPath: string, args: any) => {
    const container = getContainerNameForProject(
        projectPath,
        DROGON_IMAGE,
        'drogon'
    );
    const command = 'gradle --stop';
    signale.pending('Stopping Drogon daemon');
    try {
        await mountAndRunCommandInContainerAsync(container, [], command, true);
        await stopContainerWithName(container);
    } catch (error) {
        console.error("Command failed with exit code:", error);
        throw error
    }
}
export {
    ensureKurtosisCli,
    ensureDIVECli,
    ensureDiveRunning,
    ensureDiveStopped,
    ensureDrogonConfigFolder,
    ensureKurtosisClean,
    ensureKurtosisRunning,
    ensureGradleInDIVEContainer,
    ensureGradleDaemon,
    ensureGradleDaemonIsRunning,
    stopGradleDaemon
};
