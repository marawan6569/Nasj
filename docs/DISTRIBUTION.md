# v0.1.0 distribution

**The published release remains source-only. Linux binaries are staged for
review; no binary download links are live.** See the
[binary validation report](BINARY_VALIDATION_v0.1.0.md) for actual results and
[release tooling](../tools/release/README.md) for build/backfill procedures.

[NASJ v0.1.0](https://github.com/marawan6569/Nasj/releases/tag/v0.1.0) was published
on 2026-10-27 at 03:27:17 UTC. The annotated tag is fixed at
`b60cb2e045fc9476034bffba7967b8674825fa18`. Main is the default development
branch; the READMEs use main for Quick Start and offer this tag as the pinned alternative.

The source-first distribution contains tracked NASJ files, including LICENSE,
[THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md), lockfiles, approved branding,
English/Arabic documentation and synthetic fixtures. It includes no compiled
executable, vendored dependencies, deployment reports, branding transport ZIP,
browser cache or Python environment. Exactly two custom assets were published:

| Asset | Purpose |
| --- | --- |
| [nasj-v0.1.0-source.tar.gz](https://github.com/marawan6569/Nasj/releases/download/v0.1.0/nasj-v0.1.0-source.tar.gz) | Verified 119-file source archive |
| [SHA256SUMS](https://github.com/marawan6569/Nasj/releases/download/v0.1.0/SHA256SUMS) | SHA-256 for that custom archive |

Archive SHA-256:
`bc72c99f211c7d15ec77bbe683566d63d3f42bca8a6398682ae4081da34275bc`.
Both files were downloaded without authentication after publication. The checksum
passed and every archived file matched the approved Git tree. GitHub's automatic
source archives are separate downloads; byte equality with our custom archive
has not been asserted. Release archives preserve the original commit's documents;
current project-status updates live on main without altering the published tag.

All three workspace packages are version 0.1.0/MIT. The isolated parser spike is
a development tool at 0.0.0, covered by the repository license, and is not a release
package. Internal dependencies use local paths and are not prepared for crates.io.
Linux x86_64 with Rust/Cargo 1.99.1 is validated. The toolchain file follows stable;
no older-Rust MSRV, non-Linux or portable-binary claim is made. Building requires
a native linker and may fetch dependencies; installed mapping and HTML work offline.

## Download and verify the published source

Use a new temporary directory:

```sh
nasj_download_dir=$(mktemp -d /tmp/nasj-download-XXXXXX)
cd "$nasj_download_dir"
curl -fLO https://github.com/marawan6569/Nasj/releases/download/v0.1.0/nasj-v0.1.0-source.tar.gz
curl -fLO https://github.com/marawan6569/Nasj/releases/download/v0.1.0/SHA256SUMS
sha256sum --check SHA256SUMS
tar -xzf nasj-v0.1.0-source.tar.gz
cd nasj-v0.1.0
nasj_install_root=$(mktemp -d /tmp/nasj-install-XXXXXX)
cargo install --locked --path crates/nasj-cli --root "$nasj_install_root"
"$nasj_install_root/bin/nasj" --version
"$nasj_install_root/bin/nasj" --help
"$nasj_install_root/bin/nasj" map --config fixtures/nginx/multi-vhost.conf \
  --strict --format html -o "$nasj_install_root/report.html"
```

The installed version is `nasj 0.1.0`. The synthetic fixture emits two Info notices,
which strict mode permits. Reports are not release assets. A checksum validates
bytes, not authorship or binary build reproducibility; no signing claim is made.

## Verify the immutable tag checkout

```sh
git clone --branch v0.1.0 https://github.com/marawan6569/Nasj.git nasj-release-check
cd nasj-release-check
git rev-parse HEAD
cargo install --locked --path crates/nasj-cli
nasj --version
```

HEAD must equal `b60cb2e045fc9476034bffba7967b8674825fa18`. An annotated-tag
clone checks out detached HEAD; main remains the development branch. Fresh source
installation from the archive and public tag, help/version, strict mode and all
four formats were verified with synthetic input. The release SHA's full Cargo,
parser, CSP, branding and offline Chromium results are linked in
[release readiness](RELEASE_READINESS.md).

## Future distribution changes

Never move, replace or recreate the v0.1.0 tag or its verified assets. Main may
advance through reviewed PRs. New product versions require separate maintainer
approval and exact-commit validation. Binary or vendored distributions additionally
need target validation and full dependency notices, including Unicode-3.0; no
binary, reproducible-build, signing or vulnerability-audit certification is claimed.
Branch protection remains a deferred repository-hardening task. Discovery (v0.2)
and a local server (v0.3) are planned and absent from v0.1.0.

## Prepared Linux binary formats

| Rust target | Native build runner | Archive | Debian package (version 0.1.0-1) |
| --- | --- | --- | --- |
| x86_64-unknown-linux-gnu | ubuntu-22.04 | nasj-v0.1.0-linux-x86_64.tar.gz | nasj_0.1.0_amd64.deb |
| aarch64-unknown-linux-gnu | ubuntu-22.04-arm | nasj-v0.1.0-linux-aarch64.tar.gz | nasj_0.1.0_arm64.deb |

These are [documented native GitHub-hosted runners](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job).
Ubuntu 22.04 is an older LTS baseline. Rust/Cargo **1.99.1** is pinned;
the actual runner image version and OS are recorded per build. All v0.1.0
executables must come from `b60cb2e045fc9476034bffba7967b8674825fa18`,
irrespective of tooling changes on main. Filenames omit the Debian revision
intentionally; the package's internal version is `0.1.0-1`.

These are dynamically linked GNU ELF executables, not universal, static or
MUSL distributions. Runtime requirements come from `readelf`/`objdump`/`ldd`
and `dpkg-shlibdeps`; the pipeline rejects GLIBC symbol requirements above 2.35
and unexpected libraries. The actual requirement can be lower than the build
host's glibc version. A maximum required GLIBC symbol is necessary evidence,
not proof of compatibility with every distribution using that glibc.
Clean native Ubuntu 22.04 and Debian 12 containers exercise runtime behavior
independently of build tools. Linux Mint needs separate validation; no Mint
version is claimed tested. See the report for per-architecture results.

Archives have one versioned directory with `nasj` (0755), installation README,
MIT LICENSE, build metadata and reviewed `third-party/` notices. Paths are
relative; traversal/link/device/duplicate entries are rejected. Debian installs
`/usr/bin/nasj`, `/usr/share/doc/nasj/` and a short manual page. No maintainer
scripts, conffiles, services or listeners are included. Maintainer identity is
the repository's public GitHub-authored commit identity, not a private host
address. Dependency calculation uses the build OS's installed Debian
symbols/shlibs databases, followed by installation checks. This lightweight
`dpkg-deb` package is not a Debian source-package or archive submission.

`SHA256SUMS-binaries` covers every archive/package plus external
`build-x86_64.json` / `build-aarch64.json` provenance. Internal metadata records
source tag/SHA, lock hash, tooling SHA, compiler details, runner image, target,
runtime inspection and expected asset names. The external manifest avoids
circular self-hashes. Per-architecture checksums are job transfer controls only,
not public assets. Checksums are checked after packaging, job transfers and
before publication; uploaded files are downloaded and checked again. A checksum
does not establish publisher identity, signing or binary reproducibility.

## After publication

Only after approved assets have been publicly downloaded and checked, replace
the pending wording in both READMEs with actual availability and validated
architectures, add direct commands for existing downloads and link the successful
run here. Keep source installation working and main as the development branch.
This documentation follow-up needs no tag rewrite or release-note replacement.
