import assert from "node:assert/strict";
import test from "node:test";
import {
  PRODUCT_CATALOG,
  activeArtifactVersionMap,
  artifactAttachmentFilename,
  artifactContactsObjectKey,
  artifactPackageObjectKey,
  checkoutOrderItems,
  createCheckoutSession,
  environmentMatchesLivemode,
  normalizeArtifactPayload,
  publicSiteUrl,
  validateRequestedProducts,
  verifyStripeWebhookSignature,
} from "../worker/commerce.js";

test("the approved catalog contains exactly five server-controlled SKUs", () => {
  assert.equal(PRODUCT_CATALOG.length, 5);
  assert.deepEqual(
    PRODUCT_CATALOG.map((product) => product.id),
    ["shoe-vendor", "clothes-vendor", "airpods-headphones-vendor", "cologne-vendor", "all-vendor-bundle"]
  );
});

test("checkout validation accepts unique known products and rejects unknown ones", () => {
  const products = validateRequestedProducts(["shoe-vendor", "shoe-vendor", "all-vendor-bundle"]);
  assert.deepEqual(products.map((product) => product.id), ["shoe-vendor", "all-vendor-bundle"]);
  assert.throws(() => validateRequestedProducts(["not-a-sku"]), /Unknown product/);
});

test("artifact payload normalization supports single-vendor and bundle shapes", () => {
  const single = normalizeArtifactPayload({ id: "shoe-vendor", name: "Shoe Vendor" }, "v1", {
    company_name: "Vendor Co",
    contact_name: "Su Su",
    phone_whatsapp: "+86 150 5987 0957",
    best_contact_method: "WhatsApp",
    ordering_notes: "Message first.",
  });
  const bundle = normalizeArtifactPayload({ id: "all-vendor-bundle", name: "All Vendor Bundle" }, "v2", {
    vendors: [{ title: "Shoe Vendor", company_name: "Vendor Co" }],
  });
  assert.equal(single.sections.length, 1);
  assert.equal(bundle.sections.length, 1);
  assert.equal(single.artifactVersion, "v1");
});

test("environment helpers use the right site URL and livemode boundary", () => {
  assert.equal(publicSiteUrl({ ENVIRONMENT: "staging" }), "https://shopresalelane.com/staging");
  assert.equal(environmentMatchesLivemode("staging", false), true);
  assert.equal(environmentMatchesLivemode("production", true), true);
  assert.equal(environmentMatchesLivemode("production", false), false);
  assert.deepEqual(checkoutOrderItems(validateRequestedProducts(["shoe-vendor"])), [{
    productId: "shoe-vendor",
    name: "Shoe Vendor",
    amountCents: 700,
    unitAmount: 700,
  }]);
  assert.deepEqual(activeArtifactVersionMap({ ACTIVE_ARTIFACT_VERSIONS: "{\"shoe-vendor\":\"v1\"}" }), { "shoe-vendor": "v1" });
  assert.equal(artifactContactsObjectKey("production", "shoe-vendor", "v1"), "artifacts/production/shoe-vendor/v1/contacts.json");
  assert.equal(artifactPackageObjectKey("production", "shoe-vendor", "v1"), "artifacts/production/shoe-vendor/v1/package.pdf");
  assert.equal(artifactAttachmentFilename("all-vendor-bundle"), "resalelane-all-vendor-bundle.pdf");
});

test("Stripe webhook signatures are verified against the raw body", async () => {
  const secret = "whsec_test_secret";
  const rawBody = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${timestamp}.${rawBody}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const bytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const digest = [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

  await verifyStripeWebhookSignature(secret, rawBody, `t=${timestamp},v1=${digest}`);
  await assert.rejects(() => verifyStripeWebhookSignature(secret, rawBody, `t=${timestamp},v1=deadbeef`));
});

test("checkout sessions explicitly request card payments for live Stripe", async () => {
  const originalFetch = globalThis.fetch;
  let capturedBody = null;

  globalThis.fetch = async (_url, options) => {
    capturedBody = String(options.body);
    return new Response(JSON.stringify({ id: "cs_live_example", url: "https://checkout.stripe.com/c/pay/example" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    await createCheckoutSession({
      ENVIRONMENT: "production",
      PUBLIC_SITE_URL: "https://shopresalelane.com",
      STRIPE_SECRET_KEY: "sk_live_example",
      STRIPE_PRICE_LOOKUP: JSON.stringify({ "shoe-vendor": "price_live_shoe" }),
    }, validateRequestedProducts(["shoe-vendor"]));
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.match(capturedBody, /payment_method_types%5B0%5D=card/);
  assert.match(capturedBody, /allow_promotion_codes=true/);
});
