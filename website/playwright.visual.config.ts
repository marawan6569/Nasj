import { defineConfig } from "@playwright/test";
import common from "./playwright.config";
export default defineConfig({
    ...common,
    testMatch: "**/*.visual.ts",
    projects: [{ name: "chromium", use: { browserName: "chromium" } }],
    snapshotPathTemplate: "{testDir}/launch-screenshots/{arg}{ext}",
});
