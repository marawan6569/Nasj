#!/usr/bin/env python3
"""Native Linux release preparation. Standard library only; never publishes."""

import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
import tarfile
import tempfile

HERE = Path(__file__).resolve().parent
TARGETS = {
    "x86_64": (
        "x86_64-unknown-linux-gnu",
        "amd64",
        "Advanced Micro Devices X86-64",
        "/lib64/ld-linux-x86-64.so.2",
    ),
    "aarch64": (
        "aarch64-unknown-linux-gnu",
        "arm64",
        "AArch64",
        "/lib/ld-linux-aarch64.so.1",
    ),
}
APPROVED_V010 = "b60cb2e045fc9476034bffba7967b8674825fa18"
MAINTAINER = "Marwan Fazora <38116633+marawan6569@users.noreply.github.com>"


def run(*args, cwd=None, env=None):
    return subprocess.check_output(args, cwd=cwd, env=env, text=True).strip()


def require(ok, message):
    if not ok:
        raise ValueError(message)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write_json(path, value):
    Path(path).write_text(json.dumps(value, indent=2, sort_keys=True) + "\n")


def identity(source, tag, commit):
    require(
        re.fullmatch(r"v[0-9]+\.[0-9]+\.[0-9]+", tag), "expected vMAJOR.MINOR.PATCH tag"
    )
    require(
        re.fullmatch(r"[0-9a-f]{40}", commit),
        "expected full lowercase approved commit SHA",
    )
    if tag == "v0.1.0":
        require(commit == APPROVED_V010, "v0.1.0 approval is immutable")
    require(
        run("git", "cat-file", "-t", f"refs/tags/{tag}", cwd=source) == "tag",
        "annotated tag required",
    )
    require(
        run("git", "rev-parse", f"refs/tags/{tag}^{{commit}}", cwd=source) == commit,
        "tag commit mismatch",
    )
    require(
        run("git", "rev-parse", "HEAD", cwd=source) == commit, "source HEAD mismatch"
    )
    require(
        not run("git", "status", "--porcelain", "--untracked-files=all", cwd=source),
        "source checkout must be clean",
    )
    return tag[1:]


def metadata(source, target, toolchain):
    return json.loads(
        run(
            "cargo",
            f"+{toolchain}",
            "metadata",
            "--locked",
            "--format-version",
            "1",
            "--filter-platform",
            target,
            cwd=source,
        )
    )


