import {expect, Page} from "@playwright/test";
import {readFileSync} from "node:fs";
import {get} from "./project";
import {backupRows} from "./project-backups";
import {navigateVia, openOverlay} from "./ui";

type ImportSource = {
    project: string;
    database: string;
};

const PROJECT_DETAIL_URL = /\/dashboard\/projects\/[^/]+$/;
const DATABASE_DETAIL_URL = /\/dashboard\/projects\/[^/]+\/database\/[^/]+$/;

export async function importLatestBackup(page: Page, source: ImportSource) {
    await page.goto("/dashboard/projects");
    await navigateVia(page, get(page, source.project), PROJECT_DETAIL_URL);

    const database = page.locator('a[href*="/database/"]').filter({hasText: source.database});
    await navigateVia(page, database, DATABASE_DETAIL_URL);

    const rows = backupRows(page);
    const backup = rows
        .filter({has: page.getByText("success", {exact: true})})
        .filter({hasNot: page.getByText("Imported", {exact: true})})
        .first();
    await expect(backup).toBeVisible();
    const backupCount = await rows.count();

    const downloadItem = page.getByRole("menuitem", {name: "Download", exact: true});
    await openOverlay(backup.getByRole("button", {name: "Open menu"}), downloadItem);
    await downloadItem.click();

    const downloadDialog = page.getByRole("dialog", {name: "Download backup ?", exact: true});
    const successfulStorage = downloadDialog.locator("button:not([disabled])").filter({hasText: "SUCCESS"}).first();
    await expect(successfulStorage).toBeVisible();
    await successfulStorage.click();

    const downloadPromise = page.waitForEvent("download");
    await downloadDialog.getByRole("button", {name: "Confirm", exact: true}).click();
    const download = await downloadPromise;
    const filePath = await download.path();
    if (!filePath) throw new Error(`Unable to download the backup for ${source.database}.`);

    const importDialog = page.getByRole("dialog", {name: "Import Backup", exact: true});
    const importButton = page.getByRole("button").filter({has: page.locator("svg.lucide-import")});
    await openOverlay(importButton, importDialog);
    await importDialog.locator('input[type="file"]').setInputFiles({
        name: download.suggestedFilename(),
        mimeType: "application/gzip",
        buffer: readFileSync(filePath),
    });
    await importDialog.getByRole("button", {name: "Upload", exact: true}).click();

    await expect(page.getByText("Backup successfully imported", {exact: true})).toBeVisible();
    await expect(importDialog).toBeHidden();
    await expect(rows).toHaveCount(backupCount + 1);

    const imported = rows.filter({has: page.getByText("Imported", {exact: true})});
    await expect(imported).toHaveCount(1);
    await expect(imported.getByText("success", {exact: true})).toBeVisible();
    await expect(imported.getByRole("button", {name: "Show storage status"})).toBeEnabled();
}
