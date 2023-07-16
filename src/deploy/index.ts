import signale from 'signale';
import {
  checkIfFileExists,
  ensureCWDDrogonProject,
  getContainerNameForProject,
  importJson,
  listAvailableContracts,
  listOptmizedContracts,
  panic,
} from '../helpers';
import {mountAndRunCommandInContainer} from '../helpers/docker';
import {DROGON_IMAGE} from '../constants';
import Wallet from '../core/keystore';
import chalk from 'chalk';

export const deployContracts = async (
  projectPath: string,
  opts: any,
  args: any
) => {
  ensureCWDDrogonProject(projectPath);

  // read the drogon config file
  const config = importJson(`${projectPath}/` + opts.config);
  if (!config) panic('Please run the command inside the Drogon Project');

  let destination = '';
  let network = opts.uri;
  if (network == undefined) {
    panic(
      'Missing --uri option. Example: yarn drogon deploy --local --uri http://localhost:9080/api/v3'
    );
  }

  if (opts.local) {
    destination = 'deployToLocal';
  } else if (opts.lisbon) {
    destination = 'deployToLisbon';
  } else if (opts.berlin) {
    destination = 'deployToBerlin';
  } else if (opts.mainnet) {
    destination = `deployToMain`;
  } else if (opts.custom) {
    destination = `deployTo${opts.custom}`;
  }

  // get configured keystore from config
  const keystoreFile = config.keystore;

  if (!checkIfFileExists(`${projectPath}/` + keystoreFile)) {
    panic(
      `Configured Keystore file ${keystoreFile} not found in folder ${projectPath}`
    );
  }

  const keystoreString = importJson(`${projectPath}/` + keystoreFile);
  
  //parses the string into the object
  const keystore = Wallet.keyStoreFromString(keystoreString);

  const password = opts.password;

  const wallet = await Wallet.loadKeyStore(
    projectPath,
    network,
    keystore,
    password
  );
  console.log(`Loaded wallet ${chalk.green(wallet.getAddress())}`);

  await wallet.showBalances();

  signale.pending('Deploying contracts');

  const container = getContainerNameForProject(
    projectPath,
    DROGON_IMAGE,
    'drogon'
  );

  const projects = await listAvailableContracts(projectPath);

  const keys = Object.keys(projects);
  const numProjects = keys.length;

  let tasks: any = {};

  for (var i = 0; i < numProjects; i++) {
    let project = keys[i];

    let command = `gradle src:${project}:${destination} -PkeystoreName=/goloop/app/${keystoreFile}`;

    if (password) {
      command += ` -PkeystorePass=${password}`;
    }

    let initialWalletBalance = await wallet.getBalance();

    mountAndRunCommandInContainer(
      container,
      projectPath,
      args,
      command,
      async (exitCode: any, output: string) => {
        if (exitCode) {
          signale.fatal('Failed to deploy contracts');
          process.exit(exitCode);
        } else {
          signale.success(`Done deploying ${project} contract`);

          let currentBalance = await wallet.getBalance();
          tasks[project] = {
            current: currentBalance,
            initial: initialWalletBalance,
          };
        }
      },
      true
    );
  }

  const id = setInterval(() => {
    const keys = Object.keys(tasks);
    const numTasks = keys.length;
    if (numTasks == numProjects) {
      let totalCost = BigInt(0);
      for (var i in tasks) {
        const cost = BigInt(tasks[i].initial - tasks[i].current);
        if (!Number.isNaN(cost)) {
          wallet.display(`Cost of deploying ${i} (ICX):     `, cost);
          totalCost = totalCost + cost;
        }
      }

      if (totalCost !== 0n) {
        wallet.display('Total cost of all deployments (ICX):    ', totalCost);
      }
      clearInterval(id);
      wallet.showBalances();
    }
  });
};