def notices(meta, output, toolchain):
    policy = json.loads((HERE / "license-policy.json").read_text())
    require(policy["toolchain"] == toolchain, "toolchain notice review required")
    packages = {
        f"{p['name']}@{p['version']}": p for p in meta["packages"] if p["source"]
    }
    require(
        packages.keys() == policy["packages"].keys(),
        "dependency set changed: review license policy",
    )
    output.mkdir()
    inventory = []
    for key, package in sorted(packages.items()):
        approved = policy["packages"][key]
        require(
            package["source"].startswith(
                "registry+https://github.com/rust-lang/crates.io-index"
            ),
            "unreviewed dependency source",
        )
        require(
            package["license"] == approved["license"],
            f"license expression changed: {key}",
        )
        root = Path(package["manifest_path"]).parent
        crate = root.parents[2] / "cache" / root.parent.name / f"{root.name}.crate"
        require(
            sha(crate) == approved["crate_checksum"], f"crate archive changed: {key}"
        )
        detected = {
            str(p.relative_to(root))
            for p in root.rglob("*")
            if p.is_file()
            and any(
                s in p.name.lower()
                for s in ("license", "copying", "copyright", "notice")
            )
        }
        require(
            detected == approved["files"].keys(), f"notice inventory changed: {key}"
        )
        dest = output / key
        dest.mkdir()
        for name, digest in approved["files"].items():
            src = root / name
            require(sha(src) == digest, f"unreviewed license text: {key}/{name}")
            target = dest / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(src, target)
        # Preserve individual source copyright lines as well as full upstream texts.
        copyrights = []
        for p in sorted(root.rglob("*")):
            if p.is_file() and p.suffix in (".rs", ".md", ".toml", ".txt"):
                for line in p.read_text(errors="replace").splitlines():
                    if re.search(r"copyright\s*(?:\(c\)|©|[0-9])", line, re.I):
                        copyrights.append(f"{p.relative_to(root)}: {line}")
        (dest / "ATTRIBUTION.txt").write_text(
            f"{key}\nAuthors: {', '.join(package['authors'])}\nRepository: {package.get('repository')}\nDeclared license: {package['license']}\nSelected: MIT"
            + (" AND Unicode-3.0" if package["name"] == "unicode-ident" else "")
            + "\n\n"
            + "\n".join(copyrights)
            + "\n"
        )
        inventory.append(
            {"package": key, "license": package["license"], "files": approved["files"]}
        )
    rust_docs = (
        Path(run("rustc", f"+{toolchain}", "--print", "sysroot")) / "share/doc/rust"
    )
    for name, digest in policy["rust_notices"].items():
        src = rust_docs / name
        require(sha(src) == digest, f"Rust notice changed: {name}")
        dest = output / "rust" / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, dest)
    write_json(output / "inventory.json", inventory)
    (output / "README").write_text(
        "Exact locked Linux dependency notices, including proc macros and development dependencies (conservative superset). MIT selected where offered; unicode-ident ALSO requires Unicode-3.0. Full alternative license texts are retained for reference. Rust library copyright and license materials are included in rust/. Dynamically linked system libraries are supplied by the operating system, not bundled. This inventory is not a legal opinion or vulnerability audit.\n"
    )


def smoke(binary, output, version):
    output.mkdir(parents=True)
    env = dict(os.environ, PATH="/usr/bin:/bin")
    require(
        run(str(binary), "--version", env=env) == f"nasj {version}",
        "version smoke failed",
    )
    require("map" in run(str(binary), "--help", env=env), "help smoke failed")
    config = output / "nginx.conf"
    config.write_text(
        "http { upstream app { server 127.0.0.1:8080; } server { listen 8081; server_name example.test; location / { proxy_pass http://app; } } }\n"
    )
    for fmt in ("json", "dot", "svg", "html"):
        report = output / f"report.{fmt}"
        run(
            str(binary),
            "map",
            "--config",
            str(config),
            "--strict",
            "--format",
            fmt,
            "-o",
            str(report),
            env=env,
        )
        require(report.stat().st_size > 100, f"empty {fmt} export")
        if fmt == "json":
            json.loads(report.read_text())
        else:
            require(
                {"dot": "digraph", "svg": "<svg", "html": "<html"}[fmt]
                in report.read_text(),
                f"invalid {fmt} export",
            )


def inspect(binary, arch):
    _, _, machine, interpreter = TARGETS[arch]
    header = run("readelf", "-h", str(binary))
    program = run("readelf", "-l", str(binary))
    dynamic = run("readelf", "-d", str(binary))
    symbols = run("objdump", "-T", str(binary))
    require(machine in header and "ELF64" in header, "wrong ELF architecture")
    require(
        f"[Requesting program interpreter: {interpreter}]" in program,
        "unexpected ELF interpreter",
    )
    require(
        "RPATH" not in dynamic and "RUNPATH" not in dynamic,
        "unexpected runtime library search path",
    )
    glibc = sorted(
        set(re.findall(r"GLIBC_([0-9]+\.[0-9]+(?:\.[0-9]+)?)", symbols)),
        key=lambda s: tuple(map(int, s.split("."))),
    )
    needed = re.findall(r"\(NEEDED\).*?\[(.*?)\]", dynamic)
    require(
        needed
        and set(needed)
        <= {
            Path(interpreter).name,
            "libc.so.6",
            "libgcc_s.so.1",
            "libm.so.6",
            "libpthread.so.0",
            "libdl.so.2",
            "librt.so.1",
        },
        "unreviewed shared library dependency",
    )
    require(
        glibc and tuple(map(int, glibc[-1].split("."))) <= (2, 35),
        "GLIBC requirement exceeds Ubuntu 22.04 baseline",
    )
    linked = run("ldd", str(binary))
    require("not found" not in linked, "unresolved runtime library")
    return {
        "file": run("file", "-b", str(binary)),
        "interpreter": interpreter,
        "needed": needed,
        "glibc_symbols": glibc,
        "max_glibc_symbol": glibc[-1],
        "ldd": linked,
        "size": binary.stat().st_size,
        "mode": oct(binary.stat().st_mode & 0o777),
    }


