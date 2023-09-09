import signale from 'signale';
import {ensureCWDDrogonProject, getContainerNameForProject} from '../helpers';
import {
  mountAndRunCommandInContainer,
  runAContainerInBackground,
  stopContainerWithName,
} from '../helpers/docker';
var shell = require('shelljs');
import {DROGON_CONFIG_FOLDER, DROGON_IMAGE} from '../constants';
import { ensureDIVECli, ensureKurtosisCli } from '../core/dependencies';

export const startTheGradleDaemon = (projectPath: string, args: any) => {
  // ensureCWDDrogonProject(projectPath);

  ensureKurtosisCli();
  ensureDIVECli();

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

export const stopTheGradleDaemon = (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);

  const container = getContainerNameForProject(
    projectPath,
    DROGON_IMAGE,
    'drogon'
  );

  const command = 'gradle --stop';
  signale.pending('Stopping Drogon daemon');
  mountAndRunCommandInContainer(
    container,
    projectPath,
    args,
    command,
    async (code: any) => {
      await stopContainerWithName(container);
      signale.success('Stopped Drogon daemon');
      process.exit(code);
    },
    true
  );
};
