# NASJ implementation plan

Current status (2026-10-27): [NASJ v0.1.0 is officially released](https://github.com/marawan6569/Nasj/releases/tag/v0.1.0)
at `b60cb2e045fc9476034bffba7967b8674825fa18`. Main is the default development
branch; the release tag is immutable. Branch protection remains explicitly deferred.
The earlier sections below preserve historical commits, test counts, permissions
and former blockers; current publication evidence is in the final execution-log
entry and [release readiness](RELEASE_READINESS.md).

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
skipped all later checks. The initial server had no Rust or GitHub CLI. GitHub
connector authentication and SSH repository read access work. Install Rust in
the user account, use authenticated Git/connector operations, and record the
GitHub CLI limitation. Branding was unavailable in this initial assessment; the official branding
follow-up below resolves that earlier blocker.

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
risks and the next task. Initial blockers (historical): unavailable corrected branding assets;
GitHub CLI unavailable (connector and SSH Git are alternatives). Repository branch
protection requires an API/settings capability and appropriate plan/permissions;
record actual status and do not imply required checks are enforced without proof.

## Implemented review stack

Execution progressed beyond planning. These changes are implemented for review,
not merged/released. See [EXECUTION_LOG.md](EXECUTION_LOG.md) for checks and risks.

| Work | PR | Implementation commit |
| --- | --- | --- |
| P0 stabilization and this plan | #1 | `7f252d6` |
| P1a parser comparison, ADR and syntax | #8 | `e7851e8` |
| P1b includes and real topology | #9 | `976a015`, `925c24f` |
| P2 SVG and offline HTML | #10 | `989e63a` |
| P3 docs and release readiness | #11 | `88dff67` |
| P4 future architecture only | #12 | `0321792` |
| Final uncertainty/provenance/safety audit | #13 | `b9c3d16` |

The current preview has 26 workspace tests plus the isolated parser comparison
and offline Chromium suite. Branding was still pending at that phase; approved originals are now
integrated by the official branding follow-up. Repository required-check enforcement remains unverified. v0.2/v0.3 code
is intentionally deferred; final schema/release decisions require review.


## Final v0.1 UX scope

The provisional vhost visualization is the accepted direction; no redesign or
framework is planned before v0.1. The focused follow-up on #17 adds bounded
routing-aware global search, useful configured-host selection, readable framing
and mobile gesture/inspector polish. Parser/model/schema 0.2 stay unchanged.
See [VALIDATION_PLAN.md](VALIDATION_PLAN.md) for execution and
[RELEASE_READINESS.md](RELEASE_READINESS.md) for Ready/Needs Review/Blocked gates,
merge order, licensing, packaging and maintainer verification commands.


## Official branding follow-up

The maintainer archive is now available and inspected. On `docs/official-branding`
(base #18), selected originals, documented display copies, themed offline PNGs,
English/Arabic landing pages and a normalized synthetic screenshot resolve the
missing-assets implementation blocker. Check asset provenance with
`python3 tools/branding.py --check`; see assets/logos/README.md and the current
release readiness report. Issue #6 still requires review/merge, and repository
protection/schema/packaging/release approval remain maintainer decisions.
