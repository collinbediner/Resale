# ResaleLane SOP

## Source Of Truth

GitHub is the source of truth for buildable website code, configuration, deployment workflows, and public-safe documentation.

Google Drive is a reference/source-material system only. When a Google Doc changes, copy the relevant decisions into tracked repo files before implementation. Do not treat local Google Drive placeholder files such as `.gdoc`, `.gsheet`, or `.gslides` as source files.

## Drift Control

Before every implementation pass:

1. Run `git status --short --branch`.
2. Pull latest `main` with `git pull --ff-only`.
3. Re-read any linked Google Doc/spec through the connector if the task depends on it.
4. Update tracked docs or app files with the decisions being implemented.
5. Keep private supplier data out of Git. Supplier delivery content belongs server-side only.

## Branch And Preview Flow

Use short branches for changes:

```bash
git switch -c feature/name-of-change
```

Every push should produce a Git-hosted preview:

- Pull requests deploy to a preview path on GitHub Pages.
- `main` deploys to production at `https://shopresalelane.com/` once DNS and Pages custom domain are active.
- Until DNS is live, production is visible at `https://collinbediner.github.io/Resale/`.

## Approval Rule

Do not merge visual or copy changes to `main` until the preview URL has been reviewed. Local preview is acceptable for quick checks, but the approval target should be the GitHub Pages preview whenever possible.

## Payment State

Stripe is not set up yet. Checkout buttons must stay disabled or point to a placeholder state until Stripe products, checkout sessions, webhook secrets, and delivery email flows are configured.

## Deployment Safety

Do not commit:

- `.env` files
- `.wrangler/`
- supplier/private delivery data
- Stripe, Resend, Cloudflare, or GitHub tokens
- Google Drive placeholder files
