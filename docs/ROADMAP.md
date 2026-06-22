# ResaleLane Delivery Roadmap

The detailed backlog is private because it includes operations and future fulfillment design:

- Private planning repository: `collinbediner/Resale-Planning`
- Private GitHub Project: [ResaleLane Delivery Kanban](https://github.com/users/collinbediner/projects/1)

Every roadmap item must be represented by one canonical issue in the planning repository and that same issue must appear on the Project board. Board flow is `Backlog` -> `To Do` -> `In Progress` -> `UAT` -> `Done`.

The ordered checklist, dependencies, issue mapping, and launch gates live in [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md). This roadmap describes the release phases without becoming a second competing tracker.

## Phase 1: Commerce Readiness

Remaining blockers before accepting live payments:

1. Create a separate, appropriately parent/adult-controlled ResaleLane Stripe account.
2. Create a separate ResaleLane Resend account/project and authenticate `shopresalelane.com` through Cloudflare DNS.
3. Create the five Stripe test-mode products/prices in the ResaleLane account.
4. Implement the Cloudflare Worker Checkout Session API and server-side product mapping.
5. Verify signed Stripe webhooks against the raw request body.
6. Configure D1 order, item, event, delivery, email, and resend logging.
7. Configure private, environment-isolated R2 contact/artifact storage.
8. Send usable contact details from `orders@shopresalelane.com` only after verified payment.
9. Implement authorized support/resend handling and fulfillment failure alerts.
10. Pass an end-to-end Stripe test-mode order before creating live products/prices and enabling checkout.

Basic meta tags, social-preview assets, semantic headings, product copy, the footer disclaimer, and optional lightweight `robots.txt`/`sitemap.xml` remain Phase 1 public-site hygiene.

## Phase 2: Measurement, SEO Expansion, and Growth

- GA4 and Google Tag Manager
- Cart, checkout-funnel, purchase, and attribution events
- Search Console setup and ongoing SEO reporting
- Privacy-safe analytics review and cookie/banner decision if needed
- Keyword research, structured-data expansion, content strategy, and blog growth
- Verified-buyer review moderation

Analytics and SEO expansion do not block Phase 1 launch.

## Resolved Or Out Of Scope

- Production remains on GitHub Pages; moving to Cloudflare Pages is resolved as **No**.
- The staging branch and `/staging/` path are sufficient; `staging.shopresalelane.com` is out of scope.
- Legal/policy review is complete for MVP by owner decision; conservative disclaimers remain mandatory.
- The bundle compare-price mismatch is fixed at `$28`, matching the four $7 individual packages, and must not be reintroduced.
- PasteFlow Stripe, Resend, sender identities, webhooks, support details, and reporting are not used by ResaleLane.
- GA4, GTM, conversion analytics, attribution, Search Console, and SEO expansion are Phase 2.

## Approved Staging

The `staging` branch deploys to:

`https://shopresalelane.com/staging/`

Pull requests also receive their own preview path. This path-based frontend staging model is approved for the current architecture; a dedicated staging hostname is not required. Backend testing still requires Stripe test mode, synthetic package data, and separate D1/R2 resources so staging cannot access live orders or production contacts.
