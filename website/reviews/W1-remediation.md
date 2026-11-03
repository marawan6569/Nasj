# W1 independent-review remediation

Branch: `feat/website-w1-foundation`. Review date: 2026-11-03.
Scope: the seven independent-review findings only. No W2, Rust, released-viewer,
release, deployment, Pages, commit, push, merge or PR changes.

## Finding dispositions

| Original finding              | Remediation                                                                                                                                      | Disposition                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| MEDIUM: artifact verification | Explicit inventory policy, emitted-byte hashes, text signatures, symlink/non-regular/executable/source-map rejection; 62 positive/negative tests | Resolved locally                                                   |
| MEDIUM: baseline provenance   | Original tree and PNG hashes, W0 references, actual runtime/browser/OS and per-prefix build identities recorded                                  | Local identity resolved; hosted runner portability remains pending |
| LOW: Node runtime             | `.nvmrc`, package engine and lockfile root engine use 24.22.2; fresh frozen install                                                              | Resolved                                                           |
| LOW: CI evidence              | Separate project/deeper output directories; final `if: always()` upload; failure screenshots/traces retained                                     | Definition corrected and linted; hosted execution pending          |
| LOW: CI triggers              | `.editorconfig` and root `LICENSE` included in both PR and main-push filters                                                                     | Resolved                                                           |
| LOW: W0 differences           | Larger format cards and closer graph framing explicitly approved for W1, including English-dark                                                  | Resolved; visual treatment preserved                               |
| INFORMATIONAL: organization   | Current translation, media-provenance and notices locations documented with future metadata responsibilities                                     | Recorded; no restructuring                                         |

