# PHU QUY ISLAND

A browser-based 3D city-building and island-management game inspired by Phú Quý, Vietnam. Plan a growing coastal community on an OpenStreetMap-derived island, connect homes and services to its harbour, and balance fishing, tourism, trade and the island budget.

**Development build:** the existing desktop gameplay/save flow and compact layout have passed Chromium browser QA; simulation, storage and geometry have automated coverage. Visual polish, broader browser coverage, performance and release verification are still in progress. See [test evidence](docs/TEST_REPORT.md) and the [task queue](state/TASKS.json) for the current status. No public deployment is claimed.

## Run locally

Use Node.js and npm. The current development environment has Node 18.19.1/npm 9.2.0; the repository uses a committed lockfile and bounded single-worker tooling.

```bash
npm ci --legacy-peer-deps --maxsockets=1
npm run dev
```

Open `http://127.0.0.1:4173` in a desktop WebGL2 browser. The development server binds to loopback and does not change web-server configuration. Chrome and Edge with hardware acceleration are the primary targets. All game assets are local; no account or paid API is required.

```bash
npm run build
npm run preview
```

The static website is written to `dist/`. Stop the development server before starting preview: both deliberately use port 4173. On memory-constrained hosts, prefix npm commands with `NODE_OPTIONS=--max-old-space-size=256` and run build, tests and browsers sequentially.

## Play

Begin a **Real island** with a finite budget, or choose **Sandbox** for free construction. Both start with homes, roads, a working harbour and public services. Heights, settlements, populations and economic values are fictional game-scale approximations, not a surveyed or current census representation.

- **Pan:** WASD/arrows or right drag. **Orbit:** middle mouse drag. **Zoom:** wheel. **Overview:** H/Home or the minimap.
- **Build:** choose an address type, hover an open roadside cell, use R to rotate, then click. Placement explains collisions, coastal requirements, slopes and funding problems.
- **Inspect:** click a building to see its connection and upkeep, relocate it for 15% of its price, or remove it for a 25% refund.
- **Roads:** choose street, avenue or bridge; click two endpoints. Curved alignments and shared-cell intersections connect to the same road graph.
- **Zones:** choose a land use and click/drag. Demand, road access and utilities determine whether private development appears at midnight.
- **Manage:** use Economy, Population, Services, Transport and Environment. Taxes trade income for wellbeing; shortages and storms affect growth and maritime income.
- **Time:** Space pauses/resumes; the dock selects 1×, 2× or 4×. Escape cancels the current tool or opens the pause menu.

## Save your island

Two manual slots and a separate autosave stay in this browser's local storage. The preceding valid version is retained as a recovery backup. Use **Save & load → Export JSON** for a portable copy before clearing browser data. Imports are size-limited and validated before replacing the current session. Settings, weather, simulation time, taxes and world objects are included in saves.

## Verification

```bash
npm run lint
npm test
npm run test:autonomous
python3 scripts/asset_validation/validate.py
npm run build
```

The asset-validation command also regenerates the asset catalog and license summary. Browser QA uses one Playwright Chromium instance via `npm run test:browser`; it requires the Playwright browser and compatible system libraries. `--no-screenshots` exercises interactions separately when investigating capture problems, and does not establish visual QA. Browser artifacts are written outside the repository to `/tmp/phu-quy-qa` by default.

The optional Python orchestrator is a **dry run** by default:

```bash
python3 autonomous/orchestrator.py
```

Explicit execution can incur Codex account costs and requires bounded runs, timeout and a positive observed-token ceiling. No daemon, paid worker or automatic service is started by the game or npm scripts. See [architecture](docs/ARCHITECTURE.md) and [decisions](docs/DECISIONS.md).

## Geography, assets and licenses

Original source code is MIT licensed; see [LICENSE](LICENSE). Dependencies retain their own notices in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Coastline and source-road data are **© OpenStreetMap contributors, ODbL 1.0**. This data is not relicensed under the code license. Original snapshots, adapted coordinates and processing scripts ship with the project, with attribution in menus and the HUD. Models from Kenney and Kay Lousberg/KayKit are CC0, with original source declarations and per-file checksums. Original procedural scenery and synthesized ambience supplement the downloaded models. See [asset catalog](docs/ASSET_CATALOG.md), [asset licenses](docs/ASSET_LICENSES.md) and [game scope/limitations](docs/GAME_SPEC.md).
