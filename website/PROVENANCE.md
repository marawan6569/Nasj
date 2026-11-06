# Website asset provenance

The [asset manifest](assets.json) pins each distributed brand image, report capture,
font and font license by SHA-256. `npm run verify` checks source hashes and the
emitted `dist/` bytes, including fingerprinted fonts, and checks brand copies
against their repository sources. Its complete artifact inventory policy also
rejects unapproved additions. No replacement artwork was generated.

## Identity

Source: [official NASJ branding documentation](../assets/logos/README.md) and
[manifest](../assets/logos/manifest.json). PNGs are copied byte-for-byte. The header
and footer use existing 320×166 `logo_report_dark.png` / `logo_report_light.png`
display variants, rendered proportionally. The larger approved light logo supplies
initial Open Graph metadata; the approved 64px app icon supplies the favicon.

## Static report captures

These are screenshots of actual **published v0.1.0** output, not website-rendered
topology or illustrative edges. The pinned commit, binary digest, normalized report
digest and synthetic fixture digest are recorded in `assets.json`.

- Release: [NASJ v0.1.0](https://github.com/marawan6569/Nasj/releases/tag/v0.1.0).
- Fixture: [fixtures/nginx/multi-vhost.conf](../fixtures/nginx/multi-vhost.conf).
- Original W0 generation used the release binary with
  `nasj map --config fixtures/nginx/multi-vhost.conf --format html -o report.html`.
  The optional include globs produce informational diagnostics. This capture is
  not an unresolved-routing example or a new W2 artifact-generation contract.
- The W0 report removes the checkout prefix from source references only. Its
  viewer JavaScript, styles, CSP, graph semantics and source line numbers were
  preserved. W1 consumes that already-pinned report without further normalization.
- The report contains 40 nodes and 37 configured relationships. The selected
  backend `127.0.0.1:8100` comes from `multi-vhost.conf:7`. The website verifier
  checks the fixture digest; it does not claim to regenerate or analyze topology.
- Capture procedure: offline Chromium, select the requested light/dark system
  theme, search `127.0.0.1:8100`, select the match, choose the viewer's readable
  scale, then inspect the selection. Desktop viewport: 1280×720, device scale 2.
  Mobile viewport: 342×900, scale 2. Capture the graph's central 342×240 area and
  the complete selection inspector separately. No viewer code or DOM content was
  edited to obtain these images.
- W1 fixes the W0 mobile crop coordinate error: that old image showed overview
  counts instead of the selected graph node. The replacement captures the actual
  node and source label. Light mobile captures use the same released viewer.

The static viewer remains English in both website languages. Captions identify
static/cropped output and runtime-unverified relationships. The evidence callout,
workflow tokens and reformatted code card are website editorial summaries, not
screenshots or independently generated topology evidence. The code excerpt uses
actual fixture lines 20–24 and 28, with visual wraps and explicit omission marks.

## Fonts

Inter and Noto Sans Arabic are the W0 fonts; OFL notices are distributed in
`public/licenses/`. Font sources were downloaded during W0 from Google Fonts:

| Source                                                                                                                      | Original SHA-256                                                   |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [Inter variable](https://github.com/google/fonts/blob/main/ofl/inter/Inter%5Bopsz,wght%5D.ttf)                              | `29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031` |
| [Noto Sans Arabic variable](https://github.com/google/fonts/blob/main/ofl/notosansarabic/NotoSansArabic%5Bwdth,wght%5D.ttf) | `63111b5b2e074dd48cc67692e0a2726d86ee94c1c37fe8598257b7b4e87e869e` |
| [DejaVu Sans Mono 2.37](https://dejavu-fonts.github.io/)                                                                    | `a54dca07c76d6289e717e75e0a58c0128f6d7269ef3faf76417c9d7d3bba37ab` |

The DejaVu file came from the local Ubuntu `fonts-dejavu-core` package. It is the
monospace family used by W0, now served locally for repeatable browser rendering.
Its Bitstream Vera notice and the public-domain status of DejaVu changes are
distributed in `public/licenses/DejaVu-LICENSE.txt`.

FontTools 4.68.0 and Brotli 1.2.1 produced WOFF2 subsets. No glyph shapes were
redrawn. Variable axes: Inter `opsz=14`, `wght=400:700`; Noto `wdth=100`,
`wght=400:700`. All layout features were retained. Unicode sets:

- Inter/DejaVu: `U+0000-00FF,U+2000-206F,U+2190-2199`.
- Noto: `U+0600-06FF,U+0750-077F,U+08A0-08FF,U+200C-200F,U+FB50-FDFF,U+FE70-FEFF`.

Use `fonttools varLib.instancer` for the stated variable axes, then `pyftsubset`
with `--flavor=woff2 --layout-features='*'` and the stated Unicode sets. Retain
the original copyright/license metadata. Font updates require new source hashes,
asset hashes, license review and a visual review, not silent substitution.

## Dependencies and build output

The lockfile records registry URLs, exact versions and integrity hashes. The
dependency verifier inventories licenses, including MPL build/test tools and
Sharp/libvips platform packages with LGPL notices. These packages remain in the
build toolchain; `node_modules` is not part of the static output. Browser code is
the project's small theme/navigation script. The project MIT license and Tailwind's
MIT license for generated CSS are distributed under `public/licenses/`. No external image service or CDN is
used by visitors. Only `dist/` is a future deployment artifact.

## W1 visual baseline identity

[Baseline provenance](reviews/baseline-provenance.json) records the exact
uncommitted tree independently reviewed before remediation, all 12 existing
screenshot hashes, and the available W0 reference hashes. This is a retrospective
identity/revalidation record; a contemporaneous per-capture environment log was
not preserved and is not being invented. The capture environment was reported as
Ubuntu 26.04 with Node 24.22.1 and locked Playwright 1.64.1; independent revalidation
used Ubuntu 26.04.1 LTS and Chromium revision 1248. Remediation uses Node 24.22.2.
Exact observed browser/npm versions and build digests are in the remediation
identity records. Existing PNG baseline bytes remain unchanged.

The larger export-format cards and closer desktop graph framing are explicitly
accepted W1 refinements from the later W0 adaptations, including their use on the
English-dark homepage. They are preserved alongside the previously documented
static-preview wording, usable native controls and mobile crop correction.

GitHub's Ubuntu 24.04 runner differs from the local Ubuntu 26.04.1 host. Local
success does not establish hosted baseline portability. Investigate the first
hosted comparison; do not automatically replace references to hide differences.

## W2 authentic reports

The [demo manifest](src/data/demos.json) records the published v0.1.0 archive,
checksum-manifest and executable SHA-256 values; the exact three synthetic fixture
hashes; expected diagnostics; released viewer script/style/branding hashes and
CSP; and each normalized JSON/DOT/SVG/HTML output's hash, size and gzip size.
These new reports are separate from the unchanged W0/W1 screenshot assets above.

The CLI runs with absolute staged config/prefix paths, `--strict` for multi-vhost,
and without `--strict` for unresolved. Source tokens and corresponding SVG titles
are the only normalized spans. An independent semantic comparison preserves all
source lines, nodes, edges, attributes, conditions and evidence. Protected viewer
bytes and embedded/companion JSON are checked. Two fresh roots must produce
identical bytes; production copies must match the manifest and source artifacts.

The release pin remains v0.1.0 at commit
`b60cb2e045fc9476034bffba7967b8674825fa18`. No binary is redistributed by the
website; the test-only generator cache is outside the checkout. Existing NASJ
MIT notices cover the genuine reports. No new third-party assets or dependencies
were introduced. See [W2 handoff](reviews/W2.md) for commands and evidence.