def safe_members(archive, top):
    members = archive.getmembers()
    require(bool(members), "empty archive")
    require(len({m.name for m in members}) == len(members), "duplicate archive paths")
    for m in members:
        parts = Path(m.name).parts
        require(
            parts
            and parts[0] == top
            and ".." not in parts
            and not m.name.startswith("/"),
            "unsafe archive path",
        )
        require(m.isfile() or m.isdir(), "links/devices forbidden in release archives")
        require(not (m.mode & 0o7000), "unsafe archive permissions")
    return members


def prepare(args):
    source, output = Path(args.source).resolve(), Path(args.output).resolve()
    version = identity(source, args.tag, args.commit)
    require(platform.machine() == args.arch, "native build required")
    target, debarch, _, _ = TARGETS[args.arch]
    policy = json.loads((HERE / "license-policy.json").read_text())
    toolchain = policy["toolchain"]
    require(
        run("rustc", f"+{toolchain}", "--version").split()[1] == toolchain,
        "unexpected compiler",
    )
    meta = metadata(source, target, toolchain)
    workspace = [p for p in meta["packages"] if p["id"] in meta["workspace_members"]]
    require(
        all(p["version"] == version for p in workspace),
        "Cargo package version mismatch",
    )
    output.mkdir(parents=True, exist_ok=True)
    require(not any(output.iterdir()), "output directory must be empty")
    epoch = run("git", "show", "-s", "--format=%ct", args.commit, cwd=source)
    env = dict(
        os.environ, SOURCE_DATE_EPOCH=epoch, CARGO_TARGET_DIR=str(output / "target")
    )
    subprocess.run(
        [
            "cargo",
            f"+{toolchain}",
            "test",
            "--workspace",
            "--locked",
            "--target",
            target,
        ],
        cwd=source,
        env=env,
        check=True,
    )
    subprocess.run(
        [
            "cargo",
            f"+{toolchain}",
            "build",
            "--release",
            "--locked",
            "--package",
            "nasj-cli",
            "--bin",
            "nasj",
            "--target",
            target,
        ],
        cwd=source,
        env=env,
        check=True,
    )
    identity(source, args.tag, args.commit)
    top = f"nasj-{args.tag}-linux-{args.arch}"
    with tempfile.TemporaryDirectory(prefix="nasj-package-") as temporary:
        work = Path(temporary)
        tree = work / top
        tree.mkdir()
        binary = tree / "nasj"
        shutil.copyfile(output / "target" / target / "release/nasj", binary)
        binary.chmod(0o755)
        subprocess.run(["strip", "--strip-unneeded", str(binary)], check=True)
        runtime = inspect(binary, args.arch)
        smoke(binary, work / "smoke", version)
        notices(meta, tree / "third-party", toolchain)
        shutil.copyfile(source / "LICENSE", tree / "LICENSE")
        (tree / "README").write_text(
            f"NASJ {version} / {target}\n\nRun ./nasj --help; no Rust or Cargo needed. Install for your user with:\n  install -Dm755 nasj ~/.local/bin/nasj\nKeep LICENSE and third-party/ with redistributed copies. GNU/Linux dynamically linked executable; see BUILD-METADATA.json for actual GLIBC and shared library requirements. Tested platforms are recorded in the distribution validation report, not inferred from architecture.\n\nExample (read-only, choose a fresh output path):\n  ./nasj map --config /path/to/nginx.conf --strict --format html -o report.html\nAlso supports json, dot, svg. No Nginx reload, service, Docker or network listener. Reports work offline.\n"
        )
        artifact_names = [f"{top}.tar.gz", f"nasj_{version}_{debarch}.deb"]
        provenance = {
            "tag": args.tag,
            "commit": args.commit,
            "version": version,
            "target": target,
            "architecture": args.arch,
            "toolchain": run("rustc", f"+{toolchain}", "-Vv"),
            "cargo": run("cargo", f"+{toolchain}", "-V"),
            "source_date_epoch": int(epoch),
            "lockfile_sha256": sha(source / "Cargo.lock"),
            "tooling_commit": run("git", "rev-parse", "HEAD", cwd=HERE),
            "os_release": Path("/etc/os-release").read_text(),
            "runner_image": {
                k: os.environ.get(k, "unrecorded-local")
                for k in (
                    "ImageOS",
                    "ImageVersion",
                    "RUNNER_ARCH",
                    "RUNNER_OS",
                    "GITHUB_RUN_ID",
                    "GITHUB_RUN_ATTEMPT",
                    "GITHUB_REPOSITORY",
                )
            },
            "runtime": runtime,
            "artifacts": artifact_names,
            "stripped": True,
            "license_policy_sha256": sha(HERE / "license-policy.json"),
        }
        # Determine dependencies with Debian's installed symbols/shlibs databases.
        debroot = work / "debian/nasj"
        (work / "debian").mkdir()
        (debroot / "usr/bin").mkdir(parents=True)
        shutil.copy2(binary, debroot / "usr/bin/nasj")
        (work / "debian/control").write_text(
            "Source: nasj\nSection: utils\nPriority: optional\nMaintainer: "
            + MAINTAINER
            + "\n\nPackage: nasj\nArchitecture: any\nDescription: read-only Nginx infrastructure mapper\n"
        )
        deps = run("dpkg-shlibdeps", "-O", "-edebian/nasj/usr/bin/nasj", cwd=work)
        require(
            deps.startswith("shlibs:Depends=") and "\n" not in deps,
            "unexpected dpkg-shlibdeps output",
        )
        provenance["debian_depends"] = deps.removeprefix("shlibs:Depends=")
        write_json(tree / "BUILD-METADATA.json", provenance)
        (debroot / "DEBIAN").mkdir()
        doc = debroot / "usr/share/doc/nasj"
        shutil.copytree(tree, doc, ignore=shutil.ignore_patterns("nasj"))
        (doc / "LICENSE").rename(doc / "copyright")
        (doc / "copyright").write_text(
            (doc / "copyright").read_text()
            + "\nDependency notices, copyright holders and full license texts: third-party/\n"
        )
        changelog = (
            f"nasj ({version}-1) stable; urgency=medium\n\n  * Binary distribution of immutable {args.tag}.\n    Source: {args.commit}.\n\n -- {MAINTAINER}  "
            + run("date", "-u", f"--date=@{epoch}", "+%a, %d %b %Y %H:%M:%S +0000")
            + "\n"
        )
        (doc / "changelog.Debian.gz").write_bytes(
            gzip.compress(changelog.encode(), mtime=0)
        )
        man = debroot / "usr/share/man/man1"
        man.mkdir(parents=True)
        manual = (
            f'.TH NASJ 1 "" "NASJ {version}"\n.SH NAME\nnasj \\- read-only Nginx infrastructure mapper\n.SH SYNOPSIS\n.B nasj map\n.BI --config '
            + "FILE\n[--strict] [--format json|dot|svg|html] [-o OUTPUT]\n.SH DESCRIPTION\nMaps configured Nginx infrastructure without running or reloading Nginx.\nUnresolved or dynamic routing remains unresolved.\nHTML reports are standalone and work offline.\nOutput files must not already exist.\n.SH OPTIONS\nRun nasj --help and nasj map --help for all options.\n.SH EXAMPLE\nnasj map --config ./nginx.conf --strict --format html -o report.html\n.SH COPYRIGHT\nCopyright 2026 NASJ contributors. MIT license.\nDependency notices: /usr/share/doc/nasj/third-party/.\n"
        )
        (man / "nasj.1.gz").write_bytes(gzip.compress(manual.encode(), mtime=0))
        size_kib = (
            sum(p.stat().st_size for p in (debroot / "usr").rglob("*") if p.is_file())
            + 1023
        ) // 1024
        (debroot / "DEBIAN/control").write_text(
            f"Package: nasj\nVersion: {version}-1\nArchitecture: {debarch}\nMaintainer: {MAINTAINER}\nSection: utils\nPriority: optional\nHomepage: https://github.com/marawan6569/Nasj\nDepends: {provenance['debian_depends']}\nInstalled-Size: {size_kib}\nDescription: read-only Nginx infrastructure mapper\n Maps declared Nginx routes to JSON, DOT, SVG and standalone offline HTML.\n Unresolved routing stays unresolved. No running Nginx or Rust is required.\n Does not reload Nginx, start services, or modify configuration.\n"
        )
        md5s = [
            f"{hashlib.md5(p.read_bytes(), usedforsecurity=False).hexdigest()}  {p.relative_to(debroot)}"
            for p in sorted((debroot / "usr").rglob("*"))
            if p.is_file()
        ]
        (debroot / "DEBIAN/md5sums").write_text("\n".join(md5s) + "\n")
        for p in debroot.rglob("*"):
            p.chmod(0o755 if p.is_dir() or p == debroot / "usr/bin/nasj" else 0o644)
        subprocess.run(
            [
                "dpkg-deb",
                "--root-owner-group",
                "-Zxz",
                "--build",
                str(debroot),
                str(output / artifact_names[1]),
            ],
            check=True,
            env=env,
        )
        with (output / artifact_names[0]).open("wb") as raw:
            with gzip.GzipFile(
                filename="", mode="wb", fileobj=raw, mtime=int(epoch)
            ) as zipped:
                with tarfile.open(
                    fileobj=zipped, mode="w", format=tarfile.USTAR_FORMAT
                ) as archive:
                    for path in [tree, *sorted(tree.rglob("*"))]:
                        info = archive.gettarinfo(
                            str(path), arcname=str(path.relative_to(work))
                        )
                        info.uid = info.gid = 0
                        info.uname = info.gname = "root"
                        info.mtime = int(epoch)
                        info.mode = 0o755 if path.is_dir() or path == binary else 0o644
                        if path.is_file():
                            with path.open("rb") as data:
                                archive.addfile(info, data)
                        else:
                            archive.addfile(info)
        with tarfile.open(output / artifact_names[0]) as archive:
            safe_members(archive, top)
            archive.extractall(work / "extract")
        smoke(work / "extract" / top / "nasj", work / "archive-smoke", version)
        subprocess.run(
            ["dpkg-deb", "--info", str(output / artifact_names[1])], check=True
        )
        subprocess.run(
            ["dpkg-deb", "--contents", str(output / artifact_names[1])],
            check=True,
            stdout=subprocess.DEVNULL,
        )
        if shutil.which("lintian"):
            # Vendor binaries are not a Debian archive upload: no ITP bug exists.
            subprocess.run(
                [
                    "lintian",
                    "--fail-on",
                    "error,warning",
                    "--suppress-tags",
                    "initial-upload-closes-no-bugs",
                    str(output / artifact_names[1]),
                ],
                check=True,
            )
        write_json(output / f"build-{args.arch}.json", provenance)
    shutil.rmtree(output / "target")
    files = [*artifact_names, f"build-{args.arch}.json"]
    (output / f"SHA256SUMS-{args.arch}").write_text(
        "".join(f"{sha(output / name)}  {name}\n" for name in files)
    )
    subprocess.run(
        ["sha256sum", "--check", f"SHA256SUMS-{args.arch}"], cwd=output, check=True
    )


