import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
  testDir: "./src",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.SERVER_URL,
    actionTimeout: 30000,
    trace: "on-first-retry",
  },
  timeout: 60000,
  projects: [
    {
      name: "cli",
      testMatch: "**/cli/**/*.spec.ts",
    },
    {
      name: "setup",
      testMatch: "**/setup.spec.ts",
    },
    ...(process.env.SKIP_ONBOARDING === "false"
      ? [
          {
            name: "onboarding",
            testMatch: "**/onboarding.spec.ts",
            dependencies: ["setup"],
          },
        ]
      : []),
    {
      name: "auth",
      testMatch: "**/auth.spec.ts",
      dependencies: ["setup"],
    },
    {
      name: "oidc",
      testMatch: "**/oidc.spec.ts",
      dependencies: ["auth"],
    },
    {
      name: "access-management",
      testMatch: "**/access-management.spec.ts",
      dependencies: ["oidc"],
    },
    {
      name: "notification",
      testMatch: "**/notification/**/*.spec.ts",
      dependencies: ["access-management"],
    },
    {
      name: "storage",
      testMatch: "**/storage/**/*.spec.ts",
      dependencies: ["access-management"],
    },
    {
      name: "agent",
      testMatch: "**/agent.spec.ts",
      dependencies: ["access-management"],
    },
    {
      name: "project",
      testMatch: "**/project.spec.ts",
      dependencies: ["agent"],
    },
    {
      name: "cleanup",
      testMatch: "**/cleanup.spec.ts",
      dependencies: ["storage", "notification", "project"],
    },
  ],
});
