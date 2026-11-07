// One-time NEW baseline acquisition. Refuses to overwrite any existing image.
// Review captures before committing. CI only compares with updates disabled.
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const output = "tests/launch-screenshots";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
    for (const locale of ["en", "ar"])
        for (const theme of ["light", "dark"])
            for (const width of [390, 768, 1440])
                for (const slug of ["install", "demo"]) {
                    const context = await browser.newContext({
                        viewport: { width, height: 900 },
                        colorScheme: theme,
                        reducedMotion: "reduce",
                    });
                    const page = await context.newPage();
                    await page.goto(
                        "http://127.0.0.1:4321/Nasj/" +
                            (locale === "ar" ? "ar/" : "") +
                            slug +
                            "/",
                    );
                    await page.evaluate(() => document.fonts.ready);
                    await writeFile(
                        `${output}/${slug}-${locale}-${theme}-${width}.png`,
                        await page.screenshot({ animations: "disabled" }),
                        { flag: "wx" },
                    );
                    await context.close();
                }
} finally {
    await browser.close();
}
