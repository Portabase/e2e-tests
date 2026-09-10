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
      name: "setup",
      testMatch: "/src/setup.spec.ts",
    },
    ...(process.env.SKIP_ONBOARDING === "false"
      ? [
          {
            name: "onboarding",
            testMatch: "/src/onboarding.spec.ts",
            dependencies: ["setup"],
          },
        ]
      : []),
    {
      name: "auth",
      testMatch: "/src/auth.spec.ts",
      dependencies: ["setup"],
    },
    {
      name: "oidc",
      testMatch: "/src/oidc.spec.ts",
      dependencies: ["auth"],
    },
    {
      name: "access-management",
      testMatch: "/src/access-management.spec.ts",
      dependencies: ["oidc"],
    },
    {
      name: "notification",
      testMatch: "/src/notification/**/*.spec.ts",
      dependencies: ["access-management"],
    },
    {
      name: "storage",
      testMatch: "/src/storage/**/*.spec.ts",
      dependencies: ["access-management"],
    },
    {
      name: "agent",
      testMatch: "/src/agent.spec.ts",
      dependencies: ["access-management"],
    },
    {
      name: "project",
      testMatch: /[\\/]src[\\/]project\.spec\.ts$/,
      dependencies: ["agent"],
    },
    {
      name: "api-setup",
      testMatch: "/src/api/api-key.setup.ts",
      dependencies: ["notification", "storage", "project"],
    },
    {
      name: "api",
      testMatch: "/src/api/*.spec.ts",
      dependencies: ["api-setup"],
      fullyParallel: false,
      workers: 1,
    },
    {
      name: "cleanup",
      testMatch: "**/cleanup.spec.ts",
      dependencies: ["storage", "notification", "project", "api"],
    },
  ],
});
