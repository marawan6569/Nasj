# Architecture

NASJ is a synchronous, CLI-first static analyzer. The preview remains unmerged
and unreleased. The CLI and offline reports work independently of any web server.

```text
explicit nginx.conf
  → bounded UTF-8 input
  → generic lexer / recursive-descent syntax AST
  → declared include expansion (same parser, source provenance retained)
  → conservative HTTP semantic analysis
  → versioned, sanitized Topology
       ├─ JSON
       ├─ Graphviz DOT
       ├─ native SVG layout
       └─ self-contained interactive HTML (SVG + local JS/CSS + inert JSON)
```

## Crate boundaries

- **nasj-core:** canonical types, generic syntax, read-only input/include policy,
  HTTP semantics, diagnostics and shared redaction. It has no exporter, CLI, UI,
  async/network, Nginx process or discovery dependencies.
- **nasj-export:** consumes `Topology`; validates IDs/endpoints and sanitizes
  again at its public boundary. It owns escaping, format layout, embedded viewer
  assets and the content-security policy. It does no input discovery or IO.
- **nasj-cli:** clap arguments, explicit file selection, strict-mode policy,
  rendering dispatch, stdout errors and create-new output files. It never
  overwrites configuration or invokes Nginx, a shell, Graphviz or Docker.

The dependency direction is CLI → core/export and export → core. Keep parsing
usable as a Rust library independently of the CLI and rendering. No service
container or generic plugin framework is needed for these three crates.

## Syntax and include resolution

`syntax::parse` exposes generic directive names, arguments, optional child blocks
and original source locations. The AST is internal analysis data and contains raw
input: it must not become a report serialization format. Quoting/escape behavior,
bounded recursion and parser alternatives are recorded in
[ADR-0001](adr/0001-nginx-parser.md).

`config::analyze_file` selects the root and configuration prefix, reads only regular
UTF-8 files, expands ordered includes, checks canonical cycles/scope, and enforces
file/byte/depth/token budgets. It calls the same parser for included files and
retains their own locations. Parsing and filesystem errors return a structured
code and source; no partial graph is exported. Relative includes resolve against
the root prefix, not each included file. See [ANALYSIS.md](ANALYSIS.md).

## Semantics and evidence

The analyzer makes upstream declarations available before processing servers, so
reference order does not change target resolution. Server/location containment,
listeners/domains, root/alias, return and HTTP proxy declarations become graph
nodes and edges. Ordered traversal and source sorting make unchanged input
deterministic. IDs are stable across identical runs, but edits can renumber nodes.

Every emitted static edge has `configured` evidence and original source. Demo
data uses `synthetic`. Runtime `confirmed`/`inferred` classifications are reserved
in the model; no runtime discovery is implemented. Variables, duplicate upstream
names and unsupported routing contexts produce diagnostics and omit
invented proxy edges. A graph is not a request simulator, DNS lookup, Nginx validity
check or runtime reachability assertion. Semantic limitations remain warnings;
the CLI's `--strict` option rejects warning/error diagnostics and permits info.
Optional empty globs are info; required input failures always abort. Private
include-pattern context stays local to CLI diagnostics and out of reports.

Narrow server rewrite programs use symbolic condition nodes and ordered true/false
edges to redirect/response actions; variables are not evaluated. Content-handler
selection precedes effective-destination edges, with inherited root kept as
metadata when proxying. Ordinary nested locations do not inherit pass handlers.
See [ADR-0004](adr/0004-ordered-conditional-returns.md) for schema 0.2 and exclusions.

## Reports and security

JSON documents the experimental versioned model, sources and warnings. DOT quotes
all IDs/labels. SVG uses native deterministic graph layering and XML escaping.
HTML embeds the SVG, redacted model and local assets. Its viewer uses DOM text
creation, a script hash CSP and no network permissions. See
[REPORTS.md](REPORTS.md) for interaction and browser validation details.

Raw directives, headers, certificate contents and response bodies are excluded.
URL userinfo/query/fragment data and sensitive attribute values are redacted.
Paths/hostnames are intentional report data, and general secret detection is not
guaranteed. File reads are bounded; canonical prefix confinement is the default.
Symlinks may be followed only within scope unless the caller explicitly opts out.
Concurrent malicious tree replacement is not an OS-level isolation boundary.
For untrusted concurrently mutable trees, analyze a trusted snapshot.

No telemetry, unsolicited network calls, configuration writes, reloads, privilege
escalation or Docker socket access occur in normal mapping. All exporter content
is untrusted, including source paths and diagnostics. See [SECURITY.md](../SECURITY.md).

## Future versions

v0.2 discovery will use optional adapters outside static core analysis, preserve
observations and confidence, and accept fixture snapshots. v0.3's optional
localhost server will reuse the same core/export APIs. Neither is implemented;
their design must not introduce runtime work into ordinary `nasj map`.

Proposals: [ADR-0002 discovery/evidence](adr/0002-optional-discovery-evidence.md)
and [ADR-0003 localhost server](adr/0003-optional-local-server.md). No crates,
commands or dependencies for these versions were added.
