import {expect, Page} from "@playwright/test";
import {readFileSync} from "node:fs";
import path from "node:path";
import {get} from "./project";
import {navigateVia, openOverlay} from "./ui";

const PROJECT_DETAIL_URL = /\/dashboard\/projects\/[^/]+$/;

const agentA: {databases: {name: string; type: string}[]} = JSON.parse(readFileSync(path.resolve(__dirname, "../../docker/agent/databases.json"), "utf8"));
const agentB = readFileSync(path.resolve(__dirname, "../../docker/agent/databases.toml"), "utf8")
    .split("[[databases]]").slice(1).map(block => ({
        name: block.match(/^name\s*=\s*"([^"]+)"/m)![1],
        type: block.match(/^type\s*=\s*"([^"]+)"/m)![1],
    }));
const databases = [...agentA.databases, ...agentB];

export const projectGroups = [
    {name: "PostgreSQL", types: ["postgresql"], storage: "garage"},
    {name: "MySQL/MariaDB", types: ["mysql", "mariadb"], storage: "rustFS"},
    {name: "MongoDB", types: ["mongodb"], storage: "azurite"},
    {name: "Redis/Valkey", types: ["redis", "valkey"], storage: "fake gcs server"},
    {name: "MSSQL/SQLite", types: ["mssql", "sqlite"], storage: "System"},
    {name: "Docker", types: ["docker-volume"], storage: "System"},
].map(group => ({...group, databases: databases.filter(db => group.types.includes(db.type)).map(db => db.name)}));

export async function createBackupProject(page: Page, group: typeof projectGroups[number]) {
    expect(group.databases.length, `${group.name} has configured data sources`).toBeGreaterThan(0);
    await page.goto("/dashboard/projects");
    const emptyState = page.getByText("Create new Project", {exact: true});
    const createButton = page.getByRole("button", {name: /Create Project/i});
    const nameField = page.getByRole("dialog").filter({visible: true}).getByLabel("Name", {exact: true});
    await openOverlay(createButton.or(emptyState).filter({visible: true}).first(), nameField);
    await nameField.fill(group.name);
    await page.getByRole("button", {name: "Databases", exact: true}).click();
    for (const name of group.databases) {
        await page.getByPlaceholder("Search...").fill(name);
        await page.getByRole("option").filter({hasText: `${name} |`}).click();
    }
    await page.getByPlaceholder("Search...").fill("");
    await page.getByRole("option", {name: "Close", exact: true}).click();
    await page.getByRole("button", {name: "Create", exact: true}).click();
    await expect(page.getByText("Project has been successfully created.")).toBeVisible();
    await navigateVia(page, get(page, group.name), PROJECT_DETAIL_URL);
    const projectUrl = page.url();
    const links = page.locator('a[href*="/database/"]');
    await expect(links).toHaveCount(group.databases.length);
    const databaseUrls = await links.evaluateAll(elements => elements.map(el => (el as HTMLAnchorElement).href));
    return {
        projectUrl,
        databaseUrls,
        restorable: !group.types.some(type => type === "redis" || type === "valkey"),
    };
}

export async function configureBackupPolicies(page: Page, storage: string) {
    const method = page.getByRole("dialog", {name: "Backup method", exact: true});
    const methodButton = page.getByRole("button").filter({has: page.locator("svg.lucide-clock-9")});
    await expect(methodButton).toBeVisible();
    await openOverlay(methodButton, method);
    await method.getByRole("switch").check();
    const scheduled = new Date(Date.now() + 7 * 24 * 60 * 60_000);
    for (const [label, value] of [["Day of Month", String(scheduled.getUTCDate())], ["Month", String(scheduled.getUTCMonth() + 1)]]) {
        await method.getByText(label, {exact: true}).locator("..").getByRole("combobox").click();
        await page.getByRole("option", {name: value, exact: true}).click();
    }
    await method.getByRole("button", {name: "Save cron", exact: true}).click();
    await expect(page.getByText("Cron updated successfully.")).toBeVisible();
    await expect(method).toBeHidden();

    const retention = page.getByRole("dialog", {name: "Backup Retention Policy", exact: true});
    const retentionButton = page.getByRole("button").filter({has: page.locator("svg.lucide-ruler")});
    await expect(retentionButton).toBeVisible();
    await openOverlay(retentionButton, retention);
    await retention.getByRole("radio", {name: /Keep last N backups/}).check();
    await retention.getByLabel("Number of backups to keep").fill("1");
    await retention.getByRole("button", {name: "Save Retention Policy"}).click();
    await expect(page.getByText("Retention policy updated successfully.")).toBeVisible();
    await retention.getByRole("button", {name: "Close", exact: true}).click();

    const policy = page.getByRole("dialog", {name: "Storage policies", exact: true});
    const policyButton = page.getByRole("button").filter({has: page.locator("svg.lucide-hard-drive")});
    await expect(policyButton).toBeVisible();
    await openOverlay(policyButton, policy);
    await policy.getByRole("button", {name: "Add Policy", exact: true}).click();
    await policy.getByRole("combobox").click();
    await page.getByRole("option").filter({has: page.getByText(storage, {exact: true})}).click();
    await policy.getByRole("button", {name: "Save Changes", exact: true}).click();
    await expect(policy).toBeHidden();
    await openOverlay(policyButton, policy);
    await expect(policy.getByRole("combobox")).toContainText(storage);
    await policy.getByRole("button", {name: "Cancel", exact: true}).click();
    await openOverlay(retentionButton, retention);
    await expect(retention.getByLabel("Number of backups to keep")).toHaveValue("1");
    await retention.getByRole("button", {name: "Close", exact: true}).click();
}

