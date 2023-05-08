#!/usr/bin/env node

import {resolve} from 'path';
import {exit} from 'process';
import {banner} from './helpers';
import {program} from 'commander';
import {LIB_VERSION} from './version';
import {
  install,
  createNewProject,
  gradleCommands,
  createAccount,
} from './core/index';
import {compileContracts} from './compile';
import {testContracts} from './test';
import {deployContracts} from './deploy';
import {optimizeContracts} from './deploy/optimize';
import {generateKeystore, goloop} from './goloop';
import {initSandbox, startSandbox, stopSandbox} from './sandbox';
import {localDrogonImageId} from './helpers/docker';
import {DROGON_IMAGE} from './constants';
import {startTheGradleDaemon, stopTheGradleDaemon} from './gradle';

const main = async () => {
  banner();

  program
    .name('Drogon')
    .description('Compile, Test and Deploy ICON Contracts with ease!');

  program.version(LIB_VERSION);

  program
    .command('install')
    .description('Installs required SCORE dependencies')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (str, options) => {
      await install();
    });

  program
    .command('init')
    .description('Initialize a new Drogon project')
    .action(async () => {
      const localImage = await localDrogonImageId(DROGON_IMAGE);
      if (!localImage) {
        console.error(
          'Error: drogon pre-requisites not met. Are you sure you performed the drogon install before this?'
        );
        process.exit();
      }
      let projectPath = await createNewProject();
      // await createAccount(projectPath)
    });

  //TODO: Implement Gradle start and stop logics. From this point, every gradle command should use this docker
  program
    .command('start')
    .description('Start the Gradle daemon inside the project')
    .option('-p, --path [string]', 'Path of your Drogon Project', './')
    .action(function (this: any) {
      const path = resolve(this.opts().path);
      startTheGradleDaemon(path, this.args);
    });

  program
    .command('stop')
    .description('Stop the Gradle daemon inside the project')
    .option('-p, --path [string]', 'Path of your Drogon Project', './')
    .action(function (this: any) {
      const path = resolve(this.opts().path);
      stopTheGradleDaemon(path, this.args);
    });

  //
  program
    .command('compile')
    .allowUnknownOption()
    .description('Compile the Drogon contracts')
    .option('-p, --path [string]', 'Path of your Drogon Project', './')
    .action(function (this: any) {
      const path = resolve(this.opts().path);
      compileContracts(path, this.args);
    });

  program
    .command('test')
    .allowUnknownOption()
    .description('Run the tests against the Drogon contracts')
    .option('-p, --path [string]', 'Path of your Drogon Project', './')
    .action(function (this: any) {
      const path = resolve(this.opts().path);
      testContracts(path, this.args);
    });

  program
    .command('gradlew')
    .allowUnknownOption()
    .description('Run gradlew commands against the Drogon project')
    .option('-p, --path [string]', 'Path of your Drogon Project', './')
    .action(function (this: any) {
      const path = resolve(this.opts().path);
      gradleCommands(path, this.args);
    });

  program
    .command('optimize')
    .allowUnknownOption()
    .description('Optmize contracts from the Drogon project')
    .option('-p, --path [string]', 'Path of your Drogon Project', './')
    .action(function (this: any) {
      const path = resolve(this.opts().path);
      optimizeContracts(path, this.args);
    });

  program
    .command('deploy')
    .allowUnknownOption()
    .description('Deploy contracts from the Drogon project')
    .option('-p, --path [string]', 'Path of your Drogon Project', './')

    .option('-l, --local', 'Deploy contracts to local node')
    .option('-s, --lisbon', 'Deploy contracts to lisbon node')
    .option('-c, --custom [node]', 'Deploy contracts to Custom node')
    .option('-d, --config [file]', 'Drogon config file.', 'drogon-config.json')
    .option('-k, --password [string]', 'Password for the keystore', 'gochain')
    .option(
      '-u, --uri [string]',
      'URI of network for goloop command to interact with'
    )

    .action(function (this: any) {
      const path = resolve(this.opts().path);
      deployContracts(path, this.opts(), this.args).catch(err => {
        console.error(err);
        process.exit(1);
      });
    });

  program
    .command('keystore')
    .allowUnknownOption()
    .description('Generate keystore')
    .option('-p, --path [string]', 'Path of your Drogon Project', './')
    .option('-s, --password [string]', 'Password for the keystore', 'gochain')
    .action(function (this: any) {
      const path = resolve(this.opts().path);
      generateKeystore(path, this.opts().password, this.args);
    });

  program
    .command('goloop')
    .allowUnknownOption()
    .description('Run goloop commands against the Drogon project')
    .option('-p, --path [string]', 'Path of your Drogon Project', './')
    .action(function (this: any) {
      const path = resolve(this.opts().path);
      goloop(path, this.args);
    });

  const sandbox = program
    .command('sandbox')
    .description('Run a local network in the Drogon project');

  sandbox
    .command('init')
    .allowUnknownOption()
    .description('initialize the local network')
    .option('-p, --path [string]', 'Path of your Drogon Project', './')
    .option(
      '-k, --password [string]',
      'Password for the keystore or for GOD Wallet',
      'gochain'
    )
    .action(function (this: any) {
      const path = resolve(this.opts().path);
      initSandbox(path, this.opts(), this.args);
    });

  sandbox
    .command('start')
    .allowUnknownOption()
    .description('start the local network')
    .option('-p, --path [string]', 'Path of your Drogon Project', './')
    .action(function (this: any) {
      const path = resolve(this.opts().path);
      startSandbox(path, this.args);
    });

  sandbox
    .command('stop')
    .allowUnknownOption()
    .description('stop the local network')
    .option('-p, --path [string]', 'Path of your Drogon Project', './')
    .action(function (this: any) {
      const path = resolve(this.opts().path);
      stopSandbox(path, this.args);
    });

  // sandbox
  //   .command('pause')
  //   .allowUnknownOption()
  //   .description('pause the local network')
  //   .option('-p, --path [string]', 'Path of your Drogon Project', './')
  //   .action(function (this: any) {
  //     let path = resolve(this.opts().path);
  //     pauseSandbox(path, this.args);
  //   });

  // sandbox
  //   .command('unpause')
  //   .allowUnknownOption()
  //   .description('start the local network')
  //   .option('-p, --path [string]', 'Path of your Drogon Project', './')
  //   .action(function (this: any) {
  //     let path = resolve(this.opts().path);
  //     unpauseSandbox(path, this.args);
  //   });

  program.parse();
};

main().catch(error => {
  console.log(error);
  exit(1);
});
