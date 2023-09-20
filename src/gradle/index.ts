import signale from 'signale';
import {ensureCWDDrogonProject, getContainerNameForProject} from '../helpers';
import {
  mountAndRunCommandInContainer,
  runAContainerInBackground,
  stopContainerWithName,
} from '../helpers/docker';
var shell = require('shelljs');
import {DROGON_CONFIG_FOLDER} from '../constants';
import { ensureDIVECli, ensureKurtosisCli, ensureKurtosisRunning} from '../core/dependencies';

export const startDiveDaemon = (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);

  ensureKurtosisCli();
  ensureDIVECli();

  ensureKurtosisRunning();

  const command = `${DROGON_CONFIG_FOLDER}/dive chain icon -d`
  signale.pending('Starting Drogon daemon');

  shell.exec(command,(code: any, stdout: any, stderr: any) => {
    if (code !== 0) {
      signale.error('Failed to start Drogon daemon');
      console.log(stderr.toString())
      process.exit(code);
    }
    else {
      signale.success('Started Drogon daemon');
      process.exit(code);
    }
  })
};

export const stopDrogonDaemon = async (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);
  
  const diveStop = `${DROGON_CONFIG_FOLDER}/dive clean`
  signale.pending('Stopping Drogon daemon');
  await stopTheService(diveStop);

  const kurtosisStop = `${DROGON_CONFIG_FOLDER}/kurtosis engine stop`
  await stopTheService(kurtosisStop);

  signale.success('Stopped Drogon daemon');
};


const stopTheService = async (command: string) => {
  shell.exec(command,(code: any, stdout: any, stderr: any) => {
    if (code !== 0) {
      process.exit(code);
    }
    else {
      process.exit(code);
    }
  })
}