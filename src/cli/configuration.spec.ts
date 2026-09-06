import {expect, test} from "@playwright/test";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {createCliContext, runCli} from "../helpers/cli";

test.describe("configuration commands", () => {
    test("prints config command help", async () => {
        const context = await createCliContext();

        const result = await runCli(["config", "--help"], context);

        expect(result.exitCode).toBe(0);
        expect(result.output).toContain("Usage: portabase config");
        expect(result.output).toContain("Manage global CLI configuration.");
        expect(result.output).toContain("channel");
        expect(result.output).toContain("show");
    });

    test("shows default config in an isolated home directory", async () => {
        const context = await createCliContext();

        const result = await runCli(["config", "show"], context);

        expect(result.exitCode).toBe(0);
        expect(result.output).toContain("Current Configuration:");
        expect(result.output).toContain("Update Channel: auto");
    });

    test("persists the update channel in an isolated home directory", async () => {
        const context = await createCliContext();

        const update = await runCli(["config", "channel", "stable"], context);
        const show = await runCli(["config", "show"], context);
        const savedConfig = await readFile(path.join(context.env.HOME!, ".portabase", "config.json"), "utf-8");

        expect(update.exitCode).toBe(0);
        expect(update.output).toContain("Update channel set to: stable");
        expect(show.exitCode).toBe(0);
        expect(show.output).toContain("Update Channel: stable");
        expect(JSON.parse(savedConfig)).toEqual({update_channel: "stable"});
    });

    test("prints db command help", async () => {
        const context = await createCliContext();

        const result = await runCli(["db", "--help"], context);

        expect(result.exitCode).toBe(0);
        expect(result.output).toContain("Usage: portabase db");
        expect(result.output).toContain("Manage databases configuration.");
        expect(result.output).toContain("list");
        expect(result.output).toContain("add");
        expect(result.output).toContain("remove");
    });

    test("prints db list help", async () => {
        const context = await createCliContext();

        const result = await runCli(["db", "list", "--help"], context);

        expect(result.exitCode).toBe(0);
        expect(result.output).toContain("Usage: portabase db list");
        expect(result.output).toContain("Name of the agent");
        expect(result.output).toContain("[required]");
    });
});
