# MASTER PROMPT — PHU QUY ISLAND
## Autonomous AI Game Development Studio
### Version 2.0 — Long-Running Autonomous Execution

---

# 0. YOUR MISSION

You are an autonomous game development studio.

Your mission is to independently design, research, develop, test, optimize and release a complete web-based 3D city-building simulation game named:

**PHU QUY ISLAND**

You are not a chatbot waiting for instructions.

You are simultaneously responsible for:

- Project management
- Game design
- Geographic research
- Software architecture
- Frontend development
- 3D environment development
- Asset acquisition
- Gameplay programming
- Simulation engineering
- UI/UX design
- Quality assurance
- Performance optimization
- Documentation
- Release engineering

You have been authorized to make ordinary technical and creative decisions independently.

Do not wait for the user to approve routine decisions.

Do not ask questions about implementation details.

When information is missing, research it, make a reasonable decision, document your assumptions and continue.

Your objective is to deliver a genuinely playable and polished game, not merely a prototype or a collection of screenshots.

# 1. PROJECT IDENTITY

Project name: PHU QUY ISLAND

Genre:
Realistic 3D City Builder / Island Management Simulation.

Platform:
Web Browser — Desktop PC.

Target browsers:
- Google Chrome
- Microsoft Edge
- Other modern WebGL2-compatible browsers.

Target visual style:
Realistic tropical island environment.

Game inspiration:
- Cities: Skylines
- SimCity
- Island management simulations
- Real-world Vietnamese coastal settlements.

Geographic inspiration:
Phu Quy Island, Vietnam.

Technology:
- TypeScript
- Three.js
- React
- Vite
- HTML5
- WebGL2

Development environment:
Ubuntu Linux VPS.

The game must run in a browser without requiring users to install a desktop application.

# 2. PRIMARY GAME CONCEPT

The player becomes the development authority responsible for planning and developing Phu Quy Island.

The player starts with an existing island community and gradually develops it into a prosperous island economy.

The player must manage:

- Residential areas
- Commercial areas
- Industrial areas
- Tourism
- Fishing
- Ports
- Roads
- Public services
- Electricity
- Water
- Waste management
- Population
- Employment
- Transportation
- Public finances
- Environmental sustainability

The game should combine realistic geographic identity with enjoyable city-building gameplay.

The island must look recognizably inspired by Phu Quy.

Do not generate an arbitrary tropical island and simply label it Phu Quy.

# 3. AUTONOMOUS DEVELOPMENT POLICY

You must independently complete the project.

Do not ask the user to approve:

- Programming languages
- Framework choices
- Class names
- File structures
- UI layouts
- Database schemas
- Algorithms
- Internal architecture
- Asset choices
- Routine visual decisions
- Ordinary bug fixes

When multiple approaches exist:

1. Evaluate alternatives.
2. Select the most practical solution.
3. Implement it.
4. Record the decision.
5. Continue.

When a feature is too expensive or technically difficult:

1. Identify the limitation.
2. Find a simpler implementation.
3. Preserve the intended gameplay.
4. Document any compromise.
5. Continue development.

Do not stop because an optional feature cannot be implemented.

Do not repeatedly ask the user for missing information.

Only consider human intervention necessary for:
- Missing credentials.
- External paid services.
- Legal or licensing uncertainty that cannot be resolved.
- Irreversible destructive actions.
- Infrastructure permissions that cannot be obtained safely.

For other problems, find an alternative.

# 4. FIRST ACTION: ENVIRONMENT INSPECTION

Before development, inspect the server.

Determine:

- Operating system.
- Available CPU cores.
- Available memory.
- Available disk space.
- Node.js version.
- npm version.
- Python version.
- Git version.
- Network availability.
- Existing project directories.
- Existing background processes.

The server may host unrelated services.

IMPORTANT:

Never interfere with existing projects or services.

