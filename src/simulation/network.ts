import type { Building, Point, Road } from '../core/types';
import { CELL, distance, key, snap } from '../world/geography';

export interface Network { nodes: Map<string, Point>; edges: Map<string, Set<string>>; connected: Set<string>; roadPoints: Point[] }
export function roadPath(start: Point, end: Point, curved = false): Point[] {
  const a = snap(start), b = snap(end), length = distance(a, b);
  if (length < CELL / 2) return [a];
  const points: Point[] = [], steps = Math.ceil(length / (CELL * .45));
  const dx = b.x - a.x, dz = b.z - a.z;
  const bend = curved ? .22 : 0;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, offset = Math.sin(t * Math.PI) * bend;
    const p = snap({ x: a.x + dx * t - dz * offset, z: a.z + dz * t + dx * offset });
    if (!points.length || key(points[points.length - 1]) !== key(p)) points.push(p);
  }
  return points;
}
export function makeNetwork(roads: Road[], buildings: Building[]): Network {
  const nodes = new Map<string, Point>(), edges = new Map<string, Set<string>>();
  for (const road of roads) {
    for (let i = 0; i < road.points.length; i++) {
      const p = road.points[i], k = key(p);
      nodes.set(k, p);
      if (!edges.has(k)) edges.set(k, new Set());
      if (i > 0) {
        const previous = key(road.points[i - 1]);
        edges.get(k)!.add(previous); edges.get(previous)!.add(k);
      }
    }
  }
  const roadPoints = [...nodes.values()];
  const connected = new Set<string>(), queue: string[] = [];
  // Each harbour is a genuine external gateway. No road means no connectivity.
  for (const port of buildings.filter(b => b.kind === 'port')) {
    let nearest: Point | undefined, d = Infinity;
    for (const p of roadPoints) if (distance(p, port) < d) { nearest = p; d = distance(p, port); }
    if (nearest && d <= CELL * 1.7) { queue.push(key(nearest)); connected.add(key(nearest)); }
  }
  for (let i = 0; i < queue.length; i++) for (const next of edges.get(queue[i]) || []) if (!connected.has(next)) { connected.add(next); queue.push(next); }
  return { nodes, edges, connected, roadPoints };
}
export function isConnected(b: Point, network: Network): boolean {
  return network.roadPoints.some(p => network.connected.has(key(p)) && distance(p, b) <= CELL * 1.7);
}
export function routeBetween(network: Network, start: string, end: string): Point[] {
  const queue = [start], previous = new Map<string, string | null>([[start, null]]);
  for (let i = 0; i < queue.length; i++) {
    if (queue[i] === end) break;
    for (const next of network.edges.get(queue[i]) || []) if (!previous.has(next)) { previous.set(next, queue[i]); queue.push(next); }
  }
  if (!previous.has(end)) return [];
  const result: Point[] = [];
  let node: string | null = end;
  while (node !== null) { result.unshift(network.nodes.get(node)!); node = previous.get(node) ?? null; }
  return result;
}
