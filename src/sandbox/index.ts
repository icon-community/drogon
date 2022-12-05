import * as fs from 'fs';
import {basename} from 'path';
import {
  DROGON_IMAGE,
  GOCHAIN_IMAGE,
  ICON_CONFIG,
  ICON_GENESIS,
  ICON_ICONEE_CONFIG,
  ICON_ICONENV,
  ICON_SANDBOX_DATA_REPO,
} from '../constants';
import {verifySourcePath} from '../core/scaffold';
import {ensureCWDDrogonProject, panic, ProgressBar} from '../helpers';
import {dockerInit, mountAndRunCommand} from '../helpers/docker';

const sandbox_folder = '.drogon/sandbox';

const fetchProject = async (source: string, destination: string) => {
  const url = `https://github.com/${source}`;

  const repoName = basename(source);

  const docker = await dockerInit();
  await docker.run(
    DROGON_IMAGE,
    [
      'sh',
      '-c',
      `git clone ${url} && mv /home/${repoName}/data/single /goloop/app/ && mv /home/${repoName}/data/governance /goloop/app/single/gov`,
    ],
    [process.stdout, process.stderr],
    {
      AutoRemove: true,
      Binds: [`${destination}:/goloop/app`],
      AttachStdout: true,
      AttachStderr: true,
      WorkingDir: '/home',
    },
    (err: any, data: any, container: any) => {
      if (err) panic(`Failed to fetch boilerplate. ${err}`);
    }
  );
};

export const scaffoldSandboxData = async (
  projectName: string,
  repo: string,
  destination: string
) => {
  const branch = 'master';
  const progressBar = new ProgressBar('Scaffolding...', 100);
  progressBar.start();

  await verifySourcePath(repo);
  await fetchProject(repo, destination);
  progressBar.stopWithMessage('Scaffolding done 🎉');
};

export const initSandbox = (projectPath: string, args: any) => {
  // TODO:
  // - add config initializations
  // - god wallet configuration
  // - genesis

  ensureCWDDrogonProject(projectPath);

  fs.mkdirSync(`${projectPath}/.drogon/sandbox`, {recursive: true});

  scaffoldSandboxData(
    'data/single',
    ICON_SANDBOX_DATA_REPO,
    `${projectPath}/.drogon/sandbox`
  )
    .then(() => {
      console.log('Sandbox initialised');
    })
    .catch(error => {
      console.log(error);
    });
};

export const startSandbox = (projectPath: string, args: any) => {
  console.log(`${projectPath}./${sandbox_folder}/single`);
  ensureCWDDrogonProject(projectPath);
  runSandboxCommand(projectPath, '');
};

export const stopSandbox = (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);

  fs.readFile(`${projectPath}/.drogon/.sandbox`, (err, data) => {
    if (err) panic(err.message);
    console.log('Shutting down sandbox...');
    const docker = dockerInit();
    const containerId = data.toString().split('n')[0];
    const container = docker.getContainer(containerId);
    container.stop();

    fs.unlinkSync(`${projectPath}/.drogon/.sandbox`);
    console.log('Shutting down sandbox successful.');
  });
};

export const pauseSandbox = (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);
};

export const unpauseSandbox = (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);
};

export const runSandboxCommand = async (
  projectPath: string,
  command: string
) => {
  // WIP
  const docker = dockerInit();

  docker.createContainer(
    {
      Image: GOCHAIN_IMAGE,
      HostConfig: {
        AutoRemove: true,
        Binds: [
          `${projectPath}:/goloop/app`,
          `${projectPath}/${sandbox_folder}/single:/goloop/data`,
          `${projectPath}/${sandbox_folder}/chain:/goloop/chain`,
        ],
        PortBindings: {
          '9082/tcp': [{HostPort: '9082'}],
        },
      },
      Tty: true,
      Env: ICON_ICONENV,
      ExposedPorts: {'9082/tcp': {}},
    },
    (err, container: any) => {
      if (err) panic(err);
      container.start((err: any, stream: any) => {
        if (err) panic(err);
        container.exec(
          {
            Cmd: ['sh', '-c', command],
            AttachStderr: false,
            AttachStdout: false,
            WorkingDir: '/goloop/app',
          },
          (err: any, exec: any) => {
            if (err) panic(err);
            exec.start({Tty: false, Detach: true}, (err: any, stream: any) => {
              docker.modem.demuxStream(stream, process.stdout, process.stderr);
            });

            console.log('Sandbox running', container.id);
            fs.writeFile(
              `${projectPath}/.drogon/.sandbox`,
              container.id,
              err => {
                if (err) panic(`Failed to create Sandbox Env. ${err}`);
              }
            );
          }
        );
      });
    }
  );
};
