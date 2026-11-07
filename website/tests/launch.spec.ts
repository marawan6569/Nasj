import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const base = process.env.WEBSITE_BASE || "/Nasj/";
const routes = ["install", "docs", "compatibility", "roadmap", "licenses"];
for (const locale of ["en", "ar"])
    for (const theme of ["light", "dark", "system"] as const)
        for (const width of [320, 390, 768, 1440]) {
            test(`W4 content ${locale} ${theme} ${width}: all routes, accessibility, bidi and reflow`, async ({
                page,
            }, info) => {
                test.setTimeout(90000);
                await page.setViewportSize({ width, height: 900 });
                await page.emulateMedia({
                    colorScheme: "light",
                    reducedMotion: "reduce",
                });
                const errors: string[] = [];
                page.on("pageerror", (e) => errors.push(e.message));
                page.on("console", (m) => {
                    if (m.type() === "error") errors.push(m.text());
                });
                for (const slug of routes) {
                    await page.goto(
                        base + (locale === "ar" ? "ar/" : "") + slug + "/",
                    );
                    await page.locator("select").selectOption(theme);
                    await page.evaluate(() => document.fonts.ready);
                    await expect(page.locator("html")).toHaveAttribute(
                        "data-theme",
                        theme === "system" ? "light" : theme,
                    );
                    expect(
                        await page.evaluate(
                            () =>
                                document.documentElement.scrollWidth <=
                                innerWidth,
                        ),
                    ).toBe(true);
                    for (const code of await page.locator("pre").all()) {
                        expect(
                            await code.evaluate((e) => ({
                                direction: getComputedStyle(e).direction,
                                bidi: getComputedStyle(e).unicodeBidi,
                            })),
                        ).toEqual({ direction: "ltr", bidi: "isolate" });
                    }
                    const axe = await new AxeBuilder({ page })
                        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
                        .analyze();
                    expect(
                        axe.violations.map((v) => ({
                            id: v.id,
                            targets: v.nodes.map((n) => n.target),
                        })),
                    ).toEqual([]);
                    if (theme !== "system" && [390, 1440].includes(width))
                        await page.screenshot({
                            path: info.outputPath(
                                `${slug}-${locale}-${theme}-${width}.png`,
                            ),
                            fullPage: true,
                        });
                    if (theme === "system") {
                        await page.emulateMedia({ colorScheme: "dark" });
                        await expect(page.locator("html")).toHaveAttribute(
                            "data-theme",
                            "dark",
                        );
                        await page.emulateMedia({ colorScheme: "light" });
                    }
                }
                expect(errors).toEqual([]);
            });
        }
for (const locale of ["en", "ar"])
    test(`W4 ${locale}: keyboard, reduced motion, no-JS guide and equivalent locale routes`, async ({
        page,
        browser,
    }) => {
        await page.setViewportSize({ width: 320, height: 900 });
        for (const slug of routes) {
            await page.goto(base + (locale === "ar" ? "ar/" : "") + slug + "/");
            await page.keyboard.press("Tab");
            await expect(page.locator(".skip-link")).toBeFocused();
            await page.keyboard.press("Enter");
            await expect(page.locator("main")).toBeFocused();
            await page.locator("[data-language]").click();
            expect(new URL(page.url()).pathname).toBe(
                base + (locale === "ar" ? "" : "ar/") + slug + "/",
            );
        }
        await page.emulateMedia({ reducedMotion: "reduce" });
        expect(
            await page
                .locator("main")
                .evaluate((e) => getComputedStyle(e).animationName),
        ).toBe("none");
        const noJS = await browser.newContext({
            javaScriptEnabled: false,
            viewport: { width: 320, height: 900 },
            colorScheme: "dark",
        });
        try {
            const p = await noJS.newPage();
            for (const slug of routes) {
                await p.goto(
                    "http://127.0.0.1:4321" +
                        base +
                        (locale === "ar" ? "ar/" : "") +
                        slug +
                        "/",
                );
                await expect(p.locator("h1")).toBeVisible();
                await expect(p.locator(".theme-control")).toBeHidden();
                await p.locator(".mobile-menu summary").click();
                await expect(p.locator(".mobile-menu nav")).toBeVisible();
                expect(
                    await p.evaluate(
                        () =>
                            document.documentElement.scrollWidth <= innerWidth,
                    ),
                ).toBe(true);
                if (slug === "install")
                    await expect(p.locator("[data-distribution]")).toHaveCount(
                        5,
                    );
            }
        } finally {
            await noJS.close();
        }
    });

test("W4 mobile embedded report: search, inspect selection and nested scrolling", async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + "ar/demo/");
    const iframe = page.locator("iframe").first();
    await iframe.scrollIntoViewIfNeeded();
    const frame = (await (await iframe.elementHandle())!.contentFrame())!;
    await frame.locator("#search").fill("127.0.0.1:8100");
    await frame.locator("#matches button").click();
    await frame.getByRole("button", { name: "Inspect selection" }).click();
    await expect(frame.locator("#node-fields")).toContainText(
        "multi-vhost.conf:7",
    );
    await frame.locator("#node-fields").scrollIntoViewIfNeeded();
    expect(
        await frame.locator("#node-fields").evaluate((e) => {
            const b = e.getBoundingClientRect();
            return b.bottom > 0 && b.top < innerHeight;
        }),
    ).toBe(true);
    await page.locator("#unresolved .demo-evidence").scrollIntoViewIfNeeded();
    await expect(page.locator("#unresolved .demo-evidence")).toBeInViewport();
});
