// goloop ks
import signale from 'signale';
import {ensureCWDDrogonProject} from '../helpers';
import {mountAndRunCommand} from '../helpers/docker';

export const generateKeystore = async (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);

  signale.pending('Generating Keystore...');
  const command = `goloop ks gen -o /goloop/app/.keystore.json -p ${args.password}`;
  mountAndRunCommand(projectPath, args, command, (exitCode: any) => {
    signale.success('Done');
    if (exitCode !== 0) process.exit(exitCode);
  });
};

export const goloop = async (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);

  signale.pending('Running goloop command');
  const command = 'goloop';
  mountAndRunCommand(projectPath, args, command, (exitCode: any) => {
    signale.success('Done');
    if (exitCode !== 0) process.exit(exitCode);
  });
};
