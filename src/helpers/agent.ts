import {Page} from "@playwright/test";
import {execSync} from "node:child_process";
import {navigateVia, openOverlay} from "./ui";

const AGENT_DETAIL_URL = /\/dashboard\/agents\/.+/;


/**
 * Locate an agent card in the list.

 * Executes from: `/dashboard/agents`.
 */
export function get(page: Page, name: string) {
    return page.locator('a[href^="/dashboard/agents"]').filter({hasText: name}).first();
}

/**
 * Create an agent from the selected entrypoint.
 *
 * Available entrypoints:
 * - `button`: the classic create button.
 * - `emptyState`: the empty-state CTA.
 * - `auto`: uses the classic create button and falls back to the empty-state CTA.
 *
 * Executes from: `/dashboard/agents`.
 */
export async function create(page: Page, entrypoint: "auto" | "emptyState" | "button" = "auto", agentName: string, description: string) {
    const createButton = page.getByRole("button", {name: /Create Agent/i});
    const emptyStateButton = page.getByText("Create new Agent", {exact: true});
    const trigger = entrypoint === "button"
        ? createButton
        : entrypoint === "emptyState"
            ? emptyStateButton
            : createButton.or(emptyStateButton).filter({visible: true}).first();
    const nameField = page.getByRole("dialog").filter({visible: true}).getByLabel("Name");
    await openOverlay(trigger, nameField);
    await nameField.fill(agentName);
    await page.getByLabel("Description").fill(description);
    await page.getByRole("button", {name: "Create"}).click();
}

/**
 * Edit an existing agent (name and description) from its details page.
 *
 * Executes from: `/dashboard/agents/[agentId]`.
 */
export async function edit(page: Page, currentName: string, updatedName: string, updatedDescription: string) {
    await navigateVia(page, get(page, currentName), AGENT_DETAIL_URL);

    const editButton = page
        .getByRole("button", {name: /Delete Agent/i})
        .locator("xpath=ancestor::div[1]/preceding-sibling::div[1]/*[1]");
    const nameField = page.getByRole("dialog").filter({visible: true}).getByLabel("Name");
    await openOverlay(editButton, nameField);

    await nameField.fill(updatedName);
    await page.getByLabel("Description").fill(updatedDescription);
    await page.getByRole("button", {name: "Update"}).click();
}

/**
 * Delete an agent from its details page.

 * Executes from: `/dashboard/agents/[agentId]`.
 */
export async function remove(page: Page, name: string) {
    await navigateVia(page, get(page, name), AGENT_DETAIL_URL);
    const confirm = page.getByRole("button", {name: "Delete", exact: true});
    await openOverlay(page.getByRole("button", {name: /Delete Agent/i}), confirm);
    await confirm.click();
}


export async function launch(edgeKey: string, composeFile: string) {
    const output = execSync(
        `EDGE_KEY=${edgeKey} docker compose -f docker/agent/${composeFile} up -d`,
        {
            cwd: process.cwd(),
            encoding: "utf-8",
            stdio: ["ignore", "pipe", "pipe"],
        },
    );
    return output;
}
