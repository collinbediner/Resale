# Handoff: ResaleLane Storefront

## Overview
ResaleLane is a **clean, dark-mode digital storefront** that sells informational *vendor packages* — supplier contacts and marketplace links for resellers, delivered by email after checkout. Four single products ($7 each) plus an **All Vendor Bundle** ($12). No physical goods, no user accounts in v1, no course/membership/"vault" framing — it should read like a focused Shopify-style digital product shop a buyer understands in 5 seconds.

This package contains everything needed to build the production site: the HTML design reference, brand/logo assets, design tokens, the product data model, and full component + behavior specs.

## About the Design Files
The HTML files in this bundle are **design references**, not production code to ship as-is. They were built as a faithful prototype of the intended look and behavior. Your task is to **recreate them in a real codebase** using its established patterns and libraries. If no codebase exists yet, the recommended stack is **Next.js (App Router) + React + Tailwind CSS + Stripe Checkout**, but any modern framework is fine — match the visuals and behavior, not the prototype's internal structure.

The prototype simulates cart/checkout in the browser. In production, **pricing and the bundle-vs-individual rules must be enforced server-side** (see Stripe section) — never trust client-sent prices.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, shadows, and interactions are final. Use `tokens/tokens.css` / `tokens/tokens.json` as the source of truth and recreate the UI pixel-closely. Emoji are used as category icons in v1 — you may later swap them for a custom icon set, but keep them if launching fast.

## Tech Stack (recommended)
- **Next.js (App Router) + React + TypeScript**
- **Tailwind CSS** (map `tokens.json` into `tailwind.config` theme) or CSS variables from `tokens.css`
- **Stripe Checkout** (hosted) for payments
- **Resend / Postmark / SendGrid** for transactional delivery email
- **Geist** font (Vercel) — already the design font; load via `next/font` or Google Fonts

## Information Architecture
Single marketing page with in-page anchored sections, plus three overlays (cart drawer, product detail modal, checkout modal). In production these can stay as a one-page site or be split into routes:
- `/` — hero, products, bundle, how-it-works, reviews, FAQ, contact, policies
- `/vendors/[slug]` — optional dedicated product page (prototype uses a modal)
- `/checkout` — optional dedicated route (prototype uses a modal)
- `/policies`, `/contact` — optional standalone routes

Sections in order: **Header → Hero (+ bundle preview card) → Trust strip → Products grid → Bundle panel → How it works (+ delivery details) → Reviews (empty state) → FAQ → Contact form → Policies → Footer.**

## Product Data Model
See `data/products.json` (the single source of truth). Five products; `all-vendor-bundle` has `isBundle: true` and an `includes[]` array. All prices in whole USD. Mirror this into your DB/CMS and into **Stripe Products/Prices** (store the `id` as Stripe price metadata so the server can map a cart back to authoritative prices).

## Screens / Views

### Header (sticky)
- Height 64px, `--rl-surface` at 85% opacity + 14px backdrop blur, bottom border `--rl-border`. Max content width 1200px.
- Left: logo (chevron mark tile + "ResaleLane" wordmark, 19px/700, letter-spacing -0.03em).
- **Desktop (≥820px):** text links Vendors / FAQ / Policies / Contact (14.5px/500, `--rl-text-3`, hover → white). Secondary "Cart" button (`--rl-surface`, 1px `--rl-border-strong`) with a white pill count badge when cart > 0.
- **Mobile (<820px):** cart icon button (44×44) + hamburger (44×44). Hamburger opens a full-width dropdown menu (slides down, `rl-menu` animation) with Vendors / All Vendor Bundle / FAQ / Policies / Contact and a close button. Tapping the scrim closes it.

### Hero
- Two-column flex, wraps on mobile. Left: pill eyebrow ("Digital vendor packages · Instant email delivery"), H1 **"Premium Vendors for Resellers"** (display size, weight 800, letter-spacing -0.04em), subcopy (18px, `--rl-text-3`, max 500px), two CTAs: **Shop Vendors** (primary white) scrolls to products; **View Bundle Deal** (secondary) scrolls to bundle and triggers a 2-pulse white highlight ring on the bundle panel. Trust line below in `--rl-text-legal`.
- Right: **bundle preview card** (`--rl-surface-alt`, `--rl-shadow-float`) listing all four vendors with $15 strikethrough each, "$28 value — $12 today", $12, and an **Add Bundle to Cart** button.

