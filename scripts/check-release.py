"""Validate the VSIX and optionally verify that its README media is public."""
import argparse
import hashlib
import json
import re
import struct
import urllib.request
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--remote', action='store_true')
args = parser.parse_args()
package = json.loads((root / 'package.json').read_text(encoding='utf-8'))
version = package['version']
assert re.fullmatch(r'\d+\.\d+\.\d+', version), 'Expected a stable version'
lock = json.loads((root / 'package-lock.json').read_text(encoding='utf-8'))
assert lock['version'] == lock['packages']['']['version'] == version
preview = json.loads((root / 'docs/preview-theme.json').read_text())['gradientNitro.visualConfig']
assert preview['gradientMode'] == 'custom' and len(preview['gradientStops']) == 2
assert preview['softlightEnabled'] and preview['editorSoftlight'] > 0
preset = json.loads((root / 'docs/midnight-studio.gradient-nitro.json').read_text())
assert preset['visual']['gradientStops'] == preview['gradientStops']

gif_relative = re.search(r'!\[[^\]]*\]\((docs/images/[^)]+\.gif)\)', (root / 'README.md').read_text(encoding='utf-8')).group(1)
gif = root / gif_relative
data = gif.read_bytes()
assert data[:6] in (b'GIF87a', b'GIF89a')
width, height = struct.unpack_from('<HH', data, 6)
assert 0 < width <= 1280 and height > 0 and len(data) < 5_000_000
assert b'NETSCAPE2.0\x03\x01\x00\x00' in data, 'GIF must loop continuously'
offset = 13 + (3 * 2 ** ((data[10] & 7) + 1) if data[10] & 128 else 0)
frames, duration = 0, 0
while offset < len(data):
    marker = data[offset]
    offset += 1
    if marker == 0x3B:
        break
    if marker == 0x21:
        label = data[offset]
        offset += 1
        if label == 0xF9:
            delay = struct.unpack_from('<H', data, offset + 2)[0]
            assert delay > 0, 'Every GIF frame must have a display duration'
            duration += delay * 10
    elif marker == 0x2C:
        frames += 1
        flags = data[offset + 8]
        offset += 9
        if flags & 128:
            offset += 3 * 2 ** ((flags & 7) + 1)
        offset += 1  # LZW minimum code size
    else:
        raise AssertionError(f'Invalid GIF block: {marker}')
    while data[offset]:
        offset += data[offset] + 1
    offset += 1
assert frames > 10 and duration >= 3000, 'Expected a playable animation'

artifact = root / 'release' / f"{package['name']}-{version}.vsix"
assert artifact.exists(), f"VSIX artifact not found: {artifact}"
with zipfile.ZipFile(artifact) as archive:
    assert archive.testzip() is None
    packaged = json.loads(archive.read('extension/package.json'))
    assert packaged['version'] == version
    assert packaged['license'] == package['license'] == lock['packages']['']['license'] == 'PolyForm-Noncommercial-1.0.0'
    license_text = (root / 'LICENSE.md').read_bytes()
    assert license_text == (root / 'LICENSE').read_bytes()
    assert archive.read('extension/LICENSE.md') == license_text
    manifest = ET.fromstring(archive.read('extension.vsixmanifest'))
    assets = [a for a in manifest.iter() if a.attrib.get('Type') == 'Microsoft.VisualStudio.Services.Content.License']
    assert len(assets) == 1 and archive.read(assets[0].attrib['Path']) == license_text, 'Store license asset must contain PolyForm terms'
    assert b'IsPreReleaseVersion' not in archive.read('extension.vsixmanifest')
    readme = archive.read('extension/README.md').decode('utf-8')
    urls = re.findall(r'!\[[^\]]*\]\(([^)]+)\)', readme)
    raw_prefix = 'https://raw.githubusercontent.com/dadayan1234/gradient-nitro/main/'
    repo_urls = [url for url in urls if url.startswith(raw_prefix)]
    external_urls = [url for url in urls if not url.startswith(raw_prefix)]
    assert repo_urls, 'Expected repository media URLs'
    assert all(url.startswith('https://') for url in external_urls), 'External badges must use HTTPS'
    assert any(url.endswith(gif.name) for url in repo_urls)
    for url in repo_urls:
        relative = url.split('/main/', 1)[1]
        assert archive.read('extension/' + relative) == (root / relative).read_bytes()
    for directory in ['out', 'media']:
        for file in (root / directory).rglob('*'):
            if file.is_file() and ('extension/' + file.relative_to(root).as_posix()) in archive.namelist():
                assert archive.read('extension/' + file.relative_to(root).as_posix()) == file.read_bytes()

digest = hashlib.sha256(artifact.read_bytes()).hexdigest()
artifact.with_suffix('.vsix.sha256').write_text(f'{digest}  {artifact.name}\n', encoding='ascii')
print(f'LOCAL PASS: {artifact.name}; GIF {width}x{height}, {frames} frames, {duration}ms, {len(data)} bytes')
print('SHA256:', digest)
if args.remote:
    failures = []
    for url in repo_urls:
        relative = url.split('/main/', 1)[1]
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'Gradient-Nitro-release-check'})
            with urllib.request.urlopen(request, timeout=30) as response:
                assert response.headers.get_content_type().startswith('image/'), 'Not an image response'
                assert response.read() == (root / relative).read_bytes(), 'Public asset differs from release file'
            print('PUBLIC PASS:', relative)
        except Exception as error:
            failures.append(f'{relative}: {error}')
    if failures:
        raise SystemExit('PUBLIC MEDIA NOT READY. Push the release media to main before Marketplace upload.\n' + '\n'.join(failures))
else:
    print('Public availability is separate: run npm run release:media after pushing the release files.')
