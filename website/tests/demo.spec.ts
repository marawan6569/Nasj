import { test, expect, type Frame, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import metadata from "../src/data/demos.json" with { type: "json" };

const base = (process.env.WEBSITE_BASE || "/Nasj/").replace(/\/?$/, "/");
const demo = (locale: string) =>
    base + (locale === "ar" ? "ar/demo/" : "demo/");
const report = (id: string) => base + `demos/v0.1.0/${id}.html`;
const digest = (bytes: Buffer) =>
    createHash("sha256").update(bytes).digest("hex");

async function assertCsp(surface: Page | Frame) {
    const result = await surface.evaluate(async () => {
        const violations: string[] = [];
        document.addEventListener("securitypolicyviolation", (e) =>
            violations.push(e.effectiveDirective),
        );
        const script = document.createElement("script");
        script.textContent =
            "document.documentElement.dataset.unauthorized = 'ran'";
        document.body.append(script);
        let blocked = false;
        try {
            await fetch("https://example.invalid/nasj-csp-probe");
        } catch {
            blocked = true;
        }
        await new Promise((r) => setTimeout(r, 100));
        return {
            blocked,
            ran: document.documentElement.dataset.unauthorized,
            violations,
        };
    });
    expect(result.blocked).toBe(true);
    expect(result.ran).toBeUndefined();
    expect(result.violations).toContain("script-src-elem");
    expect(result.violations).toContain("connect-src");
}

async function tasks(surface: Page | Frame, id: string) {
    await expect(surface.locator("#node-count")).toHaveText(
        id === "multi-vhost" ? "40" : "4",
    );
    await surface
        .locator("#search")
        .fill(id === "multi-vhost" ? "127.0.0.1:8100" : "/dynamic/");
    await expect(surface.locator("#matches button")).toHaveCount(1);
    await surface.locator("#matches button").focus();
    await surface.locator("#matches button").press("Enter");
    await expect(surface.locator("#selection")).toBeVisible();
    await expect(surface.locator("#node-fields")).toContainText(
        id === "multi-vhost"
            ? "fixtures/nginx/multi-vhost.conf:7"
            : "website/fixtures/unresolved/routes.conf:1",
    );
    await expect(surface.locator("#relationships")).toContainText("configured");
    if (id === "unresolved") {
        await expect(surface.locator("#node-fields")).toContainText(
            "unresolved",
        );
        await expect(surface.locator("#warnings")).toContainText(
            "routing.unresolved",
        );
        await expect(surface.locator("#relationships")).not.toContainText(
            "Proxies to",
        );
        await surface.locator("#unresolved-only").check();
        await expect(surface.locator("#visible-count")).toContainText(
            "1 match",
        );
    }
    await surface.locator("#search").press("Escape");
    await expect(surface.locator("#selection")).toBeHidden();
    // Escape also clears Chromium's native input[type=search]. Restore the
    // query before testing keyboard selection on the matching graph node.
    await surface
        .locator("#search")
        .fill(id === "multi-vhost" ? "127.0.0.1:8100" : "/dynamic/");
    const node = surface.locator('.node.search-match[tabindex="0"]').first();
    await node.focus();
    await node.press("Enter");
    await expect(surface.locator("#selection")).toBeVisible();
    await node.press("Escape");
    await expect(surface.locator("#selection")).toBeHidden();
    await surface.locator("#clear-filters").click();
    const theme = await surface.locator("html").getAttribute("data-theme");
    await surface.locator("#theme").click();
    await expect(surface.locator("html")).toHaveAttribute(
        "data-theme",
        theme === "dark" ? "light" : "dark",
    );
    const before = await surface
        .locator("#topology-graph")
        .getAttribute("viewBox");
    await surface.locator("#zoom-in").click();
    await expect(surface.locator("#topology-graph")).not.toHaveAttribute(
        "viewBox",
        before!,
    );
    await surface.locator("#fit").click();
    await surface.locator("#readable").click();
}

for (const locale of ["en", "ar"])
    for (const theme of ["dark", "light"] as const)
        for (const width of [1440, 768, 390, 320]) {
            test(`W2 wrapper ${locale} ${theme} ${width}: reflow, evidence and accessibility`, async ({
                page,
            }, info) => {
                await page.setViewportSize({ width, height: 900 });
                await page.emulateMedia({
                    colorScheme: theme,
                    reducedMotion: "reduce",
                });
                const errors: string[] = [];
                const remote: string[] = [];
                page.on("pageerror", (e) => errors.push(e.message));
                page.on("request", (r) => {
                    if (!r.url().startsWith("http://127.0.0.1:4321/"))
                        remote.push(r.url());
                });
                expect((await page.goto(demo(locale)))?.status()).toBe(200);
                await page.evaluate(() => document.fonts.ready);
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
                await expect(page.locator("#multi-vhost tbody tr")).toHaveCount(
                    37,
                );
                await expect(page.locator("#unresolved tbody tr")).toHaveCount(
                    3,
                );
                await expect(
                    page.locator("#unresolved .demo-nodes li"),
                ).toHaveCount(4);
                await expect(page.locator("iframe")).toHaveCount(2);
                await expect(page.locator("iframe").first()).toHaveAttribute(
                    "sandbox",
                    "allow-scripts",
                );
                const axe = await new AxeBuilder({ page })
                    .exclude("iframe")
                    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
                    .analyze();
                expect(
                    axe.violations.map((v) => ({
                        id: v.id,
                        nodes: v.nodes.map((n) => n.target),
                    })),
                ).toEqual([]);
                expect(errors).toEqual([]);
                expect(remote).toEqual([]);
                await page.screenshot({
                    path: info.outputPath(
                        `wrapper-${locale}-${theme}-${width}.png`,
                    ),
                    fullPage: true,
                });
                await info.attach(
                    "W2 wrapper capture (review evidence, not a baseline)",
                    {
                        path: info.outputPath(
                            `wrapper-${locale}-${theme}-${width}.png`,
                        ),
                        contentType: "image/png",
                    },
                );
            });
        }

test("W2 homepage never requests a report and links to the localized demo", async ({
    page,
}) => {
    const reports: string[] = [];
    page.on("request", (r) => {
        if (r.url().includes("/demos/")) reports.push(r.url());
    });
    for (const locale of ["en", "ar"]) {
        await page.goto(base + (locale === "ar" ? "ar/" : ""));
        await page.locator("footer").scrollIntoViewIfNeeded();
        await expect(page.locator("iframe")).toHaveCount(0);
        await expect(
            page.locator(`.nav a[href="${demo(locale)}"]`),
        ).toHaveCount(1);
    }
    expect(reports).toEqual([]);
});

for (const id of ["multi-vhost", "unresolved"]) {
    test(`W2 embedded ${id}: genuine tasks, keyboard, isolation and independent theme`, async ({
        page,
    }) => {
        const requests: string[] = [];
        page.on("request", (r) => requests.push(r.url()));
        await page.goto(demo("ar"));
        const iframe = page.locator(`#${id} iframe`);
        await iframe.scrollIntoViewIfNeeded();
        const frame = await (await iframe.elementHandle())!.contentFrame();
        expect(frame).toBeTruthy();
        await tasks(frame!, id);
        expect(
            await frame!.evaluate(
                () => performance.getEntriesByType("resource").length,
            ),
        ).toBe(0);
        const reportTheme = await frame!
            .locator("html")
            .getAttribute("data-theme");
        await page
            .locator("[data-theme-control]")
            .selectOption(reportTheme === "dark" ? "light" : "dark");
        await expect(frame!.locator("html")).toHaveAttribute(
            "data-theme",
            reportTheme!,
        );
        await expect(frame!.locator("html")).toHaveAttribute("lang", "en");
        const isolation = await frame!.evaluate(() => {
            let parentDenied = false;
            let storageDenied = false;
            try {
                void parent.document.body;
            } catch (e) {
                parentDenied = (e as Error).name === "SecurityError";
            }
            try {
                localStorage.setItem("nasj-test", "probe");
            } catch (e) {
                storageDenied = (e as Error).name === "SecurityError";
            }
            return {
                parentDenied,
                storageDenied,
                referrer: document.referrer,
                popupDenied: window.open("about:blank") === null,
            };
        });
        expect(isolation).toEqual({
            parentDenied: true,
            storageDenied: true,
            referrer: "",
            popupDenied: true,
        });
        // Move focus out through the browser's Tab sequence, with no keyboard trap.
        await frame!.locator("#theme").focus();
        for (
            let i = 0;
            i < 200 &&
            (await page.evaluate(
                () => document.activeElement?.tagName === "IFRAME",
            ));
            i++
        )
            await page.keyboard.press("Tab");
        expect(
            await page.evaluate(() => document.activeElement?.tagName),
        ).not.toBe("IFRAME");
        expect(
            requests.every((url) => url.startsWith("http://127.0.0.1:4321/")),
        ).toBe(true);
    });

    test(`W2 direct ${id}: opener isolation and released report functionality`, async ({
        page,
    }) => {
        await page.goto(demo("en"));
        const popupPromise = page.waitForEvent("popup");
        await page.locator(`#${id} [data-open-report]`).click();
        const popup = await popupPromise;
        await popup.waitForLoadState();
        expect(await popup.evaluate(() => window.opener === null)).toBe(true);
        expect(new URL(popup.url()).pathname).toBe(report(id));
        await tasks(popup, id);
        expect(
            await popup.evaluate(
                () => performance.getEntriesByType("resource").length,
            ),
        ).toBe(0);
        await popup.close();
    });

    test(`W2 downloaded ${id}: exact bytes and offline file functionality`, async ({
        page,
        browser,
    }, info) => {
        await page.goto(demo("en"));
        const downloadPromise = page.waitForEvent("download");
        await page.locator(`#${id} [data-download-report]`).click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toBe(`${id}.html`);
        const directory = info.outputPath("isolated-offline");
        await mkdir(directory);
        const path = join(directory, `${id}.html`);
        await download.saveAs(path);
        const expected = metadata.scenarios
            .find((s) => s.id === id)!
            .outputs.find((o) => o.path.endsWith(".html"))!;
        expect(digest(await readFile(path))).toBe(expected.sha256);
        const offline = await browser.newContext({ offline: true });
        try {
            const file = await offline.newPage();
            const requests: string[] = [];
            file.on("request", (r) => requests.push(r.url()));
            await file.goto(pathToFileURL(path).href);
            await tasks(file, id);
            expect(requests).toEqual([pathToFileURL(path).href]);
            await assertCsp(file);
        } finally {
            await offline.close();
        }
        const noJS = await browser.newContext({
            offline: true,
            javaScriptEnabled: false,
        });
        try {
            const file = await noJS.newPage();
            await file.goto(pathToFileURL(path).href);
            await expect(file.locator("#topology-graph")).toBeVisible();
            await expect(file.locator(".node")).toHaveCount(
                id === "multi-vhost" ? 40 : 4,
            );
            await expect(file.locator("noscript")).toBeVisible();
        } finally {
            await noJS.close();
        }
    });
}

test("W2 CSP: wrapper, embedded and direct policies block unauthorized scripts and connections", async ({
    page,
}) => {
    await page.goto(demo("en"));
    await page.locator("iframe").first().scrollIntoViewIfNeeded();
    const embedded = await (await page
        .locator("iframe")
        .first()
        .elementHandle())!.contentFrame();
    for (const surface of [page, embedded!]) await assertCsp(surface);
    await page.goto(report("multi-vhost"));
    const policy = await page
        .locator('meta[http-equiv="Content-Security-Policy"]')
        .getAttribute("content");
    expect(policy).toBe(metadata.viewer.csp);
    await assertCsp(page);
});

for (const locale of ["en", "ar"])
    test(`W2 no JavaScript ${locale}: summary, sources, downloads and static embed`, async ({
        browser,
    }) => {
        const context = await browser.newContext({
            javaScriptEnabled: false,
            viewport: { width: 320, height: 900 },
        });
        try {
            const page = await context.newPage();
            await page.goto("http://127.0.0.1:4321" + demo(locale));
            expect(
                await page.evaluate(
                    () => document.documentElement.scrollWidth <= innerWidth,
                ),
            ).toBe(true);
            await expect(page.locator(".demo-evidence").first()).toBeVisible();
            await page.locator(".demo-source summary").first().click();
            await expect(page.locator(".demo-source ol").first()).toBeVisible();
            await expect(page.locator("[data-download-report]")).toHaveCount(2);
            await page.locator("iframe").first().scrollIntoViewIfNeeded();
            await expect(
                page.frameLocator("iframe").first().locator("#topology-graph"),
            ).toBeVisible();
        } finally {
            await context.close();
        }
    });

test("W2 locale switch preserves scenario and theme without translating the viewer", async ({
    page,
}) => {
    await page.goto(demo("en") + "#unresolved");
    await page.locator("[data-theme-control]").selectOption("light");
    await page.locator("[data-language]").click();
    expect(new URL(page.url()).pathname).toBe(demo("ar"));
    expect(new URL(page.url()).hash).toBe("#unresolved");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator("iframe").last()).toHaveAttribute(
        "src",
        report("unresolved"),
    );
});

