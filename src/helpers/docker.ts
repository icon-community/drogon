import Docker from 'dockerode';
import {panic} from '../helpers';

export const dockerInit = () => {
  return new Docker(); //defaults to above if env variables are not used
};

export const pullImage = async (image: string) => {
  let docker = dockerInit();
  await docker
    .pull(image)
    .then(stream => {
      docker.modem.followProgress(stream, onFinished, onProgress);
      function onFinished(err: any, output: any) {}

      function onProgress(event: any) {
        // let status = event.status
        // let progress = event.progress
        // if(progress)
        //     process.stdout.write(`[docker]: ${progress}` + '\r')
      }
    })
    .catch(err => {
      panic(`Failed to pull the ${image}. ${err}`);
    });
};

export const runAContainerInBackground = async (
  image: string,
  cmd: [],
  hostConfig: {}
) => {
  let docker = dockerInit();

  const container = await docker.createContainer({
    Image: image,
    Cmd: cmd,
    HostConfig: hostConfig,
  });

  await container.start({});
  return container;
};
