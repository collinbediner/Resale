# ResaleLane Delivery Roadmap

The detailed backlog is private because it includes operations and future fulfillment design:

- Private planning repository: `collinbediner/Resale-Planning`
- Private GitHub Project: ResaleLane Delivery

## Launch Blockers

1. Decide whether production moves from GitHub Pages to the PRD's Cloudflare Pages architecture.
2. Establish a truly isolated staging hostname and approval gate.
3. Configure Stripe products, authoritative prices, Checkout, and signed webhooks.
4. Define and secure the exact digital artifact delivered for every product.
5. Configure Resend, domain authentication, confirmation, receipt, and delivery emails.
6. Store orders and delivery attempts in Cloudflare D1.
7. Build success, cancel, resend-help, and support flows.
8. Complete end-to-end test-mode launch verification.

## After Checkout Is Working

- Verified-buyer review submission and moderation
- Real support endpoint with abuse protection
- Legal review of policies and checkout language
- Google Analytics 4 and privacy-safe ecommerce events
- Monitoring, alerting, retries, backups, and restoration drills

## Current Interim Staging

The `staging` branch deploys to:

`https://shopresalelane.com/staging/`

Pull requests also receive their own preview path. These paths protect the production root from ordinary feature review, but the target architecture is a separate staging hostname/project for stronger isolation.
