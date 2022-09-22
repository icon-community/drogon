import * as fs from 'fs';
import {textSync} from 'figlet';
import {exit} from 'process';
import chalk from 'chalk';
import signale from 'signale';

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
  signale.complete(`Ok! Good bye!!`);
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

export const ensureCWDDrogonProject = (projectPath: string) => {
  if (checkIfFileExists(`${projectPath}/drogon-config.json`)) return;

  panic('Please run the command inside the Drogon Project');
};

function removeItemOnce(arr: any, value: string) {
  var index = arr.indexOf(value);
  if (index > -1) {
    arr.splice(index, 1);
  }
  return arr;
}

export const listAvailableContracts = (projectPath: string, cb: any) => {
  if (!checkIfFileExists(`${projectPath}/drogon-config.json`))
    panic('Please run the command inside the Drogon Project');

  let projects: any = {};

  fs.readdir(`${projectPath}/src`, (err, files) => {
    if (err) {
      return console.log('Unable to scan directory: ' + err);
    }

    files = removeItemOnce(files, 'build');

    files.forEach(function (file) {
      if (fs.lstatSync(`${projectPath}/src/${file}`).isDirectory()) {
        projects[file] = `${projectPath}/src/${file}`;
      }
    });

    cb(projects);
  });
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
  private _pos: number = 0;
  private intervalID: any;
  private interval: number = 1000; // milliseconds

  constructor(msg: string, interval: number) {
    this.msg = msg;
    if (interval) this.interval = interval;
  }

  start() {
    this.intervalID = setInterval(() => {
      if (this._pos == this.progressBar.length) this._pos = 0;

      process.stdout.clearLine(0);
      process.stdout.write(`\b\r${this.progressBar[this._pos]}`);
      this._pos += 1;
    }, this.interval);
  }

  stop() {
    clearInterval(this.intervalID);
  }

  stopWithMessageAndSymbol(symbol: string, msg: string) {
    this.stop();
    process.stdout.write(`\b\r${symbol} ${msg}`);
  }

  stopWithMessage(msg: string) {
    this.stop();
    process.stdout.write(`\b\r${this.SPARKLE} ${msg}\n`);
  }

  error(msg: string) {
    this.stop();
    process.stderr.write(`\b\r${this.ERROR} ${msg}`);
  }
}
