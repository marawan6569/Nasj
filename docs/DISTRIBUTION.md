# v0.1.0 source distribution and publication

The chosen distribution is source-first: tracked NASJ files, including LICENSE,
[THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md), lockfiles and the dependency
inventory. No binary, vendored dependencies, reports from deployments, source-logo
transport ZIP, browser caches or Python environment is included. GitHub also
provides automatic source archives once a release tag is approved and pushed.

All three workspace packages are version 0.1.0 and declare MIT. The isolated
parser spike is a development tool at 0.0.0, covered by the repository license;
it is not a release package. Path-only internal dependencies are appropriate for
source installation; they have not been prepared for crates.io publication.

Linux x86_64 with Rust/Cargo 1.99.1 is validated. `rust-toolchain.toml` follows
stable; no minimum supported Rust version has been established. For the tested
toolchain explicitly use `cargo +1.99.1`. No non-Linux, cross-compiled or portable
binary claim is made. Native linking tools and build-time dependency access or a
populated Cargo cache are required. Running the installed CLI needs no Nginx,
Graphviz, Python, network or server.

## Validate a clean source checkout

Use the exact final main SHA from the release-preparation PR's final validation
comment, rather than assuming the current branch tip is still that candidate:

```sh
git clone https://github.com/marawan6569/Nasj.git nasj-release-check
cd nasj-release-check
git checkout --detach APPROVED_MAIN_SHA
git status --porcelain
rustc --version
cargo --version
nasj_install_root=$(mktemp -d /tmp/nasj-install-XXXXXX)
cargo install --locked --path crates/nasj-cli --root "$nasj_install_root"
"$nasj_install_root/bin/nasj" --version
"$nasj_install_root/bin/nasj" --help
"$nasj_install_root/bin/nasj" map --config fixtures/nginx/multi-vhost.conf \
  --strict --format html -o "$nasj_install_root/report.html"
```

Run the complete [release checklist](RELEASE_CHECKLIST.md) on that commit too.
All published examples/evidence must remain synthetic. The CLI creates private
reports on Unix and refuses existing outputs; those are not release assets.

## Prepare an archive locally (no tag or upload)

Set `nasj_release_sha` to the verified final main SHA. In a clean checkout:

```sh
nasj_release_sha=APPROVED_MAIN_SHA
test -z "$(git status --porcelain)"
nasj_dist_dir=$(mktemp -d /tmp/nasj-v0.1.0-dist-XXXXXX)
git archive --format=tar.gz --prefix=nasj-v0.1.0/ \
  -o "$nasj_dist_dir/nasj-v0.1.0-source.tar.gz" "$nasj_release_sha"
tar -tzf "$nasj_dist_dir/nasj-v0.1.0-source.tar.gz"
(cd "$nasj_dist_dir" && sha256sum nasj-v0.1.0-source.tar.gz > SHA256SUMS)
(cd "$nasj_dist_dir" && sha256sum --check SHA256SUMS)
```

Verify the extracted archive installs with the same locked source command and
contains the licensing files. Preserve the SHA, toolchain and checksums alongside
the local archive. A checksum verifies bytes, not authorship or build reproducibility.
No signing or reproducible binary claim is made. Binary archives need a separate
notice bundle and platform validation before they can be considered for publication.

## Final maintainer approval, then publication

**Do not run this section until the maintainer explicitly approves public
publication of the exact final SHA.** Review [release notes](RELEASE_NOTES_v0.1.0.md),
schema 0.2, platform/security limitations and final Actions first. Branch protection
configuration is explicitly deferred and is not a publication prerequisite.

With GitHub CLI authenticated, from the approved checkout, replace both values:

```sh
nasj_release_sha=APPROVED_MAIN_SHA
nasj_dist_dir=VERIFIED_LOCAL_ARCHIVE_DIRECTORY
git fetch origin
git cat-file -e "$nasj_release_sha^{commit}"
git tag -a v0.1.0 "$nasj_release_sha" -m "NASJ v0.1.0"
git push origin refs/tags/v0.1.0
gh release create v0.1.0 --repo marawan6569/Nasj --verify-tag \
  --title "NASJ v0.1.0" --notes-file docs/RELEASE_NOTES_v0.1.0.md \
  "$nasj_dist_dir/nasj-v0.1.0-source.tar.gz" "$nasj_dist_dir/SHA256SUMS"
```

Remove the preparation-only opening sentence from the notes file used for actual
publication. Alternatively, after approving/pushing that tag, use GitHub → Releases
→ Draft a new release, select existing `v0.1.0`, paste the prepared notes, attach
the verified source archive/checksums and review before selecting **Publish release**.
Do not publish crates or binaries. Do not reuse a moved tag or silently substitute
a newer main commit; revalidate changed candidates.
