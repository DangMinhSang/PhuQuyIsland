import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { useGame } from '../core/store';
import { CATALOG, ZONE_COLORS } from '../core/catalog';
import type { BuildingKind, Game, Point, Road } from '../core/types';
import { CELL, distance, heightAt, inside, key, LANDMARKS, snap } from '../world/geography';
import { makeNetwork, roadPath, routeBetween } from '../simulation/network';
import { placementError } from '../simulation/simulation';
import { block, buildingModel, fishingBoat, loadModels, material, normalized, palmGeometry, type Models } from './models';
import { createOcean, createTerrain, suitableVegetation } from './terrain';

function disposeGroup(group: THREE.Group, geometriesOnly = false) {
  group.traverse(o => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Line || o instanceof THREE.Points) {
      if (!o.userData.shared) o.geometry?.dispose();
      if (!geometriesOnly && !o.userData.shared) { const mats = Array.isArray(o.material) ? o.material : [o.material]; mats.forEach(m => m.dispose()); }
    }
  });
  group.clear();
}
function ribbon(points: Point[], width: number, elevation = .17, bridge = false) {
  const positions: number[] = [];
  const y = (p: Point) => bridge ? Math.max(3.2, heightAt(p) + .2) : Math.max(0, heightAt(p)) + elevation;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], length = distance(a, b);
    if (!length) continue;
    const dx = (b.z - a.z) / length * width / 2, dz = -(b.x - a.x) / length * width / 2;
    positions.push(a.x - dx, y(a), a.z - dz, b.x - dx, y(b), b.z - dz, a.x + dx, y(a), a.z + dz, a.x + dx, y(a), a.z + dz, b.x - dx, y(b), b.z - dz, b.x + dx, y(b), b.z + dz);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.computeVertexNormals(); return geo;
}
function roadsGeometry(roads: Road[]): THREE.Group {
  const group = new THREE.Group();
  for (const kind of ['street', 'avenue', 'bridge'] as const) {
    const subset = roads.filter(r => r.kind === kind), surface: THREE.BufferGeometry[] = [], curbs: THREE.BufferGeometry[] = [];
    const width = kind === 'avenue' ? 4.4 : 3;
    for (const r of subset) {
      const curve = new THREE.CatmullRomCurve3(r.points.map(p => new THREE.Vector3(p.x, 0, p.z)), false, 'centripetal');
      const points = curve.getPoints(Math.min(800, r.points.length * 4)).map(p => ({ x: p.x, z: p.z }));
      curbs.push(ribbon(points, width + .9, .12, kind === 'bridge')); surface.push(ribbon(points, width, .19, kind === 'bridge'));
    }
    if (surface.length) {
      const road = new THREE.Mesh(mergeGeometries(surface), new THREE.MeshStandardMaterial({ color: kind === 'bridge' ? '#8b9995' : '#6c7772', roughness: .94, side: THREE.DoubleSide })); road.receiveShadow = true; group.add(road);
      const curb = new THREE.Mesh(mergeGeometries(curbs), new THREE.MeshStandardMaterial({ color: '#b9b7a4', roughness: .92, side: THREE.DoubleSide })); curb.receiveShadow = true; group.add(curb);
      surface.forEach(g => g.dispose()); curbs.forEach(g => g.dispose());
    }
  }
  const marks: number[] = [];
  for (const r of roads) for (let i = 1; i < r.points.length; i += 2) {
    const a = r.points[i - 1], b = r.points[i], h = Math.max(r.kind === 'bridge' ? 3.21 : 0, heightAt(a)) + .22;
    marks.push(a.x, h, a.z, a.x + (b.x - a.x) * .35, h, a.z + (b.z - a.z) * .35);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(marks, 3)); group.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#e5debd', transparent: true, opacity: .7 })));
  return group;
}

function label(text: string, subtitle = ''): THREE.Sprite {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const context = canvas.getContext('2d')!; context.textAlign = 'center'; context.shadowColor = '#123d3b'; context.shadowBlur = 8;
  context.fillStyle = '#f7f7e5'; context.font = '500 29px system-ui'; context.fillText(text, 256, 52);
  context.fillStyle = '#e3eee0'; context.font = '19px system-ui'; context.fillText(subtitle, 256, 84);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true, opacity: .9 })); sprite.scale.set(72, 18, 1); return sprite;
}

interface Car { mesh: THREE.Group; path: Point[]; index: number; t: number; speed: number }
interface Diagnostics { fps: number; calls: number; triangles: number; assets: number; onDemand: boolean }

