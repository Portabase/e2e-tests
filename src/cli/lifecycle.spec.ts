import {expect, test} from "@playwright/test";
import {createCliContext, runCli} from "../helpers/cli";

const lifecycleCommands = [
    ["start", "Start a Portabase component."],
    ["stop", "Stop a Portabase component."],
    ["restart", "Restart a Portabase component."],
    ["logs", "View logs of a Portabase component."],
    ["uninstall", "Uninstall and delete a Portabase component."],
] as const;

test.describe("lifecycle commands", () => {
    for (const [command, description] of lifecycleCommands) {
        test(`prints ${command} help`, async () => {
            const context = await createCliContext();

            const result = await runCli([command, "--help"], context);

            expect(result.exitCode).toBe(0);
            expect(result.output).toContain(`Usage: portabase ${command}`);
            expect(result.output).toContain(description);
            expect(result.output).toContain("Path to component folder");
        });

        test(`requires a path for ${command}`, async () => {
            const context = await createCliContext();

            const result = await runCli([command], context);

            expect(result.exitCode).toBe(2);
            expect(result.output).toContain(`Usage: portabase ${command}`);
            expect(result.output).toContain("Path to component folder");
            expect(result.output).toContain("[required]");
        });
    }
});
