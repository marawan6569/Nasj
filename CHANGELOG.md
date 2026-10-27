# Changelog

## Unreleased

Post-release documentation tracks the published release and the main development branch.

- Prepare native GNU/Linux x86_64 and ARM64 archives and Debian packages from
  an explicitly approved immutable release SHA, using pinned Rust 1.99.1.
- Add reviewed dependency notice gates, runtime/container validation, checksums,
  provenance and a separate explicitly approved additive release backfill workflow.
- Recommend published Linux downloads in English/Arabic installation guidance;
  retain immutable-release source installation and the main development branch.

## [0.1.0](https://github.com/marawan6569/Nasj/releases/tag/v0.1.0) — 2026-10-27

First official release, initially published with source at 03:27:17 UTC from
`b60cb2e045fc9476034bffba7967b8674825fa18` under the immutable `v0.1.0` tag.

- Precompiled GNU/Linux x86_64 and ARM64 archives and Debian packages added
  at 11:13:41 UTC after protected-environment approval. All seven new public
  assets match [preparation run 40490972772](https://github.com/marawan6569/Nasj/actions/runs/40490972772);
  [publication run 40493732081](https://github.com/marawan6569/Nasj/actions/runs/40493732081) passed.
  Both architectures passed native Ubuntu 22.04/Debian 12 runtime checks.
  Original source assets and the tag are unchanged; see [checksums](docs/BINARY_VALIDATION_v0.1.0.md#published-files).
- Rust CLI with bounded Nginx parsing, recursive/glob includes and source-file/line evidence.
- HTTP/HTTPS virtual hosts, locations, upstreams, reverse proxies and static paths.
- Conservative routing uncertainty, ordered symbolic conditional returns, diagnostic
  severity and strict mode. Experimental JSON schema **0.2** is independent of
  product version **0.1.0**.
- JSON, DOT, standalone SVG and interactive offline HTML exports with restrictive
  CSP, escaped content, known-field redaction and private create-new output files.
- Graph-aware search, readable virtual-host focus, mobile navigation and themes.
- Official NASJ (نسج) branding, English/Arabic READMEs and synthetic report preview.
- Parser/include/routing/security fixtures, exporter goldens and offline Chromium CI.

See the [published release notes](docs/RELEASE_NOTES_v0.1.0.md) for scope and
limitations. Optional discovery (v0.2) and a local server (v0.3) remain planned.
