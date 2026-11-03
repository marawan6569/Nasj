// Run against `npm run preview` after a production build. Review artifacts only.
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.WEBSITE_BASE || "/Nasj/";
const output = "reviews/screenshots";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const measurements = [];
try {
    for (const [locale, theme, width] of [
        ["en", "dark", 1440],
        ["en", "light", 1440],
        ["en", "dark", 390],
        ["ar", "dark", 1440],
        ["ar", "dark", 390],
    ]) {
        const context = await browser.newContext({
            viewport: { width, height: width === 390 ? 844 : 1000 },
            colorScheme: theme,
            reducedMotion: "reduce",
        });
        const page = await context.newPage();
        await page.goto(
            "http://127.0.0.1:4321" + base + (locale === "ar" ? "ar/" : ""),
        );
        await page.evaluate(() => document.fonts.ready);
        for (const img of await page.locator("img:visible").all()) {
            await img.scrollIntoViewIfNeeded();
            await img.evaluate((e) => e.decode());
        }
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({
            path: `${output}/${locale}-${theme}-${width}-viewport.png`,
        });
        if (width === 390) {
            await page
                .locator("#demo")
                .evaluate((e) => e.scrollIntoView({ block: "start" }));
            await page.screenshot({
                path: `${output}/${locale}-${theme}-${width}-report.png`,
            });
        }
        measurements.push({
            locale,
            theme,
            width,
            ...(await page.evaluate(() => ({
                bytes: [
                    ...performance.getEntriesByType("resource"),
                    ...performance.getEntriesByType("navigation"),
                ].reduce((n, e) => n + e.encodedBodySize, 0),
                pageWidth: document.documentElement.scrollWidth,
            }))),
        });
        await context.close();
    }
} finally {
    await browser.close();
}
await writeFile(
    "reviews/measurements.json",
    JSON.stringify(measurements, null, 2) + "\n",
);
console.log(measurements);
