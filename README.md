# NASJ — نَسْج

**Weave your infrastructure into clarity.**

NASJ is a Rust-first, CLI-first project for mapping Nginx configurations into understandable infrastructure topology. It is designed for safe, offline analysis and portable reports.

> **Status: early development.** The current repository is a development scaffold; real Nginx parsing, HTML and SVG export are **not implemented yet**.

## Roadmap

| Version | Scope |
| --- | --- |
| **v0.1** | Parse Nginx configs and recursive includes; graph domains, listeners, locations, proxy targets and upstreams; export JSON, DOT, SVG, and standalone interactive HTML |
| **v0.2** | Opt-in discovery of Docker containers, systemd services and local listening processes; evidence-based matching |
| **v0.3** | Optional built-in web server with a local dashboard |

## Developer preview

Install the [Rust toolchain](https://rustup.rs), then:

```sh
cargo build --workspace
cargo run -p nasj-cli -- --help
cargo run -p nasj-cli -- demo --format json
cargo run -p nasj-cli -- demo --format dot -o topology.dot
cargo test --workspace
```

The `demo` command emits **synthetic** topology data only. These planned commands are **not implemented yet**:

```sh
nasj map --config /etc/nginx/nginx.conf --format html -o report.html
nasj map --config /etc/nginx/nginx.conf --format svg -o topology.svg
```

## Architecture

- `crates/nasj-core` — canonical versioned topology model and future Nginx analysis.
- `crates/nasj-export` — export formats for the canonical model.
- `crates/nasj-cli` — a single `nasj` executable.
- `docs/` — specification and milestone scope.

## Principles

- **Read-only**: never edit or reload Nginx.
- **Offline-first**: no telemetry or automatic uploads.
- **Honest results**: ambiguous or dynamic routes must not be represented as confirmed.
- **Source-aware**: preserve the file and line number that produced each relationship.
- **Secure export**: escape untrusted data and redact secrets before generating reports.

See [the specification](docs/SPEC.md), [architecture](docs/ARCHITECTURE.md), [roadmap](docs/ROADMAP.md) and [contributing guide](CONTRIBUTING.md).

[اقرأ بالعربية](README.ar.md)

NASJ is an independent open-source project, not affiliated with F5 or NGINX.

Licensed under [MIT](LICENSE).
