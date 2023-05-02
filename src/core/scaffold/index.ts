import axios from 'axios';
import {basename} from 'path';
import {DROGON_IMAGE, DROGON_NETWORK} from '../../constants';

import {panic, ProgressBar} from '../../helpers';
import {dockerInit, interactWithDockerContainer} from '../../helpers/docker';

export const scaffoldProject = async (
  projectName: string,
  repo: string,
  destination: string
) => {
  const branch = 'master';
  const progressBar = new ProgressBar('Scaffolding...', 100);
  progressBar.start();

  await verifySourcePath(repo);
  await fetchProject(projectName, repo, destination, branch);
  progressBar.stopWithMessage('Scaffolding done 🎉');
};

// Checks if the repository exists
export const verifySourcePath = async (repo: string) => {
  const repoUrl = `https://github.com/${repo}`;

  try {
    await axios.head(repoUrl, {maxRedirects: 50});
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      panic(
        `Drogon project at URL ${repoUrl} doesn't exist. If you believe this is an error, please contact Drogon team.`
      );
    } else {
      const prefix = `Error connecting to ${repoUrl}. Please check your internet connection and try again.`;
      error.message = `${prefix}\n\n${error.message || ''}`;
      panic(error.message);
    }
  }
};

const fetchProject = async (
  projectName: string,
  source: string,
  destination: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  branch: string
) => {
  const url = `https://github.com/${source}`;

  const repoName = basename(source);

  const docker = await dockerInit();
  const container = await docker.run(
    DROGON_IMAGE,
    [
      'sh',
      '-c',
      `git clone ${url} && mv /home/${repoName}/${projectName} /goloop/app/src/${projectName}`,
    ],
    [process.stdout, process.stderr],
    {
      AutoRemove: true,
      Binds: [`${destination}:/goloop/app`],
      AttachStdout: true,
      AttachStderr: true,
      WorkingDir: '/home',
      NetworkMode: DROGON_NETWORK
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (err: any, data: any, container: any) => {
      if (err) panic(`Failed to fetch boilerplate. ${err}`);
    }
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  await container.on('stream', (stream: any) => {});
};

export const runTackle = async (projectName: string, destination: string) => {
  const docker = await dockerInit();
  await docker.createContainer({
    name: 'drogon-container',
    HostConfig: {
      AutoRemove: true,
      Binds: [`${destination}:/home/${projectName}`],
      NetworkMode: DROGON_NETWORK
    },
    Image: DROGON_IMAGE,
    Tty: true,
  });

  const command = `stty columns ${process.stdout.columns} rows ${process.stdout.rows} && tackle sudoblockio/tackle-icon-sc-poc`;
  await interactWithDockerContainer(
    'drogon-container',
    `/home/${projectName}`,
    command
  );
};
