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
- Storefront cart: public site now serves the real live checkout JavaScript through fingerprinted Pages assets
- Public-site proof: a live hosted checkout completed from the public storefront on 2026-06-30 and wrote order `RL-B15XWXURSO` with `payment_status = paid` and `fulfillment_status = delivered`
- Reviews: the public storefront now includes a verified-buyer review form, and production accepted a real test submission on 2026-06-30 for delivered order `RL-B15XWXURSO` while rejecting both fake-order and duplicate-order attempts
- Daily production monitor: live and emailing through the private Worker
- Source of truth: tracked repo files only, not chat and not Google Doc shortcut files
- Secret source of truth: provider-managed stores, not local Codex machine files

## Current Focus

The current launch-critical work is now customer-experience polish plus operational verification:

- verify the newly deployed single-email buyer flow in a real inbox so Gmail and desktop mail clients show the revised spacing and there is no extra buyer "thank you" email
- confirm buyer-facing templates no longer expose Stripe checkout-session references
- confirm the latest homepage and success-page copy cleanup is acceptable after public deployment
- verify the internal sale-alert email reaches support and CCs Collin after a fresh live sale
- configure Stripe Dashboard report scheduling if weekly summary emails are desired from Stripe itself; this is a Stripe Dashboard/reporting setting, not a Worker-code feature
- verify multi-item cart behavior from the public site with a clean browser state
- run the remaining real test checkouts against each SKU and the 5-item total coverage plan
- confirm what Stripe itself sends as a separate receipt and document that behavior clearly

Today's working checklist is tracked in `docs/TODAY-PLAN-2026-06-23.md`.

## Ticket Snapshot

- `#17` Daily production checkpoint: engineering complete, waiting on UAT confirmation
- `#25` Worker foundation: production live; verify ticket language reflects real live secrets and deployment
- `#10` D1 order and email-attempt schema: production live and now protects order creation before fulfillment
- `#19` Security controls: partially complete, still needs Turnstile and Stripe-specific hardening
- `#3`: Stripe setup is no longer blocked; live products, prices, webhook, and promo code exist
- `#5`, `#24`, `#26`, and `#29`: completed; v1 PDFs are in private production R2 and hash-verified
- `#8`: Resend send path is working in production; the 2026-07-01 production deploy removes the redundant buyer confirmation email, standardizes buyer-template spacing and typography, and moves the internal sale-alert trigger to the paid-order event so Collin/support get immediate notice
- `#4`, `#7`, `#9`, and `#12`: now mostly about end-to-end QA, post-purchase UX polish, and support/receipt verification
- Reviews: verified-buyer intake is live in production; moderation and any future public display of approved reviews are the remaining pieces

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
