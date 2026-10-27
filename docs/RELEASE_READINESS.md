# v0.1 release review

Assessment: 2026-10-26, final UX branch `fix/report-search-context`, stacked on
#17 (`0724bd9`). This is a review handoff, not merge, tag or publication approval.
The provisional visualization is accepted as the v0.1 direction; no replacement
framework, parser, topology schema or discovery feature is introduced here.

## Status

| Item | Classification | Evidence / remaining action |
| --- | --- | --- |
| Workspace and CLI | Ready | Rust/Cargo 1.99.1 on Linux x86_64; locked fmt/Clippy/test/build, 42 workspace tests and isolated parser comparison pass. Fresh optimized `cargo install --locked --path crates/nasj-cli` succeeded; help, synthetic demo and strict multi-vhost HTML mapping work. |
| Routing and diagnostics | Ready | Existing conditional/inheritance/unsupported-handler/include tests pass unchanged. Schema stays 0.2; configured and synthetic evidence and strict Info/Warning/Error behavior remain intact. |
| Offline viewer UX | Ready | Backend/domain/static/conditional context, useful host ranking, readable framing, keyboard selection, phone/tablet controls, real Chromium touch pan/pinch/cancel/tap and graph/inspector navigation pass. |
| Export/security regressions | Ready | Existing JSON/DOT/SVG goldens, XML, malicious input/redaction and CSP hash pass. Chromium opened file reports offline with zero external requests, JS/CSP errors or dialogs. Read-only input and safe output policies are unchanged. |
| Actions | Needs Review | The base #17 and all prior heads passed. The final UX PR description records the exact pushed SHA/run; require its `test` job, including offline browser checks, before approval. Never infer final success from an older run. |
| Public schema 0.2 | Needs Review | ADR-0004 and JSON_FORMAT.md describe compatibility and new guard/action kinds. No UX schema change. Maintainer must accept the experimental compatibility/ID policy for v0.1.0. |
| PR stack | Needs Review | All work is open/unmerged; #1 remains draft. Maintainer reviews and retargets bases in the sequence below, rerunning checks on the eventual release commit. |
| Main branch protection | Blocked | Read-only GitHub API inspection returned `protected: false`, required checks enforcement `off`, and no rulesets. Maintainer must enable PR review, the `test` check, no force pushes/deletion and direct-main restrictions, then verify settings. No settings were changed. |
| MIT and dependencies | Needs Review | NASJ source/crates declare MIT. Locked metadata has no missing license declarations; see DEPENDENCY_LICENSES.md. Prepare/approve exact third-party notices, including Unicode-3.0, for the chosen artifacts. No legal or current vulnerability-audit claim. |
| Documentation/install | Needs Review | English/Arabic instructions point to the UX preview branch and installed help was checked. Replace preview refs with the approved release ref only after approval; update changelog/date then. |
| Platform/browser coverage | Needs Review | Chromium passes at 1440×900, 390×844 and 768×1024 with synthetic 40/602-node graphs. Firefox/WebKit binaries downloaded but launch is blocked locally by missing GTK/Pango/multimedia libraries. No Firefox/WebKit/Safari or physical-device pass is claimed. Older Rust, non-Linux targets and cross-compilation are unverified. |
| Packaging/distribution | Needs Review | Recommend source-first v0.1.0; a Linux x86_64 GNU binary is optional after clean-host validation, license notices and checksums. No release artifacts have been published. See options below. |
| Approved branding | Blocked for artwork | Only assets/logos/README.md is present; approved corrected نسج artwork is absent. Proposed v0.1 deferral: ship existing plain-text branding, leave #6 open and add approved art later. Maintainer must explicitly accept deferral or supply originals; no artwork was generated/substituted. |
| Merge/tag/publication | Blocked pending approval | Maintainer authorization is required. No merge, tag, release, direct main push or issue closure was performed. |

## Synthetic before / after evidence

Reproduce using `fixtures/nginx/multi-vhost.conf` (40 nodes, 37 edges, two Info
include diagnostics), exporting HTML and searching `127.0.0.1:8100`:

