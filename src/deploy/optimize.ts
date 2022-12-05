import signale from 'signale';
import {DROGON_IMAGE} from '../constants';
import {
  ensureCWDDrogonProject,
  listAvailableContracts,
  panic,
  ProgressBar,
} from '../helpers';
import {dockerInit, mountAndRunCommand} from '../helpers/docker';

export const optimizeContracts = (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);

  signale.pending('Deploying contracts');

  listAvailableContracts(projectPath, (projects: any) => {
    for (const i in projects) {
      const command = `/goloop/gradlew --build-cache -g /goloop/app/.cache/ src:${i}:optimizedJar`;

      mountAndRunCommand(projectPath, args, command, (exitCode: any) => {
        signale.success('Done');
        if (exitCode != 0) process.exit(exitCode);
      });
    }
  });
};
