import Docker from 'dockerode';
import {DROGON_IMAGE} from '../constants';
import {panic} from '../helpers';

export const dockerInit = () => {
  return new Docker(); //defaults to above if env variables are not used
};

export const pullImage = async (image: string) => {
  const docker = dockerInit();
  await docker
    .pull(image)
    .then(stream => {
      docker.modem.followProgress(stream, onFinished, onProgress);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      function onFinished(err: any, output: any) {}
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  const docker = dockerInit();

  const container = await docker.createContainer({
    Image: image,
    Cmd: cmd,
    HostConfig: hostConfig,
  });

  await container.start({});
  return container;
};

export const mountAndRunCommand = (
  projectPath: string,
  args: any,
  command: string,
  cb: any
) => {
  const docker = dockerInit();

  if (args) command = `${command} ${args.join(' ')}`;

  docker.createContainer(
    {
      Image: DROGON_IMAGE,
      HostConfig: {
        AutoRemove: true,
        Binds: [`${projectPath}:/goloop/app`],
      },
      Tty: false,
    },
    (err, container: any) => {
      if (err) panic(err);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      container.start((err: any, stream: any) => {
        container.exec(
          {
            Cmd: ['sh', '-c', command],
            AttachStderr: true,
            AttachStdout: true,
            WorkingDir: '/goloop/app',
          },
          (err: any, exec: any) => {
            exec.start({Tty: false, Detach: false}, (err: any, stream: any) => {
              docker.modem.demuxStream(stream, process.stdout, process.stderr);
            });

            const id = setInterval(() => {
              exec.inspect({}, (err: any, status: any) => {
                if (status.Running === false) {
                  clearInterval(id);
                  container.stop({}, () => {
                    cb(status.ExitCode);
                  });
                }
              });
            }, 100);
          }
        );
      });
    }
  );
};

export async function interactWithDockerContainer(
  containerName: string,
  destination: string
) {
  const docker = new Docker();
  const container = await docker.getContainer(containerName);

  await container.attach({
    stderr: true,
    stdin: true,
    stdout: true,
    stream: true,
    hijack: true,
  });

  // Start the container
  await container.start();

  // Execute a command in the container
  container.exec(
    {
      AttachStdout: true,
      AttachStderr: true,
      AttachStdin: true,
      Tty: true,
      WorkingDir: destination,
      Cmd: [
        'sh',
        '-c',
        `stty columns ${process.stdout.columns} rows ${process.stdout.rows} && tackle sudoblockio/tackle-icon-sc-poc`,
      ],
    },
    (err: any, exec: any) => {
      exec.start({stream: true, hijack: true}, (err: any, stream: any) => {
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        process.stdin.setRawMode(true);
        process.stdin.pipe(stream);

        stream.on('end', async () => {
          await container.stop();
          process.exit();
        });

        docker.modem.demuxStream(stream, process.stdout, process.stderr);

        // Attach a listener to the SIGINT signal
        process.on('SIGINT', async () => {
          console.log('stopping container');
          await container.stop();
          process.exit();
        });
      });
    }
  );
}
