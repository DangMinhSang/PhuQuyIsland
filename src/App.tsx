import { useEffect } from 'react';
import WorldView from './engine/WorldView';
import Hud from './ui/Hud';
import Menus from './ui/Menus';
import { useGame } from './core/store';
import { saveGame } from './storage/saves';
import { useAmbience } from './audio/ambience';

export default function App() {
  useAmbience();
  useEffect(() => {
    const clock = setInterval(() => useGame.getState().advance(), 1000);
    const autosave = setInterval(() => { const s = useGame.getState(); if (s.screen === 'playing' && s.game.settings.autosave) { try { saveGame(s.game, 'autosave'); } catch { s.notify('Automatic save failed. Export a JSON backup from Save & load.'); } } }, 60000);
    return () => { clearInterval(clock); clearInterval(autosave); };
  }, []);
  return <main className="app"><WorldView /><Hud /><Menus /><div className="small-screen-note">Best explored on a desktop with a mouse.</div></main>;
}
