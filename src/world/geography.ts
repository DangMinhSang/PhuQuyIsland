import data from './geography.json';
import type { Point } from '../core/types';

export const CELL = 10;
export const project = (lon: number, lat: number): Point => ({ x: (lon - 108.94) * 10942, z: -(lat - 10.525) * 11132 });
export const COASTLINES: Point[][] = data.coastline.map(ring => ring.map(([lon, lat]) => project(lon, lat)));
export const COAST = COASTLINES[0];
export const OSM_ROADS: Point[][] = data.roads.map(road => road.map(([lon, lat]) => project(lon, lat)));
export const snap = (p: Point): Point => ({ x: Math.round(p.x / CELL) * CELL || 0, z: Math.round(p.z / CELL) * CELL || 0 });
export const key = (p: Point) => `${p.x},${p.z}`;
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);

export function inside(p: Point, polygon = COAST): boolean {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.z > p.z) !== (b.z > p.z) && p.x < (b.x - a.x) * (p.z - a.z) / (b.z - a.z) + a.x) result = !result;
  }
  return result;
}
function segmentDistance(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz);
}
export function coastDistance(p: Point): number {
  let closest = Infinity;
  for (let i = 1; i < COAST.length; i++) closest = Math.min(closest, segmentDistance(p, COAST[i - 1], COAST[i]));
  return closest;
}
// Heights are artistic approximations. 1 render unit = approximately 10 horizontal metres.
const hill = (p: Point, x: number, z: number, r: number, h: number) => Math.exp(-((p.x - x) ** 2 + (p.z - z) ** 2) / r ** 2) * h;
export function heightAt(p: Point): number {
  if (!inside(p)) return -1.5;
  const shore = coastDistance(p);
  const plateau = Math.min(shore / 16, 1) * 2.7;
  return plateau + hill(p, -80, -190, 70, 20) + hill(p, 160, -215, 47, 24) + Math.sin(p.x * .037) * Math.sin(p.z * .029) * Math.min(shore / 25, 1) * .75;
}
export const LANDMARKS = [
  { name: 'Cao Cát', subtitle: 'Volcanic ridge · approximate position', ...project(108.956, 10.548), kind: 'mountain' },
  { name: 'Núi Cấm', subtitle: 'Lighthouse hill · approximate position', ...project(108.9331134, 10.5396026), kind: 'lighthouse' },
  { name: 'Triều Dương', subtitle: 'Southern beach · approximate position', ...project(108.942, 10.501), kind: 'beach' },
  { name: 'Ngũ Phụng', subtitle: 'Existing island community · game scale', ...project(108.942, 10.529), kind: 'village' },
  { name: 'Hòn Tranh', subtitle: 'Offshore island', ...project(108.965, 10.492), kind: 'island' },
];
