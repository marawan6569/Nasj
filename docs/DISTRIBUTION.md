# v0.1.0 source distribution

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
