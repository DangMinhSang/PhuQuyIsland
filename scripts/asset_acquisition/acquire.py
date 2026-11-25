"""Acquire CC0 assets from creators' official repositories.

Kenney's website download endpoint returned 403; do not bypass it. These are
already-public repositories with explicit asset license declarations.
"""
from pathlib import Path
import hashlib
import json
import struct
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
SOURCES = [
    dict(pack='kenney', repo='KenneyNL/Starter-Kit-City-Builder', folder='models/', licenseFile='README.md', creator='Kenney',
         models=['building-small-a.glb', 'building-small-b.glb', 'building-small-c.glb', 'building-small-d.glb', 'building-garage.glb', 'grass-trees.glb', 'grass-trees-tall.glb', 'pavement-fountain.glb']),
    dict(pack='kaykit', repo='KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0', folder='addons/kaykit_city_builder_bits/Assets/gltf/', licenseFile='LICENSE.txt', creator='Kay Lousberg',
         models=['building_A_withoutBase.gltf', 'building_C_withoutBase.gltf', 'car_hatchback.gltf', 'car_sedan.gltf', 'car_taxi.gltf', 'car_police.gltf', 'streetlight.gltf', 'watertower.gltf', 'bush.gltf']),
]


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'PhuQuyIslandAssetResearch/0.1'})
    with urllib.request.urlopen(req, timeout=35) as response:
        data = response.read(15_000_001)
        if len(data) > 15_000_000:
            raise ValueError('Individual asset exceeds resource limit')
        return data


def acquire(source):
    base = 'https://raw.githubusercontent.com/' + source['repo'] + '/main/'
    license_data = fetch(base + source['licenseFile'])
    if 'CC0' not in license_data.decode():
        raise ValueError('Missing explicit CC0 declaration')
    dest = ROOT / 'public/assets/models' / source['pack']
    dest.mkdir(parents=True, exist_ok=True)
    (dest / 'LICENSE-source.txt').write_bytes(license_data)
    queue = list(source['models'])
    files, seen = [], set()
    while queue:
        name = queue.pop(0)
        if name in seen:
            continue
        seen.add(name)
        if name.startswith('/') or '..' in Path(name).parts:
            raise ValueError('Unsafe relative asset URI')
        url = base + source['folder'] + urllib.parse.quote(name)
        data = fetch(url)
        target = dest / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        files.append(dict(file=str(target.relative_to(ROOT / 'public')), url=url, bytes=len(data), sha256=hashlib.sha256(data).hexdigest()))
        if name.endswith(('.gltf', '.glb')):
            if name.endswith('.glb'):
                chunk_length = struct.unpack_from('<I', data, 12)[0]
                model = json.loads(data[20:20 + chunk_length])
            else:
                model = json.loads(data)
            for part in model.get('buffers', []) + model.get('images', []):
                uri = part.get('uri', '')
                if uri and not uri.startswith('data:'):
                    queue.append(str(Path(name).parent / uri))
    return dict(pack=source['pack'], source='https://github.com/' + source['repo'], creator=source['creator'], license='CC0-1.0', licenseUrl='https://creativecommons.org/publicdomain/zero/1.0/', licenseSource=base + source['licenseFile'], downloadDate='2026-11-25', attribution='Not required; voluntarily credited in game', files=files)


if __name__ == '__main__':
    manifest = []
    for source in SOURCES:
        result = acquire(source)
        manifest.append(result)
        print(source['pack'], len(result['files']), 'files', sum(f['bytes'] for f in result['files']), 'bytes', flush=True)
        (ROOT / 'public/assets/manifest.json').write_text(json.dumps(manifest, indent=2))