### Products Grid
- `repeat(auto-fit, minmax(248px, 1fr))`, 18px gap.
- Card: `--rl-surface`, 1px `--rl-border`, radius `--rl-r-xl`, 24px padding. Hover: border → `--rl-border-strong`, `translateY(-3px)`, `--rl-shadow-card` (transition 0.18s).
- Card contents: 48px icon tile (top-left) + uppercase badge pill (top-right, e.g. "Launch Sale"); product name (18px/700); description (13.5px, `--rl-text-3`); price row = **$7** (26px/800) + **$15** strikethrough (`--rl-text-faint`); full-width **Add to Cart** (primary); "View Details" text link below (opens detail modal).

### Bundle Panel
- `--rl-surface-alt`, 1px `--rl-border-strong`, radius 20px, `--rl-glow-bundle`. "BEST VALUE" pill, H2 "All Vendor Bundle", description, $12 with "$28 value / Save $16". Buttons: **Add Bundle to Cart** + "View Details".
- When reached via "View Bundle Deal", an absolutely-positioned 2px white ring pulses twice (`rl-pulse`, ~2.4s) then removes itself.

### How It Works
- 3 cards (01 Choose Your Vendor / 02 Checkout Securely / 03 Check Your Email) + a **Delivery Details** panel reinforcing email delivery, spam-folder check, and "save your confirmation email as your order record" (no accounts in v1).

### Reviews
- **Empty state only** — dashed-border panel, "Reviews are opening soon", explicit "no fake testimonials". Do not seed fake reviews. Wire to real verified-buyer reviews post-launch.

### FAQ
- Native `<details>` accordions (5 entries). Summary 16px/600 with a "+" affordance. See copy in the prototype `faqs` array.

### Contact
- Card with form: Name, Email, Order ID (optional), Reason `<select>` (6 options), Message `<textarea>`, **Send message** button. Prototype only toasts; **wire to a real endpoint** (email or ticketing). Support email shown: `collin.bediner+support@gmail.com`.

### Policies
- Three cards: **Refund Policy** (all sales final after digital delivery; exceptions for duplicate charge / wrong package / unresolved delivery failure), **Terms**, **Privacy Policy** (collects checkout email, order details, support + review submissions; Stripe handles payments; no raw card storage). Review/finalize with counsel before launch.

### Footer
- Logo + the compliance disclaimer (verbatim below), Shop and Help link columns, support email, copyright line. The disclaimer must appear here and is referenced in detail/checkout too.

## Overlays & Interactions

### Cart Drawer
- Right-side drawer, `min(430px, 100vw)`, slides in (`rl-slide-in`, 0.28s `--rl-ease`); scrim fades in and closes on click.
- Lists cart line items (icon, name, price, Remove). Empty state with "Continue Shopping". Footer shows **Subtotal** (sum of line-item prices), two reassurance lines (email delivery, Stripe), **Checkout Securely** button + "Continue Shopping".

### Cart Logic (CRITICAL — verify exactly)
State is an array of product `id`s. **Each product adds itself** — never substitute the bundle.
- Add a product already in cart → no dup; toast "Already in cart".
- **Add bundle while individual items present** → add bundle, then show conflict prompt: **Keep Bundle Only** (cart = `[bundle]`) or **Keep Everything**.
- **Add individual while bundle present** → show conflict prompt: **Keep Bundle Only** (no-op keep) or **Add Anyway** (adds the individual).
- Subtotal = sum of each line item's own price (bundle $12, each individual $7). Cart count badge = number of line items.
- Empty cart → "Checkout Securely" is not shown; checkout cannot open.

### Product Detail Modal
- Centered modal (max 520px), scrim closes. Icon + badge + name, price + compare, description, "What You Get" list, "How Delivery Works", "Before You Buy" compliance note, and an **Add to Cart / Add Bundle to Cart** button (label depends on `isBundle`).

### Checkout Modal (scaffold)
- Order summary (line items + subtotal), **Delivery email** input, and a **disabled** "Continue to Stripe (Setup Pending)" button with a note. **Replace with real Stripe Checkout**: POST cart → server creates a Stripe Checkout Session from authoritative prices → redirect to Stripe → on `checkout.session.completed` webhook, send the vendor package(s) to the email and create an order record.

### Toast
- Bottom-center white pill, pops in, auto-dismisses after ~1.8s (`rl-pop`).

## Animations & Motion
- `rl-fade` (scrim), `rl-slide-in` (cart drawer), `rl-menu` (mobile menu), `rl-pop` (modals/toast), `rl-pulse` (bundle highlight). Easing `--rl-ease`. Durations in tokens. `scroll-behavior: smooth`; anchored scroll offsets 72px for the sticky header.

