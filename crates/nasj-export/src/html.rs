use crate::{svg, ExportError};
use nasj_core::{AnalysisKind, Topology};

const CSS: &str = include_str!("assets/report.css");
const JS: &str = include_str!("assets/report.js");
const SCRIPT_HASH: &str = include_str!("assets/report.sha256");

pub(crate) fn render(graph: &Topology) -> Result<String, ExportError> {
    // Inert JSON must not terminate its script element, even in quoted strings.
    let data = serde_json::to_string(graph)?
        .replace('&', "\\u0026")
        .replace('<', "\\u003c")
        .replace('>', "\\u003e")
        .replace('\u{2028}', "\\u2028")
        .replace('\u{2029}', "\\u2029");
    let diagram = svg::render(graph);
    let mode = match graph.analysis {
        AnalysisKind::Synthetic => "Synthetic demo",
        AnalysisKind::Configuration => "Static configuration",
        AnalysisKind::Unknown => "Unknown provenance",
    };
    let hash = SCRIPT_HASH.trim();
    Ok(format!(
        r#"<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-{hash}'; style-src 'unsafe-inline'; img-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
<title>NASJ · Infrastructure topology</title><style>{CSS}</style></head><body>
<header><div class="brand"><span class="wordmark">NASJ</span><span class="arabic" lang="ar" dir="rtl">نسج</span><div><h1>Infrastructure topology</h1><p class="subtle">Weave your infrastructure into clarity.</p></div></div><span class="badge">{mode} · Offline report</span></header>
<div class="toolbar" aria-label="Graph controls"><label class="search">Search all virtual hosts<input id="search" type="search" placeholder="Domain, route, backend or source…" maxlength="200" autocomplete="off"></label><label class="view-picker">View<select id="vhost-view"><option value="">Full infrastructure overview</option></select></label><label>Node type<select id="kind-filter"><option value="">All types</option></select></label><label class="check"><input id="unresolved-only" type="checkbox">Unresolved only</label><button id="clear-filters" type="button">Reset filters</button><button id="theme" type="button" aria-pressed="false">Dark theme</button></div>
<main class="workspace"><section class="graph-panel" aria-label="Topology graph"><div class="graph-tools"><button id="zoom-in" type="button" aria-label="Zoom in">+</button><button id="zoom-out" type="button" aria-label="Zoom out">−</button><button id="readable" type="button">Readable scale</button><button id="fit" type="button">Fit view</button><span id="view-caption" class="subtle" aria-live="polite"></span></div><div class="graph-container">{diagram}</div><div class="graph-footer"><span id="visible-count" aria-live="polite">Loading graph…</span><span>Drag to explore · Scroll to zoom · Enter to inspect</span></div></section>
<aside aria-label="Topology inspector"><section><h2>Topology overview</h2><div class="stats"><div class="stat"><strong id="node-count">—</strong><span>Graph nodes</span></div><div class="stat"><strong id="edge-count">—</strong><span>Relationships</span></div></div><button id="review-warnings" type="button">Review diagnostics</button><p class="subtle">Configuration describes intent. Runtime reachability and request routing have not been verified.</p></section>
<section id="selection" hidden><span id="node-kind" class="badge"></span><h2 id="node-title"></h2><button id="reset-selection" type="button">Clear selection</button><dl id="node-fields"></dl><h3>Relationships &amp; evidence</h3><ul id="relationships"></ul></section>
<section><h2>Find a node</h2><p id="matches-note" class="subtle"></p><ul id="matches"></ul></section><section id="diagnostics"><h2>Diagnostics · <span id="warning-count">—</span></h2><ul id="warnings"></ul><h3>Source files</h3><ul id="sources"></ul></section></aside></main>
<noscript>Enable JavaScript for search, filtering and navigation. The static diagram remains available.</noscript><footer>NASJ · Schema {} · Self-contained report. Hostnames and source paths remain visible; review before sharing.</footer>
<script id="topology-data" type="application/json">{data}</script><script>{JS}</script></body></html>
"#,
        svg::escape(&graph.schema_version)
    ))
}
