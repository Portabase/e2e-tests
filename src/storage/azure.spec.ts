import {test} from "@playwright/test";
import {LOCAL_STORAGE_PATH} from "../helpers/session";
import {bucket, connectLocalStorage, localStorage} from "../helpers/local-storage";

test.use({storageState: LOCAL_STORAGE_PATH});

for (const valid of [true, false]) {
    test(`Connect ${valid ? "valid" : "invalid"} Azurite storage`, async ({page}) => {
        await connectLocalStorage(page, "Azure Blob Storage", valid ? localStorage.azure.name : "Azurite Invalid", async () => {
            await page.getByLabel("Connection String *", {exact: true}).fill(localStorage.azure.connectionString);
            await page.getByLabel(/Container Name/).fill(valid ? bucket : "missing-container");
        }, valid);
    });
}
