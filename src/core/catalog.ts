import type { BuildingKind, Definition, Service, Settings, ZoneKind } from './types';

export const CATALOG: Record<BuildingKind, Definition> = {
  house: { name: 'Coastal home', description: 'A tiled-roof home for island families.', category: 'homes', cost: 1800, upkeep: 8, color: '#e3c1a0', housing: 16, jobs: 0 },
  apartments: { name: 'Village apartments', description: 'Compact housing near the town centre.', category: 'homes', cost: 6800, upkeep: 28, color: '#e4d5bb', housing: 56 },
  market: { name: 'Local market', description: 'Connect households to local food and commerce.', category: 'commerce', cost: 4200, upkeep: 24, color: '#d0aa77', jobs: 24 },
  restaurant: { name: 'Seafood restaurant', description: 'Local catches, shared tables and visitor spending.', category: 'commerce', cost: 5200, upkeep: 32, color: '#d99870', jobs: 20, visitors: 12 },
  fishery: { name: 'Fishing cooperative', description: 'Catches and exports seafood. Needs a coastal site.', category: 'island', cost: 7500, upkeep: 45, color: '#78aaa5', jobs: 32, pollution: 2 },
  processing: { name: 'Seafood processing', description: 'Adds value to catches, with an environmental cost.', category: 'island', cost: 11000, upkeep: 65, color: '#a7adb0', jobs: 42, pollution: 12 },
  warehouse: { name: 'Port warehouse', description: 'Increases the capacity of island imports and exports.', category: 'island', cost: 8500, upkeep: 40, color: '#a0b3ad', jobs: 18, pollution: 3 },
  hotel: { name: 'Island guesthouse', description: 'Welcomes visitors when services and sea conditions allow.', category: 'commerce', cost: 13500, upkeep: 72, color: '#e5d1b1', jobs: 28, visitors: 55 },
  resort: { name: 'Beach retreat', description: 'High-value tourism. Keep the coastline clean.', category: 'commerce', cost: 24500, upkeep: 130, color: '#d4bd99', jobs: 45, visitors: 100, footprint: 1.5 },
  port: { name: 'Passenger harbour', description: 'The gateway for passengers, supplies and trade. Coastal sites only.', category: 'island', cost: 32000, upkeep: 100, color: '#91a9a3', jobs: 36, pollution: 4 },
  solar: { name: 'Solar garden', description: 'Clean electricity for 180 residents. Cloud cover lowers output.', category: 'services', cost: 8000, upkeep: 32, color: '#5b8c9e', jobs: 4, service: 'power', capacity: 180 },
  wind: { name: 'Wind turbine', description: 'Clean power for 280 residents; stronger winds raise output.', category: 'services', cost: 11500, upkeep: 45, color: '#c7dbd6', jobs: 5, service: 'power', capacity: 280 },
  water: { name: 'Water station', description: 'Desalination and storage for 350 residents.', category: 'services', cost: 9500, upkeep: 55, color: '#85bdc0', jobs: 8, service: 'water', capacity: 350 },
  clinic: { name: 'Community clinic', description: 'Neighbourhood healthcare for 420 residents.', category: 'services', cost: 12500, upkeep: 85, color: '#e4d7c9', jobs: 18, service: 'health', capacity: 420 },
  school: { name: 'Island school', description: 'Learning and better prospects for 420 residents.', category: 'services', cost: 10500, upkeep: 65, color: '#e0c9a5', jobs: 14, service: 'education', capacity: 420 },
  waste: { name: 'Recycling centre', description: 'Collects waste for 450 residents and reduces pollution.', category: 'services', cost: 9000, upkeep: 60, color: '#a6ba90', jobs: 12, service: 'waste', capacity: 450, pollution: -9 },
  fire: { name: 'Rescue station', description: 'Emergency response and storm resilience for 500 residents.', category: 'services', cost: 11000, upkeep: 65, color: '#c99580', jobs: 16, service: 'safety', capacity: 500 },
  park: { name: 'Coastal garden', description: 'A little shade, cleaner air and happier neighbours.', category: 'services', cost: 2200, upkeep: 12, color: '#8fbc79', pollution: -4 },
};
export const SERVICE_NAMES: Record<Service, string> = { power: 'Electricity', water: 'Clean water', health: 'Healthcare', education: 'Education', waste: 'Waste collection', safety: 'Emergency response' };
export const ZONE_COLORS: Record<ZoneKind, string> = { residential: '#7cba83', commercial: '#6baac8', industrial: '#d5b16e', tourism: '#b694ce', public: '#ce9286' };
export const ZONE_BUILDING: Record<ZoneKind, BuildingKind> = { residential: 'house', commercial: 'market', industrial: 'processing', tourism: 'hotel', public: 'park' };
export const DEFAULT_SETTINGS: Settings = { quality: 'medium', volume: 0.2, audio: false, shadows: true, autosave: true, reducedMotion: false };
export const money = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
export const clamp = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));
