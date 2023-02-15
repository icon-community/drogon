import { basename, resolve } from 'path';
import prompts from 'prompts';
import * as fs from 'fs';
import {
  checkIfFileExists,
  ensureCWDDrogonProject,
  panic,
  ProgressBar,
  safeexit,
} from '../helpers';
import { mountAndRunCommand, pullImage } from '../helpers/docker';

import { DROGON_IMAGE, GOCHAIN_IMAGE, ICON_TEMPLATES_REPO } from '../constants';
import { mainBuildGradle, gradleSettings, gitignore } from './contents';
import { Config } from './config';
import { runTackle, scaffoldProject } from './scaffold';
import signale from 'signale';

export const install = async () => {
  signale.pending('Installing Drogon');
  const progressBar = new ProgressBar('Scaffolding...', 100);
  progressBar.start();

  await fetch_drogon();
  await fetch_score_image();

  progressBar.stopWithMessage('Drogon ready for use.');
  signale.success('Drogon ready for use.');
};

export const fetch_drogon = async () => {
  await pullImage(DROGON_IMAGE);
};

export const fetch_score_image = async () => {
  await pullImage(GOCHAIN_IMAGE);
};

export const createNewProject = async () => {
  const response = await prompts([
    {
      type: 'text',
      name: 'path',
      message: 'Name of the project',
    },
    {
      type: 'toggle',
      name: 'createSamples',
      initial: true,
      active: 'yes',
      inactive: 'no',
      message: 'Do you want to initialize your Drogon project with samples?',
    },
    {
      type: 'toggle',
      name: 'generateAccount',
      initial: true,
      active: 'yes',
      inactive: 'no',
      message: 'Do you want to generate a keystore for this project?',
    },
  ]);

  const projectPath = resolve(response.path);

  if (checkIfFileExists(`${projectPath}/drogon-config.json`)) {
    const response = await prompts([
      {
        type: 'toggle',
        name: 'overwrite',
        initial: false,
        active: 'yes',
        inactive: 'no',
        message:
          'Current working directory looks like a Drogon project. Do you want to overwrite all files?',
      },
    ]);

    if (response.overwrite === false) {
      safeexit();
    }
  }

  await initialiseProject(projectPath);

  if (response.createSamples) {
    const projectName = response.path;
    await runTackle(projectName, projectPath);
  }
};

export const pickABoilerplate = async () => {
  const response = await prompts([
    {
      type: 'select',
      name: 'boilerplate',
      message: 'Pick a boilerplate',
      choices: [
        { title: 'Hello World', value: 'hello-world' },
        { title: 'IRC2 Token', value: 'irc2-token' },
        { title: 'IRC3 Token', value: 'irc3-token' },
        { title: 'IRC31 Token', value: 'irc31-token' },
        { title: 'Multisig Wallet', value: 'multisig-wallet' },
        { title: 'Sample Crowdsale', value: 'sample-crowdsale' },
        { title: 'Sample Token', value: 'sample-token' },
      ],
    },
  ]);

  return response.boilerplate;
};

const initialiseProject = async (path: string) => {
  const name = basename(path);

  fs.mkdirSync(`${path}/`, { recursive: true });

  const config = Config.generateNew(name);

  fs.writeFile(
    `${path}/drogon-config.json`,
    JSON.stringify(config, null, 4),
    err => {
      if (err) panic(`Failed to create drogon-config.json. ${err}`);
    }
  );

  fs.writeFile(`${path}/.gitignore`, gitignore, err => {
    if (err) panic(`Failed to create .gitignore. ${err}`);
  });

  return name;
};

/*eslint-disable */
export const addProjectToIncludes = async (
  path: string,
  boilerplate: string
) => { };
/*eslint-disable */

const initProjectIncludes = async (path: string, boilerplate: string) => {
  const includes = `include(
        'src:${boilerplate}'
    )`;

  fs.readFile(`${path}/settings.gradle`, 'utf8', (err, data) => {
    if (err) {
      return console.log(err);
    }
    const result = data.replace(/include \(\)/g, includes);

    fs.writeFile(`${path}/settings.gradle`, result, 'utf8', err => {
      if (err) return console.log(err);
    });
  });
};

export const gradleCommands = async (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);
  signale.pending('Running gradle command');

  mountAndRunGradle(projectPath, args, (exitCode: any) => {
    signale.success('Done');
    process.exit(exitCode);
  });
};

const mountAndRunGradle = async (projectPath: string, args: any, cb: any) => {
  const command = '/goloop/gradlew --build-cache -g /goloop/app/.cache/';
  mountAndRunCommand(projectPath, args, command, cb);
}
