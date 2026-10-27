# NASJ v0.1.0 release readiness

[NASJ v0.1.0 is published](https://github.com/marawan6569/Nasj/releases/tag/v0.1.0),
2026-10-27 at 03:27:17 UTC, after explicit maintainer authorization. The immutable
annotated tag points to `b60cb2e045fc9476034bffba7967b8674825fa18`. Main remains
the default development branch; later tooling and documentation do not change
the release source identity.

Linux x86_64 and ARM64 archives and Debian packages were subsequently added
after maintainer approval. See the [binary validation report](BINARY_VALIDATION_v0.1.0.md)
for preparation/publication runs, public checksums and native Ubuntu 22.04/Debian 12
runtime evidence. The sections below retain the original source-release review
record; their original source-only scope is historical.

## Merged implementation

All 13 PRs were merged into main in dependency order with GitHub merge commits.
PR #1 was reviewed and marked ready first. Each later PR was retargeted to main;
its binary diff was identical to its original reviewed incremental diff. Exact
head Actions runs passed before merging, and mergeability was confirmed after
GitHub recalculated it. No conflicts, force pushes, rebases, squashes or direct
main pushes occurred. No shared branch was rewritten or deleted.

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
| [#20](https://github.com/marawan6569/Nasj/pull/20) | `b60cb2e045fc9476034bffba7967b8674825fa18` |

Post-stack main: `a7d7e3897dc9e35d6689439aa6a5c8e4588895e2`.
Its tree is `b8ec18b2d0aa5bc117ecedfb21d6308e301025f3`, exactly the tree of
`ee7ed5450663937607d23cf34814521c2db112cc` (#19). All 42 original implementation
commits are ancestors, each retained once in Git history. The retargeted diffs,
merge parents and tree equality after every merge establish no loss/duplication.

[Post-stack main Actions passed](https://github.com/marawan6569/Nasj/actions/runs/40433761704).
All 13 original exact-head PR runs were also checked. Release-preparation PR #20
merged after CI; its final commit is the published release commit above.
[Release-commit Actions passed](https://github.com/marawan6569/Nasj/actions/runs/40434734182),
and [the final verification record](https://github.com/marawan6569/Nasj/pull/20#issuecomment-6431754672)
contains local test and archive evidence. Later main documentation commits do not
change the release tag or archive.

## Verified implementation and limits

| Area | Evidence / disposition |
| --- | --- |
| Rust workspace | All three crates are 0.1.0/MIT. Core has no exporter/UI dependencies. Linux x86_64, Rust/Cargo 1.99.1; no older-Rust MSRV or other-platform claim. |
| Parser/routing | Recursive includes, bounded input, variable/unsupported uncertainty, inherited handlers, ordered conditional returns, severity/strict mode and source evidence covered by fixtures. Static edges remain configured, never runtime confirmed. |
| Exports | JSON schema 0.2, DOT, native SVG and offline HTML; normal/conditional goldens, injection/redaction, XML, output refusal and private Unix output checks pass. |
| Release-commit checks | fmt, locked Clippy with denied warnings, 43 locked workspace tests, locked build, isolated parser fmt/1 comparison test, CSP hash, PNG integrity and full offline Chromium pass on the published SHA. |
| Browser | Full offline Chromium suite passes host/search relationships, bounded 40/602-node cases, keyboard, real touch gestures, 1440×900 desktop, 390×844 phone and 768×1024 tablet. Zero external requests, JS/CSP errors or dialogs. |
| Branding | #19 merged: correct نسج wordmark, preserved originals/checksums, themed embedded PNG logos/favicon, both README heroes and synthetic screenshot. Theme/decode/aspect/no-JS/moved-file tests pass. |
| Source installation | Fresh GitHub clone, locked optimized offline install using cached dependencies, installed version/help/map help, strict synthetic HTML and demo JSON pass. This does not assert an empty dependency cache or isolated clean-host binary validation. |
| Licensing | Root MIT reviewed; all 40 external workspace entries match locked metadata, 78 external parser-spike entries have license declarations. Source-only notices prepared; no dependencies/browsers vendored. No legal/CVE audit claim. |
| Publication | Public release verified through unauthenticated API/page access. Exactly two custom assets: source archive and SHA256SUMS; independently downloaded and verified. No binaries or crates.io package published. |

Original review findings on #9/#10/#16 already have linked implementation replies;
there are no inline review threads or change-request reviews outstanding. Branding
issue #6 meets its acceptance criteria through #19 and was closed as completed. Future discovery/server issues
remain open; unrelated issues are not bulk-closed.

## Published artifact and accepted scope

The uploaded `nasj-v0.1.0-source.tar.gz` has SHA-256
`bc72c99f211c7d15ec77bbe683566d63d3f42bca8a6398682ae4081da34275bc`.
All 119 archived files match the approved Git tree byte for byte. The separately
downloaded public archive passes the published SHA256SUMS. Fresh installation
from the extracted source and a public tag clone reports `nasj 0.1.0`; synthetic
JSON/DOT/SVG/HTML and strict-mode checks pass. Public notes use working tag-specific
links. GitHub automatic source archives are separate artifacts; byte equality
with the custom archive has not been asserted.

- Experimental schema **0.2** and renumberable IDs remain distinct from product **0.1.0**.
- Source-first distribution has Linux x86_64/Rust 1.99.1 and Chromium-only
  validation. Firefox/WebKit could not launch in the earlier environment because
  ordinary system libraries were missing; no pass is claimed. Other platforms,
  older Rust, physical devices and a clean-host binary remain unverified.
- Documented static-analysis, sensitive-path/name and bounded-layout/search
  limitations remain. Runtime routing is not verified; no full request simulation.
- Branch protection is explicitly deferred by the maintainer. Main was observed
  unprotected; no rulesets/settings/reviewer requirements were changed. This is
  repository hardening work, not a release blocker.
- Dependency vulnerability auditing and signed/reproducible binaries are not
  claimed. A future binary/vendored distribution needs exact third-party notices,
  including Unicode-3.0, and new approval/validation.

See [release notes](RELEASE_NOTES_v0.1.0.md), [checklist](RELEASE_CHECKLIST.md),
[distribution verification](DISTRIBUTION.md), [analysis exclusions](ANALYSIS.md)
and [JSON compatibility](JSON_FORMAT.md). v0.2 discovery and v0.3 local server
remain planned, not implemented. All test/public artifacts use synthetic input.
