# ADR-0001: bounded generic Nginx syntax and owned include resolution

Date: 2026-10-26. Status: implemented for review; not merged. Related: #2, #3.

## Evidence

Inspected published source and crates.io metadata, then ran
`cargo run --locked --manifest-path tools/parser-spike/Cargo.toml` on sanitized
fixtures. The spike is an isolated workspace; its dependencies are not linked
into NASJ. `cargo test --locked --manifest-path tools/parser-spike/Cargo.toml`
reproduces the key shortcomings. A published `nginx-config-parser` crate was not
found (crates.io API returned 404), so no behavior is attributed to that name.

| Candidate | Latest release inspected / license | AST and locations | Observed limitations |
| --- | --- | --- | --- |
| [nginx-config](https://docs.rs/nginx-config/0.13.2/nginx_config/) | 0.13.2, 2018-08-15; MIT/Apache-2.0 | Typed directive enum and positions | Rejects basic fixture at `events`, extension directives and escaped single quote fixture; directive allowlist needs continual extension. Error path prints parser internals. |
| [nginx-lint-parser](https://github.com/walf443/nginx-lint) | 0.24.0, 2026-09-20; MIT | Generic AST + lossless Rowan CST, byte spans, line/column, recovery API | Accepts basic/extensions/escaping, rejects CRLF fixture, accepts invalid quoted-token adjacency. No owned bounded include resolver. AST variable values strip `$`; adapter must preserve raw semantics. |
| [misc-conf](https://github.com/metaworm/misc-conf) | 0.1.2, 2023-03-22; MIT | Generic directives, no source positions in successful AST | Accepts generic/escaping/CRLF fixtures but accepts invalid quote adjacency. Include expansion source uses `.flatten()` on glob errors, no cycle/budget guards, and discards provenance. |
| [nginx-discovery](https://github.com/urwithajit9/nginx-discovery) | 0.4.0, 2026-01-30; MIT OR Apache-2.0 | Parser/extractors/discovery APIs | Source-only assessment, not spike-tested: default system interactions and broad async/network/CLI dependencies exceed the offline syntax layer's scope. |

All three executed candidates reject the unclosed-block fixture. Boolean success
does not prove decoded argument equivalence; NASJ tests assert actual values and
provenance. Release dates indicate published maintenance activity, not guarantees
of future support. Upstream metadata/source URLs are the evidence, not third-party
recommendations.

## Decision and alternatives

Use a focused generic lexer and recursive-descent parser in `nasj-core::syntax`,
without regex parsing or a production parser dependency. Keep syntax independent
of directive-specific semantics and IO. Implement include expansion separately,
retaining each directive's origin and bounding filesystem reads.

Extending nginx-config would require an open-ended directive grammar change.
Adapting nginx-lint-parser is viable and the best external alternative; however,
CRLF, delimiter strictness, escape/variable normalization and resource preflight
would still need a NASJ lexical pass. Its formatter/CST/recovery machinery is
unneeded for read-only mapping. Extending misc-conf would require provenance and
resolver safety changes as well. A small owned parser makes these contracts
explicit, at the cost of maintaining lexical compatibility. Revisit this choice
if broader embedded-language or lossless-editing needs arise.

## Lexical and filesystem contracts

The behavioral reference is Nginx's
[ngx_conf_read_token and ngx_conf_include](https://github.com/nginx/nginx/blob/master/src/core/ngx_conf_file.c),
inspected on the assessment date. This is an independent implementation, not
copied C source. Tokens support single/double quotes, comments at token boundaries,
`${variable}`, escaped quotes/backslashes, and Nginx's `n/r/t` decoding. Unknown
escapes retain the backslash. A quote at the beginning of a token requires a
delimiter after its closing quote. Regex quantifiers containing `{` must be quoted
or escaped, as in Nginx. Tokens retain variables; no regex or variable evaluation.

Limits: 4 MiB/file, 200,000 lexical tokens/file and 64 nested blocks. Syntax errors
fail closed with fixed messages and source locations; no error recovery produces
a seemingly complete topology. Unknown directives remain generic AST nodes.
Lua/raw code blocks are unsupported and fail explicitly. NASJ is not `nginx -t`:
module availability and full directive/context validation are outside its scope.

The resolver in the next PR must resolve relative includes against the root
configuration directory (or an explicit configuration prefix), sort glob matches,
track canonical paths on the active stack, permit repeated noncyclic includes,
reject special files, and bound total bytes/files/depth. Missing literal includes
are errors; unmatched globs produce diagnostics. No files are executed, modified,
or automatically discovered outside explicitly selected input/include paths.

## Acceptance and consequences

The checked-in fixtures cover nested contexts, IPv6, regex, variables, quotes,
escapes, comments, malformed input and extension directives. NASJ syntax tests
also assert CRLF, line provenance, no raw token leakage in errors and limits.
Recursive/glob filesystem behavior is validated with the resolver in the next PR;
syntax-only parsers cannot establish that contract. Runtime discovery stays
deferred. Public syntax AST values contain raw configuration and must never be
serialized directly into reports.
