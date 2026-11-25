import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newGame } from '../simulation/simulation';
import { listSaves, loadGame, parseSave, parseSettings, saveGame, serialize, validateGame } from './saves';

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v), removeItem: (k: string) => data.delete(k) });
});
describe('versioned save lifecycle and corruption recovery', () => {
  it('round trips all world, simulation and settings fields', () => {
    const game = newGame('sandbox', 'Bình Minh');
    game.settings.volume = .6;
    expect(parseSave(serialize(game))).toEqual(game);
  });
  it('lists and loads separate manual and automatic slots', () => {
    const game = newGame(); saveGame(game); saveGame({ ...game, name: 'Second island' }, 'island-2'); saveGame(game, 'autosave');
    expect(listSaves()).toHaveLength(3); expect(loadGame('island-2').game.name).toBe('Second island');
  });
  it('recovers the last valid version if the active save is corrupted', () => {
    const game = newGame(); saveGame(game); saveGame({ ...game, day: 2 });
    localStorage.setItem('phu-quy-v1:island-1', '{broken');
    const result = loadGame(); expect(result.recovered).toBe(true); expect(result.game.day).toBe(1);
    expect(listSaves()[0].valid).toBe(true);
  });
  it('leaves the recovery backup intact when an existing save is already damaged', () => {
    const game = newGame(); saveGame(game); saveGame({ ...game, day: 2 });
    localStorage.setItem('phu-quy-v1:island-1', 'broken'); saveGame({ ...game, day: 3 });
    localStorage.setItem('phu-quy-v1:island-1', 'broken again');
    expect(loadGame().game.day).toBe(1);
  });
  it.each([undefined, null, {}, { ...newGame(), version: 99 }, { ...newGame(), funds: Infinity }, { ...newGame(), population: '100' }, { ...newGame(), buildings: [{ kind: '__proto__', id: 'b99' }] }, { ...newGame(), weather: 'volcano' }])('rejects unsupported or corrupt saves', value => { expect(() => validateGame(value)).toThrow(); });
  it('rejects malformed JSON, oversized inputs and road point bombs', () => {
    expect(() => parseSave('{oops')).toThrow(/JSON/); expect(() => parseSave(' '.repeat(3000001))).toThrow(/large/);
    const game = newGame(); game.roads = [{ id: 'r1', points: Array(1001).fill({ x: 0, z: 0 }), kind: 'street' }];
    expect(() => validateGame(game)).toThrow(/road/);
  });
  it('recomputes derived metrics instead of trusting an imported number', () => {
    const game = newGame(); game.metrics.happiness = 999999;
    expect(validateGame(game).metrics.happiness).toBeLessThanOrEqual(100);
  });
  it('rejects duplicate IDs and unsafe object sequences', () => {
    const game = newGame(); game.buildings.push({ ...game.buildings[0] });
    expect(() => validateGame(game)).toThrow(/building/);
    expect(() => validateGame({ ...newGame(), nextId: 1 })).toThrow(/sequence/);
  });
  it('sanitizes settings independently of unsupported values', () => {
    expect(parseSettings({ quality: 'ultra', volume: 999, audio: true, autosave: false })).toMatchObject({ quality: 'medium', volume: .2, audio: true, autosave: false });
  });
});
