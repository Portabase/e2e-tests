import {test as base, expect, APIRequestContext, APIResponse, Browser} from "@playwright/test";
import {randomUUID} from "node:crypto";
import {readFileSync, writeFileSync} from "node:fs";
import {API_KEY_PATH, LOCAL_STORAGE_PATH} from "../helpers/session";

export {expect};

export async function data<T = any>(response: APIResponse, status = 200): Promise<T> {
    expect(response.status(), `${response.url()}: ${await response.text()}`).toBe(status);
    const body = await response.json();
    expect(body).toHaveProperty("data");
    return body.data as T;
}

export async function error(response: APIResponse, status: number) {
    expect(response.status(), `${response.url()}: ${await response.text()}`).toBe(status);
    expect(await response.json()).toMatchObject({error: expect.any(String)});
}

export async function createApiKey(browser: Browser) {
    const context = await browser.newContext({storageState: LOCAL_STORAGE_PATH, baseURL: process.env.SERVER_URL});
    try {
        const page = await context.newPage();
        const name = `e2e-${randomUUID().slice(0, 12)}`;
        await page.goto("/dashboard/home");
        await page.getByTestId("profile-dropdown").first().click();
        await page.getByRole("menuitem", {name: "Account Settings", exact: true}).click();
        await page.getByRole("tab", {name: "Account", exact: true}).click();
        await page.getByRole("button", {name: "Add API Key", exact: true}).click();
        await page.getByLabel("Key Name", {exact: true}).fill(name);
        await page.getByRole("button", {name: "Create API Key", exact: true}).click();
        const keyDialog = page.getByRole("dialog", {name: "Your API Key", exact: true});
        await expect(keyDialog).toBeVisible();
        const key = await keyDialog.locator("input[readonly]").inputValue();
        expect(key.length).toBeGreaterThan(10);
        await page.getByRole("button", {name: "I copied my API Key", exact: true}).click();
        writeFileSync(API_KEY_PATH, JSON.stringify({apiKey: key}));
    } finally {
        await context.close();
    }
}

export const test = base.extend<{api: APIRequestContext}>({
    api: async ({playwright}, use) => {
        const {apiKey} = JSON.parse(readFileSync(API_KEY_PATH, "utf8"));
        const api = await playwright.request.newContext({
            baseURL: process.env.SERVER_URL,
            extraHTTPHeaders: {"x-api-key": apiKey},
        });
        await use(api);
        await api.dispose();
    },
});
