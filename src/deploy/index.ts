import signale from 'signale';
import {
  checkIfFileExists,
  ensureCWDDrogonProject,
  getContainerNameForProject,
  importJson,
  listAvailableContracts,
  panic,
} from '../helpers';
import {
  mountAndRunCommandInContainer,
} from '../helpers/docker';
import { DROGON_IMAGE } from '../constants';
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
  let network = '';

  if (opts.local) {
    destination = 'deployToLocal';
    network = config.networks.development.uri;
  } else if (opts.lisbon) {
    destination = 'deployToLisbon';
    network = config.networks.lisbon.uri;
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

  const keystore = importJson(`${projectPath}/` + keystoreFile);
  const password = opts.password;

  const wallet = await Wallet.loadKeyStore(keystore, password, false);
  console.log(`Loaded wallet ${chalk.green(wallet.getAddress())}`);

  await wallet.showBalances();
  await wallet.ensureHasBalance();

  signale.pending('Deploying contracts');

  const container = getContainerNameForProject(
    projectPath,
    DROGON_IMAGE,
    'drogon'
  );

  const projects = await listAvailableContracts(projectPath, undefined);
  const keys = Object.keys(projects);
  const numProjects = keys.length;

  let tasks: any = {};

  for (let i = 0; i < numProjects; i++) {
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
      async (exitCode: any) => {
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
      let totalCost = 0;
      for (var i in tasks) {
        console.log(
          chalk.blue(`Cost of deploying ${i} (ICX):     `),
          chalk.red(tasks[i].initial - tasks[i].current)
        );
        totalCost += tasks[i].initial - tasks[i].current;
      }

      console.log(
        chalk.blue('Total cost of all deployments (ICX):    '),
        chalk.red(totalCost.toFixed(4))
      );
      clearInterval(id);
      wallet.showBalances();
    }
  });
};
