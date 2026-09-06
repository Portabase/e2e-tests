import {spawn} from "node:child_process";
import {mkdtemp, mkdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";

export type CliContext = {
    cwd: string;
    env: NodeJS.ProcessEnv;
};

export type CliResult = {
    exitCode: number;
    stdout: string;
    stderr: string;
    output: string;
};

export async function createCliContext(): Promise<CliContext> {
    const root = await mkdtemp(path.join(tmpdir(), "portabase-cli-e2e-"));
    const cwd = path.join(root, "work");
    const home = path.join(root, "home");
    const config = path.join(root, "config");
    const env = {...process.env};

    delete env.FORCE_COLOR;
    delete env.NO_COLOR;

    await Promise.all([
        mkdir(cwd),
        mkdir(home),
        mkdir(config),
    ]);

    return {
        cwd,
        env: {
            ...env,
            COLUMNS: "120",
            FORCE_COLOR: "0",
            HOME: home,
            TERM: "dumb",
            XDG_CONFIG_HOME: config,
        },
    };
}

export async function runCli(args: string[], context: CliContext, timeout = 30_000): Promise<CliResult> {
    return new Promise((resolve, reject) => {
        const child = spawn("portabase", args, {
            cwd: context.cwd,
            env: context.env,
            stdio: ["ignore", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";
        let timedOut = false;

        const timeoutId = setTimeout(() => {
            timedOut = true;
            child.kill("SIGTERM");
        }, timeout);

        child.stdout.on("data", (chunk) => {
            stdout += chunk.toString();
        });

        child.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
        });

        child.on("error", (error) => {
            clearTimeout(timeoutId);
            reject(error);
        });

        child.on("close", (code) => {
            clearTimeout(timeoutId);

            if (timedOut) {
                reject(new Error(`portabase ${args.join(" ")} timed out after ${timeout}ms`));
                return;
            }

            resolve({
                exitCode: code ?? 1,
                stdout,
                stderr,
                output: `${stdout}${stderr}`,
            });
        });
    });
}
