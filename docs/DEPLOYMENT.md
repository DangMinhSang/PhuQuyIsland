# Static hosting

The game uses relative asset paths and has no server-side routes. A complete `dist/` directory can be hosted at a domain root or a repository subdirectory. Serve it over HTTP(S), not `file://`, so browser module and model requests have a valid origin.

## GitHub Actions

`.github/workflows/verify.yml` installs the locked dependencies, runs lint, unit/Python tests and model validation, builds the game, and retains a `phu-quy-island-static` artifact with notices and a checksum inventory. Actions are pinned to commits from their official `actions/*` repositories. CI success does not substitute for browser/visual release verification.

GitHub Pages deployment is an explicit manual workflow input. It does not modify another website or the VPS web-server configuration. To use it:

1. In the repository's Settings → Pages, select **GitHub Actions** as the build/deployment source.
2. In Actions → **Verify and package island** → Run workflow, select `main` and enable `deploy_pages`.
3. Inspect the workflow result and its `github-pages` environment URL. That reported URL, followed by real browser checks, establishes deployment evidence.

SSH Git access permits pushing source but does not itself provide a token for changing repository settings or dispatching Actions through the API. No successful CI run, enabled Pages setting or public URL is presumed just because the workflow exists.

## Build inventory

`npm run build` creates `dist/release-manifest.json` listing every release file except the manifest itself, with byte size and SHA-256. It includes the source commit and whether the build was made from a dirty checkout. Original code, runtime dependency, model and geography notices accompany the build.

Before a release, serve the actual artifact and verify local assets, WebGL rendering, interaction, save/export/import, browser console/network health and the repository subdirectory path. Record the actual public URL and verification results in TEST_REPORT.md. Do not infer deployment from the source repository URL.