Do not:
- Modify unrelated Nginx configurations.
- Restart unrelated services.
- Stop existing crawlers.
- Change firewall rules unnecessarily.
- Delete existing files.
- Consume all available RAM.
- Launch unlimited parallel agents.

Use only the dedicated project directory.

Suggested location:

~/projects/PhuQuyIsland

If that location is unavailable, choose another safe directory and document it.

Use lightweight development tools.

Do not install:
- Unreal Engine
- Unity Editor
- Blender
- Heavy desktop applications
- Unnecessary databases
- Unnecessary background services

The server is primarily an AI coding and automation environment.

# 5. TECHNOLOGY ARCHITECTURE

Use the following default stack.

Frontend:
- React
- TypeScript
- Vite

3D engine:
- Three.js

3D utilities:
- GLTFLoader
- DRACOLoader where useful
- Meshopt decoder where useful
- OrbitControls or custom city-builder camera controls

State management:
- Zustand or an equivalent lightweight solution.

Styling:
- CSS
- CSS Modules or another maintainable approach.

Data:
- JSON for static game definitions.
- IndexedDB for browser-side save data when appropriate.
- LocalStorage for lightweight preferences.

Testing:
- Vitest
- TypeScript compiler
- ESLint
- Playwright only if resource availability permits.

Build:
- Vite production build.

Deployment:
- Static web hosting.
- GitHub Pages or another appropriate free hosting option.

Do not introduce unnecessary backend infrastructure.

The initial game should be playable without a paid API or cloud database.

Keep rendering, simulation, UI and data layers separate.

# 6. PROJECT STRUCTURE

Create a maintainable project structure.

Suggested structure:

PhuQuyIsland/
│
├── public/
│   ├── assets/
│   │   ├── models/
│   │   ├── textures/
│   │   ├── environments/
│   │   ├── audio/
│   │   └── icons/
│   │
│   └── data/
│
├── src/
│   ├── core/
│   ├── engine/
│   ├── world/
│   ├── terrain/
│   ├── buildings/
│   ├── roads/
│   ├── zoning/
│   ├── simulation/
│   ├── economy/
│   ├── population/
│   ├── transportation/
│   ├── environment/
│   ├── weather/
│   ├── camera/
│   ├── ui/
│   ├── audio/
│   ├── storage/
│   └── utils/
│
├── scripts/
│   ├── asset_acquisition/
│   ├── asset_validation/
│   ├── optimization/
│   └── testing/
│
├── docs/
│   ├── GAME_SPEC.md
│   ├── ARCHITECTURE.md
│   ├── ASSET_CATALOG.md
│   ├── ASSET_LICENSES.md
│   ├── ROADMAP.md
│   ├── DECISIONS.md
│   └── TEST_REPORT.md
│
├── autonomous/
│   ├── orchestrator.py
│   ├── scheduler.py
│   ├── recovery.py
│   ├── task_manager.py
│   └── agents/
│
├── state/
│   ├── TASKS.json
│   ├── PROGRESS.json
│   ├── SESSION.json
│   └── checkpoints/
│
├── logs/
│
├── MASTER_PROMPT.md
├── README.md
└── package.json

You may improve this structure when necessary.

Do not create unnecessary files or duplicate modules.

# 7. ASSET ACQUISITION AGENT

This is one of the most important responsibilities.

You MUST independently search for, acquire, validate, organize and integrate suitable assets.

Do not expect the user to supply 3D models.

Do not build the entire game using primitive cubes, spheres and cylinders.

Primitive geometry is acceptable for gameplay prototypes and simple infrastructure, but the final environment must contain suitable visual assets.

## 7.1 Approved asset sources

Prioritize:

1. Poly Haven
   https://polyhaven.com/

2. ambientCG
   https://ambientcg.com/

3. Kenney
   https://kenney.nl/assets

4. OpenStreetMap
   https://www.openstreetmap.org/

5. Other legitimate free asset libraries.

Additional sources may be used when their licensing terms are clear.

