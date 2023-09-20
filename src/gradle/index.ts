import signale from 'signale';
import { ensureCWDDrogonProject, wait, getContainerNameForProject } from '../helpers';
import {
  mountAndRunCommandInContainer,
  runAContainerInBackground,
  stopContainerWithName,
} from '../helpers/docker';
var shell = require('shelljs');
import { DROGON_CONFIG_FOLDER } from '../constants';
import { ensureDIVECli, ensureKurtosisCli, ensureKurtosisRunning } from '../core/dependencies';

export const startDiveDaemon = (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);

  ensureKurtosisCli();
  ensureDIVECli();

  ensureKurtosisRunning();
  signale.pending('Starting Drogon daemon');
  // wait for 10 seconds for the engine to be active
  wait(10).then(() => {
    const command = `${DROGON_CONFIG_FOLDER}/dive chain icon` //TODO: add support for the -d argument. currently it is failing at the first run
    shell.exec(command, (code: any, stdout: any, stderr: any) => {
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
  });

};

export const stopDrogonDaemon = async (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);

  try {
    const diveStop = `${DROGON_CONFIG_FOLDER}/dive clean`
    signale.pending('Stopping Drogon daemon');
    await stopTheService(diveStop);
    await wait(5)
    const kurtosisStop = `${DROGON_CONFIG_FOLDER}/kurtosis engine stop`
    await stopTheService(kurtosisStop);
    await wait(5)
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