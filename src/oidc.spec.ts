import {expect, test} from "@playwright/test";
import {logout} from "./helpers/auth";
import {loginWithOidc, oidcProviders} from "./helpers/oidc";


test.describe.serial("OIDC auth", () => {
    for (const provider of oidcProviders) {
        test(`OIDC login/logout with ${provider.title}`, async ({page}) => {

            await loginWithOidc(page, provider.id);

            await expect(page).toHaveURL(/\/dashboard\/home(?:\?.*)?$/);
            await expect(page.getByRole("link", {name: "Logo Portabase"})).toBeVisible();

            await logout(page);

            await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
        });
    }
});
