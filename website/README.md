# NASJ website — W1 + W2

Static Astro foundation for `https://marawan6569.github.io/Nasj/`. W0's Precision
Topology design is the reference. The English/Arabic homepages retain the approved W1 treatment. W2 adds localized
demo pages around authentic, pinned v0.1.0 reports, offline exports and accessible
source evidence. No download catalog, runtime discovery or deployment is included.
The exact approved [architecture](../docs/website/WEBSITE_PLAN.md) is preserved.

## Develop and verify

Use the Node version in [.nvmrc](.nvmrc) and its bundled npm 11.

```sh
cd website
nvm use
npm ci --no-audit
npx playwright install chromium
npm run dev
```

Production checks (the development server is not CSP evidence):

```sh
npm run format:check
npm run check
npm run verify:dependencies
npm run demos:ensure
npm run test:cache
npm run demos:verify
npm run build
npm run verify
npm run test:artifacts
npm run test:demos
npm test -- --update-snapshots=none
```

`npm run preview` serves production output at `http://127.0.0.1:4321/Nasj/` with
real 404 responses. Playwright starts this server itself. Stop a manually started
preview before testing a different base. `WEBSITE_BASE=/review/Nasj/` overrides the
build, verifier and test server together. Root `/` is supported too.

Normal test runs set `updateSnapshots: "none"`. `npm run test:update` explicitly updates screenshot references. Review each changed image
against the approved direction before accepting it; never update references just
to silence a failure. All fonts used by the website are local, including the
monospace font, to reduce host-dependent rendering differences.

## Structure and boundaries

- `src/layouts/SiteLayout.astro`: document, initial SEO, early theme script.
- `src/components/`: shared navigation/footer, homepage sections, static preview.
- `src/lib/`: a base-path helper and a small, typed EN/AR editorial dictionary.
  Trusted markup in that dictionary is build-time copy, never configuration input.
- `src/styles/global.css`: approved W0 styles, responsive/RTL and theme rules;
  Tailwind 4 is integrated through Vite. No UI framework is hydrated.
- `src/scripts/theme.ts`: System/Light/Dark, resilient storage, language hash
  preservation and native-menu keyboard enhancements.
- `public/brand`, `public/reports`, `src/assets`: approved identity, authentic
  report captures, licensed font subsets. See [PROVENANCE.md](PROVENANCE.md).
- `scripts/`, `tests/`: production-output checks and Chromium/axe/screenshot gates.
- `public/demos/v0.1.0/`: eight verified JSON/DOT/SVG/HTML exports.
- `src/data/demos.json`: generator, fixtures, diagnostics and output identities.
- `reviews/`: milestone evidence and screenshots; not copied into the build.

The generated routes are `/`, `/ar/`, `/demo/`, `/ar/demo/`, `404.html` and
`sitemap.xml`, under the configured base. Navigation's report link opens the
localized demo; homepage CTAs and static captures retain their approved visual
presentation. The homepage never requests interactive reports. Documentation and
installation still link to the existing READMEs and published release.

Localization remains in typed component copy and `src/lib/copy.ts`; URL helpers
remain in `src/lib/paths.ts`. Root `assets.json` owns media/font/license provenance;
its `report` field describes historical W0 captures. `src/data/demos.json` owns
W2 generator/fixture/output provenance. The future `release.json` download catalog
is not implemented. Notices remain under `public/licenses/`.

## Pinned demo regeneration

On Linux x86_64, `npm run demos:ensure` provisions missing inputs from the published v0.1.0 archive
and checksum manifest, verifies their reviewed digests, extracts just the `nasj`
member, verifies its independent digest/version, and caches it outside the checkout.
`NASJ_DEMO_CACHE` can select that cache directory. Every restored archive, checksum
manifest and executable is rehashed against independent release pins. Corrupt or
symlinked inputs fail closed; no cached executable is run before verification.
The executable is re-extracted from the verified archive before use. With valid
inputs, provisioning makes no network request. `demos:fetch` explicitly forces
online refresh for manual/candidate use. No current Rust build is used.

CI restores an exact cache key containing all three release digests, without
fallback keys. Only canonical main push jobs save this cache after verification;
PR jobs never save it. Cache restoration is not evidence of integrity. Changed
pins or verification code still require review before merge. GitHub's PR cache
scope does not grant a PR's cache to main.

`npm run demos:verify` uses the verified cache without network access. It stages
only the three approved fixture files, generates JSON/DOT/SVG/HTML in two different
fresh roots, validates exact diagnostics and source evidence, normalizes only
allowlisted source spans, and compares all eight outputs against published website
copies and their manifest identities. Strict unresolved generation must fail for
all four formats without creating output. Nothing is written to the source tree.

