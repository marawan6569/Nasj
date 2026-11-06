# W2 review screenshots

New review captures of the production build, not approved regression baselines.
The genuine embedded viewer is searched for `127.0.0.1:8100` and that result is
selected. The parent Arabic page does not translate or theme the viewer.

| Locale / parent theme / width | Introduction                                | Embedded original report                     |
| ----------------------------- | ------------------------------------------- | -------------------------------------------- |
| en / dark / 1440px            | [View](screenshots/en-dark-1440-intro.png)  | [View](screenshots/en-dark-1440-report.png)  |
| en / dark / 390px             | [View](screenshots/en-dark-390-intro.png)   | [View](screenshots/en-dark-390-report.png)   |
| en / dark / 320px             | [View](screenshots/en-dark-320-intro.png)   | [View](screenshots/en-dark-320-report.png)   |
| ar / light / 1440px           | [View](screenshots/ar-light-1440-intro.png) | [View](screenshots/ar-light-1440-report.png) |
| ar / light / 390px            | [View](screenshots/ar-light-390-intro.png)  | [View](screenshots/ar-light-390-report.png)  |
| ar / light / 320px            | [View](screenshots/ar-light-320-intro.png)  | [View](screenshots/ar-light-320-report.png)  |

The [capture environment record](capture-environment.json) contains exact
versions, operating system, viewport, device scale, capture timestamps and SHA-256
values, plus three sequential desktop timing observations. Full-page captures
for all twelve wrapper combinations are also attached to local Playwright reports.

Screenshots alone do not certify physical touch, screen-reader usability or
runtime verification. See [W2 handoff](../W2.md) for evidence and limitations.
