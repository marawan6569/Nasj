# NASJ — نسج

**Weave your infrastructure into clarity.**

NASJ maps Nginx HTTP configuration into a source-aware infrastructure topology.
It is a Rust CLI that reads configuration files and declared includes, then writes
JSON, Graphviz DOT, standalone SVG or a single-file interactive HTML report.
Analysis and report viewing work offline, without running Nginx or a web server.

> **Unreleased development preview.** This checkout contains implementation awaiting
> review in [PR #1](https://github.com/marawan6569/Nasj/pull/1),
> [#8](https://github.com/marawan6569/Nasj/pull/8),
> [#9](https://github.com/marawan6569/Nasj/pull/9) and
> [#10](https://github.com/marawan6569/Nasj/pull/10), with the final safety audit in
> [#13](https://github.com/marawan6569/Nasj/pull/13). The default branch may lag this
> preview. No published binary/crates.io release is available.

Field-validation follow-ups are [#14](https://github.com/marawan6569/Nasj/pull/14),
[#15](https://github.com/marawan6569/Nasj/pull/15),
[#16](https://github.com/marawan6569/Nasj/pull/16) and
[#17](https://github.com/marawan6569/Nasj/pull/17). They add guarded ordered returns,
severity-aware diagnostics and readable vhost-focused navigation. The current
experimental JSON schema is 0.2, independent of product version.

## Install the preview

Install a stable [Rust toolchain](https://rustup.rs). A native linker is needed to
build from source. From a checkout containing the implementation:

```sh
cargo install --locked --path crates/nasj-cli
nasj --help
```

For an explicit preview checkout before those PRs merge:

```sh
git clone --branch fix/report-search-context https://github.com/marawan6569/Nasj.git
cd Nasj
cargo install --locked --path crates/nasj-cli
```

The binary is `nasj`; make sure Cargo's bin directory is on PATH. Runtime mapping
requires neither Graphviz, Python, Node.js, network access nor elevated privileges.
The Rust workspace uses the stable toolchain; current validation uses Rust 1.99.1.
No older minimum Rust version has been promised or tested.

## Map configuration

```sh
nasj map --config ./nginx.conf --format json
nasj map --config ./nginx.conf --format dot -o topology.dot
nasj map --config ./nginx.conf --format svg -o topology.svg
nasj map --config ./nginx.conf --format html -o report.html
```

Open `report.html` directly in a browser. It embeds all assets and supports zoom,
pan, global search with connected routing context, type/unresolved filters, selection, source/evidence inspection and
light/dark themes. No server or internet is needed.

Use unused output paths: existing files and symlinks are never overwritten.
Without `-o`, the report goes to stdout. Static analysis never changes/reloads
Nginx, runs shell commands from configuration, inspects processes or connects to
Docker. The `demo` command is a separate **synthetic** graph:

```sh
nasj demo --format html -o demo.html
```

Declared includes are sorted and resolved relative to the root configuration
directory, including nested includes. They are confined to that directory after
symlink resolution. For an explicit configuration prefix or intentional includes
outside it:

```sh
nasj map --config ./nginx.conf --prefix ./config --format json
nasj map --config ./nginx.conf --allow-external-includes --format json
nasj map --config ./nginx.conf --strict --format json
```

`--strict` blocks warning/error diagnostics and permits informational empty-glob notices. Syntax/read/include failures
always fail without a partial graph. Warnings are included in every format and
shown in the HTML diagnostics inspector.

## What the preview analyzes

- Explicit HTTP/TLS listeners, IPv4/IPv6/Unix addresses and virtual host names.
- Server and exact/prefix/regex/named/nested location blocks.
- HTTP(S) proxy targets, named upstreams and multiple configured members.
- Return responses/redirects, document roots/aliases, recursive/glob includes.
- Original file/line provenance, deterministic graph output and structured diagnostics.

These are **configured relationships**, not verified runtime infrastructure.
Variable proxy destinations and unsupported rewrite contexts remain unresolved,
with no invented proxy/static destination edges. Simple server-level conditional
returns have explicit guarded true/false outcomes; dynamic redirect expressions
remain symbolic. Reports start with readable, domain-grouped virtual-host focus
and offer a complete infrastructure overview. NASJ does not simulate Nginx
request matching or replace `nginx -t`. Embedded-language blocks and non-HTTP
proxy handlers are outside the supported mapping scope. Read the
[analysis contract](docs/ANALYSIS.md) for exact limits and conservative exclusions.

Reports omit unrelated directives/headers/return bodies, redact URL credentials
and query/fragment contents, and escape untrusted output. Infrastructure names and
source paths remain visible; review reports before sharing. Arbitrary secret
recognition is not guaranteed. See [security](SECURITY.md).

## Development

```sh
cargo build --workspace
cargo run -p nasj-cli -- map --config fixtures/nginx/topology/nginx.conf --format json
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

The recursive fixture deliberately produces uncertainty warnings. Parser comparison
and browser checks have separate development-only dependencies; see
[contributing](CONTRIBUTING.md) and [reports](docs/REPORTS.md).

## Architecture and roadmap

| Layer | Responsibility |
| --- | --- |
| `nasj-core` | Syntax, include resolution, static semantics, canonical model and redaction |
| `nasj-export` | JSON/DOT/SVG and embedded offline HTML consuming the same model |
| `nasj-cli` | Arguments, explicit input selection and output IO |

v0.1 is awaiting review and release validation. **v0.2** plans optional Docker,
systemd and process correlation with evidence; **v0.3** plans an optional local
web server. Neither future system is implemented. Corrected approved logo assets
are missing, so branding publication remains pending.

See [specification](docs/SPEC.md), [architecture](docs/ARCHITECTURE.md),
[roadmap](docs/ROADMAP.md), [implementation plan](docs/IMPLEMENTATION_PLAN.md),
[JSON format](docs/JSON_FORMAT.md), [release checklist](docs/RELEASE_CHECKLIST.md)
[release readiness](docs/RELEASE_READINESS.md) and [execution evidence](docs/EXECUTION_LOG.md).

[اقرأ بالعربية](README.ar.md)

NASJ is independent and is not affiliated with F5 or NGINX. Licensed under [MIT](LICENSE).
