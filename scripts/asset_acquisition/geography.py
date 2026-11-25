"""Fetch ODbL OpenStreetMap coastline, roads and named features, with provenance."""
from pathlib import Path
import json
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
QUERY = '''[out:json][timeout:40];(
way["natural"="coastline"](10.47,108.90,10.57,109.00);
way["highway"~"primary|secondary|tertiary"](10.49,108.91,10.56,108.99);
node["natural"="peak"](10.49,108.91,10.56,108.99);
node["man_made"="lighthouse"](10.49,108.91,10.56,108.99);
node["place"~"village|town"](10.49,108.91,10.56,108.99);
);out geom;'''


def main():
    raw = None
    for endpoint in ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']:
        try:
            req = urllib.request.Request(endpoint + '?' + urllib.parse.urlencode({'data': QUERY}), headers={'User-Agent': 'PhuQuyIsland/0.1 geographic research'})
            with urllib.request.urlopen(req, timeout=55) as response:
                raw = json.load(response)
            break
        except Exception as error:
            print(endpoint, str(error), flush=True)
    if raw is None:
        raise RuntimeError('OSM unavailable; do not invent a sourced coastline')
    (ROOT / 'public/data/osm-source.json').write_text(json.dumps(raw, ensure_ascii=False))
    coast = [e for e in raw['elements'] if e.get('tags', {}).get('natural') == 'coastline']
    chains = [([(p['lon'], p['lat']) for p in e['geometry']], e['nodes']) for e in coast]
    rings = []
    while chains:
        coords, nodes = chains.pop(0)
        while nodes[0] != nodes[-1]:
            found = False
            for i, (c, n) in enumerate(chains):
                if n[0] == nodes[-1]:
                    coords.extend(c[1:]); nodes.extend(n[1:])
                elif n[-1] == nodes[-1]:
                    coords.extend(c[-2::-1]); nodes.extend(n[-2::-1])
                else:
                    continue
                chains.pop(i)
                found = True
                break
            if not found:
                raise ValueError('Incomplete coastline chain; enlarge query bounds')
        rings.append(coords)
    rings.sort(key=len, reverse=True)
    roads = [[(p['lon'], p['lat']) for p in e['geometry']] for e in raw['elements'] if 'highway' in e.get('tags', {})]
    landmarks = [dict(lon=e['lon'], lat=e['lat'], tags=e.get('tags', {}), osmId=e['id']) for e in raw['elements'] if e['type'] == 'node']
    result = dict(source=endpoint, attribution='© OpenStreetMap contributors', license='ODbL-1.0', licenseUrl='https://www.openstreetmap.org/copyright', fetched='2026-11-25', projection={'center':[108.94,10.525], 'metersPerUnit':10}, coastline=rings, roads=roads, landmarks=landmarks)
    (ROOT / 'public/data/phu-quy.json').write_text(json.dumps(result, ensure_ascii=False))
    print(json.dumps({'rings':len(rings),'points':list(map(len,rings)), 'roads':len(roads),'landmarks':landmarks},ensure_ascii=False,indent=2))


if __name__ == '__main__':
    main()
