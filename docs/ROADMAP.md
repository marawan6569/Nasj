# Roadmap

## v0.1 — Nginx topology
- Parse configuration including nested includes, with source file/line locations.
- Model server blocks, listen ports, server names, locations, upstreams, redirects and static roots.
- JSON and DOT export; SVG and offline, interactive self-contained HTML report.
- Safe output redaction, fixtures and tests.
- No live server or runtime inference.

## v0.2 — Infrastructure discovery
- Opt-in Docker port/container and process/systemd discovery.
- Record evidence and confidence: confirmed/inferred/unresolved.
- No assumed root access, no default Docker socket access.

## v0.3 — Built-in local web server
- Optional local dashboard, reuse core and exporters.
- Bind 127.0.0.1 by default.
