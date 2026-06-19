import {expect, test} from "@playwright/test";
import {
    cancel, create, get, remove, submit, testFromEdit,
} from "../helpers/notification";
import {getEnv} from "../helpers/env";
import {LOCAL_STORAGE_PATH} from "../helpers/session";

test.use({storageState: LOCAL_STORAGE_PATH});

const validChannelName = "Pushover E2E Required";
const invalidChannelName = "Pushover E2E Invalid";

const invalidUserKey = "u".repeat(30);
const invalidApiToken = "a".repeat(30);

// test.describe.serial("Valid channel", () => {
//     test("Create and test a valid Pushover channel", async ({page}) => {
//         await page.goto("/dashboard/notifications/channels");
//         await expect(page.getByRole("heading", {name: "Notification channels"})).toBeVisible();
//         await create(page, "Pushover", validChannelName, async (page) => {
//             await page.getByLabel(/User Key/).fill(getEnv("E2E_NOTIFICATION_PUSHOVER_USER_KEY"));
//             await page.getByLabel(/App API Token/).fill(getEnv("E2E_NOTIFICATION_PUSHOVER_API_TOKEN"));
//         });
//         await submit(page);
//         await expect(page.getByText("Notification channel has been successfully created.")).toBeVisible();
//         await expect(get(page, validChannelName)).toBeVisible();
//         await testFromEdit(page, validChannelName);
//         await expect(page.getByText("Sent via Pushover")).toBeVisible();
//         await cancel(page);
//     });
//
//     test("Edit and test a valid Pushover channel", async ({page}) => {
//         await page.goto("/dashboard/notifications/channels");
//         await expect(page.getByRole("heading", {name: "Notification channels"})).toBeVisible();
//         await expect(get(page, validChannelName)).toBeVisible();
//         await testFromEdit(page, validChannelName);
//         await expect(page.getByText("Sent via Pushover")).toBeVisible();
//         await cancel(page);
//     });
// });

test.describe.serial("Invalid channel", () => {
    test("Create and test invalid Pushover channel", async ({page}) => {
        await page.goto("/dashboard/notifications/channels");
        await expect(page.getByRole("heading", {name: "Notification channels"})).toBeVisible();
        await create(page, "Pushover", invalidChannelName, async (page) => {
            await page.getByLabel(/User Key/).fill(invalidUserKey);
            await page.getByLabel(/App API Token/).fill(invalidApiToken);
        });
        await submit(page);
        await expect(page.getByText("Notification channel has been successfully created.")).toBeVisible();
        await expect(get(page, invalidChannelName)).toBeVisible();
        await testFromEdit(page, invalidChannelName);
        await expect(page.getByText("An error occurred while testing the notification channel, check your configuration")).toBeVisible();
        await cancel(page);
    });

    test("Delete invalid Pushover channel", async ({page}) => {
        await page.goto("/dashboard/notifications/channels");
        await expect(page.getByRole("heading", {name: "Notification channels"})).toBeVisible();
        await expect(get(page, invalidChannelName)).toBeVisible();
        await remove(page, invalidChannelName);
        await expect(page.getByText("Notification channel has been successfully removed.")).toBeVisible();
        await expect(page.getByText(invalidChannelName)).toHaveCount(0);
    });
});
