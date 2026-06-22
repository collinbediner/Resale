# ResaleLane Data Retention

## Scope

This policy covers D1 order, delivery, Stripe-event, and support metadata. It does not permit supplier contacts, PDF contents, raw Stripe payloads, secrets, signatures, card details, or download tokens in D1.

## Data Minimization

- Store one normalized checkout email because delivery and support require it.
- Do not store customer names, billing addresses, card details, or IP addresses unless a later approved requirement makes them necessary.
- Store Stripe identifiers, internal product IDs, artifact versions, provider message IDs, timestamps, statuses, and safe failure categories.
- Keep private supplier data in private R2 only.

## Retention Rules

- New orders and support requests receive a provisional retention date 24 months after creation.
- The 24-month period supports delivery problems, refunds/disputes, accounting reconciliation, and abuse investigation. The owner may shorten or extend it after tax/legal review.
- Stripe event IDs, internal order totals, product IDs, artifact versions, and non-PII delivery history may remain after anonymization to preserve idempotency and financial audit integrity.
- A legal hold or unresolved dispute pauses anonymization for the affected record.

## Anonymization

No automatic deletion job runs until the owner approves the final retention period.

When approved, the operator:

1. Exports or verifies the required accounting record outside public GitHub.
2. Selects records whose `retention_expires_at` has passed and which have no hold.
3. Replaces buyer/requester email with a non-deliverable order-specific placeholder.
4. Sets `anonymized_at`.
5. Preserves Stripe IDs, totals, products, statuses, timestamps, and delivery outcomes.
6. Records only aggregate counts and completion time in the ticket—never customer data.

## Recovery

- Migrations are forward-only and committed under `migrations/`.
- Restore tests use the staging database and synthetic records.
- Recovery must reapply migrations in order and verify uniqueness constraints before accepting webhooks.
- Production restoration requires an explicit owner-approved backup source and must not copy records into GitHub, logs, screenshots, or tickets.
