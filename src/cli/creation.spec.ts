import {expect, test} from "@playwright/test";
import {createCliContext, runCli} from "../helpers/cli";

test.describe("creation commands", () => {
    test("prints agent creation help", async () => {
        const context = await createCliContext();

        const result = await runCli(["agent", "--help"], context);

        expect(result.exitCode).toBe(0);
        expect(result.output).toContain("Usage: portabase agent");
        expect(result.output).toContain("Create a new Portabase Agent instance.");
        expect(result.output).toContain("Edge Key");
        expect(result.output).toContain("Timezone");
        expect(result.output).toContain("Polling frequency in seconds");
        expect(result.output).toContain("Start immediately");
    });

    test("requires an agent name", async () => {
        const context = await createCliContext();

        const result = await runCli(["agent"], context);

        expect(result.exitCode).toBe(2);
        expect(result.output).toContain("Usage: portabase agent");
        expect(result.output).toContain("Name of the agent");
        expect(result.output).toContain("[required]");
    });

    test("prints dashboard creation help", async () => {
        const context = await createCliContext();

        const result = await runCli(["dashboard", "--help"], context);

        expect(result.exitCode).toBe(0);
        expect(result.output).toContain("Usage: portabase dashboard");
        expect(result.output).toContain("Create a new Portabase Dashboard instance.");
        expect(result.output).toContain("Web Port");
        expect(result.output).toContain("Start immediately");
    });

    test("requires a dashboard name", async () => {
        const context = await createCliContext();

        const result = await runCli(["dashboard"], context);

        expect(result.exitCode).toBe(2);
        expect(result.output).toContain("Usage: portabase dashboard");
        expect(result.output).toContain("Name of the dashboard");
        expect(result.output).toContain("[required]");
    });
});
