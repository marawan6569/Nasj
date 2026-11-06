# W2 final remediation evidence

The independent Codex review returned CONDITIONAL PASS, with no BLOCKER or HIGH
findings. The maintainer approved the architecture, authentic provenance, isolation,
and visual direction and authorized this focused remediation and GitHub PR.

## Corrections

- Routine CI uses `demos:ensure`, an exact digest-keyed cache and validation of every
  restored archive, checksum manifest and executable. Independent release pins are
  checked against metadata. Missing inputs alone are downloaded; corruption and
  symlinks fail closed. Extraction verifies executable bytes before execution.
  Only canonical main push jobs save generator caches; PR jobs restore but never
  save them. No fallback cache keys are used. A cold PR may need downloads until a
  trusted main cache exists. `demos:fetch` remains an explicit forced online check.
- JSON/DOT/SVG download links have at least 44-by-44 CSS-pixel clickable areas.
- Commit, executable and artifact hashes use explicit LTR isolation. Arabic
  320/390/1440 checks assert exact text, direction, isolation and document reflow.
- Localized iframe accessible names inherit the wrapper locale. The original
  report document retains `lang="en"` and its released bytes.
- Parsed resource attributes reject single-quoted external resources and local
  stylesheet references. Existing protected-byte and complete artifact validation
  remain required; the helper does not replace whole-file identity checks.

## Validation

Node 24.22.2, npm 11.19.1, locked Playwright 1.64.1 / Chromium 156.0.8078.4,
Ubuntu 26.04.1, Linux x86_64. Fresh `npm ci --no-audit` completed. Formatting,
Astro/TypeScript, dependency-source/license inventory, production build and
artifact verification pass. The dependency audit reports zero vulnerabilities.

The original 62 artifact cases pass. The original 45 contract cases plus two
resource-guard cases pass (47). Ten cache cases cover valid offline reuse, missing
inputs, corruption of each of three files, unavailable network, malicious download,
symlink rejection and replacement of the independent manifest pin.

The browser matrix runs with snapshot updates disabled. It includes the original
12 W1 screenshot comparisons, sandbox/CSP/direct/offline/no-JS tasks, plus the new
RTL/title/touch-target regression. Project-prefix Chromium passes 47/47; root and deeper prefixes each pass 31/31. All eight report hashes and all twelve baseline PNGs remain
unchanged. Required Rust fmt/clippy/test/build gates and workflow lint pass.

Original W2 gallery/source identities remain historical evidence of the reviewed
pre-remediation implementation, rather than identities of the final tree.

## Inherited limitations for launch-readiness review

Owner: maintainer, during W4/final launch-readiness disposition. These are open
verification/disposition items, not launch acceptance or blanket waivers:

- Mobile selected-node evidence can start below the iframe viewport. Internal
  scrolling and the released **Inspect selection** control expose it; standalone
  viewing and wrapper source evidence are additional mitigations.
- The released viewer is English-only, with independent theme controls. Both
  wrappers explain this and provide localized narrative and semantic evidence.
- Graph context can be outside the visible frame. Search, Fit view, Readable scale
  and the complete semantic relationship list provide available alternatives.
- Wrapper axe and Chromium tasks do not certify viewer WCAG compliance. Manual
  screen-reader, physical-device/touch, actual zoom, Firefox/WebKit and broader
  performance evidence remain required by the later acceptance milestone.
- Direct reports share the website origin and leave iframe isolation. The wrapper
  discloses this; pinned viewer code/inputs, released CSP and noopener links are
  the applicable protections. No origin-isolation claim is made for direct views.

The final launch review must assign follow-up issues and explicit dispositions to
remaining viewer limitations. No Rust/viewer/release change, baseline update,
merge, deployment, Pages configuration or W3 work is part of this remediation.
