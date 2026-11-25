# PHU QUY ISLAND — game specification

## Goal and scope

A desktop-browser 3D island-management simulation using React, TypeScript, Three.js and Vite. Begin with a fictional, scaled existing community on an actual OSM-derived Phú Quý coastline. Grow a prosperous community while balancing jobs, housing, utilities, public services, maritime income and environmental quality.

The attached MASTER_PROMPT.md is authoritative and preserved verbatim, including its truncated final acceptance sentence. This specification derives explicit acceptance from the complete requirements in sections 0–19. No missing attachment content is presumed.

## Play loop

1. Main menu → choose Real island or Sandbox → name the community.
2. Inspect existing addresses and road/harbour connectivity.
3. Place/rotate/relocate buildings on the 100 m planning grid; collision, steep-slope, funds, road-access and coastal-site checks give a reason when blocked.
4. Extend streets, avenues or bridges with straight/curved alignments. Shared cells make intersections. Remove individual cells and split connectivity.
5. Zone residential/commercial/industrial/tourism/public cells by dragging. Suitable private plots develop according to demand, services and access.
6. Simulate daily population, income and expenditure. Six services cover road-connected homes within capacity and range. Employment, taxes, pollution and congestion influence wellbeing. Well-supplied, happy settlements grow; shortages drive decline.
7. Invest in fishing, processing, warehouses, restaurants and hotels. Harbours gate trade and visitors. Weather changes output and demand.
8. Reach five sequentially independent community objectives and earn treasury grants. Continue building after completion.
9. Save in two manual slots or autosave, export/import JSON, resume on the same device. Previous valid saves provide recovery.

## Model conventions

- Horizontal world scale: approximately 10 m / render unit; planning grid 10 units (~100 m), exaggerated building sizes for legibility. Heights are artistic, not elevation data.
- A tick advances 1/2/4 game hours each real second. Budget/population settle once per simulated midnight. Rendering is independent; pausing and menus stop the simulation.
- All monetary values are fictional scaled planning credits, not real construction prices.
- Model 58% of residents as workers; households are an approximate four residents. These are gameplay assumptions, not a local census.
- Revenue: resident/job tax, catch sales, visitors and goods. Expenses: building maintenance, services, roads and resident supplies.
- Sea output factors: clear/cloudy 100%, rain 65%, storm 10%. Solar output falls in rain and storms; wind output rises with wind. Storms lower wellbeing. Waste/industrial activity contributes to pollution; parks/recycling reduce it.
- No hidden server, account, telemetry, paid API or authoritative live weather. Every value is local game state.
- 500 buildings, 500 road alignments, 2,000 zoned cells; history 90 days. Save input capped at 3 MB and validated before mutation.

## Acceptance matrix

| Requirement | Implementation | Verification |
|---|---|---|
| Real geographic identity, coastline, islets, hills, landmarks, roads, beach, vegetation | OSM snapshot + projection + original terrain and water | source hashes, geography tests, rendered overview |
| Camera pan/zoom/orbit/overview | OrbitControls, WASD/arrows, mouse wheel, middle drag, H | browser interaction and screenshots |
| Construction/select/rotate/move/remove/collisions/snap | catalog, simulation commands, ghost feedback, inspector | unit and browser workflows |
| Connected roads/intersections/curves/categories/bridges/removal | graph-based grid roads and curved rendered ribbons | pathfinding and split-road tests; browser road flow |
| Five zone classes, area painting, demand development | zones + daily private development | simulation and pointer-drag tests |
| Population/housing/households/employment/wellbeing/growth/decline | deterministic daily model | positive/negative-condition tests and endurance run |
| Budget/taxes/maintenance/service/fishing/tourism/trade costs | derived daily ledger, tax slider | revenue and budget tests |
| Road vehicles, congestion, passenger/goods sea links | routed cars, harbour/network-constrained economy | route tests, disconnected-island tests, rendered movement |
| Electricity/water/health/education/waste/emergency | capacity, range and connected-network coverage | provider removal and coverage tests |
| Day/night/cloud/rain/wind/storm/pollution | lights, shaders, particles, windmill animation, deterministic weather | weather tests and rendering |
| All required menus and management panels | semantic React controls | browser menu/panel/keyboard tests |
| Persistent saves, settings, recovery, validation | versioned localStorage + JSON | unit and real-browser persistence/corruption tests |
| Licensed non-primitive assets, catalog, metadata, attribution | CC0 Kenney/KayKit models, source licenses, manifest | asset validator and browser asset loading |
| Measured performance and diagnostics | renderer counters, memory-constrained tooling | test report; no unsupported 30–60 FPS claim |
| Autonomous resumability | task/progress files, bounded orchestrator, recovery lock | Python tests and dry run |
| Git/build/static deployment/release docs | repository, production build, Pages workflow | build/CI checks; public deployment recorded separately |

## Intentional simplifications requiring honest release notes

The asset collections are coherent and low-poly rather than photorealistic. Original palms, boats and utility infrastructure supplement downloaded glTF buildings, cars, vegetation and props. Landmarks other than the sourced OSM peak and exact coastline are approximate positions; heights are synthetic. Traffic uses graph routes and aggregate capacity, not per-agent deliveries or microscopic lane simulation. Roads are snapped to a planning grid; curved alignments approximate a smooth arc. No complex disasters, land terraforming or zoning parcel subdivision is promised by this release. Sandbox permits free construction and removal but preserves the actual coastline.
