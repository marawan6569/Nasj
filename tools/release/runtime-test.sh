#!/usr/bin/env bash
# Run only in a disposable, native runtime container/VM. Never on a developer host.
set -euo pipefail
: "${RELEASE_ARCH:?}" "${RELEASE_TAG:?}"
[[ $RELEASE_TAG =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]
case "$RELEASE_ARCH" in
  x86_64) debarch=amd64 ;;
  aarch64) debarch=arm64 ;;
  *) exit 1 ;;
esac
[[ $(uname -m) == "$RELEASE_ARCH" ]]
[[ $(dpkg --print-architecture) == "$debarch" ]]
! command -v rustc
! command -v cargo
if dpkg-query -W nasj >/dev/null 2>&1 || command -v nasj; then
  echo 'Conflicting nasj installation; refusing to modify it' >&2
  exit 1
fi
exec > >(tee runtime-evidence.txt) 2>&1
cat /etc/os-release
uname -m
cd dist
sha256sum --check "SHA256SUMS-$RELEASE_ARCH"
cd ..
top="nasj-$RELEASE_TAG-linux-$RELEASE_ARCH"
python3 - "$top" <<'PY'
import importlib.util, pathlib, sys, tarfile
spec = importlib.util.spec_from_file_location('release', 'tools/release/release.py')
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)
with tarfile.open('dist/' + sys.argv[1] + '.tar.gz') as archive:
    release.safe_members(archive, sys.argv[1])
    archive.extractall('extracted')
tree = pathlib.Path('extracted') / sys.argv[1]
assert (tree / 'nasj').stat().st_mode & 0o111
assert (tree / 'LICENSE').is_file()
assert (tree / 'third-party/unicode-ident@1.0.27/LICENSE-UNICODE').is_file()
PY
python3 tools/release/release.py smoke --binary "extracted/$top/nasj" --output archive-output --version "${RELEASE_TAG#v}"
deb="dist/nasj_${RELEASE_TAG#v}_${debarch}.deb"
[[ $(dpkg-deb -f "$deb" Package) == nasj ]]
[[ $(dpkg-deb -f "$deb" Architecture) == "$debarch" ]]
[[ $(dpkg-deb -f "$deb" Version) == "${RELEASE_TAG#v}-1" ]]
dpkg-deb --info "$deb"
dpkg-deb --contents "$deb"
dpkg-deb --ctrl-tarfile "$deb" | tar -tf - > control-files.txt
! grep -E '(preinst|postinst|prerm|postrm|triggers|conffiles)$' control-files.txt
apt-get install -y --no-install-recommends "./$deb"
test -f /usr/share/doc/nasj/third-party/unicode-ident@1.0.27/LICENSE-UNICODE
test -f /usr/share/doc/nasj/copyright
test -f /usr/share/doc/nasj/BUILD-METADATA.json
python3 tools/release/release.py smoke --binary /usr/bin/nasj --output installed-output --version "${RELEASE_TAG#v}"
dpkg-query -W -f='${Package} ${Version} ${Architecture} ${Depends}\n' nasj libc6 libgcc-s1
dpkg --purge nasj
test ! -e /usr/bin/nasj
test ! -e /usr/share/doc/nasj
echo 'PASS: native archive and package, no Rust, four strict exports, removal'
