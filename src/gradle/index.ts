import signale from 'signale';
import { ensureCWDDrogonProject, wait } from '../helpers';
var shell = require('shelljs');
import { DROGON_CONFIG_FOLDER } from '../constants';
import { ensureDIVECli, ensureKurtosisCli, ensureKurtosisRunning, ensureGradleDaemon, stopGradleDaemon } from '../core/dependencies';

export const startDaemons = (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);

  ensureKurtosisCli();
  ensureDIVECli();

  ensureKurtosisRunning();
  signale.pending('Starting Drogon daemon');

  wait(5)
    .then(() => {
      return ensureGradleDaemon(projectPath, args)
    })
    .then(() => {
      signale.success('Started Drogon daemon');
      process.exit(0);
    })
    .catch(error => {
      signale.error('Error during Drogon daemon start:', error);
      process.exit(1);
    });


};

export const stopDaemons = async (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);

  try {
    const diveStop = `${DROGON_CONFIG_FOLDER}/dive clean`
    signale.pending('Stopping Drogon daemon');
    await stopTheService(diveStop);
    await wait(5)
    const kurtosisStop = `${DROGON_CONFIG_FOLDER}/kurtosis engine stop`
    await stopTheService(kurtosisStop);
    await wait(2)
    await stopGradleDaemon(projectPath, args);
    signale.success('Stopped Drogon daemon');
  } catch (error) {
    console.log(error)
    signale.fatal('error stopping Drogon daemon');
  }
};


const stopTheService = async (command: string) => {
  shell.exec(command, (code: any, stdout: any, stderr: any) => {
    // console.log(stdout.toString())
    console.log(stderr.toString())
    if (code !== 0) {
      throw stderr
    }
  })
}