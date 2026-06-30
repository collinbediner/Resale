import assert from "node:assert/strict";
import test from "node:test";
import worker from "../worker/index.js";

function testEnv(environment = "staging") {
  return {
    ENVIRONMENT: environment,
    ORDERS_DB: {
      prepare() {
        return { first: async () => ({ table_count: 5 }) };
      }
    },
    ARTIFACTS: { head: async () => null },
    CONTACT_RATE_LIMITER: { limit: async () => ({ success: true }) },
    STRIPE_PRICE_LOOKUP: JSON.stringify({
      "shoe-vendor": "price_test_shoe",
      "clothes-vendor": "price_test_clothes",
      "airpods-headphones-vendor": "price_test_airpods",
      "cologne-vendor": "price_test_cologne",
      "all-vendor-bundle": "price_test_bundle"
    }),
    ACTIVE_ARTIFACT_VERSIONS: JSON.stringify({
      "shoe-vendor": "v1",
      "clothes-vendor": "v1",
      "airpods-headphones-vendor": "v1",
      "cologne-vendor": "v1",
      "all-vendor-bundle": "v1"
    }),
    STRIPE_SECRET_KEY: "sk_test_example",
    STRIPE_WEBHOOK_SECRET: "whsec_test_example",
    RESEND_API_KEY: "re_test_example",
    ORDERS_EMAIL_FROM: "ResaleLane Orders <orders@shopresalelane.com>",
    PUBLIC_SITE_URL: "https://shopresalelane.com/staging"
  };
}

test("health endpoint reports environment and connected schema", async () => {
  const response = await worker.fetch(new Request("https://api.example.test/health"), testEnv());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    apiVersion: "1",
    environment: "staging",
    services: { d1: "schema-ready", r2: "connected" }
  });
});

test("health endpoint returns a redacted error when a binding fails", async () => {
  const env = testEnv();
  env.ORDERS_DB.prepare = () => ({ first: async () => { throw new Error("private failure"); } });
  const response = await worker.fetch(new Request("https://api.example.test/health"), env);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    ok: false,
    environment: "staging",
    error: "Service check failed."
  });
});

test("unknown routes and unapproved origins return safe errors", async () => {
  const missing = await worker.fetch(new Request("https://api.example.test/nope"), testEnv());
  assert.equal(missing.status, 404);

  const forbidden = await worker.fetch(new Request("https://api.example.test/support", {
    method: "POST",
    headers: { Origin: "https://untrusted.example", "Content-Type": "application/json" },
    body: "{}"
  }), testEnv());
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.headers.get("Access-Control-Allow-Origin"), null);
  assert.equal(forbidden.headers.get("X-Content-Type-Options"), "nosniff");
});

test("support endpoint requires JSON and bounds bodies without trusting Content-Length", async () => {
  const wrongType = await worker.fetch(new Request("https://api.example.test/support", {
    method: "POST",
    headers: { Origin: "https://shopresalelane.com", "Content-Type": "text/plain" },
    body: "{}"
  }), testEnv());
  assert.equal(wrongType.status, 415);

  const oversized = await worker.fetch(new Request("https://api.example.test/support", {
    method: "POST",
    headers: { Origin: "https://shopresalelane.com", "Content-Type": "application/json" },
    body: JSON.stringify({ message: "x".repeat(13_000) })
  }), testEnv());
  assert.equal(oversized.status, 413);
});

test("checkout endpoint creates a hosted Stripe session for approved SKUs only", async () => {
  const env = testEnv();
  const originalFetch = global.fetch;

  global.fetch = async (url, init) => {
    assert.equal(url, "https://api.stripe.com/v1/checkout/sessions");
    assert.match(String(init.body), /line_items%5B0%5D%5Bprice%5D=price_test_shoe/);
    return new Response(JSON.stringify({ id: "cs_test_123", url: "https://checkout.stripe.test/session" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  try {
    const response = await worker.fetch(new Request("https://api.example.test/checkout", {
      method: "POST",
      headers: { Origin: "https://shopresalelane.com", "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: ["shoe-vendor"] })
    }), env);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      sessionId: "cs_test_123",
      url: "https://checkout.stripe.test/session"
    });
  } finally {
    global.fetch = originalFetch;
  }
});
