# Official NASJ identity — نسج

The maintainer supplied `NASJ_Logos_Corrected_v2.zip` in the project root. All
seven PNGs were decoded and visually inspected on light/dark backgrounds. The
wordmark reads **نسج**: the initial **ن** has exactly **one dot above**. Icon-only
artwork contains no wordmark. No SVG or editable vector artwork was supplied.
No AI generation, recoloring, letterform editing or replacement designs were used.

## Provenance and originals

Archive SHA-256:
`ee6dd170b2ca1069d0a1d477d5615178f022caece62a211a649ed5b4117b4d73`.
Entries were checked before extraction: no absolute/traversal/duplicate paths,
backslash paths, symlinks, special files or encryption; file count, expanded size
and compression were bounded. Extraction used a new temporary directory.

The selected files under [originals/](originals/) are **byte-for-byte originals**.
[manifest.json](manifest.json) records sizes, color modes, transparency and SHA-256
for every archive PNG, including the three variants left in the local archive.
The transport ZIP is retained locally and ignored by Git; it is not distributed.

| Supplied filename | Dimensions / mode | Use and background | Retained |
| --- | --- | --- | --- |
| [logo_primary_transparent.png](originals/logo_primary_transparent.png) | 1254×1254, RGBA, real alpha 0–255 | Color wordmark for light backgrounds; source for README/report light logo | Yes |
| [logo_primary_monochrome_light_transparent.png](originals/logo_primary_monochrome_light_transparent.png) | 1254×1254, RGBA, real alpha 0–255 | White wordmark for dark backgrounds; source for README/report dark logo | Yes |
| [logo_icon_only_transparent.png](originals/logo_icon_only_transparent.png) | 1254×1254, RGBA, real alpha 0–255 | Standalone mark for light-background identity uses | Yes |
| [logo_app_icon_color.png](originals/logo_app_icon_color.png) | 1254×1254, RGB, opaque | Navy rounded-square app icon with light outer canvas; source for report favicon | Yes |
| `logo_primary_full_color.png` | 1254×1254, RGB, opaque | Color wordmark on light canvas; redundant for current display uses | Archive only |
| `logo_primary_monochrome_dark.png` | 1254×1254, RGB, opaque | Dark wordmark on light canvas; optional print variant | Archive only |
| `logo_app_icon_monochrome.png` | 1254×1254, RGB, opaque | White mark on navy app icon; alternate not used by this preview | Archive only |

The unused opaque alternatives were not copied into Git. App-icon availability
is branding material, not a claim that a desktop app or server is implemented.

## Display assets

| File | Dimensions | Purpose |
| --- | --- | --- |
| [logo_primary_light.png](display/logo_primary_light.png) | 640×332, RGBA | GitHub README hero on a light background |
| [logo_primary_dark.png](display/logo_primary_dark.png) | 640×332, RGBA | GitHub README hero on a dark background |
| [logo_report_light.png](display/logo_report_light.png) | 320×166, RGBA | Light-theme HTML report header |
| [logo_report_dark.png](display/logo_report_dark.png) | 320×166, RGBA | Dark-theme HTML report header |
| [logo_app_icon_64.png](display/logo_app_icon_64.png) | 64×64, RGB | Embedded HTML favicon |

The two wordmark sources have large outer canvases. Display copies use the
rectangle `(0, 330, 1254, 980)` (left, top, right, bottom), retaining the complete
mark, Arabic dots and Latin name. Only outer canvas is omitted. They are then
proportionally reduced using Pillow 13.0.0 LANCZOS, with at most one pixel of
integer rounding, and losslessly PNG-encoded (`optimize=True`). The app icon is
reduced as a complete square without cropping. Colors, alpha and letterforms
are not retouched. Full original canvases remain available above.

Small report copies avoid embedding README-sized PNGs into every report. Their
base64 packaging in `crates/nasj-export/src/assets/brand-*.data-uri` is an intentional
build asset: Rust embeds it directly without an image/base64 runtime dependency.
Only these trusted PNGs are inserted into HTML; no configuration data supplies
image URLs. The report needs no neighboring assets directory or network access.

Check provenance, PNG CRC/dimensions, display hashes and exact embedding with:

```sh
python3 tools/branding.py --check
```

`python3 tools/branding.py` refreshes only the base64 wrappers from reviewed PNGs.
It never modifies originals or redraws artwork. Display changes require explicit
visual review and a manifest checksum update; the check deliberately rejects
silent replacements. Browser tests also decode images, check aspect ratio and
alt text, test themes/no-JS/moved-file behavior and reject injected images.

Branding implementation is ready for review. [Issue #6](https://github.com/marawan6569/Nasj/issues/6)
remains open until acceptance and merge; nothing here publishes a release.
