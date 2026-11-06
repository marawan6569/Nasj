import assert from "node:assert/strict";
import { lstat, readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, dirname, extname, join, resolve } from "node:path";

// W1/W2 publication contract. New resources require an explicit policy change.
// Public media/notices/manifests are allowed only when pinned in assets.json.
const generatedDocuments = new Set([
    "index.html",
    "ar/index.html",
    "demo/index.html",
    "ar/demo/index.html",
    "404.html",
    "sitemap.xml",
]);
const publicResource =
    /^(?:(?:brand|reports)\/[A-Za-z0-9_-]+\.png|licenses\/[A-Za-z0-9_.-]+\.txt|manifest\.(?:json|webmanifest))$/;
const generatedCode =
    /^_astro\/[A-Za-z0-9_-][A-Za-z0-9_.-]*\.[A-Za-z0-9_-]{8,}\.(?:css|js)$/;
const generatedFont = /^_astro\/([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]{8,}\.woff2$/;
const textExtensions = new Set([
    ".html",
    ".xml",
    ".css",
    ".js",
    ".txt",
    ".json",
    ".webmanifest",
    ".svg",
    ".dot",
]);
const prohibitedExtensions =
    /\.(?:map|exe|dll|so|dylib|wasm|sh|bat|cmd|ps1|pem|key|env|bak|zip|tar|gz)(?:\.|$)/i;

// Deliberately narrow signatures, not a general secret detector. Do not print
// matched values: diagnostics identify only the artifact and rule.
const textRules = [
    [
        "private development path",
        /(?:^|[\s"'(<>=:])\/(?:home|Users|tmp|root|private\/(?:tmp|var)|var\/(?:tmp|folders))\/[\w.-]+/m,
    ],
    [
        "private Windows path",
        /\b[A-Za-z]:[\\/]+(?:Users|Documents and Settings|Temp)[\\/]+/i,
    ],
    ["source-map reference", /[#@]\s*sourceMappingURL\s*=/],
    ["private-key marker", /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/],
    ["AWS access-key identifier", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
    [
        "GitHub credential",
        /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b/,
    ],
    ["URL credentials", /https?:\/\/[^\s/:@]+:[^\s/@]+@/i],
];
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

function inspectText(bytes, path) {
    let text;
    try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
        throw new Error(`Non-UTF-8 text artifact: ${path}`);
    }
    assert.ok(!text.includes("\0"), `Binary content in text artifact: ${path}`);
    // Include JSON-escaped slashes and backslashes without decoding arbitrary code.
    const normalized = text.replace(/\\\//g, "/").replace(/\\\\/g, "\\");
    for (const [rule, pattern] of textRules) {
        assert.ok(!pattern.test(normalized), `Prohibited ${rule}: ${path}`);
    }
}

export async function verifyArtifacts({ root, manifest, demos }) {
    root = resolve(root);
    const approved = new Map();
    const fonts = new Map();
    for (const scenario of demos.scenarios) {
        assert.ok(
            ["multi-vhost", "unresolved"].includes(scenario.id),
            "Unknown demo scenario",
        );
        assert.equal(scenario.outputs.length, 4, "Missing demo formats");
        for (const entry of scenario.outputs) {
            assert.ok(
                ["json", "dot", "svg", "html"].some(
                    (format) =>
                        entry.path === `demos/v0.1.0/${scenario.id}.${format}`,
                ),
                "Unapproved demo artifact",
            );
            assert.match(entry.sha256, /^[a-f0-9]{64}$/, "Invalid demo digest");
            assert.ok(!approved.has(entry.path), "Duplicate demo artifact");
            approved.set(entry.path, entry.sha256);
        }
    }
    assert.equal(approved.size, 8, "Expected both approved demos");
    for (const entry of manifest.files) {
        assert.match(entry.sha256, /^[a-f0-9]{64}$/, "Invalid asset digest");
        if (entry.path.startsWith("public/")) {
            const output = entry.path.slice("public/".length);
            assert.match(
                output,
                publicResource,
                `Unapproved public resource: ${entry.path}`,
            );
            assert.ok(!approved.has(output), `Duplicate asset: ${entry.path}`);
            approved.set(output, entry.sha256);
        } else {
            assert.match(
                entry.path,
                /^src\/assets\/[A-Za-z0-9_-]+\.woff2$/,
                `Unapproved source asset: ${entry.path}`,
            );
            const stem = basename(entry.path, ".woff2");
            assert.ok(!fonts.has(stem), `Duplicate font: ${entry.path}`);
            fonts.set(stem, entry.sha256);
        }
    }
    // Astro copies the existing empty public/fonts directory; font files themselves
    // must still be fingerprinted, pinned WOFF2 assets under _astro.
    const directories = new Set(["", "_astro", "fonts"]);
    for (const path of [...generatedDocuments, ...approved.keys()]) {
        let parent = dirname(path);
        while (parent !== ".") {
            directories.add(parent);
            parent = dirname(parent);
        }
    }
    const files = [];
    const seen = new Set();
    const seenFonts = new Set();
    async function visit(relative) {
        const absolute = join(root, relative);
        const info = await lstat(absolute);
        assert.ok(
            !info.isSymbolicLink(),
            `Symlink prohibited: ${relative || "dist"}`,
        );
        if (info.isDirectory()) {
            assert.ok(
                directories.has(relative),
                `Unexpected directory: ${relative}`,
            );
            for (const name of (await readdir(absolute)).sort()) {
                await visit(relative ? `${relative}/${name}` : name);
            }
            return;
        }
        assert.ok(info.isFile(), `Non-regular artifact: ${relative}`);
        assert.ok(
            !(info.mode & 0o111),
            `Executable permissions prohibited: ${relative}`,
        );
        assert.ok(
            !prohibitedExtensions.test(relative),
            `Prohibited artifact type: ${relative}`,
        );
        const font = generatedFont.exec(relative);
        const expectedHash =
            approved.get(relative) ?? (font && fonts.get(font[1]));
        assert.ok(
            generatedDocuments.has(relative) ||
                generatedCode.test(relative) ||
                expectedHash,
            `Unexpected artifact: ${relative}`,
        );
        const bytes = await readFile(absolute);
        // Detect executable headers even when a file has a permitted suffix.
        const magic = bytes.subarray(0, 4).toString("hex");
        assert.ok(
            ![
                "7f454c46",
                "feedface",
                "feedfacf",
                "cefaedfe",
                "cffaedfe",
                "cafebabe",
                "0061736d",
            ].includes(magic) &&
                bytes.subarray(0, 2).toString() !== "MZ" &&
                bytes.subarray(0, 2).toString() !== "#!",
            `Executable content prohibited: ${relative}`,
        );
        if (textExtensions.has(extname(relative))) inspectText(bytes, relative);
        if (expectedHash)
            assert.equal(
                sha256(bytes),
                expectedHash,
                `Emitted asset digest mismatch: ${relative}`,
            );
        if (font) {
            assert.ok(
                !seenFonts.has(font[1]),
                `Duplicate emitted font: ${font[1]}`,
            );
            seenFonts.add(font[1]);
        }
        seen.add(relative);
        files.push(absolute);
    }
    await visit("");
    for (const path of [...generatedDocuments, ...approved.keys()]) {
        assert.ok(seen.has(path), `Missing required artifact: ${path}`);
    }
    for (const stem of fonts.keys())
        assert.ok(seenFonts.has(stem), `Missing emitted font: ${stem}`);
    for (const path of generatedDocuments) {
        if (!path.endsWith(".html")) continue;
        const document = await readFile(join(root, path), "utf8");
        for (const [, resource] of document.matchAll(
            /(?:href|src)="[^"]*?(_astro\/[^"/]+\.(?:css|js))"/g,
        )) {
            assert.ok(
                seen.has(resource),
                `Missing required artifact: ${resource}`,
            );
        }
    }
    assert.ok(
        files.some((path) => path.endsWith(".css")),
        "Missing generated stylesheet",
    );
    return files;
}
