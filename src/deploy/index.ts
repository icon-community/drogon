import signale from 'signale';
import {DROGON_IMAGE} from '../constants';
import {
  ensureCWDDrogonProject,
  listAvailableContracts,
  panic,
  ProgressBar,
} from '../helpers';
import {dockerInit, mountAndRunCommand} from '../helpers/docker';

export const deployContracts = (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);

  signale.pending('Deploying contracts');

  listAvailableContracts(projectPath, (projects: any) => {
    for (var i in projects) {
      let command = `/goloop/gradlew --build-cache -g /goloop/app/.cache/ src:${i}:deployJar`;
      mountAndRunCommand(projectPath, args, command, (exitCode: any) => {
        signale.success('Done');
        if (exitCode != 0) process.exit(exitCode);
      });
    }
  });
};
