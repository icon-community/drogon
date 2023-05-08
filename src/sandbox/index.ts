import * as fs from 'fs';
import {basename} from 'path';
import {DROGON_IMAGE, ICON_CONFIG, ICON_SANDBOX_DATA_REPO} from '../constants';
import {verifySourcePath} from '../core/scaffold';
import {
  checkIfFileExists,
  ensureCWDDrogonProject,
  getContainerNameForProject,
  importJson,
  panic,
  ProgressBar,
} from '../helpers';
import {
  dockerInit,
  mountAndRunCommandInContainer,
  stopContainerWithName,
} from '../helpers/docker';
import signale from 'signale';
import {exitCode} from 'process';
import {generateKeystore, runGoloopCmd} from '../goloop';
import Wallet from '../core/keystore';

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

const fetchProjectWithInContainer = async (
  containerName: string,
  source: string,
  destination: string
) => {
  const url = `https://github.com/${source}`;

  const repoName = basename(source);
  let command = `git clone ${url} && mv /home/${repoName}/data/single /goloop/app/ && mv /home/${repoName}/data/governance /goloop/app/single/gov`;

  let output = '';
  const docker = dockerInit();
  const container = docker.getContainer(containerName);

  container.exec(
    {
      AttachStdout: true,
      AttachStderr: true,
      AttachStdin: true,
      Tty: true,
      WorkingDir: '/goloop/app',
      Cmd: ['sh', '-c', command],
    },
    (err: any, exec: any) => {
      if (err) panic(`Failed to start container. ${err}`);

      exec.start({stream: true, hijack: true}, (err: any, stream: any) => {
        stream.on('end', async () => {});

        stream.on('data', async (chunk: any) => {
          output += chunk.toString();
        });

        // docker.modem.demuxStream(stream, process.stdout, process.stderr);
      });

      const id = setInterval(() => {
        exec.inspect({}, (err: any, status: any) => {
          if (status.Running === false) {
            clearInterval(id);
          }
        });
      }, 100);
    }
  );
};

export const scaffoldSandboxData = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  projectName: string,
  projectPath: string,
  repo: string,
  destination: string
) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const progressBar = new ProgressBar(
    'Initializing sandboxed local network...',
    100
  );
  progressBar.start();

  await verifySourcePath(repo);
  const containerName = getContainerNameForProject(
    projectPath,
    DROGON_IMAGE,
    'drogon'
  );

  await fetchProjectWithInContainer(containerName, repo, destination);

  progressBar.stopWithMessage('Initilized 🎉');
};

const createConfigFile = (
  projectPath: string,
  keystoreFile: any,
  password: string
) => {
  const keystore = importJson(`${projectPath}/` + keystoreFile);
  Wallet.loadKeyStore(projectPath, '', keystore, password, false).then(
    wallet => {
      let address = wallet.getAddress();
      let iconConfig: any = JSON.parse(ICON_CONFIG);
      iconConfig['key_store'] = keystore;
      iconConfig['key_password'] = password;
      iconConfig['genesis']['accounts'][0]['address'] = address;
      iconConfig['genesis']['chain']['validatorList'] = [address];

      fs.writeFile(
        `${projectPath}/.drogon/sandbox/config.json`,
        JSON.stringify(iconConfig),
        'utf8',
        err => {
          if (err) panic(err.message);
        }
      );
    }
  );
};

const setupIconConfig = async (projectPath: string, password: string) => {
  // read the drogon config file
  const config = importJson(`${projectPath}/drogon-config.json`);

  if (!config) panic('Please run the command inside the Drogon Project');

  let address = '';
  // get configured keystore from config
  let keystoreFile = config.keystore;

  if (!checkIfFileExists(`${projectPath}/` + keystoreFile)) {
    // await generateKeystore(`${projectPath}/.drogon/sandbox`, "gochain", [])
    const command =
      'goloop ks gen --out /goloop/app/.drogon/sandbox/keystore.json';
    await runGoloopCmd(`${projectPath}`, command, (output: any) => {
      keystoreFile = `.drogon/sandbox/keystore.json`;
      createConfigFile(projectPath, keystoreFile, password);
    });
  } else {
    fs.copyFile(
      `${projectPath}/.keystore.json`,
      `${projectPath}/.drogon/sandbox/keystore.json`,
      err => {
        if (err) throw err;
      }
    );
    createConfigFile(projectPath, keystoreFile, password);
  }
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const initSandbox = (projectPath: string, opts: any, args: any) => {
  // TODO:
  // - add config initializations
  // - god wallet configuration
  // - genesis

  ensureCWDDrogonProject(projectPath);

  fs.mkdirSync(`${projectPath}/.drogon/sandbox`, {recursive: true});

  // setup ICON config
  setupIconConfig(projectPath, opts.password)
    .then(() => {})
    .catch(e => {
      console.log(e);
      panic('failed to init sandbox');
    });

  scaffoldSandboxData(
    'data/single',
    projectPath,
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
    DROGON_IMAGE,
    'drogon'
  );

  const command =
    'GOCHAIN_KEYSTORE=/goloop/app/.drogon/sandbox/keystore.json GOCHAIN_CONFIG=/goloop/app/.drogon/sandbox/config.json GOCHAIN_DATA=/goloop/app/.drogon/sandbox/ /goloop/run.sh';

  mountAndRunCommandInContainer(
    container,
    projectPath,
    args,
    command,
    (exitCode: number, output: any) => {
      console.log(output);
    },
    true
  );
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const stopSandbox = (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);

  const container = getContainerNameForProject(
    projectPath,
    DROGON_IMAGE,
    'sandbox'
  );

  throw 'Not implemented!';
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const pauseSandbox = (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const unpauseSandbox = (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);
};
