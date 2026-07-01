# ResaleLane Secret Management

## Rule

No production or shared staging secret may be stored only on a local Codex machine.

Local files such as `.env`, `.env.*`, `.dev.vars`, `.dev.vars.*`, `secrets.json`, `.secrets/`, and `.wrangler/` are temporary developer caches only. They are useful for testing, but they are not the source of truth and must never be committed.

## Why This Matters

Collin and collaborators may work from more than one computer or Codex session. If a key only exists on one local machine, the project can get stuck when that computer is offline, replaced, or out of sync.

The safe pattern is:

1. Store the real credential in the provider that uses it.
2. Store only the credential name, owner, environment, and setup notes in Git.
3. Never paste secret values into chat, GitHub issues, screenshots, docs, or source files.

## Authoritative Secret Stores

| Secret or config type | Source of truth | Notes |
| --- | --- | --- |
| Worker runtime secrets | Cloudflare Worker secrets | Use for `RESEND_API_KEY`, `MONITOR_TOKEN`, future `STRIPE_SECRET_KEY`, and future `STRIPE_WEBHOOK_SECRET`. |
| Worker runtime variables | Cloudflare Worker variables | Use for public-safe runtime config such as `ENVIRONMENT`, support email addresses, monitor email addresses, and future server-side Stripe Price ID mappings. |
| GitHub workflow secrets | GitHub Actions secrets | Use only for automation that must run inside GitHub, such as `UPTIME_MONITOR_TOKEN`. Do not store the Resend API key in GitHub if the Worker can send the email. |
| Payment account data | Stripe Dashboard | Stripe owns products, prices, card handling, and receipts. Secret keys and webhook secrets belong in Cloudflare Worker secrets. |
| Email account data | Resend Dashboard | Resend owns the domain and sender setup. The API key belongs in Cloudflare Worker secrets. |
| Delivery artifacts | Cloudflare R2 private buckets | Private PDFs and future private delivery files belong in R2, never in the public repository. |

## Current Secret Inventory

Record names only. Do not record values.

| Name | Environment | Store | Purpose | Status |
| --- | --- | --- | --- | --- |
| `RESEND_API_KEY` | Production Worker | Cloudflare Worker secret | Allows the Worker to send support, monitor, and future fulfillment email through Resend. | Active |
| `MONITOR_TOKEN` | Production Worker | Cloudflare Worker secret | Authenticates the private daily-monitor email endpoint. | Active |
| `NTFY_TOPIC` | Production Worker | Cloudflare Worker secret | Routes internal sale-alert push notifications to the private ResaleLane `ntfy` topic without publishing that topic in the repo. | Active |
| `UPTIME_MONITOR_TOKEN` | GitHub Actions | GitHub Actions secret | Lets the daily GitHub workflow call the private monitor endpoint. | Active |
| `STRIPE_SECRET_KEY` | Future production Worker | Cloudflare Worker secret | Server-side Stripe API access after checkout is enabled. | Not set yet |
| `STRIPE_WEBHOOK_SECRET` | Future production Worker | Cloudflare Worker secret | Verifies Stripe checkout-complete webhooks. | Not set yet |
| Stripe Price ID mappings | Future Worker runtime config | Cloudflare Worker variables or server-side configuration | Maps storefront product IDs to authoritative Stripe prices. Price IDs are not passwords, but they should still be controlled server-side. | Not set yet |

## Multi-Machine Workflow

When starting work on a new Codex machine:

1. Pull the latest repository files.
2. Read `docs/HANDOFF.md`, `docs/SOP.md`, and this file.
3. Assume local secret files are missing or stale.
4. Check the provider store instead of copying secrets from another local machine.
5. If a secret is missing, ask Collin to add it directly in Cloudflare, GitHub, Stripe, or Resend. Do not ask him to paste the value into chat.
6. After setup, update this file with the secret name, store, environment, and verification result only.

## Rotation Procedure

Rotate a credential when a collaborator leaves, a key may have been exposed, a provider shows suspicious activity, or a secret scan flags a real credential.

1. Create a replacement credential in the provider dashboard.
2. Install it in the correct provider secret store.
3. Test staging or a controlled production request.
4. Revoke the old credential only after the replacement works.
5. Record the credential name, rotation date, tester, and result only.

## What Never Goes In Git

- API keys, tokens, webhook secrets, passwords, recovery codes, or private keys
- `.env`, `.dev.vars`, `secrets.json`, `.secrets/`, or `.wrangler/`
- Supplier contacts or private delivery data
- Customer emails, order payloads, support messages, or raw provider logs
- Screenshots showing secret values
