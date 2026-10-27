# NASJ v0.1.0

Prepared for publication after maintainer approval; no tag or release exists yet.

NASJ (نسج) turns Nginx configuration into an explorable infrastructure map.
This first release is source-first, with Linux x86_64 and Rust 1.99.1 validated.

## Highlights

- Rust CLI for read-only static Nginx infrastructure mapping with recursive includes.
- HTTP/HTTPS virtual hosts, routing relationships, static paths, upstreams and reverse proxies.
- Conditional redirect visualization with symbolic guards and ordered return actions.
- Info/Warning/Error diagnostics, strict mode, and original source-file/line evidence.
- JSON, DOT and standalone SVG exports plus interactive offline HTML reports.
- Graph-aware search, mobile-friendly navigation, readable host focus and themes.
- Official NASJ branding in reports and English/Arabic documentation.

The product version is **0.1.0**. The experimental topology JSON schema is **0.2**;
IDs can change when inputs change, and exhaustive consumers must support the
condition/action kinds. See [JSON_FORMAT.md](JSON_FORMAT.md).

## Install from source

After the v0.1.0 tag is published:

```sh
git clone --branch v0.1.0 https://github.com/marawan6569/Nasj.git
cd Nasj
cargo install --locked --path crates/nasj-cli
nasj --version
nasj map --config fixtures/nginx/multi-vhost.conf --strict --format html -o report.html
```

Until publication, use the default-branch instructions in [README.md](../README.md).
A Rust toolchain and native linker are required. Dependencies must be fetched
during building unless already cached; installed mapping and reports work offline.
No binaries or crates.io package are included in this distribution.

## Security and limitations

- Configuration analysis is read-only: no automatic networking, Docker/process
  discovery, Nginx reload or privilege escalation.
- HTML is a portable single file with embedded assets and restrictive CSP.
- Static configuration describes intent; runtime behavior and reachability are
  not verified. NASJ does not simulate complete Nginx request matching or replace `nginx -t`.
- Variable proxy destinations, unsupported conditions, rewrite/internal-redirect
  programs, FastCGI/uWSGI/SCGI/gRPC handlers and other excluded constructs remain
  unresolved. Conditional support is limited to server-level literal comparisons
  with a single return per condition. See [ANALYSIS.md](ANALYSIS.md).
- Configuration paths, infrastructure names and endpoints may be sensitive.
  Known-field redaction does not guarantee all secrets are removed; review reports
  before sharing. Use trusted snapshots for concurrently mutable untrusted trees.
- Chromium is validated, including desktop/phone/tablet layouts and touch tests.
  Firefox/WebKit and non-Linux platforms remain unverified; no older-Rust MSRV,
  physical-device certification, signed/reproducible binary or vulnerability-audit
  claim is made. Large graphs can need pan/search; search context has explicit bounds.

## Planned next

**v0.2:** optional Docker/systemd/process discovery with explicit evidence.
**v0.3:** an optional local web server. Neither is part of v0.1.0.

Licensed under [MIT](../LICENSE). See [distribution and notices](DISTRIBUTION.md).
