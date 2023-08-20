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
import { decipherKeyStore, keyStoreFromString, generateKeyStore, copyKeyStore, keyStoreFileNameForIndex } from '../core/keystore';
import Wallet from '../core/wallet';
import { Consensus, IconConfig, KeyStore } from '../types';
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
      HostConfig: {
        AutoRemove: true,
        Binds: [`${destination}:/goloop/app`],
      },
      AttachStdout: true,
      AttachStderr: true,
      WorkingDir: '/home'
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (err: any, result: any) => {
      if (err) panic(`Failed to fetch boilerplate. ${err}`);
      console.log(result)
    },
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
      WorkingDir: '/home',
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
  numNodes: number,
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
  nodeIndex: number,
  addresses: string[]
) => {
  const keystore = importJson(`${projectPath}/` + keyStoreFileNameForIndex(nodeIndex)) as KeyStore;

  let iconConfig: IconConfig = JSON.parse(ICON_CONFIG);
  iconConfig.key_store = keystore

  const port = (8081 + nodeIndex).toString()
  const rpcPort = (9082 + nodeIndex).toString()

  iconConfig.p2p = `${iconConfig.p2p.replace("8081", port)}`
  iconConfig.rpc_addr = `${iconConfig.rpc_addr.replace("9082", rpcPort)}`
  iconConfig.genesis.chain.validatorList = addresses

  fs.writeFile(
    `${projectPath}/.drogon/sandbox/config${nodeIndex}.json`,
    JSON.stringify(iconConfig),
    'utf8',
    err => {
      if (err) panic(err.message);
    }
  );
};

const createGochainEnv = async (projectPath: string) => {
  const env = `GOCHAIN_GENESIS=/goloop/app/.drogon/sandbox/genesis.json
GOCHAIN_DB_TYPE=rocksdb
GOCHAIN_CLEAN_DATA=false
ICON_CONFIG=/goloop/app/.drogon/sandbox/icon_config.json`

  fs.writeFile(
    `${projectPath}/.drogon/sandbox/.env`,
    env,
    'utf8',
    err => {
      if (err) panic(err.message);
    }
  );

}

const createConsensusConfig = async (projectPath: string, mainPRepCount: number) => {
  const consensus: Consensus = {
    "termPeriod": 300,
    "mainPRepCount": mainPRepCount,
    "extraMainPRepCount": 0,
    "subPRepCount": 4
  }

  fs.writeFile(
    `${projectPath}/.drogon/sandbox/icon_config.json`,
    JSON.stringify(consensus),
    'utf8',
    err => {
      if (err) panic(err.message);
    }
  );

}

const setupIconConfig = async (projectPath: string, password: string, numNodes: number) => {

  const config = importJson(`${projectPath}/drogon-config.json`);

  if (!config) panic('Please run the command inside the Drogon Project');

  let addresses: string[] = [];

  for (let i = 0; i < numNodes; i++) {
    await generateKeyStore(projectPath, i);

    const keystore = importJson(`${projectPath}/` + keyStoreFileNameForIndex(i)) as KeyStore;
    const privKey = await decipherKeyStore(keystore, password);
    const wallet = new Wallet(projectPath, privKey, ''); //TODO: fixme
    let address = wallet.getAddress();
    addresses.push(address)
  }

  for (let i = 0; i < numNodes; i++) {
    await createConfigFile(projectPath, password, i, addresses);
  }

  // After all addresses are generated, assign them to the validator list
  let genesis = Genesis.default();
  genesis.chain.validatorList = addresses;

  fs.writeFile(
    `${projectPath}/.drogon/sandbox/genesis.json`,
    JSON.stringify(genesis),
    'utf8',
    err => {
      if (err) panic(err.message);
    }
  );

  await createConsensusConfig(projectPath, numNodes)
  await createGochainEnv(projectPath)
};


// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const initSandbox = async (projectPath: string, opts: any, args: any) => {

  ensureCWDDrogonProject(projectPath);

  fs.mkdirSync(`${projectPath}/.drogon/sandbox`, { recursive: true });

  // setup ICON config
  try {
    await setupIconConfig(projectPath, opts.password, opts.nodes)
    console.log('Sandbox initialised');
  } catch (error) {
    console.log(error);
    panic('failed to init sandbox');
  }

};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const startSandbox = async (projectPath: string, numNodes: number, args: any) => {
  console.log(`${projectPath}./${sandbox_folder}/multi`);
  ensureCWDDrogonProject(projectPath);

  const container = getContainerNameForProject(
    projectPath,
    DROGON_IMAGE,
    'drogon'
  );

  for (var i = 0; i < numNodes; i++) {
    const port = (8081 + i).toString()

    const command =
      `GOCHAIN_KEYSTORE=/goloop/app/.drogon/sandbox/keystore${i}.json GOCHAIN_DATA=/goloop/app/.drogon/sandbox/node${i} GOCHAIN_LOGFILE=/goloop/app/.drogon/sandbox/log${i}.log GOCHAIN_CONFIG=/goloop/app/.drogon/sandbox/config${i}.json GOCHAIN_DB_TYPE=rocksdb GOCHAIN_CLEAN_DATA=false ICON_CONFIG=/goloop/app/.drogon/sandbox/icon_config.json GOCHAIN_P2P_ADDRESS=127.0.0.1:${port} /home/run.sh`;

    console.log(command)

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
  }

  for (var i = 0; i < numNodes; i++) {
    // fund Nodes
    const keystore = importJson(`${projectPath}/` + keyStoreFileNameForIndex(i)) as KeyStore;
    const privKey = await decipherKeyStore(keystore, "gochain");
    const wallet = new Wallet(projectPath, privKey, ''); //TODO: fixme
    let address = wallet.getAddress();
    const port = (8081 + i).toString()
    // await registerNode(i, address, `127.0.0.1:${port}`)
  }

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
