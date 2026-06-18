# ResaleLane

GitHub source of truth for the ResaleLane storefront, public-safe product documentation, brand system, and design handoff.

- Production: https://shopresalelane.com/
- GitHub Pages: https://collinbediner.github.io/Resale/
- Repository: https://github.com/collinbediner/Resale
- Operating procedure: [docs/SOP.md](docs/SOP.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Product/spec snapshot: [docs/SPEC-SNAPSHOT.md](docs/SPEC-SNAPSHOT.md)
- Full product requirements: [docs/PRD.md](docs/PRD.md)
- Website specification: [docs/WEBSITE-SPEC.md](docs/WEBSITE-SPEC.md)
- Delivery roadmap: [docs/ROADMAP.md](docs/ROADMAP.md)
- Collaborator setup: [CONTRIBUTING.md](CONTRIBUTING.md)
- Brand/design source files: [Design System/design_handoff_resalelane/README.md](Design%20System/design_handoff_resalelane/README.md)

## How It Is Built

The current storefront is a dependency-free static website:

- `site/index.html` contains the page structure and content.
- `site/styles.css` contains the responsive desktop/mobile design.
- `site/app.js` controls the cart, menus, product details, checkout preview, and contact flow.
- `site/cart-logic.js` contains cart rules that can be tested without a browser.
- `site/assets/` contains the public logo and social assets.
- `Design System/design_handoff_resalelane/` contains the original public-safe brand assets, design tokens, product model, and visual reference files.
- `scripts/build.mjs` creates commit-fingerprinted deployment files.
- `server/` contains backend-safe modules that are not shipped in the static website.
- `test/` contains automated Node.js tests.
- `.github/workflows/` contains testing, preview, and production deployment automation.

There is no public backend yet. Stripe payments and private supplier delivery must not be added to the static frontend.

## Tests

Run this in PowerShell from the project folder:

```powershell
npm run check
```

This checks JavaScript syntax and tests prices, cart rules, safety copy, disabled checkout, and public asset references.

The build creates `dist/` with release-specific asset filenames. `dist/` is generated and is not committed.

## Deployment

1. A push or pull request starts GitHub Actions.
2. The `Test Website` workflow runs the automated checks.
3. A failed test blocks that deployment.
4. A successful push to `main` publishes `site/` to the `gh-pages` branch.
5. GitHub Pages serves the site through the Cloudflare-managed custom domain.

The `staging` branch deploys to `https://shopresalelane.com/staging/index.html?release=<commit>&fresh=<unique-value>`. Pull requests receive separate preview paths. A daily GitHub Actions job checks production uptime; daily email delivery activates after the Resend secrets are configured.

GitHub is the source of truth for all public-safe project material collaborators need. Google Drive may be used for drafting or private operations, but decisions and usable files must be copied into this repository before they are treated as current.

Private supplier delivery data, credentials, local caches, generated builds, and Google Drive shortcut files are intentionally not committed.
