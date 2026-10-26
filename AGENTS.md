# NASJ coding agent rules

Applies to Codex, Antigravity, and contributors. Read docs/SPEC.md and docs/ARCHITECTURE.md first.

- One focused task per branch; open a PR; never silently push to main.
- Keep nasj-core independent of exporters and web/UI code.
- Before review run cargo fmt --all -- --check, cargo clippy --workspace --all-targets -- -D warnings, cargo test --workspace, cargo build --workspace.
- Add fixture-based regression tests for parser cases, variable proxy_pass, includes and escaping.
- Never edit or reload Nginx, elevate privileges, or access the Docker socket in normal mapping.
- Treat all configuration data as untrusted. Redact secrets; escape output in HTML, SVG and DOT.
- Unresolved or dynamic routing must never appear as confirmed.
- Do not advertise planned features as implemented.
- Maintainer approves merges and releases.
