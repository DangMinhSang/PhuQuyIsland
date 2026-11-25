import { ArrowDownRight, ArrowUpRight, ArrowRight, Check, ChevronRight, Home, Store, Anchor, Zap, Move, Trash2, RotateCw, Plus, Leaf, Route, CloudRain, GraduationCap, HeartPulse, ShieldCheck, Droplets, Wind, TreePine } from 'lucide-react';
import { useState } from 'react';
import { useGame } from '../core/store';
import { CATALOG, money, SERVICE_NAMES, ZONE_COLORS } from '../core/catalog';
import type { BuildingKind, Category, Game, Service, ZoneKind } from '../core/types';
import { OBJECTIVES, SERVICES } from '../simulation/simulation';
import { Meter, PanelHeading, StatRow } from './primitives';

const CATEGORY_ICONS = { homes: Home, commerce: Store, island: Anchor, services: Zap };
const BUILD_ICONS: Partial<Record<BuildingKind, typeof Home>> = { house: Home, apartments: Home, market: Store, restaurant: Store, fishery: Anchor, port: Anchor, wind: Wind, solar: Zap, water: Droplets, clinic: HeartPulse, school: GraduationCap, waste: Leaf, fire: ShieldCheck, park: TreePine };
const serviceIcon: Record<Service, typeof Zap> = { power: Zap, water: Droplets, health: HeartPulse, education: GraduationCap, waste: Leaf, safety: ShieldCheck };

