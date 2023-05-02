import Docker from 'dockerode';
import {DROGON_IMAGE} from '../constants';
import {getContainerNameForProject, panic} from '../helpers';
import {PassThrough} from 'stream';

export const dockerInit = () => {
  return new Docker(); //defaults to above if env variables are not used
};

export const pullImage = async (image: string) => {
  const docker = dockerInit();

  return new Promise<void>((resolve, reject) => {
    docker.pull(image, (err: any, stream: any) => {
      if (err) {
        reject(err);
      } else {
        docker.modem.followProgress(stream, onFinished, onProgress);

        function onProgress(event: any) {
          // console.log(`Pulling ${image}: ${event.status}`);
        }

        function onFinished(err: any, output: any) {
          if (err) {
            reject(err);
          } else {
            console.log(`Successfully pulled ${image}`);
            resolve();
          }
        }
      }
    });
  });
};
export const localDrogonImageId = async (
  image: string
): Promise<string | null> => {
  const docker = dockerInit();
  const list = await docker.listImages();
  const filtered = list.filter(o => {
    if (o.RepoTags) {
      return o.RepoTags.indexOf(image) > -1;
    }
    return false;
  });
  if (filtered.length > 0) {
    return filtered[0].Id;
  }
  return null;
};
export const removeImage = async (imageId: string): Promise<boolean> => {
  const docker = dockerInit();
  const image = await docker.getImage(imageId);
  await image.remove();
  return true;
};
export const createNetwork = async (name: string) => {
  const docker = dockerInit();
  try {
    await docker.createNetwork({ Name: name, Attachable: true, CheckDuplicate : false})
    console.log(`Successfully created ${name}`);
    return
  } catch (error) {
    throw error
  }
}

export const runAContainerInBackground = async (
  projectPath: string,
  image: string, 
  command: string,
  args: any,
  containerNamePrefix: string
) => {
  const docker = dockerInit();
  if (args) command = `${command} ${args}`;

  const container = await docker.createContainer({
    name: getContainerNameForProject(projectPath, image, containerNamePrefix),
    Image: image,
    Cmd: ['sh', '-c', command],
    HostConfig: {
      AutoRemove: true,
      Binds: [`${projectPath}:/goloop/app`]
    },
  });
  
  await container.start({});
  return container;
};

export const mountAndRunCommand = async (
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
    async (err, container: any) => {
      if (err) panic(err);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      await container.start((err: any, stream: any) => {
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
                  cb(status.ExitCode);
                }
              });
            }, 100);
          }
        );
      });
    }
  );
};

export const AsyncRunCommandInContainer = async (
  containerName: string,
  args: any,
  command: string,
  logToStdout: boolean
): Promise<string> => {
  const docker = new Docker();

  if (args) command = `${command} ${args.join(' ')}`;

  const container = docker.getContainer(containerName);

  const output = new PassThrough();

  // Execute a command in the container
  const exec = await container.exec({
    AttachStdout: true,
    AttachStderr: true,
    Tty: true,
    WorkingDir: '/goloop/app',
    Cmd: ['sh', '-c', command],
  });

  const stream = await exec.start({hijack: true, Tty: false, Detach: false});

  stream.pipe(output);

  if (logToStdout) {
    docker.modem.demuxStream(stream, process.stdout, process.stderr);
  }

  const [code, out] = await Promise.all([
    new Promise<number>(resolve => {
      exec.inspect((err, status: any) => {
        if (err || !status) {
          resolve(-1);
        } else {
          resolve(status.ExitCode);
        }
      });
    }),

    new Promise<string>(resolve => {
      output.on('data', (chunk: any) => {
        resolve(chunk.toString());
      });
    }),
  ]);

  return out;
};

export const mountAndRunCommandInContainer = async (
  containerName: string,
  projectPath: string,
  args: any,
  command: string,
  cb: any,
  logToStdout: boolean
) => {
  const docker = dockerInit();

  if (args) command = `${command} ${args.join(' ')}`;

  const container = docker.getContainer(containerName);

  let output = '';

  // Execute a command in the container
  container.exec(
    {
      AttachStdout: true,
      AttachStderr: true,
      AttachStdin: true,
      Tty: true,
      WorkingDir: '/goloop/app',
      Cmd: ['sh', '-c', command],
    },
    (err: any, exec: any) => {
      if (err)
        panic(`Failed to start container. ${err}`)

      exec.start({stream: true, hijack: true}, (err: any, stream: any) => {
        stream.on('end', async () => {});

        stream.on('data', async (chunk: any) => {
          output += chunk.toString();
        });

        if (logToStdout) {
          docker.modem.demuxStream(stream, process.stdout, process.stderr);
        }
      });

      const id = setInterval(() => {
        exec.inspect({}, (err: any, status: any) => {
          if (status.Running === false) {
            clearInterval(id);
            cb(status.ExitCode, output);
          }
        });
      }, 100);
    }
  );
};

export async function interactWithDockerContainer(
  containerName: string,
  destination: string,
  command: string
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
      Cmd: ['sh', '-c', command],
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

      const id = setInterval(() => {
        exec.inspect({}, (err: any, status: any) => {
          if (status.Running === false) {
            clearInterval(id);
            container.stop({}, () => {
              process.exit(status.ExitCode);
            });
          }
        });
      }, 100);
    }
  );
}

export const mountAndRunCommandWithOutput = (
  projectPath: string,
  args: any,
  command: string,
  cbWithOutput: any
) => {
  let output = '';
  const docker = dockerInit();

  if (args) command = `${command} ${args.join(' ')}`;

  docker.createContainer(
    {
      name: getContainerNameForProject(projectPath, DROGON_IMAGE, 'drogon'),
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
              stream.on('data', function (chunk: any) {
                output += chunk.toString();
              });

              stream.on('end', function () {
                // End of stdout
                container.stop().then(() => {
                  // container stopped
                });
              });

              docker.modem.demuxStream(stream, process.stdout, process.stderr);
            });

            const id = setInterval(() => {
              exec.inspect({}, (err: any, status: any) => {
                if (status.Running === false) {
                  clearInterval(id);
                  container.stop({}, () => {
                    cbWithOutput(status.ExitCode, output);
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

export const stopContainerWithName = async (containerName: string) => {
  const docker = new Docker();
  const container = await docker.getContainer(containerName);
  await container.stop();
};
