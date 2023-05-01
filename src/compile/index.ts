import signale from 'signale';
import {ensureCWDDrogonProject, getContainerNameForProject} from '../helpers';
import {mountAndRunCommand, mountAndRunCommandInContainer} from '../helpers/docker';
import { DROGON_IMAGE } from '../constants';

export const compileContracts = (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);

  signale.pending('Compiling contracts');
  mountAndCompile(projectPath, args, (exitCode: any, output: any) => {
    if(exitCode) {
      signale.fatal('Failed');
      process.exit(exitCode);
    } else {
      signale.success('Done');
      process.exit(exitCode);
    }
  });
};

export const mountAndCompile = (projectPath: string, args: any, cb: any) => {
  const command = 'gradle build';
  const container = getContainerNameForProject(projectPath, DROGON_IMAGE, "drogon")
  mountAndRunCommandInContainer(container, projectPath, args, command, cb, true)
};