`npm run demos:generate` is the explicit maintainer operation that writes report
copies and records their new hashes. It is never used by CI or a verification
command; generated diffs require independent review. Report files are excluded
from Prettier because the released HTML/SVG/JSON/DOT bytes must be preserved.

## Artifact publication policy

`scripts/artifact-policy.mjs`, called by `npm run verify`, checks the entire
production directory before CSP/link checks. W1/W2 permit the five named website HTML
documents, eight individually hash-pinned report files, sitemap, fingerprinted Astro CSS/JS, fingerprinted approved WOFF2
fonts, and manifest-pinned brand/report PNGs and license text. An explicitly
pinned `manifest.json` or `manifest.webmanifest` is supported; neither is required
or currently shipped. The existing empty `public/fonts` directory is allowed;
files there are not. New resource classes/routes require a policy review.

The policy rejects symlinks (including the output root), non-regular files,
executable modes/headers, source maps/references, archives, hidden/unexpected
files and directories, and missing required output. Copied assets and emitted
fonts must match approved hashes. Every allowed text resource is checked as UTF-8
and scanned for development-home/temp paths, private-key markers, recognizable
AWS/GitHub credentials, and credential-bearing HTTP URLs. Diagnostics never print
matched secret values. These narrow signatures supplement review; they do not
guarantee the absence of secrets, inspect arbitrary binary metadata, or provide
isolation against a concurrently modified filesystem.

`npm run test:artifacts` runs positive and negative tests against disposable copies
of a production build. It never changes `dist/` or visual baselines.

## CSP

Astro 7.4.4's stable `security.csp` generates the production policy. The exact
compiled early theme script is explicitly hashed because it is inserted with
`set:html`. `scripts/early-csp.mjs` moves the generated meta tag immediately after
the charset declaration. It does not edit the policy or script/style contents.

The verifier checks the **built output**, including effective `script-src-elem`
precedence, hashes and policy ordering on all five website HTML pages. Browser probes
prove that an unapproved inline script and a connection request are blocked.
Local styles, images and fonts are allowed; connections, objects, workers,
base URLs, forms and inline script/style attributes are blocked. Homepages/404
block frames; demo pages permit same-origin frames with an exact build-verified
report URL allowlist and `sandbox="allow-scripts"`. No `unsafe-inline`
or `unsafe-eval`, remote fonts, analytics, client API requests or runtime dependencies.

This is a meta-delivered policy; it does not claim header-only protections such as
`frame-ancestors`. The copied report retains its distinct released policy, including
its inline-style allowance. Embedded reports cannot access parent DOM/storage,
open popups, submit forms or navigate the parent. Direct and downloaded reports
retain the report CSP but are outside the iframe sandbox; the wrapper explains this.

## Verification tiers

Fast PR CI performs formatting, strict type checks, production build/output checks,
dependency-source/license checks, Chromium smoke/axe checks, 12 visual comparisons,
pinned report regeneration/mutation tests, and root/deeper-prefix browser checks. It has `contents: read` only and no deployment job.
Existing Rust/release workflows are unchanged.

Browser evidence uses `WEBSITE_TEST_RUN` labels (`project`, `deeper`, or `root`)
under `test-results/` and `playwright-report/`. Failed tests retain traces and
screenshots. CI attempts the deeper-prefix checks even after a project browser
failure when production verification and browser installation succeeded, then
uploads all three runs in both directories with `if: always()`. GitHub-hosted execution remains
pending separate commit/push/PR authorization.

Review identity records are in `reviews/baseline-provenance.json` and
`reviews/remediation-*-identity.json`. After verification,
`node scripts/review-identity.mjs` emits a read-only source/build/environment
inventory and checks that the original 12 baseline files are byte-identical.
Set `WEBSITE_BASE` to the base of the build being recorded. The identity excludes
review records and generated/cache directories to avoid recursive hashes; each
file digest and the aggregate algorithm are recorded explicitly.

Later release-candidate gates must include broader browser/device/assistive-tech
coverage and deployment verification. Scheduled online release freshness/checksum
auditing belongs with the later download catalog. W2 fetches the exact pinned
generator for reproducibility, without adding a general release freshness service.
Use `npm audit --audit-level=high` explicitly for an online dependency audit.

See [W2 review](reviews/W2.md) for current results and limitations, and
[W1 review](reviews/W1.md) for historical W0 adaptations. Nothing here enables
GitHub Pages.
