import { create } from 'zustand';
import { CATALOG } from './catalog';
import type { Game, Mode, Panel, Point, RoadKind, Screen, Settings, Tool, ZoneKind } from './types';
import { addRoad, construct, demolish, metricsFor, newGame, tick } from '../simulation/simulation';
import { CELL, distance, inside, key, snap } from '../world/geography';
import { loadPreferences, savePreferences } from '../storage/saves';

interface Store {
  game: Game; screen: Screen; previousScreen: Screen; panel: Panel; tool: Tool;
  rotation: number; selectedId: string | null; movingId: string | null;
  roadKind: RoadKind; curved: boolean; roadStart: Point | null; zoneKind: ZoneKind;
  speed: number; message: string; messageId: number; tutorial: boolean;
  layer: 'natural' | 'services' | 'traffic' | 'pollution'; overviewToken: number;
  setScreen: (screen: Screen) => void; setPanel: (panel: Panel) => void;
  setTool: (tool: Tool) => void; setSpeed: (speed: number) => void;
  begin: (mode: Mode, name: string) => void; restore: (game: Game) => void;
  advance: () => void; place: (p: Point) => void; buildRoad: (points: Point[]) => void;
  select: (id: string | null) => void; rotate: () => void; cancel: () => void;
  notify: (message: string) => void; configure: (settings: Partial<Settings>) => void;
  setTax: (rate: number) => void; moveSelected: () => void;
}
let preferences: Settings;
try { preferences = loadPreferences(); } catch { preferences = newGame().settings; }
const initial = newGame(); initial.settings = preferences;
export const useGame = create<Store>((set, get) => ({
  game: initial, screen: 'menu', previousScreen: 'menu', panel: null, tool: 'inspect', rotation: 0,
  selectedId: null, movingId: null, roadKind: 'street', curved: false, roadStart: null, zoneKind: 'residential',
  speed: 1, message: '', messageId: 0, tutorial: true, layer: 'natural', overviewToken: 0,
  setScreen: screen => set(s => ({ previousScreen: s.screen, screen, roadStart: null })),
  setPanel: panel => set(s => ({ panel: s.panel === panel ? null : panel, tool: panel === 'roads' ? 'road' : panel === 'zones' ? 'zone' : 'inspect', roadStart: null, selectedId: null, movingId: null })),
  setTool: tool => set({ tool, roadStart: null, selectedId: null, movingId: null }),
  setSpeed: speed => set({ speed }),
  begin: (mode, name) => { const game = newGame(mode, name); game.settings = get().game.settings; set({ game, screen: 'playing', panel: null, tool: 'inspect', selectedId: null, roadStart: null, movingId: null, speed: 1, tutorial: true }); },
  restore: game => set({ game, screen: 'playing', panel: null, tool: 'inspect', selectedId: null, roadStart: null, movingId: null, speed: 1, tutorial: false }),
  advance: () => { const s = get(); if (s.screen === 'playing' && s.speed > 0) set({ game: tick(s.game, s.speed) }); },
  place: position => {
    const s = get(); if (s.screen !== 'playing') return;
    const p = snap(position);
    if (s.tool === 'bulldoze') { const next = demolish(s.game, p); set({ game: next, selectedId: null }); s.notify('Site cleared. Buildings return 25% of their construction cost.'); return; }
    if (s.tool === 'zone') {
      if (!inside(p)) { s.notify('Zones must be on land.'); return; }
      if (s.game.zones.length >= 2000) { s.notify('Zoning limit reached (2,000 cells).'); return; }
      if (s.game.buildings.some(b => distance(b, p) < CELL * .7) || s.game.roads.some(r => r.points.some(n => key(n) === key(p)))) return;
      if (s.game.zones.some(z => key(z) === key(p) && z.kind === s.zoneKind)) return;
      if (s.game.mode !== 'sandbox' && s.game.funds < 60) { s.notify('Not enough funds to zone this site.'); return; }
      set({ game: { ...s.game, funds: s.game.funds - (s.game.mode === 'sandbox' ? 0 : 60), zones: [...s.game.zones.filter(z => key(z) !== key(p)), { ...p, kind: s.zoneKind }] } });
      return;
    }
    if (s.tool === 'inspect' || s.tool === 'move' || s.tool === 'road') return;
    const result = construct(s.game, s.tool, p, s.rotation, s.movingId || undefined);
    if (result.error) { s.notify(result.error); return; }
    set({ game: result.game, selectedId: null, ...(s.movingId ? { tool: 'inspect', movingId: null } : {}) });
    s.notify(`${CATALOG[s.tool].name} ${s.movingId ? 'relocated' : 'built'}.`);
  },
  buildRoad: points => { const s = get(), result = addRoad(s.game, points, s.roadKind); if (result.error) s.notify(result.error); else { set({ game: result.game, roadStart: null }); s.notify('Road connected. Intersections share the same network.'); } },
  select: id => set({ selectedId: id, panel: null }),
  rotate: () => set(s => ({ rotation: (s.rotation + Math.PI / 2) % (Math.PI * 2) })),
  cancel: () => set({ tool: 'inspect', panel: null, selectedId: null, roadStart: null, movingId: null }),
  notify: message => set(s => ({ message, messageId: s.messageId + 1 })),
  configure: settings => { const next = { ...get().game.settings, ...settings }; set(s => ({ game: { ...s.game, settings: next } })); try { savePreferences(next); } catch { get().notify('Preferences could not be stored. JSON exports still include settings.'); } },
  setTax: taxRate => set(s => { const game = { ...s.game, taxRate }; game.metrics = metricsFor(game); return { game }; }),
  moveSelected: () => { const s = get(), b = s.game.buildings.find(b => b.id === s.selectedId); if (b) { set({ tool: b.kind, movingId: b.id, rotation: b.rotation, selectedId: null }); s.notify('Choose a new address. Relocation costs 15% of the build price.'); } },
}));

// Used by development QA only. The production bundle does not expose the store.
if (import.meta.env.DEV) Object.assign(window, { __PHU_QUY__: useGame });
