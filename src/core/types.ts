export type Point = { x: number; z: number };
export type Mode = 'real' | 'sandbox';
export type BuildingKind = 'house' | 'apartments' | 'market' | 'restaurant' | 'fishery' | 'processing' | 'warehouse' | 'hotel' | 'resort' | 'port' | 'solar' | 'wind' | 'water' | 'clinic' | 'school' | 'waste' | 'fire' | 'park';
export type Service = 'power' | 'water' | 'health' | 'education' | 'waste' | 'safety';
export type Category = 'homes' | 'commerce' | 'island' | 'services';
export type ZoneKind = 'residential' | 'commercial' | 'industrial' | 'tourism' | 'public';
export type RoadKind = 'street' | 'avenue' | 'bridge';
export interface Building extends Point { id: string; kind: BuildingKind; rotation: number; level: number; builtDay: number }
export interface Road { id: string; points: Point[]; kind: RoadKind }
export interface Zone extends Point { kind: ZoneKind }
export type Weather = 'clear' | 'cloudy' | 'rain' | 'storm';
export interface Settings { quality: 'low' | 'medium' | 'high'; volume: number; audio: boolean; shadows: boolean; autosave: boolean; reducedMotion: boolean }
export interface Metrics {
  housing: number; jobs: number; employed: number; happiness: number; pollution: number;
  services: Record<Service, number>; revenue: number; expenses: number; balance: number;
  taxes: number; fishing: number; tourism: number; trade: number; tourists: number;
  connected: string[]; congestion: number; passengers: number; goods: number;
  demand: Record<ZoneKind, number>;
}
export interface Game {
  version: 1; name: string; mode: Mode; seed: number; nextId: number;
  day: number; hour: number; funds: number; population: number; taxRate: number;
  buildings: Building[]; roads: Road[]; zones: Zone[]; weather: Weather;
  history: { day: number; population: number; funds: number; balance: number }[];
  completedObjectives: string[]; metrics: Metrics; settings: Settings;
}
export interface Definition {
  name: string; description: string; category: Category; cost: number; upkeep: number;
  color: string; housing?: number; jobs?: number; service?: Service; capacity?: number;
  pollution?: number; visitors?: number; model?: string; footprint?: number;
}
export type Tool = 'inspect' | 'bulldoze' | 'move' | 'road' | 'zone' | BuildingKind;
export type Panel = 'build' | 'roads' | 'zones' | 'services' | 'economy' | 'population' | 'transport' | 'environment' | null;
export type Screen = 'menu' | 'new' | 'playing' | 'pause' | 'saves' | 'settings' | 'credits';
