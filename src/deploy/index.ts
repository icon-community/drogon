import signale from 'signale';
import {DROGON_IMAGE} from '../constants';
import {
  ensureCWDDrogonProject,
  listAvailableContracts,
  panic,
  ProgressBar,
} from '../helpers';
import {dockerInit} from '../helpers/docker';

export const deployContracts = (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);

  signale.pending('Deploying contracts');

  listAvailableContracts(projectPath, (projects: any) => {
    for (var i in projects) {
      let command = `/goloop/gradlew --build-cache -g /goloop/app/.cache/ src:${i}:deployJar`;

      mountAndCompile(projectPath, args, command, (exitCode: any) => {
        signale.success('Done');
        if (exitCode != 0) process.exit(exitCode);
      });
    }
  });
};

export const mountAndCompile = (
  projectPath: string,
  args: any,
  command: string,
  cb: any
) => {
  let docker = dockerInit();

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
    function (err, container: any) {
      if (err) panic(err);
      container.start(function (err: any, stream: any) {
        container.exec(
          {
            Cmd: ['sh', '-c', command],
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
