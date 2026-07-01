# ResaleLane Handoff

## Purpose

Use this file at the start of every session so a new contributor can understand the current project state without guessing from chat history.

## Read This First

1. `README.md`
2. `docs/REPOSITORY-STRUCTURE.md`
3. `docs/SOP.md`
4. `docs/SECRET-MANAGEMENT.md`
5. The ticket you are working on in `collinbediner/Resale-Planning`
6. The ResaleLane Delivery project board

Do not trust this handoff by itself. Verify the current branch, Git status, latest merged commits, and ticket labels before making changes.

## Current Production Reality

- Public storefront host: GitHub Pages at `https://shopresalelane.com/`
- Private API host: Cloudflare Worker at `https://api.shopresalelane.com/`
- Support form: live through the Worker and Resend support notifications
- Stripe live catalog: 5 live products/prices created and mapped in Cloudflare
- Promo code: permanent `COLLIN` 100% off test code is live
- Checkout backend: live in production and already proven with real hosted Stripe sessions
- Fulfillment: production webhook now records orders before artifact delivery so failed fulfillment does not lose the ledger row
- Email fulfillment: production now sends a single buyer-facing fulfillment email from the Worker, with PDF attachments pulled from private R2; the redundant buyer "thank you" email has been removed from the successful checkout path
- Internal sale alerts: production now emails support immediately when a paid order is recorded, and CCs Collin on that alert; if fulfillment later fails, support gets a separate failure-status alert
- Internal sale-alert routing: production alert copies now go to `collin.bediner+support@gmail.com` with CCs to both `collin.bediner@gmail.com` and `rbediner@gmail.com`
- Storefront cart: public site now serves the real live checkout JavaScript through fingerprinted Pages assets
- Public-site proof: a live hosted checkout completed from the public storefront on 2026-06-30 and wrote order `RL-B15XWXURSO` with `payment_status = paid` and `fulfillment_status = delivered`
- Fresh production proof on 2026-07-01: zero-dollar live order `RL-B1ADML7MIA` completed through hosted Stripe Checkout with promo code `COLLIN`; buyer received one fulfillment email with `resalelane-all-vendor-bundle.pdf` attached, and the internal sale alert reached support with both Collin and Roman copied
- Stripe dashboard notifications: weekly scheduled reports were enabled from the Stripe Dashboard for the signed-in account user, and the `Successful payments` email notification was turned on in Stripe Communication Preferences
- ntfy push alerts: production now mirrors internal sale alerts to a private `ntfy` topic stored as the Cloudflare Worker secret `NTFY_TOPIC`; the actual topic string was emailed privately to `rbediner@gmail.com` and `collin.bediner@gmail.com`, not committed to the repo
- Reviews: the public storefront now includes a verified-buyer review form, and production accepted a real test submission on 2026-06-30 for delivered order `RL-B15XWXURSO` while rejecting both fake-order and duplicate-order attempts
- Daily production monitor: live and emailing through the private Worker
- Source of truth: tracked repo files only, not chat and not Google Doc shortcut files
- Secret source of truth: provider-managed stores, not local Codex machine files

## Current Focus

The board was resynchronized on 2026-07-01. The real outstanding work is:

- Turnstile hardening is now implemented in code and partially live as of 2026-07-01: the Cloudflare widget was created, the production Worker secret `TURNSTILE_SECRET_KEY` was uploaded, the Worker was redeployed to production as version `af6d2858-7aeb-4928-8b12-5e97387a998c`, and the public site key was wired into `site/app.js`; the remaining live step is publishing the updated GitHub Pages storefront and then verifying support, review, and checkout end to end on the public site
- Browser-automation note: the authenticated Cloudflare Turnstile dashboard tab is open at `/turnstile/add`, but Chrome-extension control of that tab hung repeatedly on 2026-07-01 even though the tab remained visible in the open-tab list; if continuing, first dismiss any extension overlay or modal in Chrome and then resume widget creation instead of re-debugging the local code
- Customer and internal email polish was tightened locally on 2026-07-01: support emails now use the same branded layout system as fulfillment emails, internal sale alerts no longer print raw Stripe session ids in the email body, and the checkout modal copy now says `Continue to secure payment` instead of the rougher `Continue to Stripe`; `npm run check` passed after those changes
- The Turnstile widget now includes `shopresalelane.com`, `www.shopresalelane.com`, and `api.shopresalelane.com`; `www.shopresalelane.com` also returns an HTTP 301 redirect to the apex domain, so the current hostname coverage is conservative for the live production flow
- verify whether Stripe sends a separate buyer receipt for zero-dollar live orders; no Stripe receipt was visible yet in `rbediner@gmail.com` immediately after order `RL-B1ADML7MIA`
- multi-item cart behavior was verified on the live public site on 2026-07-01: the cart reached `2`, then `4`, showed multiple removable line items, and the bundle-plus-individual conflict prompt rendered the `Keep Bundle Only` and `Keep Everything` controls
- finish the documented launch evidence matrix for checkout, fulfillment, alerts, receipts, and failure handling
- decide whether any additional Stripe per-user notifications beyond `Successful payments` and weekly reports are worth the noise
- decide whether ntfy should stay limited to sale alerts or also mirror monitor failures and delivery-failed incidents as separate topics
- finish the remaining security/operations hardening work: Turnstile decision, deeper alert/runbook coverage, and backup/recovery procedure

Today's working checklist is tracked in `docs/TODAY-PLAN-2026-06-23.md`.

## Ticket Snapshot

- `#3`, `#4`, `#7`, `#8`, `#9`, `#10`, `#17`, `#25`, `#28`, `#30`: implementation is live or substantially complete and now sits in `status:uat` while inbox proof, board reconciliation, or final acceptance evidence is gathered
- `#12`: now the main in-progress launch-evidence ticket; live functionality exists, but the evidence matrix is incomplete and the old test-only wording no longer matches reality
- `#18`: moved to `status:in-progress`; some monitoring/alerting exists now, but broader retries, runbooks, and synthetic alert proof remain
- `#19`: still `status:in-progress`; core validation and isolation controls are in place, but Turnstile/final security review work remains
- `#14`: verified-buyer review intake is live, but moderation/public publishing is still backlog work
- `#20`: backup, recovery, and vendor-data update procedure is still real backlog work
- `#16` and `#27`: post-launch analytics/SEO backlog, not launch blockers
- `#5`, `#24`, `#26`, and `#29`: completed; v1 PDFs are in private production R2 and hash-verified

## Safe Independent Work

Good independent tasks:

- tighten docs, tests, and repo hygiene
- improve CI safety checks
- strengthen Worker validation and redaction
- reconcile ticket status mismatches
- document blocked work clearly
- refine backup/recovery now that production v1 artifacts exist in R2
- verify secret names and provider locations without exposing values
- verify inbox outcomes for buyer, support, and Collin copies after each live test order
- if inbox screenshots disagree with current code, verify the deploy timestamp and Worker version before assuming the repo is wrong

Stop and ask before:

- rotating, creating, deleting, or revealing production secrets
- touching private supplier data
- changing domains, billing, or account ownership
- deleting user-owned local private folders

## Privacy Boundaries

Never commit:

- supplier contacts
- buyer or support personal data
- API keys, tokens, webhook secrets, or passwords
- Google Drive shortcut files
- generated output such as `dist/` or `node_modules/`

## Session End Rule

Before stopping work:

1. run `npm run check` if code or docs changed
2. update the planning ticket and project status
3. update this handoff if priorities or blockers changed
4. leave the repo on a clean, understandable branch state
