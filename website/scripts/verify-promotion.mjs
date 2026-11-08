// Read-only preflight. Does not create an environment or enable Pages.
import assert from "node:assert/strict";
import { validatePromotion } from "./promotion-policy.mjs";
const {
    GITHUB_REPOSITORY: repository,
    GITHUB_REF: ref,
    GITHUB_EVENT_NAME: event,
    GITHUB_SHA: sha,
    APPROVED_SHA: approvedSha,
    CANDIDATE_RUN: runId,
    CANDIDATE_ARTIFACT: artifactId,
    ARCHIVE_SHA256: digest,
    LAUNCH_ENABLED: enabled,
    APPROVAL: approval,
} = process.env;
assert.match(runId || "", /^[1-9][0-9]*$/);
assert.match(artifactId || "", /^[1-9][0-9]*$/);
assert.match(digest || "", /^[a-f0-9]{64}$/);
assert.equal(repository, "marawan6569/Nasj");
async function get(path) {
    const response = await fetch(
        `https://api.github.com/repos/${repository}/${path}`,
        {
            headers: {
                Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                Accept: "application/vnd.github+json",
            },
            signal: AbortSignal.timeout(30000),
        },
    );
    assert.ok(
        response.ok,
        `Preflight API failed (${response.status}): ${path}`,
    );
    return response.json();
}
const [run, artifact, main, environment, environmentBranchPolicies, pages] =
    await Promise.all([
        get(`actions/runs/${runId}`),
        get(`actions/artifacts/${artifactId}`),
        get("git/ref/heads/main"),
        get("environments/github-pages"),
        get("environments/github-pages/deployment-branch-policies"),
        get("pages"),
    ]);
validatePromotion({
    repository,
    ref,
    event,
    sha,
    approvedSha,
    enabled,
    approval,
    run,
    artifact,
    main: main.object.sha,
    environment,
    environmentBranchPolicies,
    pages,
});
console.log(
    "Exact main candidate, successful trusted workflow, artifact ownership, freshness and existing solo-maintainer main-only environment verified; no independent second-person review.",
);
