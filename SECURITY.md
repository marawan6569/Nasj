# Security policy

NASJ is in early development. Please do **not** submit private Nginx configurations, access tokens, credentials or internal infrastructure addresses in public issues.

For sensitive issues, contact the maintainer privately through GitHub rather than opening a public issue. Do not assume reports or logs have been fully sanitized.

NASJ is intended to be read-only and offline-first.

Static mapping only reads explicitly selected configuration and declared includes.
The default include boundary is the canonical configuration prefix; opting into
external includes expands that scope. Input is bounded and must be regular UTF-8
files. Existing output paths/symlinks are never overwritten. No Nginx reload,
privilege escalation, Docker socket access, discovery or telemetry is performed.

Reports omit unrelated configuration/headers/return bodies, redact URL userinfo,
query/fragment contents and sensitive attribute values, and escape all untrusted
HTML/XML/DOT strings. HTML embeds local assets and denies network access with a
script-hash CSP. Infrastructure names, document paths and source paths remain
visible. Generic secret recognition is not guaranteed; review before sharing.

For hostile filesystem trees that can change concurrently, use a trusted snapshot.
Path canonicalization is not an operating-system isolation boundary. Static edges
are configured declarations; they never verify runtime reachability or effective
request routing. Do not use unresolved routes as confirmed evidence.
