import {basename, resolve} from 'path';
import prompts from 'prompts';
import * as fs from 'fs';
import * as scaffold from './scaffold';
import {
  checkIfFileExists,
  ensureCWDDrogonProject,
  panic,
  ProgressBar,
  safeexit,
} from '../helpers';
import {dockerInit, pullImage} from '../helpers/docker';

import {DROGON_IMAGE, GOCHAIN_IMAGE, ICON_TEMPLATES_REPO} from '../constants';
import {mainBuildGradle, gradleSettings} from './contents';
import {Config} from './config';
import {scaffoldProject} from './scaffold';
import signale from 'signale';

export const install = async () => {
  signale.pending('Installing Drogon');
  let progressBar = new ProgressBar('Scaffolding...', 100);
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
      message: `Name of the project`,
    },
    {
      type: 'toggle',
      name: 'createSamples',
      initial: true,
      active: 'yes',
      inactive: 'no',
      message: `Do you want to initialize your Drogon project with samples?`,
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

  let projectPath = resolve(response.path);

  if (checkIfFileExists(`${projectPath}/drogon-config.json`)) {
    let response = await prompts([
      {
        type: 'toggle',
        name: 'overwrite',
        initial: false,
        active: 'yes',
        inactive: 'no',
        message: `Current working directory looks like a Drogon project. Do you want to overwrite all files?`,
      },
    ]);

    if (response.overwrite == false) {
      safeexit();
    }
  }

  await initialiseProject(projectPath);

  if (response.createSamples) {
    const boilerplate = await pickABoilerplate();
    await scaffoldProject(boilerplate, ICON_TEMPLATES_REPO, projectPath);
    await initProjectIncludes(projectPath, boilerplate);
  }
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
  let name = basename(path);

  fs.mkdirSync(`${path}/src/`, {recursive: true});

  let config = Config.generateNew(name);

  fs.writeFile(
    `${path}/drogon-config.json`,
    JSON.stringify(config, null, 4),
    err => {
      if (err) panic(`Failed to create drogon-config.json. ${err}`);
    }
  );

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

export const addProjectToIncludes = async (
  path: string,
  boilerplate: string
) => {};

const initProjectIncludes = async (path: string, boilerplate: string) => {
  let includes = `include(
        'src:${boilerplate}'
    )`;

  fs.readFile(`${path}/settings.gradle`, 'utf8', function (err, data) {
    if (err) {
      return console.log(err);
    }
    var result = data.replace(/include \(\)/g, includes);

    fs.writeFile(`${path}/settings.gradle`, result, 'utf8', function (err) {
      if (err) return console.log(err);
    });
  });
};

export const gradleCommands = async (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);
  signale.pending('Running gradle command');

  mountAndRunGradle(projectPath, args, () => {
    signale.success('Done');
  });
};

const mountAndRunGradle = async (projectPath: string, args: any, cb: any) => {
  let docker = dockerInit();
  let command = `/goloop/gradlew --build-cache -g /goloop/app/.cache/`;
  if (args) command = `${command} ${args.join(' ')}`;

  docker.createContainer(
    {
      Image: DROGON_IMAGE,
      HostConfig: {
        AutoRemove: true,
        Binds: [`${projectPath}:/goloop/app`],
      },
      Tty: false,
    },
    function (err, container: any) {
      if (err) panic(err);
      container.start(function (err: any, stream: any) {
        container.exec(
          {
            Cmd: ['sh', '-c', command],
            AttachStderr: true,
            AttachStdout: true,
            WorkingDir: '/goloop/app',
          },
          function (err: any, exec: any) {
            exec.start(
              {Tty: false, Detach: false},
              function (err: any, stream: any) {
                docker.modem.demuxStream(
                  stream,
                  process.stdout,
                  process.stderr
                );
              }
            );

            let id = setInterval(() => {
              exec.inspect({}, (err: any, status: any) => {
                if (status.Running == false) {
                  container.stop({}, () => {});
                  clearInterval(id);
                  cb();
                }
              });
            }, 100);
          }
        );
      });

      container.attach({}, function (err: any, stream: any) {
        stream.pipe(process.stdout);
      });
    }
  );
};
