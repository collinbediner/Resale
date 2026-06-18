# ResaleLane Spec Snapshot

Source Google Doc: https://docs.google.com/document/d/17GkOCM2sLkQI8v40Q63FanG1iIAAxlYiatf1FFNjZ5A

Snapshot date: 2026-06-17

## Locked Decisions

- Brand: ResaleLane
- Domain: `shopresalelane.com`
- Support email: `collin.bediner+support@gmail.com`
- Style: dark, clean, mobile-first Shopify-style storefront
- Checkout: Stripe Checkout, not active until account/setup exists
- Delivery: automatic email after successful payment
- Supplier data: server-side only, never in frontend code
- Public repo: `collinbediner/Resale`
- Storefront hosting: GitHub Pages
- Backend target: Cloudflare Worker with D1 and private R2/server-side configuration
- Payment target: Stripe Checkout with server-side Price ID mapping and signed webhook verification
- Email target: Resend from `orders@shopresalelane.com`
- Staging target: existing `/staging/` path; no dedicated staging hostname is required for the current architecture

## Products

| Product | Sale Price | Compare Price | Badge |
| --- | ---: | ---: | --- |
| Shoe Sourcing Package | $7 | $15 | Launch Sale |
| Clothing Sourcing Package | $7 | $15 | Launch Sale |
| Electronics Accessories Sourcing Package | $7 | $15 | Launch Sale |
| Fragrance Sourcing Package | $7 | $15 | Launch Sale |
| All Sourcing Bundle | $12 | $15 | Best Value |

## Required Pages

- Home
- Shop / All Packages
- Product pages
- Cart drawer
- Stripe checkout
- Success page
- Checkout canceled page
- Reviews
- FAQ
- Contact
- Refund Policy
- Terms
- Privacy Policy

## Safety Requirements

- Do not claim guaranteed profits.
- Do not claim guaranteed product quality.
- Use legitimate sourcing language.
- Do not publicly expose supplier contacts.
- Buyers must verify authenticity, quality, shipping, price, and availability directly with suppliers.
- Policies must clearly explain that ResaleLane provides sourcing information only.
