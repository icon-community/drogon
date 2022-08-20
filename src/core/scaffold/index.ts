import axios from 'axios';
import chalk from 'chalk';
import {basename} from 'path';
import {DROGON_IMAGE} from '../../constants';

import {panic, ProgressBar} from '../../helpers';
import {dockerInit} from '../../helpers/docker';

export const scaffoldProject = async (
  projectName: string,
  repo: string,
  destination: string
) => {
  let branch = 'master';
  let progressBar = new ProgressBar('Scaffolding...', 100);
  progressBar.start();

  await verifySourcePath(repo);
  await fetchProject(projectName, repo, destination, branch);
  progressBar.stopWithMessage('Scaffolding done 🎉');
};

// Checks if the repository exists
const verifySourcePath = async (repo: string) => {
  let repoUrl = `https://github.com/${repo}`;

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
  branch: string
) => {
  let url = `https://github.com/${source}`;

  let repoName = basename(source);

  let docker = await dockerInit();
  let container = await docker.run(
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
    },
    function (err: any, data: any, container: any) {
      if (err) panic(`Failed to fetch boilerplate. ${err}`);
    }
  );

  container.on('stream', (stream: any) => {});
};
