# NASJ v0.1.0 release checklist

[v0.1.0 was published](https://github.com/marawan6569/Nasj/releases/tag/v0.1.0) on
2026-10-27 at 03:27:17 UTC after maintainer authorization. The release commit is
`b60cb2e045fc9476034bffba7967b8674825fa18`; its checks and Actions passed.
This checklist records completion and retains the verification commands.
See [readiness](RELEASE_READINESS.md).

## Completed preparation

- [x] Audit authentication/admin permissions, clean tree, all open PRs, descriptions,
  reviews, CI and cumulative diff; verify #19 contains its predecessors.
- [x] Mark #1 ready, then merge #1 → #8 → #9 → #10 → #11 → #12 → #13 → #14 →
  #15 → #16 → #17 → #18 → #19 using GitHub merge commits, retargeting each to main.
- [x] Verify unchanged incremental diffs, merge parents and tree equality after
  every merge; retain review history and all original commits without conflicts.
- [x] Verify post-stack main's Actions and required local Cargo/browser checks.
- [x] Review conservative routing, includes/escaping, conditional guards/termination,
  diagnostic severity/strict mode and experimental JSON schema 0.2.
- [x] Verify all four exports, normal/conditional goldens, XML, CSP, redaction,
  safe output files and offline portability. Chromium themes/search/navigation/
  mobile/touch/hostile and 40/602-node checks pass without external requests/errors.
- [x] Integrate approved branding, validate PNG CRC/dimensions/checksums/embedding,
  correct نسج spelling, both READMEs and synthetic screenshot.
- [x] Verify a fresh GitHub source clone installs; installed version/help and strict
  synthetic mapping pass on Linux x86_64/Rust 1.99.1 with cached dependencies.
- [x] Review MIT, exact locked dependency inventory and source-only notices.
- [x] Prepare changelog, English/Arabic main installation/badge references, release
  notes and source packaging/publication instructions via a focused PR.
- [x] Record branch protection as deferred repository hardening. Do not change
  settings or treat unprotected main as a blocker for these authorized merges.

## Commit verification

The commands below passed on the published commit. For future changes, run them
on the reviewed commit and record its SHA; never move the existing v0.1.0 tag:

```sh
git status --short --branch
git rev-parse HEAD
rustc --version
cargo --version
cargo fmt --all -- --check
cargo clippy --locked --workspace --all-targets -- -D warnings
cargo test --locked --workspace
cargo build --locked --workspace
cargo fmt --manifest-path tools/parser-spike/Cargo.toml -- --check
cargo test --locked --manifest-path tools/parser-spike/Cargo.toml
python3 tools/report-csp.py --check
python3 tools/branding.py --check
python3 -m venv /tmp/nasj-release-browser
/tmp/nasj-release-browser/bin/pip install -r tools/browser-requirements.txt
/tmp/nasj-release-browser/bin/playwright install chromium
/tmp/nasj-release-browser/bin/python tools/browser-smoke.py
```

Ordinary user-installed browser libraries/fonts may be needed. Do not elevate
privileges or skip failed checks to obtain a pass. Firefox/WebKit remain outside
validated coverage. Inspect branded light/dark desktop/mobile captures when
reviewing visual changes. Independently parse normal/hostile/conditional DOT with
Graphviz if available; it is not a runtime dependency. Verify Markdown/image links
and matching English/Arabic examples against CLI help.

Follow [DISTRIBUTION.md](DISTRIBUTION.md) for clean source/archive installation,
license inclusion and SHA-256 verification. GitHub Actions must pass for the final
main SHA, not only the PR head. The release-preparation PR's final validation
comment is the authoritative record for these final checks and its merge SHA.

## Publication completed

- [x] Maintainer authorized the exact release SHA, source-first notes and documented limits.
- [x] Annotated v0.1.0 tag created, pushed and verified at the approved commit.
- [x] Public GitHub Release published, with exactly source archive and SHA256SUMS.
- [x] Public API/page, release-note links and unauthenticated asset downloads verified.
- [x] Downloaded archive checksum and all 119 files verified against the release tree.
- [x] Published-tag source installation and strict synthetic HTML verified.
- [x] Publication date/time recorded above; post-release documentation uses a focused PR.

The existing tag and assets are fixed. New versions require separate review and
publication authorization; never recreate or replace v0.1.0.

Do not publish crates/binaries, configure branch protection, delete historical
branches or close unrelated/future issues. Planned v0.2 discovery and v0.3 server
must not appear as delivered features. A binary release, reproducible-build claim,
signing or vulnerability-audit claim requires additional evidence and approval.
