# ADR-0004: narrow ordered conditional returns and handler precedence

Status: implemented and merged via #14/#17, unreleased. Product milestone: v0.1.

The field report and all PR #9/#10 comments were reviewed against cumulative
`e035f6b`. Two destination bugs remained: inherited root was emitted beside a
proxy, and unsupported content handlers were diagnosed after static edges were
created. Handler choice now precedes destination emission. Root remains explicit
configuration metadata with origin/source, not an alternative effective route.

Nginx's [rewrite documentation](https://nginx.org/en/docs/http/ngx_http_rewrite_module.html)
establishes sequential server rewrite instructions, terminating return, literal
variable comparisons and symbolic URL interpolation. NASJ records that control
flow without evaluating variables or predicting request matching. Supported
server-level `if` uses `$variable = literal` or `!=`, with exactly one `return`
in its body. False edges chain to subsequent decisions/return. The first
unconditional return terminates the recorded sequence; later returns are omitted.
Response bodies remain omitted. Dynamic redirect URLs are expressions, never
infrastructure endpoint nodes or invented constant URLs. Missing fallbacks point
to an unresolved location-selection step. Regex/truthiness/file tests, nesting,
set/rewrite/break, location-level conditionals and error_page interaction stay
conservative. This describes instructions, not verified response reachability.

The [proxy merge source](https://github.com/nginx/nginx/blob/master/src/http/modules/ngx_http_proxy_module.c)
limits pass inheritance to special unnamed contexts, rather than ordinary nested
prefix/named locations. The previous nested-proxy test asserted the wrong behavior
and is corrected. Ordinary children inherit root and choose their own handler;
unsupported parent handlers are not spread into otherwise static children.
Special unnamed/limit_except contexts remain unsupported. See also
[FastCGI merge source](https://github.com/nginx/nginx/blob/master/src/http/modules/ngx_http_fastcgi_module.c).

## Model and compatibility

Experimental **schema 0.2** is independent of product v0.1 (and the planned v0.2
discovery release). This deliberate revision adds node kinds `condition`,
`response`, `routing_step`; optional typed `Node.condition` with variable,
equal/not_equal operator, display value and redaction flag; and edges `evaluates`,
`when_true`, `when_false`, `responds_with`. Existing redirect actions retain
`redirect` kind, now exposing status/target_expression/destination_resolution.
Both conditional branches carry configured evidence: they assert declared guarded
instructions, not that the condition is true. Unresolved variable destinations
remain marked on the action. No edge identifies a fabricated backend.

Old schema 0.1 graph data remains deserializable; missing provenance/evidence
still defaults unknown/unresolved. Old consumers with exhaustive enums must
update for schema 0.2. Rust Node constructors must provide condition: None when
unused. No stable public release exists, so making the distinction explicit now
is preferable to overloading an unconditional route edge. Schema changes are
documented for reviewer approval; no broader request interpreter is introduced.

Tests assert absent false destinations, ordinary nested handler boundaries,
guard/true/false order, first-return termination, unchanged variable expressions,
file/line metadata, unsupported cases, private-value omission and all exporters.
