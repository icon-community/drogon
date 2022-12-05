import signale from 'signale';
import {DROGON_IMAGE} from '../constants';
import {ensureCWDDrogonProject, panic, ProgressBar} from '../helpers';
import {dockerInit, mountAndRunCommand} from '../helpers/docker';

export const compileContracts = (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);

  signale.pending('Compiling contracts');
  mountAndCompile(projectPath, args, (exitCode: any) => {
    signale.success('Done');
    process.exit(exitCode);
  });
};

export const mountAndCompile = (projectPath: string, args: any, cb: any) => {
  const docker = dockerInit();
  const command = '/goloop/gradlew --build-cache -g /goloop/app/.cache/ build';
  mountAndRunCommand(projectPath, args, command, cb);
};
