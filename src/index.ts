#!/usr/bin/env node

import {resolve} from 'path';
import {exit} from 'process';
import {banner} from './helpers';
import {program} from 'commander';
import {LIB_VERSION} from './version';
import {install, createNewProject} from './core/index';
import {compileContracts} from './compile';

const main = async () => {
  banner();

  program
    .name('Drogon')
    .description('Compile, Test and Deploy ICON Contracts with ease!');

  program.version(LIB_VERSION);

  program
    .command('install')
    .description('Installs required SCORE dependencies')
    .action(async (str, options) => {
      await install();
    });

  program
    .command('init')
    .description('Initialize a new Drogon project')
    .action(async () => {
      await createNewProject();
    });

  program
    .command('compile')
    .allowUnknownOption()
    .description('Compile the Drogon contracts')
    .option('-p, --path [string]', 'Path of your Drogon Project', './')
    .action(function (this: any) {
      let path = resolve(this.opts().path);
      compileContracts(path, this.args);
    });

  program.parse();
};

main().catch(error => {
  console.log(error);
  exit(1);
});
