import { test, expect } from "@playwright/test";
const base = process.env.WEBSITE_BASE || "/Nasj/";
for (const locale of ["en", "ar"])
    for (const theme of ["light", "dark"] as const)
        for (const width of [390, 768, 1440])
            for (const slug of ["install", "demo"]) {
                test(`W4 visual ${slug} ${locale} ${theme} ${width}`, async ({
                    page,
                }) => {
                    await page.setViewportSize({ width, height: 900 });
                    await page.emulateMedia({
                        colorScheme: theme,
                        reducedMotion: "reduce",
                    });
                    await page.goto(
                        base + (locale === "ar" ? "ar/" : "") + slug + "/",
                    );
                    await page.evaluate(() => document.fonts.ready);
                    await expect(page).toHaveScreenshot(
                        `${slug}-${locale}-${theme}-${width}.png`,
                    );
                });
            }
