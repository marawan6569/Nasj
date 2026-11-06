import { prepareInputs } from "./demo-cache.mjs";
import assert from "node:assert/strict";
import {
    readFile,
    writeFile,
    mkdir,
    mkdtemp,
    rm,
    copyFile,
    chmod,
    rename,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join, dirname } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { sha256, normalizeReports } from "./demo-contract.mjs";

const manifestPath = resolve("src/data/demos.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const generator = manifest.generator;
assert.deepEqual(
    manifest.scenarios.map((s) => [
        s.id,
        s.strict,
        s.fixtures.map((f) => f.path),
    ]),
    [
        ["multi-vhost", true, ["fixtures/nginx/multi-vhost.conf"]],
        [
            "unresolved",
            false,
            [
                "website/fixtures/unresolved/nginx.conf",
                "website/fixtures/unresolved/routes.conf",
            ],
        ],
    ],
    "Only the approved fixture scenarios may be staged",
);
const cache = resolve(
    process.env.NASJ_DEMO_CACHE || join(tmpdir(), "nasj-website-v010"),
);
const archive = join(cache, generator.archive);
const binary = join(cache, "nasj");
const formats = ["json", "dot", "svg", "html"];
const mode = process.argv[2] || "--verify";
assert.ok(
    ["--fetch", "--ensure", "--write", "--verify"].includes(mode),
    "Unknown generator mode",
);
assert.equal(
    process.platform,
    "linux",
    "Pinned generator requires Linux x86_64",
);
assert.equal(process.arch, "x64", "Pinned generator requires Linux x86_64");

async function checkedFile(path, expected) {
    assert.equal(
        sha256(await readFile(path)),
        expected,
        `Pinned generator digest mismatch: ${path}`,
    );
}
await prepareInputs(cache, generator, {
    online: mode === "--fetch" || mode === "--ensure",
    force: mode === "--fetch",
});
await checkedFile(archive, generator.archive_sha256);
await checkedFile(
    join(cache, "SHA256SUMS-binaries"),
    generator.checksums_sha256,
);
const sums = await readFile(join(cache, "SHA256SUMS-binaries"), "utf8");
assert.ok(
    sums
        .split("\n")
        .some(
            (line) =>
                line.trim() ===
                `${generator.archive_sha256}  ${generator.archive}`,
        ),
    "Published checksum disagrees",
);
// Extract just the single reviewed member to stdout, never archive paths to disk.
const member = `nasj-v${generator.version}-linux-x86_64/nasj`;
const executable = execFileSync("tar", ["-xOzf", archive, member], {
    maxBuffer: 20 * 1024 * 1024,
});
assert.equal(
    sha256(executable),
    generator.executable_sha256,
    "Executable digest mismatch",
);
// Atomic replacement allows parallel verification processes to use the cache
// without truncating an executable that another process is currently running.
const extraction = await mkdtemp(join(cache, "extract-"));
try {
    await writeFile(join(extraction, "nasj"), executable);
    await chmod(join(extraction, "nasj"), 0o700);
    await rename(join(extraction, "nasj"), binary);
} finally {
    await rm(extraction, { recursive: true, force: true });
}
assert.equal(
    execFileSync(binary, ["--version"], { encoding: "utf8" }).trim(),
    "nasj 0.1.0",
);
if (mode === "--fetch" || mode === "--ensure") {
    console.log(
        "Published archive, published checksum manifest and executable independently pinned; generator cached.",
    );
} else {
    const results = [];
    for (let run = 0; run < 2; run++) {
        const temporary = await mkdtemp(
            join(tmpdir(), "nasj-demo-reproduction-"),
        );
        try {
            const stage = join(temporary, "input");
            const output = join(temporary, "output");
            await mkdir(output);
            for (const scenario of manifest.scenarios) {
                for (const fixture of scenario.fixtures) {
                    const source = resolve("..", fixture.path);
                    await checkedFile(source, fixture.sha256);
                    await mkdir(dirname(join(stage, fixture.path)), {
                        recursive: true,
                    });
                    await copyFile(source, join(stage, fixture.path));
                }
            }
            const generated = {};
            for (const scenario of manifest.scenarios) {
                const config = join(stage, scenario.fixtures[0].path);
                const common = [
                    "map",
                    "--config",
                    config,
                    "--prefix",
                    dirname(config),
                ];
                const raw = {};
                for (const format of formats) {
                    const path = join(output, `${scenario.id}.${format}`);
                    const result = spawnSync(
                        binary,
                        [
                            ...common,
                            ...(scenario.strict ? ["--strict"] : []),
                            "--format",
                            format,
                            "--output",
                            path,
                        ],
                        { encoding: "utf8" },
                    );
                    assert.equal(
                        result.status,
                        0,
                        `Generation failed: ${scenario.id}/${format}`,
                    );
                    const diagnostics = result.stderr.trim().split("\n");
                    assert.equal(
                        diagnostics.length,
                        scenario.diagnostics.length,
                    );
                    scenario.diagnostics.forEach((d, i) => {
                        const pattern =
                            scenario.id === "multi-vhost"
                                ? ` (include pattern: optional-${i === 0 ? "modules" : "sites"}-example-*.conf)`
                                : "";
                        assert.equal(
                            diagnostics[i],
                            `nasj: ${d.severity}: ${stage}/${d.path}:${d.line}: ${d.code}: ${d.message}${pattern}`,
                        );
                    });
                    raw[format] = await readFile(path, "utf8");
                    if (!scenario.strict) {
                        const rejected = join(
                            output,
                            `strict-negative.${format}`,
                        );
                        const failure = spawnSync(
                            binary,
                            [
                                ...common,
                                "--strict",
                                "--format",
                                format,
                                "--output",
                                rejected,
                            ],
                            { encoding: "utf8" },
                        );
                        assert.notEqual(failure.status, null);
                        assert.notEqual(
                            failure.status,
                            0,
                            "Unresolved strict fixture unexpectedly passed",
                        );
                        assert.match(failure.stderr, /routing\.unresolved/);
                        await assert.rejects(readFile(rejected), {
                            code: "ENOENT",
                        });
                    }
                }
                generated[scenario.id] = normalizeReports(
                    raw,
                    stage,
                    scenario,
                    manifest.viewer,
                );
                const graph = JSON.parse(generated[scenario.id].json);
                for (const item of [
                    ...graph.nodes,
                    ...graph.edges,
                    ...graph.warnings,
                ]) {
                    const source = await readFile(
                        join(stage, item.source.path),
                        "utf8",
                    );
                    assert.ok(
                        item.source.line <= source.trimEnd().split("\n").length,
                        "Evidence outside fixture lines",
                    );
                }
            }
            results.push(generated);
        } finally {
            await rm(temporary, { recursive: true, force: true });
        }
    }
    assert.deepEqual(
        results[0],
        results[1],
        "Generation differs between fresh absolute roots",
    );
    for (const scenario of manifest.scenarios) {
        const entries = [];
        for (const format of formats) {
            const path = `demos/v0.1.0/${scenario.id}.${format}`;
            const content = results[0][scenario.id][format];
            entries.push({
                path,
                sha256: sha256(content),
                bytes: Buffer.byteLength(content),
                gzip_bytes: gzipSync(content).length,
            });
            if (mode === "--write") {
                await mkdir(dirname(join("public", path)), { recursive: true });
                await writeFile(join("public", path), content);
            } else
                assert.equal(
                    await readFile(join("public", path), "utf8"),
                    content,
                    `Committed artifact differs: ${path}`,
                );
        }
        if (mode === "--write") scenario.outputs = entries;
        else
            assert.deepEqual(
                scenario.outputs,
                entries,
                "Recorded output identities differ",
            );
    }
    if (mode === "--write")
        await writeFile(manifestPath, JSON.stringify(manifest, null, 4) + "\n");
    console.log(
        "Two fresh roots: eight byte-identical artifacts; exact fixture diagnostics/evidence; four strict-negative formats per root; pinned viewer JS/CSS/CSP/branding verified.",
    );
}
