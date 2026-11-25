import { CATALOG, clamp, DEFAULT_SETTINGS, ZONE_BUILDING } from '../core/catalog';
import type { Building, BuildingKind, Game, Metrics, Mode, Point, Road, Service, Weather } from '../core/types';
import { CELL, coastDistance, distance, heightAt, inside, key, OSM_ROADS, snap } from '../world/geography';
import { isConnected, makeNetwork, roadPath } from './network';

export const SERVICES: Service[] = ['power', 'water', 'health', 'education', 'waste', 'safety'];
export const WEATHER: Weather[] = ['clear', 'clear', 'cloudy', 'clear', 'rain', 'cloudy', 'clear', 'storm', 'clear', 'rain', 'clear', 'cloudy'];
export const emptyMetrics = (): Metrics => ({ housing: 0, jobs: 0, employed: 0, happiness: 50, pollution: 0, services: { power: 0, water: 0, health: 0, education: 0, waste: 0, safety: 0 }, revenue: 0, expenses: 0, balance: 0, taxes: 0, fishing: 0, tourism: 0, trade: 0, tourists: 0, connected: [], congestion: 0, passengers: 0, goods: 0, demand: { residential: 50, commercial: 50, industrial: 50, tourism: 50, public: 50 } });

export function metricsFor(game: Game): Metrics {
  const network = makeNetwork(game.roads, game.buildings);
  const connected = game.buildings.filter(b => isConnected(b, network));
  const houses = game.buildings.filter(b => (CATALOG[b.kind].housing || 0) > 0);
  const population = Math.max(1, game.population), m = emptyMetrics();
  m.connected = connected.map(b => b.id);
  m.housing = houses.reduce((n, b) => n + (CATALOG[b.kind].housing || 0), 0);
  m.jobs = connected.reduce((n, b) => n + (CATALOG[b.kind].jobs || 0), 0);
  m.employed = Math.min(Math.floor(game.population * .58), m.jobs);
  const rawPollution = game.buildings.reduce((n, b) => n + (CATALOG[b.kind].pollution || 0), 0);
  for (const service of SERVICES) {
    const providers = connected.filter(b => CATALOG[b.kind].service === service);
    const capacity = providers.reduce((n, b) => n + (CATALOG[b.kind].capacity || 0) * (b.kind === 'solar' ? (game.weather === 'storm' ? .25 : game.weather === 'rain' ? .6 : 1) : b.kind === 'wind' ? (game.weather === 'clear' ? .85 : 1.15) : 1), 0);
    // Service capacity alone is insufficient: homes must be served over the connected network.
    const coverage = houses.length ? houses.reduce((n, home) => n + (isConnected(home, network) && providers.some(p => distance(home, p) <= (service === 'power' || service === 'water' ? 420 : 200)) ? (CATALOG[home.kind].housing || 0) : 0), 0) / Math.max(1, m.housing) : 0;
    m.services[service] = Math.round(clamp(capacity / population * 100) * coverage);
  }
  m.pollution = clamp(rawPollution + (100 - m.services.waste) * .16 + Math.max(0, game.population - 300) * .016);
  const serviceQuality = SERVICES.reduce((s, k) => s + m.services[k], 0) / SERVICES.length;
  const employment = game.population ? m.employed / Math.max(1, game.population * .58) : 1;
  const parks = connected.filter(b => b.kind === 'park').length;
  m.congestion = Math.round(clamp(game.population / Math.max(1, network.nodes.size) * 4.2 + connected.filter(b => b.kind === 'processing').length * 2, 0, 95));
  m.happiness = Math.round(clamp(24 + serviceQuality * .48 + employment * 22 + Math.min(8, parks * 2) - m.pollution * .32 - Math.max(0, game.taxRate - 9) * 3 - m.congestion * .07 - (game.weather === 'storm' ? 7 : 0)));
  const sea = game.weather === 'storm' ? .1 : game.weather === 'rain' ? .65 : 1;
  const ports = connected.filter(b => b.kind === 'port').length;
  const fisheries = connected.filter(b => b.kind === 'fishery').length;
  const processors = connected.filter(b => b.kind === 'processing').length;
  const warehouses = connected.filter(b => b.kind === 'warehouse').length;
  const workerRatio = Math.min(1, m.employed / Math.max(1, m.jobs));
  const utilities = Math.min(m.services.power, m.services.water) / 100;
  const roomCapacity = connected.reduce((n, b) => n + (CATALOG[b.kind].visitors || 0), 0);
  m.tourists = Math.floor(Math.min(roomCapacity, ports * 160) * sea * Math.max(.15, m.happiness / 100) * (1 - m.pollution / 130));
  m.taxes = Math.round(game.population * game.taxRate * .7 + m.employed * 2);
  m.fishing = Math.round(fisheries * 760 * sea * workerRatio * (.35 + .65 * utilities));
  m.tourism = Math.round(m.tourists * 16);
  m.goods = Math.round(Math.min(ports * 140, fisheries * 25 + processors * 35 + warehouses * 25) * sea * workerRatio);
  m.trade = Math.round(m.goods * 8 * (1 + Math.min(fisheries, processors) * .12));
  m.passengers = Math.round(m.tourists + game.population * .045 * ports * sea);
  m.revenue = m.taxes + m.fishing + m.tourism + m.trade;
  m.expenses = Math.round(game.buildings.reduce((s, b) => s + CATALOG[b.kind].upkeep, 0) + game.roads.reduce((s, r) => s + r.points.length * (r.kind === 'avenue' ? 2 : 1), 0) + game.population * 1.5 + Math.max(0, game.population - m.goods * 2) * .3);
  m.balance = m.revenue - m.expenses;
  m.demand = { residential: Math.round(clamp(75 - (m.housing - game.population) * .35 + (m.happiness - 55) * .6)), commercial: Math.round(clamp(game.population * .3 - m.jobs * .24 + 40)), industrial: Math.round(clamp(55 + (m.employed - m.jobs) * .12)), tourism: Math.round(clamp(65 - roomCapacity * .16 - m.pollution * .6)), public: Math.round(100 - serviceQuality) };
  return m;
}

