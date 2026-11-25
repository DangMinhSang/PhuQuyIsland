import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { BuildingKind } from '../core/types';

const base = import.meta.env.BASE_URL + 'assets/models/';
const FILES = {
  houseA: 'kenney/building-small-a.glb', houseB: 'kenney/building-small-b.glb', houseC: 'kenney/building-small-c.glb', houseD: 'kenney/building-small-d.glb', garage: 'kenney/building-garage.glb', trees: 'kenney/grass-trees-tall.glb', treesShort: 'kenney/grass-trees.glb', fountain: 'kenney/pavement-fountain.glb',
  apartment: 'kaykit/building_A_withoutBase.gltf', hotel: 'kaykit/building_C_withoutBase.gltf', car: 'kaykit/car_hatchback.gltf', sedan: 'kaykit/car_sedan.gltf', police: 'kaykit/car_police.gltf', taxi: 'kaykit/car_taxi.gltf', water: 'kaykit/watertower.gltf', streetlight: 'kaykit/streetlight.gltf', bush: 'kaykit/bush.gltf',
};
export type Models = Partial<Record<keyof typeof FILES, THREE.Group>>;
export async function loadModels(): Promise<Models> {
  const loader = new GLTFLoader(), result: Models = {};
  // Two requests at a time; shared dependencies are cached by Three's loading cache.
  THREE.Cache.enabled = true;
  const entries = Object.entries(FILES) as [keyof typeof FILES, string][];
  for (let i = 0; i < entries.length; i += 2) await Promise.all(entries.slice(i, i + 2).map(async ([key, path]) => {
    const gltf = await loader.loadAsync(base + path);
    gltf.scene.updateMatrixWorld(true);
    result[key] = gltf.scene;
  }));
  return result;
}
export const material = (color: THREE.ColorRepresentation, roughness = .86, metalness = .03) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
export function block(parent: THREE.Object3D, size: number[], position: number[], mat: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), mat);
  mesh.position.set(position[0], position[1], position[2]); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
export function normalized(source: THREE.Group | undefined, width: number, maxHeight = 12): THREE.Group {
  const out = new THREE.Group();
  if (!source) return out;
  const clone = source.clone(true), box = new THREE.Box3().setFromObject(clone), size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  const scale = Math.min(width / Math.max(size.x, size.z), maxHeight / Math.max(size.y, .001));
  clone.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale); clone.scale.setScalar(scale);
  clone.traverse(node => { if (node instanceof THREE.Mesh) { node.castShadow = true; node.receiveShadow = true; } });
  out.add(clone); return out;
}

export function buildingModel(kind: BuildingKind, id: string, models: Models): THREE.Group {
  const n = Number(id.slice(1)), variant = (['houseA', 'houseB', 'houseC', 'houseD'] as const)[n % 4];
  const special: Partial<Record<BuildingKind, keyof Models>> = { apartments: 'apartment', hotel: 'hotel', resort: 'hotel', processing: 'garage', warehouse: 'garage', market: 'houseC', restaurant: 'houseD', port: 'garage', water: 'water', clinic: 'houseA', school: 'houseB', waste: 'garage', fire: 'garage', park: 'fountain', fishery: 'garage' };
  const g = normalized(models[special[kind] || variant], kind === 'resort' ? 11 : kind === 'water' ? 4.5 : 7.4, kind === 'apartments' || kind === 'hotel' ? 14 : 8.5);
  const concrete = material('#c4c2ad'), steel = material('#dae4d9', .5, .3);
  if (kind === 'solar' || kind === 'wind') g.clear();
  if (kind === 'solar') {
    const panel = material('#295269', .28, .6);
    for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z += 2) {
      block(g, [.18, 1.6, .18], [x * 2.4, .8, z * 1.8], steel);
      const p = block(g, [2.1, .16, 2.5], [x * 2.4, 1.9, z * 1.8], panel); p.rotation.x = .35;
      for (const o of [-.65, 0, .65]) block(p, [.025, .015, 2.45], [o, .09, 0], steel);
    }
  }
  if (kind === 'wind') {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(.22, .7, 17, 10), steel); tower.position.y = 8.5; tower.castShadow = true; g.add(tower);
    const rotor = new THREE.Group(); rotor.name = 'rotor'; rotor.position.set(0, 16.4, .7); g.add(rotor);
    for (let i = 0; i < 3; i++) {
      const shape = new THREE.Shape(); shape.moveTo(-.15, 0); shape.lineTo(-.55, 1.6); shape.lineTo(-.1, 6.5); shape.lineTo(.13, 6.8); shape.lineTo(.23, .6); shape.closePath();
      const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .09, bevelEnabled: false }), steel); blade.rotation.z = i * Math.PI * 2 / 3; rotor.add(blade);
    }
  }
  if (kind === 'clinic') {
    const red = material('#c95f4f'); block(g, [1.3, .25, .4], [0, 7.6, 0], red); block(g, [.4, .25, 1.3], [0, 7.6, 0], red);
  }
  if (kind === 'port' || kind === 'fishery') {
    const timber = material('#8a785e');
    for (let i = 0; i < 9; i++) block(g, [6, .18, .45], [0, .35, 3.5 + i * .5], timber);
    for (const x of [-2.6, 2.6]) for (const z of [4, 7]) block(g, [.32, 2.5, .32], [x, -.6, z], timber);
    block(g, [.25, 7.5, .25], [3, 3.75, 0], steel); block(g, [5, .25, .25], [1.1, 7.5, 0], steel);
  }
  if (kind === 'school' || kind === 'fire' || kind === 'port') {
    block(g, [.08, 7, .08], [3.5, 3.5, 3], steel);
    block(g, [1.2, .75, .025], [4.1, 6.3, 3], material('#c65b49'));
  }
  if (kind !== 'park') block(g, [8.5, .18, 8.5], [0, -.05, 0], concrete);
  return g;
}

