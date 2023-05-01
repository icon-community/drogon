// goloop ks
import signale from 'signale';
import { ensureCWDDrogonProject } from '../helpers';
import { mountAndRunCommand } from '../helpers/docker';

export const generateKeystore = async (projectPath: string, password: any, args: any) => {
  // ensureCWDDrogonProject(projectPath);

  signale.pending('Generating Keystore...');
  let command = `goloop ks gen --out ./.keystore.json `
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
