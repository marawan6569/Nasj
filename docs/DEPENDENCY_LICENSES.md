# Locked dependency license inventory

Reverified from `cargo metadata --locked --format-version 1` for the workspace
Cargo.lock during release preparation (2026-10-27). Includes all resolved targets,
dev dependencies and proc macros; this is broader than the Linux runtime binary.
No dependency was added or changed by the UX fixes. Re-run metadata if locks change.

NASJ source and all three workspace crates declare MIT; see [LICENSE](../LICENSE).
The chosen source-only archive contains no vendored dependency source or binaries;
see [distribution notices](../THIRD_PARTY_NOTICES.md). The following are upstream
manifest declarations, not a binary notice bundle or vulnerability audit. Each declaration offers an MIT option;
`unicode-ident` also requires Unicode-3.0. Review actual notices for the exact
release artifacts, including build-time components, before distributing binaries.

| Package | Locked version | Declared SPDX expression |
| --- | --- | --- |
| anstream | 1.0.0 | `MIT OR Apache-2.0` |
| anstyle | 1.0.14 | `MIT OR Apache-2.0` |
| anstyle-parse | 1.0.0 | `MIT OR Apache-2.0` |
| anstyle-query | 1.1.5 | `MIT OR Apache-2.0` |
| anstyle-wincon | 3.0.11 | `MIT OR Apache-2.0` |
| bitflags | 2.13.2 | `MIT OR Apache-2.0` |
| cfg-if | 1.0.5 | `MIT OR Apache-2.0` |
| clap | 4.6.7 | `MIT OR Apache-2.0` |
| clap_builder | 4.6.7 | `MIT OR Apache-2.0` |
| clap_derive | 4.6.7 | `MIT OR Apache-2.0` |
| clap_lex | 1.1.1 | `MIT OR Apache-2.0` |
| colorchoice | 1.0.5 | `MIT OR Apache-2.0` |
| errno | 0.3.14 | `MIT OR Apache-2.0` |
| fastrand | 2.5.0 | `Apache-2.0 OR MIT` |
| getrandom | 0.4.3 | `MIT OR Apache-2.0` |
| glob | 0.3.4 | `MIT OR Apache-2.0` |
| heck | 0.5.0 | `MIT OR Apache-2.0` |
| is_terminal_polyfill | 1.70.2 | `MIT OR Apache-2.0` |
| itoa | 1.0.18 | `MIT OR Apache-2.0` |
| libc | 0.2.191 | `MIT OR Apache-2.0` |
| linux-raw-sys | 0.12.1 | `Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT` |
| memchr | 2.8.3 | `Unlicense OR MIT` |
| once_cell | 1.21.4 | `MIT OR Apache-2.0` |
| once_cell_polyfill | 1.70.2 | `MIT OR Apache-2.0` |
| proc-macro2 | 1.0.107 | `MIT OR Apache-2.0` |
| quote | 1.0.47 | `MIT OR Apache-2.0` |
| r-efi | 6.0.0 | `MIT OR Apache-2.0 OR LGPL-2.1-or-later` |
| rustix | 1.1.5 | `Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT` |
| serde | 1.0.229 | `MIT OR Apache-2.0` |
| serde_core | 1.0.229 | `MIT OR Apache-2.0` |
| serde_derive | 1.0.229 | `MIT OR Apache-2.0` |
| serde_json | 1.0.154 | `MIT OR Apache-2.0` |
| strsim | 0.11.1 | `MIT` |
| syn | 3.0.9 | `MIT OR Apache-2.0` |
| tempfile | 3.27.0 | `MIT OR Apache-2.0` |
| unicode-ident | 1.0.27 | `(MIT OR Apache-2.0) AND Unicode-3.0` |
| utf8parse | 0.2.2 | `Apache-2.0 OR MIT` |
| windows-link | 0.2.1 | `MIT OR Apache-2.0` |
| windows-sys | 0.61.2 | `MIT OR Apache-2.0` |
| zmij | 1.0.23 | `MIT` |

40 external packages; no missing license declarations in this inventory.

The isolated parser spike has its own lockfile (78 external packages, all with
license declarations reverified during release preparation) and does not enter the executable:
`nginx-config 0.13.2` declares MIT/Apache-2.0, `nginx-lint-parser 0.24.0` MIT,
and `misc-conf 0.1.2` MIT. Its full transitive inventory must be included if its
development dependencies are redistributed. Playwright (development only) and
downloaded browser engines are not bundled in reports or NASJ binaries.

HTML embeds only NASJ-owned CSS/JavaScript and generated SVG/JSON, with no
vendored visualization framework. The source-first distribution excludes fetched
dependencies and browser caches. Any later binary/vendored distribution needs an
exact notice review; no claim of a completed legal/CVE audit is made.
