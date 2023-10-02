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
  wait,
} from '../helpers';
import {
  dockerInit,
  mountAndRunCommandInContainer,
} from '../helpers/docker';
import { generateKeystore, runGoloopCmd } from '../goloop';
import Wallet from '../core/keystore';
import { ensureKurtosisCli, ensureDIVECli, ensureKurtosisRunning, ensureGradleDaemonIsRunning, ensureDiveRunning, stopGradleDaemon, ensureDiveStopped, ensureKurtosisStopped, getGradeDaemeonContainerId } from '../core/dependencies';
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

  // get configured keystore from config
  let keystoreFile = config.keystore;

  if (!checkIfFileExists(`${projectPath}/` + keystoreFile)) {
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

  ensureCWDDrogonProject(projectPath);
  ensureKurtosisCli();
  ensureDIVECli();
  ensureKurtosisRunning();
  fs.mkdirSync(`${projectPath}/.drogon/sandbox`, { recursive: true });
  wait(1)
    .then(() => {
      return ensureGradleDaemonIsRunning(projectPath, args)
    })
    .then(() => {
      return wait(2)
    })
    .then(() => {
      return setupIconConfig(projectPath, opts.password)
    })
    .then(() => {
      return scaffoldSandboxData(
        'data/single',
        projectPath,
        ICON_SANDBOX_DATA_REPO,
        `${projectPath}/.drogon/sandbox`
      )
    })
    .then(() => {
      signale.success('Initialized sandbox');

    })
    .catch(error => {
      signale.error('Failed to initialize the sandbox:', error);
      process.exit(1);
    });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const startSandbox = (projectPath: string, args: any) => {

  ensureCWDDrogonProject(projectPath);
  ensureKurtosisCli();
  ensureDIVECli();
  ensureKurtosisRunning();
  wait(1)
    .then(() => {
      return ensureGradleDaemonIsRunning(projectPath, args)
    })
    .then(() => {
      return ensureDiveRunning()
    })
    .then(() => {
      return getGradeDaemeonContainerId(projectPath)
    })
    .then((container) => {
      const command = `GOCHAIN_KEYSTORE=/goloop/app/.drogon/sandbox/keystore.json \
      GOCHAIN_CONFIG=/goloop/app/.drogon/sandbox/config.json \
      GOCHAIN_DATA=/goloop/app/.drogon/sandbox/ \
      /goloop/run.sh`;
      if(container == null) {
        throw new Error('Gradle daemon is not running')
      }
      mountAndRunCommandInContainer(
        container,
        args,
        command,
        (exitCode: number, output: any) => {
          console.log(output);
        },
        true
      );
      signale.success('Started sandbox');
    })
    .catch(error => {
      signale.error('Failed to start the sandbox:', error);
      process.exit(1);
    });

};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const stopSandbox = (projectPath: string, args: any) => {

  ensureCWDDrogonProject(projectPath);
  ensureKurtosisCli();
  ensureDIVECli();
  wait(1)
    .then(() => {
      return stopGradleDaemon(projectPath, args)
    })
    .then(() => {
      return ensureDiveStopped()
    })
    .then(() => {
      return ensureKurtosisStopped()
    })
    .then(() => {
      signale.success('Stopped sandbox');
    })
    .catch(error => {
      signale.error('Failed to stop the sandbox:', error);
      process.exit(1);
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
