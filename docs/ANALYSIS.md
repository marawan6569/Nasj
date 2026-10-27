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
paths outside that boundary. An unmatched glob warns; missing literals fail.
Input must be regular UTF-8 files. Paths are not expanded as shell commands or
environment variables. Nonblocking opens reject special files without waiting
on a FIFO. Concurrent malicious replacement of an entire directory tree is not
a supported isolation boundary; analyze a trusted snapshot for that scenario.

Budgets: 4 MiB/file, 16 MiB total reads, 1024 file expansions, 32 include levels,
64 combined syntax levels, 200,000 syntax tokens/file. Limits fail without a
partial report. No configuration is modified. Output files use create-new and
refuse existing files/symlinks, protecting configuration and previous reports.

HTTP mapping covers explicit port/address/IPv6/Unix listeners, `listen ... ssl`,
server names, exact/prefix/preferred-prefix/regex/named locations, nested
locations, HTTP(S) proxy targets, named upstreams and multiple configured members,
return responses/redirects and document roots/aliases. Bare IP/name listeners
use the configured default port 80; a server without a supported explicit listen
directive warns instead of inventing a privilege-dependent listener.

Root and location proxy_pass inheritance are represented; local alias overrides
an inherited root. Alias inheritance into nested locations is not resolved.
Return bodies are omitted. Location precedence, rewrite execution, variable
evaluation, DNS, socket existence, filesystem existence of document roots and
request simulation are not implemented. A variable anywhere in proxy_pass is
conservatively unresolved, even if its authority looks static. Duplicate upstream
names are unresolved, matching names case-insensitively.

Contexts with `if`, rewrite, try_files, error_page, mirror, limit_except or known
embedded handlers are unresolved and do not get effective proxy edges. Ancestor
uncertainty propagates into nested locations. Known non-HTTP proxy handlers warn.
Stream/mail and unknown nested contexts warn and are not traversed as HTTP
routes. Embedded-language blocks fail syntax parsing. Unknown ordinary directives
are retained in the internal AST but are not otherwise exported or evaluated.
These conservative exclusions can omit configured destinations; warnings make
that limitation visible. Static `configured` edges never assert runtime truth.

`--strict` produces no report on any warning. The JSON warnings/source inspector
are essential when consuming a non-strict map. The experimental schema is
documented in [JSON_FORMAT.md](JSON_FORMAT.md).
