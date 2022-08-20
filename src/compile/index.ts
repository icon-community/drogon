import {sign} from 'crypto';
import signale from 'signale';
import {DROGON_IMAGE} from '../constants';
import {ensureCWDDrogonProject, panic, ProgressBar} from '../helpers';
import {dockerInit} from '../helpers/docker';

export const compileContracts = (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);

  signale.pending('Compiling contracts');
  mountAndCompile(projectPath, args, () => {
    signale.success('Done');
  });
};

export const mountAndCompile = (projectPath: string, args: any, cb: any) => {
  let docker = dockerInit();
  let command = `/goloop/gradlew --build-cache -g /goloop/app/.cache/ build`;
  if (args)
    command = `${command} ${args.join(' ')}`

  docker.createContainer(
    {
      Image: DROGON_IMAGE,
      HostConfig: {
        AutoRemove: true,
        Binds: [`${projectPath}:/goloop/app`],
      },
      Tty: false,
    },
    function (err, container: any) {
      container.start(function (err: any, stream: any) {
        container.exec(
          {
            Cmd: [
              'sh',
              '-c',
              command
            ],
            AttachStderr: true,
            AttachStdout: true,
            WorkingDir: '/goloop/app',
          },
          function (err: any, exec: any) {
            exec.start(
              {Tty: false, Detach: false},
              function (err: any, stream: any) {
                docker.modem.demuxStream(
                  stream,
                  process.stdout,
                  process.stderr
                );
              }
            );

            let id = setInterval(() => {
              exec.inspect({}, (err: any, status: any) => {
                if (status.Running == false) {
                  container.stop({}, () => {});
                  clearInterval(id);
                  cb();
                }
              });
            }, 100);
          }
        );
      });
      container.attach({}, function (err: any, stream: any) {
        stream.pipe(process.stdout);
      });
    }
  );
};
