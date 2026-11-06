import assert from "node:assert/strict";
import { test } from "node:test";
import {
    readFile,
    mkdtemp,
    mkdir,
    copyFile,
    rm,
    writeFile,
    cp,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import {
    normalizeReports,
    normalizeJson,
    verifyReports,
    protectedViewer,
    sha256,
    assertNormalizedGraph,
} from "../scripts/demo-contract.mjs";
import { verifyArtifacts } from "../scripts/artifact-policy.mjs";

const demos = JSON.parse(await readFile("src/data/demos.json", "utf8"));
const assets = JSON.parse(await readFile("assets.json", "utf8"));
const formats = ["json", "dot", "svg", "html"];
const reports = {};
for (const scenario of demos.scenarios) {
    reports[scenario.id] = Object.fromEntries(
        await Promise.all(
            formats.map(async (format) => [
                format,
                await readFile(
                    `public/demos/v0.1.0/${scenario.id}.${format}`,
                    "utf8",
                ),
            ]),
        ),
    );
    test(`accepts authentic ${scenario.id} outputs and manifest identities`, () => {
        verifyReports(reports[scenario.id], scenario, demos.viewer);
        for (const output of scenario.outputs)
            assert.equal(
                sha256(reports[scenario.id][output.path.split(".").at(-1)]),
                output.sha256,
            );
    });
}

test("normalization preserves all non-source bytes of freshly generated released reports", async (t) => {
    const temporary = await mkdtemp(join(tmpdir(), "nasj-normalization-test-"));
    t.after(() => rm(temporary, { recursive: true, force: true }));
    const stage = join(temporary, "source-root");
    const binary = join(
        process.env.NASJ_DEMO_CACHE || join(tmpdir(), "nasj-website-v010"),
        "nasj",
    );
    assert.equal(
        sha256(await readFile(binary)),
        demos.generator.executable_sha256,
    );
    for (const scenario of demos.scenarios) {
        for (const fixture of scenario.fixtures) {
            await mkdir(dirname(join(stage, fixture.path)), {
                recursive: true,
            });
            await copyFile(
                resolve("..", fixture.path),
                join(stage, fixture.path),
            );
        }
        const raw = {};
        for (const format of formats) {
            const output = join(temporary, scenario.id + "." + format);
            const config = join(stage, scenario.fixtures[0].path);
            execFileSync(
                binary,
                [
                    "map",
                    "--config",
                    config,
                    "--prefix",
                    dirname(config),
                    ...(scenario.strict ? ["--strict"] : []),
                    "--format",
                    format,
                    "--output",
                    output,
                ],
                { stdio: ["ignore", "ignore", "pipe"] },
            );
            raw[format] = await readFile(output, "utf8");
        }
        assert.deepEqual(
            normalizeReports(raw, stage, scenario, demos.viewer),
            reports[scenario.id],
        );
        for (const [label, mutation] of [
            ["source line", (graph) => graph.nodes[0].source.line++],
            ["new edge", (graph) => graph.edges.push({ ...graph.edges[0] })],
            [
                "changed evidence",
                (graph) => (graph.edges[0].evidence = "confirmed"),
            ],
            ["changed label", (graph) => (graph.nodes[0].label = "invented")],
        ])
            await t.test(
                `semantic comparison rejects ${scenario.id} ${label}`,
                () => {
                    const changed = JSON.parse(reports[scenario.id].json);
                    mutation(changed);
                    assert.throws(
                        () =>
                            assertNormalizedGraph(
                                JSON.parse(raw.json),
                                changed,
                                stage,
                                scenario,
                            ),
                        /changed graph semantics or source lines/,
                    );
                },
            );
        // These are mutations of actual release output, not synthetic parser shapes.
        for (const [name, mutate, expected] of [
            [
                "script",
                (r) =>
                    (r.html = r.html.replace(
                        "<script>",
                        "<script>/*changed*/",
                    )),
                /JavaScript changed/,
            ],
            [
                "style",
                (r) =>
                    (r.html = r.html.replace("<style>", "<style>/*changed*/")),
                /CSS changed/,
            ],
            [
                "CSP",
                (r) =>
                    (r.html = r.html.replace(
                        "connect-src 'none'",
                        "connect-src *",
                    )),
                /CSP changed/,
            ],
            [
                "rendered line",
                (r) =>
                    (r.svg = r.svg.replace(
                        /\.conf:(\d+)<\/title>/,
                        ".conf:999</title>",
                    )),
                /rendered source title/,
            ],
            [
                "unknown HTML path span",
                (r) => (r.html += `<p>${stage}/secret.conf</p>`),
                /Source root outside/,
            ],
            [
                "unknown DOT path span",
                (r) => (r.dot += `\n// ${stage}/private.conf`),
                /Source root outside/,
            ],
            [
                "unapproved JSON path field",
                (r) =>
                    (r.json = r.json.replace(
                        '"analysis": "configuration"',
                        `"analysis": "${stage}/private.conf"`,
                    )),
                /outside allowed JSON/,
            ],
            [
                "unknown source file",
                (r) =>
                    (r.json = r.json.replaceAll(
                        scenario.fixtures[0].path,
                        "unknown.conf",
                    )),
                /Unknown source field/,
            ],
        ]) {
            await t.test(`rejects ${scenario.id} ${name} mutation`, () => {
                const modified = { ...raw };
                mutate(modified);
                assert.throws(
                    () =>
                        normalizeReports(
                            modified,
                            stage,
                            scenario,
                            demos.viewer,
                        ),
                    expected,
                );
            });
        }
        const unknown = JSON.parse(raw.json);
        unknown.nodes[0].attributes.unapproved_path = stage + "/private.conf";
        assert.throws(
            () => normalizeJson(JSON.stringify(unknown), stage, scenario),
            /outside allowed JSON/,
        );
        await t.test(
            `rejects ${scenario.id} JSON-escaped leftover private path`,
            () => {
                assert.throws(
                    () =>
                        normalizeJson(
                            JSON.stringify(unknown).replaceAll("/", "\\/"),
                            stage,
                            scenario,
                        ),
                    /outside allowed JSON/,
                );
            },
        );
    }
});

for (const [label, mutate, expected] of [
    [
        "invented proxy edge",
        (g) => g.edges.push({ ...g.edges[0], kind: "proxies_to" }),
        /strictly equal/,
    ],
    [
        "runtime-confirmed edge",
        (g) => (g.edges[0].evidence = "confirmed"),
        /Non-configured/,
    ],
    [
        "false resolved route",
        (g) =>
            (g.nodes.find((n) => n.kind === "location").attributes.routing =
                "resolved"),
        /strictly equal/,
    ],
    [
        "invented backend node",
        (g) => (g.nodes[0].kind = "backend"),
        /Invented target/,
    ],
    ["missing diagnostic", (g) => (g.warnings = []), /Unexpected diagnostics/],
    [
        "altered diagnostic source line",
        (g) => (g.warnings[0].source.line = 3),
        /Unexpected diagnostics/,
    ],
    [
        "invalid line",
        (g) => (g.edges[0].source.line = 0),
        /Invalid evidence line/,
    ],
    [
        "unknown evidence file",
        (g) => (g.edges[0].source.path = "unknown.conf"),
        /Unknown evidence file/,
    ],
    [
        "dangling edge",
        (g) => (g.edges[0].to = "missing"),
        /Dangling relationship/,
    ],
]) {
    test(`rejects ${label} even when embedded and companion data agree`, () => {
        const scenario = demos.scenarios[1];
        const original = reports.unresolved;
        const graph = JSON.parse(original.json);
        mutate(graph);
        const json = JSON.stringify(graph);
        const html = original.html.replace(
            /(<script id="topology-data" type="application\/json">)[\s\S]*?(<\/script>)/,
            (_, start, end) => start + json + end,
        );
        assert.throws(
            () =>
                verifyReports(
                    { ...original, json, html },
                    scenario,
                    demos.viewer,
                ),
            expected,
        );
    });
}

for (const [label, transform, expected] of [
    [
        "extra script",
        (h) => h + '<script src="payload.js"></script>',
        /Unexpected script/,
    ],
    [
        "branding replacement",
        (h) => h.replace("data:image", "data:changed"),
        /branding changed/,
    ],
    [
        "external resource",
        (h) => h + '<img src="https://example.test/tracker">',
        /External viewer resource/,
    ],
])
    test(`rejects viewer ${label}`, () =>
        assert.throws(
            () =>
                protectedViewer(
                    transform(reports.unresolved.html),
                    demos.viewer,
                ),
            expected,
        ));

for (const format of formats) {
    test(`production policy rejects altered ${format} report bytes`, async (t) => {
        const temporary = await mkdtemp(join(tmpdir(), "nasj-demo-inventory-"));
        t.after(() => rm(temporary, { recursive: true, force: true }));
        await cp("dist", temporary, { recursive: true });
        await writeFile(
            join(temporary, `demos/v0.1.0/unresolved.${format}`),
            reports.unresolved[format] + "\n",
        );
        await assert.rejects(
            verifyArtifacts({ root: temporary, manifest: assets, demos }),
            /Emitted asset digest mismatch/,
        );
    });
}

for (const markup of [
    "<img src='https://example.test/tracker'>",
    '<link rel="stylesheet" href="payload.css">',
]) {
    test(`rejects unexpected resource: ${markup}`, () =>
        assert.throws(
            () =>
                protectedViewer(reports.unresolved.html + markup, demos.viewer),
            /viewer resource|stylesheet/,
        ));
}
