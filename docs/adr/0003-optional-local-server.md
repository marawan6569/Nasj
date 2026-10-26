# ADR-0003: optional localhost report server

Date: 2026-10-26. Status: proposed for v0.3; documentation only.
No web server, async runtime or network endpoint is implemented by this ADR.

## Decision boundary

The CLI, static analysis and offline HTML remain first-class. An optional server
will reuse normalized snapshots and renderer assets in a separate crate/feature;
`nasj-core` remains independent of HTTP frameworks and runtime selection. Decide
the server dependency only when implementation begins and its threat model and
resource budget are reviewed. A local server must not become a prerequisite for
mapping or viewing reports.

Prefer an immutable preselected topology snapshot initially, instead of accepting
arbitrary config paths from browser requests or continuously scanning the host.
The operator selects the input/prefix/output policy at startup. Report export
remains available without the server. Watching files, uploads, edits and remote
discovery are excluded from the initial server design.

## Proposed request and data flow

```text
operator-selected config → existing bounded analysis → immutable Topology
                                                       ↓
optional localhost listener → authenticated viewer + snapshot API
```

Serve only fixed local routes for viewer assets and sanitized topology. There is
no shell execution, arbitrary static-file directory, browser-controlled source
path, Nginx reload endpoint or proxy to arbitrary URLs. Source inspection displays
the same metadata as offline HTML, not unrestricted filesystem contents.

Bind `127.0.0.1` by default. IPv6 loopback requires an explicit equivalent policy;
wildcard/remote binds are a separate future security decision. Validate Host and
Origin against the selected listener to resist DNS rebinding and browser-origin
confusion. Disable CORS and external embedding. Use a cryptographically random
per-session token and fixed read-only routes; design token delivery so credentials
are not put in access logs, query parameters or persistent browser storage.
Loopback binding alone does not authorize other local users/processes.

The online viewer may need same-origin snapshot requests under a separate CSP.
The offline export retains `connect-src 'none'` and its exact script-hash policy.
Do not weaken the portable report's policy to accommodate the server. Reuse graph
interaction logic with an explicit trusted data-loading boundary.

## Limits, lifecycle and failures

Define request/header/body sizes, timeouts, connection/concurrency limits and
bounded CPU worker dispatch before implementing. Parsing must not block an HTTP
event loop or bypass core read budgets. An explicit operator refresh may publish
a new immutable snapshot atomically after successful analysis; failure preserves
the previous version with a visible timestamp/status. No partial replacement or
hidden fallback to unrelated paths. Graceful shutdown releases listeners and
per-session credentials. No background telemetry or host discovery.

The server must share redaction/escaping semantics with exporters, suppress raw
configuration/tokens in logs and reject untrusted path traversal. Do not expose
Docker endpoints or service control. Offline report generation remains possible
if ports, authentication or optional adapters fail.

## Acceptance before implementation/release

Review the threat model, token delivery, origin/host policy, dependency choices
and resource limits with the maintainer. Test loopback-only binding, token failure,
DNS rebinding/Host/Origin rejection, CORS, traversal, oversized requests, bounded
concurrency, failed refresh, shutdown and CSP isolation using fixtures. Confirm
normal `map`, core tests and offline reports make no network requests and pull no
HTTP/async dependencies. Server tests must use ephemeral loopback ports and never
privilege escalation. v0.3 remains deferred while v0.1/v0.2 are validated.
