# ResaleLane SOP

## Source Of Truth

GitHub is the source of truth for buildable website code, configuration, deployment workflows, public-safe documentation, brand assets, design tokens, and design references.

Google Drive is a drafting and private-operations system only. When a Google Doc changes, copy the relevant decisions into tracked repo files before implementation. Do not treat local Google Drive placeholder files such as `.gdoc`, `.gsheet`, or `.gslides` as source files because they are only links and collaborators cannot read their contents from GitHub.

Tracked source material includes:

- `site/` for the production storefront source.
- `server/` for backend-safe modules.
- `Design System/design_handoff_resalelane/` for original public-safe brand and design files.
- `docs/PRD.md` and `docs/WEBSITE-SPEC.md` for readable repository copies of the source specifications.
- `docs/` for architecture, security, roadmap, and operating decisions.
- `docs/HANDOFF.md` for current working status and blockers.
- `docs/REPOSITORY-STRUCTURE.md` for folder layout and root-file rules.
- `docs/SECRET-MANAGEMENT.md` for the shared secret source-of-truth policy.
- `.github/CONTRIBUTING.md` for collaborator setup and workflow.

## Drift Control

Before every implementation pass:

1. Run `git status --short --branch`.
2. Fetch the latest GitHub state with `git fetch origin`.
3. If starting new work, switch to `main`, pull it with `git pull --ff-only`, and create a new branch.
4. Read `docs/HANDOFF.md`, `docs/REPOSITORY-STRUCTURE.md`, and the tracked repository specs first.
5. Re-read a linked Google Doc only when the repository says the draft has changed.
6. Update tracked docs, assets, or app files with every decision being implemented.
7. Keep private supplier data out of Git. Supplier delivery content belongs in protected storage, never this public repository.
8. Treat provider-managed secret stores as the credential source of truth. Local `.env`, `.dev.vars`, `.secrets/`, and `.wrangler/` files are only temporary machine caches.

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

```powershell
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

## Rollback Procedure

Rollback is performed only when the user requests it and names the target environment.

1. Confirm whether the target is `staging` or production (`main`).
2. Read the target environment's current `release.json` and identify the last known-good commit in Git history.
3. Create a normal revert commit for the problematic change. Do not reset, rewrite history, or force-push.
4. For staging, apply the revert to `staging` and push it through the existing staging workflow.
5. For production, open or merge the revert into `main` and use the existing production workflow.
6. Wait for tests, the deployment workflow, and GitHub Pages publishing to finish.
7. Verify the deployed `release.json`, fingerprinted CSS/JavaScript assets, HTTPS response, and affected user flow.
8. Report the restored commit and a fresh environment URL.

The `gh-pages` branch is generated deployment output and must never be used as the source of a rollback.

## Ticket Management

The private planning repository is [collinbediner/Resale-Planning](https://github.com/collinbediner/Resale-Planning).
Every ticket must also be added to the private [ResaleLane Delivery GitHub Project](https://github.com/users/collinbediner/projects/1).

The planning issue is the canonical ticket record. The Project is the Kanban view of that same issue. Never create a duplicate Project draft card when a repository issue exists.

Required Project columns and matching issue labels:

| Project status | Issue label |
| --- | --- |
| Backlog | `status:backlog` |
| To Do | `status:todo` |
| In Progress | `status:in-progress` |
| UAT | `status:uat` |
| Done | `status:done` |

For every meaningful change:

1. Create or select a ticket before implementation.
2. Put clear acceptance criteria and security/privacy notes in the ticket.
3. Confirm the canonical issue is linked to the GitHub Project and is not duplicated as a draft card.
4. Keep the Project status and the issue's `status:*` label synchronized.
5. Move both from `To Do` to `In Progress` when work starts.
6. Link commits and pull requests to the ticket.
7. Add test, staging, and production evidence after deployment.
8. Move completed engineering work to `UAT` for Collin's acceptance.
9. Move it to `Done` and close the issue only after UAT approval.
10. During every PRD review, add unrefined gaps to `Backlog` and refined actionable work to `To Do`.

At the beginning and end of every implementation pass, audit all planning issues against the Project, add missing issues, remove duplicate draft cards, and reconcile status mismatches.

Ticket updates are part of the definition of done, not optional administration.

## Repository Layout

Keep most general guidance inside folders, not as loose root files.

Allowed root-level tracked files:

- `README.md`
- `package.json`
- `wrangler.jsonc`
- `.gitignore`

General guidance belongs in `docs/` or `.github/` unless a tool requires a root path.

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

The daily email uses the private Worker so GitHub never stores the Resend API key. Configure:

- Cloudflare Worker secret: `MONITOR_TOKEN`
- GitHub Actions secret containing the same value: `UPTIME_MONITOR_TOKEN`

The job checks both the storefront and private API, then emails Collin a daily pass/fail checkpoint. Failed production checks still fail visibly even if email delivery fails.

To prove alerting still works after setup or secret rotation, manually run `Daily Production Check` from GitHub Actions with `force_failure` enabled. That sends a clearly simulated fail email and keeps the workflow visibly failed without requiring a real outage.

## Approval Rule

Do not merge visual or copy changes to `main` until the preview URL has been reviewed. Local preview is acceptable for quick checks, but the approval target should be the GitHub Pages preview whenever possible.

## Payment State

Stripe is not set up yet. Checkout buttons must stay disabled or point to a placeholder state until Stripe products, checkout sessions, webhook secrets, and delivery email flows are configured.

## Deployment Safety

Do not commit:

- `.env` files
- `.dev.vars` files
- `secrets.json`
- `.wrangler/`
- supplier/private delivery data
- Stripe, Resend, Cloudflare, or GitHub tokens
- Google Drive placeholder files
- generated `dist/`, dependency `node_modules/`, or local tool-state folders

Everything else that collaborators need to understand, build, test, or reproduce the public project should be committed.

## Worker And Database Operations

Run Worker commands from the repository root in PowerShell.

Validate without deploying:

```powershell
npx wrangler deploy --env="" --dry-run
npx wrangler deploy --env staging --dry-run
```

Apply pending D1 migrations to staging first:

```powershell
npx wrangler d1 migrations apply resalelane-orders-staging --remote
```

After staging verification, apply the same committed migration to production:

```powershell
npx wrangler d1 migrations apply resalelane-orders-production --remote
```

Deploy the isolated Workers:

```powershell
npx wrangler deploy --env staging
npx wrangler deploy --env=""
```

Verify:

```powershell
curl.exe -sS https://api-staging.shopresalelane.com/health
curl.exe -sS https://api.shopresalelane.com/health
```

Both responses must identify the expected environment and report D1 as `schema-ready` and R2 as `connected`.

For Worker rollback, use `npx wrangler versions list` and then `npx wrangler rollback <VERSION_ID>` for the explicitly named environment. Database migrations are forward-only: fix schema problems with a new migration rather than deleting tables or rewriting an applied migration.

Before enabling any automated deletion or anonymization, follow `docs/DATA-RETENTION.md` and obtain owner approval for the final retention period.

Secret ownership, rotation, and incident handling follow `docs/SECRET-MANAGEMENT.md` and `docs/SECURITY-OPERATIONS.md`. Record only secret names, provider stores, environments, and test results; never record secret values.
