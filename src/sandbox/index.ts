import * as fs from 'fs';
import { basename } from 'path';
import { DROGON_IMAGE, ICON_CONFIG, ICON_SANDBOX_DATA_REPO } from '../constants';
import { verifySourcePath } from '../core/scaffold';
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
} from '../helpers/docker';
import { runGoloopCmd } from '../goloop';
import { decipherKeyStore, keyStoreFromString,generateKeyStore,copyKeyStore, keyStoreFileNameForIndex } from '../core/keystore';
import Wallet from '../core/wallet';
import { IconConfig } from '../types';
import { Genesis } from '../core/genesis';

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
      `git clone ${url} && mv /home/${repoName}/data/single /goloop/app/ && mv /home/${repoName}/data/governance /goloop/app/single/gov`, //TODO: change this to a better way
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

      exec.start({ stream: true, hijack: true }, (err: any, stream: any) => {
        stream.on('end', async () => { });

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

const createConfigFile = async (
  projectPath: string,
  password: string,
  nodeIndex: number
): Promise<string> => {

  const keystoreStr = importJson(`${projectPath}/` + keyStoreFileNameForIndex(nodeIndex));
  const keystore = keyStoreFromString(keystoreStr);
  const privKey = await decipherKeyStore(keystore, password);
  const wallet = new Wallet(projectPath, privKey, ''); //TODO: fixme
  let address = wallet.getAddress();

  let iconConfig: IconConfig = JSON.parse(ICON_CONFIG);
  iconConfig.key_store = keystore;
  iconConfig.key_password = password;
  iconConfig.genesis.accounts[nodeIndex].address = address;

  return address;
};


const setupIconConfig = async (projectPath: string, password: string, numNodes: number) => {
  
  const config = importJson(`${projectPath}/drogon-config.json`);

  if (!config) panic('Please run the command inside the Drogon Project');

  let addresses: string[] = [];
  
  for (let i = 0; i < numNodes; i++) {
    let keystoreFile = keyStoreFileNameForIndex(i);

    if (!checkIfFileExists(`${projectPath}/` + keystoreFile)) {
      keystoreFile = await generateKeyStore(projectPath, i);
    } else {
      await copyKeyStore(projectPath, i);
    }

    const address = await createConfigFile(projectPath, password, i);
    addresses.push(address);
  }

  // After all addresses are generated, assign them to the validator list
  let iconConfig: IconConfig = JSON.parse(ICON_CONFIG);
  let genesis = Genesis.default();
  iconConfig.genesis = genesis;
  iconConfig.genesis.chain.validatorList = addresses;

  fs.writeFile(
    `${projectPath}/.drogon/sandbox/config.json`,
    JSON.stringify(iconConfig),
    'utf8',
    err => {
      if (err) panic(err.message);
    }
  );
};


// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const initSandbox = async (projectPath: string, opts: any, args: any) => {

  ensureCWDDrogonProject(projectPath);

  fs.mkdirSync(`${projectPath}/.drogon/sandbox`, { recursive: true });

  // setup ICON config
  try {
    await setupIconConfig(projectPath, opts.password, 10) //TODO: change this to a better way
    await scaffoldSandboxData('data/multi',projectPath, ICON_SANDBOX_DATA_REPO, `${projectPath}/.drogon/sandbox`)
    console.log('Sandbox initialised');
  } catch (error) {
    console.log(error);
    panic('failed to init sandbox');
  }

};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const startSandbox = (projectPath: string, args: any) => {
  console.log(`${projectPath}./${sandbox_folder}/multi`);
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
