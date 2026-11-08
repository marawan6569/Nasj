import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePromotion } from "../scripts/promotion-policy.mjs";
const sha = "a".repeat(40);
const valid = () => ({
    repository: "marawan6569/Nasj",
    ref: "refs/heads/main",
    event: "workflow_dispatch",
    sha,
    approvedSha: sha,
    main: sha,
    enabled: "true",
    approval: `publish website ${sha} from run 1`,
    run: {
        id: 1,
        head_sha: sha,
        head_branch: "main",
        repository: { full_name: "marawan6569/Nasj" },
        head_repository: { full_name: "marawan6569/Nasj" },
        event: "push",
        path: ".github/workflows/website.yml",
        status: "completed",
        conclusion: "success",
        updated_at: new Date().toISOString(),
    },
    artifact: {
        name: `website-pages-${sha}`,
        expired: false,
        workflow_run: { id: 1, head_sha: sha },
    },
    environment: {
        name: "github-pages",
        protection_rules: [],
        deployment_branch_policy: {
            protected_branches: false,
            custom_branch_policies: true,
        },
    },
    environmentBranchPolicies: {
        total_count: 1,
        branch_policies: [{ id: 1, name: "main", type: "branch" }],
    },
    pages: { build_type: "workflow" },
});
test("explicitly approved fresh main artifact with solo-maintainer main-only Pages passes", () =>
    validatePromotion(valid()));
for (const [name, mutate] of Object.entries({
    fork: (x) => (x.repository = "other/Nasj"),
    "PR ref": (x) => (x.ref = "refs/pull/1/merge"),
    "PR event": (x) => (x.event = "pull_request"),
    "disabled launch": (x) => (x.enabled = "false"),
    "unapproved SHA": (x) => (x.approvedSha = "b".repeat(40)),
    "main moved": (x) => (x.main = "b".repeat(40)),
    "missing phrase": (x) => (x.approval = "yes"),
    "PR candidate": (x) => (x.run.event = "pull_request"),
    "fork artifact": (x) => (x.run.head_repository.full_name = "other/Nasj"),
    "wrong workflow": (x) => (x.run.path = ".github/workflows/other.yml"),
    "failed candidate": (x) => (x.run.conclusion = "failure"),
    "incomplete candidate": (x) => (x.run.status = "in_progress"),
    "wrong artifact": (x) => (x.artifact.name = "github-pages"),
    "expired artifact": (x) => (x.artifact.expired = true),
    "foreign run": (x) => (x.artifact.workflow_run.id = 2),
    "stale audit": (x) => (x.run.updated_at = "2020-01-01T00:00:00Z"),
    "missing environment": (x) => (x.environment = {}),
    "missing environment rules": (x) => delete x.environment.protection_rules,
    "required reviewers": (x) =>
        x.environment.protection_rules.push({
            type: "required_reviewers",
            reviewers: [{ type: "User" }],
            prevent_self_review: false,
        }),
    "prevent self-review": (x) =>
        x.environment.protection_rules.push({
            type: "required_reviewers",
            prevent_self_review: true,
        }),
    "missing branch selector": (x) =>
        delete x.environment.deployment_branch_policy,
    "protected branches selector": (x) =>
        (x.environment.deployment_branch_policy = {
            protected_branches: true,
            custom_branch_policies: false,
        }),
    "missing branch policies": (x) => (x.environmentBranchPolicies = {}),
    "no branch policy": (x) =>
        (x.environmentBranchPolicies = { total_count: 0, branch_policies: [] }),
    "wildcard branches": (x) =>
        (x.environmentBranchPolicies.branch_policies[0].name = "*"),
    "non-main branch": (x) =>
        (x.environmentBranchPolicies.branch_policies[0].name = "release"),
    "main tag": (x) =>
        (x.environmentBranchPolicies.branch_policies[0].type = "tag"),
    "additional branch": (x) => {
        x.environmentBranchPolicies.total_count = 2;
        x.environmentBranchPolicies.branch_policies.push({
            name: "preview",
            type: "branch",
        });
    },
    "additional hidden page": (x) =>
        (x.environmentBranchPolicies.total_count = 101),
    "Pages disabled": (x) => (x.pages = {}),
}))
    test(`reject ${name}`, () => {
        const input = valid();
        mutate(input);
        assert.throws(() => validatePromotion(input));
    });