The verifier permits W1's exact documents, fingerprinted Astro code, pinned
media/notices and fingerprinted pinned fonts. Reviewed web manifests can be
explicitly added to the asset manifest without permitting arbitrary JSON files.
See [artifact policy](../scripts/artifact-policy.mjs) and [policy documentation](../README.md#artifact-publication-policy).
Text signatures are limited to specified development paths, private-key markers,
recognizable AWS/GitHub credentials, URL credentials and source-map references.
They do not guarantee that output contains no secrets. Binary metadata and a
concurrently mutable output tree are not covered by a generic scanning claim.

## Identity and environment

Git HEAD remains `958c5866e7e3ea8cbccd7b908aad9ae1156dace9`; W1 is uncommitted.
The pre-remediation reviewed tree identity is
`f2ccca73f2c196bbca96f6bcf3a45f4c446ac16a0869f7fdb8789782fca5e377`.
The final remediation source identity, shared by all three prefix runs, is
`c3399d48d210c372ecc9eadaf1718ccf1745cef662dd0a6db15e3726f8c70e0e`.

- [Original baseline provenance](baseline-provenance.json): per-file hashes for the
  pre-remediation reviewed inputs, all 12 PNG baselines, and available W0 references.
- [Project-prefix identity](remediation-project-identity.json): final review inputs,
  production artifact hashes and observed environment for `/Nasj/`.
- [Root identity](remediation-root-identity.json): production artifact hashes for `/`.
- [Deeper-prefix identity](remediation-deeper-identity.json): production artifact hashes
  for `/review/Nasj/`.

The aggregate SHA-256 hashes UTF-8 lines sorted by repository-relative path:
`<file SHA-256><two spaces><path><LF>`. Source identities include tracked/untracked
website files and consumed root inputs; generated/cache directories and `reviews/`
are excluded to avoid self-referential evidence. Screenshot files are included.
`scripts/review-identity.mjs` records these identities and fails if any baseline
PNG differs from the original hash inventory. It does not create screenshots.
Tailwind source detection is explicitly limited to `src/`, so review evidence and
negative-test strings cannot add utilities to production CSS. No design rules or
component markup changed; the existing visual comparisons validate the treatment.

Remediation environment: Ubuntu 26.04.1 LTS, Linux x86_64; Node 24.22.2,
npm 11.19.1; Playwright 1.64.1; Chromium/headless-shell revision 1248,
browser 156.0.8078.4. The official Node Linux x64 archive was verified against
SHA-256 `48cc0e21e048790e54c0cf5749c2725005313d652651c40b7a21feb9697aaf75`
from the [Node release record](https://nodejs.org/en/blog/release/v24.22.2).
No runtime exception to the approved architecture was needed.

Existing baseline capture settings: EN/AR × dark/light × 1440/390/320, viewport
height 900, device scale 1, reduced motion; screenshot tolerance 0.002. The separate
review gallery used heights 1000 desktop and 844 mobile. Historical capture was
reported on Ubuntu 26.04 / Node 24.22.1. No contemporaneous per-capture environment
log survives; this record explicitly distinguishes that historical limitation from
the exact remediation revalidation identities. It does not claim to reconstruct
the original generation event.

GitHub-hosted CI uses Ubuntu 24.04. Its rendering environment differs from local
Ubuntu 26.04.1. Hosted baseline compatibility and workflow execution remain
unverified until a separately authorized commit/push/PR. Never automatically
replace baselines to conceal runner differences.

## Verification commands and results

Commands below run from `website/` with the verified Node 24.22.2 distribution's
`bin` directory first on `PATH`. Rust commands and actionlint run from the repository
root. No snapshot-update command was run.

| Command                                                             | Result                                                                                      |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `node --version`; `npm --version`                                   | v24.22.2; 11.19.1                                                                           |
| `npm ci --no-audit`                                                 | Fresh install passed; 311 packages installed                                                |
| `npm run format:check`                                              | Passed                                                                                      |
| `npm run check`                                                     | Passed; zero Astro/type errors, warnings or hints                                           |
| `npm run verify:dependencies`                                       | Passed: locked registry sources, integrity and license inventory                            |
| `npm run build`                                                     | Passed: three HTML documents plus sitemap and local assets                                  |
| `npm run verify`                                                    | Passed: full inventory, emitted asset hashes, text checks, CSP, links, metadata and budgets |
| `npm run test:artifacts`                                            | 62/62 passed; no skips                                                                      |
| `CI=1 WEBSITE_TEST_RUN=project npm test -- --update-snapshots=none` | 23/23 passed, including 12 original visual comparisons                                      |
| `npm --logs-max=0 audit --audit-level=high --json`                  | Zero reported vulnerabilities across 427 locked dependencies; not a Node-runtime audit      |
| `actionlint .github/workflows/website.yml` (actionlint 1.7.12)      | Passed                                                                                      |
| `cargo fmt --all -- --check`                                        | Passed                                                                                      |
| `cargo clippy --workspace --all-targets -- -D warnings`             | Passed                                                                                      |
| `cargo test --workspace`                                            | 43/43 passed                                                                                |
| `cargo build --workspace`                                           | Passed                                                                                      |

The fresh npm install emitted the existing `whatwg-encoding@3.1.1` deprecation
notice and npm's `allowScripts` coverage warning for esbuild's postinstall. Neither
prevented installation, build or tests; no dependency version or install policy
was silently changed. Browser tooling also emitted the harmless inherited
`NO_COLOR`/`FORCE_COLOR` conflict warning.

For each pair `WEBSITE_BASE=/, WEBSITE_TEST_RUN=root` and
`WEBSITE_BASE=/review/Nasj/, WEBSITE_TEST_RUN=deeper`, run:

```sh
npm run build
npm run verify
CI=1 npm test -- --grep 'real 404|theme precedence|effective production CSP|no JavaScript' --update-snapshots=none
node scripts/review-identity.mjs
```

The environment variables above are exported for each command. Identity stdout
is redirected to the corresponding `reviews/remediation-*-identity.json` file.
The normal project build is restored and verified at the end.

The project suite rechecks 320/390px reflow, RTL, themes/storage, no-JS navigation,
WCAG automation, CSP enforcement, decoded local images and the 500 KiB payload
limit. Both alternate-prefix builds and verifiers passed, with seven browser tests
per prefix. The final identities record the exact restored project build and both
alternate builds. All twelve baseline PNGs remain byte-identical.
The restored project output uses 8,233 bytes of gzipped CSS and 579 bytes of
gzipped JavaScript; all 18 asset provenance hashes pass. Final source and emitted
file hashes were independently checked against the recorded inventories.

## Files changed by remediation

Existing files: `.github/workflows/website.yml`, `website/.nvmrc`,
`website/package.json`, `website/package-lock.json`, `website/playwright.config.ts`,
`website/scripts/verify-build.mjs`, `website/src/styles/global.css` (source scan scope
only), `website/README.md`, `website/PROVENANCE.md`, `website/reviews/W1.md`.

Added files: `website/scripts/artifact-policy.mjs`,
`website/scripts/review-identity.mjs`, `website/tests/artifacts.test.mjs`,
`website/reviews/baseline-provenance.json`, this remediation record, and the three
`website/reviews/remediation-*-identity.json` files linked above. Build/test reports
remain ignored local evidence. No screenshot PNG, product asset, Rust file or
existing Rust/release workflow changed.

## Remaining verification boundaries

- GitHub-hosted CI, actual upload behavior and Ubuntu 24.04 baseline portability:
  pending explicit publication authorization; local results do not substitute.
- Original per-capture environment logs: unavailable, explicitly distinguished
  from recorded revalidation inputs and unchanged baseline hashes.
- Physical devices, manual assistive technology, actual 200%/400% browser zoom,
  Firefox/WebKit acceptance, launch LCP/CLS profiles and live Pages behavior:
  not performed during this focused remediation; retain their planned later gates.
- Broad secret absence is not certified by the targeted artifact signatures.

The approved architecture will be saved separately as requested; this remediation
does not create `docs/website/WEBSITE_PLAN.md` or begin the next milestone.

Recommendation: ready for independent W1 re-review. All requested local checks
passed. Hosted CI execution and the historical capture-log limitation remain
explicitly outstanding; this is not a deployment or merge approval.
