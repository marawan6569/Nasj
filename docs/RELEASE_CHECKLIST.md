# First release checklist

No release/merge has been approved. Check boxes describe release work, not claims
of completion. See EXECUTION_LOG.md and PR descriptions for actual test evidence.

## Review and repository policy

- [ ] Maintainer reviews/merges the dependency stack in order:
  #1 → #8 → #9 → #10 → #11 → #12 → #13 → #14 → #15 → #16 → #17;
  retarget bases as needed.
- [ ] Resolve review comments and inspect Actions for the exact approved commits.
- [ ] Configure and verify required `test` CI check and restrictions on direct main
  pushes using repository settings; current enforcement is unverified.
- [ ] Keep issues #2–#7 open until their own criteria are satisfied and merged.
  Branding and discovery issues cannot be closed from the static preview alone.

## Correctness and security

- [ ] Run fmt, Clippy with warnings denied, workspace tests and build on the final
  release commit with Cargo.lock; verify a clean checkout and source installation.
- [ ] Rerun the isolated parser comparison and review ADR-0001/known exclusions.
- [ ] Review experimental schema 0.2 (independent of product version), typed
  condition/branch semantics, diagnostic severity and compatibility/ID policy.
- [ ] Validate representative sanitized deployment snapshots and resource limits.
- [ ] Check inherited/conditional/dynamic routing and warnings with no invented edges.
- [ ] Verify no inherited static destination beside proxy/unsupported handlers;
  review normal nested location handler boundaries and ordered conditional returns.
- [ ] Inspect redaction, include scope/symlinks, nonregular files and output refusal.
- [ ] Review dependency licenses and vulnerabilities for the exact lockfiles at
  release time; no current dependency-audit claim is made by this checklist.

## Reports and documentation

- [ ] Validate JSON/DOT/SVG goldens, XML and independent Graphviz parsing.
- [ ] Pass CSP hash and offline browser suite on final assets; manually inspect
  layout/readability and keyboard use in Chromium, Firefox and Safari/WebKit.
- [ ] Exercise larger graphs and document practical layout/performance limits.
- [ ] Review initial readable vhost focus and full overview on representative
  synthetic laptop/mobile reports; check same-domain HTTP/HTTPS/source identity.
- [ ] Review reports for accidental infrastructure disclosure before publishing examples.
- [ ] Confirm English/Arabic docs and help match the released executable.
- [ ] Replace preview-branch installation references with the approved release ref.
- [ ] Obtain approved corrected `نسج` assets (single-dot initial ن), verify pixels,
  transparency, sizes and filenames. Otherwise document explicit branding deferral
  and keep issue #6 open. Never substitute or regenerate the misspelled artwork.

## Packaging and approval

- [ ] Decide binary targets/distribution and supported Rust/platform versions; only
  Linux Rust 1.99.1 has been locally validated so far.
- [ ] Prepare final changelog/version, reproducible artifacts and checksums.
- [ ] Maintainer explicitly approves tag/publication. Never release automatically.
- [ ] Keep v0.2 discovery optional/planned and v0.3 server deferred in release notes.
