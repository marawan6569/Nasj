import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { load } from "cheerio";
import { resolve, extname } from "node:path";
import { verifyArtifacts } from "./artifact-policy.mjs";
import { verifyReports } from "./demo-contract.mjs";
const base = (process.env.WEBSITE_BASE || "/Nasj/").replace(/\/?$/, "/");
const origin = "https://marawan6569.github.io";
const root = resolve("dist");
const manifest = JSON.parse(await readFile("assets.json", "utf8"));
const demos = JSON.parse(await readFile("src/data/demos.json", "utf8"));
const files = await verifyArtifacts({ root, manifest, demos });
const pages = files.filter(
    (f) => f.endsWith(".html") && !f.startsWith(root + "/demos/"),
);
assert.equal(pages.length, 5, "Only localized home/demo routes and a 404");
for (const scenario of demos.scenarios) {
    const reports = {};
    for (const output of scenario.outputs) {
        const bytes = await readFile(resolve(root, output.path));
        assert.deepEqual(
            bytes,
            await readFile(resolve("public", output.path)),
            "Report must be copied byte-for-byte",
        );
        reports[extname(output.path).slice(1)] = bytes.toString("utf8");
    }
    verifyReports(reports, scenario, demos.viewer);
}
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
for (const entry of manifest.files) {
    assert.equal(
        hash(await readFile(entry.path)),
        entry.sha256,
        `provenance: ${entry.path}`,
    );
    if (entry.repositorySource)
        assert.equal(
            hash(await readFile("../" + entry.repositorySource)),
            entry.sha256,
            `official branding: ${entry.path}`,
        );
}
assert.equal(
    hash(await readFile("../" + manifest.report.fixture)),
    manifest.report.fixture_sha256,
    "fixture must remain the pinned synthetic source",
);
for (const file of pages) {
    const demoPage = file.endsWith("/demo/index.html");
    const html = await readFile(file, "utf8");
    const $ = load(html);
    const policy = $('meta[http-equiv="content-security-policy"]').attr(
        "content",
    );
    assert.ok(policy, `missing production CSP: ${file}`);
    const directives = new Map();
    for (const part of policy.split(";").filter((x) => x.trim())) {
        const [name, ...values] = part.trim().split(/\s+/);
        assert.ok(!directives.has(name), `duplicate CSP directive ${name}`);
        directives.set(name, values);
    }
    assert.ok(
        !/unsafe-inline|unsafe-eval|https?:|\*/.test(policy),
        "CSP must have no broad/remote sources",
    );
    for (const name of [
        "default-src",
        "connect-src",
        "object-src",
        "base-uri",
        "form-action",
        "worker-src",
        "script-src-attr",
        "style-src-attr",
    ]) {
        assert.deepEqual(directives.get(name), ["'none'"], name);
    }
    assert.deepEqual(directives.get("frame-src"), [
        demoPage ? "'self'" : "'none'",
    ]);
    for (const name of ["img-src", "font-src"])
        assert.deepEqual(directives.get(name), ["'self'"], name);
    assert.equal($("object, embed, base, [style]").length, 0);
    assert.equal($("iframe").length, demoPage ? 2 : 0);
    $("iframe").each((i, e) => {
        assert.equal(
            e.attribs.src,
            base + `demos/v0.1.0/${demos.scenarios[i].id}.html`,
        );
        assert.equal(e.attribs.sandbox, "allow-scripts");
        assert.equal(e.attribs.referrerpolicy, "no-referrer");
        assert.equal(e.attribs.loading, "lazy");
        assert.ok(e.attribs.title);
    });
    $("*").each((_, element) => {
        for (const attr of Object.keys(element.attribs || {}))
            assert.ok(!/^on/i.test(attr), "inline event attribute");
    });
    for (const tag of ["script", "style"]) {
        const values =
            directives.get(`${tag}-src-elem`) ??
            directives.get(`${tag}-src`) ??
            directives.get("default-src");
        $(tag).each((_, element) => {
            assert.ok(
                html.indexOf('http-equiv="content-security-policy"') <
                    html.indexOf(`<${tag}`),
                "CSP must precede protected content",
            );
            if (element.attribs.src) assert.ok(values.includes("'self'"));
            else {
                const digest = createHash("sha256")
                    .update($(element).html())
                    .digest("base64");
                assert.ok(
                    values.includes(`'sha256-${digest}'`),
                    `${tag} hash missing in effective directive`,
                );
            }
        });
    }
    const current =
        origin +
        base +
        (file.endsWith("/ar/demo/index.html")
            ? "ar/demo/"
            : demoPage
              ? "demo/"
              : file.endsWith("/ar/index.html")
                ? "ar/"
                : file.endsWith("/404.html")
                  ? "404.html"
                  : "");
    const urls = [];
    $("[src], [href], [srcset]").each((_, e) => {
        for (const attr of ["src", "href", "srcset"]) {
            const value = e.attribs[attr];
            if (value)
                urls.push(
                    ...(attr === "srcset"
                        ? value.split(",").map((x) => x.trim().split(/\s+/)[0])
                        : [value]),
                );
        }
    });
    for (const value of urls) {
        const url = new URL(value, current);
        if (url.origin !== origin) continue;
        assert.ok(url.pathname.startsWith(base), `escaped base: ${value}`);
        const path = resolve(
            root,
            url.pathname.slice(base.length) +
                (url.pathname.endsWith("/") ? "index.html" : ""),
        );
        assert.ok((await stat(path)).isFile(), `missing asset/link: ${value}`);
        if (url.hash)
            assert.ok(
                load(await readFile(path, "utf8"))(
                    `[id="${url.hash.slice(1)}"]`,
                ).length,
                `missing fragment: ${value}`,
            );
    }
    if (!file.endsWith("/404.html")) {
        assert.equal($("link[rel=canonical]").attr("href"), current);
        assert.equal($("link[hreflang]").length, 3);
    } else assert.equal($("meta[name=robots]").attr("content"), "noindex");
    assert.equal($("h1").length, 1);
    console.log(
        `${file.slice(root.length + 1)}: CSP, links, metadata, local assets verified`,
    );
}
for (const file of files.filter((f) => f.endsWith(".css"))) {
    const css = await readFile(file, "utf8");
    for (const [, value] of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
        const url = new URL(value, origin + base + "_astro/style.css");
        assert.equal(url.origin, origin);
        assert.ok(url.pathname.startsWith(base));
        assert.ok(
            (
                await stat(resolve(root, url.pathname.slice(base.length)))
            ).isFile(),
        );
    }
}
const bytes = async (extension) =>
    (
        await Promise.all(
            files
                .filter((f) => extname(f) === extension)
                .map(async (f) => gzipSync(await readFile(f)).length),
        )
    ).reduce((a, b) => a + b, 0);
const css = await bytes(".css");
const js = await bytes(".js");
const inline = load(await readFile(root + "/index.html", "utf8"))("script")
    .toArray()
    .reduce(
        (total, e) =>
            total +
            gzipSync(e.children.map((c) => c.data || "").join("")).length,
        0,
    );
assert.ok(css <= 35 * 1024, `CSS budget: ${css}`);
assert.ok(js + inline <= 20 * 1024, `JS budget: ${js + inline}`);
console.log(
    `Budgets: CSS ${css} bytes gzip; JS ${js + inline} bytes gzip. ${manifest.files.length} provenance hashes verified.`,
);
