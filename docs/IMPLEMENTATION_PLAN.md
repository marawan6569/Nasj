# NASJ implementation plan

Assessed 2026-10-26 against bootstrap `de99e0b`, draft PR #1 and issues #2–#7.
This is an execution plan, not a claim that the milestones have shipped. Issues
remain open until their acceptance criteria are met and the work is merged.

## Assessment

The three-crate workspace is appropriate: `nasj-core` owns input, syntax,
resolution, semantics and the canonical model; `nasj-export` consumes that model;
`nasj-cli` owns arguments and filesystem/output IO. Keep dependency direction
CLI → core/export and export → core. No UI or runtime discovery in core.

Implemented: experimental schema 0.1, JSON/DOT rendering, synthetic demo, CLI
placeholder for map. Missing: actual parsing, include resolution, semantic
mapping, SVG/HTML, redaction, confidence/evidence and meaningful regression tests.
The bootstrap does not pass formatting; PR #1's only CI run failed at fmt and
skipped all later checks. The initial server has no Rust or GitHub CLI. GitHub
connector authentication and SSH repository read access work. Install Rust in
the user account, use authenticated Git/connector operations, and record the
GitHub CLI limitation. Approved branding PNGs are absent.

Technical debt: no Cargo.lock for the executable workspace; very sparse tests;
stdout uses a panic-prone print macro; CI excludes stacked PR bases; DOT escaping
has no hostile-input fixtures; schema has no explicit static/runtime distinction.
Existing public types are experimental, so document model changes before v0.1.

## Dependencies and small PRs

1. **P0 / PR #1, bootstrap stabilization (issue #7).** Format, lock dependencies,
   strengthen output handling and DOT/CLI regression checks, run all four required
   Cargo commands, fix CI for stacked branches. Keep synthetic labeling explicit.
   Deliver this plan and update PR evidence. Never merge automatically.
2. **P1a / parser research (issue #2), based on PR #1.** Compare existing Rust
   parsers against sanitized fixtures and upstream Nginx lexical/include behavior.
   Record licensing, maintenance, source spans, recovery and variable handling in
   ADR-0001. A focused lexer/recursive-descent parser is an option only after the
   comparison. Deliver executable comparison tests, a syntax AST and fixtures.
3. **P1b / configuration mapping (issue #3), based on P1a.** Implement bounded,
   read-only input → AST → include expansion → semantic topology. Deliver `map`
   with JSON/DOT, deterministic IDs, provenance and diagnostics. Expand the schema
   to distinguish configured relationships, unresolved routes and future runtime
   evidence. Validate inheritance and conditional contexts conservatively.
4. **P2 / portable reports (issue #4), based on P1b.** Finish documented JSON/DOT;
   add deterministic, self-contained SVG layout and an offline HTML viewer using
   the same graph. Embed local JS/CSS; support zoom, pan, selection, search, kind
   filters, source inspection, responsive layout and themes. Deliver golden and
   injection regression tests plus actual offline browser checks.
5. **P3 / documentation and release readiness (issue #6), based on P2.** Update
   English/Arabic READMEs, install/usage, architecture, contribution guide,
   changelog and release checklist to match verified behavior. Publish corrected
   assets only if approved originals are available; otherwise record that blocker.
6. **P4 / future architecture (issue #5), documentation only.** Specify optional
   v0.2 discovery adapters with observation provenance, time, namespaces and
   confidence; defer implementation. Specify optional v0.3 localhost server and
   reuse of core/export APIs. No Docker socket, process inspection or server now.

Each new milestone uses a dedicated branch and a PR against its predecessor while
PR #1 awaits review. Keep commits focused, run checks before every push, inspect
Actions after pushing, and list dependency PRs in descriptions. Maintainers decide
merges, schema approval and releases. Do not close issues from unmerged work.

## Candidate dependencies and decisions

- Keep serde/serde_json for typed, versioned JSON; BTreeMap and ordered traversal
  provide deterministic output. Commit Cargo.lock and use locked CI commands.
- Keep clap derive for typed CLI validation; avoid an async runtime for static IO.
- Investigate `nginx-config` and `nginx-config-parser` plus any actively maintained
  alternative. Test actual crate releases rather than relying on descriptions.
  A parser must retain generic directives, nested blocks and file/line positions.
- Consider `glob` for include patterns: small and well tested, but expansion must
  be sorted, bounded and checked for unreadable files/cycles. Includes resolve
  relative to the Nginx configuration prefix, not each included file's directory.
- Prefer standard-library errors and explicit diagnostics over an error framework
  until complexity justifies one. Never expose raw secrets in parser errors.
- Prefer a small native SVG layout and embedded vanilla JavaScript over Graphviz
  as a mandatory runtime executable or a large network-sourced JS graph library.
  Trade-off: simpler automatic layout and lower scalability; document limits.
- Browser automation is a development-only tool, not a report/runtime dependency.

## Security and correctness requirements

- Never modify/reload Nginx, elevate privileges, connect to Docker or make network
  requests during analysis/report viewing. Configuration is untrusted input.
- Bound bytes, include depth/file count and syntax nesting; reject special files;
  detect canonical-path cycles, preserve directive order and report missing input.
  Make include prefix and read scope explicit. Test symlinks and traversal.
- Preserve exact source file/line provenance without embedding raw configuration.
  Allowlist exported semantics; redact URL userinfo, query/fragment credentials
  and sensitive attribute values. Do not claim arbitrary configs are fully safe
  to publish: hostnames and paths are intentionally visible infrastructure data.
- Escape DOT strings and XML text/attributes. HTML uses inert serialized data and
  textContent, no eval/innerHTML on input, no external assets, and a restrictive CSP.
- Static configuration is not runtime verification. Dynamic authorities,
  conditional rewrites and unsupported routing produce diagnostics and unresolved
  evidence; never fabricate confirmed destination edges.
- Report malformed input with structured code/location. Do not turn partial
  parsing into a successful complete map. Keep unknown unrelated directives from
  becoming guessed routing. No unwrap/expect in recoverable production paths.

## Validation and acceptance

Before review and each push run exactly the workspace gates:

```sh
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
cargo build --workspace
```

Fixture matrix: IPv4/IPv6 + TLS listeners; virtual hosts; exact/prefix/regex/nested
locations; multiple upstream members; static proxy target and variable authority;
redirect/root/alias; comments, quoted tokens, escaped quotes, regex quantifiers;
include globs, nested includes, repeated files, cycles, unreadable/missing/special
files; malformed blocks, oversized/deep input; conditional and inherited routing;
HTML/XML/DOT injection and credentials. Assert provenance and absent invented edges.

Use unit tests for lexical boundaries/model invariants; fixture integration tests
for complete input pipelines; CLI subprocess tests for exit/output behavior; JSON
round trips and deterministic export/golden tests. Validate SVG XML, DOT with
Graphviz when available, and HTML in a browser offline with request/error capture.
Avoid tests that only duplicate implementation. Document checks unavailable on
the server rather than claiming success.

v0.1 is reviewable when real configs produce accurate configured topology in all
four formats, uncertainty and diagnostics survive exports, reports work offline,
the security fixtures pass, all Cargo gates/CI pass and docs describe limitations.
Release still requires maintainer approval and the release checklist. Do not
start runtime discovery to compensate for incomplete static analysis.

## Phase reports and blockers

Each phase report lists changes, verification evidence, commits/PRs, limitations,
risks and the next task. Initial blockers: missing corrected branding assets;
GitHub CLI unavailable (connector and SSH Git are alternatives). Repository branch
protection requires an API/settings capability and appropriate plan/permissions;
record actual status and do not imply required checks are enforced without proof.
