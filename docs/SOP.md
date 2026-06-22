# ResaleLane SOP

## Source Of Truth

GitHub is the source of truth for buildable website code, configuration, deployment workflows, public-safe documentation, brand assets, design tokens, and design references.

Google Drive is a drafting and private-operations system only. When a Google Doc changes, copy the relevant decisions into tracked repo files before implementation. Do not treat local Google Drive placeholder files such as `.gdoc`, `.gsheet`, or `.gslides` as source files because they are only links and collaborators cannot read their contents from GitHub.

Tracked source material includes:

- `site/` for the production storefront source.
- `server/` for backend-safe modules.
- `Design System/design_handoff_resalelane/` for original public-safe brand and design files.
- `docs/PRD.md` and `docs/WEBSITE-SPEC.md` for readable repository copies of the source specifications.
- `docs/IMPLEMENTATION-PLAN.md` for the master phase, dependency, launch-gate, and ticket tracker.
- `HANDOFF.md` for the current cross-agent working state and next exact action.
- `docs/` for architecture, security, roadmap, and operating decisions.
- `CONTRIBUTING.md` for collaborator setup and workflow.

## Drift Control

Before every implementation pass:

1. Run `git status --short --branch`.
2. Fetch the latest GitHub state with `git fetch origin`.
3. If starting new work, switch to `main`, pull it with `git pull --ff-only`, and create a new branch.
4. Read the tracked repository specs first. Re-read a linked Google Doc only when the repository says the draft has changed.
5. Update tracked docs, assets, or app files with every decision being implemented.
6. Keep private supplier data out of Git. Supplier delivery content belongs in protected storage, never this public repository.

## Agent And Multi-Machine Handoff Protocol

This protocol applies to Codex, Claude, every other AI tool, and human contributors. The repository workflow must not depend on one vendor's private memory or chat history.

### Required session start

Before reasoning about or implementing the next task:

1. Run `git status --short --branch`, `git remote -v`, `git fetch origin --prune`, and `git log -1 --oneline`.
2. If starting from a clean `main`, run `git pull --ff-only origin main`. Never pull blindly over local changes.
3. Read, in order: `HANDOFF.md`, `docs/IMPLEMENTATION-PLAN.md`, `docs/ARCHITECTURE.md`, `docs/ARTIFACT-SECURITY.md`, `docs/PRD.md`, and this SOP.
4. Open the canonical planning issue and the Project board. Check status, dependencies, comments, assignee, linked branches, and open pull requests.
5. Verify the handoff against Git and GitHub. If the handoff disagrees with the branch, issue, PR, or board, current GitHub state wins and the handoff must be corrected before implementation.
6. State which ticket and branch the session will own. Do not begin untracked implementation.

### Claiming work without collisions

- One canonical issue has one active writer branch. Use a purpose-based name such as `work/issue-25-worker-foundation`; the branch name must not depend on the agent product.
- Move the issue label and Project card to `In Progress`, then comment with the working branch, PR if available, scope, and expected files.
- Before editing, search open pull requests and issue comments for overlapping work.
- Different machines may work in parallel only on separate tickets/branches with non-overlapping ownership, or after the issue explicitly records how the work is split.
- Do not have two agents push independently to the same branch. If another machine must continue that branch, the first agent must stop writing, push everything, and update `HANDOFF.md` plus the ticket.
- Do not use chat history, local memory, or an unpushed local folder as the only record of a decision.
- If local work is dirty or divergent, preserve it on a named branch or stash before syncing. Never overwrite unexplained changes.

### Required session end

Before stopping, even when work is incomplete:

1. Run relevant automated and manual QA.
2. Commit and push all intended public-safe work so another machine can fetch it.
3. Update the canonical issue with completed work, remaining work, tests, blockers, branch, PR, and the next exact action.
4. Synchronize the issue `status:*` label and Project status. Use `UAT` only when implementation and checks are complete and owner acceptance is next.
5. Update root `HANDOFF.md` with the same current state and authoritative links.
6. Verify the handoff contains no secrets, real vendor contacts, buyer data, private support data, or paid artifact contents.
7. Re-fetch and compare local/remote branch state. Clearly disclose any uncommitted or unpushed work.

The handoff is a navigation and continuation aid. GitHub code, the canonical issue, the Project board, and current pull-request checks remain authoritative.

