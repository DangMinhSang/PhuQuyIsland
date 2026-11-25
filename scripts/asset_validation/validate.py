"""Validate bounded glTF/GLB assets, source checksums, references and mesh counts."""
from pathlib import Path
import hashlib
import json
import struct

ROOT = Path(__file__).resolve().parents[2]


def gltf(path):
    data = path.read_bytes()
    if path.suffix == '.glb':
        magic, version, length = struct.unpack_from('<4sII', data)
        assert magic == b'glTF' and version == 2 and length == len(data), path
        chunk_length, chunk_type = struct.unpack_from('<II', data, 12)
        assert chunk_type == 0x4E4F534A
        return json.loads(data[20:20 + chunk_length])
    return json.loads(data)


def validate():
    manifest = json.loads((ROOT / 'public/assets/manifest.json').read_text())
    report = []
    for pack in manifest:
        assert pack['license'] == 'CC0-1.0'
        for entry in pack['files']:
            path = ROOT / 'public' / entry['file']
            data = path.read_bytes()
            assert len(data) == entry['bytes']
            assert hashlib.sha256(data).hexdigest() == entry['sha256']
            if path.suffix not in ['.glb', '.gltf']:
                continue
            model = gltf(path)
            assert model['asset']['version'] == '2.0'
            for item in model.get('buffers', []) + model.get('images', []):
                uri = item.get('uri', '')
                if uri and not uri.startswith('data:'):
                    assert not uri.startswith(('http:', 'https:', '/')) and '..' not in Path(uri).parts
                    assert (path.parent / uri).is_file(), (path, uri)
            triangles = 0
            bounds = []
            for mesh in model.get('meshes', []):
                for primitive in mesh['primitives']:
                    accessor = model['accessors'][primitive.get('indices', primitive['attributes']['POSITION'])]
                    triangles += accessor['count'] // 3
                    position = model['accessors'][primitive['attributes']['POSITION']]
                    if 'min' in position and 'max' in position:
                        bounds.append({'min': position['min'], 'max': position['max']})
            assert 0 < triangles < 100000, (path, triangles)
            report.append(dict(file=entry['file'], bytes=len(data), triangles=triangles, localAccessorBounds=bounds, valid=True))
    return manifest, report


if __name__ == '__main__':
    manifest, report = validate()
    (ROOT / 'public/assets/validation.json').write_text(json.dumps(report, indent=2))
    catalog = ['# Asset catalog', '', 'Acquired 2026-11-25. Every released external file is listed in `public/assets/manifest.json` with original URL, creator, license, bytes and SHA-256. glTF dependencies remain adjacent to their source models. Raw glTF accessor bounds (before node transforms) and triangle counts are in `public/assets/validation.json`.', '', '| Asset | Category | Creator / source | License | Local file | Validation / optimization | Integration |', '|---|---|---|---|---|---|---|']
    integrated = {'building-small-a', 'building-small-b', 'building-small-c', 'building-small-d', 'building-garage', 'grass-trees-tall', 'pavement-fountain', 'building_A_withoutBase', 'building_C_withoutBase', 'car_hatchback', 'car_taxi', 'watertower'}
    for pack in manifest:
        for entry in pack['files']:
            path = Path(entry['file'])
            if path.suffix not in ['.gltf', '.glb']:
                continue
            row = next(r for r in report if r['file'] == entry['file'])
            category = 'Vegetation' if 'tree' in path.stem or 'bush' in path.stem else 'Vehicle' if 'car_' in path.stem else 'Infrastructure' if any(s in path.stem for s in ['water', 'light', 'fountain']) else 'Building'
            integration = 'Rendered in world' if path.stem in integrated else 'Acquired; integration pending'
            catalog.append(f"| [{path.stem}]({entry['url']}) | {category} | {pack['creator']} / official GitHub | CC0 1.0 | `{entry['file']}` | Valid; {row['triangles']:,} triangles, {row['bytes']:,} bytes; original lightweight file, no decimation required | {integration} |")
    catalog += ['', '## Original assets', '', 'Original code-generated terrain/ocean, curved palm fronds, coastal rocks, road ribbons/curbs/markings, lighthouse, utility details, fishing-boat hull/deck/mast/rigging and synthesized wave audio are authored in this repository. These are not attributed to a third-party library. Building architecture remains stylized; a future realism pass should replace generic assets with more locally specific models.', '', '## Geographic data', '', 'OpenStreetMap snapshot (`public/data/osm-source.json`), processed coordinates (`public/data/phu-quy.json` and `src/world/geography.json`): ODbL 1.0, © OpenStreetMap contributors. Fetched 2026-11-25 using `scripts/asset_acquisition/geography.py`. Coastline has 6 closed rings, main island 376 source points, 41 road alignments. Heights are artistic approximations; no elevation dataset is claimed.']
    (ROOT / 'docs/ASSET_CATALOG.md').write_text('\n'.join(catalog) + '\n')
    licenses = ['# Asset licenses', '', '## Kenney', '', '- Creator: Kenney; source https://github.com/KenneyNL/Starter-Kit-City-Builder', '- The official README explicitly declares included 2D sprites, 3D models and sound effects CC0. The code template is MIT; no template code is copied.', '- CC0 declaration preserved in `public/assets/models/kenney/LICENSE-source.txt`.', '', '## KayKit', '', '- Creator: Kay Lousberg; source https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0', '- CC0 1.0, free personal, educational and commercial use, no required attribution. Voluntarily credited in game.', '- Original license preserved in `public/assets/models/kaykit/LICENSE-source.txt`.', '', '## Common asset license', '', 'CC0 1.0 Universal: https://creativecommons.org/publicdomain/zero/1.0/ . Download date 2026-11-25. No modifications to source meshes; scene instances are normalized/scaled, lighting is game-authored, vegetation is instanced. File-specific original URLs and checksums are preserved in the manifest. Optimization is retention of small source glTF/GLB and shared texture atlases; no false compression/decimation claim.', '', '## OpenStreetMap', '', '© OpenStreetMap contributors. Database license ODbL 1.0: https://www.openstreetmap.org/copyright . Source API: https://overpass-api.de/api/interpreter . Original query is preserved in acquisition script. Attribution appears persistently in HUD and About screen. Original and adapted coordinate data ship with release, retaining provenance and ODbL notice. Geographic data must not be relicensed as CC0 or covered by an unrelated code license.', '', '## Lucide icons and runtime dependencies', '', 'Lucide icons: ISC license, https://github.com/lucide-icons/lucide/blob/main/LICENSE . React: MIT; Three.js: MIT; Zustand: MIT. Dependency license copies will be included in THIRD_PARTY_NOTICES.md before release.', '', '## Access restriction observed', '', 'The kenney.nl download endpoint returned 403. It was not bypassed. Selected assets were instead downloaded from official creators’ public repositories under their published licenses. No paid pack, restricted EXTRA model, executable download or copyrighted satellite imagery is included.']
    (ROOT / 'docs/ASSET_LICENSES.md').write_text('\n'.join(licenses) + '\n')
    print(json.dumps({'validatedModels':len(report),'totalTriangles':sum(r['triangles'] for r in report),'externalBytes':sum(f['bytes'] for p in manifest for f in p['files']),'models':[{k:v for k,v in r.items() if k!='localAccessorBounds'} for r in report]},indent=2))
