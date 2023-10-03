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
import {getDIVEContainerId, mountAndRunCommandInContainer, dockerInit} from '../helpers/docker';
import {DROGON_IMAGE} from '../constants';
import Wallet from '../core/keystore';
import chalk from 'chalk';
var shell = require('shelljs');

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

  const keystore = importJson(`${projectPath}/` + keystoreFile);
  const password = opts.password;

  const wallet = await Wallet.loadKeyStore(
    projectPath,
    network,
    keystore,
    password,
    false
  );
  console.log(`Loaded wallet ${chalk.green(wallet.getAddress())}`);

  // await wallet.showBalances();

  signale.pending('Deploying contracts');

  // const container = getContainerNameForProject(
  //   projectPath,
  //   DROGON_IMAGE,
  //   'drogon'
  // );

  const docker = dockerInit();
  const containerId  = await getDIVEContainerId();

  if (!containerId) {
    signale.fatal('DIVE container not found');
    process.exit(1);
  }

  console.log("Discovered DIVE container: " + containerId)
  const container = docker.getContainer(containerId);

  const projects = await listAvailableContracts(projectPath);
  const optimized = await listOptmizedContracts(projectPath);

  const keys = Object.keys(projects);
  const numProjects = keys.length;

  let tasks: any = {};

  mountAndRunCommandInContainer(
    container,
    args,
    "mkdir -p /goloop/app",
    async (exitCode: any, output: string) => {
      if (exitCode) {
        signale.fatal('Failed to deploy contracts');
        process.exit(exitCode);
      } else {
      }
    },
    true,
    "/goloop/"
  );

  let j = 0
  for(var i in optimized) {
    console.log("Deploying optimized contract: " + i)
    const path = optimized[i]

    // Copy the optimized contract from host to container
    signale.pending(`Copying optimized contract ${path} to container`)

    // path without file name
    const basePath = path.substring(0, path.lastIndexOf("/"))
    const fileName = path.substring(path.lastIndexOf("/")+1)

    console.log("Copying file " + fileName + " to /goloop/app/" + fileName)
    console.log("Creating directory " + basePath)
    let mkdir = `mkdir -p /goloop/app/${basePath}`

    mountAndRunCommandInContainer(
      container,
      args,
      mkdir,
      async (exitCode: any, output: string) => {
        if (exitCode) {
          signale.fatal('Failed to deploy contracts');
          process.exit(exitCode);
        }
      },
      true
    );

    const basePath2 = path.split("/").slice(0, 2).join("/") + "/";
    
    shell.exec(`docker cp ${projectPath}/${path} ${containerId}:/goloop/app/${path}`, { silent: false })
    shell.exec(`docker cp ${projectPath}/${basePath2}/build.gradle ${containerId}:/goloop/app/${basePath2}/build.gradle`, { silent: false })
    shell.exec(`docker cp ${projectPath}/build.gradle ${containerId}:/goloop/app/build.gradle`, { silent: false })
    shell.exec(`docker cp ${projectPath}/settings.gradle ${containerId}:/goloop/app/settings.gradle`, { silent: false })

    // Deploy the contract
    let initialWalletBalance = 0
    let project = keys[j];
    j = j + 1
    let command = `/gradle/gradle-5.5.1/bin/gradle src:${project}:${destination} -PkeystoreName=/goloop/app/${keystoreFile}`;

    if (password) {
      command += ` -PkeystorePass=${password}`;
    }

    console.log("Running command: " + command)
    mountAndRunCommandInContainer(
      container,
      args,
      command,
      async (exitCode: any, output: string) => {
        if (exitCode) {
          signale.fatal('Failed to deploy contracts');
          process.exit(exitCode);
        } else {
          signale.success(`Done deploying ${i} contract`);

          let currentBalance = await wallet.getBalance();
          tasks[i] = {
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
