import { defineConfig } from "@playwright/test";
import base, { appServer } from "./playwright.config";
export default defineConfig({
  ...base,
  testIgnore: [],
  testMatch: "**/home.error.spec.ts",
  webServer: { ...appServer, env: { MBA_FIXTURE_SCENARIO: "error-once" } },
});
