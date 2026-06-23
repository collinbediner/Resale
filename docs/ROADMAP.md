# ResaleLane Delivery Roadmap

The detailed backlog is private because it includes operations and future fulfillment design:

- Private planning repository: `collinbediner/Resale-Planning`
- Private GitHub Project: [ResaleLane Delivery Kanban](https://github.com/users/collinbediner/projects/1)

Every roadmap item must be represented by one canonical issue in the planning repository and that same issue must appear on the Project board. Board flow is `Backlog` -> `To Do` -> `In Progress` -> `UAT` -> `Done`.

## Launch Blockers

1. Implement the Cloudflare Worker checkout and signed-webhook endpoints.
2. Configure Stripe products, authoritative Price IDs, Checkout, and test/live secrets.
3. Configure Resend delivery from `orders@shopresalelane.com`.
4. Build fulfillment email logic that reads the approved private R2 v1 package artifacts.
5. Build success, cancel, resend-help, and support flows around real checkout.
6. Complete end-to-end Stripe test-mode launch verification before enabling live checkout.

## Completed Launch Dependencies

- Package contact data and bundle composition are approved for the current v1 artifact set.
- Four individual vendor PDFs and one all-vendor bundle PDF are generated in the private planning repository.
- Production v1 PDFs are uploaded to private Cloudflare R2 and hash-verified.
- Separate staging and production D1 databases and R2 buckets exist.
- Support form email and daily production monitor email are already live through the private Worker.

## After Checkout Is Working

- Verified-buyer review submission and moderation
- Legal review of policies and checkout language
- Google Analytics 4 and privacy-safe ecommerce events
- Monitoring, alerting, retries, backups, and restoration drills

## Approved Staging

The `staging` branch deploys to:

`https://shopresalelane.com/staging/`

Pull requests also receive their own preview path. This path-based frontend staging model is approved for the current architecture; a dedicated staging hostname is not required. Backend testing still requires Stripe test mode, synthetic package data, and separate D1/R2 resources so staging cannot access live orders or production contacts.