## Risk-Based Validation

Testing must match the risk of the changed files. Agents should not spend time or model tokens narrating, running, and reviewing unrelated regression output, but they must never choose a lighter tier merely because a change appears simple. The shared path classifier in `scripts/validation-policy.mjs` makes the CI decision from Git file paths.

### Documentation-only tier

Use this tier only when every changed file is public Markdown under `docs/` or one of `README.md`, `CONTRIBUTING.md`, and `HANDOFF.md`.

Before committing:

1. Run `npm run check:docs`.
2. Run `git diff --check`.
3. Read the rendered Markdown or diff for broken headings, links, tables, contradictory instructions, accidental private data, and stale ticket or branch references.

This tier runs the secret scan, architecture/document consistency tests, handoff/SOP tests, and validation-policy tests. It intentionally skips application syntax checks, Worker dry runs, the full storefront regression suite, release builds, CodeQL pull-request analysis, and preview/production deployment because Markdown-only changes cannot alter those artifacts.

### Full tier

Use `npm run check` plus `npm run worker:check` when any changed file is outside the documentation-only allowlist. The full tier is mandatory for application code, Worker or server code, tests, scripts, package configuration, workflows, migrations, HTML/CSS, assets, design sources, security configuration, and mixed documentation/code changes.

For visual changes, also inspect desktop and mobile layouts and test the affected user flow. For backend or data changes, test the affected route, environment boundary, migration, failure path, and redaction behavior.

When uncertain, use the full tier. Never weaken tests, split a code change into a misleading documentation-only commit, or relabel files to obtain the lightweight path.

### CI/CD efficiency rules

- Pull requests use one reusable validation workflow instead of running the same suite independently in both test and preview workflows.
- Documentation-only pull requests run the lightweight tier and do not create a storefront preview.
- Documentation-only merges to `staging` or `main` do not rebuild or redeploy unchanged website artifacts.
- CodeQL still runs on executable or workflow changes, on `main`, on its schedule, and when manually requested; it skips Markdown-only pull requests.
- Manual workflow dispatch defaults to the full tier because no trustworthy comparison range is guaranteed.
- CI logs and agent summaries should report the selected tier and concise pass/fail evidence rather than reproducing every passing assertion.

## Branch And Preview Flow

Use short, purpose-based branches tied to the canonical issue:

```powershell
git switch -c work/issue-25-worker-foundation
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
11. Keep `docs/IMPLEMENTATION-PLAN.md` synchronized when a milestone, dependency, launch gate, or phase changes.

At the beginning and end of every implementation pass, audit all planning issues against the Project, add missing issues, remove duplicate draft cards, and reconcile status mismatches.

Ticket updates are part of the definition of done, not optional administration.

## CI/CD Monitoring

After every push:

1. Open or query the GitHub Actions runs for that commit and confirm whether CI selected `docs-only` or `full`.
2. Watch the reusable test job until it finishes.
3. For the full tier, watch the preview or production deployment until it finishes; for the documentation-only tier, verify deployment was intentionally skipped.
4. Do not report a required test or deployment as successful while it is pending.
5. If CI fails, read the failed step, fix the issue, rerun the same or higher local validation tier, and push again.
6. For deployed changes, poll with disposable freshness values until the resulting public URL loads the expected commit.
7. For deployed changes, verify `/release.json?release=<full-commit-sha>&fresh=<disposable-value>` reports the same commit.
8. For deployed changes, confirm the HTML references `styles.<commit>.css`, `app.<commit>.js`, and `cart-logic.<commit>.js`.
9. Generate new, previously unused `fresh` values for user-facing preview and production URLs.
10. Report the commit ID, selected validation tier, concise test result, and whether deployment ran or was correctly skipped.

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

Use separate ResaleLane Stripe and Resend accounts/projects. Do not reuse PasteFlow account configuration, products, customers, sender identities, webhooks, support details, or reporting. The existing Cloudflare account may host ResaleLane DNS and backend resources, but names, bindings, data stores, variables, and secrets must remain project-specific.

## Deployment Safety

Do not commit:

- `.env` files
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

Secret rotation and incident handling follow `docs/SECURITY-OPERATIONS.md`. Record only secret names and test results; never record secret values.
