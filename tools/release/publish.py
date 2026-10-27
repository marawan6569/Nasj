#!/usr/bin/env python3
"""Explicitly approved additive backfill. Never called by the preparation workflow."""

import argparse
import json
import os
from pathlib import Path
import subprocess
from release import checksums, identity, require, run, sha, TARGETS


def api(repo, endpoint):
    return json.loads(run("gh", "api", f"repos/{repo}/{endpoint}"))


def validate(directory, tag, commit, tooling_sha):
    entries = checksums(directory)
    metas = sorted(directory.glob("build-*.json"))
    require(bool(metas), "no build provenance")
    expected = set()
    for path in metas:
        meta = json.loads(path.read_text())
        arch = meta["architecture"]
        require(
            arch in TARGETS and path.name == f"build-{arch}.json",
            "unexpected architecture",
        )
        require(meta["tag"] == tag and meta["commit"] == commit, "wrong release source")
        require(meta["tooling_commit"] == tooling_sha, "build tooling commit mismatch")
        artifacts = [
            f"nasj-{tag}-linux-{arch}.tar.gz",
            f"nasj_{tag[1:]}_{TARGETS[arch][1]}.deb",
        ]
        require(meta["artifacts"] == artifacts, "unexpected release asset")
        expected.update([*artifacts, path.name])
    require("build-x86_64.json" in expected, "mandatory x86_64 artifacts missing")
    require(entries.keys() == expected, "unexpected or missing release files")
    return sorted(expected | {"SHA256SUMS-binaries"})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", required=True)
    parser.add_argument("--source", required=True)
    parser.add_argument("--tag", required=True)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--run-id", type=int, required=True)
    parser.add_argument(
        "--resume",
        action="store_true",
        help="skip existing assets ONLY after downloading and verifying identical bytes",
    )
    args = parser.parse_args()
    repo = os.environ["GITHUB_REPOSITORY"]
    tooling_sha = os.environ["GITHUB_SHA"]
    require(os.environ["GITHUB_REF"] == "refs/heads/main", "publication requires main")
    require(
        os.environ["PUBLICATION_APPROVAL"]
        == f"publish {args.tag} from run {args.run_id}",
        "explicit approval phrase mismatch",
    )
    identity(Path(args.source), args.tag, args.commit)
    build = api(repo, f"actions/runs/{args.run_id}")
    require(
        build["event"] == "workflow_dispatch" and build["head_branch"] == "main",
        "only manually selected trusted main builds may publish",
    )
    require(
        build["head_sha"] == tooling_sha
        and build["path"] == ".github/workflows/release-build.yml",
        "unapproved tooling/workflow",
    )
    require(
        build["status"] == "completed" and build["conclusion"] == "success",
        "build/runtime gates did not pass",
    )
    require(build["repository"]["full_name"] == repo, "foreign workflow run")
    directory = Path(args.directory).resolve()
    names = validate(directory, args.tag, args.commit, tooling_sha)
    release = api(repo, f"releases/tags/{args.tag}")
    require(
        not release["draft"] and release["tag_name"] == args.tag,
        "existing published release required",
    )
    tagref = api(repo, f"git/ref/tags/{args.tag}")["object"]
    require(tagref["type"] == "tag", "remote annotated tag required")
    tag = api(repo, f"git/tags/{tagref['sha']}")
    require(
        tag["object"]["type"] == "commit" and tag["object"]["sha"] == args.commit,
        "remote tag moved",
    )
    require(
        tagref["sha"]
        == run("git", "rev-parse", f"refs/tags/{args.tag}", cwd=args.source),
        "remote tag object changed",
    )
    existing = json.loads(
        run(
            "gh",
            "api",
            "--paginate",
            "--slurp",
            f"repos/{repo}/releases/{release['id']}/assets?per_page=100",
        )
    )
    assets = {asset["name"]: asset for page in existing for asset in page}
    pending = []
    # Complete collision preflight BEFORE writing any release assets.
    for name in names:
        if name not in assets:
            pending.append(name)
            continue
        require(args.resume, f"asset already exists; no overwrite permitted: {name}")
        remote = subprocess.check_output(
            [
                "gh",
                "api",
                "-H",
                "Accept: application/octet-stream",
                f"repos/{repo}/releases/assets/{assets[name]['id']}",
            ]
        )
        import hashlib

        require(
            hashlib.sha256(remote).hexdigest() == sha(directory / name),
            f"existing asset differs: {name}",
        )
    require(pending or args.resume, "nothing to publish")
    print("Approved additive upload:", pending, flush=True)
    # GitHub offers no transactional multi-asset upload. Checksums go last.
    for name in sorted(pending, key=lambda n: n == "SHA256SUMS-binaries"):
        subprocess.run(
            [
                "gh",
                "release",
                "upload",
                args.tag,
                str(directory / name),
                "--repo",
                repo,
            ],
            check=True,
        )
    # Verify transferred bytes, including the manifest, without changing notes or tags.
    final = api(repo, f"releases/{release['id']}")
    require(
        final["body"] == release["body"],
        "release notes changed concurrently; investigate",
    )
    import hashlib

    uploaded = json.loads(
        run(
            "gh",
            "api",
            "--paginate",
            "--slurp",
            f"repos/{repo}/releases/{release['id']}/assets?per_page=100",
        )
    )
    final_assets = {a["name"]: a for page in uploaded for a in page}
    require(
        all(final_assets[n]["id"] == a["id"] for n, a in assets.items()),
        "pre-existing asset changed concurrently",
    )
    for name in names:
        content = subprocess.check_output(
            [
                "gh",
                "api",
                "-H",
                "Accept: application/octet-stream",
                f"repos/{repo}/releases/assets/{final_assets[name]['id']}",
            ]
        )
        require(
            hashlib.sha256(content).hexdigest() == sha(directory / name),
            f"uploaded checksum mismatch: {name}",
        )


if __name__ == "__main__":
    main()
