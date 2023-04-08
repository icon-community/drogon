import signale from 'signale';
import {ensureCWDDrogonProject, listAvailableContracts} from '../helpers';
import {mountAndRunCommand} from '../helpers/docker';

export const optimizeContracts = (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);

  signale.pending('Optimizing contracts');

  listAvailableContracts(projectPath, (projects: any) => {
    for (const i in projects) {
      const command = `gradle src:${i}:optimizedJar`;

      mountAndRunCommand(projectPath, args, command, (exitCode: any) => {
        if(exitCode) {
          signale.fatal('Failed to optimize contracts');
        } else {
          signale.success('Done optimizing contracts');
        }
        if (exitCode !== 0) process.exit(exitCode);
      }).then(() => {
        
      });
    }
  });
};
