# ResaleLane Implementation Plan

Last aligned: June 18, 2026

This is the master execution tracker for taking ResaleLane from a public storefront preview to a low-volume commerce MVP. GitHub issues hold the working detail and the [ResaleLane Delivery Kanban](https://github.com/users/collinbediner/projects/1) shows current ownership and status. This document defines sequence, dependencies, launch gates, and completed decisions.

## Current Status

The static storefront is live and publicly viewable. Cart UX exists. Checkout is intentionally disabled until Stripe, backend validation, webhook fulfillment, private contact delivery, and email automation are implemented. Treat the site as **pre-commerce / storefront preview**, not an operating checkout system.

Completed decisions:

- [x] Production remains on GitHub Pages; Cloudflare Pages is not part of the plan.
- [x] The `staging` branch and `/staging/` deployment path are sufficient for the MVP; no staging subdomain is required.
- [x] Legal/policy review is complete for MVP purposes. Conservative disclaimers remain required.
- [x] The bundle compare price is `$15`; the old mismatch is resolved and must not be reintroduced.
- [x] ResaleLane will use separate Stripe and Resend accounts/projects rather than PasteFlow accounts.
- [x] The backend target is a Cloudflare Worker with D1, private R2, Stripe Checkout, and Resend.

## Phase 1 — Commerce Readiness

Phase 1 ends only when a buyer can pay in Stripe test mode and receive the correct private sourcing contact resource after a verified webhook. The work should proceed in the order below; parallel work is noted where safe.

### 1. Accounts and source content

- [ ] **Stripe account and catalog — issue #3.** Create a separate ResaleLane Stripe account under appropriate parent/adult control. In test mode, create the five products and record their Price IDs in private environment configuration.
- [ ] **Resend account and domain — issue #8.** Create a separate ResaleLane Resend account/project, authenticate `shopresalelane.com` through Cloudflare DNS, configure `orders@shopresalelane.com`, and use `collin.bediner+support@gmail.com` as Reply-To initially.
- [ ] **Vendor contact source — issue #24.** Collin completes the private source document for each individual package. Never copy real contacts into GitHub or tickets.
- [ ] **Package approval — issue #5.** Confirm each package's final contact fields and confirm that the all-vendor bundle contains the four individual contact resources.

Issues #3, #8, and #24 can proceed in parallel. Issue #5 follows the completed source content.

### 2. Backend foundation and private data

- [ ] **Worker foundation — issue #25.** Scaffold `resalelane-checkout-worker` with isolated test and production bindings, secret placeholders, CORS allowlist, and automated tests.
- [ ] **D1 ledger — issue #10.** Create the environment-specific order, item, event, email-attempt, delivery-attempt, and resend/support schema with migrations and idempotency constraints.
- [ ] **Private package import — issue #26.** Validate and import approved contacts into `resalelane-artifacts-staging` using synthetic data and `resalelane-artifacts-production` using approved real data.
- [ ] **Security controls — issue #19.** Add least-privilege bindings, input validation, redacted logging, rate limiting/abuse controls, and environment isolation.

Issue #25 starts first. D1 and private-data work can then proceed in parallel. Production data import depends on #24 and #5.

### 3. Checkout and fulfillment

- [ ] **Checkout Session API — issue #4.** Accept internal product IDs only, map them to server-controlled Stripe Price IDs, create a Stripe-hosted Checkout Session, and connect the storefront without accepting browser prices.
- [ ] **Verified webhook orchestration — issue #7.** Verify Stripe's signature against the raw body, process `checkout.session.completed` idempotently, write the order, resolve the correct private artifact version, and trigger fulfillment.
- [ ] **Transactional email — issue #9.** Send copy/paste-friendly contact details from `orders@shopresalelane.com`, include the order ID and disclaimer, and log the provider result without logging private content.
- [ ] **Support and resend — issue #13.** Let support verify an order and safely retry failed delivery without duplicate orders or unauthorized disclosure.
- [ ] **Reliability and alerts — issue #18.** Add structured redacted logs, bounded retries, failure categories, and actionable fulfillment alerts.

Checkout depends on #3 and #25. Webhook fulfillment depends on checkout, D1, and private package data. Email depends on #8. The support/resend flow depends on the same order and delivery records.

### 4. Launch verification

- [ ] **End-to-end test order — issue #12.** Test individual and bundle purchases, signature rejection, duplicate webhook delivery, correct package resolution, email delivery, D1 records, success/cancel guidance, and authorized resend.
- [ ] Review the Stripe go-live checklist and account verification requirements.
- [ ] Confirm production has separate live secrets, webhook endpoint, D1 binding, and R2 bucket.
- [ ] Create live-mode Stripe products/prices only after the complete test-mode flow passes.
- [ ] Enable checkout only after every Phase 1 launch gate below passes.

## Phase 1 Launch Gates

- [ ] Separate ResaleLane Stripe account is verified and parent/adult controlled as required.
- [ ] Separate ResaleLane Resend account/project and domain authentication are working.
- [ ] All five server-side product mappings are tested.
- [ ] Frontend submits product IDs only.
- [ ] Stripe webhook signatures are verified using the unmodified request body.
- [ ] Duplicate events cannot create duplicate fulfillment.
- [ ] D1 records orders, items, delivery attempts, email attempts, and support resends.
- [ ] Staging uses synthetic contacts and cannot access production data.
- [ ] Production contact data is private and backend-only.
- [ ] Fulfillment email contains usable contact text and the required disclaimer.
- [ ] Support can verify and resend without exposing whether arbitrary orders exist.
- [ ] Full automated checks and an end-to-end Stripe test-mode order pass.
- [ ] Checkout remains disabled until all preceding gates pass.

## Phase 1 Public-Site Scope

Keep the GitHub Pages storefront focused on public, static concerns:

- Homepage, product cards, cart, and checkout launch UI
- Success/cancel guidance, FAQ, policies, and support copy
- Meta title and description
- Open Graph and Twitter card metadata
- Favicon and social preview assets
- Semantic headings, clear product copy, and conservative disclaimers
- Optional lightweight `robots.txt` and `sitemap.xml`

Do not add backend secrets, real vendor contacts, or buyer data to the public site or repository.

## Phase 2 — Measurement, SEO Expansion, and Growth

Phase 2 is intentionally non-blocking for commerce launch:

- [ ] GA4 and Google Tag Manager
- [ ] Add-to-cart, checkout-funnel, purchase, and attribution events
- [ ] Privacy-safe analytics review and cookie/banner decision if required
- [ ] Search Console setup and ongoing SEO reporting
- [ ] Keyword research, structured-data expansion, content strategy, and blog growth
- [ ] Verified-buyer review moderation — issue #14
- [ ] Privacy-safe ecommerce measurement — issue #16
- [ ] Search Console and SEO growth program — issue #27

Analytics and SEO expansion do not block Phase 1 launch.

## Approved Product Catalog

| Product | Internal product ID | Price |
| --- | --- | ---: |
| Shoe Vendor | `shoe-vendor` | $7 |
| Clothes Vendor | `clothes-vendor` | $7 |
| AirPods / Headphones Vendor | `airpods-headphones-vendor` | $7 |
| Cologne Vendor | `cologne-vendor` | $7 |
| All Vendor Bundle | `all-vendor-bundle` | $12 |

The browser never sends prices or Stripe Price IDs. The Worker owns the authoritative product-to-Price-ID mapping.

## Later Operational Work

- [ ] Daily production checkpoint email — issue #17
- [ ] Backup, recovery, restoration drill, and vendor-data update procedure — issue #20

Monitoring needed to detect and recover from failed paid fulfillment remains in Phase 1 under issue #18. Broader operational reporting and scheduled recovery drills may follow launch.

## Full Disclaimer

ResaleLane sells informational sourcing resources only. The contact details, vendor names, marketplace links, and notes provided are intended to help buyers begin their own sourcing research.

ResaleLane does not sell physical products, does not control third-party suppliers, and is not affiliated with, endorsed by, or sponsored by any brand, marketplace, manufacturer, vendor, or supplier referenced in these materials.

Buyers are responsible for independently verifying all supplier details before making any purchase from a third party, including product authenticity, pricing, availability, quality, shipping terms, return policies, and business legitimacy.

ResaleLane does not guarantee supplier response, inventory availability, product authenticity, resale profit, delivery speed from third-party suppliers, or any specific business outcome.

## Tracker Maintenance

When an implementation ticket changes:

1. Update the canonical issue and Kanban status first.
2. Update the checkbox and dependency notes here in the same documentation change when the milestone meaningfully advances.
3. Preserve secrets and contact-data boundaries in every ticket, PR, test fixture, and log.
4. Do not mark Phase 1 complete until the launch gates pass with test evidence.
