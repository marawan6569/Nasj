# Field-validation follow-up plan

Baseline: cumulative `fix/analysis-uncertainty-hardening` at `e035f6b`.
Inspected all local/remote branches and PRs #1/#8–#13; all heads have green CI.
Read all conversation comments, review submissions and inline threads on #9/#10
(three conversation comments on #9, one on #10; no inline threads/reviews).
No production configuration/report is read, requested or copied for this work.

1. **Routing correctness PR, based on #13.** Reproduce inherited-root/proxy and
   unsupported-handler bugs with synthetic fixtures. Separate effective content
   handling from inherited metadata, check nested location inheritance against
   upstream semantics, and suppress unsupported effective destinations. Then add
   a small ordered server-level conditional-return graph, documented in an ADR.
   Preserve symbolic variables and source lines; unsupported evaluation stays
   unresolved. Update every exporter and schema compatibility documentation.
2. **Diagnostics PR, based on routing fixes.** Introduce info/warning/error
   severity without treating unsupported analysis as invalid Nginx. Empty globs
   are informational, missing literal includes fail. Show safely escaped/redacted
   patterns only in local CLI context; define strict mode as warning/error failure.
   Give exported diagnostics and the HTML panel distinct severity presentation.
3. **Visualization PR, based on diagnostics.** Add deterministic vhost grouping,
   identifiable HTTP/HTTPS server labels and focus navigation, while keeping the
   complete graph and current interactions. Use a realistic synthetic multi-vhost
   fixture, readable initial zoom and bounded/cached focus traversal. Prefer the
   existing native layout over a new bundled library. Verify crossing reduction,
   desktop/mobile readability and larger fixtures in the offline browser suite.

For each PR run fmt, locked Clippy with warnings denied, locked workspace tests
and locked build. Also run parser comparison/regressions, conditional/negative
routing fixtures, JSON/DOT/SVG goldens, CSP integrity, malicious-input tests and
offline Chromium interaction/layout checks. Check Actions on each pushed head.
Respond to all existing feedback on #9/#10 with concrete fixes and verification.
Leave the earlier PR stack intact; synchronize review descriptions by linking the
new cumulative stack. Do not merge, release, push main or close issues.

Acceptance: no static destination beside an effective proxy/unsupported handler;
guarded ordered returns with no fabricated variable substitution; optional glob
info separated from incompleteness warnings; useful initial multi-vhost viewing;
all shared model/export/security checks and final cumulative CI green. Record
results, limitations, commit/PR links and remaining release blockers in the log.

## Implemented review stack

| Work | PR | Implementation |
| --- | --- | --- |
| Effective handlers and symbolic conditional returns | #14 | `88af4d2` |
| Diagnostic severity/private include context | #15 | `81726ef` |
| Readable virtual-host focus/native grouping | #16 | `0d41ef3` |
| Final return-order/reachability/privacy audit | #17 | `0f737b8` |

Final cumulative branch: `fix/routing-final-audit`. The earlier #1/#8–#13 stack
is retained; nothing is merged. All 42 workspace tests and the browser suite pass
locally; exact-head CI evidence is recorded in the PRs/log. The final audit was
added after implementation review to keep known termination separate from
unsupported evaluation and sanitize derived condition labels for library callers.
