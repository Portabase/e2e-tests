import {expect, Page} from "@playwright/test";
import {execSync} from "node:child_process";


export const oidcProviders: Array<{ id: string, title: string }> = [
    {id: "authentik", title: "Authentik"},
    // {id: "pocket-id", title: "Pocket ID"},
    // {id: "keycloak", title: "Keycloak"},
]


export async function loginWithOidc(page: Page, providerId) {
    await page.goto("/login");

    const provider = oidcProviders.find((entry) => entry.id === providerId);
    if (!provider) throw new Error(`Unknown OIDC provider: ${providerId}`)

    await expect(page.getByRole("button", {name: provider.title})).toBeVisible();

    const authorizationUrl = await getOidcAuthorizationUrl(page, providerId);
    await page.goto(authorizationUrl);

    switch (providerId) {
        case "pocket-id":
            await loginWithPocketId(page)
            return
        case "authentik":
            await loginWithAuthentik(page)
            return
        case "keycloak":
            await loginWithKeycloak(page)
            return
    }
}









const AUTHENTIK_USER = "auth.entik@example.com";
const AUTHENTIK_PASSWORD = "testPASS123456!";

const KEYCLOAK_USER = "bootstrap-admin";
const KEYCLOAK_PASSWORD = "admin";

const oidcHostRewrites: Record<string, string> = {
    "http://authentik-server:9000": "http://localhost:3057",
    "http://keycloak:8080": "http://localhost:3056",
    "http://pocket-id:1411": "http://localhost:3055",
};

function toBrowserReachableUrl(url: string) {
    let browserUrl = url;

    for (const [internalOrigin, browserOrigin] of Object.entries(oidcHostRewrites)) {
        browserUrl = browserUrl.replace(internalOrigin, browserOrigin);
    }

    return browserUrl;
}

async function getOidcAuthorizationUrl(page: Page, providerId) {
    for (let attempt = 0; attempt < 3; attempt++) {
        const result = await page.evaluate(async ({providerId}) => {
            const response = await fetch("/api/auth/sign-in/sso", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    providerId,
                    providerType: "oidc",
                    callbackURL: "/dashboard",
                }),
            });

            const data = await response.json().catch(() => ({}));
            return {
                ok: response.ok,
                status: response.status,
                data,
            };
        }, {providerId});

        if (result.ok && result.data?.url) {
            return toBrowserReachableUrl(result.data.url);
        }

        if (result.status !== 429 || attempt === 2) {
            throw new Error(`Failed to initiate ${providerId} OIDC sign-in: ${JSON.stringify(result)}`);
        }

        await page.waitForTimeout(2_000);
    }
    throw new Error(`Failed to initiate ${providerId} OIDC sign-in after retries.`);
}

async function loginWithAuthentik(page: Page) {
    const usernameField = page.locator('input[name="uidField"], input[type="text"], input[type="email"]').first();
    await expect(usernameField).toBeVisible();
    await usernameField.fill(AUTHENTIK_USER);
    await usernameField.press("Enter").catch(() => undefined);
    if (await page.getByLabel(/password/i).count() === 0) {
        await page.getByRole("button", {name: /log in|sign in|continue/i}).click();
    }

    const passwordField = page.locator('input[name="password"], input[type="password"]').first();
    await expect(passwordField).toBeVisible();
    await passwordField.fill(AUTHENTIK_PASSWORD);
    await page.getByRole("button", {name: /log in|sign in|continue/i}).click();
}

async function loginWithKeycloak(page: Page) {
    await page.locator('input[name="username"], #username').fill(KEYCLOAK_USER);
    await page.locator('input[name="password"], #password').fill(KEYCLOAK_PASSWORD);
    await page.locator('input[type="submit"], #kc-login').click();
}

function getPocketIdAccessUrl() {
    const output = execSync(
        "docker compose -f docker/oidc/docker-compose.yml exec -T pocket-id ./pocket-id one-time-access-token admin",
        {
            cwd: process.cwd(),
            encoding: "utf-8",
            stdio: ["ignore", "pipe", "pipe"],
        },
    );

    const match = output.match(/https?:\/\/\S+/);
    if (!match) {
        throw new Error(`Failed to extract Pocket ID access URL from output:\n${output}`);
    }

    return match[0];
}

async function loginWithPocketId(page: Page) {
    // const accessUrl = getPocketIdAccessUrl();
    // const authorizationUrl = await getOidcAuthorizationUrl(page, "pocket-id");

    // await page.goto(authorizationUrl);
    // await page.goto(accessUrl);
    // await page.goto(authorizationUrl);
    await page.waitForURL(/\/dashboard\/home(?:\?.*)?$/);
}

