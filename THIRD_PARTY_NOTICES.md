# Source distribution notices

The NASJ v0.1.0 source archive contains tracked NASJ source, documentation,
synthetic fixtures and approved branding, under the repository [MIT license](LICENSE).
It contains no compiled executables, vendored Rust dependency sources, Python
packages or browser engines. Generated reports embed NASJ assets and no third-party
visualization framework.

Cargo downloads dependencies separately under their upstream licenses.
[docs/DEPENDENCY_LICENSES.md](docs/DEPENDENCY_LICENSES.md) records the 40 external
packages in the workspace lockfile and their SPDX declarations. The separate
development-only parser comparison resolves 78 external packages; it is not linked
into NASJ. Its lockfile/metadata are the authoritative development inventory.
Playwright and browser downloads are development-only and excluded from archives.

This source-only distribution does not redistribute those dependency packages.
Anyone preparing a binary, vendored tree or bundled development environment must
collect the exact packages' copyright/license notices first. In particular,
`unicode-ident` declares `(MIT OR Apache-2.0) AND Unicode-3.0`; choosing MIT does
not remove the additional Unicode notice requirement. Review target-specific and
build-time dependencies as well as runtime packages.

These records are a distribution inventory, not a legal opinion or vulnerability
audit. Binary distribution and registry publication require a separate review.
