import signale from 'signale';
import {ensureCWDDrogonProject, getContainerNameForProject} from '../helpers';
import {mountAndRunCommandInContainer} from '../helpers/docker';
import {DROGON_IMAGE} from '../constants';

export const testContracts = (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);

  signale.pending('Testing contracts');
  const command = 'gradle test';
  const container = getContainerNameForProject(
    projectPath,
    DROGON_IMAGE,
    'drogon'
  );
  mountAndRunCommandInContainer(
    container,
    projectPath,
    args,
    command,
    (exitCode: any) => {
      if (exitCode) {
        signale.fatal('Failed');
      } else {
        signale.success('Testing contracts successful');
      }
      process.exit(exitCode);
    },
    true
  );
};
