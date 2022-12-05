import signale from 'signale';
import {ensureCWDDrogonProject} from '../helpers';
import {mountAndRunCommand} from '../helpers/docker';

export const testContracts = (projectPath: string, args: any) => {
  ensureCWDDrogonProject(projectPath);

  signale.pending('Testing contracts');
  const command = '/goloop/gradlew --build-cache -g /goloop/app/.cache/ test';

  mountAndRunCommand(projectPath, args, command, (exitCode: any) => {
    signale.success('Done');
    process.exit(exitCode);
  });
};

// export const mountAndTest = (projectPath: string, args: any, cb: any) => {
//   let docker = dockerInit();
//   let command = `/goloop/gradlew --build-cache -g /goloop/app/.cache/ test`;
//   if (args) command = `${command} ${args.join(' ')}`;

//   docker.createContainer(
//     {
//       Image: DROGON_IMAGE,
//       HostConfig: {
//         AutoRemove: true,
//         Binds: [`${projectPath}:/goloop/app`],
//       },
//       Tty: false,
//     },
//     function (err, container: any) {
//       if (err) panic(err);

//       container.start(function (err: any, stream: any) {
//         container.exec(
//           {
//             Cmd: ['sh', '-c', command],
//             AttachStderr: true,
//             AttachStdout: true,
//             WorkingDir: '/goloop/app',
//           },
//           function (err: any, exec: any) {
//             exec.start(
//               {Tty: false, Detach: false},
//               function (err: any, stream: any) {
//                 docker.modem.demuxStream(
//                   stream,
//                   process.stdout,
//                   process.stderr
//                 );
//               }
//             );

//             let id = setInterval(() => {
//               exec.inspect({}, (err: any, status: any) => {
//                 if (status.Running == false) {
//                   clearInterval(id);
//                   container.stop({}, () => {
//                     cb(status.ExitCode);
//                   });
//                 }
//               });
//             }, 100);
//           }
//         );
//       });
//     }
//   );
// };
