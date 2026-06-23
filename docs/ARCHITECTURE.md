# ResaleLane Architecture

## Current Production System

ResaleLane is currently a static storefront built with HTML, CSS, and browser JavaScript. It does not use React, Vite, a traditional app server, or a public database for the storefront itself.

| Layer | Current implementation |
| --- | --- |
| Frontend | Static files in `site/` |
| Cart state | Browser `localStorage` |
| Tests | Node.js built-in test runner |
| CI | GitHub Actions |
| Preview | GitHub Pages PR preview paths |
| Stable staging | `staging` branch at `/staging/` |
| Production | GitHub Pages through the `gh-pages` deploy branch |
| Domain/DNS | Cloudflare |
| Payments | Disabled placeholder until Stripe is configured |

## Vendor And Integration Map

| Vendor/service | Integrated component | How it is integrated | Why it exists |
| --- | --- | --- | --- |
| GitHub | Repo, issues, and project board | Source code, docs, planning, and PR review all live in GitHub | Gives collaborators one shared source of truth |
| GitHub Actions | CI/CD workflows | `.github/workflows/` runs tests, preview deploys, staging deploys, production deploys, and uptime checks | Prevents manual deploy drift and catches regressions early |
| GitHub Pages | Public website hosting | Built static files are deployed to `gh-pages` and served on the public domain | Good fit for a mostly static storefront |
| Cloudflare | DNS and private backend platform | Cloudflare fronts the custom domain and runs the Worker, D1, and R2 services | Keeps domain control and private backend logic together |
| Cloudflare Worker | Private API | `worker/index.js` handles support, health, and monitor endpoints today | Lets the site keep secrets server-side and add logic without a traditional server |
| Cloudflare D1 | Private relational data | Worker bindings connect to separate staging and production D1 databases | Stores order, event, retry, and support metadata safely |
| Cloudflare R2 | Private object storage | Worker bindings connect to separate staging and production buckets | Holds delivery artifacts outside the public repo |
| Resend | Transactional email delivery | The Worker calls the Resend API with a Cloudflare secret | Sends support, monitoring, and future fulfillment email |
| Stripe | Planned checkout and payment receipts | The future Worker checkout flow will create Checkout Sessions and verify Stripe webhooks | Keeps card handling and payment receipts out of the custom codebase |

## Architecture In Plain English

The public website is intentionally simple: GitHub Pages serves static HTML, CSS, JavaScript, and public-safe assets.

Anything private or security-sensitive moves to the Cloudflare Worker side:

- email sending
- order records
- retry and audit state
- private package files
- future checkout creation
- future Stripe webhook verification

That split is the main safety rule of the whole project: public site files stay public-safe, private operations stay server-side.

## Request And Deployment Flow

```mermaid
flowchart LR
  A["Git main branch"] --> B["GitHub Actions tests"]
  B -->|pass| C["Deploy built site"]
  B -->|fail| D["Deployment blocked"]
  C --> E["gh-pages branch"]
  E --> F["GitHub Pages"]
  F --> G["Cloudflare DNS/proxy"]
  G --> H["shopresalelane.com"]
```

## File Responsibilities

- `site/index.html`: semantic page content, SEO metadata, dialogs, and form structure.
- `site/styles.css`: design tokens, layouts, responsive breakpoints, and animation.
- `site/app.js`: browser interactions and rendering.
- `site/cart-logic.js`: pure cart decision logic shared by the app and tests.
- `site/assets/`: public brand assets only.
- `Design System/design_handoff_resalelane/`: original public-safe design handoff, tokens, catalog model, prototypes, and brand exports.
- `scripts/build.mjs`: creates the fingerprinted release in ignored `dist/`.
- `worker/index.js`: main Worker router for health, monitoring, and support endpoints.
- `worker/contact.js`: support-form validation and support-email rendering helpers.
- `worker/security.js`: shared request-size, JSON, and response-header protections.
- `worker/order-store.js`: D1 order-state helpers for idempotency, retries, and transitions.
- `server/email-templates.js`: provider-independent transactional email templates for the future Worker.
- `migrations/`: versioned D1 schema for orders, payment events, delivery attempts, and support request metadata.
- `docs/ARTIFACT-SECURITY.md`: private-artifact storage and secure-delivery design.
- `docs/DATA-RETENTION.md`: buyer-data minimization, anonymization, and recovery rules.
- `docs/PRD.md` and `docs/WEBSITE-SPEC.md`: tracked requirements that replace unreadable local Google Drive shortcuts.
- `test/site.test.js`: automated storefront regression and safety checks.
- `.github/workflows/ci.yml`: standalone test workflow.
- `.github/workflows/deploy.yml`: production deployment after tests.
- `.github/workflows/preview.yml`: pull-request preview after tests.
- `.github/workflows/staging.yml`: stable staging-path deployment after tests.
- `.github/workflows/uptime.yml`: daily production availability and content check.

## Release And Cache Model

Source files keep stable readable names under `site/`. CI creates deployment-only files whose names include the full Git commit SHA. The deployed HTML and `release.json` carry the same release ID.

This means:

- a new release cannot accidentally reuse an old CSS or JavaScript URL
- staging and production can be verified against an exact commit
- URLs returned after a push include `?release=<commit-sha>` to bypass cached HTML
- old release assets may remain temporarily, but they cannot be mixed into new HTML

## Security Boundary

The public repository and GitHub Pages can only contain information safe for anyone to download.

