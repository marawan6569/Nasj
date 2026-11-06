# NASJ website architecture — revised approval candidate

This revision preserves the accepted architecture: **Astro, TypeScript, Tailwind, GitHub Pages, English/Arabic content, official branding, and Approach D: the released report viewer inside a localized website wrapper.**

It replaces the previous proposal. Implementation remains pending final architectural approval.

## Change summary

1. **W0 now gates visual implementation:** defined composition deliverables, review coverage, and visual acceptance criteria.
2. **CI starts in W1:** every milestone adds its own regression tests; W5 becomes final integration and deployment-readiness verification.
3. **Demo security boundaries are explicit:** sandboxed embedding, direct hosted viewing, and downloaded-file viewing receive separate tests and evidence.
4. **Demo generation is specified:** exact inputs, CLI arguments, diagnostics, provenance assertions, normalization restrictions, and deterministic regeneration checks.
5. **Verification is separated:** marketing-site, embedded-viewer, standalone-viewer, automated, assistive-technology, and physical-device evidence cannot substitute for one another.
6. **Complexity is constrained:** three small metadata files, three verification tiers, portable document references, and a selected Astro version with production-CSP verification.

## 1. Repository findings and product accuracy

The original repository audit remains applicable:

- NASJ inspected at `958c5866e7e3ea8cbccd7b908aad9ae1156dace9`.
- Published v0.1.0 product commit: `b60cb2e045fc9476034bffba7967b8674825fa18`.
- Product crates and existing Nginx fixtures remain unchanged from that release in the inspected checkout.
- Product version **0.1.0** and experimental JSON schema **0.2** are distinct.

Launch copy may describe static Nginx analysis, includes, configured relationships, source-file/line evidence, conservative uncertainty handling, and JSON/DOT/SVG/offline HTML exports.

It must not describe runtime discovery, a local web server, request simulation, or runtime-confirmed infrastructure as implemented.

Documentation sources, expressed relative to the repository root:

- `docs/ANALYSIS.md`: supported semantics and uncertainty.
- `docs/REPORTS.md`: report behavior and historical browser coverage.
- `docs/DISTRIBUTION.md` and `docs/BINARY_VALIDATION_v0.1.0.md`: installation and tested platforms.
- `docs/ROADMAP.md`: future direction, checked against newer distribution evidence.
- `assets/logos/README.md` and its manifest: approved branding provenance.

For a future `docs/website/WEBSITE_PLAN.md`, links to sibling documentation use paths such as `../ANALYSIS.md`; repository-root assets use `../../assets/logos/README.md`. No local absolute paths enter the document or public artifacts.

The earlier Cargo, branding, and CSP checks remain recorded baseline evidence. This revision does not claim newly completed website tests.

## 2. Radivine lessons retained

Retain Radivine’s useful patterns:

- Static HTML and small progressive enhancements.
- Semantic theme tokens.
- Reviewed release metadata.
- Tests against production output.
- Base-path verification.
- Read-only release auditing.
- Exact-commit deployment approval and live artifact verification.

Improve or simplify them for NASJ:

- Begin CI in W1.
- Use screenshot comparisons, not screenshot capture alone.
- Keep metadata smaller.
- Separate routine PR checks from comprehensive launch checks.
- Reuse NASJ’s report instead of building a browser simulation.

