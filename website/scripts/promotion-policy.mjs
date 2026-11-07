import assert from "node:assert/strict";
export function validatePromotion({
    repository,
    ref,
    event,
    sha,
    approvedSha,
    enabled,
    approval,
    run,
    artifact,
    main,
    environment,
    pages,
}) {
    assert.equal(
        repository,
        "marawan6569/Nasj",
        "Canonical repository required",
    );
    assert.equal(ref, "refs/heads/main", "Main dispatch required");
    assert.equal(event, "workflow_dispatch");
    assert.equal(enabled, "true", "Separate launch authorization required");
    assert.match(approvedSha, /^[a-f0-9]{40}$/);
    assert.equal(sha, approvedSha, "Workflow must run at approved SHA");
    assert.equal(main, approvedSha, "Main moved: approve a new candidate");
    assert.equal(approval, `publish website ${approvedSha} from run ${run.id}`);
    assert.equal(run.head_sha, approvedSha);
    assert.equal(run.head_branch, "main");
    assert.equal(run.repository.full_name, repository);
    assert.equal(run.head_repository.full_name, repository);
    assert.ok(
        ["push", "workflow_dispatch"].includes(run.event),
        "PR artifacts cannot deploy",
    );
    assert.equal(run.path, ".github/workflows/website.yml");
    assert.equal(run.status, "completed");
    assert.equal(run.conclusion, "success");
    assert.equal(artifact.name, `website-pages-${approvedSha}`);
    assert.equal(artifact.expired, false);
    assert.equal(artifact.workflow_run.id, run.id);
    assert.equal(artifact.workflow_run.head_sha, approvedSha);
    assert.ok(
        Date.now() - Date.parse(run.updated_at) < 86400000,
        "Candidate online audit is older than 24 hours",
    );
    assert.equal(environment.name, "github-pages");
    const reviewers = environment.protection_rules.find(
        (r) => r.type === "required_reviewers",
    );
    assert.ok(
        reviewers?.reviewers?.length,
        "Pre-existing environment reviewers required",
    );
    assert.equal(
        reviewers.prevent_self_review,
        true,
        "Prevent self-review must be enabled",
    );
    assert.equal(
        environment.can_admins_bypass,
        false,
        "Environment bypass must be disabled",
    );
    assert.equal(
        pages.build_type,
        "workflow",
        "Pages must already be explicitly enabled for Actions",
    );
}
