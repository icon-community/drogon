import signale from 'signale';
import {
  ensureCWDDrogonProject,
  getContainerNameForProject,
  listAvailableContracts,
} from '../helpers';
import {mountAndRunCommandInContainer} from '../helpers/docker';
import {DROGON_IMAGE} from '../constants';

export const optimizeContracts = (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);

  signale.pending('Optimizing contracts');

  const projects = listAvailableContracts(projectPath);
  for (const i in projects) {
    const command = `gradle src:${i}:optimizedJar`;

    mountAndOptimize(projectPath, command, args, (exitCode: any) => {
      if (exitCode) {
        signale.fatal('Failed to optimize contract');
      } else {
        signale.success('Done optimizing contract');
      }
    });
  }
};

export const mountAndOptimize = (
  projectPath: string,
  command: string,
  args: any,
  cb: any
) => {
  const container = getContainerNameForProject(
    projectPath,
    DROGON_IMAGE,
    'drogon'
  );
  mountAndRunCommandInContainer(
    container,
    args,
    command,
    cb,
    true
  );
};
