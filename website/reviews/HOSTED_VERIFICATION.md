# Hosted verification and failure disposition

PR: https://github.com/marawan6569/Nasj/pull/26

First candidate: `62dccd98aab44086d0740be6fb6468022469b75f`.
[Website run 42331036271](https://github.com/marawan6569/Nasj/actions/runs/42331036271)
failed; its foundation and candidate-rust jobs passed.
[Rust run 42331036151](https://github.com/marawan6569/Nasj/actions/runs/42331036151)
passed. Project matrix: 201 passed, 45 failed. Failure evidence is retained:
[project artifact](https://github.com/marawan6569/Nasj/actions/runs/42331036271/artifacts/13558250531),
ZIP SHA-256 `2ffda5afca2d384df7ffae410029a8bd840e160772e73cb672c9a0b3e57534e8`.
A downloaded copy was independently hash-checked before trace inspection.

## Causes and corrections

- Firefox sandbox popup denial throws `InvalidAccessError`; Chromium returns null.
  The assertion recognizes that exact DOM exception and additionally verifies no
  new page was created. Parent DOM/storage denial assertions remain unchanged.
- Firefox does not emit the initial `file:` navigation request event. Tests now
  assert the exact loaded URL, no other requests and zero secondary resources,
  plus unchanged file hashes, tasks, offline/no-JS behavior and CSP probes.
- Firefox serialized a 44px target as 43.999996px. Export targets now reserve 45px;
  the existing 44px minimum assertion remains unchanged.
- WebKit 27.2 revision 2370 emits a false `style-src-attr` violation for native
  select elements, even in a minimal document with no author styles/scripts.
  Removing the select eliminates the violation; website scripts and axe are not
  responsible. See [upstream issue 43497](https://github.com/microsoft/playwright/issues/43497)
  and its linked WebKit bug 327212. Playwright is upgraded from exact 1.64.1 to
  exact 1.65.0 (WebKit revision 2388). The new engine must pass the same strict
  tests; no console filtering, CSP relaxation, browser exclusion or baseline
  replacement is allowed.

The five targeted Firefox regressions passed locally on 1.64.1 after correction.
Local browser libraries were extracted into a temporary user directory; no system
package installation, elevation or Docker access occurred. WebKit debugging used
an explicit executable/environment because its launcher overwrites library paths.
Hosted runners use standard Playwright installation with system dependencies.

Final rerun evidence is added after completion. A failed run is never a launch pass.

Local reproduction with Playwright 1.65.0 / WebKit revision 2388 produces zero
CSP violations on the same page and policy. This confirms the engine update fixes
the native-control regression without changing the website's CSP or controls.

The second hosted run 42430827690 cleared normal WebKit navigation and Firefox
failures. Eight WebKit content cases still encountered automation-generated CSP
errors only when capturing screenshots. Local reproduction and Playwright's
`inPagePrepareForScreenshots` source confirm WebKit screenshot synchronization
unconditionally appends a `body {}` style element. Even `caret: initial` does not
avoid it. Optional content captures now use Chromium, consistent with the existing
visual-comparison project. All Firefox/WebKit functional, accessibility, network
and zero-console-error assertions remain enabled and unchanged. No CSP error
filter or permission relaxation was introduced.

Run 42431392416 passed all 246 project and 186 cases at each additional base,
including Firefox/WebKit isolation and zero normal-use CSP errors. The visual
step exposed configuration merging: `defineConfig(common, overrides)` concatenated
project arrays, comparing Firefox/WebKit against Chromium-only baselines. All 24
Chromium comparisons passed; 48 unintended cross-engine comparisons failed. The
visual config now spreads the common config before replacing `projects`, retaining
its intended single Chromium project. The full functional matrix remains three
engines. No baselines or screenshot tolerances changed.

Run 42432206552 passed all 618 functional cases and 24 intended visual comparisons,
but its three Arabic mobile lab runs measured CLS 0.225985 (English 0.000639).
LCP, transfer and interaction budgets passed. The failed performance trace/report
is retained in project evidence artifact 13598107829. Font scheduling now preloads
all three already-bundled fonts with high priority because both locales use mixed
Arabic, Latin and technical text. Final typography is unchanged. Performance
evidence additionally records individual shift sources, and performance now runs
before the long matrix so a budget defect is visible earlier. Thresholds remain
unchanged; the final full run must pass.

Run 42433092665 showed that font priority alone was insufficient: Arabic CLS
remained 0.223638. New shift attribution identifies painted fallback glyphs and
the source card moving when fonts swap. The bundled fonts now use `font-display:
block` with high-priority preload: text has a short font-loading block period
instead of visibly replacing fallback glyphs. Final typography, no-JS operation
and all budgets/thresholds remain unchanged. The final hosted measurement is
required to establish the result.

Run 42433392646 reduced Arabic CLS to 0.139698, still above budget. A delayed-font
reproduction identifies the remaining mechanism: the system fallback adds a lead
line (96px instead of 64px) and wraps evidence labels (49px instead of 22px).
A metric-adjusted local DejaVu Sans fallback at 94% keeps those blocks at exactly
their final heights while the bundled font loads. The final font still takes
precedence; this does not change final typography or screenshots. An explicit
font-delay regression now compares pre/post-load geometry, in addition to the
unchanged full performance budget tests. No local fallback font is redistributed.

The adjusted fallback is restricted to the Arabic ranges of the bundled face.
Latin characters continue to use the original Inter fallback after the Arabic
font loads; a local face must not change final mixed-script typography.
