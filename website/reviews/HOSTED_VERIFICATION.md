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
