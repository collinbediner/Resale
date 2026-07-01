# ResaleLane Backup And Recovery

## Goal

Protect order history and private delivery artifacts without copying buyer or vendor data into GitHub, chat, or screenshots.

## Ownership And Cadence

- Owner: Collin
- Technical operator: whoever is actively managing the production Worker deployment
- Review cadence: monthly review of backup access and quarterly synthetic restore drill

## D1 Backup Procedure

Use Cloudflare D1 export for both staging and production. Exports stay in a private operator-controlled location, never in this repository.

Example commands:

```bash
npx wrangler d1 export resalelane-orders-staging --remote --output ./private-backups/resalelane-orders-staging.sql
npx wrangler d1 export resalelane-orders-production --remote --output ./private-backups/resalelane-orders-production.sql
```

Rules:

- exports remain private
- use least-privilege Cloudflare access
- never paste row contents into tickets, GitHub comments, or logs
- record only the export filename, environment, timestamp, operator, and checksum

## R2 Artifact Recovery

Production artifact keys are immutable and versioned:

```text
artifacts/production/{product-id}/{version}/package.pdf
artifacts/production/{product-id}/{version}/manifest.json
```

Vendor updates must:

1. create a new version
2. keep the previous version
3. update the active mapping separately
4. preserve historical order records and historical `order_items.artifact_version`

Package rollback must never rewrite historical orders. If a package is bad, publish a new version or point only the active mapping at a known-good version.

## Synthetic Staging Restore Drill

Use synthetic data only.

1. Export the staging database.
2. Restore it into a disposable staging-safe target or fresh D1 copy.
3. Reapply migrations in order.
4. Insert or verify a synthetic paid order with synthetic order items and delivery attempts.
5. Confirm uniqueness constraints still hold for:
   - `stripe_checkout_session_id`
   - `stripe_event_id`
   - `order_id, attempt_number`
6. Confirm a synthetic failed fulfillment order can move back through manual retry without altering the recorded artifact version.
7. Record the drill date, operator, environment, and pass/fail result in the private planning repo only.

## Recovery Objectives

- Storefront recovery target: restore public deploy from GitHub `main` plus the current `release.json`
- Worker recovery target: restore deployable code from GitHub plus Cloudflare secrets from provider-managed storage
- Order-history recovery target: D1 export or time-travel source
- Artifact recovery target: private R2 versioned objects plus private source PDFs from the planning repo

## Restoration Steps

### D1

1. Choose the correct environment.
2. Create or identify the recovery target.
3. Import only from a private approved export source.
4. Reapply migrations after import if needed.
5. Validate schema, indexes, and order-state counts before reopening traffic.

### R2

1. Verify the object key and version from `order_items.artifact_version`.
2. Restore only the missing versioned object.
3. Do not overwrite a healthy historical key with a different file.
4. Validate checksum before marking recovery complete.

## Evidence To Keep

Keep privately:

- export filename
- environment
- operator
- timestamp
- checksum
- restore-drill result

Do not keep publicly:

- buyer emails
- vendor contacts
- PDFs
- object contents
- raw D1 row dumps

## Current Status

- D1 has a documented export procedure using Wrangler.
- R2 artifacts are versioned and immutable by key convention.
- Historical order records already preserve `artifact_version`.
- Recovery drill evidence from 2026-07-01:
  - remote staging export completed to a private local file
  - SHA-256 recorded privately for the export artifact
  - export restored into a disposable SQLite copy
  - synthetic failed order `RL-DRILL-20260701` inserted and removed successfully
  - synthetic restored order preserved `all-vendor-bundle|v1`, proving the rollback path does not require changing historical order-version records
- Remaining work after launch is recurring private backup execution and quarterly restore-drill repetition.
