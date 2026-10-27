# Portable report formats

All renderers consume the same versioned `Topology`. Rendering validates unique
node IDs and valid edge endpoints, sanitizes URL credentials/query/fragment
contents and sensitive attributes, and performs no network access.

```sh
nasj map --config ./nginx.conf --format json -o topology.json
nasj map --config ./nginx.conf --format dot -o topology.dot
nasj map --config ./nginx.conf --format svg -o topology.svg
nasj map --config ./nginx.conf --format html -o report.html
```

Choose unused output paths: existing files and symlinks are never overwritten.
JSON uses the [experimental schema](JSON_FORMAT.md), ordered attributes, sorted
source paths and deterministic input traversal. DOT quotes/escapes IDs and labels,
displays relationship evidence, and includes warning text. Graphviz can optionally
render DOT externally; NASJ does not invoke it or require it.

SVG is a standalone XML document with native layout and embedded styling. DAGs
use deterministic longest-path columns; arbitrary cyclic model inputs use a
finite fallback layout. Node titles preserve full labels/source locations while
cards abbreviate long text. Layout is intentionally simple: edges can cross and
large graphs need zoom/inspection. This is not an optimized Graphviz replacement.

Open `report.html` directly in a modern browser with no server or internet.
The single file embeds the SVG, sanitized JSON, CSS and vanilla JavaScript. Use
search (literal text, including source paths), the node-type filter, unresolved
filter, zoom buttons/wheel, drag to pan, Fit graph, and node selection. The
inspector shows attributes, file/line provenance, relationships and their evidence.
Keyboard users can focus nodes and press Enter/Space; `/` focuses search and
Escape clears selection. Themes use the system preference initially and can be
toggled. Small screens place the inspector below the graph. Result lists show
the first 200 matches; the graph keeps all matching nodes.

The report runs no discovery and never opens source files. `configured` means a
declaration, not runtime verification. Read diagnostics before interpreting routes.
JavaScript-disabled browsers show the static diagram. Filtering hides nodes and
their incident edges; Fit graph restores the original complete diagram bounds.

## Security contract

Untrusted strings are XML-escaped and embedded JSON encodes `<`, `>`, `&` and
Unicode line separators so it cannot close the inert script element. The viewer
uses textContent/DOM creation, without eval or untrusted HTML insertion. A CSP
allows only the exact hashed viewer script, inline local styles and no network,
images, objects, forms or external base URL. No fonts/CDNs/telemetry/server are
required. No source file links execute or load anything. Offline does not make a
report public: infrastructure names and source paths remain visible, and generic
secret detection is not promised. Review before sharing.

When editing `src/assets/report.js`, run `python3 tools/report-csp.py` and commit
the new hash. CI checks the hash and opens hostile/ordinary/empty reports with
the browser offline. Golden files cover JSON/DOT/SVG. Refresh explicitly with
`cargo run -p nasj-export --example generate_golden`, then review the diff.

## Browser regression checks

```sh
python3 -m venv /tmp/nasj-browser-venv
/tmp/nasj-browser-venv/bin/pip install -r tools/browser-requirements.txt
/tmp/nasj-browser-venv/bin/playwright install chromium
cargo build --workspace
/tmp/nasj-browser-venv/bin/python tools/browser-smoke.py
```

The development browser needs ordinary Chromium shared libraries and fonts.
On minimal servers provide them under user permissions; the test does not install
system packages or elevate privileges. Optional `--screenshots DIR` retains
desktop/mobile captures. The checks assert XML validity, actual interaction,
responsive overflow, source/evidence inspection, zero injected DOM/script
execution, zero external requests and zero browser errors. These are development
dependencies; generated reports and the Rust executable require none of them.
