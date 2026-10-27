# Experimental JSON topology schema

`schema_version` starts at `0.1` but is not finalized.

```json
{
  "schema_version": "0.1",
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
and redirect. Container/service/process are reserved for future discovery.

Edges contain `from`, `to`, snake_case `kind`, nullable `source`, and `evidence`.
Static analysis emits only `configured`; demo edges are `synthetic`. The model
reserves `confirmed`, `inferred`, and `unresolved` for future evidence consumers;
their presence in the enum does not implement discovery.
Missing legacy `evidence` fields default to `unresolved`, never `configured`.
Dynamic/conditional destinations produce warnings and an owner attribute `routing: unresolved`, with
no invented proxy edge. Configured edges describe declarations, not successful
requests, DNS resolution, endpoint reachability or location precedence.

Warnings have `code`, fixed explanatory `message`, and nullable `source`. Syntax,
read, include-scope and resource-limit failures return an error and no graph.
Semantic limitations are warnings; `map --strict` rejects any warning. Unknown
unrelated directives are ignored. No complete Nginx validity check is implied.

URL userinfo and all query/fragment contents are redacted. Return response bodies
and unrelated directives/headers/certificate contents are omitted. Sensitive
attribute names are additionally redacted at export. Hostnames, document paths
and source paths are intentionally visible; review reports before sharing.
