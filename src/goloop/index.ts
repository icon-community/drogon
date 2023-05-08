// goloop ks
import signale from 'signale';
import {ensureCWDDrogonProject, getContainerNameForProject} from '../helpers';
import {mountAndRunCommand, mountAndRunCommandInContainer} from '../helpers/docker';
import { DROGON_IMAGE } from '../constants';

export const generateKeystore = async (
  projectPath: string,
  password: any,
  args: any
) => {
  // ensureCWDDrogonProject(projectPath);

  signale.pending('Generating Keystore...');
  let command = `goloop ks gen --out ./.keystore.json `;
  if (password) {
    command += `--password ${password}`;
  }

  await mountAndRunCommand(projectPath, args, command, (exitCode: any) => {
    if (exitCode) {
      signale.fatal('Failed to generate Keystore');
      process.exit(exitCode);
    } else {
      signale.success('Done generating Keystore');
    }
  });
};

export const goloop = async (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);

  signale.pending('Running goloop command');
  const command = 'goloop';
  await mountAndRunCommand(projectPath, args, command, (exitCode: any) => {
    if (exitCode) {
      signale.fatal('Failed to run goloop command');
      process.exit(exitCode);
    } else {
      signale.success('Finished running goloop command');
    }
  });
};

export const runGoloopCmd = async (projectPath: any, command: any, cb: any) => {
  const container = getContainerNameForProject(
    projectPath,
    DROGON_IMAGE,
    'drogon'
  );

  await mountAndRunCommandInContainer(container, "/goloop/app", [], command, (exitCode: any, output: string) => {
    if (exitCode) {
      console.log(output)
      process.exit(exitCode);
    } else {
      cb(output)
    }
  }, false);
}