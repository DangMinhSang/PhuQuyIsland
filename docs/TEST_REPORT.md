# Test report

Date: 2026-11-25. Status: **verification in progress; no final release claim**.

## Environment

Linux x86_64, 2 CPUs, ~843 MiB RAM, Node 18.19.1. No Browser plugin is available; use Playwright Chromium as the explicit fallback after verifying memory. Existing host services remain unchanged.

## Initial findings and corrections

- Objective read was blocked by `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`. After the user changed execution permissions, the source was read successfully and preserved as MASTER_PROMPT.md. Source ends in the middle of acceptance section 20.
- npm's first dependency resolution exceeded a 192 MiB heap. Switched to legacy peer resolution, a single connection and a 256 MiB cap; installation succeeded. The interrupted attempt left empty extraneous type directories; explicit tsconfig type entries avoid implicit inclusion. Fresh-lockfile reinstall still needs confirmation.
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

## Remaining release checks

Real-browser gameplay, desktop/compact visual inspection, console/network health, measured rendering performance, resource-leak checks, browser compatibility and a clean-lockfile reinstall still need verification. The previous Playwright smoke run loaded 17 model prototypes but timed out while capturing its first screenshot; no screenshot or complete gameplay flow has passed visual QA.

The source can be published as development work. These checks do not establish final visual fidelity, ordinary-PC performance, public deployment or completion of the full game objective.