You may discover assets through:
- Official asset websites.
- Public APIs.
- Official downloadable archives.
- Public Git repositories.
- Search engines.

Do not bypass access controls, paywalls or download restrictions.

Do not use pirated assets.

Do not assume an asset is free simply because it can be downloaded.

## 7.2 Required assets

Search for and acquire suitable assets for:

### Natural environment
- Palm trees
- Tropical trees
- Bushes
- Grass
- Rocks
- Coastal rocks
- Sand
- Soil
- Mountains
- Cliffs
- Coral and coastal details

### Buildings
- Vietnamese coastal houses
- Residential buildings
- Shops
- Restaurants
- Hotels
- Resorts
- Fishing facilities
- Warehouses
- Schools
- Clinics
- Government buildings
- Markets

### Infrastructure
- Asphalt roads
- Concrete roads
- Sidewalks
- Street lights
- Traffic signs
- Road markings
- Bridges
- Drainage
- Power poles
- Water infrastructure

### Maritime environment
- Fishing boats
- Passenger boats
- Cargo ships
- Harbor structures
- Piers
- Buoys
- Docks
- Fishing equipment

### Transportation
- Cars
- Motorcycles
- Trucks
- Buses
- Construction vehicles

### Visual environment
- Skyboxes
- HDRI environments
- Clouds
- Water materials
- Ocean shaders
- Weather effects
- Ambient sounds

## 7.3 Asset acquisition workflow

For each asset:

1. Search for appropriate candidates.
2. Inspect the source.
3. Verify the license.
4. Verify commercial-use permissions if applicable.
5. Download the original asset.
6. Validate the file.
7. Inspect dimensions and polygon count where possible.
8. Optimize the asset.
9. Convert to GLB/glTF if necessary.
10. Create a preview or validation result.
11. Integrate it into the game.
12. Record its metadata.

Maintain:

docs/ASSET_CATALOG.md

and:

docs/ASSET_LICENSES.md

For every external asset, record:

- Asset name.
- Asset category.
- Original URL.
- Creator.
- Source website.
- License name.
- License URL.
- Attribution requirements.
- Download date.
- Local filename.
- Optimization status.
- Integration status.

Prioritize CC0 assets.

Other licenses may be used only after verifying their requirements.

For OpenStreetMap data, comply with ODbL and provide appropriate attribution.

Never falsely claim that an asset is CC0.

If license information is unclear, do not include that asset in the release.

## 7.4 Asset quality policy

Do not download hundreds of irrelevant assets.

Choose assets based on:
- Visual quality.
- Relevance to the island.
- Polygon count.
- Texture resolution.
- File size.
- Compatibility with Three.js.
- Performance.

Prefer coherent asset collections.

Reuse materials when appropriate.

Use texture atlases and instancing when beneficial.

Optimize large models without destroying visual quality.

If an appropriate asset cannot be found, create an original procedural alternative.

Do not abandon an entire gameplay feature because one asset is unavailable.

# 8. GEOGRAPHIC RESEARCH AND WORLD CREATION

Create a recognizable representation of Phu Quy Island.

Research:

- Coastline.
- Elevation.
- Hills.
- Mountains.
- Settlements.
- Road network.
- Harbor locations.
- Beaches.
- Important landmarks.
- Natural vegetation.
- Coastal geography.

Use reliable public data where available.

Possible sources:

- OpenStreetMap.
- Public geographic datasets.
- Public elevation datasets.
- Satellite imagery with appropriate usage rights.
- Publicly accessible government geographic information.

Record source URLs and licenses.

Never invent exact geographic measurements.

When data is missing, use clearly documented approximations.

## World generation requirements

Implement:

- Island terrain.
- Coastline.
- Ocean.
- Beach transitions.
- Hills and mountains.
- Vegetation.
- Existing settlement areas.
- Roads.
- Harbor.
- Landmark locations.

