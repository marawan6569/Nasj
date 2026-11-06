import { load } from "cheerio";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";

export const sha256 = (value) =>
    createHash("sha256").update(value).digest("hex");
const xml = (value) =>
    value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

// Walk JSON tokens, retaining their original byte ranges. Only the explicit
// source fields below may change; never serialize the whole released document.
export function normalizeJson(text, stage, scenario) {
    JSON.parse(text);
    let cursor = 0;
    const edits = [];
    const space = () => {
        while (/\s/.test(text[cursor] || "x")) cursor++;
    };
    function string() {
        const start = cursor++;
        while (cursor < text.length) {
            if (text[cursor] === "\\") cursor += 2;
            else if (text[cursor++] === '"') break;
        }
        return {
            start,
            end: cursor,
            value: JSON.parse(text.slice(start, cursor)),
        };
    }
    function value(path) {
        space();
        if (text[cursor] === '"') {
            const token = string();
            const key = path.join("/");
            const source =
                /^sources\/\d+$|^(?:nodes|edges|warnings)\/\d+\/source\/path$/.test(
                    key,
                );
            const rootSource = /^nodes\/\d+\/attributes\/root_source$/.test(
                key,
            );
            if (source || rootSource) {
                const suffix = rootSource
                    ? token.value.match(/:\d+$/)?.[0]
                    : "";
                assert.ok(suffix !== undefined, "Invalid root_source line");
                const absolute = suffix
                    ? token.value.slice(0, -suffix.length)
                    : token.value;
                const fixture = scenario.fixtures.find(
                    (f) => absolute === `${stage}/${f.path}`,
                );
                assert.ok(fixture, `Unknown source field: ${key}`);
                edits.push({
                    ...token,
                    replacement: JSON.stringify(fixture.path + suffix),
                });
            } else
                assert.ok(
                    !token.value.includes(stage),
                    "Source root outside allowed JSON fields",
                );
        } else if (text[cursor] === "{") {
            cursor++;
            space();
            while (text[cursor] !== "}") {
                const key = string().value;
                space();
                assert.equal(text[cursor++], ":");
                value([...path, key]);
                space();
                if (text[cursor] !== ",") break;
                cursor++;
                space();
            }
            assert.equal(text[cursor++], "}");
        } else if (text[cursor] === "[") {
            cursor++;
            space();
            let index = 0;
            while (text[cursor] !== "]") {
                value([...path, String(index++)]);
                space();
                if (text[cursor] !== ",") break;
                cursor++;
                space();
            }
            assert.equal(text[cursor++], "]");
        } else {
            while (cursor < text.length && !/[\s,}\]]/.test(text[cursor]))
                cursor++;
        }
    }
    value([]);
    space();
    assert.equal(cursor, text.length);
    for (const edit of edits.reverse())
        text =
            text.slice(0, edit.start) + edit.replacement + text.slice(edit.end);
    assert.ok(!text.includes(stage), "Source root outside allowed JSON fields");
    return text;
}

function normalizeTitles(text, graph, stage) {
    let count = 0;
    const result = text.replace(
        /(<g class="node" data-node="(\d+)"[^>]*><title>)([\s\S]*?)(<\/title>)/g,
        (_, open, index, title, close) => {
            const node = graph.nodes[Number(index)];
            assert.ok(node?.source, "Unexpected SVG node");
            const expected = xml(
                `${node.label} · ${node.source.path}:${node.source.line}`,
            );
            assert.equal(title, expected, "Unexpected rendered source title");
            assert.ok(node.source.path.startsWith(stage + "/"));
            count++;
            return (
                open +
                xml(
                    `${node.label} · ${node.source.path.slice(stage.length + 1)}:${node.source.line}`,
                ) +
                close
            );
        },
    );
    assert.equal(count, graph.nodes.length, "Missing rendered source titles");
    return result;
}

export function protectedViewer(html, viewer) {
    const captures = (pattern) =>
        [...html.matchAll(pattern)].map((m) => sha256(m[1]));
    assert.deepEqual(
        captures(/<script>([\s\S]*?)<\/script>/g),
        viewer.script_sha256,
        "Released viewer JavaScript changed",
    );
    assert.deepEqual(
        captures(/<style>([\s\S]*?)<\/style>/g),
        viewer.style_sha256,
        "Released viewer CSS changed",
    );
    assert.deepEqual(
        captures(/(?:href|src)="(data:[^"]+)"/g),
        viewer.branding_sha256,
        "Released branding changed",
    );
    const policies = [
        ...html.matchAll(
            /http-equiv="Content-Security-Policy" content="([^"]+)"/g,
        ),
    ];
    assert.equal(policies.length, 1);
    assert.equal(policies[0][1], viewer.csp, "Released CSP changed");
    for (const digest of viewer.script_sha256) {
        assert.ok(
            viewer.csp.includes(
                `'sha256-${Buffer.from(digest, "hex").toString("base64")}'`,
            ),
            "Viewer hash absent from CSP",
        );
    }
    assert.equal(
        [...html.matchAll(/<script\b/g)].length,
        2,
        "Unexpected script element",
    );
    assert.ok(
        !/(?:src|href)="(?:https?:|\/\/)/i.test(html),
        "External viewer resource",
    );
    const $ = load(html);
    $("[src], [href], [srcset], link").each((_, element) => {
        for (const name of ["src", "href", "srcset"]) {
            const value = element.attribs[name];
            if (value !== undefined)
                assert.ok(
                    /^data:image\/png;base64,/.test(value) && name !== "srcset",
                    "External viewer resource or unexpected local resource",
                );
        }
        if (element.name === "link")
            assert.equal(
                element.attribs.rel,
                "icon",
                "Unexpected stylesheet reference",
            );
    });
}