def checksums(directory):
    lines = (directory / "SHA256SUMS-binaries").read_text().splitlines()
    entries = {}
    for line in lines:
        require(
            re.fullmatch(r"[0-9a-f]{64}  [A-Za-z0-9_.-]+", line),
            "unsafe checksum entry",
        )
        digest, name = line.split("  ")
        require(
            name not in entries
            and name not in ("SHA256SUMS", "SHA256SUMS-binaries")
            and "source" not in name,
            "invalid/duplicate artifact",
        )
        require(sha(directory / name) == digest, f"checksum failed: {name}")
        entries[name] = digest
    require(bool(entries), "empty checksums")
    return entries


def collect(args):
    directory = Path(args.directory).resolve()
    names = []
    commits = set()
    tooling_commits = set()
    lockfiles = set()
    architectures = args.architectures.split(",")
    require(len(set(architectures)) == len(architectures), "duplicate architecture")
    for arch in architectures:
        require(arch in TARGETS, "unsupported architecture")
        checksum = directory / f"SHA256SUMS-{arch}"
        subprocess.run(
            ["sha256sum", "--check", str(checksum)], cwd=directory, check=True
        )
        meta = json.loads((directory / f"build-{arch}.json").read_text())
        require(
            meta["architecture"] == arch
            and meta["tag"] == args.tag
            and meta["commit"] == args.commit,
            "artifact provenance mismatch",
        )
        commits.add(meta["commit"])
        tooling_commits.add(meta["tooling_commit"])
        lockfiles.add(meta["lockfile_sha256"])
        require(meta["target"] == TARGETS[arch][0], "target provenance mismatch")
        require(
            meta["license_policy_sha256"] == sha(HERE / "license-policy.json"),
            "notice policy mismatch",
        )
        expected = [
            f"nasj-{args.tag}-linux-{arch}.tar.gz",
            f"nasj_{args.tag[1:]}_{TARGETS[arch][1]}.deb",
        ]
        require(meta["artifacts"] == expected, "unexpected artifact names")
        names.extend([*expected, f"build-{arch}.json"])
    require(len(commits) == 1, "mixed source commits")
    require(
        len(tooling_commits) == 1 and len(lockfiles) == 1, "mixed tooling or lockfiles"
    )
    (directory / "SHA256SUMS-binaries").write_text(
        "".join(f"{sha(directory / n)}  {n}\n" for n in sorted(names))
    )
    checksums(directory)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    build = sub.add_parser("prepare")
    build.add_argument("--source", required=True)
    build.add_argument("--output", required=True)
    build.add_argument("--tag", required=True)
    build.add_argument("--commit", required=True)
    build.add_argument("--arch", choices=TARGETS, required=True)
    gather = sub.add_parser("collect")
    gather.add_argument("--directory", required=True)
    gather.add_argument("--architectures", required=True)
    gather.add_argument("--tag", required=True)
    gather.add_argument("--commit", required=True)
    check = sub.add_parser("verify")
    check.add_argument("--directory", required=True)
    smoke_parser = sub.add_parser("smoke")
    smoke_parser.add_argument("--binary", required=True)
    smoke_parser.add_argument("--output", required=True)
    smoke_parser.add_argument("--version", required=True)
    args = parser.parse_args()
    if args.command == "prepare":
        prepare(args)
    elif args.command == "collect":
        collect(args)
    elif args.command == "verify":
        checksums(Path(args.directory))
    else:
        smoke(Path(args.binary).resolve(), Path(args.output).resolve(), args.version)


if __name__ == "__main__":
    main()
