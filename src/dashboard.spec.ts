import {expect, test, Page} from "@playwright/test";
import {LOCAL_STORAGE_PATH} from "./helpers/session";

test.use({storageState: LOCAL_STORAGE_PATH});

function card(page: Page, title: string) {
    return page.locator('[data-slot="card"]').filter({
        has: page.locator('[data-slot="card-title"]').getByText(title, {exact: true}),
    });
}

test("Dashboard reports healthy agents, databases and retained backups", async ({page}) => {
    await expect(async () => {
        await page.goto("/dashboard/home");
        await expect(card(page, "Agents").getByText("100%", {exact: true})).toBeVisible();
        await expect(card(page, "Agents").getByText("2/2 online", {exact: true})).toBeVisible();
        await expect(card(page, "Databases").getByText("100%", {exact: true})).toBeVisible();
        const online = (await card(page, "Databases").innerText()).match(/(\d+)\/(\d+) online/);
        expect(online).not.toBeNull();
        expect(Number(online![1])).toBeGreaterThan(0);
        expect(online![1]).toBe(online![2]);
        await expect(card(page, "Organizations").getByText("3", {exact: true})).toBeVisible();
        await expect(card(page, "Backup")).toContainText("50% available");
        const backups = (await card(page, "Backup").innerText()).match(/(\d+)\/(\d+)/);
        expect(backups).not.toBeNull();
        expect(Number(backups![1])).toBe(Number(online![2]));
        expect(Number(backups![2])).toBe(Number(backups![1]) * 2);
        await expect(card(page, "Backup Success Rate").getByText("100.0%", {exact: true})).toBeVisible();
    }).toPass();
});
