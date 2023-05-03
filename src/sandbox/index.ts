import * as fs from 'fs';
import {basename} from 'path';
import {
  DROGON_IMAGE,
  GOCHAIN_IMAGE,
  ICON_ICONENV,
  ICON_SANDBOX_DATA_REPO,
} from '../constants';
import {verifySourcePath} from '../core/scaffold';
import {ensureCWDDrogonProject, getContainerNameForProject, panic, ProgressBar} from '../helpers';
import {
  dockerInit,
  mountAndRunCommandInContainer,
  mountAndRunCommandWithOutput,
  runAContainerInBackground,
  stopContainerWithName,
} from '../helpers/docker';
import signale from 'signale';

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (err: any, data: any, container: any) => {
      if (err) panic(`Failed to fetch boilerplate. ${err}`);
    }
  );
};

export const scaffoldSandboxData = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  projectName: string,
  repo: string,
  destination: string
) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const progressBar = new ProgressBar('Scaffolding...', 100);
  progressBar.start();

  await verifySourcePath(repo);
  await fetchProject(repo, destination);

  progressBar.stopWithMessage('Scaffolding done 🎉');
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const startSandbox = (projectPath: string, args: any) => {
  console.log(`${projectPath}./${sandbox_folder}/single`);
  ensureCWDDrogonProject(projectPath);

  const container = getContainerNameForProject(
    projectPath,
    GOCHAIN_IMAGE,
    'sandbox'
  );
  //TODO: do not exec if the container already exists
  runSandboxCommand(projectPath, container, '/goloop/run.sh');
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const stopSandbox = (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);

  const container = getContainerNameForProject(
    projectPath,
    GOCHAIN_IMAGE,
    'sandbox'
  );

  stopContainerWithName(container).then(() => {
    console.log('Sandbox stopped!');
  });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const pauseSandbox = (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const unpauseSandbox = (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);
};

export const runSandboxCommand = async (
  projectPath: string,
  name:string,  
  command: string
) => {
  const docker = dockerInit();
  docker.createContainer(
    {
      Image: GOCHAIN_IMAGE,
      name: name,
      HostConfig: {
        AutoRemove: false,
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
      ExposedPorts: {'9082/tcp': {}},
    },
    (err, container: any) => {
      if (err) panic(err);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      container.start((err: any, stream: any) => {
        if (err) panic(err);
        container.exec(
          {
            Cmd: ['sh', '-c', command],
            AttachStderr: true,
            AttachStdout: true,
            WorkingDir: '/goloop/app',
          },
          (err: any, exec: any) => {
            if (err) panic(err);
            exec.start({Tty: false, Detach: true}, (err: any, stream: any) => {
              if (err) panic(err);
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
