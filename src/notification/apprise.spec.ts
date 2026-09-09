import {expect, test} from "@playwright/test";
import {cancel, create, get, submit, testFromEdit} from "../helpers/notification";
import {LOCAL_STORAGE_PATH} from "../helpers/session";

test.use({storageState: LOCAL_STORAGE_PATH});

test("Create and test an Apprise notification channel", async ({page, request}) => {
    // Apprise forwards to the local ntfy recipient configured by apprise-init.
    const since = Math.floor(Date.now() / 1000);
    await page.goto("/dashboard/notifications/channels");
    await create(page, "Apprise", "Apprise E2E", async () => {
        await page.getByLabel(/Apprise Server URL/).fill("http://localhost:3081");
        await page.getByLabel(/Config Key/).fill("portabase-e2e");
    });
    await submit(page);
    await expect(page.getByText("Notification channel has been successfully created.")).toBeVisible();
    await expect(get(page, "Apprise E2E")).toBeVisible();
    await testFromEdit(page, "Apprise E2E");
    await expect(page.getByText("Sent to Apprise")).toBeVisible();
    await cancel(page);

    const response = await request.get(`http://localhost:3080/portabase-e2e/json?poll=1&since=${since}`);
    expect(response.ok()).toBeTruthy();
    const messages = (await response.text()).trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
    expect(messages.some(message => message.event === "message" && message.message)).toBe(true);
});
