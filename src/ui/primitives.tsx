import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { X, Waves } from 'lucide-react';
import { useGame } from '../core/store';

export function Brand({ large = false }: { large?: boolean }) {
  return <div className={`brand ${large ? 'brand-large' : ''}`}><Waves aria-hidden="true" strokeWidth={1.3} /><div><strong>PHU QUY</strong><span>ISLAND</span></div></div>;
}
export function IconButton({ label, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return <button className="icon-button" aria-label={label} title={label} {...props}>{children}</button>;
}
export function PanelHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return <header className="panel-heading"><div><small>{subtitle}</small><h2>{title}</h2></div><IconButton label="Close panel" onClick={() => useGame.getState().cancel()}><X size={18} /></IconButton></header>;
}
export function Meter({ label, value, color, suffix = '%' }: { label: string; value: number; color?: string; suffix?: string }) {
  return <div className="meter"><div><span>{label}</span><strong>{Math.round(value)}{suffix}</strong></div><div className="meter-track"><i style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color || (value > 70 ? 'var(--mint)' : value > 35 ? 'var(--amber)' : 'var(--danger)') }} /></div></div>;
}
export function StatRow({ label, value, positive }: { label: string; value: ReactNode; positive?: boolean }) { return <div className="stat-row"><span>{label}</span><strong className={positive === undefined ? '' : positive ? 'positive' : 'negative'}>{value}</strong></div>; }
