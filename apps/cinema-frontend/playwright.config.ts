import { defineConfig } from "@playwright/test";

export const appServer = {
  command: "npm run start -- --hostname 127.0.0.1 --port 3100",
  url: "http://127.0.0.1:3100",
  reuseExistingServer: false,
  timeout: 60000,
  env: { MBA_FIXTURE_SCENARIO: "ready" },
};

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: "**/home.error.spec.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  use: {
    browserName: "chromium",
    baseURL: "http://127.0.0.1:3100",
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    trace: "retain-on-failure",
  },
  expect: {
    toHaveScreenshot: { animations: "disabled", maxDiffPixelRatio: 0.005 },
  },
  webServer: appServer,
});
