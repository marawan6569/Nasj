import { test, expect } from "@playwright/test";
const base = process.env.WEBSITE_BASE || "/Nasj/";
test("W4 production performance: three sequential mobile lab measurements", async ({
    browser,
    browserName,
}, info) => {
    test.skip(
        browserName !== "chromium",
        "CDP fixed-profile timing uses Chromium; other engines have functional coverage",
    );
    test.setTimeout(120000);
    const results = [];
    for (const locale of ["en", "ar"])
        for (let run = 1; run <= 3; run++) {
            const context = await browser.newContext({
                viewport: { width: 390, height: 844 },
                deviceScaleFactor: 1,
                colorScheme: "dark",
                reducedMotion: "reduce",
            });
            try {
                const page = await context.newPage();
                const cdp = await context.newCDPSession(page);
                await cdp.send("Network.enable");
                await cdp.send("Network.setCacheDisabled", {
                    cacheDisabled: true,
                });
                await cdp.send("Network.emulateNetworkConditions", {
                    offline: false,
                    latency: 150,
                    downloadThroughput: 1600000 / 8,
                    uploadThroughput: 750000 / 8,
                });
                await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
                await page.addInitScript(() => {
                    const metrics = { lcp: 0, cls: 0 };
                    (window as unknown as { lab: typeof metrics }).lab =
                        metrics;
                    new PerformanceObserver((list) => {
                        for (const entry of list.getEntries())
                            metrics.lcp = entry.startTime;
                    }).observe({
                        type: "largest-contentful-paint",
                        buffered: true,
                    });
                    new PerformanceObserver((list) => {
                        for (const entry of list.getEntries() as (PerformanceEntry & {
                            value: number;
                            hadRecentInput: boolean;
                        })[])
                            if (!entry.hadRecentInput)
                                metrics.cls += entry.value;
                    }).observe({ type: "layout-shift", buffered: true });
                });
                await page.goto(base + (locale === "ar" ? "ar/" : ""));
                await page.evaluate(() => document.fonts.ready);
                await page.waitForTimeout(1500); // Allow buffered paint/shift observers to settle.
                const metrics = await page.evaluate(() => ({
                    ...(
                        window as unknown as {
                            lab: { lcp: number; cls: number };
                        }
                    ).lab,
                    bytes: [
                        ...performance.getEntriesByType("navigation"),
                        ...performance.getEntriesByType("resource"),
                    ].reduce(
                        (sum, r) =>
                            sum +
                            (r as PerformanceResourceTiming).encodedBodySize,
                        0,
                    ),
                    reports: performance
                        .getEntriesByType("resource")
                        .filter((r) => r.name.includes("/demos/")).length,
                }));
                results.push({ locale, run, ...metrics });
                await info.attach(`lab-${locale}-${run}`, {
                    body: JSON.stringify(results.at(-1)),
                    contentType: "application/json",
                });
                expect.soft(metrics.lcp).toBeGreaterThan(0);
                expect.soft(metrics.lcp).toBeLessThanOrEqual(2500);
                expect.soft(metrics.cls).toBeLessThanOrEqual(0.1);
                expect.soft(metrics.bytes).toBeLessThanOrEqual(500 * 1024);
                expect.soft(metrics.reports).toBe(0);
            } finally {
                await context.close();
            }
        }
    // Separate warm report interaction; excludes download/navigation time.
    for (let run = 1; run <= 3; run++) {
        const context = await browser.newContext({
            viewport: { width: 390, height: 844 },
        });
        try {
            const page = await context.newPage();
            const cdp = await context.newCDPSession(page);
            await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
            await page.goto(base + "demos/v0.1.0/multi-vhost.html");
            const duration = await page.evaluate(async () => {
                const start = performance.now();
                const input =
                    document.querySelector<HTMLInputElement>("#search")!;
                input.value = "127.0.0.1:8100";
                input.dispatchEvent(new Event("input", { bubbles: true }));
                await new Promise<void>((resolve) =>
                    requestAnimationFrame(() =>
                        requestAnimationFrame(() => resolve()),
                    ),
                );
                if (document.querySelectorAll("#matches button").length !== 1)
                    throw new Error("Search task incomplete");
                return performance.now() - start;
            });
            await info.attach(`interaction-${run}`, {
                body: JSON.stringify({ duration, cpuSlowdown: 4 }),
                contentType: "application/json",
            });
            expect(duration).toBeLessThanOrEqual(200);
        } finally {
            await context.close();
        }
    }
});
