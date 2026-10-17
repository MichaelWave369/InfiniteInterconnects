# GitHub Pages launch

Infinite Interconnects is a static React/Vite **reference simulator**, not a real networking backend. The workflow publishes only the compiled dist/ directory and does not connect to any live Porch, Commons, or Kingdom systems.

## One-time admin setup

1. Open https://github.com/MichaelWave369/InfiniteInterconnects/settings/pages
2. Under **Build and deployment → Source**, choose **GitHub Actions** and save.
3. Merge the Pages launch PR into main. This starts the **Publish Infinite Interconnects** workflow.
4. Under Actions, verify that both build and deploy succeeded.
5. Open https://michaelwave369.github.io/InfiniteInterconnects/

If the workflow ran before you enabled Pages, use **Actions → Publish Infinite Interconnects → Run workflow** on main after saving the setting.

## Verification gates

- npm test verifies explicit grants, default deny, and redacted receipts.
- npm run build compiles the static React app.
- node scripts/verify-pages.mjs checks that generated JS/CSS references are beneath /InfiniteInterconnects/ and exist on disk.
- The deploy job requires the build job and holds pages:write and id-token:write permissions.
- A github-pages environment distinguishes production deployments.
- No deployment secrets, API keys or server processes are required.

## Run locally

    npm install
    npm test
    npm run build
    node scripts/verify-pages.mjs
    npm run dev

## Troubleshooting

- **Pages not enabled / site not found:** Choose GitHub Actions in Settings → Pages, then rerun the workflow.
- **Resource not accessible by integration:** Check Actions policies and Pages deployment permissions.
- **404 JS/CSS:** Confirm the Vite base is /InfiniteInterconnects/ and the asset verification step passed.
- **Site stale:** Check the latest successful deployment run, not merely the build.
- **No live network activity:** Expected. All identities and routes are simulated. Real integrations need separate contracts, approval and security testing.
