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

Use short feature branches for changes:

```bash
git switch -c feature/name-of-change
```

Every push response must include both URLs:

- Preview/staging: the PR preview URL or `https://shopresalelane.com/staging/index.html?release=<full-commit-sha>&fresh=<unix-milliseconds>`.
- Production: `https://shopresalelane.com/?release=<full-commit-sha>&fresh=<unix-milliseconds>`.

Never reuse an older `fresh` value. The commit identifies the release; the freshness value guarantees a new HTML request.

Release flow:

1. Feature branch and pull request.
2. Automated tests.
3. PR preview review.
4. Merge approved work into `staging`.
5. Verify the stable staging URL.
6. Merge/release to `main`.
7. Verify production and preserve rollback information.

Only `main` deploys the production root. Pages-writing workflows share one concurrency group so staging, preview, and production cannot modify the deployment branch simultaneously.

## Ticket Management

The private planning repository is `collinbediner/Resale-Planning`.

For every meaningful change:

1. Create or select a ticket before implementation.
2. Put clear acceptance criteria and security/privacy notes in the ticket.
3. Move the ticket from `Todo` to `In Progress` when work starts.
4. Link commits and pull requests to the ticket.
5. Add test, staging, and production evidence after deployment.
6. Move it to `Done` only after acceptance criteria pass in the correct environment.
7. During every PRD review, add newly discovered gaps to `Todo`.

Ticket updates are part of the definition of done, not optional administration.

## CI/CD Monitoring

After every push:

1. Open or query the GitHub Actions runs for that commit.
2. Watch the `Test Website` workflow until it finishes.
3. Watch the preview or production deployment workflow until it finishes.
4. Do not report the deployment as successful while either workflow is pending.
5. If CI fails, read the failed step, fix the issue, rerun local tests, and push again.
6. Poll with disposable freshness values until the resulting public URL loads the expected commit.
7. Verify `/release.json?release=<full-commit-sha>&fresh=<disposable-value>` reports the same commit.
8. Confirm the deployed HTML references `styles.<commit>.css`, `app.<commit>.js`, and `cart-logic.<commit>.js`.
9. Generate new, previously unused `fresh` values for the user-facing preview and production URLs.
10. Report the commit ID, test result, deployment result, preview URL, and production URL.

The deployment workflows depend on the test workflow, so failed tests block publishing.

## Cache Busting

CI builds deployable files into `dist/`. Each release uses the Git commit SHA in its asset filenames:

- `styles.<commit>.css`
- `app.<commit>.js`
- `cart-logic.<commit>.js`

The HTML also contains a `data-release` marker and `release.json` records the deployed commit. This prevents new HTML from loading old CSS or JavaScript, even when Cloudflare or the browser retains an earlier release.

## Operations Monitoring

The `Daily Production Check` GitHub Actions workflow runs each day and verifies:

- HTTPS returns `200`
- The expected storefront headline is present
- Response time is recorded

After Resend is configured, set these GitHub Actions secrets:

- `RESEND_API_KEY`
- `UPTIME_EMAIL_FROM`
- `UPTIME_EMAIL_TO`

The job will then email Collin a daily pass/fail checkpoint. Failed checks also fail visibly in GitHub Actions.

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
