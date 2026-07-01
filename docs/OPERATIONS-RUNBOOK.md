# ResaleLane Operations Runbook

## Scope

This runbook covers the live private Worker paths that can affect checkout, fulfillment, alerts, and customer follow-up:

- checkout creation failures
- Stripe webhook processing failures
- fulfillment delivery failures
- fulfillment retry exhaustion
- daily monitor failures

Use the `X-Request-ID` response header, the ResaleLane order ID, and the Stripe event/session ID as the safe correlation identifiers. Do not copy raw buyer emails, private vendor data, secrets, raw webhook signatures, or artifact contents into tickets or screenshots.

## Alert Coverage

Production alerts now cover these categories:

- `checkout_failure`
- `webhook_failure`
- `fulfillment_retry_scheduled`
- `delivery_failed`
- `retry_exhausted`
- `manual_retry_failure`
- `monitor_failure`

Operational alerts go to the support inbox, CC the configured internal recipients, and mirror to the private `ntfy` topic when configured. Staging alerts are visibly marked as `STAGING`; production alerts are marked as `PRODUCTION`.

## Investigation Checklist

1. Confirm whether the issue is production or staging.
2. Collect the `X-Request-ID`, order ID, Stripe event ID, and the alert category.
3. Check `https://api.shopresalelane.com/health` or the staging equivalent.
4. Review D1 order state:
   - `orders.payment_status`
   - `orders.fulfillment_status`
   - `order_items.artifact_version`
   - `payment_events.processing_status`
   - `delivery_attempts.delivery_status`
5. Verify the expected R2 object key still exists for the recorded artifact version.
6. Confirm whether Resend or `ntfy` rejected the alert or fulfillment request.
7. Fix the root cause before any manual retry.

## Manual Fulfillment Retry

Manual retry is only for paid orders whose `fulfillment_status` is already `failed`.

The Worker now exposes an internal retry endpoint that preserves the historical `order_items.artifact_version` instead of switching the buyer to a newer package version.

Example:

```bash
curl --fail --silent --show-error \
  --request POST \
  --url https://api.shopresalelane.com/internal/fulfillment/retry \
  --header "Authorization: Bearer $UPTIME_MONITOR_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{"orderId":"RL-EXAMPLE123"}'
```

Retry rules:

- only paid orders are eligible
- only `fulfillment_status = failed` orders are eligible
- the retry uses the original recorded artifact version
- transient failures retry automatically with bounded backoff
- historical order records stay unchanged apart from the new delivery-attempt history and fulfillment status

## Rollback

If the issue is code-related:

1. Revert the bad commit on `staging` first when possible.
2. Run `npm run check`.
3. Push the revert and wait for GitHub Actions to pass.
4. Confirm the public `release.json` and the private Worker health endpoint both match the intended rollback state.

If the issue is artifact-related:

1. Do not overwrite the old object.
2. Upload a corrected artifact under a new version key.
3. Update the active version mapping only after staging verification.
4. Keep the prior version available for historical support.

## Customer Follow-up

When a buyer was charged but delivery failed:

1. Confirm the paid order exists in D1.
2. Retry fulfillment only after the root cause is fixed.
3. Reply from support using the order ID only.
4. Do not ask the buyer to purchase again unless finance explicitly confirms there was no successful charge.
5. If the delay will exceed the normal window, proactively tell the buyer the order is being retried and reference the ResaleLane order ID.

## Synthetic Failure Proof

The automated test suite now covers:

- invalid or missing Turnstile handling
- checkout rate limiting
- paid order preservation when fulfillment fails
- transient fulfillment retry before success
- manual monitor alert routing and auth

Run this before closing related incident or launch work:

```bash
npm run check
```