export async function queueProjectBackup(page: Page, projectUrl: string, count: number) {
    if (page.url() !== projectUrl) await page.goto(projectUrl);
    const backupButton = page.getByRole("button", {name: "Backup", exact: true});
    await openOverlay(page.getByRole("button", {name: "Select all", exact: true}), backupButton);
    await backupButton.click();
    await expect(page.getByText(`Queued ${count} backup(s).`, {exact: true})).toBeVisible();
}

export function backupRows(page: Page) {
    return page.getByRole("table").filter({has: page.getByRole("columnheader", {name: "Reference", exact: true})}).locator("tbody tr");
}

const uuid = /[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}/i;

export async function waitForSuccessfulBackup(page: Page, url: string, previous?: string) {
    if (page.url() !== url) await page.goto(url);
    let reference = "";
    await expect(async () => {
        const rows = backupRows(page);
        const candidates = previous ? rows.filter({hasNotText: previous}) : rows;
        await expect(candidates).toHaveCount(1);
        await expect(candidates.getByText("success", {exact: true})).toBeVisible();
        reference = (await candidates.innerText()).match(uuid)?.[0] ?? "";
        expect(reference).toMatch(uuid);
    }).toPass({timeout: 180_000, intervals: [2_000, 4_000]});
    return reference;
}

export async function verifyRetention(page: Page, url: string, latest: string, deleted: string) {
    if (page.url() !== url) await page.goto(url);
    await expect(backupRows(page)).toHaveCount(1);
    await expect(backupRows(page)).toContainText(latest);
    await expect(backupRows(page).getByText("success", {exact: true})).toBeVisible();
    const filterButton = page.getByRole("button").filter({has: page.locator("svg.lucide-funnel, svg.lucide-filter")});
    const clearFilters = page.getByRole("menuitem", {name: "Clear filters", exact: true});
    await openOverlay(filterButton, clearFilters);
    await clearFilters.click();
    await page.getByRole("menuitem", {name: "Deleted", exact: true}).click();
    await page.keyboard.press("Escape");
    await expect(backupRows(page)).toHaveCount(1);
    await expect(backupRows(page)).toContainText(deleted);
    await expect(backupRows(page).getByText("success", {exact: true})).toBeVisible();
    await expect(page.getByText(latest, {exact: true})).toHaveCount(0);
}

export async function queueProjectRestore(page: Page, projectUrl: string, count: number) {
    if (page.url() !== projectUrl) await page.goto(projectUrl);
    await page.getByRole("button", {name: "Select all", exact: true}).click();
    const restore = page.getByRole("dialog", {name: `Restore ${count} database(s) to latest backup`, exact: true});
    await openOverlay(page.getByRole("button", {name: "Restore latest", exact: true}), restore);
    await restore.getByPlaceholder("restore", {exact: true}).fill("restore");
    await restore.getByRole("button", {name: `Restore ${count} database(s)`, exact: true}).click();
    await expect(restore).toBeHidden();
}

export async function waitForSuccessfulRestore(page: Page, url: string) {
    if (page.url() !== url) await page.goto(url);
    await page.getByRole("tab", {name: "Restoration", exact: true}).click();
    await expect(page.getByRole("cell", {name: "success", exact: true})).toBeVisible({timeout: 180_000});
}
