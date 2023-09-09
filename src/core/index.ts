import {basename, resolve} from 'path';
import prompts from 'prompts';
import * as fs from 'fs';
import {
  checkIfFileExists,
  ensureCWDDrogonProject,
  panic,
  ProgressBar,
  safeexit,
} from '../helpers';
import {
  localDrogonImageId,
  removeImage,
  mountAndRunCommand,
  pullImage,
} from '../helpers/docker';
import { ensureKurtosisCli, ensureDIVECli, ensureDrogonConfigFolder } from './dependencies';
import {DROGON_CONFIG_FOLDER, DROGON_IMAGE, ICON_TEMPLATES_REPO} from '../constants';
import {mainBuildGradle, gradleSettings, gitignore} from './contents';
import {Config} from './config';
import {runTackle, scaffoldProject} from './scaffold';
import signale from 'signale';
import {generateKeystore} from '../goloop';
var shell = require('shelljs');

export const install = async () => {
  // signale.pending('Installing Drogon...Hold tight, it might take a while!');
  // const progressBar = new ProgressBar(
  //   'Installing dependencies...Hold tight, it might take a while!...',
  //   100
  // );
  // progressBar.start();
  signale.start('Installing dependencies...Hold tight, it might take a while!...');
  await ensureDrogonConfigFolder();
  await ensureKurtosisCli();
  await ensureDIVECli()
  // await fetch_drogon();
  await initializeKurtosis();
  // await fetch_score_image();

  // progressBar.stopWithMessage('Drogon ready for use.');
  // signale.success('Drogon ready for use.');
  // process.exit();
};

export const initializeKurtosis = async () => {
  const command = `${DROGON_CONFIG_FOLDER}/kurtosis engine start`
  signale.pending('Initializing Kurtosis');
  shell.exec(command, {async:true}, (code: any) => {
    if (code !== 0) {
      signale.error('Failed to initialize Kurtosis');
    }
    else {
      signale.success('Initialized Kurtosis');
    }
  })
}

export const fetch_drogon = async () => {
  const localImage = await localDrogonImageId(DROGON_IMAGE);
  if (localImage) {
    // since we must force pull even if it exists, we should remove it from disk
    await removeImage(localImage);
  }
  await pullImage(DROGON_IMAGE);
};

export const createAccount = async (projectPath: string) => {
  const response = await prompts({
    type: 'toggle',
    name: 'generateAccount',
    message: 'Do you want to generate a keystore for this project?',
  });

  if (response.generateAccount) {
    // read password from user
    const resp = await prompts({
      type: 'password',
      name: 'password',
      message: 'Enter your password for your keystore file:',
    });

    let password = resp.password;

    if (password === undefined) password = '';
    await generateKeystore(projectPath, password, []);
  }
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
      type: prev => (prev ? 'multiselect' : null),
      name: 'sampleGeneratorType',
      message: 'Which code generator tool do you want to use?',
      choices: [
        {
          title: 'Tackle (https://github.com/sudoblockio/tackle-icon-sc-poc)',
          value: 'tackle',
        },
        {
          title:
            'Java SCORE examples(https://github.com/icon-project/java-score-examples)',
          value: 'javascore',
        },
      ],
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
  await createAccount(projectPath);

  if (response.createSamples) {
    if (response.sampleGeneratorType == 'javascore') {
      const boilerplate = await pickABoilerplate();
      await scaffoldProject(boilerplate, ICON_TEMPLATES_REPO, projectPath);
      await initProjectIncludes(projectPath, boilerplate);
    } else if (response.sampleGeneratorType == 'tackle') {
      const projectName = response.path;
      await runTackle(projectName, `${projectPath}/src`);
      await initProjectIncludes(projectPath, projectName);
    }
  }

  return projectPath;
};

export const pickABoilerplate = async () => {
  const response = await prompts([
    {
      type: 'select',
      name: 'boilerplate',
      message: 'Pick a boilerplate',
      choices: [
        {title: 'Hello World', value: 'hello-world'},
        {title: 'IRC2 Token', value: 'irc2-token'},
        {title: 'IRC3 Token', value: 'irc3-token'},
        {title: 'IRC31 Token', value: 'irc31-token'},
        {title: 'Multisig Wallet', value: 'multisig-wallet'},
        {title: 'Sample Crowdsale', value: 'sample-crowdsale'},
        {title: 'Sample Token', value: 'sample-token'},
      ],
    },
  ]);

  return response.boilerplate;
};

const initialiseProject = async (path: string) => {
  const name = basename(path);

  fs.mkdirSync(`${path}/src`, {recursive: true});

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

  fs.writeFile(`${path}/build.gradle`, mainBuildGradle, err => {
    if (err) panic(`Failed to create build.gradle. ${err}`);
  });

  fs.writeFile(
    `${path}/settings.gradle`,
    gradleSettings.replace('java-score-examples', name),
    err => {
      if (err) panic(`Failed to create build.gradle. ${err}`);
    }
  );

  return name;
};

/*eslint-disable */
export const addProjectToIncludes = async (
  path: string,
  boilerplate: string
) => {};
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
  const command = 'gradle wrapper --build-cache -g /goloop/app/.cache/';
  await mountAndRunCommand(projectPath, args, command, cb);
};
