# NASJ v0.1.0

NASJ (نسج) turns Nginx configuration into an explorable infrastructure map.
Precompiled Linux **x86_64 and ARM64 (aarch64)** archives and Debian packages
are now available, alongside source downloads. Both architectures were built
with Rust 1.99.1 and tested on Ubuntu 22.04 and Debian 12.

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
condition/action kinds. See [JSON_FORMAT.md](https://github.com/marawan6569/Nasj/blob/v0.1.0/docs/JSON_FORMAT.md).

## Install on Linux (recommended)

Precompiled **x86_64 and ARM64 (aarch64)** archives and Debian packages are
[available for v0.1.0](https://github.com/marawan6569/Nasj/releases/tag/v0.1.0).
No Rust toolchain is needed. Both architectures passed native runtime checks on
**Ubuntu 22.04 and Debian 12**. These are dynamically linked GNU/Linux binaries;
Linux Mint and other distributions need separate validation. See
[distribution and checksums](https://github.com/marawan6569/Nasj/blob/main/docs/DISTRIBUTION.md) for exact runtime requirements.

Download and install the archive matching your machine into your user account:

```sh
case "$(uname -m)" in
  x86_64) nasj_arch=x86_64 ;;
  aarch64|arm64) nasj_arch=aarch64 ;;
  *) echo "Unsupported architecture" >&2; exit 1 ;;
esac
nasj_download_dir=$(mktemp -d /tmp/nasj-download-XXXXXX)
cd "$nasj_download_dir"
nasj_release_url=https://github.com/marawan6569/Nasj/releases/download/v0.1.0
curl -fLO "$nasj_release_url/nasj-v0.1.0-linux-$nasj_arch.tar.gz"
curl -fLO "$nasj_release_url/SHA256SUMS-binaries"
sha256sum --ignore-missing --check SHA256SUMS-binaries
tar -xzf "nasj-v0.1.0-linux-$nasj_arch.tar.gz"
install -Dm755 "nasj-v0.1.0-linux-$nasj_arch/nasj" "$HOME/.local/bin/nasj"
"$HOME/.local/bin/nasj" --version
"$HOME/.local/bin/nasj" --help
```

Run each step only if the previous one succeeds; the intended archive must report
`OK`. Add `~/.local/bin` to `PATH` to run `nasj` directly. Keep the bundled notices
with any redistributed copies. Mapping and HTML reports work offline; runtime
mapping needs no Graphviz, Python, Node.js or running Nginx.

### Debian / Ubuntu package

Use a fresh directory and select the package matching `dpkg --print-architecture`:

```sh
nasj_deb_arch=$(dpkg --print-architecture)
case "$nasj_deb_arch" in amd64|arm64) ;; *) echo "Unsupported architecture" >&2; exit 1 ;; esac
nasj_download_dir=$(mktemp -d /tmp/nasj-deb-XXXXXX)
cd "$nasj_download_dir"
nasj_release_url=https://github.com/marawan6569/Nasj/releases/download/v0.1.0
curl -fLO "$nasj_release_url/nasj_0.1.0_$nasj_deb_arch.deb"
curl -fLO "$nasj_release_url/SHA256SUMS-binaries"
sha256sum --ignore-missing --check SHA256SUMS-binaries
sudo apt install "./nasj_0.1.0_$nasj_deb_arch.deb"
nasj --version
# Remove when needed: sudo apt remove nasj
```

The package version is `0.1.0-1`; the CLI reports `nasj 0.1.0`. Dependencies are
`libc6 (>= 2.34)` and `libgcc-s1 (>= 4.2)`. The lowest tested glibc is 2.35 on
Ubuntu 22.04; symbol requirements alone do not prove compatibility elsewhere.
Package installation/removal requires administrator privileges; ordinary mapping
does not. Checksums verify bytes, not signing or reproducible builds.

## Install from source

```sh
git clone --branch v0.1.0 https://github.com/marawan6569/Nasj.git
cd Nasj
cargo install --locked --path crates/nasj-cli
nasj --version
nasj map --config fixtures/nginx/multi-vhost.conf --strict --format html -o report.html
```

A Rust toolchain and native linker are required. Dependencies must be fetched
during building unless already cached; installed mapping and reports work offline.
No crates.io package is included in this distribution.

## Security and limitations

- Configuration analysis is read-only: no automatic networking, Docker/process
  discovery, Nginx reload or privilege escalation.
- HTML is a portable single file with embedded assets and restrictive CSP.
- Static configuration describes intent; runtime behavior and reachability are
  not verified. NASJ does not simulate complete Nginx request matching or replace `nginx -t`.
- Variable proxy destinations, unsupported conditions, rewrite/internal-redirect
  programs, FastCGI/uWSGI/SCGI/gRPC handlers and other excluded constructs remain
  unresolved. Conditional support is limited to server-level literal comparisons
  with a single return per condition. See [ANALYSIS.md](https://github.com/marawan6569/Nasj/blob/v0.1.0/docs/ANALYSIS.md).
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

Licensed under [MIT](https://github.com/marawan6569/Nasj/blob/v0.1.0/LICENSE). See [source distribution notices](https://github.com/marawan6569/Nasj/blob/v0.1.0/THIRD_PARTY_NOTICES.md).
