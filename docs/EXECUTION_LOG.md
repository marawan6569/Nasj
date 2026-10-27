# Execution log

Current status (2026-10-27): [NASJ v0.1.0 is officially released](https://github.com/marawan6569/Nasj/releases/tag/v0.1.0)
at `b60cb2e045fc9476034bffba7967b8674825fa18`. Main is the default development
branch; the release tag is immutable. Branch protection remains explicitly deferred.
The earlier sections below preserve historical commits, test counts, permissions
and former blockers; current publication evidence is in the final execution-log
entry and [release readiness](RELEASE_READINESS.md).

## P0 — bootstrap stabilization, 2026-10-26

Baseline: PR #1 at `de99e0b` failed GitHub Actions at formatting; subsequent CI
steps were skipped. Local baseline Clippy, three tests and build passed after
installing Rust 1.99.1, Cargo, rustfmt and Clippy in the user account.

Changes: formatted all Rust; committed executable workspace Cargo.lock; handled
stdout IO/broken pipes; hardened DOT control-character escaping; added CLI and
hostile-output fixture regressions; enabled CI on stacked PRs and locked Cargo
checks; pinned checkout to the SHA recorded by the original CI run and disabled
persisted credentials. Added the implementation plan. Crate boundaries preserved.

Validation: all four required workspace commands passed locally, seven tests.
The demo produces valid JSON with three nodes/two edges and DOT output. The map
placeholder still fails explicitly. No parser/report support is claimed here.

GitHub CLI is absent; authenticated GitHub connector and SSH Git are available.
Required-check/branch-protection configuration cannot be managed by the available
connector operations; enforcement is unverified and issue #7 remains open.
Approved logo assets were unavailable at this initial inspection (resolved in the official branding follow-up). No issues closed or PRs merged.

Next: parser comparison fixtures and ADR for issue #2 on a dependent branch.

## P1a — parser research

PR #1 CI passed on `7f252d6` (Actions run 40393434723). Researched and executed
three published parser candidates in an isolated spike. ADR-0001 records concrete
behavior, maintenance/licensing and alternatives. Implemented a bounded generic
syntax parser with source locations and no production dependencies; added
sanitized syntax and malformed-input fixtures. Include resolution remains the
next focused PR. Neither parser research nor mapping is marked merged/completed.

## P1b — real configuration mapping

PR #8 CI passed at `e7851e8` (Actions run 40393921731). Implemented bounded,
read-only includes with prefix confinement, explicit external-include opt-in,
globbing, cycles and original provenance. Added conservative HTTP semantics,
configured/synthetic evidence, source metadata, URL redaction, and functional
`map` JSON/DOT. Output creation refuses overwrites; strict mode rejects warnings.
Fixtures cover recursive/glob includes, IPv6/TLS, virtual hosts, locations,
upstreams, redirects, static paths, conditional/variable routes and failures.
See ANALYSIS.md for conservative exclusions and limits. Discovery remains absent.

Validation for P1b: fmt, Clippy with warnings denied, all 19 workspace tests and
build passed. Review found and fixed Unix socket URL authority parsing, with a
regression fixture. PR #9 at `925c24f` passed Actions run 40394983790.

## P2 — portable SVG and offline HTML

Added native deterministic SVG layering and an embedded HTML viewer with zoom,
pan, mouse/keyboard node selection, search, filters, source/evidence inspector,
diagnostics navigation, responsive layout and light/dark themes. JSON/DOT/SVG
goldens and hostile/empty/cyclic graph tests exercise the shared model. Export
validation rejects duplicate IDs and dangling endpoints. DOT shows configured
evidence and warnings. HTML escapes inert JSON and XML, uses DOM text creation,
and allows only the checked-in viewer script hash under a network-denying CSP.
No runtime renderer dependencies added. See REPORTS.md.

Validation: all four workspace gates pass, 23 tests; CSP hash check passes.
Chromium 156 / Playwright 1.64.1 passed actual offline file:// browser checks for
interactions, mobile overflow, sources/evidence, themes, hostile and empty input,
and zero external requests/browser errors. Desktop/mobile screenshots reviewed.
Missing Chromium libraries/fonts were extracted into /tmp under user permissions;
no system package install or privilege escalation. Graphviz 14.1.2 independently
accepted ordinary and hostile DOT using temporary local libraries/plugins.

Limitations: SVG layout can have crossing edges and requires zoom on larger maps;
the browser suite currently covers Chromium only. No arbitrary config secret
detection or runtime verification is promised. Corrected branding was unavailable in this phase (now integrated in the branding follow-up).
Next: documentation/release checklist and future discovery/server architecture.

## P3 — documentation and release readiness

PR #10 passed Actions run 40396305004 on `989e63a`, including the offline browser
suite. Updated English/Arabic README installation and actual CLI examples,
architecture/specification/roadmap status, contributor/security guidance,
changelog and first-release checklist. Checked local documentation links and
CLI help. No screenshots or unapproved logo artwork added to the repository.
Approved corrected PNGs were not yet supplied at this phase; branding issue #6 stays pending. Required
repository branch protections remain unverified. No PRs merged or issues closed.

Validation: all four workspace gates pass (23 tests), local Markdown links exist,
and `cargo install --locked --path crates/nasj-cli --root /tmp/nasj-install-preview`
succeeded. The installed optimized binary mapped the Unix fixture in strict mode.

## P4 — future architecture only

ADR-0002 proposes optional snapshot-first discovery adapters, explicit permissions,
namespace/time/identity evidence and confirmed/inferred/unresolved correlations.
ADR-0003 proposes an optional loopback server with immutable selected snapshots,
authentication, host/origin checks and a separate online CSP. Primary Docker,
systemd and kernel documentation informed the proposals. No discovery/server
crates, commands, dependencies, sockets or privileged operations were introduced.
Issue #5 stays open; v0.2 implementation is deferred until v0.1 is validated.

## Final audit — uncertainty and report confidentiality

Found and fixed silent nested-alias/duplicate-directive uncertainty, including
empty child locations. Invalid numeric/Unix listeners now warn without invented
listeners. Added fixture regressions; indexed node/upstream lookup avoids repeated
linear scans on large uncertain graphs. Legacy JSON missing evidence/provenance
defaults to unresolved/unknown, and exporters label it honestly. Normal static
analysis still explicitly emits configured evidence; demo remains synthetic.

New reports use Unix mode 0600 and refuse existing paths; CLI prints fixed
diagnostics with escaped source paths even in strict mode. Input opens additionally
reject final-component symlink replacement. No discovery or privileged IO added.
Validation after audit: 26 workspace tests; required gates and browser/CSP checks
are rerun for this review branch. No PRs merged, releases made or issues closed.

## Review handoff

| Phase | Changed areas | PR / implementation commit | Verified Actions run |
| --- | --- | --- | --- |
| P0 | Workspace, CLI/DOT checks, lockfile, CI, plan | #1 / `7f252d6` | 40393434723 passed |
| P1a | core syntax, fixtures, isolated spike, ADR | #8 / `e7851e8` | 40393921731 passed |
| P1b | core input/semantics/model/redaction, CLI, fixtures | #9 / `925c24f` | 40394983790 passed |
| P2 | exporters/viewer, goldens, browser tools/CI | #10 / `989e63a` | 40396305004 passed |
| P3 | READMEs, architecture/spec/security/contribution/release docs | #11 / `88dff67` | 40396988049 passed |
| P4 | proposed discovery/server ADRs, roadmap | #12 / `0321792` | 40397413019 passed |
| Final audit | core/CLI/exporter safety and negative regressions | #13 / `b9c3d16` | Check current PR head |

Review in dependency order; PR #1 remains a draft. Final branch is
`fix/analysis-uncertainty-hardening`; main was not pushed. All work remains
unmerged. At this handoff, unavailable branding assets, unverified repository protections, experimental
schema/renumbering IDs, conservative semantic exclusions, simple graph layout and
Chromium-only browser coverage are the remaining release concerns. The next task
is maintainer review and release-checklist validation, not runtime discovery.

## Field validation — routing correctness follow-up

Reviewed all PR #9/#10 discussions against `e035f6b`; both effective-destination
findings remained reproducible. Handler precedence now suppresses inherited root
edges for proxies and unsupported handlers while retaining root source metadata.
Source review also corrected ordinary nested pass inheritance and its old test.
Added typed symbolic decisions/ordered true-false return actions under experimental
schema 0.2, source provenance, no variable substitution, explicit unresolved
fallthrough and conservative unsupported cases. ADR-0004 records scope and
compatibility. All four exporters and conditional JSON/DOT/SVG goldens updated.
Only synthetic fixtures are used; no real deployment data/configuration was read.

## Field validation — diagnostic severity

Added Info/Warning/Error diagnostics, retaining the legacy serialized `warnings`
collection and Warning type alias. Optional unmatched globs are Info; required
literal/read failures remain Error and abort regardless of strict mode. Strict
mode blocks Warning/Error, permits Info, and still prints all diagnostics. Local
CLI context shows a bounded control-escaped, URL-redacted pattern; local_context
is stripped at export and never serialized. HTML, SVG and DOT show severity.
Added strict-mode, missing literal, control/credential redaction, exported privacy,
legacy severity and offline severity-panel checks. PR #14 CI passed at `88af4d2`.

## Field validation — grouped visualization

Added semantic server identity (names/listeners/source), deterministic virtual-host
lanes and a shared upstream area, mean-order sweeps, and a readable initial host
focus instead of full-graph shrinking. Domain-grouped HTTP/HTTPS navigation keeps
blocks distinct. Full overview, Fit view, Readable scale, global search, filters,
keyboard/mouse inspection, source metadata, zoom/pan, themes and mobile remain
offline. Focus follows only existing edges, lazily retains at most eight layouts,
indexes search text once and keeps one SVG node per model node. No dependencies
or fabricated topology edges were added for presentation.

Validation uses an entirely synthetic four-vhost/40-node deployment-shaped fixture
and a generated 100-vhost/602-node case. Laptop/mobile captures were reviewed;
cards begin at readable screen scale. Tests assert deterministic distinct lanes,
nonoverlapping cards and removal of an adversarial crossing. Condition metadata
injection and inherited error-page exclusions add security/correctness coverage.
All 40 workspace tests and offline Chromium checks passed locally, including
global navigation, CSP, source/guard/severity inspection and zero external
requests/browser errors. PR #15 Actions passed at `81726ef`.

Remaining limitations: compare-and-single-return server conditions only; no full
request matching; some overview crossings and large focused hosts need pan/search;
browser coverage is Chromium. Schema 0.2 requires old exhaustive consumers to
update. At this phase branding had not yet been supplied and branch protection was
unverified; later handoffs below record both findings. Maintainer review/release validation is still required; no merge,
release or issue closure is performed by this work.

## Final ordered-return audit

An additional synthetic regression verifies `return` followed by unreachable
rewrite/set/return instructions and full conditional-return coverage before
location selection. Later instructions no longer obscure the terminal outcome;
skipped child locations retain containment and explicit unreachable metadata
without unsupported-analysis warnings or invented effective destinations. This
private reachability state keeps unsupported evaluation distinct from known
termination. Required gates and the full browser suite are rerun cumulatively.
The audit also verifies external model callers cannot leak a redacted condition
value through a stale derived label; condition labels are rebuilt from sanitized
typed metadata at export. No generic secret-detection guarantee is introduced.

## Field-validation handoff

| Change | PR / implementation | Verified CI |
| --- | --- | --- |
| Handler precedence / conditional control flow | #14 / `88af4d2` | 40410926975 passed |
| Info/warning/error / include privacy | #15 / `81726ef` | 40411782959 passed |
| Vhost focus / native layout / source identity | #16 / `0d41ef3` | 40413417940 passed |
| Return termination / derived-label privacy | #17 / `0f737b8` | Check current PR head |

Final local validation: fmt, locked Clippy with warnings denied, 42 locked workspace
tests and locked build; isolated parser comparison; conditional/normal JSON/DOT/SVG
goldens; CSP hash; offline Chromium laptop/mobile, four-vhost/40-node and
100-vhost/602-node checks; malicious data and condition metadata; no page errors or
external requests. Independent Graphviz accepted normal/hostile conditional and
multi-vhost DOT (font metric fallback warnings in the minimal local checker).
Browser captures were reviewed locally, not published as deployment assets.
All new fixtures are synthetic. The four original review comments on #9/#10
received linked responses. No main push, force push, merge, release, issue closure,
privileged operation or real Nginx/config/report access occurred.


## Final UX and v0.1 review

Fetched latest remotes and all open PRs. #17 at `0724bd9` remained cumulative;
its Actions run 40414057285 passed. Read every #16 conversation comment and its
empty review/thread lists; new sanitized feedback 6429292719 reproduced: backend
search showed 1 node/0 edges and lexical host ordering selected HTTP redirect-only.
No earlier shared branch was rewritten; work uses `fix/report-search-context`.

Search now uses indexed, visited, deterministic incoming paths plus outgoing paths
from direct matches and ancestor guard outcomes, with 40 direct matches, 200 nodes,
24 hops and 4000 edge visits. Direct/context styles and accessible labels differ;
filters choose matches without hiding their paths. Limit/incompleteness notices
are visible. Shared backends retain actual callers; context does not expand via
sibling hosts. The synthetic unique backend now shows 6 nodes/5 real edges,
including both declared domain aliases, host, location and upstream.

Configured TLS application hosts rank first using protocol/effective content edges;
otherwise effective handler owners, responses and reachable context choose the
most informative host, with stable ties. HTTPS-only redirects do not displace HTTP
applications. The 40-node fixture now starts on portal HTTPS. Readable framing
centers meaningful paths, fits small conditional graphs, keeps selected matches
inside frame and reports offscreen nodes. Phone/tablet controls gain 44px targets,
two-pointer pinch/pan/cancellation and explicit inspector/graph navigation. No
parser, schema, evidence, strict-mode, native SVG/DOT/JSON or runtime changes.

Validation: all required fmt/locked Clippy (-D warnings)/42 locked workspace tests/
locked build, parser comparison, JSON/DOT/SVG goldens and CSP checks pass. Expanded
offline Chromium suite passes path-aware backend/shared/domain/static/conditional
queries, filters, source/evidence inspection, host-policy fallbacks/nonstandard
ports/ties, disconnected/empty results and bounded 40/602-node cases. Laptop,
phone and tablet captures were inspected; actual Chromium touch pan/pinch/cancel/
tap pass. Zero external requests, page/CSP errors or dialogs. A fresh optimized
source installation and installed help/demo/strict multi-vhost HTML generation
succeeded under a temporary user root. Firefox 157.0 and WebKit 27.2 downloaded,
but missing GTK/Pango/multimedia libraries prevent launching; neither passed here.
No privileged install was attempted. Final pushed-head CI belongs in the UX PR.

Read-only GitHub checks now establish main is unprotected (required checks off)
and rulesets are empty; maintainer configuration is a release blocker. NASJ declares
MIT; locked license inventory has no missing declarations, with Unicode-3.0 notice
requirements recorded. Exact distribution notices/current vulnerability audit and
packaging remain review tasks. At that UX handoff approved art had not yet been supplied; text-only deferral
was proposed. The later official branding follow-up supersedes that proposal; #6 stays open pending merge. RELEASE_READINESS.md classifies
all gates and recommends v0.1.0/source-first with final verification commands.
No production input/report, merge, tag/publication, main push, issue closure,
privilege escalation, Nginx edit/reload or discovery was performed.


## Official branding and README integration — 2026-10-27

Reverified remotes and #18 at `fd1de75`, green Actions 40419935602. User-supplied
`NASJ_Logos_Corrected_v2.zip` was found in the project root. Inspected every entry
before temporary extraction: eight regular files, bounded sizes/compression,
no traversal/absolute/duplicate/backslash paths, symlinks, special files or
encryption. All seven 1254×1254 PNG variants decoded. Visually verified wordmarks
spell نسج with exactly one dot over ن, including light/dark background composites;
icon/app variants contain the mark only. Source PNGs carry no metadata fields.

Selected four byte-identical originals: color transparent primary, white transparent
primary, transparent icon-only and color app icon. Kept alternate opaque variants
in the transport archive to avoid unused binaries. Manifest records complete
inventory, SHA-256, dimensions/modes/alpha and derivative crop/size/hash. Display
copies only omit outer canvas and proportionally resize; no generated art,
recoloring, letterform edits or arbitrary visual filters. Preserved originals.

English/Arabic READMEs now have themed approved hero images, a real Rust CI badge,
a source-only unreleased preview quick start, actual features/limits, connected
search explanation, consistent documentation links, contributor/MIT information
and clearly planned-only v0.2/v0.3. Added a current-renderer screenshot from the
synthetic multi-vhost fixture, normalizing checkout source prefixes before capture.
No production data or private filesystem paths occur in that public preview.

HTML embeds small light/dark PNG wordmarks and an app-icon favicon in fixed data
URIs, with aspect-preserving CSS and alt text/heading fallback. The sole CSP image
permission change is `img-src data:`; viewer hash and all other restrictions remain.
No untrusted SVG, network images or runtime dependency; CLI help/version/structured
outputs and schema 0.2/parser/routing remain unchanged. Source archive stays local,
ignored, intact. Branding availability/checklist/readiness references are updated;
older log entries now explicitly describe their historical missing-asset state.

Validation: 43 workspace tests, required fmt/locked Clippy (-D warnings)/locked
build, parser comparison, unchanged JSON/DOT/SVG goldens, script CSP and new PNG
checksum/CRC/dimension/base64 checks pass. Expanded offline Chromium suite passed
themes, image decode/alt/aspect, 1440×900/390×844/768×1024, copied HTML without
adjacent files, no-JS static branding and hostile-image exclusion, alongside all
40/602-node routing/search/touch checks. Zero external requests, page/CSP errors
or injected dialogs. Light/dark desktop/mobile captures and the normalized README
preview were reviewed visually. Fresh optimized offline source installation,
installed help/version, strict branded report generation and synthetic JSON demo
passed. Firefox/WebKit coverage remains unavailable as recorded previously.

Issue #6 remains open until acceptance/merge. Read-only GitHub checks still show
main unprotected and no rulesets; no settings were changed. Maintainers must review
the PR dependency stack, schema, licenses/notices and packaging before release.
No merges, release tags/publication, main/force pushes, issue closures, privileged
operations, Nginx edits/reloads or discovery were performed. Final pushed-head
CI/PR links are attached to the branding PR rather than inferred from base CI.


## Authorized final stack merge and source release preparation — 2026-10-27

Authenticated as repository owner with admin permission; fetched remotes and
verified a clean tree. Audited every open PR, description, original exact-head
Actions, review submission/thread list and conversation. Earlier routing/search
findings have implementation replies and regression coverage; no unresolved
inline threads/change requests. Reviewed cumulative code, fixtures, redaction,
CSP, conditional routing, branding and dependency boundaries. No new blocker found.

Maintainer explicitly authorized merges and deferred branch protection. Marked #1
ready and merged all 13 PRs into main in order using GitHub merge commits; each
successor was retargeted to main. Binary incremental diffs matched their original
reviewed diffs byte for byte. Each merged tree equals its PR head and retains that
head as the second parent. GitHub briefly recalculated mergeability after base
changes; no conflicts or content resolutions. No history rewriting, force/main
push, bypass, branch deletion or repository-settings change.

| PR | Merge commit SHA |
| --- | --- |
| [#1](https://github.com/marawan6569/Nasj/pull/1) | `790cb722521863a36f052d98b50bf9775a6a87ca` |
| [#8](https://github.com/marawan6569/Nasj/pull/8) | `6e8931b34a2f1ad8c03ec8c206aafc1948c496f6` |
| [#9](https://github.com/marawan6569/Nasj/pull/9) | `9b79b9b9c33221db832c108f002125518fe3c09c` |
| [#10](https://github.com/marawan6569/Nasj/pull/10) | `f103478379e49442cd127e6c5e786943f3721e93` |
| [#11](https://github.com/marawan6569/Nasj/pull/11) | `9b0ea88e48b6235413134a6a06e9b2da33d5873d` |
| [#12](https://github.com/marawan6569/Nasj/pull/12) | `7804c8262ddff58ea488b1be2cecfc124877636c` |
| [#13](https://github.com/marawan6569/Nasj/pull/13) | `7f3d8e1ef0c9f084aa617a299a16035258b7ff11` |
| [#14](https://github.com/marawan6569/Nasj/pull/14) | `6f3562ee6147879773c19b547310fc495b13d330` |
| [#15](https://github.com/marawan6569/Nasj/pull/15) | `f3e30e97ed477ec1643601f3aeb4511e4eb19059` |
| [#16](https://github.com/marawan6569/Nasj/pull/16) | `50fe1d06bd6ceb11f2fdbe53877f17c13f3ac7f6` |
| [#17](https://github.com/marawan6569/Nasj/pull/17) | `436f1d8252dbeb2ff49af103fdca12e1878e6a93` |
| [#18](https://github.com/marawan6569/Nasj/pull/18) | `e8c4cc9daafc5ea920597f2e7486e1aa3aaacded` |
| [#19](https://github.com/marawan6569/Nasj/pull/19) | `a7d7e3897dc9e35d6689439aa6a5c8e4588895e2` |

Post-stack main a7d7e3897dc9e35d6689439aa6a5c8e4588895e2 has exactly #19's tree
b8ec18b2d0aa5bc117ecedfb21d6308e301025f3, preserving all 42 original commits.
Actions 40433761704 passed on this main SHA. Required local fmt/locked Clippy
(-D warnings)/43 workspace tests/locked build and parser fmt/1 comparison test,
JSON/DOT/SVG goldens, XML, CSP hash, PNG integrity and full offline Chromium suite
passed. Chromium includes branded themes/moved-file/no-JS, retained search paths,
mobile/touch and 40/602-node cases, with zero external requests/browser errors.
Fresh GitHub clone/optimized locked offline source installation (cached Rust
packages) and installed version/help/map-help/strict synthetic HTML/demo JSON pass.
All public/test inputs are synthetic; no deployment configuration/report accessed.

Source-first 0.1.0 chosen; all workspace versions/MIT verified. Exact workspace
inventory matches 40 external packages; separate parser spike has 78 external
packages with license declarations. Source archive will contain no vendored Rust
packages/browsers/binary; source notices and exact archive/checksum/publication
commands prepared. No CVE/legal audit, MSRV, non-Linux, Firefox/WebKit, physical-device,
signed/reproducible binary or registry-readiness claim. Schema 0.2 remains experimental.

Focused docs/v0.1.0-release-preparation updates both READMEs to main installation
and main push CI badge, changelog, notes, distribution/notices, checklist, roadmap,
architecture/spec and historical record status. Required checks/Actions must pass
on its PR before merge and run again on final main. The PR final validation comment
records final SHA/Actions/local results/archive hash without a self-referential
commit. Publication approval is still withheld: no tag, release, uploaded assets
or crates.io publication. Branding issue #6 was closed as completed with linked
merge/CI/asset evidence; unrelated and discovery/server issues remain open.


## Official v0.1.0 publication and documentation follow-up — 2026-10-27

Maintainer explicitly authorized official publication. Reconfirmed GitHub CLI
account marawan6569 with repository admin/write permission, clean approved main
b60cb2e045fc9476034bffba7967b8674825fa18, all 14 merged PRs and successful
release-commit Actions 40434734182. The original archive and SHA256SUMS were intact;
all 119 files matched Git, the approved SHA-256 matched and no source tree was
substituted. Fresh extracted-source installation, all four formats, strict Info/
Warning behavior, branding/CSP and targeted offline Chromium passed. The earlier
full 43-workspace-test/parser/browser evidence remains valid for this exact SHA.

Created annotated tag v0.1.0, object 70e4e2c54d7b05ef2aa6fc505eca599dc4373efc,
annotation “NASJ v0.1.0 — First public release”; pushed without force and verified
its local/remote peeled commit is exactly the approved SHA. Created a release draft,
verified notes and both uploaded asset digests, then published release 425004090:
https://github.com/marawan6569/Nasj/releases/tag/v0.1.0 at 2026-10-27T03:27:17Z.
It is public, latest, neither draft nor prerelease. Only custom assets are
nasj-v0.1.0-source.tar.gz and SHA256SUMS. No binaries or crates.io publication.

Independently fetched public API/page/latest state and both assets without
authentication into a separate temporary directory. The published SHA256SUMS passes;
archive SHA-256 is bc72c99f211c7d15ec77bbe683566d63d3f42bca8a6398682ae4081da34275bc.
Every downloaded file again matches its release Git blob. All tag-specific release
links return HTTP 200 and the public page renders the notes and correct نسج name.
A fresh public tag clone installed with locked dependencies, reports nasj 0.1.0
and generates strict synthetic HTML. No GitHub automatic-archive byte-equivalence,
new platform, signed/reproducible binary or vulnerability-audit claim is made.

After public verification, docs/v0.1.0-published-status updates both READMEs with
the official release link, main as primary Quick Start and immutable tag alternative;
records the actual changelog date; synchronizes current release-status/schema-ID
wording and source-verification instructions. Historical phase evidence is retained
under an explicit published-status banner. The repository release-notes file matches
the published body; public release metadata/body/assets stay fixed. No application,
parser/routing/schema, logo/asset, dependency or CI change. Standard checks and
exact-head CI are required before PR merge; its final comment records final main
and confirms the original tag still points to the approved release commit.

Post-release docs local checks passed: fmt, locked Clippy with denied warnings,
43 workspace tests, locked build, CSP hash and branding integrity. Checked 102
local Markdown/image paths, identical English/Arabic shell examples, main-primary
and tag-alternative ordering, main CI badges, and the unchanged release-note body.
The 16-file diff contains Markdown only; the tag remains at its approved commit.
