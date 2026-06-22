# ResaleLane Security Operations

## Current Controls

- The public repository contains no service secrets or private supplier data.
- CI runs a tracked-file secret-pattern scan, JavaScript tests, Worker configuration dry runs, and CodeQL.
- Dependabot monitors npm and GitHub Actions dependencies.
- Worker endpoints use explicit routes, approved origins, bounded JSON bodies, exact schemas, route-specific rate-limit keys, redacted errors, and structured logs without message bodies.
- The daily monitor calls an authenticated Worker-only endpoint. GitHub stores only a dedicated monitor token, never the Resend API key.
- Manual alert-path tests use the workflow's `force_failure` input so the team can verify notifications without taking production offline.
- Staging and production use separate D1 databases and R2 buckets. Staging has no production Resend secret.
- R2 buckets remain private and are accessed only through Worker bindings.
- Storefront pages deploy a restrictive CSP and referrer policy. The API adds content-type, frame, referrer, resource, and permissions headers.

## Secret Rotation

Never paste a secret into chat, GitHub, source files, screenshots, or tickets.

For each provider:

1. Create a replacement credential with the minimum required access.
2. Install it using the provider’s secret store (`wrangler secret put` or GitHub Actions secrets).
3. Test staging or a controlled production request.
4. Revoke the old credential only after the replacement succeeds.
5. Record the credential name, rotation date, tester, and result—never its value.

Rotate immediately after suspected exposure, collaborator removal, unexplained provider activity, or a failed secret scan involving a real credential.

## Incident Response

1. Disable the affected endpoint or credential.
2. Preserve safe request IDs, timestamps, provider IDs, and failure categories.
3. Do not copy customer emails, supplier contacts, raw payloads, tokens, or secrets into tickets.
4. Rotate credentials and deploy the smallest safe fix.
5. Verify staging, production health, and affected provider logs.
6. Notify affected customers when required by the approved policy or applicable law.
7. Document cause, scope, remediation, and prevention using redacted evidence.

## Remaining Launch Controls

- Add Turnstile to public support and checkout submissions after a fresh Cloudflare token with Turnstile edit permission is available.
- Add Stripe signature verification and replay tests when the separate Stripe test account and webhook secret exist.
- Configure Cloudflare response-header rules for the static GitHub Pages origin if stronger header-only directives are required.
- Perform a focused final security review after checkout, webhook fulfillment, resend, and artifact delivery are complete.
