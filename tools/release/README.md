# Linux release tooling

Preparation never writes to a GitHub Release. Tooling lives on main; product
source is checked out separately at a verified annotated tag's approved SHA.
For v0.1.0 the only acceptable SHA is
`b60cb2e045fc9476034bffba7967b8674825fa18`. Never change application code,
lockfile or the historical tag to accommodate packaging; report a source blocker.

## Prepare and review

1. Review/merge the implementation PR with maintainer approval. Its PR trigger
   exercises the same native packaging/runtime jobs for v0.1.0 with read-only
   permissions. PR artifacts are ineligible for public upload. GitHub requires
   the workflow on the default branch before manual dispatch is available.
2. Run **Linux release preparation** on main with the existing tag, approved SHA
   and `both` (or `x86_64` when ARM64 is deferred):

   ```sh
   gh workflow run release-build.yml --ref main \
     -f tag=v0.1.0 -f commit=b60cb2e045fc9476034bffba7967b8674825fa18 \
     -f architectures=both
   ```

3. Native Ubuntu 22.04 runners install Rust 1.99.1, resolve locked metadata,
   run workspace tests, build/inspect/package, verify notices and run lintian.
   `fail-fast: false` preserves independent native results. Clean native Ubuntu
   22.04 and Debian 12 containers then verify checksums, archive safety, no
   Rust/Cargo installation, version/help, all four strict exports, Debian
   metadata/layout/install/removal and absence of maintainer scripts. All
   installation happens in disposable containers, using synthetic configuration.
4. Only when **every selected target** passes, collect rechecks source identity
   and emits `reviewed-linux-binaries` with `SHA256SUMS-binaries`. Failed ARM64
   cannot be advertised by successful x86_64. If ARM64 is blocked, dispatch a new
   x86_64-only preparation; do not salvage a failed aggregate run for publication.
5. Download this artifact and runtime evidence. Review hashes, contents, notices,
   metadata, source/tag relationship, runner image and logs. Record results in
   the validation report. Artifacts expire after 14 days; rebuild if expired.
   Artifact ZIPs are transfer envelopes, not release files.

Local native preparation needs Python >=3.10, Git, rustup/Rust 1.99.1, a linker,
binutils, file, dpkg-dev, dpkg-deb and lintian. Use a fresh external output directory:

```sh
git clone --branch v0.1.0 https://github.com/marawan6569/Nasj.git /tmp/nasj-source
python3 tools/release/release.py prepare --source /tmp/nasj-source \
  --output /tmp/nasj-distributions --tag v0.1.0 \
  --commit b60cb2e045fc9476034bffba7967b8674825fa18 --arch x86_64
python3 tools/release/release.py collect --directory /tmp/nasj-distributions \
  --architectures x86_64 --tag v0.1.0 \
  --commit b60cb2e045fc9476034bffba7967b8674825fa18
```

Local smoke tests restrict PATH to system utilities. Clean native containers
prove the no-Rust installation case. **Never run `runtime-test.sh` on a developer
host**: it installs/removes packages and is only for disposable containers/VMs.
Do not access a development Docker socket. The license policy is a reviewed
closed inventory, not an automatically accepted generated file; follow
[dependency review](../../docs/DEPENDENCY_LICENSES.md#binary-notice-review).
Archive order/ownership/timestamps and gzip timestamps are normalized, but
reproducible builds are not claimed; runner/system packages can change.

## Public upload — separate approval required

**Do not execute during preparation.** Configure `release-binaries` with required
maintainer reviewers and main-only deployment rules. Dispatch also requires an
exact explicit approval phrase. Scripts do not change environment settings or
branch protections. Keep the same tooling SHA on main between build and publish;
otherwise prepare again on the new SHA.

After approving the concrete files, dispatch `release-publish.yml` on main with
the successful preparation run ID, tag, approved source SHA and the phrase
`publish <tag> from run <run_id>`. Approve the protected environment deployment.
Only that job has `contents: write`, using the short-lived GitHub token, not a
PAT. No release-event, PR or `workflow_run` path automatically publishes.

The publisher downloads the selected aggregate artifact, checks it came from a
successful manual main run of the expected workflow at the **same tooling SHA**,
verifies provenance/checksums/exact filenames and rechecks local and remote tag
objects and commit. It requires an existing published release and preflights
**all** collisions before writing. Only binary distributions, build JSON files
and the separate binary manifest are added. Source archive, `SHA256SUMS`, tags
and notes are never replaced. There is no `--clobber`, tag creation or release
creation path. Uploaded bytes are downloaded and verified.

GitHub offers no atomic multi-asset upload. The checksum manifest is uploaded
last to reduce inconsistent visibility; interruption windows remain. If
interrupted, preserve the original run/files, inspect public assets and hash
every existing upload. Seek a new explicit approval with the same run and
`resume: true`: an existing name is skipped **only after downloading identical
bytes**, differing content aborts, missing files are added and everything is
verified. Never delete/overwrite public files to conceal a mismatch. If main
advanced or the original artifact expired, stop for maintainer investigation;
do not substitute a new build under the same filenames. New package revisions
or versions need separate review. After public verification, prepare the small
[availability update](../../docs/DISTRIBUTION.md#after-publication).

## Future releases

Keep main as development. Approve a version/source SHA, create an annotated tag
once, then run newer reviewed tooling against that exact tag/SHA. Version
mismatches, dirty source, moved tags, changed locks, target failures and notice
changes block preparation. Update the license policy through review for new
dependencies/toolchains. Publication stays separate. Workflows do not create
tags, change notes, merge PRs or publish crates.