export function palmGeometry(): { trunk: THREE.BufferGeometry; leaves: THREE.BufferGeometry } {
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(.15, 2, 0), new THREE.Vector3(.65, 4, .15), new THREE.Vector3(.75, 6, .2)]);
  const trunk = new THREE.TubeGeometry(curve, 8, .19, 5, false);
  const geometries: THREE.BufferGeometry[] = [];
  for (let frond = 0; frond < 7; frond++) {
    const positions: number[] = [], angle = frond / 7 * Math.PI * 2;
    const vertex = (t: number, side: number) => {
      const r = t * 3.2, width = Math.sin(t * Math.PI) * .6 * side;
      return [Math.cos(angle) * r + Math.sin(angle) * width + .75, 6 + Math.sin(t * Math.PI) * .8 - t * t * 1.5, Math.sin(angle) * r - Math.cos(angle) * width + .2];
    };
    for (let i = 0; i < 7; i++) {
      const a = i / 7, b = (i + 1) / 7;
      positions.push(...vertex(a, -1), ...vertex(b, -1), ...vertex(a, 1), ...vertex(a, 1), ...vertex(b, -1), ...vertex(b, 1));
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.computeVertexNormals(); geometries.push(geo);
  }
  const leaves = mergeGeometries(geometries); geometries.forEach(g => g.dispose()); return { trunk, leaves };
}

export function fishingBoat(): THREE.Group {
  const g = new THREE.Group(), wood = material('#b99b6d'), blue = material('#367c99'), white = material('#efe8d3');
  const shape = new THREE.Shape(); shape.moveTo(0, -4); shape.bezierCurveTo(-2.5, -2, -2.4, 2.5, -1.5, 3.8); shape.lineTo(1.5, 3.8); shape.bezierCurveTo(2.4, 2.5, 2.5, -2, 0, -4);
  const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 1.35, bevelEnabled: true, bevelSize: .25, bevelThickness: .35, bevelSegments: 2, steps: 1 }), blue);
  hull.rotation.x = -Math.PI / 2; hull.position.y = -.2; g.add(hull);
  block(g, [2.9, .2, 5.3], [0, 1.25, .5], wood); block(g, [2.5, 1.8, 2.2], [0, 2.2, 1.5], white);
  block(g, [2.8, .18, 2.6], [0, 3.2, 1.5], blue); block(g, [.12, 6, .12], [0, 3, -.5], wood);
  block(g, [2.6, .12, .12], [0, 5.6, -.5], wood); block(g, [1.2, .7, .03], [.6, 5.4, -.5], material('#c15340'));
  for (const x of [-1.55, 1.55]) for (let i = 0; i < 4; i++) { const float = new THREE.Mesh(new THREE.TorusGeometry(.25, .09, 5, 8), wood); float.position.set(x, 1.2, i * .7 - 1); float.rotation.y = Math.PI / 2; g.add(float); }
  // Merge the original authored static parts by material to keep boats at 4 draws.
  g.updateMatrixWorld(true);
  const byMaterial = new Map<THREE.Material, THREE.BufferGeometry[]>();
  g.traverse(node => {
    if (node instanceof THREE.Mesh && !Array.isArray(node.material)) {
      const parts = byMaterial.get(node.material) || [];
      parts.push(node.geometry.clone().applyMatrix4(node.matrixWorld)); byMaterial.set(node.material, parts);
    }
  });
  const compact = new THREE.Group();
  byMaterial.forEach((parts, mat) => { compact.add(new THREE.Mesh(mergeGeometries(parts), mat)); parts.forEach(geo => geo.dispose()); });
  g.traverse(node => { if (node instanceof THREE.Mesh) node.geometry.dispose(); });
  return compact;
}
