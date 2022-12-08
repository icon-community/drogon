import signale from 'signale';
import {ensureCWDDrogonProject, listAvailableContracts} from '../helpers';
import {mountAndRunCommand} from '../helpers/docker';

export const deployContracts = (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);

  signale.pending('Deploying contracts');

  listAvailableContracts(projectPath, (projects: any) => {
    for (const i in projects) {
      const command = `/goloop/gradlew --build-cache -g /goloop/app/.cache/ src:${i}:deployJar`;
      mountAndRunCommand(projectPath, args, command, (exitCode: any) => {
        signale.success('Done');
        if (exitCode !== 0) process.exit(exitCode);
      });
    }
  });
};
