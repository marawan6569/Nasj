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

Validation for P1b: fmt, Clippy with warnings denied, all 19 workspace tests and
build passed. Review found and fixed Unix socket URL authority parsing, with a
regression fixture. PR #9 at `925c24f` passed Actions run 40394983790.

## P2 — portable SVG and offline HTML

Added native deterministic SVG layering and an embedded HTML viewer with zoom,
pan, mouse/keyboard node selection, search, filters, source/evidence inspector,
diagnostics navigation, responsive layout and light/dark themes. JSON/DOT/SVG
goldens and hostile/empty/cyclic graph tests exercise the shared model. Export
validation rejects duplicate IDs and dangling endpoints. DOT shows configured
evidence and warnings. HTML escapes inert JSON and XML, uses DOM text creation,
and allows only the checked-in viewer script hash under a network-denying CSP.
No runtime renderer dependencies added. See REPORTS.md.

Validation: all four workspace gates pass, 23 tests; CSP hash check passes.
Chromium 156 / Playwright 1.64.1 passed actual offline file:// browser checks for
interactions, mobile overflow, sources/evidence, themes, hostile and empty input,
and zero external requests/browser errors. Desktop/mobile screenshots reviewed.
Missing Chromium libraries/fonts were extracted into /tmp under user permissions;
no system package install or privilege escalation. Graphviz 14.1.2 independently
accepted ordinary and hostile DOT using temporary local libraries/plugins.

Limitations: SVG layout can have crossing edges and requires zoom on larger maps;
the browser suite currently covers Chromium only. No arbitrary config secret
detection or runtime verification is promised. Corrected branding remains missing.
Next: documentation/release checklist and future discovery/server architecture.

## P3 — documentation and release readiness

PR #10 passed Actions run 40396305004 on `989e63a`, including the offline browser
suite. Updated English/Arabic README installation and actual CLI examples,
architecture/specification/roadmap status, contributor/security guidance,
changelog and first-release checklist. Checked local documentation links and
CLI help. No screenshots or unapproved logo artwork added to the repository.
Approved corrected PNGs remain absent; branding issue #6 stays pending. Required
repository branch protections remain unverified. No PRs merged or issues closed.

Validation: all four workspace gates pass (23 tests), local Markdown links exist,
and `cargo install --locked --path crates/nasj-cli --root /tmp/nasj-install-preview`
succeeded. The installed optimized binary mapped the Unix fixture in strict mode.

## P4 — future architecture only

ADR-0002 proposes optional snapshot-first discovery adapters, explicit permissions,
namespace/time/identity evidence and confirmed/inferred/unresolved correlations.
ADR-0003 proposes an optional loopback server with immutable selected snapshots,
authentication, host/origin checks and a separate online CSP. Primary Docker,
systemd and kernel documentation informed the proposals. No discovery/server
crates, commands, dependencies, sockets or privileged operations were introduced.
Issue #5 stays open; v0.2 implementation is deferred until v0.1 is validated.
