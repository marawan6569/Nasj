<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logos/display/logo_primary_dark.png">
    <img src="assets/logos/display/logo_primary_light.png" width="420" height="218" alt="NASJ — نسج">
  </picture>
</p>
<h1 align="center">NASJ — نسج</h1>
<p align="center"><strong>Weave your infrastructure into clarity.</strong></p>
<p align="center">Turn Nginx configuration into an explorable infrastructure topology, with file and line evidence.</p>
<p align="center">
  <a href="https://github.com/marawan6569/Nasj/actions/workflows/ci.yml"><img src="https://github.com/marawan6569/Nasj/actions/workflows/ci.yml/badge.svg?branch=main&amp;event=push" alt="Rust CI · main"></a>
</p>
<p align="center">Rust · MIT · Linux validated · <a href="README.ar.md">اقرأ بالعربية</a></p>

> **NASJ v0.1.0 is officially released.** [Release notes and downloads](https://github.com/marawan6569/Nasj/releases/tag/v0.1.0).
> Precompiled Linux x86_64 and ARM64 archives, Debian packages and source downloads
> are available with SHA-256 checksums. No crates.io package is distributed.

Nginx routes can span virtual hosts, nested locations and included files. NASJ
brings those declarations into one map: follow a domain to its server and proxy
backend, inspect static paths or conditional redirects, and trace each relationship
back to its configuration source. Unresolved routing stays visible as uncertainty.

## What works today

- **CLI-first Rust application:** bounded Nginx parsing and recursive/glob includes.
- **Configured topology:** HTTP/HTTPS virtual hosts, locations, upstream members,
  reverse-proxy targets, roots/aliases and narrowly supported conditional returns.
- **Four exports:** versioned JSON, Graphviz DOT, standalone SVG and interactive HTML.
- **One offline HTML file:** readable host focus, search with connected routing
  context, filters, zoom/pan, touch navigation, inspector and light/dark themes.
- **Evidence and diagnostics:** original file/line references and Info/Warning/Error
  severities; configured relationships are distinct from synthetic demo data.
- **Read-only operation:** no configuration changes, Nginx reloads, privilege
  escalation, telemetry or automatic network discovery.

## Quick start: Linux binary (recommended)

Precompiled **x86_64 and ARM64 (aarch64)** archives and Debian packages are
[available for v0.1.0](https://github.com/marawan6569/Nasj/releases/tag/v0.1.0).
No Rust toolchain is needed. Both architectures passed native runtime checks on
**Ubuntu 22.04 and Debian 12**. These are dynamically linked GNU/Linux binaries;
Linux Mint and other distributions need separate validation. See
[distribution and checksums](docs/DISTRIBUTION.md) for exact runtime requirements.

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

### Install from source

Install a stable [Rust toolchain](https://rustup.rs) and native linker. For the
immutable release:

```sh
git clone --branch v0.1.0 https://github.com/marawan6569/Nasj.git Nasj-v0.1.0
cd Nasj-v0.1.0
cargo install --locked --path crates/nasj-cli
nasj --version
nasj map --config fixtures/nginx/multi-vhost.conf --strict --format html -o report.html
```

Open `report.html` directly in your browser. This uses synthetic fixtures and
emits two informational notices for optional empty includes. Make sure Cargo's
bin directory is on `PATH`. Source builds were validated with Rust 1.99.1 on both
Linux architectures; older Rust versions and non-Linux platforms remain unverified.
Building may fetch dependencies; installed mapping works offline.

For development, clone `--branch main` instead. `main` remains the default
development branch; `v0.1.0` stays fixed at
`b60cb2e045fc9476034bffba7967b8674825fa18`.

## Explore a configuration

```sh
nasj map --config ./nginx.conf --format json -o topology.json
nasj map --config ./nginx.conf --format dot -o topology.dot
nasj map --config ./nginx.conf --format svg -o topology.svg
nasj map --config ./nginx.conf --format html -o report.html
```

Use fresh output paths: existing files and symlinks are never overwritten. Without
`-o`, only the selected format goes to stdout. `nasj demo` is a separate synthetic
example. Includes stay inside the configuration prefix by default; use `--prefix`
to choose it and `--allow-external-includes` only for intended external includes.
`--strict` permits Info diagnostics and rejects Warning/Error; required input
failures always stop analysis without a partial report.

In HTML, select a host or search for a domain, backend, path or source file.
Highlighted nodes match directly; dashed nodes preserve their routing context.
Select a node to inspect its attributes and evidence. Bounded search results
explicitly indicate incomplete context; Fit view and Readable scale remain available.

[![Synthetic report: backend search retains domains, virtual host, location and upstream](docs/images/report-preview.png)](docs/images/report-preview.png)

*Screenshot generated from repository fixtures. Source paths are normalized for this
public screenshot; no production configuration or report was used.*

## Scope and safety

NASJ describes **configured intent**, not verified runtime infrastructure or the
result of an actual request. Variables remain symbolic; unsupported conditions,
rewrite behavior and non-HTTP handlers remain unresolved. It does not replace
`nginx -t` or simulate complete Nginx request matching. See the
[supported analysis contract](docs/ANALYSIS.md) for exact semantics and limits.

Reports escape untrusted content and redact known sensitive fields, but hostnames
and filesystem paths remain visible. Generic secret detection is not guaranteed;
review before sharing. HTML embeds all assets, including approved logos, under a
restrictive CSP and makes no external requests. Read the [security policy](SECURITY.md).

## Documentation

| Guide | Contents |
| --- | --- |
| [Architecture](docs/ARCHITECTURE.md) | Core, exporters and CLI boundaries |
| [Analysis and syntax](docs/ANALYSIS.md) | Includes, supported routing and uncertainty |
| [JSON schema 0.2](docs/JSON_FORMAT.md) | Canonical structures, evidence and compatibility |
| [Reports](docs/REPORTS.md) | Formats, interaction, offline security and browser tests |
| [Official assets](assets/logos/README.md) | Approved originals, display variants and provenance |
| [Release readiness](docs/RELEASE_READINESS.md) · [checklist](docs/RELEASE_CHECKLIST.md) | Merge, publication and verification evidence |
| [v0.1.0 release notes](docs/RELEASE_NOTES_v0.1.0.md) · [distribution](docs/DISTRIBUTION.md) | Linux packages, source and verification |
| [Specification](docs/SPEC.md) · [implementation plan](docs/IMPLEMENTATION_PLAN.md) | Requirements and implementation history |

## Roadmap and contributing

**v0.1.0** delivers static mapping and offline reports; `main` is the development branch.
**v0.2** plans optional Docker/systemd/process correlation with evidence;
**v0.3** plans an optional local server. Discovery and the server are **not implemented**.
See the [roadmap](docs/ROADMAP.md) for scope.

Bug reports, synthetic regression fixtures and focused PRs are welcome. Read
[CONTRIBUTING.md](CONTRIBUTING.md); never post private configurations, credentials
or deployment reports in public issues. Maintainers approve merges and releases.
Changes are recorded in the [changelog](CHANGELOG.md).

Licensed under [MIT](LICENSE); see the [dependency inventory](docs/DEPENDENCY_LICENSES.md)
for upstream declarations. NASJ is independent of F5 and NGINX.
