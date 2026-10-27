# Experimental JSON topology schema

The current experimental format is **schema 0.2**, independent of the upcoming
product v0.1 release. Previous schema 0.1 data is still readable, but old consumers
must update for the new enums and optional condition metadata. No stable release
compatibility promise has been made. See [ADR-0004](adr/0004-ordered-conditional-returns.md).

```json
{
  "schema_version": "0.2",
  "analysis": "configuration",
  "sources": [],
  "nodes": [],
  "edges": [],
  "warnings": []
}
```

Consumers should not rely on stable node IDs until v0.1 is released.

`analysis` is `configuration` for real static analysis, `synthetic` for `demo`,
or `unknown` when provenance is absent (including legacy deserialized graphs).
No runtime verification is performed. `sources` is the sorted, deduplicated list
of canonical configuration file paths read. Nodes and edges preserve directive
locations as `{ "path": "...", "line": 1 }`; inherited directives retain their
original location. Raw configuration is never included.

Nodes contain `id`, snake_case `kind`, `label`, nullable `source`, and an ordered
map of string `attributes`. IDs follow deterministic traversal (`n000001`, ...):
unchanged input/prefix yields identical output; edits can renumber later nodes.
Kinds include domain, listener, server, location, upstream, target, static_root
and redirect. `response` is a return action, `condition` is a symbolic decision,
and `routing_step` is an unresolved phase continuation. Container/service/process
are reserved for future discovery.

Condition nodes have typed `condition: { variable, operator, value, value_redacted }`.
Operators are `equal` / `not_equal`; values are display data, never evaluated.
This optional field is omitted for other nodes. Sensitive comparison values are
redacted or the condition is conservatively unsupported. Redirect actions carry
`status`, `target_expression` and `destination_resolution` (literal/dynamic).
Dynamic expressions retain `$host`/`$request_uri`; no endpoint is fabricated.

Edges contain `from`, `to`, snake_case `kind`, nullable `source`, and `evidence`.
Static analysis emits only `configured`; demo edges are `synthetic`. The model
reserves `confirmed`, `inferred`, and `unresolved` for future evidence consumers;
their presence in the enum does not implement discovery.
Missing legacy `evidence` fields default to `unresolved`, never `configured`.
Unsupported routing produces warnings and `routing: unresolved`, with no invented
proxy edge. Supported conditional programs use `evaluates`, `when_true`,
`when_false`, `responds_with` and existing redirect edges. Their configured
evidence describes guarded instructions, not a guarantee the branch is taken.
Configured edges describe declarations, not successful
requests, DNS resolution, endpoint reachability or location precedence.

Warnings have `code`, fixed explanatory `message`, and nullable `source`. Syntax,
read, include-scope and resource-limit failures return an error and no graph.
Semantic limitations are warnings; `map --strict` rejects any warning. Unknown
unrelated directives are ignored. No complete Nginx validity check is implied.

URL userinfo and all query/fragment contents are redacted. Return response bodies
and unrelated directives/headers/certificate contents are omitted. Sensitive
attribute names are additionally redacted at export. Hostnames, document paths
and source paths are intentionally visible; review reports before sharing.
