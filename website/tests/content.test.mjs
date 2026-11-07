import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile, mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { load } from "cheerio";
import { installCommands, release } from "../src/lib/install.mjs";
import { validateRelease } from "../scripts/release-contract.mjs";
const en = JSON.parse(await readFile("src/content/en/pages.json", "utf8"));
const ar = JSON.parse(await readFile("src/content/ar/pages.json", "utf8"));
const base = process.env.WEBSITE_BASE || "/Nasj/";
test("reviewed pins and precise checksum-manifest associations", async () => {
    await validateRelease();
    for (const mutate of [
        (r) => (r.commit = "0".repeat(40)),
        (r) => (r.assets[0].sha256 = "0".repeat(64)),
        (r) => (r.assets[0].manifest = "SHA256SUMS"),
        (r) => r.assets.push(r.assets[0]),
    ]) {
        const changed = structuredClone(release);
        mutate(changed);
        await assert.rejects(validateRelease(changed));
    }
    assert.throws(() => installCommands("$(bad)"));
});
test("complete localized route, section, technical-command and metadata parity", async () => {
    assert.deepEqual(Object.keys(en), Object.keys(ar));
    const sitemap = await readFile("dist/sitemap.xml", "utf8");
    assert.equal((sitemap.match(/<loc>/g) || []).length, 14);
    for (const slug of Object.keys(en)) {
        assert.deepEqual(
            en[slug].sections.map((s) => s.id),
            ar[slug].sections.map((s) => s.id),
        );
        assert.deepEqual(
            en[slug].sections.map((s) => s.code),
            ar[slug].sections.map((s) => s.code),
        );
        assert.notEqual(en[slug].title, ar[slug].title);
        for (const locale of ["en", "ar"]) {
            const prefix = locale === "ar" ? "ar/" : "";
            const $ = load(
                await readFile(`dist/${prefix}${slug}/index.html`, "utf8"),
            );
            assert.equal($("html").attr("lang"), locale);
            assert.equal(
                $("link[rel=canonical]").attr("href"),
                `https://marawan6569.github.io${base}${prefix}${slug}/`,
            );
            assert.equal(
                $("[data-language]").attr("href"),
                base + (locale === "ar" ? "" : "ar/") + slug + "/",
            );
            assert.ok($("meta[name=description]").attr("content").length > 30);
            for (const s of en[slug].sections)
                assert.equal($(`#${s.id}`).length, 1);
            if (slug === "install")
                for (const a of release.assets.filter(
                    (a) => a.manifest && !a.name.startsWith("build-"),
                )) {
                    const card = $(`[data-distribution="${a.name}"]`);
                    assert.equal(
                        card.find("pre code").text(),
                        installCommands(a.name),
                    );
                    assert.equal(
                        card.find("a").first().attr("href"),
                        release.url + a.name,
                    );
                    assert.equal(
                        card.find("a").last().attr("href"),
                        release.url + a.manifest,
                    );
                }
        }
    }
});
for (const asset of release.assets.filter(
    (a) => a.manifest && !a.name.startsWith("build-"),
)) {
    for (const failure of ["curl", "manifest", "asset"])
        test(`${asset.name}: ${failure} failure stops before extraction/install`, async (t) => {
            const root = await mkdtemp(join(tmpdir(), "nasj-command-test-"));
            t.after(() => rm(root, { recursive: true, force: true }));
            const bin = join(root, "bin");
            await mkdir(bin);
            const marker = join(root, "unsafe-step");
            const count = join(root, "check-count");
            const scripts = {
                curl: `#!/bin/sh\nexit ${failure === "curl" ? 22 : 0}\n`,
                sha256sum: `#!/bin/sh\ncat >/dev/null\nn=0\n[ ! -f '${count}' ] || n=$(cat '${count}')\nn=$((n+1))\nprintf '%s' "$n" > '${count}'\n[ "$n" -ne ${failure === "manifest" ? 1 : 2} ]\n`,
                tar: `#!/bin/sh\ntouch '${marker}'\n`,
                sudo: `#!/bin/sh\ntouch '${marker}'\n`,
                install: `#!/bin/sh\ntouch '${marker}'\n`,
            };
            for (const [name, text] of Object.entries(scripts))
                await writeFile(join(bin, name), text, { mode: 0o755 });
            const result = spawnSync(
                "sh",
                ["-c", installCommands(asset.name)],
                {
                    env: {
                        ...process.env,
                        PATH: `${bin}:${process.env.PATH}`,
                        TMPDIR: root,
                    },
                    encoding: "utf8",
                },
            );
            assert.notEqual(result.status, 0);
            await assert.rejects(readFile(marker), { code: "ENOENT" });
        });
}
