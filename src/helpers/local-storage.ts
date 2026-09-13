import {expect, Page} from "@playwright/test";
import {generateKeyPairSync} from "node:crypto";
import {create, edit, get, remove, submit, testConnection} from "./storage";
import {openOverlay} from "./ui";

export const localStorage = {
    garage: {name: "garage", endpoint: "localhost", port: "3900", region: "garage", accessKey: "GK0123456789abcdef01234567", secretKey: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"},
    rustfs: {name: "rustFS", endpoint: "localhost", port: "3901", region: "us-east-1", accessKey: "portabase-e2e", secretKey: "portabase-e2e-secret"},
    azure: {name: "azurite", connectionString: "DefaultEndpointsProtocol=http;AccountName=portabase;AccountKey=cG9ydGFiYXNlLWUyZS1henVyaXRlLXNlY3JldA==;BlobEndpoint=http://localhost:10000/portabase;"},
    gcs: {name: "fake gcs server", endpoint: "http://localhost:4443"},
};

export const bucket = "portabase-e2e";
export const testPrivateKey = () => generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: {type: "pkcs8", format: "pem"},
    publicKeyEncoding: {type: "spki", format: "pem"},
}).privateKey;

export async function connectLocalStorage(page: Page, provider: Parameters<typeof create>[1], name: string, fill: (page: Page) => Promise<void>, valid = true) {
    await page.goto("/dashboard/storages/channels");
    await create(page, provider, name, fill);
    await testConnection(page);
    await expect(page.getByText(valid ? "Successfully connected to storage channel" : "An error occurred while testing the storage channel")).toBeVisible({timeout: 30_000});
    await submit(page);
    await expect(page.getByText("Storage channel has been successfully created.")).toBeVisible();
    await expect(get(page, name)).toBeVisible();

    if (!valid) {
        await remove(page, name);
        await expect(get(page, name)).toHaveCount(0);
        return;
    }
    const dialog = await edit(page, name);
    await dialog.getByRole("tab", {name: "Organizations", exact: true}).click();
    const selectAll = page.getByRole("option", {name: "(Select All)", exact: true});
    await openOverlay(dialog.getByRole("button", {name: "Select organization(s)"}), selectAll);
    await selectAll.click();
    await page.getByRole("option", {name: "Close", exact: true}).click();
    await dialog.getByRole("button", {name: "Save", exact: true}).click();
    await expect(page.getByText("Storage channel organizations has been successfully updated.")).toBeVisible();
    await dialog.getByRole("button", {name: "Close", exact: true}).click();
}