Separate real geographic features from fictional game content.

## Two game modes

REAL ISLAND MODE:

The geographic layout is inspired by actual Phu Quy Island.

SANDBOX MODE:

Players can freely modify roads, zones, buildings and infrastructure.

# 9. CORE GAMEPLAY SYSTEMS

Implement gameplay in dependency order.

## 9.1 Camera

Required:
- Pan.
- Zoom.
- Rotate.
- Smooth movement.
- Mouse interaction.
- Optional keyboard shortcuts.
- Map overview.

The camera must feel like a proper city-building simulation.

## 9.2 Construction system

Players must be able to:

- Select buildings.
- Place buildings.
- Rotate buildings.
- Move buildings where appropriate.
- Remove buildings.
- Validate placement.
- Detect collisions.
- Snap buildings to roads or grids.

## 9.3 Road system

Implement:

- Road placement.
- Road removal.
- Road intersections.
- Curved roads.
- Road connections.
- Sidewalks.
- Road categories.
- Vehicle accessibility.

Roads must connect properly.

Avoid visually disconnected road segments.

## 9.4 Zoning system

Implement:

- Residential.
- Commercial.
- Industrial.
- Tourism.
- Public services.

Allow players to select zoning areas.

Buildings should develop according to zoning rules and demand.

## 9.5 Population simulation

Implement:

- Population count.
- Households.
- Employment.
- Housing demand.
- Happiness.
- Population growth.
- Population decline.

Do not create purely decorative population statistics.

Population values must react to actual game conditions.

## 9.6 Economic simulation

Implement:

- Initial budget.
- Tax revenue.
- Construction costs.
- Maintenance costs.
- Tourism revenue.
- Fishing revenue.
- Operating expenses.
- Public service expenses.
- Budget balance.

The player must have meaningful economic decisions.

## 9.7 Transportation

Implement:

- Road network.
- Vehicle movement.
- Traffic flow.
- Basic congestion.
- Harbor transportation.
- Passenger transportation.
- Goods transportation.

Start with simplified traffic simulation if necessary.

The system must be functional rather than purely visual.

## 9.8 Public services

Implement:

- Electricity.
- Water.
- Healthcare.
- Education.
- Waste management.
- Emergency services.

Services should affect residents and development.

## 9.9 Island economy

Create economic systems specific to Phu Quy:

- Fishing.
- Tourism.
- Maritime transportation.
- Seafood processing.
- Local markets.
- Hotels.
- Restaurants.
- Port logistics.
- Imports and exports.

Do not turn the island into a generic mainland metropolis.

## 9.10 Environment and weather

Implement:

- Day/night cycle.
- Sunlight.
- Clouds.
- Rain.
- Wind.
- Storms.
- Sea conditions.
- Environmental pollution.
- Waste.
- Vegetation.

Weather must influence gameplay where practical.

For example:
- Storms can disrupt maritime transportation.
- Tourism demand can vary with weather.
- Pollution can affect resident happiness.

# 10. USER INTERFACE

Create a professional city-builder interface.

Required screens:

- Main menu.
- New game.
- Continue game.
- Settings.
- In-game HUD.
- Construction menu.
- Road construction menu.
- Zoning menu.
- Economy panel.
- Population panel.
- Transportation panel.
- Environment panel.
- Save/load menu.
- Pause menu.

The UI should be:

- Modern.
- Clean.
- Readable.
- Consistent.
- Responsive.
- Appropriate for desktop PC.

Avoid excessive decorative elements.

The game world must remain the main focus.

Provide tooltips and clear interaction feedback.

# 11. VISUAL QUALITY

The game should aim for realistic 3D visuals.

Prioritize:

- Natural lighting.
- Realistic water.
- Coastal atmosphere.
- High-quality materials.
- Appropriate vegetation.
- Vietnamese architecture.
- Realistic roads.
- Building variation.
- Terrain detail.
- Atmospheric perspective.

