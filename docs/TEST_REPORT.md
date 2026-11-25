# Test report

Date: 2026-11-25. Status: **verification in progress; no final release claim**.

## Environment

Linux x86_64, 2 CPUs, ~843 MiB RAM, Node 18.19.1. No Browser plugin is available; use Playwright Chromium as the explicit fallback after verifying memory. Existing host services remain unchanged.

## Initial findings and corrections

- Objective read was blocked by `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`. After the user changed execution permissions, the source was read successfully and preserved as MASTER_PROMPT.md. Source ends in the middle of acceptance section 20.
- npm's first dependency resolution exceeded a 192 MiB heap. Switched to legacy peer resolution, a single connection and a 256 MiB cap. Eight lockfile entries contained only `dev: true`; removed those incomplete entries and regenerated package metadata with npm while preserving pinned root dependencies. A clean `npm ci --ignore-scripts --no-audit --no-fund` installed 260 packages without damaged-lockfile warnings; `npm ls --depth=0` passed. npm reports the pinned ESLint version as unsupported; upgrading tooling remains a maintenance item.
- Kenney website public download-link endpoint returned HTTP 403. Did not bypass it. Changed to creators' official public GitHub repositories and verified explicit CC0 declarations. Acquisition succeeded: 8 Kenney files (317,316 bytes), 19 KayKit files (399,548 bytes).
- First compiler run exposed a literal-boolean inference issue in save-slot `flatMap`. Added explicit `SaveInfo` generic.
- Pre-push Python verification found two test fixtures missing `diskFree`, which the runner now monitors. Updated those fixtures to include available disk space; all eight orchestration tests pass without stream resource warnings.

## Verified before initial GitHub push

- `NODE_OPTIONS=--max-old-space-size=256 npm run build`: passed TypeScript and Vite production build. The Three.js chunk is 585.22 kB before gzip and produces a bundle-size warning.
- `NODE_OPTIONS=--max-old-space-size=192 npm test`: 34 tests passed across simulation and save storage, including a deterministic 120-day simulation endurance check.
- `NODE_OPTIONS=--max-old-space-size=192 npm run lint`: passed.
- `npm run test:autonomous`: eight tests passed after the fixture correction; tests use fake child commands and do not launch Codex.
- Asset validator `validate()`: passed for 17 models, 10,017 source triangles and 726,972 bytes of external model/dependency files. Source checksums and local glTF dependencies were checked.
- Files selected for publication exclude dependency installs, build output, browser tooling, runtime logs, local environment files and session state. A bounded scan found no common API tokens, private-key headers or credential-bearing URLs; this is not an exhaustive security audit.

## Verified development milestone after initial push

- Current source: production build and lint passed; **36 Vitest tests** across simulation, storage and merged boat geometry passed; **eight Python tests** passed; all **17 external models** passed structural/checksum/dependency validation (10,017 source triangles, 726,972 external bytes).
- The intersection demolition regression proves all overlapping alignments are split, the removed node is absent and the four arms no longer route through it. Boat geometry normalizes indexed and non-indexed inputs before merging.
- Build includes code, dependency, asset and release notices plus a SHA-256 inventory: **44 files / 1,932,768 bytes** at this milestone. Source commit/dirty state is recorded rather than implying an uncommitted build is a clean release.
- The completed Playwright run at `http://127.0.0.1:4173` used Chromium Headless Shell 141/SwiftShader, low quality, reduced motion, 1440×900 desktop and 390×844 compact viewports. Browser plugin not available.
- Passed meaningful menu/title and 17-model loading; new named Real island (30 buildings/176 residents/288 housing); keyboard pan, wheel zoom and overview; pointer placement, R rotation, collision rejection and costs; inspect/relocate/remove; paid curved road; zone painting and population growth at midnight; Economy/Population/Transport/Environment/Services; tax slider; two manual slots, JSON export, safe invalid import; reload/Continue persistence; graphics/audio settings; compact layout without document overflow.
- Browser report contains **zero page/console errors, zero warnings and zero HTTP failures**. Evidence: `/tmp/phu-quy-qa/report.json`; seven screenshots `01-menu.png` through `07-final-desktop.png`. Menu, island overview, economy and compact screenshots were visually inspected. CDP capture with `fromSurface:false` succeeded after ordinary screenshot capture had stalled; the complete run exited successfully.
- Initial low-quality overview measured **205 draw calls, 150,095 triangles, 134 geometries, 17 textures**. These are on-demand resource counters, not a continuous FPS measurement. Reduced motion now shows “On demand”; normal rendering has a 30/60 FPS cap, which is not a measured achieved rate.

## Remaining release checks

Middle-drag orbit, all five zone classes, valid import, browser corruption recovery, autosave timing, repeated-edit resource bounds, continuous-render performance, production/subdirectory hosting, browser compatibility and public deployment remain unverified. Stylized assets, sparse settlement at overview, regular water highlights and coarse terrain remain visible fidelity gaps. The final master requirement audit has not passed.

The source can be published as development work. These checks do not establish final visual fidelity, ordinary-PC performance, public deployment or completion of the full game objective.
