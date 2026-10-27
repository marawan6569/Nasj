# NASJ v0.1.0 release readiness

Assessment: 2026-10-27. The maintainer authorized the stack merges and focused
release preparation. Public tag/release publication remains a separate approval.
The product scope is frozen. No feature or runtime change is part of preparation.

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

Post-stack main: `a7d7e3897dc9e35d6689439aa6a5c8e4588895e2`.
Its tree is `b8ec18b2d0aa5bc117ecedfb21d6308e301025f3`, exactly the tree of
`ee7ed5450663937607d23cf34814521c2db112cc` (#19). All 42 original implementation
commits are ancestors, each retained once in Git history. The retargeted diffs,
merge parents and tree equality after every merge establish no loss/duplication.

[Post-stack main Actions passed](https://github.com/marawan6569/Nasj/actions/runs/40433761704).
All 13 original exact-head PR runs were also checked. The focused release-docs PR
must pass before merging. Its final validation comment records the resulting
final main SHA, final push-triggered Actions URL, repeated checks and archive hash;
this document cannot embed its own future merge SHA. Follow the final comment
when choosing the publication commit.

## Verified implementation and limits

| Area | Evidence / disposition |
| --- | --- |
| Rust workspace | All three crates are 0.1.0/MIT. Core has no exporter/UI dependencies. Linux x86_64, Rust/Cargo 1.99.1; no older-Rust MSRV or other-platform claim. |
| Parser/routing | Recursive includes, bounded input, variable/unsupported uncertainty, inherited handlers, ordered conditional returns, severity/strict mode and source evidence covered by fixtures. Static edges remain configured, never runtime confirmed. |
| Exports | JSON schema 0.2, DOT, native SVG and offline HTML; normal/conditional goldens, injection/redaction, XML, output refusal and private Unix output checks pass. |
| Main checks | fmt, locked Clippy with denied warnings, 43 locked workspace tests, locked build, isolated parser fmt/1 comparison test, CSP hash and PNG integrity pass at post-stack main. Rerun on final docs merge. |
| Browser | Full offline Chromium suite passes host/search relationships, bounded 40/602-node cases, keyboard, real touch gestures, 1440×900 desktop, 390×844 phone and 768×1024 tablet. Zero external requests, JS/CSP errors or dialogs. |
| Branding | #19 merged: correct نسج wordmark, preserved originals/checksums, themed embedded PNG logos/favicon, both README heroes and synthetic screenshot. Theme/decode/aspect/no-JS/moved-file tests pass. |
| Source installation | Fresh GitHub clone, locked optimized offline install using cached dependencies, installed version/help/map help, strict synthetic HTML and demo JSON pass. This does not assert an empty dependency cache or isolated clean-host binary validation. |
| Licensing | Root MIT reviewed; all 40 external workspace entries match locked metadata, 78 external parser-spike entries have license declarations. Source-only notices prepared; no dependencies/browsers vendored. No legal/CVE audit claim. |
| Publication | Prepared notes/checklist/source packaging only. No tag, GitHub Release, uploaded asset, crates.io publication or public binary. |

Original review findings on #9/#10/#16 already have linked implementation replies;
there are no inline review threads or change-request reviews outstanding. Branding
issue #6 meets its acceptance criteria through #19 and was closed as completed. Future discovery/server issues
remain open; unrelated issues are not bulk-closed.

## Maintainer decisions at the publication gate

- Approve public publication of the exact final validated SHA and prepared notes.
- Accept the experimental schema **0.2** and renumberable IDs for product **0.1.0**.
- Accept source-first distribution, Linux x86_64/Rust 1.99.1 and Chromium-only
  validation. Firefox/WebKit could not launch in the earlier environment because
  ordinary system libraries were missing; no pass is claimed. Other platforms,
  older Rust, physical devices and a clean-host binary remain unverified.
- Accept documented static-analysis, sensitive-path/name and bounded-layout/search
  limitations. Runtime routing is not verified; no full request simulation.
- Branch protection is explicitly deferred by the maintainer. Main was observed
  unprotected; no rulesets/settings/reviewer requirements were changed. This is
  repository hardening work, not a release blocker.
- Dependency vulnerability auditing and signed/reproducible binaries are not
  claimed. A future binary/vendored distribution needs exact third-party notices,
  including Unicode-3.0, and new approval/validation.

See [release notes](RELEASE_NOTES_v0.1.0.md), [checklist](RELEASE_CHECKLIST.md),
[distribution/publication commands](DISTRIBUTION.md), [analysis exclusions](ANALYSIS.md)
and [JSON compatibility](JSON_FORMAT.md). v0.2 discovery and v0.3 local server
remain planned, not implemented. All test/public artifacts use synthetic input.
