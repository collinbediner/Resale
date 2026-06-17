# ResaleLane Architecture

## Current Scaffold

- Frontend: Vite + React + TypeScript
- Hosting: GitHub Pages
- Production URL: `https://shopresalelane.com/`
- GitHub Pages fallback: `https://collinbediner.github.io/Resale/`
- Preview URL: GitHub Pages PR preview path from CI

## Future Backend

Stripe, Resend, and supplier delivery logic are intentionally not implemented in the public frontend.

Expected production backend responsibilities:

- Create Stripe Checkout sessions.
- Verify `checkout.session.completed` webhook signatures.
- Read purchased package and buyer email.
- Send matching delivery email via Resend.
- Store order and delivery status in Cloudflare D1 or equivalent.
- Keep supplier details private and server-side.

## Domain

DNS points the apex domain to GitHub Pages and `www` to `collinbediner.github.io`.