class IslandRenderer {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 1, 1, 6000);
  controls: OrbitControls;
  world = new THREE.Group();
  buildings = new THREE.Group();
  roadMeshes = new THREE.Group();
  zones = new THREE.Group();
  traffic = new THREE.Group();
  labels = new THREE.Group();
  clouds = new THREE.Group();
  decoration = new THREE.Group();
  models: Models = {};
  sharedGeometry = new Set<THREE.BufferGeometry>();
  sharedMaterials = new Set<THREE.Material>();
  vegetation: { mesh: THREE.InstancedMesh; points: Point[]; matrices: THREE.Matrix4[] }[] = [];
  cars: Car[] = [];
  boats: THREE.Group[] = [];
  sun = new THREE.DirectionalLight('#fff0ca', 2.8);
  ambient = new THREE.HemisphereLight('#cee6ec', '#64745b', 2);
  selection = new THREE.Mesh(new THREE.RingGeometry(4.9, 5.3, 40), new THREE.MeshBasicMaterial({ color: '#a6efcd', transparent: true, opacity: .9, side: THREE.DoubleSide, depthTest: false }));
  ghost = new THREE.Group();
  roadGhost = new THREE.Group();
  ghostKind = '';
  land: THREE.Mesh[];
  pointer = new THREE.Vector2();
  raycaster = new THREE.Raycaster();
  ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  hit = new THREE.Vector3();
  hover: Point | null = null;
  down: { x: number; y: number } | null = null;
  painting = false;
  lastPaint = '';
  keys = new Set<string>();
  frame = 0;
  disposed = false;
  observer: ResizeObserver;
  unsubscribe: () => void;
  ocean = createOcean();
  rain: THREE.Points;
  lastFrame = 0;
  lastStats = 0;
  frames = 0;
  renderNeeded = true;
  lastRender = 0;
  overview = false;
  updateStats: (d: Diagnostics) => void;
  updateHint: (hint: string) => void;

  constructor(public host: HTMLDivElement, updateStats: (d: Diagnostics) => void, updateHint: (hint: string) => void) {
    this.updateStats = updateStats; this.updateHint = updateHint;
    this.renderer = new THREE.WebGLRenderer({ antialias: useGame.getState().game.settings.quality !== 'low', powerPreference: 'low-power', alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute('aria-label', 'Interactive 3D map of Phú Quý Island'); this.renderer.domElement.setAttribute('role', 'img'); this.renderer.domElement.tabIndex = 0;
    host.append(this.renderer.domElement);
    this.scene.background = new THREE.Color('#9ac7cc'); this.scene.fog = new THREE.FogExp2('#9ac7cc', .00062);
    this.camera.position.set(430, 475, 620);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement); this.controls.target.set(35, 0, 30); this.controls.enableDamping = true; this.controls.dampingFactor = .08; this.controls.maxPolarAngle = Math.PI * .46; this.controls.minPolarAngle = .16; this.controls.minDistance = 40; this.controls.maxDistance = 1250;
    this.controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.ROTATE, RIGHT: THREE.MOUSE.PAN }; this.controls.panSpeed = .8; this.controls.zoomSpeed = .8;
    this.controls.addEventListener('change', this.invalidate);
    this.scene.add(this.ambient, this.sun, this.world); this.sun.position.set(-250, 430, 190); this.sun.castShadow = true; this.sun.shadow.mapSize.set(1024, 1024); this.sun.shadow.camera.left = -300; this.sun.shadow.camera.right = 300; this.sun.shadow.camera.top = 350; this.sun.shadow.camera.bottom = -350; this.sun.shadow.camera.far = 1200; this.sun.shadow.normalBias = .5; this.sun.shadow.bias = -.0003;
    const terrain = createTerrain(); this.land = terrain.land;
    this.world.add(this.ocean.ocean, terrain.group, this.buildings, this.roadMeshes, this.zones, this.traffic, this.labels, this.clouds, this.decoration, this.ghost, this.roadGhost, this.selection);
    this.selection.rotation.x = -Math.PI / 2; this.selection.visible = false; this.selection.renderOrder = 5;
    for (const l of LANDMARKS) { const s = label(l.name, l.kind === 'village' ? 'ISLAND COMMUNITY' : l.kind.toUpperCase()); s.position.set(l.x, Math.max(2, heightAt(l)) + 15, l.z); this.labels.add(s); }
    // Original lighthouse silhouette; the OSM hill point anchors its approximate location.
    const light = LANDMARKS[1], lighthouse = new THREE.Group(), white = material('#ede7cf');
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.6, 11, 12), white); tower.position.y = 5.5; lighthouse.add(tower); block(lighthouse, [3, .4, 3], [0, 11, 0], material('#415556')); block(lighthouse, [1.8, 1.8, 1.8], [0, 12, 0], material('#d5e0be', .2));
    lighthouse.position.set(light.x, heightAt(light), light.z); this.decoration.add(lighthouse);
    const rainPositions = new Float32Array(1400 * 3);
    for (let i = 0; i < rainPositions.length; i += 3) { rainPositions[i] = (Math.random() - .5) * 700; rainPositions[i + 1] = Math.random() * 150 + 30; rainPositions[i + 2] = (Math.random() - .5) * 700; }
    const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    this.rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: '#cbdfde', size: .45, transparent: true, opacity: .5 })); this.rain.visible = false; this.world.add(this.rain);
    this.createClouds();
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.pointerDown); canvas.addEventListener('pointermove', this.pointerMove); canvas.addEventListener('pointerup', this.pointerUp); canvas.addEventListener('pointerleave', this.pointerLeave); canvas.addEventListener('contextmenu', this.contextMenu);
    canvas.addEventListener('webglcontextlost', this.contextLost);
    window.addEventListener('keydown', this.keyDown); window.addEventListener('keyup', this.keyUp); window.addEventListener('blur', this.blur);
    this.observer = new ResizeObserver(this.resize); this.observer.observe(host); this.resize();
    if (import.meta.env.DEV) Object.assign(window, { __PHU_QUY_VIEW__: {
      project: (p: Point, elevation = 1) => {
        const point = new THREE.Vector3(p.x, Math.max(0, heightAt(p)) + elevation, p.z).project(this.camera);
        const bounds = canvas.getBoundingClientRect(); return { x: bounds.left + (point.x + 1) / 2 * bounds.width, y: bounds.top + (1 - point.y) / 2 * bounds.height };
      },
      inspect: () => ({ assets: Object.keys(this.models).length, calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, geometries: this.renderer.info.memory.geometries, textures: this.renderer.info.memory.textures, renderFrames: this.renderer.info.render.frame, pendingRender: this.renderNeeded, keys: [...this.keys], camera: this.camera.position.toArray(), target: this.controls.target.toArray() }),
    } });
    this.applySettings();
    this.unsubscribe = useGame.subscribe((state, previous) => {
      this.invalidate();
      if (state.game.buildings !== previous.game.buildings && this.models.houseA) { this.syncBuildings(state.game); this.syncTraffic(state.game); }
      if (state.game.roads !== previous.game.roads && this.models.houseA) { this.syncRoads(state.game); this.syncTraffic(state.game); }
      if (state.game.zones !== previous.game.zones || state.layer !== previous.layer) { this.syncZones(state.game); if (state.layer !== previous.layer && this.models.houseA) this.syncBuildings(state.game); }
      if (state.game.settings !== previous.game.settings) this.applySettings();
      if (state.game.day !== previous.game.day && this.models.houseA) this.syncTraffic(state.game);
      if (state.selectedId !== previous.selectedId) this.syncSelection();
      if (state.tool !== previous.tool || state.rotation !== previous.rotation || state.roadStart !== previous.roadStart || state.curved !== previous.curved) this.updateGhost();
      if (state.overviewToken !== previous.overviewToken) this.resetCamera();
    });
    void loadModels().then(models => {
      if (this.disposed) return;
      this.models = models;
      Object.values(models).forEach(model => model.traverse(node => { if (node instanceof THREE.Mesh) { this.sharedGeometry.add(node.geometry); (Array.isArray(node.material) ? node.material : [node.material]).forEach(mat => this.sharedMaterials.add(mat)); } }));
      const game = useGame.getState().game;
      this.syncBuildings(game); this.syncRoads(game); this.syncZones(game); this.syncTraffic(game); this.createVegetation(); this.createBoats();
      this.invalidate();
      useGame.getState().notify('Your island is ready. Select an address to inspect it.');
    }).catch(error => { console.error('Model loading failed', error); useGame.getState().notify('Some 3D assets could not load. Reload when the connection is available.'); });
    this.frame = requestAnimationFrame(this.animate);
  }
  resize = () => {
    const width = this.host.clientWidth, height = this.host.clientHeight;
    if (!width || !height) return;
    this.renderer.setSize(width, height); this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
    this.invalidate();
  };
  invalidate = () => { this.renderNeeded = true; };
  applySettings() {
    const s = useGame.getState().game.settings;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, s.quality === 'low' ? .65 : s.quality === 'high' ? 2 : 1.5)); this.renderer.shadowMap.enabled = s.shadows && s.quality !== 'low'; this.labels.visible = s.quality !== 'low'; this.clouds.visible = s.quality !== 'low';
    for (const batch of this.vegetation) batch.mesh.count = Math.ceil(batch.points.length * (s.quality === 'low' ? .35 : s.quality === 'medium' ? .75 : 1));
    if (this.models.car) this.syncTraffic(useGame.getState().game);
    this.resize();
  }
  syncBuildings(game: Game) {
    // Loaded glTF geometry/materials are shared and remain cached across city updates.
    this.buildings.traverse(o => { if (o instanceof THREE.Mesh) { if (!this.sharedGeometry.has(o.geometry)) o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (!this.sharedMaterials.has(m)) m.dispose(); }); } });
    this.buildings.clear();
    const state = useGame.getState();
    for (const b of game.buildings) {
      const model = buildingModel(b.kind, b.id, this.models); model.position.set(b.x, heightAt(b) + .18, b.z); model.rotation.y = b.rotation; model.userData.buildingId = b.id;
      model.traverse(o => { o.userData.buildingId = b.id; }); this.buildings.add(model);
      if (state.layer !== 'natural') {
        const connected = game.metrics.connected.includes(b.id);
        const color = state.layer === 'services' ? connected ? '#83d6b4' : '#ed8e7b' : state.layer === 'traffic' ? game.metrics.congestion > 60 ? '#df8e64' : '#7faeb9' : (CATALOG[b.kind].pollution || 0) > 0 ? '#d89973' : '#83b887';
        const layer = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ color, opacity: .6, transparent: true, side: THREE.DoubleSide, depthTest: false })); layer.rotation.x = -Math.PI / 2; layer.position.set(b.x, heightAt(b) + .22, b.z); layer.userData.layer = true; this.buildings.add(layer);
      }
    }
    this.syncSelection();
    this.clearVegetation(game);
  }
  syncRoads(game: Game) { disposeGroup(this.roadMeshes); this.roadMeshes.add(roadsGeometry(game.roads)); this.clearVegetation(game); }
  syncZones(game: Game) {
    disposeGroup(this.zones);
    for (const kind of Object.keys(ZONE_COLORS) as (keyof typeof ZONE_COLORS)[]) {
      const zones = game.zones.filter(z => z.kind === kind); if (!zones.length) continue;
      const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(CELL * .88, CELL * .88), new THREE.MeshBasicMaterial({ color: ZONE_COLORS[kind], opacity: .45, transparent: true, side: THREE.DoubleSide }), zones.length);
      const dummy = new THREE.Object3D(); dummy.rotation.x = -Math.PI / 2;
      zones.forEach((z, i) => { dummy.position.set(z.x, heightAt(z) + .3, z.z); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); }); this.zones.add(mesh);
    }
  }
  syncSelection() {
    const s = useGame.getState(), b = s.game.buildings.find(b => b.id === s.selectedId);
    this.selection.visible = !!b; if (b) this.selection.position.set(b.x, heightAt(b) + .4, b.z);
  }
  syncTraffic(game: Game) {
    this.traffic.clear(); this.cars = [];
    const network = makeNetwork(game.roads, game.buildings), nodes = [...network.connected];
    if (nodes.length < 3) return;
    const count = Math.min(game.settings.quality === 'low' ? 10 : 22, Math.floor(game.metrics.employed / 5) + 3);
    for (let i = 0; i < count; i++) {
      const path = routeBetween(network, nodes[(i * 17) % nodes.length], nodes[(i * 31 + 45) % nodes.length]);
      if (path.length < 2) continue;
      const prototype = [this.models.car, this.models.sedan, this.models.taxi, this.models.police][i % 4];
      const mesh = normalized(prototype, 1.55, 1.3); this.traffic.add(mesh); this.cars.push({ mesh, path, index: 0, t: i * .13 % 1, speed: 3.3 + i % 3 });
    }
  }
  createVegetation() {
    const state = useGame.getState(), positions: Point[] = [];
    let seed = 1403; const rand = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 3000 && positions.length < 700; i++) {
      const p = { x: -190 + rand() * 510, z: -320 + rand() * 640 };
      if (suitableVegetation(p.x, p.z) && !state.game.roads.some(r => r.points.some(n => distance(n, p) < 7)) && !state.game.buildings.some(b => distance(b, p) < 9)) positions.push(p);
    }
    const palm = palmGeometry(), trunks = new THREE.InstancedMesh(palm.trunk, material('#9d8a66'), positions.length), leaves = new THREE.InstancedMesh(palm.leaves, new THREE.MeshStandardMaterial({ color: '#537e4c', roughness: .94, side: THREE.DoubleSide }), positions.length);
    const dummy = new THREE.Object3D();
    positions.forEach((p, i) => { dummy.position.set(p.x, heightAt(p), p.z); dummy.rotation.set(0, rand() * Math.PI * 2, 0); dummy.scale.setScalar(.65 + rand() * .65); dummy.updateMatrix(); trunks.setMatrixAt(i, dummy.matrix); leaves.setMatrixAt(i, dummy.matrix); });
    trunks.castShadow = true; leaves.castShadow = true; this.decoration.add(trunks, leaves); this.registerVegetation(trunks, positions); this.registerVegetation(leaves, positions);
    // Instanced original coastal rocks, independent of gameplay geometry.
    const stones = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), material('#8b998d'), 160);
    for (let i = 0; i < 160; i++) { const p = positions[(i * 3) % positions.length]; if (!p) break; dummy.position.set(p.x + 3, heightAt(p) + .15, p.z + 2); dummy.scale.set(.8 + rand() * 2, .5 + rand(), .7 + rand() * 2); dummy.rotation.set(rand(), rand() * 6, rand()); dummy.updateMatrix(); stones.setMatrixAt(i, dummy.matrix); } this.decoration.add(stones);
    // A downloaded CC0 tree cluster instanced into the rural interior.
    const clusters = [this.models.trees, this.models.treesShort, this.models.bush];
    clusters.forEach((prototype, clusterIndex) => {
    const tree = normalized(prototype, clusterIndex === 2 ? 2.8 : 6, 8); tree.updateMatrixWorld(true);
    tree.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      const geometry = node.geometry.clone().applyMatrix4(node.matrixWorld), mesh = new THREE.InstancedMesh(geometry, node.material, 60); mesh.castShadow = true;
      const clusterPoints: Point[] = [];
      for (let i = 0; i < 60; i++) { const p = positions[(i * 5 + 7 + clusterIndex * 3) % positions.length]; if (!p) break; clusterPoints.push(p); dummy.position.set(p.x, heightAt(p) - .15, p.z); dummy.rotation.set(0, i * 1.4, 0); dummy.scale.setScalar(.6 + (i % 7) * .09); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); }
      this.decoration.add(mesh); this.registerVegetation(mesh, clusterPoints);
    });
    });
    const lightPositions = state.game.roads.flatMap(r => r.points).filter((_, i) => i % 12 === 0).slice(0, 60);
    const lights = normalized(this.models.streetlight, 1.4, 5); lights.updateMatrixWorld(true);
    lights.traverse(node => { if (node instanceof THREE.Mesh) { const mesh = new THREE.InstancedMesh(node.geometry.clone().applyMatrix4(node.matrixWorld), node.material, lightPositions.length); lightPositions.forEach((p,i) => { dummy.position.set(p.x + 2.2,heightAt(p),p.z); dummy.scale.setScalar(1); dummy.rotation.set(0,0,0); dummy.updateMatrix(); mesh.setMatrixAt(i,dummy.matrix); }); this.decoration.add(mesh); } });
    this.clearVegetation(state.game);
  }
  registerVegetation(mesh: THREE.InstancedMesh, points: Point[]) {
    const matrices = points.map((_, i) => { const matrix = new THREE.Matrix4(); mesh.getMatrixAt(i, matrix); return matrix; }); this.vegetation.push({ mesh, points, matrices });
    const quality = useGame.getState().game.settings.quality;
    mesh.count = Math.ceil(points.length * (quality === 'low' ? .35 : quality === 'medium' ? .75 : 1));
  }
  clearVegetation(game: Game) {
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0), roads = game.roads.flatMap(r => r.points);
    for (const batch of this.vegetation) {
      batch.points.forEach((p, i) => { const blocked = game.buildings.some(b => distance(b, p) < 7) || roads.some(n => distance(n, p) < 3); batch.mesh.setMatrixAt(i, blocked ? hidden : batch.matrices[i]); }); batch.mesh.instanceMatrix.needsUpdate = true;
    }
  }
  createBoats() {
    const prototype = fishingBoat();
    for (let i = 0; i < 6; i++) { const boat = prototype.clone(true); boat.scale.setScalar(i === 0 ? 1.1 : .65); this.decoration.add(boat); this.boats.push(boat); }
  }
  createClouds() {
    const puff = new THREE.IcosahedronGeometry(1, 1), parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 9; i++) { const p = puff.clone(); p.scale(12 + i % 3 * 3, 2.8 + i % 3, 8 + i % 4); p.translate(i * 7, Math.sin(i) * 2, Math.cos(i * 2) * 8); parts.push(p); }
    const geo = mergeGeometries(parts); parts.forEach(g => g.dispose()); puff.dispose();
    for (let i = 0; i < 7; i++) { const cloud = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#f4f2e6', transparent: true, opacity: .35, depthWrite: false })); cloud.position.set((i % 3 - 1) * 260, 90 + i % 3 * 12, (Math.floor(i / 3) - 1) * 240); cloud.scale.setScalar(.8 + i % 3 * .3); this.clouds.add(cloud); }
  }
  updatePointer(event: PointerEvent): Point | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.land, false)[0];
    if (hit) return snap({ x: hit.point.x, z: hit.point.z });
    if (this.raycaster.ray.intersectPlane(this.ground, this.hit)) return snap({ x: this.hit.x, z: this.hit.z });
    return null;
  }
  pointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || useGame.getState().screen !== 'playing') return;
    this.down = { x: e.clientX, y: e.clientY }; this.painting = useGame.getState().tool === 'zone'; this.lastPaint = '';
    if (this.painting) { this.controls.enabled = false; const p = this.updatePointer(e); if (p) { useGame.getState().place(p); this.lastPaint = key(p); } }
  };
  pointerMove = (e: PointerEvent) => {
    this.hover = this.updatePointer(e); this.updateGhost();
    if (this.painting && this.hover && key(this.hover) !== this.lastPaint) { useGame.getState().place(this.hover); this.lastPaint = key(this.hover); }
  };
  pointerUp = (e: PointerEvent) => {
    this.controls.enabled = true; const wasPainting = this.painting; this.painting = false;
    if (!this.down || e.button !== 0) return;
    const moved = Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y); this.down = null;
    if (moved > 5 || wasPainting) return;
    const s = useGame.getState(); if (s.screen !== 'playing') return;
    const p = this.updatePointer(e); if (!p) return;
    if (s.tool === 'inspect') {
      const intersections = this.raycaster.intersectObjects(this.buildings.children, true);
      const id = intersections.find(i => i.object.userData.buildingId)?.object.userData.buildingId as string | undefined;
      s.select(id || s.game.buildings.find(b => distance(b, p) < CELL * .7)?.id || null);
    } else if (s.tool === 'road') {
      if (s.roadStart) s.buildRoad(roadPath(s.roadStart, p, s.curved)); else { useGame.setState({ roadStart: p }); s.notify('Choose the other end of the road. Escape cancels.'); }
    } else s.place(p);
  };
  pointerLeave = () => { this.hover = null; this.ghost.visible = false; this.roadGhost.visible = false; this.painting = false; this.controls.enabled = true; this.down = null; this.updateHint(''); };
  contextMenu = (e: MouseEvent) => e.preventDefault();
  contextLost = (e: Event) => { e.preventDefault(); useGame.getState().setSpeed(0); useGame.getState().notify('3D context lost. Save your island from the menu, then reload.'); };
  updateGhost() {
    this.invalidate();
    const s = useGame.getState(), tool = s.tool;
    this.ghost.visible = !!this.hover && s.screen === 'playing' && tool !== 'inspect' && tool !== 'road'; this.roadGhost.visible = !!this.hover && !!s.roadStart && tool === 'road';
    if (!this.hover || s.screen !== 'playing') return;
    if (tool === 'road' && s.roadStart) { disposeGroup(this.roadGhost); const mesh = new THREE.Mesh(ribbon(roadPath(s.roadStart, this.hover, s.curved), 4.5, .7, s.roadKind === 'bridge'), new THREE.MeshBasicMaterial({ color: '#a5e7c4', transparent: true, opacity: .8, side: THREE.DoubleSide, depthTest: false })); this.roadGhost.add(mesh); this.updateHint('Click to complete road · Escape to cancel'); return; }
    if (tool === 'inspect' || tool === 'road' || tool === 'move') { this.updateHint(tool === 'road' ? 'Click to start a road' : ''); return; }
    const error = tool === 'bulldoze' || tool === 'zone' ? !inside(this.hover) ? 'Choose a site on land' : null : placementError(s.game, tool as BuildingKind, this.hover, s.movingId || undefined);
    const kind = `${tool}:${!!error}`;
    if (kind !== this.ghostKind) {
      disposeGroup(this.ghost); this.ghostKind = kind;
      const box = new THREE.Mesh(new THREE.BoxGeometry(8.8, tool === 'zone' || tool === 'bulldoze' ? .25 : 5, 8.8), new THREE.MeshBasicMaterial({ color: error ? '#e98979' : tool === 'bulldoze' ? '#eeae80' : '#95e4b9', wireframe: tool !== 'zone', transparent: true, opacity: .8, depthTest: false })); box.position.y = tool === 'zone' || tool === 'bulldoze' ? .3 : 2.5; this.ghost.add(box);
    }
    this.ghost.position.set(this.hover.x, Math.max(0, heightAt(this.hover)) + .3, this.hover.z); this.ghost.rotation.y = s.rotation;
    this.updateHint(error || (tool === 'zone' ? 'Drag to zone · 60 per cell · development follows demand' : tool === 'bulldoze' ? 'Click to clear an address or road cell' : 'Click to build · R to rotate · Escape to cancel'));
  }
  keyDown = (e: KeyboardEvent) => {
    const s = useGame.getState();
    if (e.key === 'Escape') {
      e.preventDefault();
      if (s.screen === 'menu') return;
      if (s.screen === 'pause') s.setScreen('playing');
      else if (s.screen !== 'playing') s.setScreen(s.previousScreen === 'menu' ? 'menu' : 'pause');
      else if (s.tool !== 'inspect' || s.panel || s.selectedId) s.cancel();
      else s.setScreen('pause');
      return;
    }
    if ((e.target as HTMLElement).matches('input,textarea,select') || ((e.target as HTMLElement).matches('button') && [' ', 'Enter'].includes(e.key))) return;
    if (s.screen !== 'playing') return;
    this.keys.add(e.key.toLowerCase());
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
    if (e.key.toLowerCase() === 'r') s.rotate();
    if (e.key === ' ') s.setSpeed(s.speed ? 0 : 1);
    if (e.key.toLowerCase() === 'h' || e.key === 'Home') this.resetCamera();
    if (e.key === 'Delete') s.setTool('bulldoze');
  };
  keyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());
  blur = () => { this.keys.clear(); this.painting = false; this.controls.enabled = true; };
  resetCamera() { this.camera.position.set(430, 475, 620); this.controls.target.set(35, 0, 30); this.controls.update(); }
  animate = (now: number) => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.animate);
    const dt = Math.min((now - (this.lastFrame || now)) / 1000, .05); this.lastFrame = now;
    if (document.hidden) return;
    const s = useGame.getState(), game = s.game, active = s.screen === 'playing', motion = !game.settings.reducedMotion;
    if (active && this.keys.size) {
      const forward = new THREE.Vector3(); this.camera.getWorldDirection(forward); forward.y = 0; forward.normalize(); const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));
      const delta = new THREE.Vector3(), speed = this.camera.position.distanceTo(this.controls.target) * dt * .55;
      if (this.keys.has('w') || this.keys.has('arrowup')) delta.addScaledVector(forward, speed);
      if (this.keys.has('s') || this.keys.has('arrowdown')) delta.addScaledVector(forward, -speed);
      if (this.keys.has('a') || this.keys.has('arrowleft')) delta.addScaledVector(right, -speed);
      if (this.keys.has('d') || this.keys.has('arrowright')) delta.addScaledVector(right, speed);
      this.camera.position.add(delta); this.controls.target.add(delta);
    }
    this.controls.target.x = THREE.MathUtils.clamp(this.controls.target.x, -550, 550); this.controls.target.z = THREE.MathUtils.clamp(this.controls.target.z, -550, 550); this.controls.update();
    const day = .22 + .78 * Math.max(0, Math.sin((game.hour - 5) / 24 * Math.PI * 2));
    this.sun.intensity += ((game.weather === 'storm' ? 1 : 2.6) * day - this.sun.intensity) * (motion ? .015 : 1); this.ambient.intensity = .8 + day * 1.3;
    this.ocean.uniforms.daylight.value += (day - this.ocean.uniforms.daylight.value) * (motion ? .01 : 1); this.ocean.uniforms.storm.value = game.weather === 'storm' ? 1 : 0; if (motion) this.ocean.uniforms.time.value = now / 1000;
    this.rain.visible = game.weather === 'rain' || game.weather === 'storm';
    if (this.rain.visible && motion) { const pos = this.rain.geometry.getAttribute('position'); for (let i = 0; i < pos.count; i++) { let y = pos.getY(i) - dt * 90; if (y < 0) y = 160; pos.setY(i, y); } pos.needsUpdate = true; }
    if (motion && active && s.speed) {
      for (const car of this.cars) {
        const a = car.path[car.index], b = car.path[car.index + 1]; if (!a || !b) continue;
        car.t += dt * car.speed * Math.sqrt(s.speed) * (1 - game.metrics.congestion / 140) / Math.max(.1, distance(a, b));
        if (car.t > 1) { car.t %= 1; car.index++; if (car.index >= car.path.length - 1) { car.path.reverse(); car.index = 0; } }
        const aa = car.path[car.index], bb = car.path[car.index + 1], x = THREE.MathUtils.lerp(aa.x, bb.x, car.t), z = THREE.MathUtils.lerp(aa.z, bb.z, car.t);
        car.mesh.position.set(x + .55, heightAt({ x, z }) + .38, z); car.mesh.rotation.y = Math.atan2(bb.x - aa.x, bb.z - aa.z);
      }
      this.buildings.traverse(o => { if (o.name === 'rotor') o.rotation.z += dt * (game.weather === 'clear' ? 1.1 : 2); });
    }
    this.boats.forEach((boat, i) => {
      const angle = (motion ? now / 70000 : 0) + i * 1.07, x = -155 - Math.cos(angle) * (70 + i * 15), z = 230 + Math.sin(angle) * 50;
      boat.visible = !inside({ x, z }) && game.weather !== 'storm'; boat.position.set(x, -.1 + (motion ? Math.sin(now / 900 + i) * .15 : 0), z); boat.rotation.y = -angle; boat.rotation.z = motion ? Math.sin(now / 1200 + i) * .035 : 0;
    });
    if (motion) this.clouds.children.forEach((c, i) => { c.position.x += dt * (1 + i * .12); if (c.position.x > 700) c.position.x = -700; });
    this.labels.children.forEach(l => { (l as THREE.Sprite).material.opacity = this.camera.position.y < 120 ? .15 : .88; });
    // Reduced motion also avoids continuously repainting an unchanged world.
    // Normal rendering is paced so software/integrated GPUs do not queue frames
    // indefinitely while the browser is trying to composite the interface.
    if ((motion || this.renderNeeded) && now - this.lastRender >= 1000 / (game.settings.quality === 'high' ? 60 : 30)) {
      this.renderer.render(this.scene, this.camera); this.frames++; this.renderNeeded = false; this.lastRender = now;
    }
    if (now - this.lastStats > 1500) { this.updateStats({ fps: Math.round(this.frames / Math.max(.1, (now - this.lastStats) / 1000)), calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, assets: Object.keys(this.models).length, onDemand: !motion }); this.frames = 0; this.lastStats = now; }
  };
  dispose() {
    this.disposed = true; cancelAnimationFrame(this.frame); this.observer.disconnect(); this.unsubscribe(); this.controls.removeEventListener('change', this.invalidate); this.controls.dispose();
    if (import.meta.env.DEV) Reflect.deleteProperty(window, '__PHU_QUY_VIEW__');
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.pointerDown); canvas.removeEventListener('pointermove', this.pointerMove); canvas.removeEventListener('pointerup', this.pointerUp); canvas.removeEventListener('pointerleave', this.pointerLeave); canvas.removeEventListener('contextmenu', this.contextMenu); canvas.removeEventListener('webglcontextlost', this.contextLost);
    window.removeEventListener('keydown', this.keyDown); window.removeEventListener('keyup', this.keyUp); window.removeEventListener('blur', this.blur);
    disposeGroup(this.world); this.renderer.dispose(); canvas.remove();
  }
}

