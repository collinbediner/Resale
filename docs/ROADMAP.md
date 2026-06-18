# ResaleLane Delivery Roadmap

The detailed backlog is private because it includes operations and future fulfillment design:

- Private planning repository: `collinbediner/Resale-Planning`
- Private GitHub Project: [ResaleLane Delivery Kanban](https://github.com/users/collinbediner/projects/1)

Every roadmap item must be represented by one canonical issue in the planning repository and that same issue must appear on the Project board. Board flow is `Backlog` -> `To Do` -> `In Progress` -> `UAT` -> `Done`.

## Launch Blockers

1. Implement the Cloudflare Worker checkout and signed-webhook endpoints.
2. Configure Stripe products, authoritative Price IDs, Checkout, and test/live secrets.
3. Define and secure the exact package contact data and optional files delivered for every product.
4. Configure private staging/production R2 bindings or equivalent Worker-only configuration.
5. Configure Resend domain authentication and delivery from `orders@shopresalelane.com`.
6. Store orders and delivery attempts in separate staging/production D1 databases.
7. Build success, cancel, resend-help, and support flows.
8. Complete end-to-end Stripe test-mode launch verification before enabling live checkout.

## After Checkout Is Working

- Verified-buyer review submission and moderation
- Real support endpoint with abuse protection
- Legal review of policies and checkout language
- Google Analytics 4 and privacy-safe ecommerce events
- Monitoring, alerting, retries, backups, and restoration drills

## Approved Staging

The `staging` branch deploys to:

`https://shopresalelane.com/staging/`

Pull requests also receive their own preview path. This path-based frontend staging model is approved for the current architecture; a dedicated staging hostname is not required. Backend testing still requires Stripe test mode, synthetic package data, and separate D1/R2 resources so staging cannot access live orders or production contacts.
