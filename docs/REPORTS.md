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
displays relationship evidence, and includes severity-labeled diagnostics. Graphviz can optionally
render DOT externally; NASJ does not invoke it or require it.

SVG is a standalone XML document with native layout and embedded styling. DAGs
use separate virtual-host lanes and a shared upstream area, with deterministic
longest-path columns and bounded mean-order sweeps to reduce crossings. Arbitrary
cycles have a finite fallback. Node titles preserve full labels/source locations;
server cards show domain/listener/source identity. Related HTTP/HTTPS blocks stay
separate declarations while navigation groups them under the same primary domain.
No website identity or unconditional redirect relationship is inferred from names.

Open `report.html` directly in a modern browser with no server or internet.
The single file embeds the SVG, sanitized JSON, CSS and vanilla JavaScript. Use
the domain-grouped View selector, global search (literal text, including source
paths), type/unresolved filters, zoom buttons/wheel, drag to pan, Fit view, and node selection. The
inspector shows attributes, file/line provenance, relationships and their evidence.
Keyboard users can focus nodes and press Enter/Space; `/` focuses search and
Escape clears selection. Themes use the system preference initially and can be
toggled. Small screens place the inspector below the graph. Result lists show
the first 200 matches; the graph keeps all matching nodes.

The initial view focuses one virtual host at readable scale instead of shrinking
the entire topology to fit. Cards are approximately 260 screen pixels wide on
laptop/mobile; pan or select a result to reach offscreen nodes. Readable scale
restores that view; Fit view deliberately fits the current layout. Full
infrastructure overview remains available in the View selector and SVG export.
Search temporarily spans every virtual host; clearing it restores the selected
view. Type/unresolved filters hide nodes within the layout without reordering it.
The inspector includes typed symbolic guards and guarded relationship evidence.

Vhost focus layouts are computed lazily, follow configured outgoing relationships
and domain declarations, and retain at most eight cached layouts. Shared upstream
members are included only for the selected focus. There is one SVG node per model
node; no precomputed SVG copy per vhost or bundled graph library. Search text is
indexed once. Layout is deterministic and intentionally simple: some crossings
remain, full overview can be large, and large focused hosts still require pan or
search. No optimized graph-library or unlimited-size performance claim is made.

The report runs no discovery and never opens source files. `configured` means a
declaration, not runtime verification. Read diagnostics before interpreting routes.
JavaScript-disabled browsers show the static diagram. Filtering hides nodes and
their incident edges; Fit view restores the current context bounds. Diagnostics
use severity text and color (info/warning/error); optional empty includes are not
presented as configuration errors. Exact include patterns remain local to CLI.

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

The synthetic multi-vhost check covers paired HTTP/HTTPS blocks, source identity,
focus/global search/filter restoration, readable initial cards, complete overview,
mobile and themes at laptop/mobile widths. A separate 100-vhost/602-node generated
fixture verifies navigation and one-to-one DOM/model nodes. Rust tests assert
nonoverlapping cards, distinct lanes, deterministic geometry and crossing removal
on an adversarial two-edge ordering. Browser verification currently uses Chromium.
