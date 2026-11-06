import assert from "node:assert/strict";
import { test } from "node:test";
import {
    chmod,
    cp,
    mkdtemp,
    mkdir,
    readFile,
    readdir,
    rm,
    symlink,
    writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { verifyArtifacts } from "../scripts/artifact-policy.mjs";

// Test actual built assets in disposable copies. Never modify dist or baselines.
const built = resolve("dist");
const originalManifest = JSON.parse(await readFile("assets.json", "utf8"));
const demos = JSON.parse(await readFile("src/data/demos.json", "utf8"));
const generated = await readdir(join(built, "_astro"));
const css = "_astro/" + generated.find((path) => path.endsWith(".css"));
const font = "_astro/" + generated.find((path) => path.endsWith(".woff2"));
const digest = (data) => createHash("sha256").update(data).digest("hex");

async function fixture(t) {
    const temporary = await mkdtemp(join(tmpdir(), "nasj-artifacts-"));
    t.after(() => rm(temporary, { recursive: true, force: true }));
    const root = join(temporary, "dist");
    await cp(built, root, { recursive: true });
    return {
        root,
        manifest: structuredClone(originalManifest),
        demos,
        temporary,
    };
}

test("accepts the complete real production inventory", async () => {
    assert.ok(
        (
            await verifyArtifacts({
                root: built,
                manifest: originalManifest,
                demos,
            })
        ).length > 20,
    );
});

test("accepts hashed Astro JavaScript and an explicitly approved web manifest", async (t) => {
    const f = await fixture(t);
    await writeFile(
        join(f.root, "_astro/extra.Abcdef12.js"),
        "export const ready = true;\n",
    );
    const content = '{"name":"NASJ","start_url":"/Nasj/"}\n';
    await writeFile(join(f.root, "manifest.webmanifest"), content);
    f.manifest.files.push({
        path: "public/manifest.webmanifest",
        sha256: digest(content),
    });
    await verifyArtifacts(f);
});

for (const extension of [
    "dll",
    "so",
    "dylib",
    "wasm",
    "bat",
    "cmd",
    "ps1",
    "pem",
    "key",
    "zip",
    "tar",
    "gz",
]) {
    test(`rejects prohibited .${extension} files`, async (t) => {
        const f = await fixture(t);
        await writeFile(join(f.root, `probe.${extension}`), "review-only");
        await assert.rejects(verifyArtifacts(f), /Prohibited artifact type/);
    });
}

for (const [label, path, content, expected] of [
    [
        "external source map",
        "_astro/app.Abcdef12.js.map",
        "{}",
        /Prohibited artifact type/,
    ],
    [
        "executable extension",
        "payload.exe",
        "not a real executable",
        /Prohibited artifact type/,
    ],
    ["shell file", "payload.sh", "echo test", /Prohibited artifact type/],
    ["unexpected type", "notes.csv", "name,value", /Unexpected artifact/],
    [
        "unapproved image",
        "brand/unreviewed.png",
        "not an image",
        /Unexpected artifact/,
    ],
    ["unapproved manifest", "manifest.json", "{}", /Unexpected artifact/],
    [
        "hidden credential file",
        ".env",
        "REVIEW_ONLY=1",
        /Prohibited artifact type/,
    ],
    ["backup file", "index.html.bak", "backup", /Prohibited artifact type/],
    [
        "unexpected HTML route",
        "report.html",
        "<html></html>",
        /Unexpected artifact/,
    ],
    [
        "unhashed Astro file",
        "_astro/app.js",
        "export {};",
        /Unexpected artifact/,
    ],
    [
        "ELF with allowed suffix",
        "_astro/payload.Abcdef12.js",
        Buffer.from([0x7f, 0x45, 0x4c, 0x46]),
        /Executable content/,
    ],
    [
        "PE with allowed suffix",
        "_astro/payload.Abcdef12.js",
        "MZreview",
        /Executable content/,
    ],
    [
        "Mach-O with allowed suffix",
        "_astro/payload.Abcdef12.js",
        Buffer.from("cffaedfe", "hex"),
        /Executable content/,
    ],
    [
        "WASM with allowed suffix",
        "_astro/payload.Abcdef12.js",
        Buffer.from("0061736d", "hex"),
        /Executable content/,
    ],
    [
        "shebang with allowed suffix",
        "_astro/payload.Abcdef12.js",
        "#!/bin/sh\n",
        /Executable content/,
    ],
    [
        "invalid UTF-8",
        "_astro/payload.Abcdef12.js",
        Buffer.from([0xff]),
        /Non-UTF-8/,
    ],
    ["binary text", "_astro/payload.Abcdef12.js", "abc\0def", /Binary content/],
]) {
    test(`rejects ${label}`, async (t) => {
        const f = await fixture(t);
        await writeFile(join(f.root, path), content);
        await assert.rejects(verifyArtifacts(f), expected);
    });
}

for (const [label, path, content, expected] of [
    [
        "Linux checkout path in HTML",
        "index.html",
        "<p>/home/reviewer/project</p>",
        /private development path/,
    ],
    [
        "macOS checkout path in XML",
        "sitemap.xml",
        "<loc>/Users/reviewer/project</loc>",
        /private development path/,
    ],
    [
        "temporary path in CSS",
        css,
        "/* /tmp/review-project */",
        /private development path/,
    ],
    [
        "escaped Windows path in JavaScript",
        "_astro/probe.Abcdef12.js",
        String.raw`const path = "C:\\Users\\reviewer\\project";`,
        /private Windows path/,
    ],
    [
        "inline source map in CSS",
        css,
        "/*# sourceMappingURL=data:application/json;base64,e30= */",
        /source-map reference/,
    ],
    [
        "source-map link in JavaScript",
        "_astro/probe.Abcdef12.js",
        "//# sourceMappingURL=app.js.map",
        /source-map reference/,
    ],
    [
        "private-key marker in a notice",
        "licenses/NASJ-LICENSE.txt",
        "-----BEGIN PRIVATE KEY-----\nREVIEW_ONLY_NOT_A_KEY",
        /private-key marker/,
    ],
    [
        "AWS identifier in HTML",
        "index.html",
        "AKIA" + "A".repeat(16),
        /AWS access-key identifier/,
    ],
    [
        "GitHub token in CSS",
        css,
        "/* ghp_" + "a".repeat(36) + " */",
        /GitHub credential/,
    ],
    [
        "GitHub fine-grained token in HTML",
        "index.html",
        "github_pat_" + "a".repeat(82),
        /GitHub credential/,
    ],
    [
        "URL credentials in XML",
        "sitemap.xml",
        "<loc>https://example:review-only@example.test/</loc>",
        /URL credentials/,
    ],
]) {
    test(`rejects ${label}`, async (t) => {
        const f = await fixture(t);
        await writeFile(join(f.root, path), content);
        await assert.rejects(verifyArtifacts(f), expected);
    });
}

test("scans approved JSON manifests, including escaped private paths", async (t) => {
    const f = await fixture(t);
    const content = String.raw`{"path":"\/home\/reviewer\/project"}`;
    f.manifest.files.push({
        path: "public/manifest.json",
        sha256: digest(content),
    });
    await writeFile(join(f.root, "manifest.json"), content);
    await assert.rejects(verifyArtifacts(f), /private development path/);
});

test("allows ordinary prose, public URLs, hashes and synthetic backend addresses", async (t) => {
    const f = await fixture(t);
    await writeFile(
        join(f.root, "index.html"),
        "<p>API key instructions. https://example.test/home/docs /Nasj/ar/ 127.0.0.1:8100</p>",
    );
    await verifyArtifacts(f);
});

for (const path of [
    "brand/logo_app_icon_64.png",
    "reports/report-dark-desktop.png",
    "licenses/NASJ-LICENSE.txt",
    font,
]) {
    test(`rejects modified emitted bytes: ${path}`, async (t) => {
        const f = await fixture(t);
        await writeFile(join(f.root, path), "modified after build");
        await assert.rejects(
            verifyArtifacts(f),
            /Emitted asset digest mismatch/,
        );
    });
}
for (const path of [
    "index.html",
    "sitemap.xml",
    "brand/logo_app_icon_64.png",
    font,
    css,
]) {
    test(`rejects missing required output: ${path}`, async (t) => {
        const f = await fixture(t);
        await rm(join(f.root, path));
        await assert.rejects(
            verifyArtifacts(f),
            /Missing (required artifact|emitted font|generated stylesheet)/,
        );
    });
}
for (const kind of ["file", "directory", "root", "dangling"]) {
    test(`rejects ${kind} symlinks without following them`, async (t) => {
        const f = await fixture(t);
        let link;
        let target;
        if (kind === "root") {
            link = join(f.temporary, "linked-dist");
            target = f.root;
            f.root = link;
        } else if (kind === "directory") {
            link = join(f.root, "linked-directory");
            target = f.root;
        } else {
            link = join(f.root, "brand/logo_app_icon_64.png");
            await rm(link);
            target =
                kind === "dangling"
                    ? join(f.temporary, "absent")
                    : join(built, "brand/logo_app_icon_64.png");
        }
        await symlink(target, link);
        await assert.rejects(verifyArtifacts(f), /Symlink prohibited/);
    });
}
test("rejects executable permissions on an otherwise valid artifact", async (t) => {
    const f = await fixture(t);
    await chmod(join(f.root, "index.html"), 0o755);
    await assert.rejects(verifyArtifacts(f), /Executable permissions/);
});
test("rejects unexpected directories, including hidden ones", async (t) => {
    const f = await fixture(t);
    await mkdir(join(f.root, ".git"));
    await assert.rejects(verifyArtifacts(f), /Unexpected directory/);
});
test(
    "rejects a FIFO without opening it",
    { skip: process.platform === "win32" },
    async (t) => {
        const f = await fixture(t);
        execFileSync("mkfifo", [join(f.root, "pipe")]);
        await assert.rejects(verifyArtifacts(f), /Non-regular artifact/);
    },
);
test("rejects duplicate emitted fonts", async (t) => {
    const f = await fixture(t);
    await cp(
        join(f.root, font),
        join(f.root, font.replace(/\.[^.]+\.woff2$/, ".Duplicate123.woff2")),
    );
    await assert.rejects(verifyArtifacts(f), /Duplicate emitted font/);
});
test("rejects unapproved emitted fonts", async (t) => {
    const f = await fixture(t);
    await writeFile(join(f.root, "_astro/unknown.Abcdef12.woff2"), "unknown");
    await assert.rejects(verifyArtifacts(f), /Unexpected artifact/);
});
