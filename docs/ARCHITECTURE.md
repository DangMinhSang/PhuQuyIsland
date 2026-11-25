# Architecture

## Runtime

- `src/core/types.ts`: versioned serializable domain types. `catalog.ts`: 18 buildable definitions and shared constants. `store.ts`: Zustand commands and transient UI state.
- `src/world/geography.json`: processed OSM coordinates, source and licensing. `geography.ts`: local equirectangular projection, polygon predicates, approximate terrain, placement grid and named features.
- `src/simulation/network.ts`: shared-node adjacency graph, harbour-rooted reachability and BFS routes. `simulation.ts`: deterministic commands, validation and derived daily simulation. No React or Three.js imports in simulation.
- `src/engine`: imperative Three.js renderer owned by one React effect. Rendering reads current store state without updating React every frame. Geometry rebuilds only on corresponding world mutations; daily economic calculations run separately. Assets are cached; vegetation and rocks are instanced. Water shader, daylight, clouds, rainfall and vehicles update in the render loop.
- `src/ui`: shell, HUD, reusable controls, construction and management panels, modal/menu flows. Semantic buttons, labels, keyboard focus and text explanations remain native HTML.
- `src/storage`: strict versioned validation, bounded inputs, copy-on-save backup, slots, settings, JSON import/export. Recompute metrics when loading; ignore untrusted derived metrics. Failed imports never modify the live store.
- `src/audio`: optional original Web Audio synthesized sea ambience, opt-in, cleaned up when disabled.

## Persistence boundaries

Serializable world: buildings/roads/zones, stable IDs, clock, seed, money, population, taxes, weather, completed objectives, bounded history, settings. Transient UI tools, camera position, renderer resources and notifications are intentionally not persisted. `localStorage` is adequate under the strict 3 MB input cap and small initial scene; no database is necessary.

## Tooling

Vite production build, TypeScript strict checks, ESLint, single-worker Vitest, sequential Playwright when memory permits, Python stdlib orchestration/tests and acquisition/validation. Assets are local files; the release needs only static hosting.

## Resource constraints

Server has 2 CPUs/~843 MiB RAM and unrelated services. npm installation uses legacy peer resolution and a 256 MiB V8 heap after a 192 MiB attempt exhausted its heap. Run build/tests/browser sequentially. No heavy graphics editor or database. Development preview only on loopback 4173, and only stop a process started by this project with its known handle.

## Resumption

Read MASTER_PROMPT.md, docs/ROADMAP.md, state/TASKS.json, state/PROGRESS.json, docs/DECISIONS.md; inspect Git/processes/resources. The optional bounded Python orchestrator uses a process lock, atomic state writes, resource admission, child process groups, timeouts and limited retries. It is not a daemon and is not started automatically.
