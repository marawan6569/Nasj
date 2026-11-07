import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const base = (process.env.WEBSITE_BASE || "/Nasj/").replace(/\/?$/, "/");
const key = "nasj.website.theme";
const route = (locale: string) => base + (locale === "ar" ? "ar/" : "");

async function settle(page: Page) {
    await page.evaluate(async () => {
        await document.fonts.ready;
    });
    for (const img of await page.locator("img:visible").all()) {
        await img.scrollIntoViewIfNeeded();
        await expect(img).toHaveJSProperty("complete", true);
        expect(
            await img.evaluate((e) => (e as HTMLImageElement).naturalWidth),
        ).toBeGreaterThan(0);
    }
    await page.evaluate(() => scrollTo(0, 0));
}

for (const locale of ["en", "ar"]) {
    for (const theme of ["dark", "light"] as const) {
        for (const width of [1440, 768, 390, 320]) {
            test(`${locale} ${theme} ${width}: production smoke, reflow, accessibility and visual`, async ({
                page,
                browserName,
            }) => {
                await page.setViewportSize({ width, height: 900 });
                await page.emulateMedia({
                    colorScheme: theme,
                    reducedMotion: "reduce",
                });
                const errors: string[] = [];
                const remote: string[] = [];
                page.on("pageerror", (e) => errors.push(e.message));
                page.on("console", (m) => {
                    if (m.type() === "error") errors.push(m.text());
                });
                page.on("request", (r) => {
                    if (!r.url().startsWith("http://127.0.0.1:4321/"))
                        remote.push(r.url());
                });
                const response = await page.goto(route(locale));
                expect(response?.status()).toBe(200);
                await settle(page);
                await expect(page.locator("html")).toHaveAttribute(
                    "lang",
                    locale,
                );
                await expect(page.locator("html")).toHaveAttribute(
                    "dir",
                    locale === "ar" ? "rtl" : "ltr",
                );
                await expect(page.locator("html")).toHaveAttribute(
                    "data-theme",
                    theme,
                );
                expect(
                    await page.evaluate(
                        () =>
                            document.documentElement.scrollWidth <= innerWidth,
                    ),
                ).toBe(true);
                expect(
                    await page
                        .locator(".source-card")
                        .evaluate((e) => getComputedStyle(e).direction),
                ).toBe("ltr");
                await expect(
                    page.locator("iframe, canvas, input[type=file]"),
                ).toHaveCount(0);
                await expect(page.locator("h1")).toHaveCount(1);
                expect(
                    await page
                        .locator(".brand img")
                        .evaluate((e) => (e as HTMLImageElement).currentSrc),
                ).toContain(`logo_report_${theme}.png`);
                // Raster captures are not accessible DOM UI: axe only covers the website.
                const axe = await new AxeBuilder({ page })
                    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
                    .analyze();
                expect(
                    axe.violations.map((v) => ({
                        id: v.id,
                        nodes: v.nodes.map((n) => n.target),
                    })),
                ).toEqual([]);
                if (width < 600) {
                    const sizes = await page
                        .locator(
                            ".hero-note,.release,.source-foot code,.report-language,.report-caption,.format span,.footer-brand p",
                        )
                        .evaluateAll((elements) =>
                            elements.map((e) =>
                                parseFloat(getComputedStyle(e).fontSize),
                            ),
                        );
                    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(12);
                    expect(
                        await page
                            .locator(".mobile-report img")
                            .first()
                            .evaluate((e) => e.getBoundingClientRect().width),
                    ).toBeGreaterThanOrEqual(width - 52);
                    await page.locator("summary").click();
                    await expect(
                        page.locator(".mobile-menu nav"),
                    ).toBeVisible();
                    await page.keyboard.press("Escape");
                    await expect(page.locator("summary")).toBeFocused();
                    await expect(page.locator(".mobile-menu nav")).toBeHidden();
                    await page.locator("h1").click();
                }
                expect(errors).toEqual([]);
                expect(remote).toEqual([]);
                // Cold page plus every visible capture, including fonts and HTML.
                // The local static server does not compress responses: conservative.
                const payload = await page.evaluate(() =>
                    [
                        ...performance.getEntriesByType("resource"),
                        ...performance.getEntriesByType("navigation"),
                    ].reduce(
                        (sum, entry) =>
                            sum +
                            (entry as PerformanceResourceTiming)
                                .encodedBodySize,
                        0,
                    ),
                );
                expect(payload).toBeLessThanOrEqual(500 * 1024);
                if (browserName === "chromium" && width !== 768)
                    await expect(page).toHaveScreenshot(
                        `${locale}-${theme}-${width}.png`,
                        { fullPage: true },
                    );
            });
        }
    }
}

