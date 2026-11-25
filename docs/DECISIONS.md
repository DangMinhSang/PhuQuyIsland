# Decisions

## 2026-11-25

- Use the empty dedicated workspace `/home/azureuser/ghostproject`, not another home directory. Existing services on 80/443/2208/2209/18443 are unrelated and remain untouched. Preview binds loopback 4173 only.
- Host: Linux, 2 vCPU, ~843 MiB physical RAM, ~348 MiB initially available, ~19.4 GiB disk free. Node 18.19.1, npm 9.2.0, Python 3.12.3, Git 2.43.0. Vite 6.4.1 supports Node 18 (verified from npm registry); pin dependencies and lockfile. Run one build/test/browser worker. No parallel agents.
- Original objective attachment is **truncated mid-sentence** at acceptance criterion `The player can navigate the`. Preserve source verbatim in MASTER_PROMPT.md; derive acceptance from the complete preceding requirements rather than inventing a missing remainder.
- No image-generation tool or Browser plugin exists in the supplied toolset. Use a written interface concept, legitimate CC0 3D assets, and resource-limited Playwright validation. Do not make generated-concept fidelity claims.
- Geographic identity uses actual OSM coastline, road and landmark data where obtainable. Heights are explicitly artistic approximations, not surveyed measurements. In-game settlement/population/economy are fictional, scaled for play; no claim of accurate present-day census or administration.
- Prioritize a complete playable loop before photorealistic polish. Keep research, rendering, deterministic simulation, storage, React UI, and development automation separate.
- Never run an unattended paid loop by default. Orchestrator must require explicit run limits and a token cap; no spawned Codex process during ordinary app operation.
- User configured `origin` as `https://github.com/DangMinhSang/PhuQuyIsland` and requested `git push`. Publish the buildable development snapshot on `main` with a normal initial commit; retain unresolved browser/release checks in the test report. Publishing source does not establish a deployed game or a finished release.
