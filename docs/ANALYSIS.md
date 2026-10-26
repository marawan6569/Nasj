# Static analysis contract

`nasj map --config nginx.conf --format json` reads a complete root configuration
and its declared includes. JSON, DOT, SVG and offline HTML are available. It does not run
Nginx or validate module availability. Use Nginx's own validation separately in
an environment you control; NASJ never invokes it.

Relative includes resolve against the root configuration directory, including
includes nested inside other files. `--prefix DIR` changes that configuration
prefix. Globs are sorted; repeated files expand in each context; canonical-path
cycles fail. By default all includes must stay within the canonical prefix,
including symlink targets. `--allow-external-includes` explicitly permits declared
paths outside that boundary. An unmatched glob emits informational `include.empty`;
missing literals and failed glob enumeration/reads fail. This follows optional
Nginx glob behavior and does not mean the configuration is invalid.
Input must be regular UTF-8 files. Paths are not expanded as shell commands or
environment variables. Nonblocking opens reject special files without waiting
on a FIFO. Concurrent malicious replacement of an entire directory tree is not
a supported isolation boundary; analyze a trusted snapshot for that scenario.

Budgets: 4 MiB/file, 16 MiB total reads, 1024 file expansions, 32 include levels,
64 combined syntax levels, 200,000 syntax tokens/file. Limits fail without a
partial report. No configuration is modified. Output files use create-new and
refuse existing files/symlinks, protecting configuration and previous reports.
On Unix, newly created reports use mode 0600. Diagnostics are also printed to
stderr, including in strict mode. Empty-glob patterns appear only in this local
operator context, redacted and control-escaped with bounded display length. The
pattern/context is excluded from all report formats.

HTTP mapping covers explicit port/address/IPv6/Unix listeners, `listen ... ssl`,
server names, exact/prefix/preferred-prefix/regex/named locations, nested
locations, HTTP(S) proxy targets, named upstreams and multiple configured members,
return responses/redirects and document roots/aliases. Bare IP/name listeners
use the configured default port 80; a server without a supported explicit listen
directive warns instead of inventing a privilege-dependent listener.

Root inheritance is represented; local alias overrides an inherited root. A local
proxy handler suppresses static destination edges even when root is configured.
Root is retained as `configured_root`, `root_origin` and `root_source` inspection
metadata. Ordinary nested prefix/named locations select their own pass handler;
they do not inherit the parent's proxy_pass. Alias inheritance is not resolved and
emits `alias.inheritance` with an unresolved owner. Duplicate routing directives
or conflicting root/alias declarations also mark the context unresolved and omit
effective destination edges, propagating uncertainty to empty child locations.
Return bodies are omitted. Location precedence, rewrite execution, variable
evaluation, DNS, socket existence, filesystem existence of document roots and
request simulation are not implemented. A variable anywhere in proxy_pass is
conservatively unresolved, even if its authority looks static. Duplicate upstream
names are unresolved, matching names case-insensitively.

Simple server-level conditional returns are recorded in directive order: literal
`$variable = value` / `!=` tests, with one return in each if body. True edges lead
to return actions; false edges lead to the next decision or fallback return. The
first unconditional return stops this sequence. Redirect variables stay symbolic;
response bodies remain omitted. A missing fallback reaches an unresolved location
selection step. This is a control-flow description, not a request outcome or
variable substitution. See [ADR-0004](adr/0004-ordered-conditional-returns.md).

Other contexts with `if`, set, rewrite, try_files, error_page, mirror, limit_except or known
embedded handlers are unresolved and do not get effective proxy edges. Ancestor
uncertainty propagates into nested locations. Inherited error_page also prevents
terminal-response inference. Unsupported FastCGI/uWSGI/SCGI/gRPC handlers warn and
suppress effective static/proxy destinations before edges are emitted. Their
ordinary nested locations still select their own handlers and may serve static
content. These warnings describe analysis limits, not invalid Nginx configuration.
Stream/mail and unknown nested contexts warn and are not traversed as HTTP
routes. Embedded-language blocks fail syntax parsing. Unknown ordinary directives
are retained in the internal AST but are not otherwise exported or evaluated.
These conservative exclusions can omit configured destinations; warnings make
that limitation visible. Static `configured` edges never assert runtime truth.

`--strict` produces no report on Warning or Error diagnostics. Info diagnostics
remain visible and do not cause failure. Input/syntax/include errors are Error
and abort with no report regardless of strict mode. Unsupported static analysis
is Warning, not proof of invalid Nginx. Legacy diagnostics without severity default
to Warning. The JSON `warnings` field retains its old name but holds all severity
levels; HTML distinguishes them by text labels and colors. The diagnostics/source inspector
are essential when consuming a non-strict map. The experimental schema is
documented in [JSON_FORMAT.md](JSON_FORMAT.md).