test("theme precedence, persistence, OS changes, cross-tab changes and language navigation", async ({
    page,
    context,
}) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(base);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.locator("select").selectOption("dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.locator("select").selectOption("system");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const other = await context.newPage();
    await other.goto(base);
    await other.locator("select").selectOption("light");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.goto(base + "#features");
    await page.locator("[data-language]").click();
    await expect(page).toHaveURL(new RegExp(`${base}ar/#features$`));
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

for (const blocked of [true, false]) {
    test(`theme survives ${blocked ? "unavailable" : "invalid"} storage`, async ({
        page,
    }) => {
        await page.emulateMedia({ colorScheme: "dark" });
        await page.addInitScript(
            ({ blocked, key }) => {
                if (blocked)
                    Object.defineProperty(window, "localStorage", {
                        get() {
                            throw new DOMException("blocked", "SecurityError");
                        },
                    });
                else localStorage.setItem(key, "invalid");
            },
            { blocked, key },
        );
        await page.goto(base);
        await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            "dark",
        );
        await page.locator("select").selectOption("light");
        await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            "light",
        );
    });
}

for (const locale of ["en", "ar"])
    for (const theme of ["light", "dark"] as const) {
        test(`no JavaScript ${locale} ${theme}: readable system theme, native navigation`, async ({
            browser,
        }) => {
            const context = await browser.newContext({
                javaScriptEnabled: false,
                colorScheme: theme,
                viewport: { width: 390, height: 844 },
            });
            const page = await context.newPage();
            await page.goto("http://127.0.0.1:4321" + route(locale));
            await expect(page.locator("h1")).toBeVisible();
            await expect(page.locator("select")).toBeHidden();
            expect(
                await page
                    .locator("body")
                    .evaluate((e) => getComputedStyle(e).backgroundColor),
            ).toBe(theme === "dark" ? "rgb(8, 21, 30)" : "rgb(244, 248, 250)");
            expect(
                await page
                    .locator(".brand img")
                    .evaluate((e) => (e as HTMLImageElement).currentSrc),
            ).toContain(`logo_report_${theme}.png`);
            await page.locator("summary").click();
            await expect(page.locator(".mobile-menu nav")).toBeVisible();
            await page.locator(".mobile-menu nav a").first().click();
            await expect(page).toHaveURL(/#features$/);
            await context.close();
        });
    }

test("keyboard skip link, controls and reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(base);
    await page.keyboard.press("Tab");
    await expect(page.locator(".skip-link")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
    await page.locator("select").focus();
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(
        await page
            .locator(".button")
            .first()
            .evaluate((e) => getComputedStyle(e).transitionDuration),
    ).toBe("0s");
});

test("effective production CSP blocks injected scripts and network connections", async ({
    page,
}) => {
    await page.goto(base);
    const result = await page.evaluate(async () => {
        const violations: string[] = [];
        document.addEventListener("securitypolicyviolation", (e) =>
            violations.push(e.effectiveDirective),
        );
        const script = document.createElement("script");
        script.textContent =
            'document.documentElement.dataset.injected = "yes"';
        document.body.append(script);
        let blocked = false;
        try {
            await fetch("/forbidden-probe");
        } catch {
            blocked = true;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
        return {
            injected: document.documentElement.dataset.injected,
            blocked,
            violations,
        };
    });
    expect(result.injected).toBeUndefined();
    expect(result.blocked).toBe(true);
    expect(result.violations).toContain("script-src-elem");
    expect(result.violations).toContain("connect-src");
});

test("offline after loading: theme and section navigation remain local", async ({
    page,
    context,
}) => {
    await page.goto(base);
    await settle(page);
    await context.setOffline(true);
    await page.locator("select").selectOption("dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.locator(".actions a").first().click();
    await expect(page).toHaveURL(/#demo$/);
});

test("real 404 and intermediate-width reflow", async ({ page }) => {
    const response = await page.goto(base + "does-not-exist/");
    expect(response?.status()).toBe(404);
    await expect(page.locator("div[lang=ar]")).toContainText(
        "الصفحة غير موجودة",
    );
    for (const width of [768, 1024])
        for (const locale of ["en", "ar"]) {
            await page.setViewportSize({ width, height: 900 });
            await page.goto(route(locale));
            expect(
                await page.evaluate(
                    () => document.documentElement.scrollWidth <= innerWidth,
                ),
            ).toBe(true);
        }
});
