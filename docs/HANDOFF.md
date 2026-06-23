# ResaleLane Handoff

## Purpose

Use this file at the start of every session so a new contributor can understand the current project state without guessing from chat history.

## Read This First

1. `README.md`
2. `docs/REPOSITORY-STRUCTURE.md`
3. `docs/SOP.md`
4. The ticket you are working on in `collinbediner/Resale-Planning`
5. The ResaleLane Delivery project board

Do not trust this handoff by itself. Verify the current branch, Git status, latest merged commits, and ticket labels before making changes.

## Current Production Reality

- Public storefront host: GitHub Pages at `https://shopresalelane.com/`
- Private API host: Cloudflare Worker at `https://api.shopresalelane.com/`
- Support form: live through the Worker and Resend support notifications
- Checkout: still intentionally disabled
- Daily production monitor: live and emailing through the private Worker
- Source of truth: tracked repo files only, not chat and not Google Doc shortcut files

## Current Focus

The repo has solid public-site foundations, support email, D1 schema, security controls, and production monitoring. The remaining launch-critical work is mostly blocked on private business setup and private vendor data, not on public frontend code.

Today's working checklist is tracked in `docs/TODAY-PLAN-2026-06-23.md`.

## Ticket Snapshot

- `#17` Daily production checkpoint: engineering complete, waiting on UAT confirmation
- `#25` Worker foundation: waiting on UAT confirmation
- `#10` D1 order and email-attempt schema: waiting on UAT confirmation
- `#19` Security controls: partially complete, still needs Turnstile and Stripe-specific hardening
- `#3`: today's first focus; Stripe account/catalog setup still requires owner and adult-account coordination
- `#5`, `#24`, `#26`, and `#29`: completed; v1 PDFs are in private production R2 and hash-verified
- `#8`: Resend sender setup remains in progress, especially final `orders@shopresalelane.com` fulfillment path
- `#4`, `#7`, `#9`, and `#12`: next checkout/fulfillment launch blockers after Stripe setup

## Safe Independent Work

Good independent tasks:

- tighten docs, tests, and repo hygiene
- improve CI safety checks
- strengthen Worker validation and redaction
- reconcile ticket status mismatches
- document blocked work clearly
- refine backup/recovery now that production v1 artifacts exist in R2

Stop and ask before:

- enabling real Stripe checkout
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
