# v0.1.0 binary distribution validation

**Published and publicly verified.** Linux x86_64 and ARM64 archives and Debian
packages passed native checks and additive publication on 2026-10-27. Implementation: [PR #22](https://github.com/marawan6569/Nasj/pull/22).

## Source and tooling identity

- Product source: annotated `v0.1.0`, exactly
  `b60cb2e045fc9476034bffba7967b8674825fa18`.
- Annotated tag object: `70e4e2c54d7b05ef2aa6fc505eca599dc4373efc`.
- Approved preparation/publication tooling on main:
  `dd28da2d7a2320832f76b8d8519344157a338dc4`.
- Rust 1.99.1 (`58cf8f9c35b355199727627d07ae34a4e2846d67`, LLVM 23.1.1);
  Cargo 1.99.1 (`5f94df478`). Tests and release build use `--locked`.
- Source Cargo.lock SHA-256:
  `e535b8267fa391dbd15c98b241ee52872eaf2025e0365d50669ac8a4f468a146`.
- Reviewed notice-policy SHA-256:
  `d7ba0526e3d4212672b94f3d3dac72354edb0dc84d4f88385e38a420fc4f6d58`.

## Actions evidence

- [Approved main preparation 40490972772: all eight jobs pass](https://github.com/marawan6569/Nasj/actions/runs/40490972772).
  Both native builds, four native runtime containers, planning and aggregation passed.
- [Publication 40493732081: success](https://github.com/marawan6569/Nasj/actions/runs/40493732081).
  Dispatched on the same approved tooling SHA, with `run_id=40490972772`,
  `tag=v0.1.0`, the immutable product SHA, `resume=false` and the exact approval
  phrase `publish v0.1.0 from run 40490972772`. The maintainer approved the
  protected `release-binaries` deployment; no bypass or protection change occurred.
- [Selected reviewed artifact](https://github.com/marawan6569/Nasj/actions/runs/40490972772/artifacts/12727822556)
  and all four `runtime-*` evidence artifacts were downloaded and checked.
  The artifact ZIP is a transfer envelope, not a public release file.
- Historical tooling review: [PR #22](https://github.com/marawan6569/Nasj/pull/22),
  [branch preparation](https://github.com/marawan6569/Nasj/actions/runs/40455039285),
  [PR preparation](https://github.com/marawan6569/Nasj/actions/runs/40454993760) and
  [Rust CI](https://github.com/marawan6569/Nasj/actions/runs/40454993746) passed.
  Those branch artifacts were not published; the hashes below are the approved
  subsequent main run's files.

## Published files

Every file below was independently downloaded from the public release without
credentials and compared byte for byte with preparation run `40490972772`.
Both aggregate and per-architecture preparation checksums passed. The public
aggregate manifest also passes with all six covered files present.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `nasj-v0.1.0-linux-x86_64.tar.gz` | 702,105 | `3ec95fbd277382902f2adb91e37205e33c8e20f10053b1cc0cd14cec97ad6c02` |
| `nasj_0.1.0_amd64.deb` | 539,360 | `c279d07f94d0de24f16b6514daa7b9b414d7b0a5b90121c19ea4bbba5cb8029c` |
| `nasj-v0.1.0-linux-aarch64.tar.gz` | 656,465 | `6ad1df9101a2298fc68bb9df32fac9edf978f17c27056af049814352d05141b4` |
| `nasj_0.1.0_arm64.deb` | 477,572 | `3182a328bc9f7de94fbb0a2b235221f2eda01da65828b781fe63436acd6af228` |
| `build-x86_64.json` | 2,464 | `614b27b3bc5952789cf698b7f0b6ede6725b3bcdc14fd6890ec977d4badd1460` |
| `build-aarch64.json` | 2,393 | `b3e5bdea2db673019d46bba621332c253a29560e4d6cd7fc44fa307c16241503` |
| `SHA256SUMS-binaries` | 540 | `12591beec119bd3c2c27ad48a61c572a8d99d06030f850186a396d8be61cd0e7` |

`SHA256SUMS-binaries` covers the four distributions and two external build JSON
files; its own hash is recorded above without a circular self-entry. The two
`SHA256SUMS-<architecture>` files remain transfer controls and were not published.
Exactly seven new assets were added; there are nine custom public assets in total.

## Architecture and compatibility

| Property | x86_64 | ARM64 |
| --- | --- | --- |
| Rust target | x86_64-unknown-linux-gnu | aarch64-unknown-linux-gnu |
| Native runner | ubuntu-22.04 | ubuntu-22.04-arm |
| Build OS | Ubuntu 22.04.5 LTS | Ubuntu 22.04.5 LTS |
| Runner image | 20261023.322.3 | 20261023.156.3 |
| ELF | 64-bit little-endian x86-64 PIE, stripped | 64-bit little-endian AArch64 PIE, stripped |
| Interpreter | /lib64/ld-linux-x86-64.so.2 | /lib/ld-linux-aarch64.so.1 |
| NEEDED | libgcc_s.so.1, libc.so.6, ld-linux-x86-64.so.2 | libgcc_s.so.1, libc.so.6 |
| Highest required GLIBC symbol | GLIBC_2.34 | GLIBC_2.34 |
| Executable bytes / mode | 1,323,216 / 0755 | 1,164,192 / 0755 |
| Derived Debian Depends | libc6 (>= 2.34), libgcc-s1 (>= 4.2) | libc6 (>= 2.34), libgcc-s1 (>= 4.2) |

Raw executable SHA-256 (archive and Debian executable match per architecture):

- x86_64: `0cccbf0442c1cd6fc7124f649722fd7deb141798414416d3d749e13d4b7b4c38`
- ARM64: `0a5547c815adc5c54593c5a7ba181fa73cba18830476434fd5ec72169a759caf`

Both architectures passed archive execution, Debian install/execute/purge, help,
version and strict JSON/DOT/SVG/standalone HTML generation in clean native:

| Runtime | libc6 tested | libgcc-s1 tested | Both architectures |
| --- | --- | --- | --- |
| Ubuntu 22.04.5 | 2.35-0ubuntu3.15 | 12.3.0-1ubuntu1~22.04.3 | PASS |
| Debian 12 Bookworm | 2.36-9+deb12u14 | 12.2.0-14+deb12u1 | PASS |

Rust/Cargo were absent from those containers. Minimal image documentation
exclusions were overridden only for NASJ's docs/manual to audit installed
notices; runtime libraries were unmodified apart from ordinary package-manager
setup. No Debian installation ran on the development host. The lowest **demonstrated**
glibc environment is 2.35; required symbols up to 2.34 do not constitute a test
on glibc 2.34. Linux Mint, older Debian/Ubuntu, other kernels and CPUs have not
been independently validated. No universal, static or portable-platform claim
is made. Build setup needs Rust, Python, linker and Debian tools; installed
mapping needs the recorded GNU runtime libraries, not Rust, Graphviz or Nginx.

## Packaging and licensing gates

- 43 workspace tests pass locally and on each native release source build;
  local fmt/clippy (`-D warnings`)/test/build gates pass.
- Seven packaging trust-boundary tests pass: tag/SHA/dirty-source rejection,
  archive traversal/link/device/duplicate rejection, checksum tampering/name
  rejection, dependency coverage, mandatory Unicode notice retention and changed
  notice rejection, publication allowlist/provenance, protected-environment rules.
- Actionlint and shell syntax validation pass. Current immutable SHA-pinned
  checkout/upload/download Actions use Node 24; no long-lived workflow PAT.
- `file`, `readelf`, `objdump`, `ldd` and `dpkg-shlibdeps` pass. No RPATH/RUNPATH
  or unreviewed native library was found. Package versions are `0.1.0-1` with
  Debian amd64/arm64 metadata and the requested filenames.
- Lintian has no remaining errors/warnings after fixing changelog wrapping.
  Only `initial-upload-closes-no-bugs` is suppressed, because these are upstream
  packages, not Debian archive uploads; no fictitious ITP bug was created.
- Archives have one relative versioned directory, executable, README, MIT LICENSE,
  build metadata and notices. Debian has `/usr/bin/nasj`, docs/copyright/notices,
  changelog and manual. No maintainer scripts, conffiles, daemon or service.
- The 35-package filtered Linux graph includes proc macros/build/test dependencies.
  Its 74 actual upstream license/copyright files and source attributions are
  bundled and hash-verified, plus Rust's library copyright inventory and all 12
  supplied license texts. Both installed packages and extracted archives are
  checked against the complete reviewed policy. MIT is selected where offered;
  `unicode-ident` retains **MIT AND Unicode-3.0** and the full Unicode notice.
  See [license review](DEPENDENCY_LICENSES.md#binary-notice-review).
- Downloaded tarballs were audited for safe paths/permissions; internal and
  external metadata match, every notice hash verifies, and tar/deb executable
  bytes match. The publisher's non-writing allowlist/provenance validator also
  accepted these seven intended release filenames.

These checks are distribution evidence, not a legal certification, vulnerability
audit, publisher-identity guarantee or demonstration of reproducible builds.

## Public verification

Public release ID `425004090` contains exactly the seven files above plus its two
original assets. Fresh unauthenticated downloads of both originals match the
pre-publication snapshot byte for byte:

| Original asset | Asset ID | SHA-256 |
| --- | --- | --- |
| `nasj-v0.1.0-source.tar.gz` | 680311692 | `bc72c99f211c7d15ec77bbe683566d63d3f42bca8a6398682ae4081da34275bc` |
| `SHA256SUMS` | 680311694 | `68fbf4795692c984ae5a23d18267effd4f159c2423da10b59e86374142c2e43e` |

Original asset metadata, including size, digest and creation/update timestamps,
is unchanged. The original manifest still verifies the source archive. Release
ID, title, tag/target, draft/prerelease status, creation/publication time and notes
were unchanged by publication. Only the expected asset additions and release
update timestamp (11:13:41 UTC) changed. No unexpected public assets were found.
The annotated tag object still resolves to the approved product commit; main
was still at the approved tooling SHA throughout publication and verification.

Both public tarballs were audited for safe members, matching internal/external
provenance and full notice hashes. Extracted Debian executables match the tarball
executables; package version, architecture, dependencies and absence of maintainer
scripts were rechecked. The English/Arabic archive command blocks are identical;
the x86_64 public download/check/extract/install/version/help commands passed
using a temporary installation destination. That installed public binary also
passed strict JSON, DOT, SVG and HTML smoke checks with synthetic input. Public
Debian download/check/metadata commands passed; privileged install/removal is
covered by the selected run's native Ubuntu/Debian containers, using the exact
same package bytes. No developer-host privilege elevation or Docker access occurred.

After successful public verification, the existing GitHub Release description
was updated at 11:15:40 UTC to announce both architectures and Debian packages,
add the tested installation commands and retain source installation. Original
feature descriptions, experimental schema, security limitations and roadmap are
unchanged. No tag, source asset, application code or lockfile was modified.
The focused bilingual documentation follow-up proceeds through PR CI before merge;
main remains the development branch and v0.1.0 remains the immutable release tag.

Interruption recovery was not needed or exercised. Future interrupted uploads
must follow the [explicit resume procedure](../tools/release/README.md#public-upload--separate-approval-required);
never substitute a different build or overwrite an existing public asset.
