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

## Required Testing

Before every commit:

1. Run `npm run check` from the project folder.
2. Fix every failure before committing.
3. For visual changes, inspect both desktop and mobile layouts in the browser.
4. Test the affected user flow, such as navigation, cart, product details, or checkout preview.

The automated suite currently checks:

- JavaScript syntax
- Product and bundle prices
- Duplicate cart prevention
- Bundle/individual conflict rules
- Disabled Stripe checkout
- Required legal/support content
- Missing local assets

## Branch And Preview Flow

Use short branches for changes:

```bash
git switch -c feature/name-of-change
```

Every push response must include both URLs:

- Preview: the GitHub Pages URL for the pushed revision, with a cache-busting commit query when useful.
- Production: `https://shopresalelane.com/`.

Pull requests deploy to a preview path on GitHub Pages. `main` deploys to production at `https://shopresalelane.com/`.

## CI/CD Monitoring

After every push:

1. Open or query the GitHub Actions runs for that commit.
2. Watch the `Test Website` workflow until it finishes.
3. Watch the preview or production deployment workflow until it finishes.
4. Do not report the deployment as successful while either workflow is pending.
5. If CI fails, read the failed step, fix the issue, rerun local tests, and push again.
6. Verify the resulting public URL loads the expected commit.
7. Report the commit ID, test result, deployment result, preview URL, and production URL.

The deployment workflows depend on the test workflow, so failed tests block publishing.

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
