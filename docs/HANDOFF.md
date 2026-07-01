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

The board was cleaned up on 2026-07-01 after the Turnstile rollout, Worker deploy, GitHub Pages release, manual-retry runbook, and backup/recovery drill updates. The real outstanding work is now:

- `#14` Build post-launch verified-buyer review moderation: backlog, not a launch blocker
- `#16` Add post-launch privacy-safe GA4 ecommerce measurement: backlog, not a launch blocker
- `#27` Add post-launch Search Console and SEO growth program: backlog, not a launch blocker
- verify whether Stripe sends a separate buyer receipt for zero-dollar live orders; no Stripe receipt was visible yet in `rbediner@gmail.com` immediately after order `RL-B1ADML7MIA`
- decide whether any additional Stripe per-user notifications beyond `Successful payments` and weekly reports are worth the noise
- decide whether the shared internal operations token should later be split into separate monitor and manual-retry credentials

Today's working checklist is tracked in `docs/TODAY-PLAN-2026-06-23.md`.

## Ticket Snapshot

- Closed on 2026-07-01 after live verification and rollout cleanup: `#3`, `#4`, `#7`, `#8`, `#9`, `#10`, `#12`, `#17`, `#18`, `#19`, `#20`, `#25`, `#28`, `#30`
- `#14`, `#16`, and `#27`: genuine remaining backlog or post-launch work
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
