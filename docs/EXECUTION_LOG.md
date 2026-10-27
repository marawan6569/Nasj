# Execution log

## P0 — bootstrap stabilization, 2026-10-26

Baseline: PR #1 at `de99e0b` failed GitHub Actions at formatting; subsequent CI
steps were skipped. Local baseline Clippy, three tests and build passed after
installing Rust 1.99.1, Cargo, rustfmt and Clippy in the user account.

Changes: formatted all Rust; committed executable workspace Cargo.lock; handled
stdout IO/broken pipes; hardened DOT control-character escaping; added CLI and
hostile-output fixture regressions; enabled CI on stacked PRs and locked Cargo
checks; pinned checkout to the SHA recorded by the original CI run and disabled
persisted credentials. Added the implementation plan. Crate boundaries preserved.

Validation: all four required workspace commands passed locally, seven tests.
The demo produces valid JSON with three nodes/two edges and DOT output. The map
placeholder still fails explicitly. No parser/report support is claimed here.

GitHub CLI is absent; authenticated GitHub connector and SSH Git are available.
Required-check/branch-protection configuration cannot be managed by the available
connector operations; enforcement is unverified and issue #7 remains open.
Approved logo assets are missing. No issues closed or PRs merged.

Next: parser comparison fixtures and ADR for issue #2 on a dependent branch.

## P1a — parser research

PR #1 CI passed on `7f252d6` (Actions run 40393434723). Researched and executed
three published parser candidates in an isolated spike. ADR-0001 records concrete
behavior, maintenance/licensing and alternatives. Implemented a bounded generic
syntax parser with source locations and no production dependencies; added
sanitized syntax and malformed-input fixtures. Include resolution remains the
next focused PR. Neither parser research nor mapping is marked merged/completed.

## P1b — real configuration mapping

PR #8 CI passed at `e7851e8` (Actions run 40393921731). Implemented bounded,
read-only includes with prefix confinement, explicit external-include opt-in,
globbing, cycles and original provenance. Added conservative HTTP semantics,
configured/synthetic evidence, source metadata, URL redaction, and functional
`map` JSON/DOT. Output creation refuses overwrites; strict mode rejects warnings.
Fixtures cover recursive/glob includes, IPv6/TLS, virtual hosts, locations,
upstreams, redirects, static paths, conditional/variable routes and failures.
See ANALYSIS.md for conservative exclusions and limits. Discovery remains absent.
