# NASJ website launch-candidate readiness

Sprint: W3 + W4 + W5 on `website/launch-candidate-w3-w5`, from approved main
`14ee303236c814c43cd1c658403f8515093069c4`. Product pin remains v0.1.0 /
`b60cb2e045fc9476034bffba7967b8674825fa18`.

**Candidate verification in progress. NOT READY until final hosted checks pass.**
This record is updated with exact final SHA/run evidence before handoff. It is
not authorization to merge, enable Pages or publish.

## Requirements and evidence

| Milestone | Implemented scope                                                                                                                                                                                                              | Verification / remaining gate                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| W3        | Five new bilingual page pairs; release-derived commands/links/checksums; supported/partial/unsupported/experimental/planned statuses; notices; navigation/canonical/hreflang/sitemap                                           | [W3 evidence](W3.md); nine fresh public asset hashes and immutable tag PASS; content/pin/failure-stopping command cases PASS     |
| W4        | All requested viewport sizes/locales/themes; keyboard/no-JS/RTL/reduced motion; three-engine matrix; 24 new reviewed visual comparisons, 12 preserved originals; fixed-profile performance                                     | [W4 evidence](W4.md); local Chromium PASS, hosted Firefox/WebKit pending; unavailable manual tasks explicitly UNVERIFIED         |
| W5        | Strict CSP/artifact/provenance/privacy gates; deterministic demos; release/dependency audits; root/project/deeper builds; clean candidate workflow; tested deployment guards; exact-artifact promotion and rollback definition | 62 artifact + 47 demo + 10 cache + 17 content + 21 promotion tests; Rust gates PASS; hosted/clean-checkout final results pending |

The artifact verifier checks every allowed generated HTML/resource path, local
resource URLs, metadata, exact report/media/font/license digests, effective CSP
and inline hashes; rejects symlinks, executables, source maps and known private
path/credential patterns. This supplements review; it is not general secret
certification. Reports are copied byte-for-byte from the pinned W2 artifacts.

Fresh release audit verifies all nine asset bodies, exact manifest associations,
release ID, annotated tag object/product commit and latest-release drift.
The dependency audit currently reports zero vulnerabilities; the lock inventory
has reviewed licenses and registry integrity for every package. Shipped font,
Tailwind and NASJ notices are pinned; build-only node_modules are not published.

## Launch gate

- [x] Bilingual required content and stable product claims.
- [x] Published asset availability and SHA-256 checks.
- [x] No Rust, released viewer, fixture, release-tag or published-asset changes.
- [x] Existing screenshot PNGs preserved; new comparison evidence added.
- [x] Deterministic two-root report reproduction and sandbox/CSP/offline tests.
- [x] All four local Rust gates; dependency/license checks.
- [ ] Final clean-checkout production/base verification evidence.
- [ ] Final hosted browser/localization/security/performance checks and links.
- [ ] Maintainer dispositions for each open [launch risk](LAUNCH_RISKS.md).
- [ ] Separately authorized merge, exact-main candidate approval and publication.

Physical device/touch, NVDA/Firefox, VoiceOver/Safari and actual 200%/400% browser
zoom remain **UNVERIFIED**. They are separate risks with impact, fallbacks and
recommendations; passing automation does not mark them complete. The inherited
viewer SVG accessibility and badge contrast findings are not hidden or patched.

## Promotion and recovery

Follow [the launch/rollback runbook](LAUNCH_RUNBOOK.md). PR artifacts can be
reviewed but cannot be deployed by the promotion workflow. After an approved
merge, a fresh successful main candidate supplies the tested tar, source identity
and archive hash; an independently authorized protected environment approves that
same artifact. Main is checked before and after approval. Rollback is a reviewed
restoration commit, complete revalidation and a new SHA/run/artifact approval.

No Pages enablement, public deployment, settings change or merge occurred here.
Actual deployment and live rollback remain unexercised by design. Unit tests prove
policy rejection paths; they are not evidence of a live Pages deployment.
