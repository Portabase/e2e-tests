import {expect, test} from "@playwright/test";
import {create, edit, get, launch, remove} from "./helpers/agent";
import {navigateVia} from "./helpers/ui";
import {LOCAL_STORAGE_PATH} from "./helpers/session";

const agent = {
    description: "Agent created by Playwright E2E",
    updatedDescription: "Agent updated by Playwright E2E",
};

test.use({storageState: LOCAL_STORAGE_PATH});

test.describe.serial(() => {

    test("Create agent A from empty state", async ({page}) => {
        await page.goto("/dashboard/agents");
        await expect(page.getByRole("heading", {name: "Agents"})).toBeVisible();
        // Agents list (and its empty state) is client-rendered after the first agents query;
        // on a cold server that can exceed the default 5s assertion timeout.
        await expect(page.getByText("Create new Agent", {exact: true})).toBeVisible({timeout: 15000});
        await create(page, "emptyState", "Agent A", agent.description);

        await expect(page.getByText("Success creating agent")).toBeVisible();
        await expect(get(page, "Agent A")).toBeVisible();
        await expect(page.getByText("Create new Agent", {exact: true})).toHaveCount(0);
    });

    test("Edit agent A", async ({page}) => {
        await page.goto("/dashboard/agents");
        await expect(page.getByRole("heading", {name: "Agents"})).toBeVisible();
        await expect(get(page, "Agent A")).toBeVisible();

        await edit(page, "Agent A", "Agent A Updated", agent.updatedDescription);

        await expect(page.getByText("Success updating agent")).toBeVisible();
        await expect(page.getByText("Agent A Updated", {exact: true})).toBeVisible();
        await expect(page.getByText(agent.updatedDescription, {exact: true})).toBeVisible();
    });

    test("Create agent B from classic button", async ({page}) => {
        await page.goto("/dashboard/agents");
        await expect(page.getByRole("heading", {name: "Agents"})).toBeVisible();
        await expect(page.getByRole("button", {name: /Create Agent/i})).toBeVisible();
        await create(page, "button", "Agent B", agent.description);

        await expect(page.getByText("Success creating agent")).toBeVisible();
        await expect(get(page, "Agent B")).toBeVisible();
    });

    test("Create agent C from classic button", async ({page}) => {
        await page.goto("/dashboard/agents");
        await expect(page.getByRole("heading", {name: "Agents"})).toBeVisible();
        await expect(page.getByRole("button", {name: /Create Agent/i})).toBeVisible();
        await create(page, "button", "Agent C", agent.description);

        await expect(page.getByText("Success creating agent")).toBeVisible();
        await expect(get(page, "Agent C")).toBeVisible();
    });

    test("Delete Agent C", async ({page}) => {
        await page.goto("/dashboard/agents");
        await expect(page.getByRole("heading", {name: "Agents"})).toBeVisible();
        await expect(get(page, "Agent C")).toBeVisible();
        await remove(page, "Agent C");

        await expect(page.getByText("Agent has been successfully deleted.")).toBeVisible();
        await expect(page).toHaveURL("/dashboard/agents");
        await expect(page.getByText("Agent C")).toHaveCount(0);
    });

    test("Launch agent A", async ({page}) => {
        await page.goto("/dashboard/agents");
        await expect(page.getByRole("heading", {name: "Agents"})).toBeVisible();
        await navigateVia(page, get(page, "Agent A"), /\/dashboard\/agents\/.+/);
        await expect(page.getByText("Agent A Updated", {exact: true})).toBeVisible();
        await expect(page.getByText("Registration & Setup")).toBeVisible();

        const commandInput = page.locator("input[readonly]").last();
        await page.locator("input[readonly]").first().locator("xpath=following-sibling::button[1]").click();
        const edgeKey = await commandInput.inputValue();

        await launch(edgeKey, "docker-compose.agent-a.yml")

        await expect(page.getByRole("heading", { name: "Managed Databases" })).toBeVisible({ timeout: 20_000 });
    });

    test("Launch agent B", async ({page}) => {
        await page.goto("/dashboard/agents");
        await expect(page.getByRole("heading", {name: "Agents"})).toBeVisible();
        await navigateVia(page, get(page, "Agent B"), /\/dashboard\/agents\/.+/);
        await expect(page.getByText("Agent B", {exact: true})).toBeVisible();
        await expect(page.getByText("Registration & Setup")).toBeVisible();

        const commandInput = page.locator("input[readonly]").last();
        await page.locator("input[readonly]").first().locator("xpath=following-sibling::button[1]").click();
        const edgeKey = await commandInput.inputValue();

        await launch(edgeKey, "docker-compose.agent-b.yml")

        await expect(page.getByRole("heading", { name: "Managed Databases" })).toBeVisible({ timeout: 20_000 });
    });
});