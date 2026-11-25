import { CATALOG, DEFAULT_SETTINGS, ZONE_COLORS } from '../core/catalog';
import type { Building, Game, Road, Settings, Zone } from '../core/types';
import { emptyMetrics, metricsFor } from '../simulation/simulation';

const PREFIX = 'phu-quy-v1:';
export const SLOTS = ['island-1', 'island-2', 'autosave'] as const;
export type Slot = typeof SLOTS[number];
export interface SaveInfo { slot: Slot; name: string; day: number; population: number; savedAt: string; valid: boolean }
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown, min = -1e9, max = 1e9): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const point = (v: unknown) => object(v) && finite(v.x, -650, 650) && finite(v.z, -650, 650) && v.x % 10 === 0 && v.z % 10 === 0;

export function validateGame(input: unknown): Game {
  if (!object(input) || input.version !== 1) throw new Error('This save version is not supported. Your current island is safe.');
  const g = input;
  if (typeof g.name !== 'string' || g.name.length > 40 || !['real', 'sandbox'].includes(String(g.mode))) throw new Error('Invalid island information.');
  if (!finite(g.day, 1, 1000000) || !Number.isInteger(g.day) || !finite(g.hour, 0, 23.999) || !finite(g.funds) || !finite(g.population, 0, 100000) || !Number.isInteger(g.population) || !finite(g.taxRate, 1, 20) || !finite(g.seed, 0, 1e9) || !finite(g.nextId, 1, 1e8) || !Number.isInteger(g.nextId)) throw new Error('Invalid simulation values.');
  if (!Array.isArray(g.buildings) || g.buildings.length > 500 || !Array.isArray(g.roads) || g.roads.length > 500 || !Array.isArray(g.zones) || g.zones.length > 2000) throw new Error('This save exceeds the island object limits.');
  const ids = new Set<string>();
  for (const b of g.buildings) {
    if (!object(b) || !point(b) || typeof b.id !== 'string' || !/^b\d{1,8}$/.test(b.id) || ids.has(b.id) || !Object.hasOwn(CATALOG, String(b.kind)) || !finite(b.rotation, -1000, 1000) || !finite(b.level, 1, 5) || !finite(b.builtDay, 0, 1000000)) throw new Error('Invalid building data.');
    ids.add(b.id);
  }
  for (const r of g.roads) {
    if (!object(r) || typeof r.id !== 'string' || !/^r\d{1,8}$/.test(r.id) || ids.has(r.id) || !['street', 'avenue', 'bridge'].includes(String(r.kind)) || !Array.isArray(r.points) || r.points.length < 2 || r.points.length > 1000 || !r.points.every(point)) throw new Error('Invalid road data.');
    ids.add(r.id);
  }
  if (g.roads.reduce((n: number, r: Road) => n + r.points.length, 0) > 12000) throw new Error('Too many road nodes in this save.');
  if (g.zones.some(z => !object(z) || !point(z) || !Object.hasOwn(ZONE_COLORS, String(z.kind)))) throw new Error('Invalid zone data.');
  if (!['clear', 'cloudy', 'rain', 'storm'].includes(String(g.weather))) throw new Error('Invalid weather state.');
  if ([...ids].some(id => Number(id.slice(1)) >= (g.nextId as number))) throw new Error('Invalid object sequence.');
  const settings = parseSettings(g.settings);
  const result: Game = {
    version: 1, name: g.name, mode: g.mode as Game['mode'], seed: g.seed, nextId: g.nextId,
    day: g.day, hour: g.hour, funds: g.funds, population: g.population, taxRate: g.taxRate,
    buildings: (g.buildings as Building[]).map(b => ({ id: b.id, kind: b.kind, x: b.x, z: b.z, rotation: b.rotation, level: b.level, builtDay: b.builtDay })),
    roads: (g.roads as Road[]).map(r => ({ id: r.id, kind: r.kind, points: r.points.map(p => ({ x: p.x, z: p.z })) })),
    zones: (g.zones as Zone[]).map(z => ({ kind: z.kind, x: z.x, z: z.z })),
    weather: g.weather as Game['weather'], history: [], completedObjectives: [], metrics: emptyMetrics(), settings,
  };
  if (Array.isArray(g.history)) result.history = g.history.slice(-90).filter(h => object(h) && finite(h.day, 1, 1e6) && finite(h.population, 0, 1e5) && finite(h.funds) && finite(h.balance)).map(h => ({ day: h.day, population: h.population, funds: h.funds, balance: h.balance }));
  if (Array.isArray(g.completedObjectives)) result.completedObjectives = [...new Set(g.completedObjectives.filter((x): x is string => typeof x === 'string' && ['community', 'services', 'sea', 'welcome', 'balance'].includes(x)))];
  result.metrics = metricsFor(result);
  return result;
}
export function parseSettings(input: unknown): Settings {
  const s = object(input) ? input : {};
  return { quality: ['low', 'medium', 'high'].includes(String(s.quality)) ? s.quality as Settings['quality'] : DEFAULT_SETTINGS.quality, volume: finite(s.volume, 0, 1) ? s.volume : DEFAULT_SETTINGS.volume, audio: s.audio === true, shadows: s.shadows !== false, autosave: s.autosave !== false, reducedMotion: s.reducedMotion === true };
}
export function parseSave(text: string): Game {
  if (text.length > 3_000_000) throw new Error('Save file is too large (3 MB maximum).');
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('The save file is not valid JSON. Your current island is safe.'); }
  if (object(value) && value.format === 'phu-quy-save') return validateGame(value.game);
  return validateGame(value);
}
export function serialize(game: Game): string { return JSON.stringify({ format: 'phu-quy-save', savedAt: new Date().toISOString(), game }); }
export function saveGame(game: Game, slot: Slot = 'island-1'): void {
  const key = PREFIX + slot, text = serialize(game);
  parseSave(text);
  const existing = localStorage.getItem(key);
  if (existing) { try { parseSave(existing); localStorage.setItem(key + ':backup', existing); } catch { /* retain the last known valid backup */ } }
  localStorage.setItem(key, text);
  if (localStorage.getItem(key) !== text) throw new Error('Save verification failed. Export a JSON backup instead.');
}
export function loadGame(slot: Slot = 'island-1'): { game: Game; recovered: boolean } {
  const key = PREFIX + slot;
  try { return { game: parseSave(localStorage.getItem(key) || ''), recovered: false }; }
  catch (error) {
    const backup = localStorage.getItem(key + ':backup');
    if (backup) return { game: parseSave(backup), recovered: true };
    throw error;
  }
}
export function listSaves(): SaveInfo[] {
  return SLOTS.flatMap<SaveInfo>(slot => {
    try {
      const text = localStorage.getItem(PREFIX + slot);
      if (!text) return [];
      const { game, recovered } = loadGame(slot);
      const raw = recovered ? {} : JSON.parse(text);
      return [{ slot, name: game.name, day: game.day, population: game.population, savedAt: recovered ? 'Recovered backup' : String(raw.savedAt || ''), valid: true }];
    } catch { return [{ slot, name: 'Damaged save — import a backup', day: 0, population: 0, savedAt: '', valid: false }]; }
  });
}
export function loadPreferences(): Settings { try { return parseSettings(JSON.parse(localStorage.getItem(PREFIX + 'settings') || '{}')); } catch { return { ...DEFAULT_SETTINGS }; } }
export function savePreferences(settings: Settings) { localStorage.setItem(PREFIX + 'settings', JSON.stringify(settings)); }