function addSeed(game: Game, kind: BuildingKind, p: Point, rotation = 0) {
  const point = snap(p);
  if (!inside(point) || game.buildings.some(b => distance(b, point) < CELL * .9)) return;
  game.buildings.push({ ...point, kind, rotation, id: 'b' + game.nextId++, level: 1, builtDay: 0 });
}
export function newGame(mode: Mode = 'real', name = 'Phú Quý'): Game {
  const game: Game = { version: 1, name: name.trim().slice(0, 40) || 'Phú Quý', mode, seed: 284, nextId: 1, day: 1, hour: 8, funds: mode === 'sandbox' ? 1000000 : 125000, population: 176, taxRate: 9, buildings: [], roads: [], zones: [], weather: 'clear', history: [], completedObjectives: [], metrics: emptyMetrics(), settings: { ...DEFAULT_SETTINGS } };
  // Preserve the actual primary-road alignments, resampled to a 100 m planning grid.
  for (const line of OSM_ROADS) {
    let points: Point[] = [];
    for (let i = 1; i < line.length; i++) {
      const segment = roadPath(line[i - 1], line[i]);
      points.push(...(points.length ? segment.slice(1) : segment));
    }
    points = points.filter(p => inside(p));
    if (points.length > 1) game.roads.push({ id: 'r' + game.nextId++, points, kind: 'street' });
  }
  // One game-scale settlement backbone unites disconnected/omitted minor OSM streets.
  const center = { x: 30, z: 80 };
  const mainPoints = roadPath({ x: center.x, z: center.z - 100 }, { x: center.x, z: center.z + 100 }).filter(p => inside(p));
  game.roads.push({ id: 'r' + game.nextId++, points: mainPoints, kind: 'avenue' });
  for (let i = -10; i <= 10; i++) {
    const z = center.z + i * CELL;
    if (i % 2 === 0) {
      const row = roadPath({ x: center.x - 80, z }, { x: center.x + 80, z }).filter(p => inside(p));
      if (row.length > 1) game.roads.push({ id: 'r' + game.nextId++, points: row, kind: 'street' });
    }
  }
  // Put the existing harbour on a genuine coastal site and reserve its access road.
  const coastal: Point[] = [];
  for (let z = -10; z <= 270; z += CELL) for (let x = -170; x <= 180; x += CELL) {
    const p = { x, z };
    if (inside(p) && coastDistance(p) > 8 && coastDistance(p) < 30 && heightAt(p) < 8 && !game.roads.some(r => r.points.some(n => distance(n, p) < 7))) coastal.push(p);
  }
  coastal.sort((a, b) => distance(a, center) - distance(b, center));
  const harbour = coastal[0];
  if (!harbour) throw new Error('Cannot find a coastal harbour site in the source geography.');
  const approach = [{ x: harbour.x + CELL, z: harbour.z }, { x: harbour.x - CELL, z: harbour.z }, { x: harbour.x, z: harbour.z + CELL }, { x: harbour.x, z: harbour.z - CELL }].filter(p => inside(p)).sort((a,b) => distance(a,center)-distance(b,center))[0];
  game.roads.push({ id: 'r' + game.nextId++, points: roadPath(center, approach).filter(p => inside(p)), kind: 'street' });
  addSeed(game, 'port', harbour);
  const fishingSite = coastal.find(p => distance(p, harbour) >= CELL && distance(p, harbour) < CELL * 2.5 && game.roads.some(r => r.points.some(n => distance(n, p) <= CELL * 1.7 && distance(n, p) >= CELL * .8)));
  if (fishingSite) addSeed(game, 'fishery', fishingSite);
  // Place along alternate rows so every address has a clear neighbouring road.
  const roadKeys = new Set(game.roads.flatMap(r => r.points).map(key));
  const locations: Point[] = [];
  for (let z = center.z - 90; z <= center.z + 90; z += CELL) for (let x = center.x - 70; x <= center.x + 70; x += CELL) {
    const p = { x, z };
    if (!roadKeys.has(key(p)) && inside(p) && coastDistance(p) > 10 && heightAt(p) < 8 && !game.buildings.some(b => distance(b,p) < CELL * .9)) locations.push(p);
  }
  const kinds: BuildingKind[] = ['water', 'wind', 'clinic', 'school', 'waste', 'fire', 'market', 'restaurant', 'hotel', 'park', ...Array<BuildingKind>(18).fill('house')];
  kinds.forEach((kind, i) => { if (locations[i]) addSeed(game, kind, locations[i], i % 2 * Math.PI); });
  if (game.buildings.filter(b => b.kind === 'house').length < 14) throw new Error('Source geography cannot accommodate the starting community.');
  game.metrics = metricsFor(game);
  return game;
}