| Observation | Base #17 | Final UX branch |
| --- | --- | --- |
| Initial host | `api.example.test · HTTP :80` (label order) | `portal.example.test · HTTPS :443` (effective application routes) |
| Backend search | 1 node, 0 edges | 6 nodes, 5 edges: two declared domain aliases → HTTPS server → location / → portal_app → backend |
| Match/context | Only isolated match | One tinted direct match, five dashed context nodes; real paths retained; unrelated hosts excluded |
| HTTP conditional host at 1440×900 | Rightmost actions could need pan | Condition and true/false outcomes fit at readable scale |
| Phone/tablet | Basic pan and inspector below graph | Pinch/pan, 44px controls, explicit inspector/graph return, offscreen count and focused selection |

The browser suite asserts paths and absence of unrelated hosts, not just result
counts. Shared-backend searches retain both real HTTPS callers. A 100-host/602-node
case verifies a retained caller-to-backend path and explicit truncation at 200
nodes/40 direct matches/24 hops/4000 edge visits. These are display limits; static
analysis is unchanged. Large overviews/callers can still need pan, result selection
or a narrower query. Tests use synthetic configurations only; no deployment report,
configuration, private endpoints or screenshots were copied into the repository.

## Review and merge sequence

#1 → #8 → #9 → #10 → #11 → #12 → #13 → #14 → #15 → #16 → #17 → final UX PR
(base #17). Preserve review history; after each merge, retarget dependent PRs and
validate the new cumulative head. Earlier shared branches have not been rewritten.
Keep issues open until their own acceptance criteria are reviewed and merged.
Discovery remains planned for v0.2, the optional server for v0.3.

Recommend **v0.1.0**, matching Cargo workspace versions, only after these gates.
A source-first release keeps the verified CLI installation path and avoids
promising unsupported binary targets. If shipping binaries, include LICENSE,
approved dependency notices, platform/toolchain information, README and SHA256SUMS
in reviewed archives. Test on a clean nonprivileged host; reproducible-build and
signing claims require separate evidence. Do not bundle Playwright/browser caches.
Crates.io publication is a separate choice: internal dependencies currently use
path-only declarations and need reviewed registry versions/publication ordering.
No crates.io readiness is implied by successful local installation.

## Final maintainer verification

Run in a clean checkout of the exact approved cumulative commit. These commands
perform no merge, tag or publication:

```sh
git status --short --branch
rustc --version
cargo fmt --all -- --check
cargo clippy --locked --workspace --all-targets -- -D warnings
cargo test --locked --workspace
cargo build --locked --workspace
cargo fmt --manifest-path tools/parser-spike/Cargo.toml -- --check
cargo test --locked --manifest-path tools/parser-spike/Cargo.toml
python3 tools/report-csp.py --check
python3 -m venv /tmp/nasj-review-browser
/tmp/nasj-review-browser/bin/pip install -r tools/browser-requirements.txt
/tmp/nasj-review-browser/bin/playwright install chromium
/tmp/nasj-review-browser/bin/python tools/browser-smoke.py
```

Where ordinary user-installed libraries permit, install Firefox/WebKit engines
and run `tools/browser-smoke.py --browser firefox` / `--browser webkit` with the
same Python. Do not elevate privileges to make a test pass. For source install
and strict report inspection, use a new temporary root/output path each time:

```sh
nasj_review_root=$(mktemp -d /tmp/nasj-review-XXXXXX)
cargo install --locked --path crates/nasj-cli --root "$nasj_review_root"
"$nasj_review_root/bin/nasj" --help
"$nasj_review_root/bin/nasj" map --help
"$nasj_review_root/bin/nasj" map --config fixtures/nginx/multi-vhost.conf \
  --strict --format html -o "$nasj_review_root/report.html"
```

Inspect exact-head Actions, branch rules, license notices, schema, branding
deferral and packaging choices in the release checklist before approving release.
