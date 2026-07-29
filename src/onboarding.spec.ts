import { expect, test } from "@playwright/test";
import {
  addS3Storage,
  addWebhookNotifier,
  createAccount,
  createOrg,
  removeChannelByName,
} from "./helpers/onboarding";
import { launch } from "./helpers/agent";

const user = {
  firstName: "Onboarding",
  lastName: "Admin",
  email: "onboarding.admin@example.com",
  password: "testPASS123456!",
};

test.describe.serial(() => {
  test("Routes redirect to /welcome when onboarding is pending", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/welcome");

    await page.goto("/login");
    await expect(page).toHaveURL("/welcome");

    await page.goto("/dashboard/home");
    await expect(page).toHaveURL("/welcome");
  });

  test("Welcome page shows the registration step", async ({ page }) => {
    await page.goto("/welcome");
    await expect(
      page.getByRole("heading", { name: "Welcome to Portabase" }),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /Register/ })).toBeVisible();
  });

  test("account-info: empty form shows validation errors", async ({ page }) => {
    await page.goto("/welcome");
    await expect(
      page.getByRole("heading", { name: "Welcome to Portabase" }),
    ).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: /Register/ }).click();
    await expect(
      page.getByRole("heading", { name: "Create your account" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await expect(page.getByText("First name required")).toBeVisible();
    await expect(page.getByText("Last name required")).toBeVisible();
  });

  test("Complete onboarding wizard", async ({ page }) => {
    await page.goto("/welcome");
    await expect(
      page.getByRole("heading", { name: "Welcome to Portabase" }),
    ).toBeVisible({ timeout: 15000 });

    await test.step("Navigate to account-info", async () => {
      await page.getByRole("button", { name: /Register/ }).click();
      await expect(
        page.getByRole("heading", { name: "Create your account" }),
      ).toBeVisible();
    });

    await test.step("Create first account", async () => {
      await createAccount(
        page,
        user.firstName,
        user.lastName,
        user.email,
        user.password,
      );
      await expect(
        page
          .getByRole("heading", { name: "Secure your account" })
          .or(page.getByRole("heading", { name: "Your preferences" })),
      ).toBeVisible({ timeout: 15000 });
    });

    await test.step("Skip security step if present", async () => {
      const securityHeading = page.getByRole("heading", {
        name: "Secure your account",
      });
      if (await securityHeading.isVisible()) {
        await page.getByRole("button", { name: "Skip for now" }).click();
      }
      await expect(
        page.getByRole("heading", { name: "Your preferences" }),
      ).toBeVisible();
    });

    await test.step("Preferences: continue to org-create", async () => {
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(
        page.getByRole("heading", { name: "Name your default organisation" }),
      ).toBeVisible();
    });

    await test.step("org-create: Continue disabled without a name", async () => {
      await page.getByLabel("Organisation name").clear();
      await expect(
        page.getByRole("button", { name: "Continue" }),
      ).toBeDisabled();
    });

    await test.step("Create organisation", async () => {
      await createOrg(page, "E2E Organisation");
      await expect(
        page.getByRole("heading", { name: "Connect a notifier" }),
      ).toBeVisible({ timeout: 15000 });
    });

    await test.step("Notifier: add a Webhook channel", async () => {
      await addWebhookNotifier(
        page,
        "E2E Webhook Channel",
        "https://example.com/webhook",
      );
      await expect(
        page.locator("span", { hasText: "E2E Webhook Channel" }),
      ).toBeVisible();
    });

    await test.step("Notifier: remove the Webhook channel", async () => {
      await removeChannelByName(page, "E2E Webhook Channel");
      await expect(
        page.locator("span", { hasText: "E2E Webhook Channel" }),
      ).not.toBeVisible();
    });

    await test.step("Notifier: re-add the Webhook channel", async () => {
      await addWebhookNotifier(
        page,
        "E2E Webhook Channel",
        "https://example.com/webhook",
      );
      await expect(
        page.locator("span", { hasText: "E2E Webhook Channel" }),
      ).toBeVisible();
    });

    await test.step("Notifier: Continue to storage step", async () => {
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(
        page.getByRole("heading", { name: "Connect an external storage" }),
      ).toBeVisible();
    });

    await test.step("Storage: add an S3 channel", async () => {
      await addS3Storage(page, "E2E S3 Backup", {
        endpoint: "s3.amazonaws.com",
        accessKey: "AKIAIOSFODNN7EXAMPLE",
        secretKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        bucket: "e2e-test-bucket",
      });
      await expect(
        page.locator("span", { hasText: "E2E S3 Backup" }),
      ).toBeVisible();
    });

    await test.step("Storage: remove the S3 channel", async () => {
      await removeChannelByName(page, "E2E S3 Backup");
      await expect(
        page.locator("span", { hasText: "E2E S3 Backup" }),
      ).not.toBeVisible();
    });

    await test.step("Storage: re-add the S3 channel", async () => {
      await addS3Storage(page, "E2E S3 Backup", {
        endpoint: "s3.amazonaws.com",
        accessKey: "AKIAIOSFODNN7EXAMPLE",
        secretKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        bucket: "e2e-test-bucket",
      });
      await expect(
        page.locator("span", { hasText: "E2E S3 Backup" }),
      ).toBeVisible();
    });

    await test.step("Storage: Continue — channels present → defaults step", async () => {
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(
        page.getByRole("heading", { name: "Set your defaults" }),
      ).toBeVisible();
    });

    await test.step("Defaults: notifier and storage selects are present", async () => {
      await expect(
        page.getByText("Default notifier", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("Default storage", { exact: true }),
      ).toBeVisible();
    });

    await test.step("Defaults: select default notifier", async () => {
      await page
        .locator('[role="combobox"]', { hasText: "Choose a notifier" })
        .click();
      await page.getByRole("option", { name: /E2E Webhook Channel/ }).click();
      await expect(
        page.locator('[role="combobox"]', { hasText: "E2E Webhook Channel" }),
      ).toBeVisible();
    });

    await test.step("Defaults: select default storage", async () => {
      await page
        .locator('[role="combobox"]', { hasText: "Choose a storage" })
        .click();
      await page.getByRole("option", { name: /E2E S3 Backup/ }).click();
      await expect(
        page.locator('[role="combobox"]', { hasText: "E2E S3 Backup" }),
      ).toBeVisible();
    });

    await test.step("Defaults: Continue to agent-create", async () => {
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(
        page.getByRole("heading", { name: "Create an agent" }),
      ).toBeVisible();
    });

    await test.step("Agent-create: add an agent", async () => {
      await page.locator('input[placeholder="agent-prod"]').fill("E2E Agent");
      await page.getByRole("button", { name: "Add" }).click();
      await expect(page.getByText("E2E Agent")).toBeVisible();
    });

    await test.step("Agent-create: Continue to agent-key step", async () => {
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(
        page.getByRole("heading", { name: "Connect your agent" }),
      ).toBeVisible();
    });

    await test.step("Agent-key: reveal key, read it, launch agent container", async () => {
      await page
        .locator("input[readonly]")
        .first()
        .locator("xpath=following-sibling::button[1]")
        .click();
      const edgeKey = await page.locator("input[readonly]").last().inputValue();
      await launch(edgeKey, "docker-compose.agent-a.yml");
    });

    await test.step("Agent-key: Continue to agent-waiting step", async () => {
      await page.getByRole("button", { name: /I've run the command/ }).click();
      await expect(
        page.getByRole("heading", { name: "Waiting for your agent" }),
      ).toBeVisible();
    });

    await test.step("Agent-waiting: agent connects — wizard auto-advances to project-create", async () => {
      await expect(
        page.getByRole("heading", { name: "Create a project" }),
      ).toBeVisible({ timeout: 30000 });
    });

    await test.step("Project-create: name project and select a database", async () => {
      await page.locator("#project-name").fill("E2E Onboarding Project");
      const firstDbBtn = page
        .locator('button[type="button"]')
        .filter({ hasText: /(PostgreSQL|MySQL|MariaDB)/ })
        .first();
      await expect(firstDbBtn).toBeVisible({ timeout: 15000 });
      await firstDbBtn.click();
    });

    await test.step("Project-create: Continue → db-settings (databases selected + agent connected)", async () => {
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(
        page.getByRole("heading", { name: "Configure databases" }),
      ).toBeVisible();
    });

    await test.step("Db-settings: open first database", async () => {
      await page
        .locator('button[type="button"]')
        .filter({ hasText: /(PostgreSQL|MySQL|MariaDB)/ })
        .first()
        .click();
      await expect(
        page.getByRole("button", { name: /Scheduling/ }),
      ).toBeVisible();
    });

    await test.step("Db-settings Scheduling: set automatic daily and save", async () => {
      await page.getByRole("button", { name: /Scheduling/ }).click();
      await page.getByRole("radio", { name: /Automatic/ }).click();
      await page.getByRole("button", { name: /^Daily/ }).click();
      await page.getByRole("button", { name: "Save" }).click();
      await expect(
        page.getByRole("button", { name: /Scheduling/ }),
      ).toBeVisible();
    });

    await test.step("Db-settings Retention: save default policy", async () => {
      await page.getByRole("button", { name: /Retention Policy/ }).click();
      await page.getByRole("button", { name: "Save Retention Policy" }).click();
      await expect(
        page.getByRole("button", { name: /Retention Policy/ }),
      ).toBeVisible();
    });

    await test.step("Db-settings Notifications: add policy for E2E Webhook Channel", async () => {
      await page.getByRole("button", { name: /Notifications/ }).click();
      await page.getByRole("button", { name: /Add Policy/ }).click();
      await page
        .locator('[role="combobox"]', { hasText: "Select channel" })
        .click();
      await page.getByRole("option", { name: /E2E Webhook Channel/ }).click();
      await page
        .locator("button", { has: page.getByText(/Select events/) })
        .click();
      await page.getByRole("option", { name: "Success Backup" }).click();
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Save Changes" }).click();
      await expect(
        page.getByRole("button", { name: /Notifications/ }),
      ).toBeVisible();
    });

    await test.step("Db-settings Storage: add policy for E2E S3 Backup", async () => {
      await page.getByRole("button", { name: /^Storage/ }).click();
      await page.getByRole("button", { name: /Add Policy/ }).click();
      await page
        .locator('[role="combobox"]', { hasText: "Select channel" })
        .click();
      await page.getByRole("option", { name: /E2E S3 Backup/ }).click();
      await page.getByRole("button", { name: "Save Changes" }).click();
      await expect(
        page.getByRole("button", { name: /^Storage/ }),
      ).toBeVisible();
    });

    await test.step("Db-settings: back to grid and Continue", async () => {
      await page
        .getByRole("button", { name: "Back", exact: true })
        .first()
        .click();
      await expect(
        page.getByRole("heading", { name: "Configure databases" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(
        page.getByRole("heading", { name: "You're all set!" }),
      ).toBeVisible();
    });

    await test.step("Finish onboarding and land on dashboard", async () => {
      await page.getByRole("button", { name: "Go to dashboard" }).click();
      await expect(page).toHaveURL("/dashboard/home", { timeout: 15000 });
      await expect(
        page.getByRole("heading", { name: "Dashboard" }),
      ).toBeVisible();
    });
  });

  test("After onboarding: /welcome no longer shows the wizard", async ({
    page,
  }) => {
    await page.goto("/welcome");
    await expect(page).not.toHaveURL("/welcome");
  });

  test("After onboarding: / does not redirect to /welcome", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/welcome/);
  });
});