export function placementError(game: Game, kind: BuildingKind, p: Point, movingId?: string): string | null {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) return 'Choose a valid site.';
  const d = CATALOG[kind], radius = (d.footprint || 1) * CELL * .42;
  if (!inside(p) || ![{ x: p.x - radius, z: p.z }, { x: p.x + radius, z: p.z }, { x: p.x, z: p.z - radius }, { x: p.x, z: p.z + radius }].every(c => inside(c))) return 'Choose a site on the island.';
  if (heightAt(p) > 14) return 'This slope is too steep to build on.';
  if (game.buildings.length >= 500 && !movingId) return 'Island building limit reached (500).';
  if (game.buildings.some(b => b.id !== movingId && distance(b, p) < CELL * .47 * ((CATALOG[b.kind].footprint || 1) + (d.footprint || 1)))) return 'Another building occupies this site.';
  if (game.roads.some(r => r.points.some(n => distance(n, p) < CELL * .65))) return 'Keep the road clear.';
  if ((kind === 'port' || kind === 'fishery' || kind === 'resort') && coastDistance(p) > 65) return 'This building needs a coastal site (within 650 m).';
  if (game.mode !== 'sandbox' && game.funds < (movingId ? d.cost * .15 : d.cost)) return 'Not enough funds. Review the island budget.';
  if (!game.roads.some(r => r.points.some(n => distance(n, p) <= CELL * 1.7))) return 'Build a road to this address first.';
  return null;
}
export function construct(game: Game, kind: BuildingKind, position: Point, rotation = 0, movingId?: string): { game: Game; error: string | null } {
  const p = snap(position), error = placementError(game, kind, p, movingId);
  if (error) return { game, error };
  const cost = CATALOG[kind].cost * (movingId ? .15 : 1);
  const building: Building = { ...p, id: movingId || 'b' + game.nextId, kind, rotation, level: 1, builtDay: game.day };
  const result = { ...game, nextId: game.nextId + (movingId ? 0 : 1), funds: game.funds - (game.mode === 'sandbox' ? 0 : cost), buildings: movingId ? game.buildings.map(b => b.id === movingId ? building : b) : [...game.buildings, building] };
  result.metrics = metricsFor(result);
  return { game: result, error: null };
}
export function addRoad(game: Game, points: Point[], kind: Road['kind']): { game: Game; error: string | null } {
  if (points.length < 2 || points.length > 150 || game.roads.length >= 500) return { game, error: 'Choose a road between 2 and 150 cells.' };
  if (kind !== 'bridge' && points.some(p => !inside(p))) return { game, error: 'Roads must stay on land. Select bridge for water.' };
  if (points.some(p => Math.abs(p.x) > 650 || Math.abs(p.z) > 650)) return { game, error: 'Road is outside the island planning area.' };
  if (points.some(p => game.buildings.some(b => distance(b, p) < CELL * .7))) return { game, error: 'A building blocks this road.' };
  const cost = points.length * (kind === 'avenue' ? 160 : kind === 'bridge' ? 400 : 80);
  if (game.mode !== 'sandbox' && cost > game.funds) return { game, error: 'Not enough funds for this road.' };
  const result = { ...game, nextId: game.nextId + 1, funds: game.funds - (game.mode === 'sandbox' ? 0 : cost), roads: [...game.roads, { id: 'r' + game.nextId, points, kind }] };
  result.metrics = metricsFor(result);
  return { game: result, error: null };
}

