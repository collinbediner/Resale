# ResaleLane

GitHub source of truth for the ResaleLane storefront, public-safe product documentation, brand system, and design handoff.

- Production: https://shopresalelane.com/
- GitHub Pages: https://collinbediner.github.io/Resale/
- Repository: https://github.com/collinbediner/Resale
- Operating procedure: [docs/SOP.md](docs/SOP.md)
- Handoff: [docs/HANDOFF.md](docs/HANDOFF.md)
- Repository structure: [docs/REPOSITORY-STRUCTURE.md](docs/REPOSITORY-STRUCTURE.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Secret management: [docs/SECRET-MANAGEMENT.md](docs/SECRET-MANAGEMENT.md)
- Product/spec snapshot: [docs/SPEC-SNAPSHOT.md](docs/SPEC-SNAPSHOT.md)
- Full product requirements: [docs/PRD.md](docs/PRD.md)
- Website specification: [docs/WEBSITE-SPEC.md](docs/WEBSITE-SPEC.md)
- Delivery roadmap: [docs/ROADMAP.md](docs/ROADMAP.md)
- Collaborator setup: [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md)
- Brand/design source files: [Design System/design_handoff_resalelane/README.md](Design%20System/design_handoff_resalelane/README.md)

## What This Project Uses

ResaleLane uses a small set of services, each for one clear job:

| Vendor/service | What it does here | Why we use it |
| --- | --- | --- |
| GitHub | Stores code, docs, issues, and the planning board | It is the shared source of truth for collaborators. |
| GitHub Actions | Runs tests, previews, and deploy workflows | It checks changes automatically before publishing them. |
| GitHub Pages | Hosts the public storefront | It is a simple fit for a mostly static site. |
| Cloudflare DNS/proxy | Routes the custom domain | It keeps `shopresalelane.com` pointed at the right public site and private API. |
| Cloudflare Worker | Runs the private API | It handles support, checkout, Stripe webhooks, fulfillment, and operational alerts without exposing secrets in the storefront. |
| Cloudflare D1 | Stores order and support state | It gives the Worker a small SQL database for order, retry, and audit records. |
| Cloudflare R2 | Stores private delivery artifacts | It keeps private package files out of the public repo and browser. |
| Resend | Sends transactional email | It powers support and monitoring emails without exposing mail credentials in frontend code. |
| Stripe | Hosted checkout and payment receipts | It owns card handling, hosted Checkout, and official payment receipts. |

## How It Is Built

The current storefront is a dependency-free static website:

- `site/index.html` contains the page structure and content.
- `site/styles.css` contains the responsive desktop/mobile design.
- `site/app.js` controls the cart, menus, product details, checkout preview, and contact flow.
- `site/cart-logic.js` contains cart rules that can be tested without a browser.
- `site/assets/` contains the public logo and social assets.
- `Design System/design_handoff_resalelane/` contains the original public-safe brand assets, design tokens, product model, and visual reference files.
- `scripts/build.mjs` creates commit-fingerprinted deployment files.
- `worker/` contains the private Cloudflare Worker API.
- `server/` contains backend-safe modules that are not shipped in the static website.
- `test/` contains automated Node.js tests.
- `.github/workflows/` contains testing, preview, and production deployment automation.

The public storefront is intentionally static and public-safe. Private supplier data, payment secrets, and order records do not belong in `site/`.

## Approved Target Architecture

GitHub Pages remains the public storefront host. Checkout and fulfillment now run through a private Cloudflare Worker backend:

1. The browser sends selected product IDs, not prices, to the Worker.
2. The Worker validates those IDs and maps them to authoritative Stripe Price IDs.
3. Stripe hosts Checkout and sends its signed completion webhook to the Worker.
4. The Worker verifies the webhook, records the order in D1, and resolves purchased contact data from private R2 or server-side configuration.
5. Resend sends the fulfillment email from `orders@shopresalelane.com` with the purchased PDF attachments.
6. The Worker records each email-delivery attempt in D1.

The storefront, Git repository, and GitHub Pages deployment must never contain Stripe secrets, buyer records, or private package contact data. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the complete request sequence and environment boundaries.

Production and shared staging keys must live in provider-managed secret stores, not only on one local machine. See [docs/SECRET-MANAGEMENT.md](docs/SECRET-MANAGEMENT.md) for the multi-machine secret workflow.

## How The Main Pieces Fit Together

Today:

1. You edit public storefront files in `site/`.
2. `npm run check` tests the public site, Worker code, docs consistency, and build safety.
3. GitHub Actions runs the same checks on pull requests.
4. If checks pass, GitHub Pages publishes the built static site.
5. Cloudflare keeps the custom domain pointed at the published site.
6. The private Cloudflare Worker powers the support form, checkout creation, Stripe webhook processing, fulfillment email, internal sale alerts, and daily monitor email.
7. Stripe hosts checkout, confirms payment, and sends the signed webhook back to the Worker.
8. The Worker stores safe order state in D1, reads private delivery PDFs from R2, and sends the fulfillment email.

## Technical Implementation Steps

If you are trying to understand or extend the project, this is the normal order:

1. Read `README.md`, `docs/HANDOFF.md`, `docs/ARCHITECTURE.md`, and `docs/SOP.md`.
2. Check the planning issue and project-board status before changing anything.
3. Make public storefront changes in `site/`.
4. Make private API changes in `worker/`.
5. Update docs when architecture, workflow, or behavior changes.
6. Run `npm run check`.
7. Push a branch and let GitHub Actions run tests and preview deployment.
8. Verify the preview or production environment before calling the work done.

## Local Setup For A Beginner

Open PowerShell in the project folder, then:

1. Install packages:

```powershell
npm install
```

2. Run the full repo check:

```powershell
npm run check
```

3. If you are working on Worker configuration, do safe dry runs before live deploys:

```powershell
npx wrangler deploy --env="" --dry-run
npx wrangler deploy --env staging --dry-run
```

## Tests

Run this in PowerShell from the project folder:

```powershell
npm run check
```

This checks JavaScript syntax, docs consistency, prices, cart rules, safety copy, live checkout behavior, Worker routes, and public asset references.

The build creates `dist/` with release-specific asset filenames. `dist/` is generated and is not committed.

## Deployment

The release model intentionally uses two source branches:

- `staging` is the stable preview source and deploys under `/staging/` without changing the production root.
- `main` is the production source and deploys to `https://shopresalelane.com/`.
- `gh-pages` is an automated deployment artifact branch. Do not edit it manually.

The normal path is feature branch -> pull request preview -> tests -> `staging` verification -> `main` production release. A failed automated test blocks deployment. Preview, staging, and production workflows share one deployment queue so they cannot write to GitHub Pages simultaneously.

The `staging` branch deploys to `https://shopresalelane.com/staging/index.html?release=<commit>&fresh=<unique-value>`. Pull requests receive separate preview paths. A daily GitHub Actions job checks production uptime; daily email delivery activates after the Resend secrets are configured.

## Private Worker Environments

- Production API: `https://api.shopresalelane.com`
- Staging API: `https://api-staging.shopresalelane.com`
- Production and staging use separate D1 databases and private R2 buckets.
- The production Resend key is a Cloudflare secret and is not available to staging.
- D1 migrations live in `migrations/` and are applied to staging before production.

Common validation commands:

```powershell
npm run check
npx wrangler deploy --env="" --dry-run
npx wrangler deploy --env staging --dry-run
```

Health checks:

```powershell
curl.exe -sS https://api.shopresalelane.com/health
curl.exe -sS https://api-staging.shopresalelane.com/health
```

Deployment, migrations, and rollback instructions are maintained in `docs/SOP.md`.

### Rollback

Rollback remains available without force-pushing or renaming branches:

1. Identify whether the requested rollback is for `staging` or production (`main`).
2. Find the last known-good commit from Git history and the deployed `release.json` file.
3. Create a normal Git revert commit for the problematic change.
4. Push the revert to `staging`, or merge it into `main`, depending on the requested environment.
5. Wait for tests and deployment to pass, then verify the new `release.json` and fingerprinted asset names.

This preserves the full history and limits the rollback to the environment the user requested.

GitHub is the source of truth for all public-safe project material collaborators need. Google Drive may be used for drafting or private operations, but decisions and usable files must be copied into this repository before they are treated as current.

Private supplier delivery data, credentials, local caches, generated builds, and Google Drive shortcut files are intentionally not committed.
