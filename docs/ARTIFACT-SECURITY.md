# Fulfillment Artifact Security

## Decision

Customer delivery artifacts will live in a private Cloudflare R2 bucket. They will never be committed to either Git repository, placed in Google Drive links sent to customers, or copied into frontend files.

The fulfillment Worker is the only service allowed to read production package data. After a verified purchase, the customer receives the contact details directly in the Resend fulfillment email and may additionally receive either:

1. A short-lived, single-order download URL generated after a verified Stripe webhook, or
2. A small email attachment when the final artifact size and email-provider limits make that safer.

Direct email content is the default for concise contact packages. Short-lived delivery URLs are preferred for larger or updateable files because they support revocation, expiration, delivery logging, and artifact updates without resending permanent public links.

## Storage Layout

Use immutable, versioned object keys:

```text
artifacts/{environment}/{product-id}/{version}/package.pdf
artifacts/{environment}/{product-id}/{version}/manifest.json
```

Example:

```text
artifacts/production/shoe-vendor/v1/package.pdf
```

Never use supplier names, customer email addresses, order IDs, or secrets in object keys.

## Current Production Artifact Set

The v1 customer PDF artifacts are uploaded to the private production R2 bucket `resalelane-artifacts-production` and were verified by downloading them back from Cloudflare R2 and comparing SHA-256 hashes to the private source PDFs.

Current production object keys:

```text
artifacts/production/shoe-vendor/v1/package.pdf
artifacts/production/clothes-vendor/v1/package.pdf
artifacts/production/airpods-headphones-vendor/v1/package.pdf
artifacts/production/cologne-vendor/v1/package.pdf
artifacts/production/all-vendor-bundle/v1/package.pdf
```

The private source artifacts, generated HTML, validation report, rendered QA images, and artifact-generation scripts live in the private `collinbediner/Resale-Planning` repository under `customer-delivery-artifacts/vendor-resources/`.

Do not copy the PDFs, extracted text, rendered validation images, or private vendor source data into this public repository.

The manifest contains public-safe operational metadata only:

```json
{
  "productId": "shoe-vendor",
  "version": "2026-06-18.1",
  "contentType": "application/pdf",
  "sha256": "hex-digest",
  "createdAt": "ISO-8601 timestamp",
  "status": "active"
}
```

Supplier contacts remain inside the encrypted-at-rest object or Worker-only configuration until a verified order is fulfilled. The Worker may copy the purchased contacts into that buyer's transactional email, but never into the manifest, logs, database, ticket system, or public files.

## Environment Isolation

- Use separate R2 buckets for staging and production.
- Staging contains synthetic supplier data only.
- Production credentials must not be available to preview or staging deployments.
- Stripe test-mode orders can only resolve staging artifacts.
- Live Stripe events can only resolve production artifacts.

## Access Control

- R2 buckets remain private with public access disabled.
- Bind the production bucket only to the production fulfillment Worker.
- Use least-privilege Cloudflare API tokens for deployment automation.
- Do not expose R2 credentials, object keys, or binding names to browser JavaScript.
- Administrative artifact uploads require an authenticated, audited operator workflow.
- Rotate deployment and service credentials after staff changes or suspected exposure.

## Delivery Authorization

Before issuing a delivery:

1. Verify the Stripe webhook signature.
2. Confirm the event is a successful, live/test-mode-appropriate Checkout Session.
3. Enforce idempotency using the Stripe event ID and Checkout Session ID.
4. Map Stripe Price IDs to internal product IDs server-side.
5. Resolve the active artifact version from server-controlled configuration.
6. Create an order-bound delivery token with a short expiration.
7. Record the artifact version and delivery attempt in D1.

The download endpoint validates a cryptographically random token stored as a hash in D1. It does not accept a raw object key from the customer.

Recommended initial limits:

- URL expires after 24 hours.
- Maximum 5 successful downloads per order.
- Support can revoke and replace a token.
- Do not reveal whether arbitrary order IDs or customer emails exist.

## Versioning And Updates

Artifacts are immutable. Updating supplier content creates a new version; it never overwrites the previous object.

Release procedure:

1. Prepare the artifact outside the public repository.
2. Scan it for secrets that do not belong in the customer package.
3. Validate links and supplier disclaimers.
4. Generate and verify its SHA-256 digest.
5. Upload it under a new version key.
6. Download it through the staging fulfillment path and compare the digest.
7. Approve the version for production.
8. Change the active-version mapping.
9. Keep the previous version available for historical order support.

Past orders retain the artifact version recorded at purchase unless support deliberately issues an updated replacement.

## Logging And Privacy

Allowed logs:

- Internal order ID
- Stripe event/session ID
- Internal product ID
- Artifact version
- Delivery status and timestamps
- Email-provider message ID
- Error category

Never log:

- Supplier contacts or artifact contents
- Raw delivery tokens
- Stripe secrets or webhook signatures
- Full customer email addresses in routine logs
- Card or bank information

## Backup And Recovery

- Enable R2 object versioning when available for the selected account/plan.
- Replicate production artifacts to a second private backup location or scheduled encrypted export.
- Back up D1 order and delivery records separately from artifacts.
- Test restoration quarterly using synthetic staging data.
- Record backup checksums and restoration evidence in the private planning repository.
- A restore must not change the active artifact mapping until verification completes.

## Incident Response

If an artifact or delivery link is exposed:

1. Disable the affected artifact version or token.
2. Rotate relevant credentials.
3. identify affected orders from D1 without copying customer data into tickets.
4. Preserve audit logs.
5. Publish a corrected artifact version.
6. Notify affected customers when legally or contractually required.
7. Document cause, scope, and prevention actions privately.

## Acceptance Checklist

- [x] Private staging and production buckets exist.
- [x] Production v1 PDF artifacts are uploaded to private R2 and hash-verified.
- [x] Worker bindings are environment-specific.
- [ ] Public bucket access is disabled.
- [ ] Staging uses synthetic data only.
- [ ] Signed/order-bound delivery tokens expire.
- [ ] D1 records artifact version and delivery attempts.
- [ ] Artifact upload validates digest and customer-safe content.
- [ ] Restore test succeeds in staging.
- [ ] Logs contain no supplier data or raw tokens.
