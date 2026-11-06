// Fresh W2 review captures only. Never reads/writes W1 screenshot baselines.
// Run against the verified production preview, with matching WEBSITE_BASE.
import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { sha256 } from "./demo-contract.mjs";
const base = process.env.WEBSITE_BASE || "/Nasj/";
const output = "reviews/w2";
await mkdir(`${output}/screenshots`, { recursive: true });
const browser = await chromium.launch();
const captures = [];
const measurements = [];
try {
    for (const [locale, theme, width] of [
        ["en", "dark", 1440],
        ["en", "dark", 390],
        ["en", "dark", 320],
        ["ar", "light", 1440],
        ["ar", "light", 390],
        ["ar", "light", 320],
    ]) {
        const context = await browser.newContext({
            viewport: { width, height: 900 },
            deviceScaleFactor: 1,
            colorScheme: theme,
            reducedMotion: "reduce",
        });
        try {
            const page = await context.newPage();
            await page.goto(
                "http://127.0.0.1:4321" +
                    base +
                    (locale === "ar" ? "ar/demo/" : "demo/"),
            );
            await page.evaluate(() => document.fonts.ready);
            const iframe = page.locator("iframe").first();
            await iframe.scrollIntoViewIfNeeded();
            const frame = await (await iframe.elementHandle()).contentFrame();
            await frame.locator("#search").fill("127.0.0.1:8100");
            await frame.locator("#matches button").click();
            for (const area of ["intro", "report"]) {
                if (area === "intro") await page.evaluate(() => scrollTo(0, 0));
                else
                    await iframe.evaluate((e) =>
                        e.scrollIntoView({ block: "start" }),
                    );
                const path = `${output}/screenshots/${locale}-${theme}-${width}-${area}.png`;
                await page.screenshot({ path });
                captures.push({
                    path: path.slice(output.length + 1),
                    locale,
                    theme,
                    width,
                    height: 900,
                    area,
                    recordedAt: new Date().toISOString(),
                    sha256: sha256(await readFile(path)),
                });
            }
        } finally {
            await context.close();
        }
    }
    // Three sequential, unthrottled lab observations; not field INP or mobile LCP.
    for (let run = 1; run <= 3; run++) {
        const context = await browser.newContext({
            viewport: { width: 1440, height: 900 },
        });
        try {
            const page = await context.newPage();
            await page.goto(
                "http://127.0.0.1:4321" +
                    base +
                    "demos/v0.1.0/multi-vhost.html",
            );
            const result = await page.evaluate(async () => {
                const start = performance.now();
                const search = document.querySelector("#search");
                search.value = "127.0.0.1:8100";
                search.dispatchEvent(new Event("input", { bubbles: true }));
                document.querySelector("#matches button").click();
                await new Promise((resolve) =>
                    requestAnimationFrame(() => requestAnimationFrame(resolve)),
                );
                return {
                    milliseconds: performance.now() - start,
                    selected: document.querySelector("#node-title").textContent,
                };
            });
            measurements.push({ run, ...result });
        } finally {
            await context.close();
        }
    }
    await writeFile(
        `${output}/capture-environment.json`,
        JSON.stringify(
            {
                recordedAt: new Date().toISOString(),
                base,
                node: process.version,
                osRelease: await readFile("/etc/os-release", "utf8"),
                playwright: JSON.parse(
                    await readFile(
                        "node_modules/@playwright/test/package.json",
                        "utf8",
                    ),
                ).version,
                chromium: browser.version(),
                screenshotProfile:
                    "Chromium headless, device scale 1, 900px viewport height, reduced motion; genuine sandboxed viewer with selected backend; W2 review captures, not baselines",
                timingProfile:
                    "Three sequential fresh contexts, desktop 1440x900, unthrottled local production server, search + selection + two animation frames; not mobile LCP/CLS, field INP, or a launch-performance approval",
                captures,
                measurements,
            },
            null,
            4,
        ) + "\n",
    );
    console.log(
        `${captures.length} new W2 captures; W1 baselines untouched.`,
        measurements,
    );
} finally {
    await browser.close();
}
