#!/usr/bin/env python3
"""Check approved PNG provenance and refresh/check trusted offline data URIs.

Default refreshes only base64 packaging. --check performs read-only CI validation.
Display PNGs are reviewed derivatives; originals never change here.
"""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import struct
import zlib

repo = Path(__file__).resolve().parent.parent
logos = repo / 'assets/logos'
assets = repo / 'crates/nasj-export/src/assets'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--check', action='store_true')
args = parser.parse_args()
manifest = json.loads((logos / 'manifest.json').read_text())


def check_png(path, digest, width, height, mode):
    data = path.read_bytes()
    if hashlib.sha256(data).hexdigest() != digest:
        raise ValueError(f'Branding checksum changed: {path.relative_to(repo)}')
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError('Only reviewed PNG assets are accepted')
    cursor, seen_end = 8, False
    while cursor < len(data):
        length = struct.unpack('>I', data[cursor:cursor+4])[0]
        kind = data[cursor+4:cursor+8]
        payload = data[cursor+8:cursor+8+length]
        crc = struct.unpack('>I', data[cursor+8+length:cursor+12+length])[0]
        if zlib.crc32(kind + payload) != crc:
            raise ValueError('Invalid PNG chunk integrity')
        if cursor == 8:
            assert kind == b'IHDR' and len(payload) == 13
            w, h, depth, color, compression, filtering, interlace = struct.unpack('>IIBBBBB', payload)
            assert (w, h, depth, color) == (width, height, 8, 6 if mode == 'RGBA' else 2)
            assert (compression, filtering, interlace) == (0, 0, 0)
        if kind == b'IEND':
            assert length == 0 and cursor + 12 == len(data)
            seen_end = True
        assert kind != b'acTL', 'No animation in approved report assets'
        cursor += length + 12
    assert cursor == len(data) and seen_end
    return data


for entry in manifest['inventory']:
    if entry['retained']:
        check_png(logos / 'originals' / entry['name'], entry['sha256'], entry['width'], entry['height'], entry['mode'])
for entry in manifest['display']:
    mode = 'RGB' if 'app_icon' in entry['path'] else 'RGBA'
    data = check_png(logos / entry['path'], entry['sha256'], entry['width'], entry['height'], mode)
    if 'embedding' not in entry:
        continue
    expected = 'data:image/png;base64,' + base64.b64encode(data).decode('ascii') + '\n'
    target = assets / entry['embedding']
    if args.check:
        assert target.read_text() == expected, 'Run python3 tools/branding.py after reviewed asset changes'
    else:
        target.write_text(expected)
print('PASS: approved source/display PNG checksums, PNG integrity/dimensions and offline embedding')