export function demolish(game: Game, p: Point): Game {
  const building = game.buildings.find(b => distance(b, p) < CELL * .8);
  let result = game;
  if (building) result = { ...game, buildings: game.buildings.filter(b => b.id !== building.id), funds: game.funds + (game.mode === 'sandbox' ? 0 : CATALOG[building.kind].cost * .25) };
  else {
    let nextId = game.nextId;
    // An intersection can belong to several alignments. Clear every occurrence
    // so a hidden overlapping road cannot preserve access through the removed cell.
    const roads = game.roads.flatMap(road => {
      if (!road.points.some(n => distance(n, p) < CELL * .65)) return [road];
      const split: Point[][] = [[]];
      for (const n of road.points) { if (distance(n, p) < CELL * .65) split.push([]); else split[split.length - 1].push(n); }
      return split.filter(points => points.length >= 2).map(points => ({ ...road, id: 'r' + nextId++, points }));
    });
    result = { ...game, nextId, roads };
  }
  result = { ...result, zones: result.zones.filter(z => distance(z, p) >= CELL * .65) };
  result.metrics = metricsFor(result);
  return result;
}

export function tick(game: Game, hours = 1): Game {
  let next = { ...game, hour: game.hour + hours };
  while (next.hour >= 24) {
    next = { ...next, day: next.day + 1, hour: next.hour - 24, buildings: [...next.buildings], zones: [...next.zones] };
    next.weather = WEATHER[Math.floor((next.day + next.seed % 7) / 2) % WEATHER.length];
    next.metrics = metricsFor(next);
    const m = next.metrics;
    const target = Math.min(m.housing, Math.floor((m.jobs / .58) * 1.12));
    const utilities = Math.min(m.services.power, m.services.water);
    const growth = m.happiness >= 56 && utilities > 60 && next.funds >= 0 ? Math.min(target - next.population, Math.max(1, Math.ceil(next.population * .035))) : -Math.ceil(next.population * (utilities < 30 || m.happiness < 35 ? .045 : .012));
    next.population = Math.round(clamp(next.population + growth, 0, m.housing));
    next.funds += m.balance;
    // Private development responds to demand, road access and real service conditions.
    const zone = next.zones.find(z => m.demand[z.kind] > 40 && !next.buildings.some(b => distance(b, z) < CELL * .9) && !placementError({ ...next, funds: Infinity }, ZONE_BUILDING[z.kind], z));
    if (zone && utilities > 50 && m.happiness >= 45 && next.buildings.length < 500) {
      next.buildings.push({ ...zone, id: 'b' + next.nextId++, kind: ZONE_BUILDING[zone.kind], rotation: 0, level: 1, builtDay: next.day });
    }
    next.metrics = metricsFor(next);
    next.history = [...next.history, { day: next.day, population: next.population, funds: next.funds, balance: next.metrics.balance }].slice(-90);
    for (const objective of OBJECTIVES) if (!next.completedObjectives.includes(objective.id) && objective.check(next)) {
      next.completedObjectives = [...next.completedObjectives, objective.id];
      next.funds += objective.reward;
    }
  }
  return next;
}

export const OBJECTIVES = [
  { id: 'community', title: 'A growing community', description: 'Welcome 220 residents.', reward: 6000, check: (g: Game) => g.population >= 220 },
  { id: 'services', title: 'The essentials, for everyone', description: 'Reach 90% electricity and water coverage.', reward: 4500, check: (g: Game) => g.metrics.services.power >= 90 && g.metrics.services.water >= 90 },
  { id: 'sea', title: 'An island livelihood', description: 'Earn 1,000 per day from fishing and trade.', reward: 7000, check: (g: Game) => g.metrics.fishing + g.metrics.trade >= 1000 },
  { id: 'welcome', title: 'A warm welcome', description: 'Welcome 60 daily visitors with pollution below 30.', reward: 8500, check: (g: Game) => g.metrics.tourists >= 60 && g.metrics.pollution < 30 },
  { id: 'balance', title: 'Prosper, thoughtfully', description: 'Reach 400 residents, 70% wellbeing and a positive daily balance.', reward: 15000, check: (g: Game) => g.population >= 400 && g.metrics.happiness >= 70 && g.metrics.balance > 0 },
];