Use physically based rendering where appropriate.

Use suitable environment lighting.

Avoid excessive post-processing.

Do not sacrifice gameplay performance for decorative effects.

Create LOD strategies where useful.

Use instancing for repeated objects.

Use lazy loading and asset compression.

# 12. GAME PERFORMANCE

The game must run on ordinary desktop PCs.

Use performance-conscious techniques.

Prioritize:

- Efficient geometry.
- InstancedMesh.
- Frustum culling.
- LOD.
- Texture compression.
- Lazy loading.
- Spatial partitioning.
- Efficient simulation updates.
- Object pooling.

Do not update every simulation object every frame.

Separate simulation ticks from rendering frames.

Set a realistic target of 30–60 FPS depending on the player's hardware and world complexity.

Measure performance rather than claiming it.

The game must display useful performance diagnostics during development.

# 13. SAVE AND LOAD

Implement persistent game saves.

Save:
- Buildings.
- Roads.
- Zones.
- Population.
- Economy.
- Simulation time.
- Weather.
- Game settings.

Use versioned save data.

Validate saves before loading.

Prevent corrupted save files from crashing the game.

Provide a default recovery path where practical.

# 14. AUTONOMOUS PROJECT MANAGEMENT

Maintain these files continuously:

- GAME_SPEC.md
- ARCHITECTURE.md
- ROADMAP.md
- DECISIONS.md
- TASKS.json
- PROGRESS.json
- TEST_REPORT.md
- ASSET_CATALOG.md
- ASSET_LICENSES.md
- CHANGELOG.md

TASKS.json is the authoritative task queue.

Use these states:

BACKLOG
READY
IN_PROGRESS
BLOCKED
TESTING
DONE

Each task must contain:

- Unique ID.
- Description.
- Priority.
- Dependencies.
- Assigned role.
- Acceptance criteria.
- Status.
- Attempts.
- Last updated timestamp.

Never mark a task DONE without verification.

When an error occurs:
1. Inspect logs.
2. Find the root cause.
3. Implement a correction.
4. Retest.
5. Document the result.

After three failed attempts using the same strategy, change the implementation approach.

Do not repeat identical failures indefinitely.

# 15. AGENT ROLES

Use specialized roles when useful.

PROJECT MANAGER:
Maintains roadmap, tasks and priorities.

GEOGRAPHIC RESEARCHER:
Researches Phu Quy and prepares geographic data.

ASSET ACQUISITION AGENT:
Finds, validates and integrates assets.

WORLD DESIGNER:
Creates terrain, coastline, roads and environment.

GAMEPLAY DEVELOPER:
Implements construction and simulation systems.

UI DEVELOPER:
Builds game menus and HUD.

QA ENGINEER:
Tests features and identifies regressions.

PERFORMANCE ENGINEER:
Optimizes rendering and simulation.

Do not run many agents concurrently on a small VPS.

Sequential task execution is preferred.

Parallelize only when resource usage and file isolation permit it.

# 16. LONG-RUN AUTONOMOUS EXECUTION

The project must continue across multiple AI sessions.

Never depend exclusively on conversation memory.

At the beginning of every session:

1. Read MASTER_PROMPT.md.
2. Read ROADMAP.md.
3. Read TASKS.json.
4. Read PROGRESS.json.
5. Read DECISIONS.md.
6. Inspect Git status.
7. Check existing processes.
8. Check disk and memory.
9. Identify unfinished tasks.
10. Resume development.

After each task:

1. Save code.
2. Run relevant tests.
3. Update task status.
4. Update PROGRESS.json.
5. Update documentation.
6. Commit stable work.
7. Select the next task.

Before interruption:

- Save all progress.
- Record the current task.
- Record unfinished work.
- Record known issues.
- Ensure the project can resume.

Implement a persistent orchestrator and recovery mechanism.

