# Launch risk register and follow-up issues

Owner for every item: NASJ maintainer (marawan6569). Issue IDs below are durable
follow-up records in this repository, linked from the launch PR. The sole maintainer explicitly accepted LC-01 through LC-08 on 2026-11-08 for
this initial website launch in the Solo-Maintainer Launch Integration Approval.
This acceptance includes the UNVERIFIED manual coverage; it does not mark missing
tests passed or establish full viewer WCAG conformance. These accepted risks stay
open for follow-up, owned by marawan6569. Publication remains separately authorized.

| Issue / class                                      | Reproduction, surface and impact                                                                                                                                                          | Mitigation and launch recommendation                                                                                                                                                                                                                                             | Follow-up / acceptance                                                                                                                |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| LC-01 · ACCEPT WITH DOCUMENTED RISK                | Released v0.1.0 SVG has nested interactive nodes (`#topology-graph`, axe serious) in direct/embedded/offline contexts. Some AT may omit graph descendants. Native AT behavior UNVERIFIED. | Required evidence is also in normal HTML search results/inspector and the localized semantic wrapper (all 37/3 relationships and sources). Recommend accepting the website launch with these alternatives, without claiming accessible graph navigation or patching the release. | Separately scope a future viewer release; accepted for initial launch; follow-up due 2026-12-08.                                      |
| LC-02 · ACCEPT WITH DOCUMENTED RISK                | Released light-theme product badge measures 4.39:1, below 4.5:1; other SVG contrast is incomplete in axe. Direct viewer at 390×844.                                                       | Product/version also appear legibly in wrapper/provenance and installation pages. Dark viewer theme and textual source summaries are available. Badge is not needed for search/evidence tasks. Recommend accept this bounded defect; do not claim viewer AA compliance.          | Future viewer contrast review; accepted for initial launch; follow-up due 2026-12-08.                                                 |
| LC-03 · ACCEPT WITH DOCUMENTED RISK                | Selected evidence may be below the embedded mobile viewport; graph context can start offscreen.                                                                                           | Scripted search → Inspect selection → scroll to evidence works. Fit view, Readable scale, full-page report and semantic relationship/source summaries are available. Recommend accept with documented task guidance.                                                             | Physical touch validation and future viewer usability issue; accepted for initial launch; follow-up schedule below.                   |
| LC-04 · ACCEPT WITH DOCUMENTED RISK                | Viewer is English-only and theme is independent in all three report contexts.                                                                                                             | Both wrappers explain this; complete localized narrative, relationships, source excerpts and download guidance remain available. Recommend accept as approved architecture.                                                                                                      | Viewer localization is post-launch work.                                                                                              |
| LC-05 · ACCEPT WITH DOCUMENTED RISK                | Direct hosted HTML shares website origin; it has no iframe sandbox.                                                                                                                       | Pinned generator/input/output bytes, released CSP, zero secondary resource requests and noopener links. The embedded report remains opaque-origin sandboxed. Recommend accept this explicit trust boundary.                                                                      | Any viewer/generator change requires renewed byte/security review.                                                                    |
| LC-06 · ACCEPT WITH DOCUMENTED RISK                | Physical iOS Safari / Android Chrome portrait/landscape, touch scrolling, file download/open: UNVERIFIED. Desktop engine automation cannot establish device behavior.                     | Localized HTML summaries and direct reports avoid iframe scrolling; JSON/SVG/HTML downloads are optional alternatives. Recommend accept only as an explicit device-coverage risk; no mobile offline-open certification.                                                          | Execute manual tasks below on actual devices; accepted for initial launch; follow-up schedule below.                                  |
| LC-07 · ACCEPT WITH DOCUMENTED RISK                | NVDA/Firefox and VoiceOver/Safari: UNVERIFIED. Keyboard and axe checks do not establish spoken names/order, Arabic pronunciation or accessible graph behavior.                            | Semantic headings, landmarks, skip link, native links/disclosures and complete summary/source evidence. Recommend accept website launch only with that accessible-content fallback and no AT conformance claim.                                                                  | Execute both named AT task sets; accepted for initial launch; follow-up schedule below.                                               |
| LC-08 · ACCEPT WITH DOCUMENTED RISK                | Actual 200%/400% browser zoom: UNVERIFIED. 320px reflow is tested, but is not browser zoom.                                                                                               | Required links and commands remain reachable at 320px; wide code/table regions scroll independently. Recommend accept bounded verification risk; stop launch if manual zoom makes required tasks unusable.                                                                       | Test at 1280px browser viewport at both zoom levels and record browser/OS.                                                            |
| LC-09 · POST-LAUNCH BACKLOG                        | Native-speaker editorial polish and additional visual/motion examples. Both locales have section/route/command parity; representative Arabic captures inspected.                          | No missing required content or language-route redirect. No additional design exploration needed.                                                                                                                                                                                 | Optional editorial review, more examples, motion and viewer localization.                                                             |
| LC-10 · MUST FIX BEFORE LAUNCH (resolved)          | Cold mobile lab CLS initially 0.105606 > 0.1.                                                                                                                                             | Preload the locale's pinned local font. Six sequential homepage measurements subsequently pass unchanged 0.1 threshold. Original screenshots remain unchanged.                                                                                                                   | Keep regression and original failure evidence.                                                                                        |
| LC-11 · MUST FIX BEFORE LAUNCH (verification gate) | Hosted three-engine/base matrix, clean checkout and deployment guard checks must pass on final candidate. Local FF/WebKit cannot start because host libraries are absent.                 | Hosted jobs install required libraries; failures retain traces. Never interpret a local missing-library failure as browser success.                                                                                                                                              | 618 hosted functional cases now pass; the latest complete workflow must also pass. Final status is in LAUNCH_READINESS.md and PR #26. |

