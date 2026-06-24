import { expect, Page } from "@playwright/test";

export async function createAccount(
  page: Page,
  firstName: string,
  lastName: string,
  email: string,
  password: string,
) {
  await page.getByLabel("First name").fill(firstName);
  await page.getByLabel("Last name").fill(lastName);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
}

export async function createOrg(page: Page, name: string) {
  await page.getByLabel("Organisation name").fill(name);
  await page.getByRole("button", { name: "Continue" }).click();
}

export async function addWebhookNotifier(
  page: Page,
  channelName: string,
  webhookUrl: string,
) {
  await page.getByRole("button", { name: "Webhook" }).click();
  await expect(page.getByText("Configuring Webhook")).toBeVisible();
  await page.getByLabel(/Channel name/).fill(channelName);
  await page.getByLabel(/Webhook URL/).fill(webhookUrl);
  await page.getByRole("button", { name: "Add channel" }).click();
  await expect(
    page.getByRole("heading", { name: "Connect a notifier" }),
  ).toBeVisible();
}

export async function addS3Storage(
  page: Page,
  channelName: string,
  opts: {
    endpoint: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
  },
) {
  await page.getByRole("button", { name: "S3" }).click();
  await expect(page.getByText("Configuring S3")).toBeVisible();
  await page.getByLabel(/Channel name/).fill(channelName);
  await page.getByLabel(/Endpoint URL/).fill(opts.endpoint);
  await page.getByLabel(/Access Key/).fill(opts.accessKey);
  await page.getByLabel(/Secret Key/).fill(opts.secretKey);
  await page.getByLabel(/Bucket name/).fill(opts.bucket);
  await page.getByRole("button", { name: "Add storage" }).click();
  await expect(
    page.getByRole("heading", { name: "Connect an external storage" }),
  ).toBeVisible();
}

export async function removeChannelByName(page: Page, channelName: string) {
  await page
    .locator("span", { hasText: channelName })
    .locator("xpath=..")
    .locator("button")
    .click();
}