test("W2 remediation: export targets, localized frame names and isolated Arabic hashes", async ({
    page,
}) => {
    for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(demo("ar"));
        for (const frame of await page.locator("iframe").all()) {
            await expect(frame).toHaveAttribute("lang", "ar");
            await expect(frame).toHaveAttribute("title", /تقرير نسج/);
        }
        for (const link of await page
            .locator(".demo-actions a[download]")
            .all()) {
            const box = await link.boundingBox();
            expect(box!.width).toBeGreaterThanOrEqual(44);
            expect(box!.height).toBeGreaterThanOrEqual(44);
        }
        for (const scenario of metadata.scenarios) {
            const section = page.locator(`#${scenario.id} .demo-provenance`);
            await section.locator("summary").click();
            const hashes = section.locator("dd bdi");
            await expect(hashes).toHaveText([
                metadata.generator.commit,
                metadata.generator.executable_sha256,
                ...scenario.outputs.map((o) => o.sha256),
            ]);
            for (const hash of await hashes.all())
                expect(
                    await hash.evaluate((e) => ({
                        direction: getComputedStyle(e).direction,
                        bidi: getComputedStyle(e).unicodeBidi,
                    })),
                ).toEqual({ direction: "ltr", bidi: "isolate" });
        }
        expect(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
            ),
        ).toBe(true);
    }
});
