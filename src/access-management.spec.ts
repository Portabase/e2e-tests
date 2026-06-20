import {expect, test} from "@playwright/test";
import {users} from "./helpers/auth";
import {changeUserRole, create, switchToDefault} from "./helpers/access-management";
import {openOverlay} from "./helpers/ui";
import {LOCAL_STORAGE_PATH} from "./helpers/session";

test.use({storageState: LOCAL_STORAGE_PATH});

const firstOrganization = "Organization A";
const secondOrganization = "Organization B";

test.describe.serial(() => {
    test("Create an organization from organizations page", async ({page}) => {
        await page.goto("/dashboard/admin/organizations");
        await expect(page.getByRole("heading", {name: "Active organizations"})).toBeVisible();

        await create(page, "button", firstOrganization);

        await expect(page.getByText(/Organization has been successfully created\./i)).toBeVisible();
        await expect(page).toHaveURL("/dashboard/admin/organizations");
        await expect(page.getByRole("button", {name: firstOrganization, exact: true})).toBeVisible();

        await switchToDefault(page);
    });

    test("Create an organization from sidebar button", async ({page}) => {
        await page.goto("/dashboard/home");
        await expect(page.getByRole("heading", {name: "Dashboard"})).toBeVisible();

        await create(page, "sidebar", secondOrganization);

        await expect(page.getByText(/Organization has been successfully created\./i)).toBeVisible();
        await expect(page).toHaveURL("/dashboard/home");
        await expect(page.getByRole("button", {name: secondOrganization, exact: true})).toBeVisible();

        await switchToDefault(page);
    });

    test("Change John Doe's role from pending to user", async ({page}) => {
        await page.goto("/dashboard/admin/users");
        await expect(page.getByText(users.normal.email, {exact: true})).toBeVisible();

        const userRow = page.locator("tr").filter({hasText: users.normal.email}).first();
        await expect(userRow).toBeVisible();
        const roleMenuItem = page.getByRole('menuitem', {name: 'Role'});
        await openOverlay(userRow.locator("button").last(), roleMenuItem);
        await roleMenuItem.click();

        await expect(page.getByRole("heading", {name: "Change the user's role"})).toBeVisible();

        await changeUserRole(page, "user")

        await expect(page.getByText("User role changed successfully.")).toBeVisible();
        await expect(page.locator("tr").filter({hasText: users.normal.email}).getByText("user", {exact: true})).toBeVisible();
    });

    test("Add John Doe to Organization A", async ({page}) => {
        await page.goto("/dashboard/admin/organizations");
        await expect(page.getByRole("heading", {name: "Active organizations"})).toBeVisible();

        const organizationRow = page.locator("tr").filter({hasText: firstOrganization}).first();
        await expect(organizationRow).toBeVisible();
        const organizationLink = organizationRow.locator('a[href*="organizations/"]').first();
        await expect(organizationLink).toBeVisible();
        // Row link uses a relative href ("organizations/<id>"); clicking a not-yet-hydrated
        // Next <Link> can fail to navigate and leave us on the list page. Resolve the href
        // and navigate explicitly so the detail page reliably loads.
        const organizationHref = (await organizationLink.getAttribute("href")) ?? "";
        await page.goto(organizationHref.startsWith("/") ? organizationHref : `/dashboard/admin/${organizationHref}`);

        await expect(page.getByText(firstOrganization, {exact: true})).toBeVisible();
        await openOverlay(
            page.getByRole("button", {name: /Add member/i}),
            page.getByRole("heading", {name: "Add member to your organization"}),
        );

        await page.getByPlaceholder("Enter a user email").fill(users.normal.email);
        await page.getByRole("option", {name: new RegExp(users.normal.email, "i")}).click();
        await page.getByRole("button", {name: "Confirm"}).click();

        await expect(page.getByText("Member successfully added!")).toBeVisible();
        await expect(page.getByText(users.normal.email, {exact: true})).toBeVisible();
    });
});
