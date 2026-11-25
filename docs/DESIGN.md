# PHU QUY ISLAND — interface direction

Full viewport, navigable 3D island; no marketing page. A quiet expedition atlas paired with a functional planning desk. Tropical water, warm sand, olive vegetation, terracotta roofs. Dark translucent deep-teal chrome and restrained mint selection accent; amber construction action.

## Design system before implementation

- Palette: ocean #258c99, shallows #72c8bc, sand #dbd1a8, land #98a97b, chrome #102a2d, surface #18383b, text #eef6ef, muted #a5bfba, accent #83dfbc, action #efbc73, danger #ed8e7b.
- System sans UI stack; native controls 12–14px, panel titles 20px, menu title 64px at desktop, tabular numerical HUD values. No network fonts.
- Full-bleed world. Top strip: brand, location, treasury, population, happiness, weather, pause/menu. Left atlas panel: settlement introduction, objectives or selected-building inspector. Bottom: speed/time and construction dock. Right: compass, overview, layers, diagnostics. Panels use 10px radii, hairline borders, soft shadow. Avoid repeated dashboard cards.
- Lucide line icons, 18–20px, 1.6–2px stroke. Semantic text tooltips on every icon button. Mint active states, visible keyboard focus, no hover-only instructions.
- Construction flow: tool category → asset list with costs → hover ghost → click placement → visible feedback. R rotates, Escape cancels. Road flow: start → endpoint; curve toggle adds a bowed path. Zoning: click/drag cells. Inspect existing objects with pointer.
- Desktop primary: 1440×900; usable 1024×768. Small screens receive compact panels and touch-friendly UI; a desktop recommendation is explicit. No horizontal document overflow.
- Main menu overlays the live world: name, short geographic introduction, new island, continue, settings, credits. New game chooses real-island/sandbox. Pause and settings stop simulation. Save/load includes JSON export/import and recovery notices.
- Economy, people, transport, environment panels show simulation-derived values and causal explanations. Audio opt-in and independent volume control.

## Concept limitation

The image-generation tool is unavailable in this session. Its CLI requires a separately authorized paid API workflow; none is used. This written concept is the implementation reference. No generated-image fidelity claim is made. Actual CC0 glTF assets and code-native Three.js terrain/roads/ocean are intentional for this 3D simulation, rather than raster sprites. Browser plugin is not available; use sequential Playwright Chromium only after checking memory.

## Allowed primary-screen copy

PHU QUY / ISLAND; Phú Quý, Vietnam; Island treasury; Residents; Wellbeing; Main menu; Island journal; A community, connected.; Today's priorities; Plan your island; Build; Roads; Zones; Services; Island economy; Population; Transport; Environment; Save island; Overview; Layers; Pause; Resume; day/time; live weather; dynamic simulation-derived counts and selected-building information.