## State Management
- `cart: string[]` (product ids) — persist to `localStorage` in production so it survives reload.
- UI flags: `cartOpen`, `menuOpen`, `checkoutOpen`, `detailId`, `conflict ({type:'bundle'} | {type:'individual', pendingId})`, `highlightBundle`, `toast`, `isMobile` (from a resize listener at the 820px breakpoint).
- Server is the source of truth for price + delivery; client state is presentation only.

## Stripe & Fulfillment Notes
1. Create Stripe Products/Prices for all 5 SKUs; store the `products.json` `id` in price metadata.
2. Client sends only cart `id`s; server maps to Stripe prices and creates the Checkout Session.
3. Enforce the bundle rule server-side: if the bundle id is present, ignore individual ids in the same order (or honor the user's "Add Anyway" choice explicitly — decide one and enforce it).
4. Fulfill on the `checkout.session.completed` webhook: email the package(s) to the session's email, persist an order (id like `RL-#####`), and surface that id in the confirmation email (it's the buyer's only record in v1).
5. Always show the compliance disclaimer at checkout.

## Design Tokens
Full values in `tokens/tokens.css` and `tokens/tokens.json`. Highlights: bg `#080808`, surface `#111111`, surfaceAlt `#151515`, border `#262626`, borderStrong `#3A3A3A`; text `#FFFFFF` / `#D4D4D4` / `#A3A3A3` / legal `#737373` / faint `#525252`. Primary button = white bg / `#080808` text (hover `#E6E6E6`); secondary = `#111` / 1px `#3A3A3A`. Font Geist. Radii 8/10/12/16/18/99. Max width 1200, header 64, mobile breakpoint 820.

## Brand & Logo Assets (`assets/`)
Monochrome — white + gray chevrons ("lane" / forward motion). **Do not introduce a brand color.**
- `logo-mark.svg` — chevron mark, transparent background.
- `logo-mark-tile.svg` — mark on dark rounded tile (app icon / nav use).
- `favicon.svg` — heavier-stroke mark for small sizes (export 32/16 PNG + `.ico` as needed).
- `logo-wordmark-dark.svg` / `logo-wordmark-light.svg` — horizontal lockups for dark/light backgrounds.
- `avatar-white.svg` / `avatar-black.svg` — square social avatars (IG/TikTok/Discord).
- `og-image.svg` — 1200×630 social share image. **Rasterize to PNG** for `og:image`/`twitter:image` (most scrapers don't accept SVG).
- Wordmark/OG SVGs reference the Geist font by name; if you need them rendered where Geist isn't installed, outline the text to paths on export.

## SEO / Meta
The prototype `<head>` includes title, description, and Open Graph/Twitter tags. Update `og:url`/`og:image` to your real domain + rasterized OG PNG, and add `favicon.svg` + apple-touch-icon.

## Files in this bundle
- `ResaleLane Storefront.dc.html` — the storefront design reference (all sections + overlays + cart logic).
- `ResaleLane Storefront (standalone).html` — self-contained offline build of the same (fonts/styles inlined) for quick review.
- `ResaleLane Style Guide.dc.html` — color / type / component / voice reference.
- `ResaleLane Logo Set.dc.html` — logo system reference (do/don't, clear space, usage).
- `tokens/tokens.css`, `tokens/tokens.json` — design tokens.
- `data/products.json` — product catalog / data model.
- `assets/*.svg` — logo, avatar, favicon, OG assets.

## Compliance disclaimer (use verbatim in footer)
> ResaleLane sells informational vendor resources only. ResaleLane is not affiliated with, endorsed by, or sponsored by any third-party brands, marketplaces, manufacturers, or suppliers. Buyers should verify pricing, product details, quality, shipping, and availability directly before purchasing from any third party.

## Acceptance Criteria
- [ ] Adding Shoe / Clothes / AirPods / Cologne each adds **that** item at $7; bundle adds at $12.
- [ ] Bundle↔individual conflict prompts behave exactly as specified; subtotal and badge always correct.
- [ ] Cart persists across reload (localStorage); empty cart blocks checkout.
- [ ] Checkout creates a Stripe session from **server-side** prices; fulfillment email fires on webhook.
- [ ] Mobile menu + responsive layout work at <820px; hit targets ≥44px.
- [ ] Disclaimer present in footer; refund stance = all sales final after delivery.
- [ ] Visuals match tokens; no brand color introduced; Geist loaded.
- [ ] favicon + rasterized OG image wired; meta tags point at real domain.