export default function WorldView() {
  const host = useRef<HTMLDivElement>(null), [error, setError] = useState(''), [hint, setHint] = useState(''), [diagnostics, setDiagnostics] = useState<Diagnostics>({ fps: 0, calls: 0, triangles: 0, assets: 0, onDemand: false });
  const screen = useGame(s => s.screen);
  useEffect(() => {
    let world: IslandRenderer | undefined;
    try { if (host.current) world = new IslandRenderer(host.current, setDiagnostics, setHint); }
    catch (error) { setError(error instanceof Error ? error.message : 'WebGL2 is unavailable.'); }
    return () => world?.dispose();
  }, []);
  return <>
    <div className="world" ref={host} data-testid="world" />
    {error && <div className="graphics-error" role="alert"><h2>We could not start the 3D world.</h2><p>Enable WebGL2 or hardware acceleration in a desktop browser, then reload.</p><small>{error}</small><button onClick={() => location.reload()}>Try again</button></div>}
    {screen === 'playing' && <><div className="world-hint" aria-live="polite">{hint}</div><div className="diagnostics" title="Measured render rate, draw calls, triangles and loaded model prototypes. Reduced motion renders on demand."><span className={!diagnostics.onDemand && diagnostics.fps < 25 ? 'amber' : ''}>{diagnostics.onDemand ? 'On demand' : `${diagnostics.fps} FPS`}</span><span>{diagnostics.calls} draws</span><span>{Math.round(diagnostics.triangles / 1000)}k tris</span><span>{diagnostics.assets} models</span></div></>}
  </>;
}
