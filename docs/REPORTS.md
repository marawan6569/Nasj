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
toggled. Small screens place the inspector below the graph. Inspect selection
jumps to the selected node's inspector; Show on graph returns to its centered
card. Touch supports one-finger pan and two-finger pinch/pan. Controls have
44-pixel minimum touch targets on phone/tablet. Keyboard focus brings an offscreen
node into frame before Enter/Space inspection.

### Initial host and framing

Initial selection ranks **configured** hosts using declared behavior, not guessed
traffic or port number:

1. Prefer HTTPS hosts with an effective proxy/static application destination.
   HTTPS comes from the configured listener protocol, including nonstandard ports.
2. Within that class, or if none exists, prefer more distinct proxy/static handler
   owners, then response handler owners, then reachable locations, then return/
   condition declarations. Skip locations marked unreachable after a server return.
3. Break ties by existing label/model order. If there are no configured hosts,
   fall back to deterministic label/model order without guessing provenance.

A redirect-only HTTPS host does not outrank an HTTP application just because it
uses TLS. This is an entry-point heuristic, never a declaration of the primary
website. The domain-grouped selector freely switches to HTTP, other hosts and the
complete overview; the caption identifies the current host.

Small focused graphs fit automatically while keeping cards at least approximately
220 CSS pixels wide on tested screens. Larger graphs center meaningful routing
nodes at readable scale instead of fitting the entire topology to tiny text.
A search keeps a direct match in frame; selection centers its card with nearby
relationships. The footer counts nodes outside the frame and explains pan, result
selection and Fit view. Readable scale restores readable framing; Fit view
explicitly fits all currently visible nodes and may reduce label size. Manual
zoom/pan remains available. Conditional true/false outcomes fit together for the
synthetic laptop fixture; on phones use the results/inspector or pan between them.

### Graph-aware global search

Search remains literal, case-insensitive and global across hosts, including
source/attribute metadata. Solid tinted cards are direct matches; dashed cards
are real connecting context, with distinct accessible labels. The result list
contains direct matches only. With a search, type/unresolved filters select direct
matches while their required context remains visible. Without a search those
filters retain the existing node-hiding behavior. Clearing search restores the
selected host/overview. Search captions identify connected caller hosts.

The viewer builds incoming/outgoing indexes once. In stable model order it walks
incoming edges depth-first from direct matches to preserve caller/ancestor paths,
stopping at domain declarations. Separately it follows outgoing edges **only from
direct matches**, so searching a domain/route includes its existing destinations.
Ancestor conditions additionally retain their true/false outcomes. It does not
follow outgoing edges from context domains or servers: a shared upstream includes
its actual callers without pulling in unrelated sibling hosts. Disconnected nodes
remain inspectable; cycles terminate using per-direction visited sets. Only
existing model nodes and edges are shown; no evidence or routing outcome changes.

Search is limited to the first **40 direct matches**, **200 total nodes**, **24
hops** per walk and **4000 edge visits** shared across walks. Match scanning still
covers the complete model. These are display/traversal limits, not analysis limits.
A visible graph notice and inspector explanation explicitly warn when matches or
context may be incomplete; narrow the query or switch hosts. Stable truncation can
leave a partial last path. Non-search result lists retain their 200-item limit.

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
on an adversarial two-edge ordering. Browser verification in CI uses Chromium. Optional `--browser firefox` and
`--browser webkit` run the same non-CDP checks if the engine and its ordinary
libraries are installed. Install browser binaries with Playwright under your user;
there is no automatic privileged dependency installation or silent test skipping.
The final UX review downloaded both engines, but local launches were blocked by
missing GTK/Pango and WebKit multimedia libraries; those engines have **not**
passed here. Real touch pan/pinch/cancellation/tap checks use Chromium CDP; other
engines run the shared controls/framing/search checks when available.

The final UX regressions verify backend/domain/static/conditional search paths,
shared callers, separate match/context styling, filter semantics, initial host
ranking (including plain HTTP on port 443 and HTTPS on 8443), deterministic ties,
disconnected nodes, empty results and hop/node/match limits. Viewports include
1440×900, 390×844 and 768×1024, with no page overflow or control overlap. A generated
100-vhost/602-node graph checks bounded shared-backend context and full caller
paths for retained hosts. All browser checks require zero external requests,
page errors, CSP console errors or injected dialogs.
