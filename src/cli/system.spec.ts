import {expect, test} from "@playwright/test";
import {createCliContext, runCli} from "../helpers/cli";

test.describe("system commands", () => {
    test("prints the installed CLI version", async () => {
        const context = await createCliContext();

        const result = await runCli(["--version"], context);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain("Portabase CLI version:");
    });

    test("prints top-level help with command categories", async () => {
        const context = await createCliContext();

        const result = await runCli(["--help"], context);

        expect(result.exitCode).toBe(0);
        expect(result.output).toContain("Portabase CLI to manage agents, dashboards and databases.");
        expect(result.output).toContain("System");
        expect(result.output).toContain("Creation");
        expect(result.output).toContain("Lifecycle");
        expect(result.output).toContain("Configuration");
    });

    test("prints update command help without updating the CLI", async () => {
        const context = await createCliContext();

        const result = await runCli(["update", "--help"], context);

        expect(result.exitCode).toBe(0);
        expect(result.output).toContain("Usage: portabase update");
        expect(result.output).toContain("Update the CLI to the latest version.");
    });
});
