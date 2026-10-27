# Changelog

## Unreleased

Post-release documentation tracks the published release and the main development branch.

- Prepare native GNU/Linux x86_64 and ARM64 archives and Debian packages from
  an explicitly approved immutable release SHA, using pinned Rust 1.99.1.
- Add reviewed dependency notice gates, runtime/container validation, checksums,
  provenance and a separate explicitly approved additive release backfill workflow.
- Stage consistent English/Arabic binary installation instructions; binaries
  remain unpublished. Historical v0.1.0 source assets and tag are unchanged.

## [0.1.0](https://github.com/marawan6569/Nasj/releases/tag/v0.1.0) — 2026-10-27

First official source-first release, published at 03:27:17 UTC from
`b60cb2e045fc9476034bffba7967b8674825fa18` under the immutable `v0.1.0` tag.

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
