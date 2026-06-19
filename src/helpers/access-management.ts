import {Page} from "@playwright/test";
import {openOverlay} from "./ui";

export function getUserRow(page: Page, email: string) {
    return page.locator("tr").filter({hasText: email}).first();
}

export function getOrganizationRow(page: Page, organizationName: string) {
    return page.locator("tr").filter({hasText: organizationName}).first();
}

/**
 * Create an organization from the selected entrypoint.
 *
 * Available entrypoints:
 * - `button`: the organizations page create button.
 * - `sidebar`: the sidebar organization switcher.
 *
 * Executes from:
 * - `/dashboard/admin/organizations` for "button" entrypoint
 * - any `/dashboard/**` page for "sidebar" entrypoint
 */
export async function create(page: Page, entrypoint: "button" | "sidebar", name: string) {
    const nameField = page.getByLabel("Name");

    if (entrypoint === "sidebar") {
        const createItem = page.getByText("Create organization", {exact: true});
        await openOverlay(page.getByRole("button", {name: "Default Organization"}), createItem);
        await openOverlay(createItem, nameField);
    } else {
        await openOverlay(page.getByRole("button", {name: /Create a new organization/i}), nameField);
    }

    await nameField.fill(name);
    await page.getByRole("button", {name: "Create"}).click();
}

/**
 * Switch the active organization from the sidebar switcher.
 *
 * Executes from: any `/dashboard/**` if the sidebar is visible.
 */
export async function switchTo(page: Page, name: string) {
    const item = page.getByRole('menuitem', {name: name});
    await openOverlay(page.getByTestId('organization-dropdown'), item);
    await item.click();
}

/**
 * Switch back to the default organization.
 *
 * Executes from: any `/dashboard/**` if the sidebar is visible.
 */
export async function switchToDefault(page: Page) {
    await switchTo(page, "Default Organization");
}

const ROLE_LABELS = {
    pending: "Pending",
    user: "User",
    admin: "Admin",
} as const;

/**
 * Change the global role of a user from the admin users role modal.
 *
 * Executes from: the "Change the user's role" dialog opened from `/dashboard/admin/users`.
 */
export async function changeUserRole(page: Page, role: keyof typeof ROLE_LABELS) {
    const roleOption = ROLE_LABELS[role];

    await page.getByRole("combobox").click();
    await page.getByRole("option", {name: roleOption}).click();
    await page.getByRole("button", {name: "Validate"}).click();
}