import { defineConfig } from "@playwright/test";
const run = process.env.WEBSITE_TEST_RUN || "project";
if (!/^[a-z][a-z0-9-]*$/.test(run)) throw new Error("Invalid test run label");
export default defineConfig({
    testDir: "./tests",
    testMatch: "**/*.spec.ts",
    outputDir: `./test-results/${run}`,
    updateSnapshots: "none",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: process.env.CI ? 2 : 4,
    reporter: [
        ["list"],
        ["html", { open: "never", outputFolder: `playwright-report/${run}` }],
    ],
    use: {
        baseURL: "http://127.0.0.1:4321",
        browserName: "chromium",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
    },
    expect: {
        toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: "disabled" },
    },
    webServer: {
        command: "npm run preview",
        url: "http://127.0.0.1:4321" + (process.env.WEBSITE_BASE || "/Nasj/"),
        reuseExistingServer: !process.env.CI,
    },
    snapshotPathTemplate: "{testDir}/screenshots/{arg}{ext}",
});