Private supplier data, Stripe secret keys, webhook secrets, email-service keys, and order records must live in a server-side backend. They must never be placed in `site/`, Git history, or browser JavaScript.

The repository is the collaboration source of truth. Google Drive may hold drafts and private operational files, but code, public-safe assets, and approved decisions are not considered current until they are represented in Git.

## Approved Backend Target

The Cloudflare Worker is active for support email and monitoring. Separate staging and production D1 databases and private R2 buckets are connected through environment-specific bindings. Checkout remains disabled until Stripe and the remaining order and fulfillment flows are configured and tested.

The Worker exposes a public-safe `/health` response containing API version, environment name, and connection status only. It never returns database identifiers, bucket names, secrets, customer records, or provider errors.

| Responsibility | Approved service |
| --- | --- |
| Public storefront | GitHub Pages |
| Checkout API, support form, and webhook | Cloudflare Worker |
| Hosted payment page and receipt | Stripe Checkout |
| Order and delivery-attempt records | Cloudflare D1 |
| Private package contact data and optional files | Cloudflare R2 or Worker-only configuration |
| Fulfillment email | Resend from `orders@shopresalelane.com` |
| Support notifications | Resend from `support@shopresalelane.com` to the support Gmail inbox |

The Worker accepts product IDs only, maps them to server-controlled Stripe Price IDs, and owns every privileged action. Cloudflare bindings grant the Worker access to D1 and R2 without exposing storage credentials or object identifiers to the browser.

The public contact form posts to `https://api.shopresalelane.com/support`. The Worker validates and limits requests, uses a hidden bot-trap field, and sends the message through Resend. The `RESEND_API_KEY` is stored only as a Cloudflare Worker secret. Visitor email addresses are used as the reply-to address and are not written to public files or routine logs.

D1 stores buyer and order metadata needed for payment verification, idempotency, delivery tracking, and support. Supplier contacts, PDF contents, and private package data remain in private R2 and are never copied into D1.

The current production v1 PDF artifact keys are:

```text
artifacts/production/shoe-vendor/v1/package.pdf
artifacts/production/clothes-vendor/v1/package.pdf
artifacts/production/airpods-headphones-vendor/v1/package.pdf
artifacts/production/cologne-vendor/v1/package.pdf
artifacts/production/all-vendor-bundle/v1/package.pdf
```

Those objects are in the private `resalelane-artifacts-production` bucket. They were verified by downloading them back from Cloudflare R2 and comparing hashes to the private source PDFs.

## Technical Implementation Steps

This is the intended implementation order for the full commerce system:

1. Keep the public storefront static and public-safe.
2. Validate all support and monitor traffic in the Worker.
3. Keep secrets in Cloudflare Worker secrets, never in the repo or browser.
4. Use D1 for order state, event tracking, and retry history.
5. Use R2 for private delivery artifacts and contact bundles. The production v1 PDF set is already uploaded and hash-verified.
6. Use Stripe Checkout for payment collection instead of custom card handling.
7. Verify Stripe webhooks in the Worker before touching D1 or R2.
8. Use Resend for customer-facing and operator-facing email.
9. Keep staging and production isolated at the Worker, D1, R2, and email-credential layers.

## Target Transaction Architecture

```mermaid
sequenceDiagram
  participant B as Buyer
  participant S as Storefront
  participant W as Cloudflare Worker
  participant P as Stripe
  participant D as D1
  participant R as Private R2/config
  participant E as Resend
  B->>S: Add package to cart and start checkout
  S->>W: Send product IDs only
  W->>W: Validate IDs and map Stripe Price IDs
  W->>P: Create Checkout Session
  P-->>B: Redirect to Stripe-hosted payment
  B->>P: Complete payment
  P->>W: Send signed checkout webhook
  W->>W: Verify signature against raw body
  W->>D: Create or idempotently update order
  W->>R: Read purchased contact data or artifact
  W->>E: Send fulfillment from orders@shopresalelane.com
  E-->>B: Contact details plus optional PDF or link
  W->>D: Record email attempt and provider result
```

Stripe remains the payment receipt authority. ResaleLane sends a separate order confirmation and fulfillment email containing the order ID, purchased items, support details, policy summary, contact details, and any optional PDF or secure link.

## Transaction Safety Rules

- Never accept a browser-supplied price, Stripe Price ID, R2 key, or fulfillment content.
- Verify the Stripe signature before parsing or acting on a webhook.
- Use Stripe event and Checkout Session IDs to make order creation and fulfillment idempotent.
- Keep R2 private and expose package data only after a verified purchase.
- Store order state, artifact version, email attempt, provider message ID, and failure category in D1.
- Do not store private contact data, raw delivery tokens, or secrets in routine logs.
- Authenticate `shopresalelane.com` with Resend before enabling `orders@shopresalelane.com`.
- Retry failed email delivery without creating a second order or duplicate successful fulfillment.

## Environment Strategy

Approved frontend separation:

- feature and PR preview: per-PR Pages path
- stable staging: `/staging/`
- production: domain root

Backend environment separation:

- the existing `/staging/` path is sufficient; a dedicated staging hostname is not required
- staging uses Stripe test-mode keys and a test webhook secret
- staging and production use separate D1 databases and R2 buckets and bindings
- staging contains synthetic package data and cannot access production contacts
- Resend testing must not send fulfillment to real customers
- production deployment occurs only after staging verification
