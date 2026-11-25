import { useEffect } from 'react';
import { useGame } from '../core/store';

export function useAmbience() {
  const enabled = useGame(s => s.game.settings.audio), volume = useGame(s => s.game.settings.volume);
  useEffect(() => {
    if (!enabled) return;
    const context = new AudioContext();
    const buffer = context.createBuffer(1, context.sampleRate * 5, context.sampleRate), data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) { last = (last + (Math.random() * 2 - 1) * .02) / 1.02; data[i] = last * 3.5; }
    const source = context.createBufferSource(); source.buffer = buffer; source.loop = true;
    const lowpass = context.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = 850;
    const gain = context.createGain(); gain.gain.value = volume * .35;
    source.connect(lowpass); lowpass.connect(gain); gain.connect(context.destination); source.start();
    const resume = () => void context.resume(); window.addEventListener('pointerdown', resume);
    void context.resume();
    return () => { window.removeEventListener('pointerdown', resume); source.stop(); void context.close(); };
  }, [enabled, volume]);
}