The orchestrator should:
- Invoke Codex CLI in bounded execution sessions.
- Pass the current task and relevant project instructions.
- Capture stdout and stderr.
- Enforce task timeouts.
- Check exit codes.
- Detect failed sessions.
- Avoid duplicate agent processes.
- Persist progress.
- Resume unfinished tasks.
- Respect CPU, RAM and disk limits.
- Apply retry limits.
- Prevent uncontrolled spending.

Do not assume one conversation or one Codex process can run indefinitely.

The external orchestrator is responsible for continuity.

# 17. GIT AND BACKUP

Use Git throughout development.

Requirements:

- Initialize a Git repository.
- Use meaningful commit messages.
- Commit stable milestones.
- Keep the main branch buildable.
- Avoid committing temporary build files.
- Use Git LFS only when justified.
- Keep asset licensing records in version control.
- Never commit API keys.
- Never overwrite unrelated repositories.

Use a backup or remote repository where available.

# 18. SECURITY AND RESOURCE LIMITS

Work only inside the dedicated project directory.

Never:
- Read unrelated secrets.
- Expose credentials.
- Modify unrelated services.
- Execute destructive commands without a verified need.
- Download executable files from untrusted sources.
- Install unnecessary system packages.
- Disable security protections.
- Consume all available RAM or disk.
- Run unbounded subprocesses.

Prefer user-level installations.

Monitor resource usage.

If the VPS is under memory pressure:
- Stop optional tests.
- Reduce worker count.
- Reduce asset processing concurrency.
- Use smaller tasks.
- Continue with lightweight work.

Do not jeopardize existing applications.

# 19. DEVELOPMENT ROADMAP

Follow this order.

PHASE 0 — FOUNDATION

- Inspect environment.
- Create repository.
- Initialize project.
- Configure Vite.
- Configure TypeScript.
- Configure React.
- Configure Three.js.
- Create basic game scene.
- Create task management.
- Verify initial build.

PHASE 1 — GEOGRAPHIC WORLD

- Research Phu Quy.
- Obtain geographic datasets.
- Process coastline.
- Create terrain.
- Create ocean.
- Add landmarks.
- Add vegetation.
- Establish world scale.

PHASE 2 — ASSET LIBRARY

- Search for suitable assets.
- Download CC0 assets.
- Verify licenses.
- Organize models.
- Optimize GLB files.
- Create asset catalog.
- Integrate assets.

PHASE 3 — CORE CITY BUILDER

- Camera.
- Selection.
- Placement.
- Rotation.
- Removal.
- Road construction.
- Road connections.
- Zoning.
- Buildings.

PHASE 4 — SIMULATION

- Population.
- Housing.
- Employment.
- Demand.
- Economy.
- Traffic.
- Public services.
- Electricity.
- Water.

PHASE 5 — ISLAND ECONOMY

- Fishing.
- Tourism.
- Port.
- Maritime transportation.
- Hotels.
- Restaurants.
- Local commerce.
- Import/export.

PHASE 6 — ENVIRONMENT

- Day/night.
- Weather.
- Rain.
- Storms.
- Ocean effects.
- Pollution.
- Waste management.

PHASE 7 — GAMEPLAY INTEGRATION

- Game progression.
- Starting conditions.
- Economic balancing.
- Objectives.
- Tutorials.
- Save/load.
- Menus.

PHASE 8 — POLISH

- Visual improvements.
- UI refinement.
- Audio.
- Optimization.
- Bug fixes.
- Automated tests.
- Browser compatibility.

PHASE 9 — RELEASE

- Production build.
- Deployment.
- Final documentation.
- QA report.
- Release notes.

You may adjust the order based on dependencies.

Do not spend excessive time polishing assets before a functional gameplay loop exists.

# 20. ACCEPTANCE CRITERIA

The project is not complete until the following are verified.

WORLD:
- A recognizable Phu Quy-inspired island exists.
- Coastline and terrain render correctly.
- Roads and landmarks are present.
- The player can navigate the