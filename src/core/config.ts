import prompts from 'prompts';

enum Deployment {
  DeployJar = 0,
  DeployGoloop = 1,
}

interface Compiler {
  gradle_version: string;
}

interface Network {
  uri: string;
  network_id: number;
}

export class Config {
  private keystore: any;
  private password: any;
  private name: string = '';
  private networks: Network[] = [];

  // Do you want to use deployJar inside every projects or
  // want to deploy using goloop?
  private deployJar: Deployment = Deployment.DeployGoloop;

  constructor(config: any) {
    this.keystore = config.keystore;
    this.password = config.password;
    this.networks = config.networks;
    if (config.deployJar) this.deployJar = Deployment.DeployJar;
  }

  static generateNew(name: any) {
    return {
      name: name,
      networks: {
        development: {
          uri: 'http://localhost:9082/api/v3',
          network_id: 0x3,
        },
        lisbon: {
          uri: 'http://lisbon.net.solidwallet.io/api/v3',
          network_id: 0x2,
        },
      },
      deployJar: false,
      keystore: '.keystore.json',
    };
  }
}

// gradle getDeps.
