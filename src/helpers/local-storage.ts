import {expect, Page} from "@playwright/test";
import {generateKeyPairSync} from "node:crypto";
import {create, get, remove, submit, testConnection} from "./storage";

export const localStorage = {
    garage: {name: "garage", endpoint: "localhost", port: "3900", region: "garage", accessKey: "GK0123456789abcdef01234567", secretKey: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"},
    rustfs: {name: "rustFS", endpoint: "localhost", port: "3901", region: "us-east-1", accessKey: "portabase-e2e", secretKey: "portabase-e2e-secret"},
    azure: {name: "azurite", connectionString: "DefaultEndpointsProtocol=http;AccountName=portabase;AccountKey=cG9ydGFiYXNlLWUyZS1henVyaXRlLXNlY3JldA==;BlobEndpoint=http://localhost:10000/portabase;"},
    gcs: {name: "fake gcs server", endpoint: "http://localhost:4443"},
    sftpgo: {name: "sftpgo", host: "localhost", port: "2022", webdavUrl: "http://localhost:10080", username: "portabase-e2e", password: "portabase-e2e-secret", remotePath: "/backups"},
    samba: {name: "samba", host: "localhost", port: "1445", share: "backups", username: "portabase", password: "portabase-e2e-secret", remotePath: "/"},
    ftp: {host: "localhost", username: "portabase-e2e", password: "portabase-e2e-secret", remotePath: "/backups"},
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
    // Valid channels get every organization in the wizard's second step.
    await submit(page, valid);
    await expect(get(page, name)).toBeVisible();

    if (!valid) {
        await remove(page, name);
        await expect(get(page, name)).toHaveCount(0);
        return;
    }
    await expect(page.getByText("Storage channel organizations has been successfully updated.")).toBeVisible();
}
