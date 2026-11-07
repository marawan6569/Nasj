// Immutable viewer inventory, NOT a WCAG pass gate or a waiver.
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
const browser = await chromium.launch();
const results = [];
try {
    for (const theme of ["dark", "light"]) {
        const context = await browser.newContext({
            viewport: { width: 390, height: 844 },
            colorScheme: theme,
        });
        const page = await context.newPage();
        await page.goto(
            "http://127.0.0.1:4321" +
                (process.env.WEBSITE_BASE || "/Nasj/") +
                "demos/v0.1.0/multi-vhost.html",
        );
        const result = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
            .analyze();
        results.push({
            surface: "direct released multi-vhost viewer",
            theme,
            viewport: "390x844",
            browser: browser.version(),
            violations: result.violations.map((v) => ({
                id: v.id,
                impact: v.impact,
                nodes: v.nodes.map((n) => ({
                    target: n.target,
                    summary: n.failureSummary,
                })),
            })),
            incomplete: result.incomplete.map((v) => v.id),
        });
        await context.close();
    }
} finally {
    await browser.close();
}
await mkdir("test-results/viewer-audit", { recursive: true });
await writeFile(
    "test-results/viewer-audit/axe.json",
    JSON.stringify(results, null, 2) + "\n",
);
console.log(JSON.stringify(results, null, 2));
