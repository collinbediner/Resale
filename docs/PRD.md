# ResaleLane Product Requirements Document

Source draft: [ResaleLane PRD Spec](https://docs.google.com/document/d/1614VMQnQudx46u25Ha9g5bb78kLGJftOl7oZyKMvnYQ)

- Product: ResaleLane Website MVP
- Owner: Collin Bediner
- Domain: `shopresalelane.com`
- Support: `collin.bediner+support@gmail.com`
- Source version: PRD v1.1, June 17, 2026
- Repository snapshot: June 18, 2026

This tracked file is authoritative for collaborators. The Google Doc is a source draft; approved changes must be copied here.

## Product Summary

ResaleLane is a dark, mobile-first ecommerce-style storefront that sells low-cost digital sourcing resources. Buyers browse packages, use Stripe Checkout without creating an account, and receive the correct resource by email after payment.

The experience should be fast, clear, and trustworthy. ResaleLane sells informational sourcing resources only. It does not sell branded physical products, control third-party suppliers, or guarantee authenticity, pricing, inventory, shipping, quality, or resale results.

## Approved Target Architecture

This is the authoritative target architecture as of June 18, 2026:

1. GitHub Pages hosts the public storefront.
2. The buyer adds one or more packages to the browser cart.
3. The buyer starts checkout.
4. The frontend sends only internal product IDs to a Cloudflare Worker.
5. The Worker validates the product IDs and maps them to authoritative Stripe Price IDs.
6. The Worker creates a Stripe Checkout Session and returns its hosted URL.
7. The buyer completes payment on Stripe.
8. Stripe sends a signed completion webhook to the Worker.
9. The Worker verifies the webhook signature using the unmodified request body.
10. The Worker creates or idempotently updates the order in D1.
11. The Worker resolves the purchased package contact data from private R2 or server-side configuration.
12. The Worker sends fulfillment through Resend from `orders@shopresalelane.com`.
13. The email includes the purchased contact details directly and may also include a PDF or secure link.
14. The Worker records each email-delivery attempt and provider result in D1.

GitHub Pages remains intentionally static. Stripe secrets, webhook secrets, Resend credentials, order records, and private package data exist only in the Worker environment and its private bindings. The current `/staging/` deployment is sufficient for frontend testing; backend staging must use Stripe test mode, synthetic package data, and separate D1/R2 resources.

## MVP Goals

- Sell four individual sourcing packages and one all-category bundle.
- Support secure Stripe Checkout with server-side price validation.
- Automatically deliver the purchased resource after verified payment.
- Record orders, purchased items, payment status, and email delivery status.
- Provide contact, resend support, reviews, FAQ, refund, terms, and privacy flows.
- Keep all supplier and delivery content out of public frontend code and Git.

## Non-Goals

- No buyer accounts, dashboards, subscriptions, memberships, or public seller marketplace.
- No custom card form; Stripe hosts payment entry.
- No automatic publishing of reviews.
- No promises of profit, product quality, supplier availability, or delivery timing.

## Products

| Product | ID/slug | Price | Compare price | Badge |
| --- | --- | ---: | ---: | --- |
| Shoe Vendors | `shoe-vendors` | $7 | $15 | Launch Sale |
| Clothing Vendors | `clothing-vendors` | $7 | $15 | Launch Sale |
| AirPods & Headphones Vendors | `airpods-headphones-vendors` | $7 | $15 | Launch Sale |
| Cologne Vendors | `cologne-vendors` | $7 | $15 | Launch Sale |
| All Vendor Bundle | `all-vendor-bundle` | $12 | $28 | Best Value |

The bundle includes all four individual categories. Buying individually costs $28; the bundle costs $12 and saves $16.

## Required Buyer Flow

1. Buyer understands the product from the homepage.
2. Buyer selects one or more packages.
3. Client sends product IDs, never prices, to the backend.
4. Backend maps IDs to authoritative Stripe Price IDs.
5. Stripe hosts checkout and collects the delivery email.
6. A signed `checkout.session.completed` webhook verifies payment.
7. The backend creates or updates the order idempotently.
8. The matching private artifact is delivered through an order-specific secure method.
9. Confirmation and delivery results are logged for support.

## Functional Requirements

- Homepage with hero, catalog, bundle, how-it-works, trust, reviews, FAQ, contact, policies, and footer.
- Product details for each package.
- Quantity-one cart with bundle/individual conflict handling.
- Stripe Checkout with server-side validation.
- Success and canceled-checkout pages.
- Automated confirmation, delivery, delay, and support emails.
- Order records and email-delivery logs.
- Review submissions that remain pending until approved.
- Contact form with name, email, optional order ID, reason, and message.
- Support reason for package resend.

## Data Requirements

The backend should support:

- Products: ID, slug, copy, authoritative price, Stripe Price ID, status.
- Orders: internal order ID, Stripe IDs, buyer email, total, status, timestamps.
- Order items: order, product, product name, price paid.
- Email logs: template, recipient, provider ID, status, error, timestamps, resend state.
- Reviews: buyer details, product, rating, text, moderation status.
- Support requests: contact details, order ID, reason, message, status.

## Trust, Policy, and Payment Requirements

- Use Stripe Checkout and never store raw card data.
- Validate prices on the server.
- Verify webhook signatures and make fulfillment idempotent.
- State that ResaleLane sells informational sourcing resources only.
- State that ResaleLane is not affiliated with or endorsed by referenced brands, marketplaces, manufacturers, or suppliers.
- Require buyers to verify third-party details themselves.
- Never use counterfeit, bypass, guaranteed-profit, or guaranteed-authenticity positioning.
- All sales are final after digital delivery, with review only for duplicate charge, uncorrectable wrong delivery, or unresolved non-delivery.

## Delivery Requirements

- Delivery goes to the checkout email within a few minutes after verified payment.
- Buyers are told to check inbox, spam, junk, and promotions folders.
- The confirmation email is the buyer's order record in v1.
- Support can verify an order and resend delivery.
- Initial delivery and resend attempts should be logged separately.

## Brand and Social Requirements

- Dark premium design with white primary buttons and restrained accents.
- Geist or a similar modern grotesque typeface.
- Readable secondary text; `#737373` is reserved for low-priority legal copy.
- Required assets include horizontal SVG/PNG logo, square mark/avatar, favicon, 180x180 touch icon, and 1200x630 Open Graph image.
- Meta title: `ResaleLane — Premium Sourcing Resources for Resellers`.
- Meta description: `Shop digital sourcing packages with supplier contacts, marketplace links, and email delivery after secure checkout.`

## Launch Acceptance

Launch requires working mobile and desktop browsing, cart behavior, Stripe test checkout, verified webhook fulfillment, order/email logging, support and resend flow, policy pages, public-safe source, social previews, and a successful end-to-end test order.

Open launch inputs include Stripe Price IDs, final email provider/domain setup, secure delivery artifacts, and production environment configuration.
