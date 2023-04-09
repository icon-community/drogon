import signale from 'signale';
import { ensureCWDDrogonProject, listAvailableContracts } from '../helpers';
import { mountAndRunCommand } from '../helpers/docker';

export const deployContracts = (projectPath: string, opts: any, args: any) => {
  ensureCWDDrogonProject(projectPath);

  signale.pending('Deploying contracts');

  listAvailableContracts(projectPath, (projects: any) => {
    let destination = ""

    if (opts.local) {
      destination = "deployToLocal"
    } else if (opts.lisbon) {
      destination = "deployToLisbon"
    } else if (opts.custom) {
      destination = `deployTo${opts.custom}`
    }

    for (const i in projects) {

      const command = `gradle src:${i}:${destination}`;
      mountAndRunCommand(projectPath, args, command, (exitCode: any) => {
        if (exitCode) {
          signale.fatal('Failed to deploy contracts');
          process.exit(exitCode);
        } else {
          signale.success('Done deploying contracts');
        }
      }).then(() => {

        
      });
    }
  });
};
