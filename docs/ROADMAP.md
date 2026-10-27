# Roadmap and current status

The complete v0.1 implementation stack (#1, #8–#19) is merged into main.
Public v0.1.0 publication remains pending maintainer approval. The product scope
is frozen; release preparation adds documentation and distribution instructions.

| Milestone | Main status | Implementation history |
| --- | --- | --- |
| Workspace, CLI, synthetic demo, CI | Implemented | #1 |
| Parser research, syntax and includes | Implemented | #8, #9 |
| HTTP topology and routing uncertainty | Implemented, conservative analysis | #9, #13, #14, #17 |
| Conditional returns and diagnostic severity | Implemented | #14, #15 |
| JSON/DOT/SVG/offline HTML | Implemented | #10, #16 |
| Connected search and mobile navigation | Implemented | #18 |
| Official NASJ branding and both READMEs | Integrated | #19; issue #6 criteria satisfied |
| Release documentation | Prepared; publication approval pending | #11 and release-preparation PR |
| Branch protection | Explicitly deferred repository hardening | No settings changed; not a release blocker |

## v0.1.0 — source-first publication gate

43 workspace tests, the isolated parser comparison, offline Chromium and the
required Cargo/CSP/branding gates pass on post-stack main. Validate again on the
final documentation merge; its PR records the exact final main SHA/Actions.
See [readiness](RELEASE_READINESS.md), [checklist](RELEASE_CHECKLIST.md),
[release notes](RELEASE_NOTES_v0.1.0.md) and [distribution](DISTRIBUTION.md).
Schema 0.2 is experimental and distinct from product 0.1.0. Linux x86_64 with
Rust 1.99.1 and Chromium are validated; other platforms/browsers remain unverified.

## v0.2 — optional infrastructure discovery (planned)

Correlate static targets with explicit Docker published-port snapshots, systemd
service observations and local TCP/process listeners. Retain source/time,
network namespace, permission gaps and confirmed/inferred/unresolved evidence.
No automatic root access, Docker socket use or default discovery in `map`.
No discovery implementation is included in v0.1.0. Issue #5 remains open.
See [ADR-0002](adr/0002-optional-discovery-evidence.md) for the proposed model.

## v0.3 — optional local web server (planned)

Reuse core analysis/export APIs with an optional local dashboard. Default bind
127.0.0.1; retain offline CLI/report workflows and explicit filesystem scope.
Authentication, request/path isolation and bounded concurrent work must be designed
before exposing a network endpoint. No server/runtime is implemented now.
See [ADR-0003](adr/0003-optional-local-server.md) for the proposal.
