import {Page} from "@playwright/test";
import {navigateVia, openOverlay} from "./ui";

const PROJECT_DETAIL_URL = /\/dashboard\/projects\/.+/;


/**
 * Locate a project card in the list.
 *
 * Executes from: `/dashboard/projects`.
 */
export function get(page: Page, projectName: string) {
    return page.locator('a[href^="/dashboard/projects/"]').filter({hasText: projectName}).first();
}

/**
 * Create a project from the selected entrypoint.
 *
 * Available entrypoints:
 * - `emptyState`: the empty-state CTA.
 * - `button`: the classic create button.
 *
 * * Executes from: `/dashboard/projects`.
 */
export async function create(page: Page, entrypoint: "emptyState" | "button", projectName: string) {
    const trigger = entrypoint === "emptyState"
        ? page.getByText("Create new Project", {exact: true})
        : page.getByRole("button", {name: /Create Project/i});
    const nameField = page.getByRole("dialog").filter({visible: true}).getByLabel("Name");
    await openOverlay(trigger, nameField);
    await nameField.fill(projectName);
    await page.getByRole("button", {name: "Create"}).click();
}

/**
 * Edit an existing project from its details page.
 *
 * Executes from: `/dashboard/projects/[projectId]`.
 */
export async function edit(page: Page, currentName: string, updatedName: string) {
    await navigateVia(page, get(page, currentName), PROJECT_DETAIL_URL);

    const editButton = page
        .getByRole("button", {name: /Delete Project/i})
        .locator("xpath=ancestor::div[1]/preceding-sibling::div[1]/*[1]");
    const nameField = page.getByRole("dialog").filter({visible: true}).getByLabel("Name");
    await openOverlay(editButton, nameField);

    await nameField.fill(updatedName);
    await page.getByRole("button", {name: "Update"}).click();
}

/**
 * Delete an existing project from its details page.
 *
 * Executes from: `/dashboard/projects/[projectId]`.
 * */
export async function remove(page: Page, projectName: string) {
    await navigateVia(page, get(page, projectName), PROJECT_DETAIL_URL);
    const confirm = page.getByRole("button", {name: "Delete", exact: true});
    await openOverlay(page.getByRole("button", {name: /Delete Project/i}), confirm);
    await confirm.click();
}
