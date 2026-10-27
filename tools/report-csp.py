#!/usr/bin/env python3
"""Refresh the CSP hash after editing report.js; --check verifies it for CI."""
import base64
import hashlib
from pathlib import Path
import sys

assets = Path(__file__).resolve().parent.parent / "crates/nasj-export/src/assets"
expected = base64.b64encode(hashlib.sha256((assets / "report.js").read_bytes()).digest()).decode() + "\n"
target = assets / "report.sha256"
if "--check" in sys.argv:
    if target.read_text() != expected:
        sys.exit("Report script changed: run python3 tools/report-csp.py")
else:
    target.write_text(expected)
