"""Regression checks for release trust boundaries; no network or public writes."""

import io
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest
from unittest.mock import patch

import release
import publish


class ReleaseTests(unittest.TestCase):
    def test_annotated_tag_and_clean_approved_checkout(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)

            def git(*args):
                return subprocess.check_output(
                    ["git", *args], cwd=root, stderr=subprocess.DEVNULL, text=True
                ).strip()

            git("init")
            git("config", "user.email", "test@example.invalid")
            git("config", "user.name", "Release test")
            (root / "source").write_text("original")
            git("add", "source")
            git("commit", "-m", "fixture")
            commit = git("rev-parse", "HEAD")
            git("tag", "-a", "v1.2.3", "-m", "fixture")
            self.assertEqual(release.identity(root, "v1.2.3", commit), "1.2.3")
            for tag, sha in [
                ("--help", commit),
                ("v0.1.0", commit),
                ("v1.2.3", "0" * 40),
            ]:
                with self.assertRaises(ValueError):
                    release.identity(root, tag, sha)
            (root / "source").write_text("modified")
            with self.assertRaises(ValueError):
                release.identity(root, "v1.2.3", commit)
            git("checkout", "--", "source")
            git("tag", "v1.2.4")
            with self.assertRaises(ValueError):
                release.identity(root, "v1.2.4", commit)

    def test_archive_rejects_traversal_links_devices_and_duplicates(self):
        for name, kind in [
            ("/absolute", tarfile.REGTYPE),
            ("nasj/../escape", tarfile.REGTYPE),
            ("nasj/link", tarfile.SYMTYPE),
            ("nasj/device", tarfile.CHRTYPE),
        ]:
            with self.subTest(name=name):
                data = io.BytesIO()
                with tarfile.open(fileobj=data, mode="w") as archive:
                    member = tarfile.TarInfo(name)
                    member.type = kind
                    archive.addfile(member)
                data.seek(0)
                with tarfile.open(fileobj=data) as archive, self.assertRaises(
                    ValueError
                ):
                    release.safe_members(archive, "nasj")
        data = io.BytesIO()
        with tarfile.open(fileobj=data, mode="w") as archive:
            archive.addfile(tarfile.TarInfo("nasj/bin"))
            archive.addfile(tarfile.TarInfo("nasj/bin"))
        data.seek(0)
        with tarfile.open(fileobj=data) as archive, self.assertRaises(ValueError):
            release.safe_members(archive, "nasj")

    def test_checksums_reject_changes_duplicates_and_source_asset_names(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            (root / "binary.deb").write_bytes(b"fixture")
            line = f"{release.sha(root / 'binary.deb')}  binary.deb\n"
            manifest = root / "SHA256SUMS-binaries"
            manifest.write_text(line)
            self.assertIn("binary.deb", release.checksums(root))
            for bad in [
                line + line,
                line.replace("binary.deb", "../binary.deb"),
                line.replace("binary.deb", "SHA256SUMS"),
                line.replace("binary.deb", "nasj-source.tar.gz"),
            ]:
                manifest.write_text(bad)
                with self.assertRaises(ValueError):
                    release.checksums(root)
            manifest.write_text(line)
            (root / "binary.deb").write_bytes(b"changed")
            with self.assertRaises(ValueError):
                release.checksums(root)

    def test_dependency_changes_are_blocked_before_notices_are_generated(self):
        with tempfile.TemporaryDirectory() as name:
            with self.assertRaisesRegex(ValueError, "dependency set changed"):
                release.notices({"packages": []}, Path(name) / "notices", "1.99.1")

    def test_unicode_notice_is_bundled_and_missing_or_changed_text_blocks(self):
        with tempfile.TemporaryDirectory() as name:
            base = Path(name)
            root = base / "registry/src/test/unicode-ident-1.0.27"
            root.mkdir(parents=True)
            cache = base / "registry/cache/test"
            cache.mkdir(parents=True)
            crate = cache / "unicode-ident-1.0.27.crate"
            crate.write_bytes(b"fixture archive")
            (root / "LICENSE-MIT").write_text("fixture MIT text")
            unicode_file = root / "LICENSE-UNICODE"
            unicode_file.write_text("fixture Unicode copyright and license text")
            package = {
                "name": "unicode-ident",
                "version": "1.0.27",
                "source": "registry+https://github.com/rust-lang/crates.io-index",
                "manifest_path": str(root / "Cargo.toml"),
                "license": "(MIT OR Apache-2.0) AND Unicode-3.0",
                "authors": [],
            }
            policy = {
                "toolchain": "fixture",
                "packages": {
                    "unicode-ident@1.0.27": {
                        "license": package["license"],
                        "crate_checksum": release.sha(crate),
                        "files": {p.name: release.sha(p) for p in root.iterdir()},
                    }
                },
                "rust_notices": {},
            }
            release.write_json(base / "license-policy.json", policy)
            with patch("release.HERE", base), patch(
                "release.run", return_value=str(base)
            ):
                release.notices({"packages": [package]}, base / "bundle", "fixture")
                release.verify_notices(base / "bundle")
                self.assertEqual(
                    (base / "bundle/unicode-ident@1.0.27/LICENSE-UNICODE").read_bytes(),
                    unicode_file.read_bytes(),
                )
                self.assertIn(
                    "MIT AND Unicode-3.0",
                    (base / "bundle/unicode-ident@1.0.27/ATTRIBUTION.txt").read_text(),
                )
                bundled = base / "bundle/unicode-ident@1.0.27/LICENSE-UNICODE"
                bundled.write_text("truncated")
                with self.assertRaisesRegex(ValueError, "bundled notice mismatch"):
                    release.verify_notices(base / "bundle")
                unicode_file.unlink()
                with self.assertRaisesRegex(ValueError, "notice inventory changed"):
                    release.notices(
                        {"packages": [package]}, base / "missing", "fixture"
                    )
                unicode_file.write_text("changed license text")
                with self.assertRaisesRegex(ValueError, "unreviewed license text"):
                    release.notices(
                        {"packages": [package]}, base / "changed", "fixture"
                    )

    def test_publication_rejects_wrong_source_and_unexpected_files(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            meta = {
                "architecture": "x86_64",
                "tag": "v0.1.0",
                "commit": release.APPROVED_V010,
                "tooling_commit": "tooling",
                "target": "x86_64-unknown-linux-gnu",
                "license_policy_sha256": release.sha(
                    release.HERE / "license-policy.json"
                ),
                "artifacts": [
                    "nasj-v0.1.0-linux-x86_64.tar.gz",
                    "nasj_0.1.0_amd64.deb",
                ],
            }
            release.write_json(root / "build-x86_64.json", meta)
            expected = {"build-x86_64.json", *meta["artifacts"]}
            with patch(
                "publish.checksums", return_value=dict.fromkeys(expected, "digest")
            ):
                self.assertIn(
                    "SHA256SUMS-binaries",
                    publish.validate(root, "v0.1.0", release.APPROVED_V010, "tooling"),
                )
                with self.assertRaises(ValueError):
                    publish.validate(root, "v0.1.0", "wrong", "tooling")
                with self.assertRaises(ValueError):
                    publish.validate(
                        root, "v0.1.0", release.APPROVED_V010, "other-tooling"
                    )
            with patch(
                "publish.checksums",
                return_value=dict.fromkeys(expected | {"unexpected"}, "digest"),
            ):
                with self.assertRaises(ValueError):
                    publish.validate(root, "v0.1.0", release.APPROVED_V010, "tooling")

    def test_publication_requires_reviewers_and_only_main_environment_policy(self):
        protected = {
            "protection_rules": [
                {"type": "required_reviewers", "reviewers": [{"type": "User"}]}
            ],
            "deployment_branch_policy": {
                "custom_branch_policies": True,
                "protected_branches": False,
            },
        }
        main = {"branch_policies": [{"name": "main", "type": "branch"}]}
        with patch("publish.api", side_effect=[protected, main]):
            publish.protected_environment("fixture/repo")
        with patch("publish.api", return_value={"protection_rules": []}):
            with self.assertRaisesRegex(ValueError, "required maintainer reviewers"):
                publish.protected_environment("fixture/repo")
        with patch(
            "publish.api", side_effect=[protected, {"branch_policies": [{"name": "*"}]}]
        ):
            with self.assertRaisesRegex(ValueError, "only the main branch"):
                publish.protected_environment("fixture/repo")


if __name__ == "__main__":
    unittest.main()
