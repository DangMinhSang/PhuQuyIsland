import * as THREE from 'three';
import { COASTLINES, coastDistance, heightAt, inside } from '../world/geography';
import type { Point } from '../core/types';

export function createTerrain(): { group: THREE.Group; land: THREE.Mesh[] } {
  const group = new THREE.Group(), land: THREE.Mesh[] = [];
  const grass = new THREE.Color('#9ba77b'), sand = new THREE.Color('#d6caa2'), high = new THREE.Color('#87947c'), rock = new THREE.Color('#a6a58b');
  COASTLINES.forEach((coast, island) => {
    const shape = new THREE.Shape(coast.map(p => new THREE.Vector2(p.x, -p.z)));
    const flat = new THREE.ShapeGeometry(shape), points = flat.getAttribute('position'), indices = flat.index;
    const vertices: number[] = [], colors: number[] = [], cache = new Map<string, [number, number, number, number]>();
    const sample = (p: Point) => {
      const k = `${p.x.toFixed(3)},${p.z.toFixed(3)}`;
      let value = cache.get(k);
      if (value) return value;
      const shore = island === 0 ? coastDistance(p) : 10;
      const h = island === 0 ? Math.max(0, heightAt(p)) : 1.2 + Math.sin(p.x * .07) * Math.cos(p.z * .07) * 1.1;
      const c = sand.clone().lerp(grass, Math.min(1, shore / 14)).lerp(high, Math.min(.8, Math.max(0, h - 7) / 28));
      c.lerp(rock, Math.max(0, h - 19) / 18).multiplyScalar(.97 + (Math.sin(p.x * 1.5 + p.z * .97) + 1) * .025);
      value = [h, c.r, c.g, c.b]; cache.set(k, value); return value;
    };
    const push = (a: Point, b: Point, c: Point, depth: number) => {
      if (depth) {
        const ab = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }, bc = { x: (b.x + c.x) / 2, z: (b.z + c.z) / 2 }, ca = { x: (c.x + a.x) / 2, z: (c.z + a.z) / 2 };
        push(a, ab, ca, depth - 1); push(ab, b, bc, depth - 1); push(ca, bc, c, depth - 1); push(ab, bc, ca, depth - 1); return;
      }
      for (const p of [a, b, c]) { const s = sample(p); vertices.push(p.x, s[0], p.z); colors.push(s[1], s[2], s[3]); }
    };
    const count = indices ? indices.count : points.count;
    for (let i = 0; i < count; i += 3) {
      const p = [0, 1, 2].map(j => { const idx = indices ? indices.getX(i + j) : i + j; return { x: points.getX(idx), z: -points.getY(idx) }; });
      push(p[0], p[1], p[2], island === 0 ? 3 : 1);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .96, side: THREE.DoubleSide })); mesh.receiveShadow = true; mesh.name = 'island-terrain'; group.add(mesh); land.push(mesh);
    // A thin sandy seabed shelf creates physically coherent shallow turquoise water.
    const seabed = new THREE.Mesh(flat.clone(), new THREE.MeshStandardMaterial({ color: '#78bcb2', roughness: .9 })); seabed.rotation.x = -Math.PI / 2; seabed.scale.set(1.025, 1.025, 1); seabed.position.y = -1.25; group.add(seabed);
    const outline = new THREE.BufferGeometry().setFromPoints(coast.map(p => new THREE.Vector3(p.x, .04, p.z)));
    group.add(new THREE.LineLoop(outline, new THREE.LineBasicMaterial({ color: '#efe5c8', transparent: true, opacity: .55 })));
    flat.dispose();
  });
  return { group, land };
}

export function createOcean() {
  const uniforms = { time: { value: 0 }, daylight: { value: 1 }, storm: { value: 0 } };
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000, 1, 1), new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `varying vec3 vWorld; void main(){vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader: `varying vec3 vWorld; uniform float time; uniform float daylight; uniform float storm;
    void main(){vec2 p=vWorld.xz;float a=sin(p.x*.05+time*.55)+sin(p.y*.071-time*.4)+sin((p.x+p.y)*.11+time*.3)*.4;float b=sin(p.x*.45+p.y*.23+time*1.2)*sin(p.y*.38-time*.8);float streak=pow(max(0.,b*.5+.5),18.);vec3 col=mix(vec3(.08,.39,.45),vec3(.15,.54,.57),a*.12+.55);col+=vec3(.22,.3,.27)*streak*.55;col=mix(col,vec3(.15,.29,.33),storm*.55);gl_FragColor=vec4(col*(.35+.65*daylight),1.);}`,
    side: THREE.DoubleSide,
  }));
  ocean.rotation.x = -Math.PI / 2; ocean.position.y = -1.05;
  return { ocean, uniforms };
}

export function suitableVegetation(x: number, z: number) { const p = { x, z }; return inside(p) && coastDistance(p) > 5 && heightAt(p) < 22; }
