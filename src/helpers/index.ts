import * as fs from 'fs';
import {textSync} from 'figlet';
import {exit} from 'process';
import chalk from 'chalk';
import signale from 'signale';
import path from 'path';
import crypto from 'crypto';
var shell = require('shelljs');
export const banner = function () {
  const banner = textSync('Drogon!', {
    font: 'Ghost',
    horizontalLayout: 'default',
    verticalLayout: 'default',
    width: 80,
    whitespaceBreak: true,
  });
  console.log(chalk.green(banner));
};

export const safeexit = function () {
  signale.complete('Ok! Good bye!!');
};

export const panic = function (msg: string) {
  signale.fatal(`${chalk.red(msg)}`);
  exit(1);
};

export const debug = function (msg: string) {
  signale.debug(msg);
};

export const warn = function (msg: string) {
  signale.warn(msg);
};

export const checkIfFileExists = (file: string): boolean => {
  // Check if the file exists in the current directory.
  if (fs.existsSync(file)) return true;

  return false;
};

export const importJson = (file: string): any => {
  if (!checkIfFileExists(file)) return false;

  return require(file);
};

export const ensureCWDDrogonProject = (projectPath: string) => {
  if (checkIfFileExists(`${projectPath}/drogon-config.json`)) return;

  panic('Please run the command inside the Drogon Project');
};

export const removeItemOnce = (arr: any, value: string) => {
  const index = arr.indexOf(value);
  if (index > -1) {
    arr.splice(index, 1);
  }
  return arr;
};

export const listAvailableContracts = (
  projectPath: string,
  cb?: any
): Promise<string[]> => {
  if (!checkIfFileExists(`${projectPath}/drogon-config.json`))
    panic('Please run the command inside the Drogon Project');

  const projects: any = {};

  let files = fs.readdirSync(`${projectPath}/src/`);
  files = removeItemOnce(files, 'build');

  files.forEach(file => {
    if (fs.lstatSync(`${projectPath}/src/${file}`).isDirectory()) {
      projects[file] = `${projectPath}/src/${file}`;
    }
  });

  return projects;
};

export const listOptmizedContracts = async (
  projectPath: string,
  cb?: any
): Promise<string[]> => {
  let projects = await listAvailableContracts(projectPath);
  let contracts: any = {};
  for (var project in projects) {
    let files = fs.readdirSync(`${projectPath}/src/${project}/build/libs/`);
    for (var i in files) {
      let file = files[i];
      if (file.indexOf('-optimized.jar') != -1) {
        contracts[file] = `src/${project}/build/libs/${file}`;
      }
    }
  }

  return contracts;
};

export class ProgressBar {
  private DONE = '✅';
  private ERROR = '❌';
  private SPARKLE = '✨';

  private progressBar = [
    ' 🧑⚽️       🧑 ',
    '🧑  ⚽️      🧑 ',
    '🧑   ⚽️     🧑 ',
    '🧑    ⚽️    🧑 ',
    '🧑     ⚽️   🧑 ',
    '🧑      ⚽️  🧑 ',
    '🧑       ⚽️🧑  ',
    '🧑      ⚽️  🧑 ',
    '🧑     ⚽️   🧑 ',
    '🧑    ⚽️    🧑 ',
    '🧑   ⚽️     🧑 ',
    '🧑  ⚽️      🧑 ',
  ];

  private msg = '';
  private _pos = 0;
  private intervalID: any;
  private interval = 1000; // milliseconds

  constructor(msg: string, interval: number) {
    this.msg = msg;
    if (interval) this.interval = interval;
  }

  start() {
    this.intervalID = setInterval(() => {
      if (this._pos === this.progressBar.length) this._pos = 0;

      process.stdout.clearLine(0);
      process.stdout.write(`\r${this.progressBar[this._pos]}`);
      this._pos += 1;
    }, this.interval);
  }

  stop() {
    clearInterval(this.intervalID);
    this.intervalID = null;
    process.stdout.clearLine(0);
    process.stdout.write(`\r${this.DONE} ${this.msg}\n`);
  }

  stopWithMessageAndSymbol(symbol: string, msg: string) {
    this.stop();
    process.stdout.write(`\r${symbol} ${msg}`);
  }

  stopWithMessage(msg: string) {
    this.stop();
    process.stdout.write(`\r${this.SPARKLE} ${msg}`);
  }

  error(msg: string) {
    this.stop();
    process.stderr.write(`\r${this.ERROR} ${msg}`);
  }
}

// Generates a unique container name for a given project path
export const getContainerNameForProject = (
  projectPath: string,
  imageName: string,
  containerNamePrefix: string
) => {
  const hash = crypto.createHash('sha256').update(projectPath).digest('hex');
  const projectName = path.basename(projectPath);
  const containerName = `${containerNamePrefix}-${projectName}-${hash}`;
  return containerName;
};

// introduce an artificial wait in seconds
export const wait = (seconds: number) => {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
};
export const executeShellCommand = (command:string) => {
  return new Promise((resolve, reject) => {
    shell.exec(command, (code:any, stdout:any, stderr:any) => {
      if (code !== 0) {
        reject(new Error(stderr.toString()));
      } else {
        resolve(stdout);
      }
    });
  });
};