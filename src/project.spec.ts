import {projectGroups, createBackupProject, configureBackupPolicies, queueProjectBackup, waitForSuccessfulBackup, verifyRetention} from "./helpers/project-backups";
import {expect, test} from "@playwright/test";
import {execFileSync} from "node:child_process";
import {create, edit, get, remove} from "./helpers/project";
import {LOCAL_STORAGE_PATH} from "./helpers/session";

test.use({storageState: LOCAL_STORAGE_PATH});
test.describe.configure({mode: "serial", retries: 0});

const project = {
    emptyStateName: "Project A",
    buttonName: "Project B",
    updatedButtonName: "Project B Updated",
};

test.describe.serial(() => {
    test("Create a project from empty state", async ({page}) => {
        await page.goto("/dashboard/projects");
        await expect(page.getByRole("heading", {name: "Projects"})).toBeVisible();
        await expect(page.getByText("Create new Project", {exact: true})).toBeVisible();

        await create(page, "emptyState", project.emptyStateName);

        await expect(page.getByText("Project has been successfully created.")).toBeVisible();
        await expect(get(page, project.emptyStateName)).toBeVisible();
        await expect(page.getByText("Create new Project", {exact: true})).toHaveCount(0);
    });

    test("Create a project from classic button", async ({page}) => {
        await page.goto("/dashboard/projects");
        await expect(page.getByRole("heading", {name: "Projects"})).toBeVisible();
        await expect(get(page, project.emptyStateName)).toBeVisible();

        await create(page, "button", project.buttonName);

        await expect(page.getByText("Project has been successfully created.")).toBeVisible();
        await expect(get(page, project.buttonName)).toBeVisible();
    });

    test("Edit the second created project", async ({page}) => {
        await page.goto("/dashboard/projects");
        await expect(page.getByRole("heading", {name: "Projects"})).toBeVisible();
        await expect(get(page, project.buttonName)).toBeVisible();

        await edit(page, project.buttonName, project.updatedButtonName);

        await expect(page.getByText("Project has been successfully updated.")).toBeVisible();
        await expect(page.getByText(project.updatedButtonName, {exact: true})).toBeVisible();
    });

    test("Delete the second created project", async ({page}) => {
        await page.goto("/dashboard/projects");
        await expect(page.getByRole("heading", {name: "Projects"})).toBeVisible();
        await expect(get(page, project.updatedButtonName)).toBeVisible();

        await remove(page, project.updatedButtonName);

        await expect(page).toHaveURL("/dashboard/projects");
        await expect(page.getByText("Projects has been successfully archived.")).toBeVisible();
        await expect(page.getByText(project.updatedButtonName)).toHaveCount(0);
    });
});

test.describe("Backup projects and keep only the latest generation", () => {
    test.describe.configure({mode: "serial", retries: 0});
    for (const group of projectGroups) {
        test(`${group.name}: two successful backup rounds and retention`, async ({page, request}) => {
            test.setTimeout(20 * 60_000);
            const {projectUrl, databaseUrls} = await createBackupProject(page, group);
            await configureBackupPolicies(page, projectUrl, group.storage);
            const generations: Map<string, string>[] = [];
            for (let round = 0; round < 2; round++) {
                await queueProjectBackup(page, projectUrl, databaseUrls.length);
                const references = new Map<string, string>();
                for (const url of databaseUrls) {
                    references.set(url, await waitForSuccessfulBackup(page, url, generations[0]?.get(url)));
                }
                generations.push(references);
            }
            await page.waitForTimeout(60_000);
            for (const url of databaseUrls) {
                await verifyRetention(page, url, generations[1].get(url)!, generations[0].get(url)!);
            }
            if (group.name === "Docker") {
                const before = await request.get("http://localhost:3082");
                expect(before.status()).toBe(200);
                const original = await before.text();
                execFileSync("docker", ["exec", "portabase-e2e-web", "sh", "-c", "printf 'changed by E2E' > /usr/share/nginx/html/index.html"]);
                expect(await (await request.get("http://localhost:3082")).text()).toBe("changed by E2E");
                await page.goto(projectUrl);
                await page.getByRole("button", {name: "Select all", exact: true}).click();
                await page.getByRole("button", {name: "Restore latest", exact: true}).click();
                const restore = page.getByRole("dialog", {name: "Restore 1 database(s) to latest backup", exact: true});
                await restore.getByPlaceholder("restore", {exact: true}).fill("restore");
                await restore.getByRole("button", {name: "Restore 1 database(s)", exact: true}).click();
                await expect(restore).toBeHidden();
                await page.goto(databaseUrls[0]);
                await page.getByRole("tab", {name: "Restoration", exact: true}).click();
                await expect(page.getByRole("cell", {name: "success", exact: true})).toBeVisible({timeout: 180_000});
                await expect.poll(async () => {
                    const response = await request.get("http://localhost:3082");
                    return response.ok() ? response.text() : "not ready";
                }, {timeout: 30_000}).toBe(original);
            }
        });
    }
});
