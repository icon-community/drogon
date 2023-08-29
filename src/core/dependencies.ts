import axios from 'axios';
var shell = require('shelljs');
import * as path from 'path';
import * as fs from 'fs';
const { Readable } = require('stream');
const { finished } = require('stream/promises');
import * as zlib from 'zlib';
var tar = require('tar');


import { DROGON_CONFIG_FOLDER } from '../constants';

// download the latest kurtosis release based on the OS
const getLatestKurtotisRelease = async () => {
    const os = process.platform;
    const arch = process.arch;
    const response = await axios.get(
      `https://api.github.com/repos/kurtosis-tech/kurtosis-cli-release-artifacts/releases/latest`
    );
    const json = response.data;
    const release = json.assets.find((asset: any) => {
      return asset.name.includes(os) && asset.name.includes(arch);
    });
    console.log(release)
    if (!release) {
      throw new Error(
        `No kurtosis release found for ${os} ${arch}`
        );
    }
    // download the latest release
    const latestReleaseVersion = release.name;
    const latestReleaseUrl = release.browser_download_url;
    console.log(`Downloading Kurtosis ${latestReleaseVersion}...`);

    const tarGzFilePath = path.join(DROGON_CONFIG_FOLDER, 'kurtosis.tar.gz');
    const stream = fs.createWriteStream(tarGzFilePath);
    const res = await axios.get(latestReleaseUrl, { responseType: 'stream' });
    await new Promise((resolve, reject) => {
        res.data.pipe(stream)
            .on('finish', resolve)
            .on('error', reject);
    });
    console.log(`Downloaded Kurtosis tarball to ${tarGzFilePath}`);
    console.log(`Downloaded Kurtosis to the drogon config folder`);

    // Now, unzip the tar.gz file
    await unzipTarGz(tarGzFilePath, DROGON_CONFIG_FOLDER);
    console.log(`Extracted Kurtosis to the drogon config folder`);

};

// check if kurtosis cli is installed
// if not, download the latest release
const ensureKurtosisCli = async () => {
    const result = shell.which('kurtosis');
    if (!result) {
        console.debug("Kurtosis CLI not found. Downloading latest release...");
        await getLatestKurtotisRelease();
    }
};

//create a .drogon config folder on the home folder if it doesnt exist
const ensureDrogonConfigFolder = async () => {
    if (!fs.existsSync(DROGON_CONFIG_FOLDER)) {
      fs.mkdirSync(DROGON_CONFIG_FOLDER);
    }
}
async function unzipTarGz(source: string, destination: string): Promise<void> {
    return new Promise((resolve, reject) => {
        fs.createReadStream(source)
            .pipe(zlib.createGunzip())
            .pipe(tar.extract({ cwd: destination }))
            .on('error', reject)
            .on('end', resolve);
    });
}
export { ensureKurtosisCli, ensureDrogonConfigFolder }


