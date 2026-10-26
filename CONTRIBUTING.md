# Contributing

Thanks for helping build NASJ!

1. Read [the specification](docs/SPEC.md) and [agent instructions](AGENTS.md).
2. Open an issue to discuss significant architecture or JSON schema changes.
3. Create a focused branch and submit a pull request.
4. Run `cargo fmt --all -- --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace` and `cargo build --workspace`.
5. Add tests for behavior changes and documentation for visible features.

Keep one focused task per branch and use stacked PRs against the preceding branch
while PR #1 awaits review. Link relevant issues without closing them before work
is accepted and merged. Never push directly to main, force-push a shared branch,
merge or release without maintainer approval. Check Actions on the exact pushed
commit and fix failures before requesting review.

Core must remain independent of CLI/export/UI dependencies. Parser and routing
changes need sanitized fixture regressions, including negative cases, provenance
and absence of invented dynamic edges. Add exporter injection/redaction fixtures
for untrusted content. Keep dependencies minimal; research parser/schema changes
in an ADR. Reserve unwrap/expect for tests or demonstrably unrecoverable invariants,
never recoverable production input paths. Existing runtime discovery enum variants
are schema reservations, not implemented features.

Run the isolated parser comparison when syntax or its fixtures change:

```sh
cargo fmt --manifest-path tools/parser-spike/Cargo.toml -- --check
cargo clippy --manifest-path tools/parser-spike/Cargo.toml --all-targets -- -D warnings
cargo test --locked --manifest-path tools/parser-spike/Cargo.toml
cargo run --locked --manifest-path tools/parser-spike/Cargo.toml
```

Report changes require `python3 tools/report-csp.py --check` and the
[offline browser checks](docs/REPORTS.md). Refresh the script hash after JS edits
and explicitly review any golden-file updates. Browser tooling is development
only. Tests/install helpers must not automatically request privileges or alter a
live Nginx installation. Never put real secrets in fixtures or CI artifacts.

Use [the release checklist](docs/RELEASE_CHECKLIST.md) before proposing a release.

Sanitize Nginx snippets before sharing them publicly. Never post credentials or private server details.
