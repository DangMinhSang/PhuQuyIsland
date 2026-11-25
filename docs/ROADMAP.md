# Roadmap and release gates

1. Foundation: inspect resources; isolate workspace; initialize stack/Git; pin dependencies and verify build.
2. Geographic world: preserve and process real OSM coastline/roads; document approximations; terrain, beach, ocean, hills, landmarks, settlements and vegetation.
3. Asset library: a small verified CC0 library, original procedural supplements, per-file hash/metadata, load validation and license catalog.
4. City building: camera, selection, construction, rotation, relocation, demolition, roads/curves/bridges/intersections and five-zone growth.
5. Simulation: population, jobs, housing demand, six services, fiscal policy, commerce, fishing/processing/tourism/ports/import/export, traffic and weather.
6. Integration: objectives and guidance, menus, management panels, settings, opt-in audio, persistent slots/recovery/import/export.
7. Continuity: bounded orchestrator, resource admission, exclusive lock, recovery, tests, state/checkpoints.
8. QA and polish: compiler/lint/unit tests, asset validation, browser desktop and compact checks, actual build/save/load/road interactions, screenshots, measured performance, leak checks and endurance.
9. Release: production artifact, stable Git milestone, README/release notes/test evidence, static deployment configuration. A public URL requires an authorized hosting target; absence must remain an explicit unresolved item rather than a fabricated deployment claim.

Authoritative task status is `state/TASKS.json`. No phase is complete solely because its code exists; verify acceptance and record evidence first. Do not claim final photorealistic visuals or ordinary-PC performance from a software-rendered VPS run.
