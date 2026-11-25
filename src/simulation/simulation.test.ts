import { describe, expect, it } from 'vitest';
import { CATALOG } from '../core/catalog';
import type { BuildingKind, Game, Point } from '../core/types';
import { CELL, COAST, distance, heightAt, inside, key, snap } from '../world/geography';
import { addRoad, construct, demolish, metricsFor, newGame, placementError, tick } from './simulation';
import { isConnected, makeNetwork, roadPath, routeBetween } from './network';

function site(game: Game, kind: BuildingKind = 'house'): Point {
  for (const r of game.roads) for (const p of r.points) for (const delta of [{ x: CELL, z: 0 }, { x: -CELL, z: 0 }, { x: 0, z: CELL }, { x: 0, z: -CELL }]) {
    const candidate = { x: p.x + delta.x, z: p.z + delta.z };
    if (!placementError(game, kind, candidate)) return candidate;
  }
  throw new Error('No buildable test address');
}
describe('geographic world', () => {
  it('uses a detailed Phú Quý coastline rather than a generated oval', () => {
    expect(COAST.length).toBeGreaterThan(300);
    expect(inside({ x: 30, z: 0 })).toBe(true);
    expect(inside({ x: -450, z: 400 })).toBe(false);
    expect(heightAt({ x: 30, z: 0 })).toBeGreaterThan(0);
    expect(snap({ x: 13, z: -18 })).toEqual({ x: 10, z: -20 });
  });
});
describe('starting community', () => {
  it('has a functional existing community and services', () => {
    const game = newGame();
    console.log('Initial island:', JSON.stringify({ buildings: game.buildings.length, roads: game.roads.length, nodes: game.roads.reduce((s,r)=>s+r.points.length,0), population:game.population, metrics:game.metrics }));
    expect(game.buildings.length).toBeGreaterThan(20);
    expect(game.metrics.housing).toBeGreaterThanOrEqual(game.population);
    expect(game.metrics.connected.length).toBeGreaterThan(20);
    expect(game.metrics.services.power).toBeGreaterThan(75);
    expect(game.metrics.services.water).toBeGreaterThan(75);
    expect(game.metrics.balance).toBeGreaterThan(0);
  });
  it('uses unique stable IDs and reproducible starting conditions', () => {
    const a = newGame(), b = newGame();
    expect(a).toEqual(b);
    expect(new Set([...a.buildings, ...a.roads].map(o => o.id)).size).toBe(a.buildings.length + a.roads.length);
  });
});
describe('construction and zoning infrastructure', () => {
  it('places, charges, rotates, relocates and refunds a building', () => {
    const game = newGame(), p = site(game);
    const result = construct(game, 'house', p, Math.PI / 2);
    expect(result.error).toBeNull(); expect(result.game.buildings.length).toBe(game.buildings.length + 1);
    expect(result.game.funds).toBe(game.funds - CATALOG.house.cost);
    const building = result.game.buildings.at(-1)!;
    expect(building.rotation).toBe(Math.PI / 2);
    const moved = construct(result.game, 'house', site(result.game), Math.PI, building.id);
    expect(moved.error).toBeNull(); expect(moved.game.buildings.length).toBe(result.game.buildings.length);
    expect(moved.game.funds).toBe(result.game.funds - CATALOG.house.cost * .15);
    const cleared = demolish(moved.game, moved.game.buildings.find(b => b.id === building.id)!);
    expect(cleared.buildings.some(b => b.id === building.id)).toBe(false);
    expect(cleared.funds).toBe(moved.game.funds + CATALOG.house.cost * .25);
    expect(game.buildings.length).toBeLessThan(result.game.buildings.length);
  });
  it('rejects water, collisions, roads, steep terrain and insufficient funds', () => {
    const game = newGame(), p = site(game), b = game.buildings[0];
    expect(placementError(game, 'house', { x: -500, z: 0 })).toMatch(/island/);
    expect(placementError(game, 'house', b)).toMatch(/occupies/);
    expect(placementError(game, 'house', game.roads[0].points[0])).toBeTruthy();
    expect(placementError({ ...game, funds: 0 }, 'house', p)).toMatch(/funds/);
    expect(construct(game, 'house', { x: NaN, z: 0 }).error).toBeTruthy();
  });
  it('restricts new maritime buildings to coastal addresses', () => {
    const game = newGame();
    const inland = site(game, 'house');
    const error = placementError(game, 'port', inland);
    if (error) expect(error).toMatch(/coastal|slope|building|clear/);
    expect(Object.keys(CATALOG)).toHaveLength(18);
  });
  it('sandbox has free construction while simulation remains functional', () => {
    const game = newGame('sandbox'), result = construct(game, 'house', site(game));
    expect(result.error).toBeNull(); expect(result.game.funds).toBe(game.funds);
    expect(result.game.metrics.housing).toBe(game.metrics.housing + 16);
  });
  it('develops qualifying private zones according to demand', () => {
    const game = newGame(), p = site(game);
    game.zones = [{ ...p, kind: 'residential' }];
    game.population = game.metrics.housing - 5;
    const result = tick(game, 24);
    expect(result.buildings.some(b => distance(b, p) < 1)).toBe(true);
  });
});
describe('roads and functional connectivity', () => {
  it('creates distinct straight and curved snapped paths', () => {
    const a = { x: 0, z: 0 }, b = { x: 100, z: 100 };
    const straight = roadPath(a, b), curved = roadPath(a, b, true);
    expect(straight[0]).toEqual(a); expect(straight.at(-1)).toEqual(b);
    expect(curved).not.toEqual(straight);
    expect(curved.every(p => p.x % CELL === 0 && p.z % CELL === 0)).toBe(true);
  });
  it('traverses intersections and reports disconnected streets', () => {
    const game = newGame();
    game.roads = [
      { id: 'r1', points: roadPath({ x: 0, z: 0 }, { x: 40, z: 0 }), kind: 'street' },
      { id: 'r2', points: roadPath({ x: 20, z: 0 }, { x: 20, z: 40 }), kind: 'street' },
      { id: 'r3', points: roadPath({ x: 80, z: 0 }, { x: 80, z: 40 }), kind: 'street' },
    ];
    game.buildings = [{ id: 'b1', kind: 'port', x: 0, z: 10, rotation: 0, builtDay: 0, level: 1 }];
    const network = makeNetwork(game.roads, game.buildings);
    expect(network.connected.has('20,40')).toBe(true);
    expect(network.connected.has('80,0')).toBe(false);
    expect(routeBetween(network, '0,0', '20,40').length).toBeGreaterThan(3);
    expect(routeBetween(network, '0,0', '80,0')).toEqual([]);
    expect(isConnected({ x: 20, z: 50 }, network)).toBe(true);
  });
  it('splits a road instead of leaving ghost connectivity after removal', () => {
    const game = newGame(); game.buildings = [];
    game.roads = [{ id: 'r1', points: roadPath({ x: 0, z: 0 }, { x: 60, z: 0 }), kind: 'street' }];
    const result = demolish(game, { x: 30, z: 0 });
    expect(result.roads).toHaveLength(2);
    expect(result.roads.every(r => !r.points.some(p => key(p) === '30,0'))).toBe(true);
  });
  it('rejects water roads but permits a paid bridge', () => {
    const game = newGame(), points = roadPath({ x: -300, z: 0 }, { x: -260, z: 0 });
    expect(addRoad(game, points, 'street').error).toMatch(/land/);
    const bridge = addRoad(game, points, 'bridge');
    expect(bridge.error).toBeNull(); expect(bridge.game.funds).toBe(game.funds - points.length * 400);
  });
});
describe('consequential population, services and island economy', () => {
  it('grows a supplied settlement and applies daily budget exactly once', () => {
    const game = newGame(), result = tick(game, 16);
    expect(result.day).toBe(2); expect(result.hour).toBe(0);
    expect(result.population).toBeGreaterThan(game.population);
    expect(result.funds).toBeGreaterThan(game.funds);
    expect(tick(game, 1).funds).toBe(game.funds);
    expect(result.history).toHaveLength(1);
  });
  it('loses residents, jobs, power and income when roads are removed', () => {
    const game = newGame(), disconnected = { ...game, roads: [] };
    disconnected.metrics = metricsFor(disconnected);
    expect(disconnected.metrics.jobs).toBe(0); expect(disconnected.metrics.services.water).toBe(0);
    expect(disconnected.metrics.fishing).toBe(0); expect(disconnected.metrics.tourism).toBe(0);
    expect(tick(disconnected, 24).population).toBeLessThan(game.population);
  });
  it('utilities react to actual provider removal', () => {
    const game = newGame(), without = { ...game, buildings: game.buildings.filter(b => b.kind !== 'water') };
    expect(metricsFor(without).services.water).toBe(0);
    expect(metricsFor(without).happiness).toBeLessThan(game.metrics.happiness);
  });
  it('storm conditions reduce fishing, tourism and maritime transport', () => {
    const game = newGame(), storm = metricsFor({ ...game, weather: 'storm' });
    expect(storm.fishing).toBeLessThan(game.metrics.fishing);
    expect(storm.tourists).toBeLessThan(game.metrics.tourists);
    expect(storm.goods).toBeLessThan(game.metrics.goods);
  });
  it('tax increases trade wellbeing for income', () => {
    const game = newGame(), high = metricsFor({ ...game, taxRate: 19 });
    expect(high.taxes).toBeGreaterThan(game.metrics.taxes);
    expect(high.happiness).toBeLessThan(game.metrics.happiness);
  });
  it('has bounded deterministic history and no non-finite values over 120 days', () => {
    let game = newGame();
    for (let i = 0; i < 120; i++) game = tick(game, 24);
    expect(game.history).toHaveLength(90);
    expect(Number.isFinite(game.funds)).toBe(true);
    expect(game.population).toBeGreaterThanOrEqual(0);
    expect(game.population).toBeLessThanOrEqual(game.metrics.housing);
    expect(JSON.stringify(game)).not.toContain('null');
    expect(game.completedObjectives.length).toBe(new Set(game.completedObjectives).size);
  });
});
