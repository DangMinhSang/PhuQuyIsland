import { Anchor, Building2, ChevronDown, CircleHelp, Compass, FastForward, Leaf, Map, Menu, MousePointer2, Pause, Play, Route, Save, Smile, Trash2, Users, Wallet, Waves, X, Zap, CloudSun, CloudRain, Wind, TrendingUp, Crosshair } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useGame } from '../core/store';
import { money } from '../core/catalog';
import type { Panel } from '../core/types';
import { COASTLINES } from '../world/geography';
import { saveGame } from '../storage/saves';
import { Brand, IconButton } from './primitives';
import Panels from './Panels';

const TOOLS: { id: NonNullable<Panel>; label: string; icon: typeof Building2 }[] = [{ id: 'build', label: 'Build', icon: Building2 }, { id: 'roads', label: 'Roads', icon: Route }, { id: 'zones', label: 'Zones', icon: Map }, { id: 'services', label: 'Services', icon: Zap }, { id: 'economy', label: 'Economy', icon: TrendingUp }, { id: 'population', label: 'Population', icon: Users }, { id: 'transport', label: 'Transport', icon: Anchor }, { id: 'environment', label: 'Environment', icon: Leaf }];
function MiniMap() {
  const buildings = useGame(s => s.game.buildings);
  return <button className="minimap" title="Return to island overview (H)" aria-label="Island overview" onClick={() => useGame.setState(s => ({ overviewToken: s.overviewToken + 1 }))}><svg viewBox="-270 -380 700 850" role="img" aria-label="Phú Quý coastline overview">{COASTLINES.map((c, i) => <polygon key={i} points={c.map(p => `${p.x},${p.z}`).join(' ')} fill={i === 0 ? '#8da78e' : '#74968a'} stroke="#bed6b3" strokeWidth="2" />)}{buildings.map(b => <circle key={b.id} cx={b.x} cy={b.z} r="3.8" fill="#ead3a3" />)}</svg><span>N</span><small>PHÚ QUÝ</small><Crosshair size={14} /></button>;
}
function Toast() {
  const message = useGame(s => s.message), messageId = useGame(s => s.messageId), [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(true); const timer = setTimeout(() => setVisible(false), 6000); return () => clearTimeout(timer); }, [messageId]);
  return visible && message ? <div className="toast" role="status"><Waves size={18} /><span>{message}</span><button aria-label="Dismiss notification" onClick={() => setVisible(false)}><X size={14} /></button></div> : null;
}
export default function Hud() {
  const game = useGame(s => s.game), speed = useGame(s => s.speed), panel = useGame(s => s.panel), tool = useGame(s => s.tool), screen = useGame(s => s.screen);
  const [help, setHelp] = useState(false);
  const WeatherIcon = game.weather === 'storm' ? Wind : game.weather === 'rain' ? CloudRain : CloudSun;
  if (screen !== 'playing') return null;
  return <div className="hud">
    <header className="topbar"><Brand /><div className="topbar-location"><span>Phú Quý, Vietnam</span><small>{game.mode === 'sandbox' ? 'SANDBOX' : 'REAL ISLAND MODE'}</small></div><div className="hud-stats"><div title="Available island treasury in scaled game credits"><Wallet size={19} /><span><small>Island treasury</small><strong data-testid="funds">{money(game.funds)}</strong></span><em className={game.metrics.balance >= 0 ? 'positive' : 'negative'}>{game.metrics.balance >= 0 ? '+' : ''}{money(game.metrics.balance)} / day</em></div><button onClick={() => useGame.getState().setPanel('population')} title="Open population and services"><Users size={19} /><span><small>Residents</small><strong data-testid="residents">{money(game.population)}</strong></span></button><button onClick={() => useGame.getState().setPanel('population')} title="Community wellbeing"><Smile size={19} /><span><small>Wellbeing</small><strong>{game.metrics.happiness}<em>%</em></strong></span></button></div><div className="top-weather" title="Simulated island weather"><WeatherIcon size={23} strokeWidth={1.4} /><span>{game.weather}<small>{game.weather === 'storm' ? 'Rough seas' : game.weather === 'rain' ? 'Showers' : 'Trade winds'}</small></span></div><IconButton label="Main menu" onClick={() => useGame.getState().setScreen('pause')}><Menu size={21} /></IconButton></header>
    <Panels />
    <div className="map-controls"><div className="compass"><Compass size={35} strokeWidth={1} /><span>N</span></div><IconButton label="Overview (H)" onClick={() => useGame.setState(s => ({ overviewToken: s.overviewToken + 1 }))}><Crosshair size={20} /></IconButton><IconButton label="Map layers" onClick={() => useGame.getState().setPanel('environment')}><Map size={20} /></IconButton><IconButton label="Controls and help" onClick={() => setHelp(!help)}><CircleHelp size={20} /></IconButton></div>
    <MiniMap />
    {help && <div className="help-panel"><header><h3>Make yourself at home</h3><IconButton label="Close help" onClick={() => setHelp(false)}><X size={16} /></IconButton></header><dl><dt>Pan</dt><dd>WASD / arrows / right drag</dd><dt>Orbit</dt><dd>Middle mouse drag</dd><dt>Zoom</dt><dd>Mouse wheel</dd><dt>Place / inspect</dt><dd>Left click</dd><dt>Rotate building</dt><dd>R</dd><dt>Cancel / pause</dt><dd>Escape</dd><dt>Pause simulation</dt><dd>Space</dd><dt>Overview</dt><dd>H / Home</dd><dt>Bulldozer</dt><dd>Delete</dd></dl><p>Red previews explain invalid placement. Every address needs road access.</p></div>}
    <div className="bottom-area"><div className="time-control"><div className="day-label"><strong>DAY {String(game.day).padStart(2, '0')}</strong><span>{String(Math.floor(game.hour)).padStart(2, '0')}:00 <ChevronDown size={12} /></span></div><div className="speed-buttons"><IconButton label={speed ? 'Pause simulation' : 'Resume simulation'} onClick={() => useGame.getState().setSpeed(speed ? 0 : 1)}>{speed ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}</IconButton>{[1, 2, 4].map(n => <button key={n} title={`${n}× simulation speed`} aria-label={`${n}× simulation speed`} aria-pressed={speed === n} className={speed === n ? 'active' : ''} onClick={() => useGame.getState().setSpeed(n)}>{n === 1 ? <Play size={13} /> : <FastForward size={13} />}<small>{n}×</small></button>)}</div></div>
      <nav className="construction-dock" aria-label="Island planning tools"><div className="dock-tools">{TOOLS.map(t => <button key={t.id} className={panel === t.id ? 'active' : ''} aria-pressed={panel === t.id} onClick={() => useGame.getState().setPanel(t.id)} title={t.label}><t.icon size={21} strokeWidth={1.55} /><span>{t.label}</span>{panel === t.id && <i />}</button>)}</div><div className="dock-utilities"><IconButton label="Inspect addresses" onClick={() => useGame.getState().cancel()} aria-pressed={tool === 'inspect'}><MousePointer2 size={19} /></IconButton><IconButton label="Bulldoze (Delete)" onClick={() => useGame.getState().setTool('bulldoze')} aria-pressed={tool === 'bulldoze'}><Trash2 size={19} /></IconButton><IconButton label="Save island" onClick={() => { try { saveGame(game); useGame.getState().notify('Island saved in slot 1. A previous version is kept for recovery.'); } catch (e) { useGame.getState().notify(e instanceof Error ? e.message : 'Saving failed. Try exporting a JSON backup.'); } }}><Save size={19} /></IconButton></div></nav>
    </div>
    <footer className="map-attribution"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors · ODbL</a><span>Geographic inspiration · fictional community & economy</span></footer>
    <Toast />
  </div>;
}
