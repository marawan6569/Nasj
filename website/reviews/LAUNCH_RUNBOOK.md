# Exact-artifact launch and rollback

This sprint authorizes preparation and PR verification only. Do not execute the
publication steps until the maintainer separately authorizes launch. No workflow
in this PR automatically enables Pages, creates environment protection, merges
code, changes release assets or deploys from PRs.

## Before separate launch authorization

1. Review the launch PR and every open LC risk in LAUNCH_RISKS.md. Record explicit
   acceptance, completed manual evidence, or defer launch. All MUST FIX findings
   must be resolved. Preserve failed-run evidence; never update PNGs to hide a
   failure. Only the maintainer merges the PR.
2. After a maintainer-approved merge, run `Website verification` on exact `main`
   (push or manual dispatch). A PR run or its merge-ref artifact cannot be promoted.
   Require every job: foundation, all three candidate bases and candidate-rust.
3. From the successful main run record: source SHA, run ID, artifact ID named
   `website-pages-<SHA>`, Actions ZIP digest and the **inner artifact.tar SHA-256**
   in project evidence `archive-sha256.txt`. Review `candidate-identity.json`,
   release verification, npm audit, browser/visual/performance reports and traces.
   The run must be less than 24 hours old at dispatch. If expired/stale, rerun
   validation at the same SHA and approve the new run/artifact/digest.
4. Download the candidate artifact and project evidence to a fresh directory;
   verify the platform ZIP digest and inner tar hash. The tar contains exactly
   the verified `/Nasj/` static output. Candidate artifacts are retained 30 days;
   archive approved evidence durably before expiry. Record a local backup of the
   currently deployed artifact and previous source SHA (none for first launch).

## Separately authorized publication

5. Only after explicit authorization, the maintainer enables GitHub Pages with
   **GitHub Actions** as source and configures an existing `github-pages`
   environment. Require reviewers, prevent self-review and disable administrator
   bypass. Restrict deployment branches to `main`. Protect main through normal
   repository governance. Do not add a long-lived token.
6. Set repository variable `WEBSITE_LAUNCH_ENABLED=true` only for the approved
   launch window. The default absent/false state disables the promotion job.
7. Dispatch **Website approved artifact promotion** from `main` with:
    - `approved_sha`: exact reviewed main SHA;
    - `candidate_run`: successful, fresh main verification run ID;
    - `artifact_id`: reviewed website-pages artifact ID from that run;
    - `archive_sha256`: reviewed inner tar digest (not the ZIP digest);
    - `approval`: `publish website <SHA> from run <ID>`.
8. Read-only preflight rejects foreign repositories, PR refs/events/artifacts,
   non-main source, wrong/failed/incomplete runs, moved main, stale audits,
   missing environment protection, disabled Pages and mismatched archive bytes.
   It downloads the named artifact, checks the exact tar hash and transfers that
   same tar into the deployment run. There is **no rebuild after approval**.
9. An authorized environment reviewer approves the deployment job. Main is checked
   again after approval. Only that job has `pages: write` / `id-token: write`.
   Deployment uses the transferred `github-pages` archive. Record deployment URL,
   ID, SHA, candidate run and tar hash. Set the launch variable back to `false`.

## Live acceptance (after deployment authorization)

10. Download each path in the approved `candidate-identity.json` production
    inventory from `https://marawan6569.github.io/Nasj/`; SHA-256 must match.
    This includes HTML, CSS/fonts/images/notices and all eight report files.
    Check bilingual routes, equivalent-route language switching, themes,
    canonical/hreflang/sitemap and unknown-path 404/noindex. A cached old artifact
    is a failure, not permission to rebuild or change the expected digest.
11. Exercise both embedded reports, direct noopener links and offline HTML:
    search the backend, inspect source evidence, inspect unresolved diagnostics,
    and confirm zero secondary report resource requests. Confirm no normal-use
    CSP errors. Repeat fresh public release verification. Record actual results;
    do not carry local test outcomes forward as live evidence.
12. If a security boundary, required task, artifact hash or download fails,
    stop promotion and use rollback; do not patch public assets in place.

## Rollback

- Before first deployment: leave the launch variable false; nothing is public.
- After deployment: disable further dispatch with the variable. Preserve failed
  run/deployment IDs and hashes. For urgent sensitive-data exposure, the maintainer
  may separately authorize disabling Pages while recovery is prepared.
- Create a focused restoration branch from current main that restores website
  source and relevant verification workflow files from the last accepted source
  commit. Do not move tags, force-push main, replace product releases or copy an
  unreviewed tar over the deployed site.
- Open and review the restoration PR. Run the complete checks, resolve failures,
  and let the maintainer merge. Validate the new exact main SHA, retain its tested
  artifact, obtain new SHA/run/hash approval and follow steps 5–12. A restoration
  is a new approved deployment, even when bytes match the previous site.
- For first-launch rollback without a previously accepted site, separately
  authorize unpublishing Pages or restore the approved pre-launch website source,
  revalidate and obtain new approval. No automatic deletion or settings change.

A live deployment/rollback rehearsal cannot be claimed in this sprint. The policy
has positive/negative tests; hosted workflow syntax and candidate production are
validated. The real protected environment and Pages service are intentionally
unconfigured here. Their absence will make promotion fail closed.
