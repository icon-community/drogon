import signale from 'signale';
import { checkIfFileExists, ensureCWDDrogonProject, getContainerNameForProject, importJson, listAvailableContracts, panic } from '../helpers';
import { mountAndRunCommand, mountAndRunCommandInContainer } from '../helpers/docker';
import { DROGON_IMAGE } from '../constants';

export const deployContracts = async (projectPath: string, opts: any, args: any) => {
  ensureCWDDrogonProject(projectPath);

  let destination = ""

  if (opts.local) {
    destination = "deployToLocal"
  } else if (opts.lisbon) {
    destination = "deployToLisbon"
  } else if (opts.custom) {
    destination = `deployTo${opts.custom}`
  }

  // read the drogon config file
  const config = importJson(`${projectPath}/` + opts.config);
  if (!config)
    panic('Please run the command inside the Drogon Project');

  // get configured keystore from config
  const keystore = config.keystore

  if (!checkIfFileExists(`${projectPath}/` + keystore)) {
    panic(`Configured Keystore file ${keystore} not found in folder ${projectPath}`);
  }

  
  const password = opts.password
  const getAddressCmd = `goloop ks pubkey -k=${keystore} -p=${password}`

  let address = ""
  const container = getContainerNameForProject(projectPath, DROGON_IMAGE, "drogon")

  mountAndRunCommandInContainer(container, projectPath, args, getAddressCmd, (exitCode: any, output: string) => {
    address = output.substring(8, output.length - 1)
  }, false)
  
  // TODO: Check balance RPC call on the configured network

  signale.pending('Deploying contracts');
  listAvailableContracts(projectPath, (projects: any) => {

    for (const i in projects) {

      let command = `gradle src:${i}:${destination} -PkeystoreName=/goloop/app/${keystore}`;

      if (password) {
        command += ` -PkeystorePass=${password}`
      }

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
