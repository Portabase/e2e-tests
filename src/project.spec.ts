import {projectGroups, createBackupProject, configureBackupPolicies, queueProjectBackup, queueProjectRestore, waitForSuccessfulBackup, waitForSuccessfulRestore, verifyRetention} from "./helpers/project-backups";
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

type BackupProject = Awaited<ReturnType<typeof createBackupProject>> & {
    first: Map<string, string>;
    second: Map<string, string>;
};
const backupProjects: BackupProject[] = [];

test.describe.serial("Backup projects and keep only the latest generation", () => {
    test("Create backup projects and configure policies", async ({page}) => {
        test.setTimeout(10 * 60_000);
        for (const group of projectGroups) {
            const project = await createBackupProject(page, group);
            await configureBackupPolicies(page, group.storage);
            backupProjects.push({...project, first: new Map(), second: new Map()});
        }
    });

    test("Run first successful backup for every database", async ({page}) => {
        test.setTimeout(20 * 60_000);
        for (const project of backupProjects) await queueProjectBackup(page, project.projectUrl, project.databaseUrls.length);
        for (const project of backupProjects) {
            for (const url of project.databaseUrls) project.first.set(url, await waitForSuccessfulBackup(page, url));
        }
    });

    test("Run second successful backup for every database", async ({page}) => {
        test.setTimeout(20 * 60_000);
        for (const project of backupProjects) await queueProjectBackup(page, project.projectUrl, project.databaseUrls.length);
        for (const project of backupProjects) {
            for (const url of project.databaseUrls) project.second.set(url, await waitForSuccessfulBackup(page, url, project.first.get(url)));
        }
    });

    test("Retain only the latest backup for every database", async ({page}) => {
        test.setTimeout(5 * 60_000);
        await page.waitForTimeout(60_000);
        for (const project of backupProjects) {
            for (const url of project.databaseUrls) await verifyRetention(page, url, project.second.get(url)!, project.first.get(url)!);
        }
    });

    test("Restore every database from its latest backup", async ({page, request}) => {
        test.setTimeout(20 * 60_000);
        const before = await request.get("http://localhost:3082");
        expect(before.status()).toBe(200);
        const original = await before.text();
        execFileSync("docker", ["exec", "portabase-e2e-web", "sh", "-c", "printf 'changed by E2E' > /usr/share/nginx/html/index.html"]);
        expect(await (await request.get("http://localhost:3082")).text()).toBe("changed by E2E");

        for (const project of backupProjects) await queueProjectRestore(page, project.projectUrl, project.databaseUrls.length);
        for (const project of backupProjects) {
            for (const url of project.databaseUrls) await waitForSuccessfulRestore(page, url);
        }
        await expect.poll(async () => {
            const response = await request.get("http://localhost:3082");
            return response.ok() ? response.text() : "not ready";
        }, {timeout: 30_000}).toBe(original);
    });
});
