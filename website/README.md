# NASJ website — W1

Static Astro foundation for `https://marawan6569.github.io/Nasj/`. W0's Precision
Topology design is the reference. This milestone contains the English/Arabic
homepage, shared shell, theme control, static report captures and bilingual 404.
It does **not** contain the interactive viewer, a download catalog, runtime
discovery, or a deployment workflow.

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
npm run build
npm run verify
npm run test:artifacts
npm test
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
- `reviews/`: W1 handoff and screenshot review index; not copied into the build.

Only `/Nasj/`, `/Nasj/ar/`, `404.html` and `sitemap.xml` are generated. Feature and
preview navigation uses homepage anchors. Documentation links to the existing
localized README; installation links to the published v0.1.0 release. Full content
routes and download metadata remain outside W1.

The W1 directory simplification is intentional: `src/lib/copy.ts` owns typed
editorial translations, `src/lib/paths.ts` owns URL/locale helpers, root
`assets.json` owns website-consumed media/font/license hashes, and
`public/licenses/` contains distributed notices. Its `report` field records only
the provenance of static W0 captures. When later milestones introduce the planned
metadata, `release.json` will own release assets, checksums and platform evidence;
`demos.json` will own fixture/generator/output identity and expected diagnostics;
`assets.json` will continue to own website media provenance and references to
official brand sources. Those future responsibilities are not implemented here.

## Artifact publication policy

`scripts/artifact-policy.mjs`, called by `npm run verify`, checks the entire
production directory before CSP/link checks. W1 permits the three named HTML
documents, sitemap, fingerprinted Astro CSS/JS, fingerprinted approved WOFF2
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
precedence, hashes and policy ordering on all three HTML pages. Browser probes
prove that an unapproved inline script and a connection request are blocked.
Local styles, images and fonts are allowed; connections, frames, objects, workers,
base URLs, forms and inline script/style attributes are blocked. No `unsafe-inline`
or `unsafe-eval`, remote fonts, analytics, client API requests or runtime dependencies.

This is a meta-delivered policy; it does not claim header-only protections such as
`frame-ancestors`. W2's generated report will have its own separate CSP/security
boundary. W1 does not ship its HTML or execute its JavaScript.

## Verification tiers

Fast PR CI performs formatting, strict type checks, production build/output checks,
dependency-source/license checks, Chromium smoke/axe checks, 12 visual comparisons,
and a deeper-prefix smoke check. It has `contents: read` only and no deployment job.
Existing Rust/release workflows are unchanged.

Browser evidence uses `WEBSITE_TEST_RUN` labels (`project`, `deeper`, or `root`)
under `test-results/` and `playwright-report/`. Failed tests retain traces and
screenshots. CI attempts the deeper-prefix checks even after a project browser
failure when production verification and browser installation succeeded, then
uploads both directories with `if: always()`. GitHub-hosted execution remains
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
auditing belongs with the later download catalog; it is not simulated in W1.
Use `npm audit --audit-level=high` explicitly for an online dependency audit.

See [W1 review](reviews/W1.md) for results, W0 deviations and remaining verification
limits. Nothing here enables GitHub Pages.
