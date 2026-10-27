# NASJ specification (draft)

**Problem:** Reverse-proxy routes are distributed across config files; operators need a map from domains and paths to configured backends and originating config lines.

## v0.1 acceptance criteria
1. Parse Nginx HTTP/server/location/upstream blocks and recursive includes; resolve or warn on cycles/unreadable files.
2. Preserve original file and line provenance.
3. Represent listen, server_name, proxy_pass, redirects, roots/aliases and upstream targets.
4. Represent dynamic variables and uncertain routing honestly rather than assigning false confirmed destinations.
5. Export a versioned canonical JSON graph, DOT, SVG, and interactive **single-file offline** HTML with zoom, search, and inspector.
6. Escape untrusted strings and redact secrets in exported reports.
7. Run read-only under user permissions, no reload or sudo.
8. CI fmt/clippy/test/build and fixture-based tests (IPv6, nested includes, regex locations, malformed input, dynamic proxy_pass).

## Out of scope
- v0.1 does not discover active containers/processes or simulate real requests.
- v0.2 adds opt-in Docker/systemd/process correlation and confidence/provenance.
- v0.3 adds an optional localhost web dashboard.

## Implementation status (unreleased preview)

The feature PR stack now contains bounded generic syntax parsing, recursive/glob
include resolution, conservative HTTP topology analysis, versioned JSON/DOT,
native SVG and standalone interactive HTML. A separate `demo` remains synthetic.
Workspace gates, fixtures/goldens and Chromium offline checks validate the preview.
This does not assert that any PR is merged or that v0.1 has been released.

See [ANALYSIS.md](ANALYSIS.md) for supported semantics, read scope and resource
limits; [REPORTS.md](REPORTS.md) for report behavior; and
[RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) for outstanding release decisions.
The parser is not a replacement for `nginx -t`. Embedded languages, full request
matching and arbitrary variable/secret evaluation are unsupported. Unsupported
routing remains unresolved. The schema remains experimental until reviewed.