function Construction({ services = false }: { services?: boolean }) {
  const tool = useGame(s => s.tool), funds = useGame(s => s.game.funds), mode = useGame(s => s.game.mode);
  const [category, setCategory] = useState<Category>('homes');
  const current = services ? 'services' : category;
  return <>
    <PanelHeading title={services ? 'Care for your community' : 'Plan your island'} subtitle={services ? 'PUBLIC SERVICES' : 'CONSTRUCTION'} />
    {!services && <div className="category-tabs">{(['homes', 'commerce', 'island', 'services'] as const).map(c => { const Icon = CATEGORY_ICONS[c]; return <button key={c} className={current === c ? 'active' : ''} aria-pressed={current === c} onClick={() => setCategory(c)} title={c}><Icon size={16} /><span>{c === 'island' ? 'Maritime' : c[0].toUpperCase() + c.slice(1)}</span></button>; })}</div>}
    <div className="construction-list">{(Object.entries(CATALOG) as [BuildingKind, typeof CATALOG[BuildingKind]][]).filter(([, def]) => def.category === current).map(([kind, def]) => { const Icon = BUILD_ICONS[kind] || Store; return <button key={kind} className={`building-option ${tool === kind ? 'selected' : ''}`} onClick={() => useGame.getState().setTool(kind)} aria-pressed={tool === kind} title={def.description}>
      <span className="building-icon" style={{ '--building-color': def.color } as React.CSSProperties}><Icon size={27} strokeWidth={1.3} /></span><span><strong>{def.name}</strong><small>{def.housing ? `${def.housing} residents` : def.service ? `Serves ${def.capacity}` : def.jobs ? `${def.jobs} jobs` : 'Cleaner air & wellbeing'}</small><em className={funds < def.cost && mode !== 'sandbox' ? 'negative' : ''}>{money(def.cost)} <span>credits</span></em></span><Plus size={16} className="option-plus" />
    </button>; })}</div>
    {tool in CATALOG && <div className="selection-note"><strong>{CATALOG[tool as BuildingKind].name}</strong><p>{CATALOG[tool as BuildingKind].description}</p><small>Daily upkeep {money(CATALOG[tool as BuildingKind].upkeep)} · Requires road access</small><button className="text-button" onClick={() => useGame.getState().rotate()}><RotateCw size={14} /> Rotate 90° <kbd>R</kbd></button></div>}
    <p className="panel-footnote">Click an open site to build. Your preview turns red when a site is unsuitable.</p>
  </>;
}
function Roads() {
  const roadKind = useGame(s => s.roadKind), curved = useGame(s => s.curved), roadStart = useGame(s => s.roadStart);
  return <><PanelHeading title="Make connections" subtitle="ROADS & TRANSPORT" /><p className="panel-intro">An island works better when its neighbourhoods, services and harbour are connected.</p>
    <div className="road-options">{([['street', 'Island street', '80 / cell', 'A local road with pavements.'], ['avenue', 'Town avenue', '160 / cell', 'A wider main road.'], ['bridge', 'Coastal bridge', '400 / cell', 'Cross water to reach another shore.']] as const).map(([kind, name, price, description]) => <button key={kind} onClick={() => { useGame.setState({ roadKind: kind }); useGame.getState().setTool('road'); }} aria-pressed={roadKind === kind} className={roadKind === kind ? 'selected' : ''}><Route size={24} /><span><strong>{name}</strong><small>{description}</small><em>{price}</em></span>{roadKind === kind && <Check size={17} />}</button>)}</div>
    <label className="toggle-row"><span>Curved alignment<small>A gentle arc between endpoints</small></span><input type="checkbox" checked={curved} onChange={e => useGame.setState({ curved: e.target.checked })} /></label>
    <div className="selection-note"><strong>{roadStart ? 'Choose your destination' : 'Start with a connection'}</strong><p>{roadStart ? 'Click the second point to finish. Intersections connect automatically on the planning grid.' : 'Click a starting point on the map, then choose an endpoint. Keep roads clear of buildings.'}</p></div>
    <button className="secondary-button full" onClick={() => useGame.getState().setTool('bulldoze')}><Trash2 size={16} /> Remove a road cell</button>
  </>;
}
function Zones() {
  const kind = useGame(s => s.zoneKind), demand = useGame(s => s.game.metrics.demand), zones = useGame(s => s.game.zones);
  return <><PanelHeading title="Room to grow" subtitle="LAND USE" /><p className="panel-intro">Paint a neighbourhood, then let demand shape it. Private development needs road access, electricity and water.</p>
    <div className="zone-options">{(Object.entries(ZONE_COLORS) as [ZoneKind, string][]).map(([zone, color]) => <button key={zone} aria-pressed={kind === zone} className={kind === zone ? 'selected' : ''} onClick={() => { useGame.setState({ zoneKind: zone }); useGame.getState().setTool('zone'); }}><i style={{ background: color }} /><span><strong>{zone[0].toUpperCase() + zone.slice(1)}</strong><small>{demand[zone]}% demand · {zones.filter(z => z.kind === zone).length} cells</small></span><ChevronRight size={16} /></button>)}</div>
    <div className="selection-note"><strong>Click and drag to zone</strong><p>60 credits per cell. A qualifying site develops once per simulated day. Unused zones remain available for future growth.</p></div>
  </>;
}
function Sparkline({ game }: { game: Game }) {
  if (game.history.length < 2) return <p className="muted chart-empty">A history of your island will appear after two days.</p>;
  const values = game.history.map(h => h.population), min = Math.min(...values) - 5, max = Math.max(...values) + 5;
  const points = values.map((n, i) => `${i / Math.max(1, values.length - 1) * 260},${70 - (n - min) / (max - min) * 60}`).join(' ');
  return <div className="sparkline"><svg viewBox="0 0 260 80" role="img" aria-label={`Population history: ${values[0]} to ${values[values.length - 1]} residents`}><path d="M0 75H260M0 40H260M0 5H260" stroke="#adc8bc" strokeOpacity=".12" /><polyline points={points} fill="none" stroke="#83dfbc" strokeWidth="2" /></svg><small>Population · last {values.length} days</small></div>;
}
function Economy() {
  const game = useGame(s => s.game), m = game.metrics;
  return <><PanelHeading title="An island livelihood" subtitle="ECONOMY" /><div className="panel-hero-number"><small>AVAILABLE TREASURY</small><strong>{money(game.funds)}<em> credits</em></strong><span className={m.balance >= 0 ? 'positive' : 'negative'}>{m.balance >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}{m.balance >= 0 ? '+' : ''}{money(m.balance)} / day</span></div>
    <h3>Daily income</h3><StatRow label="Residents & employment taxes" value={money(m.taxes)} /><StatRow label="Fishing cooperatives" value={money(m.fishing)} /><StatRow label="Tourism & hospitality" value={money(m.tourism)} /><StatRow label="Imports & exports" value={money(m.trade)} /><StatRow label="Total income" value={money(m.revenue)} positive /><h3>Daily expenditure</h3><StatRow label="Services, upkeep & supplies" value={'−' + money(m.expenses)} /><StatRow label="Budget balance" value={(m.balance >= 0 ? '+' : '') + money(m.balance)} positive={m.balance >= 0} />
    <label className="range-row"><span>Resident tax rate<strong>{game.taxRate}%</strong></span><input aria-label="Resident tax rate" type="range" min="1" max="20" value={game.taxRate} onChange={e => useGame.getState().setTax(Number(e.target.value))} /><small>Higher taxes raise income but reduce wellbeing above 9%.</small></label><p className="panel-footnote">All amounts are scaled game credits. Budget settles at midnight.</p>
  </>;
}
function Population() {
  const game = useGame(s => s.game), m = game.metrics;
  return <><PanelHeading title="People make the island" subtitle="POPULATION" /><div className="panel-hero-number"><small>ISLAND RESIDENTS</small><strong>{money(game.population)}</strong><span>{m.housing - game.population} places available</span></div><Meter label="Community wellbeing" value={m.happiness} /><StatRow label="Housing capacity" value={money(m.housing)} /><StatRow label="Households (about 4 people)" value={Math.ceil(game.population / 4)} /><StatRow label="Employed residents" value={`${m.employed} / ${Math.floor(game.population * .58)}`} /><StatRow label="Local jobs" value={m.jobs} /><Sparkline game={game} /><h3>Everyday essentials</h3><div className="service-list">{SERVICES.map(service => { const Icon = serviceIcon[service]; return <div key={service}><Icon size={16} /><Meter label={SERVICE_NAMES[service]} value={m.services[service]} /></div>; })}</div><p className="panel-footnote">Housing, jobs, services, tax rates and pollution all affect whether people stay.</p></>;
}
function Transport() {
  const game = useGame(s => s.game), m = game.metrics;
  return <><PanelHeading title="Connected by land & sea" subtitle="TRANSPORT" /><div className="panel-hero-number"><small>CONNECTED ADDRESSES</small><strong>{m.connected.length}<em> / {game.buildings.length}</em></strong><span>Connected to a harbour by road</span></div><Meter label="Traffic congestion" value={m.congestion} color={m.congestion > 70 ? 'var(--danger)' : 'var(--mint)'} /><StatRow label="Road alignments" value={game.roads.length} /><StatRow label="Passenger movements / day" value={m.passengers} /><StatRow label="Goods capacity used / day" value={`${m.goods} units`} /><StatRow label="Tourists arriving / day" value={m.tourists} /><div className="selection-note"><Anchor size={23} /><strong>{game.weather === 'storm' ? 'Storm restrictions in effect' : 'The sea is our connection'}</strong><p>{game.weather === 'storm' ? 'Maritime output is reduced to 10%. Services and savings help the community through rough weather.' : 'Harbours connect the island to supplies and visitors. Fishing, processing and warehouses support exports.'}</p></div><button className="secondary-button full" onClick={() => useGame.getState().setPanel('roads')}><Route size={16} /> Improve road access</button></>;
}
function Environment() {
  const game = useGame(s => s.game), layer = useGame(s => s.layer), m = game.metrics;
  return <><PanelHeading title="Protect what makes it special" subtitle="ENVIRONMENT" /><div className="weather-panel"><CloudRain size={36} strokeWidth={1.1} /><div><strong>{game.weather[0].toUpperCase() + game.weather.slice(1)}</strong><span>{game.weather === 'storm' ? 'Rough seas · strong wind' : game.weather === 'rain' ? 'Wet season showers · moderate seas' : 'Trade winds · open sea routes'}</span></div></div><Meter label="Air & water pollution" value={m.pollution} color={m.pollution > 45 ? 'var(--danger)' : 'var(--mint)'} /><Meter label="Waste collection coverage" value={m.services.waste} /><StatRow label="Parks & coastal gardens" value={game.buildings.filter(b => b.kind === 'park').length} /><StatRow label="Clean energy installations" value={game.buildings.filter(b => b.kind === 'wind' || b.kind === 'solar').length} /><h3>Map overlay</h3><div className="segmented">{(['natural', 'services', 'traffic', 'pollution'] as const).map(l => <button key={l} aria-pressed={layer === l} className={layer === l ? 'active' : ''} onClick={() => useGame.setState({ layer: l })}>{l}</button>)}</div><p className="panel-footnote">Recycling and gardens reduce pollution. Pollution lowers wellbeing and visitor demand. Storms restrict the harbour; rain reduces solar output.</p></>;
}
function Inspector() {
  const game = useGame(s => s.game), id = useGame(s => s.selectedId), b = game.buildings.find(b => b.id === id);
  if (!b) return null;
  const d = CATALOG[b.kind], connected = game.metrics.connected.includes(b.id), Icon = BUILD_ICONS[b.kind] || Store;
  return <aside className="side-panel inspector"><PanelHeading title={d.name} subtitle="ISLAND ADDRESS" /><div className="inspector-illustration" style={{ color: d.color }}><Icon size={80} strokeWidth={.8} /><span>{b.id.toUpperCase()} · {Math.round(b.x * 10)}, {Math.round(-b.z * 10)} m</span></div><p className="panel-intro">{d.description}</p><div className={`connection-status ${connected ? 'positive' : 'negative'}`}><i />{connected ? 'Connected to the harbour' : 'No harbour road connection'}</div>{d.housing && <StatRow label="Housing capacity" value={d.housing} />}{d.jobs && <StatRow label="Jobs supported" value={d.jobs} />}{d.capacity && <StatRow label="Service capacity" value={d.capacity} />}<StatRow label="Daily upkeep" value={`${d.upkeep} credits`} /><StatRow label="Established" value={b.builtDay === 0 ? 'Existing community' : `Day ${b.builtDay}`} /><div className="inspector-actions"><button className="secondary-button" onClick={() => useGame.getState().moveSelected()}><Move size={16} /> Relocate</button><button className="secondary-button danger" onClick={() => { useGame.getState().setTool('bulldoze'); useGame.getState().place(b); }}><Trash2 size={16} /> Remove</button></div><p className="panel-footnote">Relocate for 15% of the construction price. Removal returns 25%.</p></aside>;
}
function Journal() {
  const game = useGame(s => s.game), tutorial = useGame(s => s.tutorial);
  const objectives = OBJECTIVES.filter(o => !game.completedObjectives.includes(o.id));
  return <aside className="journal side-panel"><div className="journal-location"><span className="live-dot" /> ISLAND JOURNAL</div><h2>A community,<br />connected.</h2><p>From a fishing village to a thriving island. Build thoughtfully. Keep the sea close.</p><div className="journal-rule" /><div className="journal-section-title"><strong>Today’s priorities</strong><span>{game.completedObjectives.length}/{OBJECTIVES.length}</span></div><div className="objective-list">{objectives.slice(0, 3).map((o, i) => <div key={o.id}><span className="objective-number">{String(i + 1).padStart(2, '0')}</span><div><strong>{o.title}</strong><p>{o.description}</p><small>+{money(o.reward)} credits</small></div></div>)}{!objectives.length && <div><Check size={22} /><p>Your island is thriving. Keep building a place worth calling home.</p></div>}</div>{tutorial && <div className="tutorial"><small>YOUR FIRST STEPS</small><p>Inspect a building, open <b>Build</b> to add homes, or visit <b>Population</b> to see what your residents need.</p><button className="text-button" onClick={() => useGame.setState({ tutorial: false })}>Got it <ArrowRight size={14} /></button></div>}<button className="text-button journal-plan" onClick={() => useGame.getState().setPanel('build')}>Plan your island <ArrowRight size={16} /></button></aside>;
}
export default function Panels() {
  const panel = useGame(s => s.panel), selectedId = useGame(s => s.selectedId);
  if (selectedId) return <Inspector />;
  if (!panel) return <Journal />;
  return <aside className="side-panel management-panel" aria-label={`${panel} panel`}>{panel === 'build' ? <Construction /> : panel === 'services' ? <Construction services /> : panel === 'roads' ? <Roads /> : panel === 'zones' ? <Zones /> : panel === 'economy' ? <Economy /> : panel === 'population' ? <Population /> : panel === 'transport' ? <Transport /> : <Environment />}</aside>;
}