Radivine’s visual language and unresolved manual verification risks are not inherited. Its website remains an architectural reference. [Inspected website architecture](https://github.com/marawan6569/Radivine/blob/c10afef50fe40bc85e9eef1aa072f34e085aaa31/website/README.md).

## 3. Visual direction and approval contract

**Precision Topology is provisionally accepted, pending W0 visual approval.**

The direction remains navy/teal, restrained routing lines, generous spacing, readable technical typography, and prominent source evidence. Existing approved logos remain unchanged.

### W0 composition deliverables

Produce reviewable static compositions before implementing website components:

| Deliverable | Required coverage |
|---|---|
| Full homepage | 1440-pixel desktop and 390-pixel mobile × light/dark × English/Arabic: eight compositions |
| Demo page | English desktop dark and Arabic mobile light |
| Installation page | Arabic desktop light and English mobile dark |
| Component/state sheet | Navigation, language/theme controls, buttons, links, focus, command blocks, diagnostics, disclosures |
| Responsive notes | Behavior at 320 and 768 pixels; Arabic expansion; report-frame sizing |
| Motion specification | Trigger, duration, purpose, and reduced-motion equivalent |

Use actual released-report captures with synthetic-fixture captions. Any conceptual topology illustration must be explicitly labeled illustrative.

### Visual acceptance criteria

Approval requires:

- The first screen identifies NASJ as a Nginx configuration visualization CLI and exposes **Explore the demo** and **Install NASJ**.
- Report evidence is legible at its intended display size.
- Clear hierarchy separates product claims, source evidence, limitations, and future work.
- Official artwork retains its colors, proportions, letterforms, and Arabic dots.
- English and Arabic layouts feel deliberately composed; Arabic is not merely right-aligned English.
- Commands, addresses, hashes, and filenames remain readable and LTR.
- No clipping or page-level horizontal overflow at 320 pixels; wide code uses a contained scrolling region.
- Text/control contrast meets the accessibility targets in section 7.
- Focus, active, disabled, warning, and unresolved states are visually distinct without relying only on color.
- Motion conveys a state change and is unnecessary for understanding.
- The design does not reproduce Radivine’s radial layout or decorative treatment.

W0 approval records the accepted compositions, tokens, and requested corrections. W1 component implementation starts only after that review. Later material visual departures require review of the affected compositions.

## 4. Sitemap and content specifications

English remains at `/Nasj/`; Arabic mirrors the routes under `/Nasj/ar/`.

| Route | Required content |
|---|---|
| `/` | Hero, real report preview, three-step workflow, shipped capabilities, exports, limitations, installation and contribution links |
| `/demo/` | Two examples, task instructions, sandboxed report, semantic summary, full-page and export links |
| `/install/` | Versioned assets, architecture guidance, checksums, runtime requirements, archive/package/source instructions |
| `/docs/` | First map, includes/prefix, strict mode, exports, evidence interpretation, troubleshooting, repository documentation links |
| `/compatibility/` | Tested platforms, browser evidence, unsupported analysis, uncertainty and sharing limitations |
| `/roadmap/` | Shipped, planned, and experimental statuses with evidence links |
| `/licenses/` | Project, dependency/font notices, branding provenance |
| `/404.html` | Bilingual recovery links and `noindex` |

Features and “How it works” remain homepage sections. Contributing links to the repository rather than adding an MVP page.

The homepage shows a genuine report preview and links to the demo; it does not load a second interactive report.

## 5. Interactive demo: security and generation contracts

### Architecture retained

Use actual v0.1.0-generated HTML inside:

```html
<iframe
  sandbox="allow-scripts"
  referrerpolicy="no-referrer"
  title="Localized description of the English NASJ report">
</iframe>
```

The implementation supplies a base-aware, allowlisted local `src`.

Do not add `allow-same-origin`, forms, popups, top navigation, injected translations, DOM integration, or a theme messaging bridge. The viewer remains English with independent theme controls.

### Three viewing contexts

| Context | Security boundary | Required tests |
|---|---|---|
| Embedded report | Opaque-origin sandbox plus report CSP | Functional tasks; parent DOM/storage inaccessible; sandbox tokens unchanged; no secondary network requests |
| Direct hosted HTML | Report CSP; no iframe sandbox; same website origin | Functional tasks, actual CSP enforcement, no secondary requests, opener isolation |
| Downloaded HTML | Report CSP under `file:`; browser-specific file-origin behavior | Open offline without neighboring assets; functional tasks and static no-JS fallback |

The full-page link opens the allowlisted report with `rel="noopener noreferrer"` and explains that it opens the standalone English report. Do not imply that direct viewing retains iframe isolation.

Tests asserting blocked capabilities use isolated test probes or browser automation; shipped report code is never instrumented or modified for testing. The hosted standalone report is trusted only because its generator, inputs, output bytes, and code are pinned and reviewed.

### Generator identity

All generated artifacts must use:

- Product tag: `v0.1.0`.
- Product commit: `b60cb2e045fc9476034bffba7967b8674825fa18`.
- CI generator: verified published Linux x86_64 archive.
- Archive SHA-256: `3ec95fbd277382902f2adb91e37205e33c8e20f10053b1cc0cd14cec97ad6c02`.
- Extracted executable SHA-256: `0cccbf0442c1cd6fc7124f649722fd7deb141798414416d3d749e13d4b7b4c38`.

Verify the archive against reviewed release metadata and `SHA256SUMS-binaries`, then verify the executable. Checking `nasj --version` alone is insufficient. Never substitute a build from current `main`.

### Example A: multi-host topology

**Input:** the byte-identical `fixtures/nginx/multi-vhost.conf` from the pinned release. Stage only approved inputs; no files may match its two optional include globs.

For each `FORMAT` in `json`, `dot`, `svg`, `html`, run:

```sh
"$NASJ_V010_BIN" map \
  --config "$STAGE/fixtures/nginx/multi-vhost.conf" \
  --prefix "$STAGE/fixtures/nginx" \
  --strict \
  --format "$FORMAT" \
  --output "$OUT/multi-vhost.$FORMAT"
```

`NASJ_V010_BIN` denotes the verified executable. `STAGE` and `OUT` are fresh temporary directories, with output outside the input tree. Every output path must initially be absent.

**Expected results:**

- Exit success for all four formats.
- Exactly two `include.empty` diagnostics, severity `info`, at source lines 2 and 3.
- Zero Warning/Error diagnostics.
- JSON contains 40 nodes and 37 edges.
- `analysis` is `configuration`; schema is `0.2`.
- Every emitted edge has `configured` evidence.
- Portal location `/` at line 24 has a `proxies_to` relationship to `portal_app`.
- `portal_app` has a `backed_by` relationship to `127.0.0.1:8100`, with line-7 evidence.
- Symbolic conditional branches remain symbolic; no evaluated request result or runtime confirmation is added.

### Example B: unresolved variable routing

The following are proposed fixture contents, not files created during planning. Preserve UTF-8, LF line endings, and a final newline.

`website/fixtures/unresolved/nginx.conf`:

```nginx
http {
    server {
        listen 8080;
        server_name unresolved.example.test;
        include routes.conf;
    }
}
```

`website/fixtures/unresolved/routes.conf`:

```nginx
location /dynamic/ {
    proxy_pass http://$backend;
}
```

For each of the same four formats:

```sh
"$NASJ_V010_BIN" map \
  --config "$STAGE/website/fixtures/unresolved/nginx.conf" \
  --prefix "$STAGE/website/fixtures/unresolved" \
  --format "$FORMAT" \
  --output "$OUT/unresolved.$FORMAT"
```

**Intentionally omit `--strict`:** the example is supposed to produce a Warning.

**Required results:**

- Exit success and a nonempty report for each format.
- Exactly one `routing.unresolved` Warning:
  `variable proxy_pass cannot be resolved statically`.
- Diagnostic source: `website/fixtures/unresolved/routes.conf`, line 2.
- Both input files appear in source provenance.
- The `/dynamic/` location retains line-1 provenance and `routing: unresolved`.
- No `proxies_to` edge leaves that location.
- No backend/target is fabricated from `$backend`; this fixture emits no target node or proxy edge.
- Remaining declaration/containment edges retain `configured` evidence.
- No edge carries `confirmed`, `inferred`, or `synthetic` evidence.

A separate negative test repeats generation with `--strict`, a fresh output path, and expects nonzero exit with **no output file created**. It must not form part of the successful artifact-generation command.

These unresolved-fixture expectations are derived from the inspected implementation and must be executed in W2 before baseline approval.

### Normalization and determinism

Normalize only the staged source-root prefix to repository-relative source references.

Implementation constraints:

- Patch allowlisted source-reference spans; do not perform unrestricted whole-document replacement or whole-document reserialization.
- Permitted fields include `sources`, source-location paths, `root_source` references, and their corresponding rendered source labels.
- Preserve every source line number.
- Executable JavaScript, CSS, CSP text, branding data, IDs, edge endpoints, labels unrelated to source paths, evidence, diagnostics, and graph geometry must remain unchanged.
- Embedded inert JSON may receive the approved source-path normalization; executable script elements may not.
- Fail on an unknown path occurrence or an unexpected output structure.

Verification must:

1. Compare protected script/CSS/CSP/branding bytes before and after normalization.
2. Recompute the viewer script digest and match the original report CSP and release hash.
3. Deep-compare graph data before/after, allowing only declared source-path substitutions.
4. Compare embedded JSON with the companion JSON export.
5. Regenerate in two differently named temporary roots and require identical normalized bytes for all four formats.
6. Compare normalized output with committed artifact hashes.
7. Include negative tests for accidental script replacement, line changes, added edges, and leftover private paths.

The website build copies approved report artifacts unchanged. No Astro HTML processing, minification, localization, or website CSP injection applies to them.

## 6. Stack, organization, and complexity limits

Select **Astro 7.4.4**, verified as the current stable release during this revision, with **Node 24.22.2 LTS**. Use strict TypeScript, Tailwind 4’s Vite integration, and npm with exact direct-dependency versions and a committed lockfile. Recheck support/advisories at W1; any necessary version update is documented and receives the same production checks. [Astro release](https://github.com/withastro/astro/releases/tag/astro@7.4.4), [published package metadata](https://registry.npmjs.org/astro/7.4.4), [Node release index](https://nodejs.org/dist/index.json).

Keep the original organization, with a smaller data layer:

```text
website/
  src/
    components/          layout, product, demo, content
    layouts/
    pages/               English and Arabic static routes
    content/en/
    content/ar/
    i18n/                typed strings and shared route definitions
    data/
      release.json
      demos.json
      assets.json
    lib/                 URL, validation and install-command helpers
    scripts/             theme, clipboard, example selector
    styles/
  fixtures/unresolved/
  public/demos/v0.1.0/
  public/brand/
  public/notices/
  scripts/               verification and regeneration
  tests/
```

Metadata boundaries:

- `release.json`: version, commit, assets/checksums, tested platforms and evidence references.
- `demos.json`: fixture/generator/output identity and expected diagnostics.
- `assets.json`: website-consumed branding/font/media provenance; reference the existing brand manifest instead of duplicating its inventory.

Features, roadmap, and limitations remain reviewed localized content with direct evidence references. Do not introduce a generic evidence database, CMS, custom schema framework, or separate catalog for every section.

Use only minimal frontmatter validation, typed translation keys, and manifest checks. No Rust public API, CLI, topology schema, or workspace changes.

## 7. Localization, themes, and accessibility

Retain:

- English unprefixed; Arabic under `/ar/`.
- Equivalent-route language switching without automatic redirects.
- Complete translated launch content.
- Logical CSS properties and explicit LTR isolation for technical strings.
- System/Light/Dark website preference, early initialization, blocked-storage tolerance, and no-JS system fallback.
- Approved light/dark logo variants.
- English-only viewer and independent viewer theme, explained in both languages.

Website accessibility targets remain:

- WCAG 2.2 AA.
- Semantic landmarks, skip navigation, visible focus, native disclosure navigation.
- At least 4.5:1 normal-text contrast and 3:1 large-text/meaningful-control contrast.
- Practical 44-pixel touch targets.
- Reflow at 320 CSS pixels and actual 200%/400% zoom.
- Reduced motion without loss of information.
- Accessible semantic report summary generated from JSON, without a second topology engine.

Passing website accessibility checks does not establish viewer accessibility. Section 11 defines separate evidence and disposition requirements.

## 8. Releases, CI tiers, and deployment

Installation continues to reflect the published x86_64/ARM64 archives and Debian packages, their GNU/Linux requirements, source installation, and separate source/binary checksum manifests. Never auto-promote GitHub’s latest release.

### Verification tiers

| Tier | Trigger | Required work |
|---|---|---|
| **Fast PR** | Every relevant PR, beginning W1 | Frozen install, formatting/type checks, content/unit tests, production `/Nasj/` build, links/assets/CSP inspection, Chromium smoke, affected visual regressions |
| **Comprehensive candidate** | Release-candidate dispatch and relevant high-risk changes | Full browser/locale/theme/viewport matrix; root and deeper bases; deterministic regeneration; security/license/artifact review; performance; fresh online release verification |
| **Scheduled online audit** | Weekly and manual | Published tag/assets/checksum bytes and latest-release drift; dependency advisory review; report results without modifying manifests |

Package/browser installation may require network access. Fast checks do not depend on live release APIs once dependencies and pinned test inputs are available.

Changes to demo fixtures, artifacts, manifests, or generation tooling add regeneration checks to that PR. Other milestones likewise add their tests when the behavior appears.

Scheduled failures signal maintenance work; they do not silently replace release metadata. A deployment requires a successful fresh release verification in its candidate run.

### Deployment

Retain static GitHub Pages hosting:

- Origin `https://marawan6569.github.io`, base `/Nasj/`, trailing-slash routes.
- Shared base-aware URL helpers.
- Localized metadata, canonical URLs, hreflang, sitemap, and 404 handling.
- Read-only validation jobs; normal PR events; pinned Actions.
- Canonical repository/main/exact-approved-SHA deployment guards.
- Deployment-only `pages: write` and `id-token: write`.
- Deploy the tested artifact rather than rebuilding after approval.
- No automatic Pages enablement or repository-setting changes.

Live verification checks routes, metadata, assets, report tasks, artifact hashes, and release downloads. Rollback uses a reviewed restoration commit, revalidation, new SHA approval, and redeployment.

## 9. Security, production CSP, and performance

### Production CSP acceptance

Enable Astro’s supported CSP generation, but verify the **emitted production artifact**, beginning in W1. Astro’s actual script/style directive handling must be accounted for, including more-specific `*-src-elem` directives. [Astro CSP reference](https://docs.astro.build/en/reference/configuration-reference/#securitycsp).

Website policy requirements:

- Only required local assets and exact approved inline-script/style hashes.
- No script `unsafe-inline` or `unsafe-eval`.
- `connect-src 'none'`, `object-src 'none'`, `base-uri 'none'`, and `form-action 'none'`.
- Frames restricted to local reports.
- External resource origins prohibited.
- No inline event handlers; theme behavior uses attributes/classes and stylesheet rules.
- CSP appears before the content it protects.

Tests parse every produced HTML policy, check effective directive precedence, recompute inline hashes, and exercise theme initialization and other enhancements in a production browser. Separate negative probes verify that unauthorized script and connection attempts are blocked. Expected negative-test violations are recorded separately from normal-use CSP errors.

The report retains its distinct release policy, including its existing inline-style allowance. Website policy requirements must not be applied by rewriting the report.

Do not claim unsupported meta-CSP protections such as `frame-ancestors`, or arbitrary response-header control on GitHub Pages. No production website CSP has yet been built or verified.

### Other safeguards

- Synthetic, allowlisted inputs only.
- No uploads, backend, discovery, telemetry, external fonts, or visitor API calls.
- Escape JSON-derived summary content.
- Reject private paths, unexpected artifact types, symlinks, source maps, and credential patterns.
- Review dependencies, licenses, and media provenance.
- Pattern scanning supplements human review.

### Budgets retained

| Metric | Launch budget |
|---|---:|
| Initial website JS | ≤20 KiB gzip |
| Shared CSS | ≤35 KiB gzip |
| Initial homepage transfer | ≤500 KiB |
| Each report | ≤250 KiB raw / ≤120 KiB gzip |
| Homepage report requests | Zero |
| Mobile lab LCP / CLS | ≤2.5 seconds / ≤0.1 |
| Representative demo interaction | ≤200 ms under the documented test profile |

Use three sequential fixed-profile production measurements. Do not represent lab timing as field INP evidence.

## 10. Revised implementation milestones

Across all milestones, preserve Rust source/behavior, topology semantics, release tags/assets, approved brand originals, and existing Rust/release workflows. Each milestone is a focused reviewable branch/PR after implementation authorization.

### W0 — Content and visual approval

- **Scope/deliverables:** section-3 compositions and state sheet; bilingual content outline; release facts; approval of the exact two-fixture contract.
- **Dependencies:** final architectural approval.
- **Verification:** all required compositions supplied; visual criteria reviewed; logo provenance checked; claims traced to evidence; corrections resolved or explicitly recorded.
- **Risks:** subjective visual ambiguity, Arabic expansion, misleading topology imagery.
- **Unchanged:** no website component implementation or hosting changes.

### W1 — Foundation, CI, and production smoke

- **Scope/deliverables:** pinned stack, localized shell, routes, themes, SEO/base helpers, production CSP, foundational validation workflow.
- **Dependencies:** W0 visual approval.
- **Verification:** frozen install/type/format/build pass; `/Nasj/` smoke in English/Arabic and light/dark at 1440/390 pixels; 320-pixel reflow; no-JS navigation; storage/theme tests; link checks; emitted-CSP and enforcement tests; initial screenshot baselines.
- **Risks:** CSP blocking the theme initializer, RTL defects, base-path errors.
- **Unchanged:** no report modifications or deployment permissions/settings.

### W2 — Pinned report demo and its regression coverage

- **Scope/deliverables:** exact fixtures, generation/normalization tooling, four-format artifacts, iframe, guidance, semantic summary, standalone/download links.
- **Dependencies:** W1.
- **Verification:** all section-5 generation assertions; strict negative test; two-root deterministic comparison; protected-byte checks; no-fabricated-edge assertions; embedded/direct/downloaded tests; search/selection/evidence tasks; offline/no-JS tests.
- **Risks:** path leakage, weakened sandbox, normalization damage, inherited viewer limitations.
- **Unchanged:** released viewer code/CSP, graph semantics, published artifacts.

### W3 — Complete bilingual content and installation

- **Scope/deliverables:** full route content, manifest-derived download commands, compatibility/roadmap distinctions, notices; online verifier available for candidate use.
- **Dependencies:** W1 and W2.
- **Verification:** translation parity; supported claim/status checks; correct asset/manifest associations; failure-stopping checksum instructions; links/SEO; content and command regression tests; fresh release verification for manifest changes.
- **Risks:** stale availability, overstated compatibility, schema/product-version confusion.
- **Unchanged:** release descriptions/assets and product documentation contracts.

### W4 — Visual and accessibility acceptance

- **Scope/deliverables:** approved-design completion, motion, expanded visual baselines, accessibility and physical-device evidence.
- **Dependencies:** W2 and W3.
- **Verification:** both locales/themes at 390/768/1440 plus 320 reflow; browser tests expanded to Firefox/WebKit; contrast and reduced-motion checks; manual tests in section 11; performance budgets; every viewer limitation resolved or dispositioned.
- **Risks:** Arabic shaping, focus traversal, touch/iframe scrolling.
- **Unchanged:** no silent viewer adaptation or relaxation of claims.

### W5 — Final integration, security, and guarded deployment readiness

- **Scope/deliverables:** comprehensive candidate verification, dependency/provenance audit, scheduled auditing, guarded deployment definition, rollback runbook.
- **Dependencies:** W4.
- **Verification:** clean-checkout candidate passes; `/`, `/Nasj/`, and `/preview/Nasj/` builds; complete browser matrix; deterministic reports; final CSP checks; artifact integrity; current release audit; unauthorized deployment cases rejected; Rust gates pass.
- **Risks:** permission mistakes, untested artifact promotion, incomplete verification records.
- **Unchanged:** no Pages activation, credentials, or publication. CI already exists and has run since W1.

### W6 — Separately authorized launch

- **Scope/deliverables:** approved hosting activation and exact-artifact deployment; public verification and rollback reference.
- **Dependencies:** W5, accepted manual evidence/risk dispositions, explicit launch authorization.
- **Verification:** approved SHA/artifact served at the intended URL; bilingual routes, demo contexts, 404, metadata, hashes, and downloads pass live checks.
- **Risks:** propagation/cache behavior and first-launch recovery.
- **Unchanged:** product releases, Rust code, branding, and custom-domain configuration.

MVP retains both languages, themes, the two real report examples, verified installation, accessibility work, and guarded publication. Additional scenarios, viewer localization, custom domains, search, analytics, and offline website caching remain later work.

## 11. Verification boundaries and acceptance records

Maintain a small review table, not another runtime metadata catalog.

Each result records: **surface, exact artifact/SHA, method, environment/version, task, outcome, and issue/disposition if applicable.**

### Separate surfaces

1. Marketing website and localized wrapper.
2. Semantic report summary.
3. Sandboxed embedded viewer.
4. Direct hosted standalone viewer.
5. Downloaded offline viewer.

A pass on one surface does not imply a pass on another.

### Separate evidence methods

| Method | What it establishes | What it does not establish |
|---|---|---|
| Automated Chromium/Firefox/WebKit | Tested scripted behavior on named engines/builds | Physical Safari/iOS/Android behavior |
| Axe and contrast automation | Detected rule/contrast results for inspected states | Full accessibility conformance |
| Manual NVDA/Firefox and VoiceOver/Safari | Named assistive-technology task outcomes | Every screen reader or browser |
| Physical iOS Safari/Android Chrome | Named device, browser, orientation, touch and download behavior | General mobile certification |
| Source inspection/historical release records | Documented implementation or prior evidence | New website acceptance |

Required tasks include navigation, language/theme controls, installation access, entering/leaving the iframe, backend search, evidence inspection, unresolved diagnostics, full-page viewing, and offline opening.

### Viewer limitation disposition

Every unresolved viewer limitation must have:

- A reproducible case and affected context.
- User impact and severity.
- Available fallback or mitigation.
- Named owner and follow-up issue.
- Explicit **fix before launch**, **accept for this launch**, or **defer launch** decision.

Security isolation failures, fabricated evidence, private-data leakage, and broken required demo tasks block launch. Preserving v0.1.0 does not authorize patching the bundled viewer; a required product fix needs separate approval and a revised release pin.

Lesser limitations may be accepted only when the required task remains achievable and the maintainer records the impact and mitigation. Untested manual/device behavior remains **unverified**, even if accepted as a launch risk.

Currently, this planning effort has no completed website, screen-reader, or physical-device acceptance evidence. Earlier Chromium feasibility results are narrow integration evidence only.

Required Cargo gates remain:

```sh
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
cargo build --workspace
```

## 12. Remaining approvals and execution boundaries

Only these approvals remain:

1. **Supervising architect:** approve this revised plan.
2. **W0 visual/content review:** approve the actual compositions, bilingual terminology, and proposed unresolved fixture.
3. **Launch-risk disposition:** approve any specifically documented residual limitation discovered during verification; no blanket waiver.
4. **Publication:** authorize Pages settings and deployment of the exact validated commit/artifact.

The stack, sitemap approach, bilingual routing, preserved English viewer, independent viewer themes, and sandboxed Approach D do not need to be reconsidered.

No website files or fixtures were written, Rust code modified, commits pushed, PRs opened, credentials created, or GitHub Pages enabled during this revision.