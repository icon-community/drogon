import signale from "signale";
import { ensureCWDDrogonProject, getContainerNameForProject } from "../helpers";
import { mountAndRunCommandInContainer, mountAndRunCommandWithOutput, runAContainerInBackground, stopContainerWithName } from "../helpers/docker";
import { DROGON_IMAGE } from "../constants";

export const startTheGradleDaemon = (projectPath: string, args: any) => {
    ensureCWDDrogonProject(projectPath);
    const command = 'tail -f /dev/null'
    signale.pending('Starting Drogon daemon');

    runAContainerInBackground(projectPath, args, command).then(async () => {
        signale.success('Started Drogon daemon');
        // const container = getContainerNameForProject(projectPath, DROGON_IMAGE, "drogon")
        // const command = "gradle --daemon"
        // await mountAndRunCommandInContainer(container, projectPath, args, command, (code: any) => { process.exit(code) })
    })
}

export const stopTheGradleDaemon = (projectPath: string, args: any) => {
    ensureCWDDrogonProject(projectPath);
    const container = getContainerNameForProject(projectPath, DROGON_IMAGE, "drogon")
    const command = "gradle --stop"
    signale.pending('Stopping Drogon daemon');
    mountAndRunCommandInContainer(container, projectPath, args, command, async (code: any) => { 
        await stopContainerWithName(container)
        signale.success('Stopped Drogon daemon');
        process.exit(code)
    })
}

