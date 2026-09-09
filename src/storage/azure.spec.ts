import {test} from "@playwright/test";
import {LOCAL_STORAGE_PATH} from "../helpers/session";
import {bucket, connectLocalStorage, localStorage} from "../helpers/local-storage";

test.use({storageState: LOCAL_STORAGE_PATH});

test("Connect valid Azurite storage", async ({page}) => {
    await connectLocalStorage(page, "Azure Blob Storage", localStorage.azure.name, async () => {
        await page.getByLabel("Connection String *", {exact: true}).fill(localStorage.azure.connectionString);
        await page.getByLabel(/Container Name/).fill(bucket);
    }, true);
});

test("Connect invalid Azurite storage", async ({page}) => {
    await connectLocalStorage(page, "Azure Blob Storage", "Azurite Invalid", async () => {
        await page.getByLabel("Connection String *", {exact: true}).fill(localStorage.azure.connectionString);
        await page.getByLabel(/Container Name/).fill("missing-container");
    }, false);
});