## Required manual record template

For each LC-06/07/08 test, record surface, exact candidate SHA and report digest,
OS/browser/device/AT version, date, method, observed task outcome, and issue ID.
Keep untested entries UNVERIFIED. Tasks, in each locale and theme:

1. Navigate home → installation → first-map guide; operate language/theme controls.
2. Read architecture/checksum instructions and reach/copy a complete command.
3. Enter and leave the iframe by keyboard/AT; search `127.0.0.1:8100`, select it,
   inspect `fixtures/nginx/multi-vhost.conf:7` and its configured relationships.
4. Inspect `/dynamic/` and `routing.unresolved` without inferring a backend.
5. Complete the same evidence task through localized semantic summaries.
6. Open the full-page report; download HTML and open without neighboring assets.
7. On devices, test touch/nested scrolling and portrait/landscape. At actual zoom,
   verify controls, focus visibility, content reflow and contained code scrolling.

If a required task fails and no usable fallback exists, reclassify MUST FIX or
NOT READY. The released viewer may only change through separately approved
product work and a revised release pin.

## Accepted-risk follow-up schedule

The following are follow-up review dates, not claims that fixes or tests have run.
Owner: marawan6569. Reassess exposure and reschedule explicitly if equipment or
assistive technology is still unavailable; preserve UNVERIFIED outcomes.

| Risks        | Review due | Follow-up                                                                                      |
| ------------ | ---------- | ---------------------------------------------------------------------------------------------- |
| LC-01–02     | 2026-12-08 | Scope a separate viewer accessibility/contrast release; preserve current report pin.           |
| LC-03, LC-06 | 2026-11-22 | Physical mobile/touch/download tasks and iframe evidence navigation.                           |
| LC-04–05     | 2026-12-08 | Reassess English-only/theme and direct-origin mitigations; renew review before viewer changes. |
| LC-07–08     | 2026-11-22 | NVDA/Firefox, VoiceOver/Safari and actual 200%/400% zoom tasks.                                |

The table above retains original impact/mitigation recommendations as historical
review context. The explicit LC-01–08 acceptance recorded here is the current disposition. New required-task or security
failures are not covered by this acceptance.
