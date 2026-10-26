# Roadmap and current status

No release has been published and no development PR has been merged by this work.
Code listed below is an implemented preview awaiting maintainer review.

| Milestone | Preview status | Review dependency |
| --- | --- | --- |
| Workspace, synthetic demo, CI | Stabilized; local gates and Actions pass | PR #1 |
| Parser research and syntax | Comparison spike, ADR, bounded parser and fixtures | PR #8 → #1; issue #2 |
| Real HTTP topology | Includes, semantics, configured evidence, provenance and JSON/DOT | PR #9 → #8; issues #2/#3 |
| Portable reports | SVG and offline interactive HTML; security/browser checks | PR #10 → #9; issue #4 |
| Documentation and release readiness | English/Arabic usage, architecture and checklist | Documentation PR; issue #6 |
| Approved branding assets | Blocked: corrected originals absent | Issue #6 |
| Required-check/branch protection settings | Unverified; available connector cannot configure settings | Issue #7 |

## v0.1 — validate and release static mapping

Review the PR stack, experimental JSON schema, parser/semantic limitations and
fixture coverage. Validate reports in additional browsers and representative
sanitized deployment snapshots; assess layout on larger graphs. Complete the
[release checklist](RELEASE_CHECKLIST.md) and obtain maintainer approval. Keep
unresolved routes honest and the CLI independent. Passing tests are not release
approval. Issues stay open until accepted work is merged.

## v0.2 — optional infrastructure discovery (planned)

Correlate static targets with explicit Docker published-port snapshots, systemd
service observations and local TCP/process listeners. Retain source/time,
network namespace, permission gaps and confirmed/inferred/unresolved evidence.
No automatic root access, Docker socket use or default discovery in `map`.
Begin implementation only after v0.1 is sufficiently validated.

## v0.3 — optional local web server (planned)

Reuse core analysis/export APIs with an optional local dashboard. Default bind
127.0.0.1; retain offline CLI/report workflows and explicit filesystem scope.
Authentication, request/path isolation and bounded concurrent work must be designed
before exposing a network endpoint. No server/runtime is implemented now.
