# v0.1.0 binary distribution validation

**Prepared and validated; no binary assets published.** Both x86_64 and ARM64
passed native checks on 2026-10-27. Implementation: [PR #22](https://github.com/marawan6569/Nasj/pull/22).

## Source and tooling identity

- Product source: annotated `v0.1.0`, exactly
  `b60cb2e045fc9476034bffba7967b8674825fa18`.
- Annotated tag object: `70e4e2c54d7b05ef2aa6fc505eca599dc4373efc`.
- Tooling branch began at main `db1e70df70a50850951e298f4ea610e650820579`.
  Validated tooling snapshot: `1734ba1e232a5e76b6698e26add2b6b4b8d59f1d`;
  subsequent documentation-only reporting does not alter product source.
- Rust 1.99.1 (`58cf8f9c35b355199727627d07ae34a4e2846d67`, LLVM 23.1.1);
  Cargo 1.99.1 (`5f94df478`). Tests and release build use `--locked`.
- Source Cargo.lock SHA-256:
  `e535b8267fa391dbd15c98b241ee52872eaf2025e0365d50669ac8a4f468a146`.
- Reviewed notice-policy SHA-256:
  `d7ba0526e3d4212672b94f3d3dac72354edb0dc84d4f88385e38a420fc4f6d58`.

## Actions evidence

- [Manual tag/SHA dispatch: all eight jobs pass](https://github.com/marawan6569/Nasj/actions/runs/40455039285).
  Both native builds, four native runtime containers, planning and aggregation passed.
- [PR preparation: all eight jobs pass](https://github.com/marawan6569/Nasj/actions/runs/40454993760).
- [Existing Rust CI passes](https://github.com/marawan6569/Nasj/actions/runs/40454993746),
  including parser-spike tests, CSP/branding gates and offline Chromium reports.
- [Reviewed workflow artifact](https://github.com/marawan6569/Nasj/actions/runs/40455039285/artifacts/12712217762)
  expires 2026-11-10. The run also has four `runtime-*` evidence artifacts.
  Artifacts require GitHub access; they are not public GitHub Release assets.

Manual dispatch was actually exercised on `release/linux-binary-distribution`
with `tag=v0.1.0`, the full approved SHA and `architectures=both`, after the PR
registered the workflow. Publication intentionally rejects this branch's run;
repeat preparation on approved main after merge.

## Prepared files

Sizes and hashes below refer to the downloaded **manual run's exact files**,
not the artifact ZIP. The per-architecture and aggregate checksum files all
passed; the aggregate matches separately downloaded native files byte for byte.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `nasj-v0.1.0-linux-x86_64.tar.gz` | 702,109 | `3fc969b71820b507f122d7bfd178a432ec8d47516b10905617f89e0166eff11f` |
| `nasj_0.1.0_amd64.deb` | 539,352 | `89ee15669e316ee28804d5757a253550b103fb27958f0c081e5cbbcd623328c4` |
| `nasj-v0.1.0-linux-aarch64.tar.gz` | 656,463 | `0bb3144fa93c9f7f6a744b8269c9f70864fcffc5f51c9c9d2003bdaa20a7a51c` |
| `nasj_0.1.0_arm64.deb` | 477,608 | `d9fd41aff207bec6eb60f223d1306153016ed082dd4b2879f02cfda69be47195` |
| `build-x86_64.json` | 2,464 | `91eca96c56a2b596fa305f47399687a5ed466faf6f1e106d99474f6ec6fa00c0` |
| `build-aarch64.json` | 2,393 | `b3a1663d982f39265eb8b269cc3bcb485ac48a688b0e96da1f208f8186a1303a` |
| `SHA256SUMS-binaries` | 540 | `47c6de5b86b8bb576546dee0615c4ccf738e8ced8ec167f1853a72289c0deb29` |

`SHA256SUMS-binaries` covers the four distributions and two external build JSON
files; its own hash is reported above without a circular self-entry. The two
`SHA256SUMS-<architecture>` files in the workflow envelope are transfer controls,
not intended public release assets. Rebuilding after merge changes metadata and
may change distribution hashes; review the new main run before upload.

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
setup. No installation ran on the development host. The lowest **demonstrated**
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

## Preserved release and approval boundary

Public release ID `425004090`, tag/target, notes and timestamps were compared
with the initial snapshot and remain unchanged. Both original asset IDs, sizes
and digests match; a fresh unauthenticated source download passes the original
`SHA256SUMS`. Source archive SHA-256 remains
`bc72c99f211c7d15ec77bbe683566d63d3f42bca8a6398682ae4081da34275bc`.
Main and the annotated tag remain unchanged. No application code, lockfile,
branding, schema or roadmap was modified.

Live publication, post-upload download checks, interruption recovery and protected
environment deployment are **not executed** by this task. Negative/local
publication gates are tested; actual public write behavior remains unverified.
The `release-binaries` environment was absent (read-only API returned 404);
no environment or branch-protection settings were changed. The publisher fails
closed until required reviewers and one custom branch rule `main` are configured.

Final maintainer steps:

1. Review and approve/merge PR #22 through the normal process.
2. Configure `release-binaries` required reviewers and a single custom deployment
   branch policy `main` (type branch).
3. Dispatch preparation on main with the same immutable v0.1.0 source SHA and
   selected architectures. Review the fresh run, notices, runtime evidence,
   exact files and checksums; publication requires that same tooling SHA.
4. Explicitly authorize public upload by dispatching `release-publish.yml` on
   main with that successful run ID, tag, approved SHA and approval phrase
   `publish v0.1.0 from run <run_id>`, then approve the environment deployment.
   It preflights all collisions, adds only missing binary/provenance files and
   uploads `SHA256SUMS-binaries` last. No overwrite, tag creation or note update.
5. Verify public downloads and prepare the small English/Arabic availability
   follow-up. Interrupted uploads require explicit resume approval, exact-byte
   checks of existing names and the original run; see the
   [recovery procedure](../tools/release/README.md#public-upload--separate-approval-required).