export function embeddedGraph(html) {
    const matches = [
        ...html.matchAll(
            /<script id="topology-data" type="application\/json">([\s\S]*?)<\/script>/g,
        ),
    ];
    assert.equal(matches.length, 1, "Expected one inert topology payload");
    return matches[0];
}

// Independent semantic check alongside the token-span editor. Source line
// numbers, attributes, IDs, endpoints, conditions and evidence must all survive.
export function assertNormalizedGraph(before, after, stage, scenario) {
    const expected = structuredClone(before);
    const path = (absolute) => {
        const fixture = scenario.fixtures.find(
            (f) => absolute === `${stage}/${f.path}`,
        );
        assert.ok(fixture, "Unknown graph source path");
        return fixture.path;
    };
    expected.sources = expected.sources.map(path);
    for (const item of [
        ...expected.nodes,
        ...expected.edges,
        ...expected.warnings,
    ]) {
        item.source.path = path(item.source.path);
    }
    for (const node of expected.nodes) {
        if (node.attributes.root_source !== undefined) {
            const match = /^(.*)(:\d+)$/.exec(node.attributes.root_source);
            assert.ok(match, "Invalid inherited source reference");
            node.attributes.root_source = path(match[1]) + match[2];
        }
    }
    assert.deepEqual(
        after,
        expected,
        "Normalization changed graph semantics or source lines",
    );
}

export function normalizeReports(raw, stage, scenario, viewer) {
    const graph = JSON.parse(raw.json);
    protectedViewer(raw.html, viewer);
    const json = normalizeJson(raw.json, stage, scenario);
    assertNormalizedGraph(graph, JSON.parse(json), stage, scenario);
    const svg = normalizeTitles(raw.svg, graph, stage);
    const payload = embeddedGraph(raw.html);
    assert.deepEqual(
        JSON.parse(payload[1]),
        graph,
        "Raw embedded graph differs",
    );
    let html = raw.html.replace(
        payload[0],
        payload[0].replace(
            payload[1],
            normalizeJson(payload[1], stage, scenario),
        ),
    );
    html = normalizeTitles(html, graph, stage);
    const normalized = { json, dot: raw.dot, svg, html };
    for (const value of Object.values(normalized))
        assert.ok(
            !value.includes(stage),
            "Source root outside allowlisted spans",
        );
    verifyReports(normalized, scenario, viewer);
    return normalized;
}

export function verifyReports(reports, scenario, viewer) {
    protectedViewer(reports.html, viewer);
    const graph = JSON.parse(reports.json);
    assert.deepEqual(
        JSON.parse(embeddedGraph(reports.html)[1]),
        graph,
        "Companion and embedded JSON differ",
    );
    assert.ok(
        reports.html.includes(reports.svg.trim()),
        "Companion SVG differs from viewer",
    );
    assert.equal(graph.schema_version, "0.2");
    assert.equal(graph.analysis, "configuration");
    assert.equal(graph.nodes.length, scenario.nodes);
    assert.equal(graph.edges.length, scenario.edges);
    assert.deepEqual(
        [...graph.sources].sort(),
        scenario.fixtures.map((f) => f.path).sort(),
    );
    for (const item of [...graph.nodes, ...graph.edges, ...graph.warnings]) {
        assert.ok(
            graph.sources.includes(item.source.path),
            "Unknown evidence file",
        );
        assert.ok(
            Number.isInteger(item.source.line) && item.source.line > 0,
            "Invalid evidence line",
        );
    }
    const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
    assert.equal(nodes.size, graph.nodes.length, "Duplicate node identity");
    for (const edge of graph.edges) {
        assert.equal(
            edge.evidence,
            "configured",
            "Non-configured relationship",
        );
        assert.ok(
            nodes.has(edge.from) && nodes.has(edge.to),
            "Dangling relationship",
        );
    }
    assert.deepEqual(
        graph.warnings.map((w) => ({
            code: w.code,
            severity: w.severity,
            line: w.source.line,
            message: w.message,
            path: w.source.path,
        })),
        scenario.diagnostics,
        "Unexpected diagnostics",
    );
    if (scenario.id === "multi-vhost") {
        const proxy = graph.edges.find(
            (e) => e.kind === "proxies_to" && e.source.line === 24,
        );
        assert.equal(nodes.get(proxy?.from)?.attributes.pattern, "/");
        assert.equal(nodes.get(proxy?.to)?.label, "portal_app");
        assert.ok(
            graph.edges.some(
                (e) =>
                    e.kind === "backed_by" &&
                    e.from === proxy.to &&
                    nodes.get(e.to)?.label === "127.0.0.1:8100" &&
                    e.source.line === 7,
            ),
        );
        assert.ok(
            graph.nodes.some((n) => n.kind === "condition"),
            "Symbolic conditions missing",
        );
    } else {
        assert.equal(scenario.id, "unresolved");
        const location = graph.nodes.find((n) => n.kind === "location");
        assert.equal(location?.attributes.pattern, "/dynamic/");
        assert.equal(location?.attributes.routing, "unresolved");
        assert.equal(location?.source.line, 1);
        assert.ok(
            graph.nodes.every((n) =>
                ["server", "listener", "domain", "location"].includes(n.kind),
            ),
            "Invented target",
        );
        assert.ok(
            graph.edges.every((e) => e.kind !== "proxies_to"),
            "Invented proxy relationship",
        );
    }
    assert.ok(
        Buffer.byteLength(reports.html) <= 250 * 1024,
        "Report raw budget",
    );
    assert.ok(
        gzipSync(reports.html).length <= 120 * 1024,
        "Report compressed budget",
    );
    return graph;
}
