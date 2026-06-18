# ResaleLane Website Specification

Source draft: [ResaleLane Website Spec](https://docs.google.com/document/d/17GkOCM2sLkQI8v40Q63FanG1iIAAxlYiatf1FFNjZ5A)

- Source version: 1.0, June 17, 2026
- Repository snapshot: June 18, 2026

This tracked file is authoritative for collaborators. It describes the safe-launch website behavior; implementation details that differ are recorded in `docs/ARCHITECTURE.md`.

## Locked Decisions

- Brand: ResaleLane
- Domain: `shopresalelane.com`
- Support: `collin.bediner+support@gmail.com`
- Style: dark, clean, mobile-first storefront
- Payment target: Stripe Checkout
- Delivery target: automated email after successful payment
- Private supplier details: server-side only

## Public Pages and Views

- Home and all-packages catalog
- Product details
- Cart drawer
- Stripe checkout
- Payment success and canceled states
- Reviews
- FAQ
- Contact/support
- Refund policy
- Terms
- Privacy policy

The current static MVP presents most content on one page with overlays. Separate routes may be added when the backend and checkout are implemented.

## Homepage Order

1. Header/navigation
2. Hero
3. Trust strip
4. Product cards
5. Featured bundle
6. How it works and delivery details
7. Reviews
8. FAQ
9. Contact
10. Policies
11. Footer

## Required Hero Content

- Headline: Premium Sourcing Resources for Resellers
- Supporting copy: supplier contacts, marketplace links, and sourcing resources across the available categories
- Primary action: Shop Packages
- Secondary action: View Bundle Deal
- Trust message: secure checkout and email delivery after successful payment

## Cart Behavior

- Each package may appear only once.
- Adding an existing package does not create a duplicate.
- Adding the bundle while individual packages are present asks whether to keep only the bundle or keep everything.
- Adding an individual while the bundle is present asks whether to keep only the bundle or add the individual anyway.
- The subtotal is calculated from the actual line items.
- An empty cart cannot open checkout.
- Cart state persists across page reloads.

## Checkout and Delivery

The browser sends only product IDs. A server validates those IDs, maps them to Stripe prices, and creates the Checkout Session. The server verifies Stripe's signed webhook before recording the order or sending anything.

Private delivery content must never appear in HTML, browser JavaScript, public assets, GitHub, or a public deployment artifact.

## Trust and Support Copy

- ResaleLane provides informational sourcing resources.
- ResaleLane does not own or control third-party suppliers.
- Buyers verify authenticity, quality, shipping, pricing, inventory, and availability.
- Digital sales are final after delivery, subject to the documented limited exceptions.
- Buyers should save the confirmation email and check spam, junk, and promotions.
- Contact includes delivery problems, package resend, order issues, and pre-purchase questions.

## Reviews

Do not seed fake testimonials. Review submissions remain private and pending until an operator approves them.

## Accessibility and Performance

- Key flows must work on common iPhone and Android sizes.
- Interactive targets should be at least 44 by 44 pixels.
- Navigation, dialogs, forms, and accordions must work with a keyboard.
- Important supporting text must meet readable contrast.
- Avoid large scripts and oversized assets.

## Visual Source Files

The exact design references, brand exports, tokens, and catalog model are tracked in:

`Design System/design_handoff_resalelane/`

Production source lives in `site/`. The design HTML files are references and must not replace production code without review and testing.

## Current Implementation Note

The current production system is a dependency-free static site on GitHub Pages, not the source draft's proposed React/Next.js and Cloudflare Pages stack. Stripe and the private backend are not active, so checkout remains disabled. See `docs/ARCHITECTURE.md` and `docs/ROADMAP.md` for the current and target systems.
