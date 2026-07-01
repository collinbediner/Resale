import assert from "node:assert/strict";
import test from "node:test";
import worker from "../worker/index.js";

function testEnv(environment = "staging") {
  return {
    ENVIRONMENT: environment,
    ORDERS_DB: {
      prepare() {
        return { first: async () => ({ table_count: 6 }) };
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
    SUPPORT_EMAIL_TO: "collin.bediner+support@gmail.com",
    ORDERS_EMAIL_FROM: "ResaleLane Orders <orders@shopresalelane.com>",
    ORDER_NOTIFICATION_CC: "collin.bediner@gmail.com",
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

test("reviews endpoint only accepts verified delivered buyers", async () => {
  const env = testEnv();
  const calls = [];
  env.ORDERS_DB = {
    prepare(sql) {
      return {
        bind(...values) {
          calls.push({ sql, values });
          return {
            first: async () => sql.includes("FROM orders") ? { id: "RL-12345" } : null,
            run: async () => ({ meta: { changes: 1 } })
          };
        }
      };
    }
  };

  const response = await worker.fetch(new Request("https://api.example.test/reviews", {
    method: "POST",
    headers: { Origin: "https://shopresalelane.com", "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: "RL-123456",
      email: "buyer@example.com",
      rating: 5,
      headline: "Worth it",
      displayName: "Roman",
      reviewText: "This package arrived quickly and gave me a useful starting point for sourcing research."
    })
  }), env);

  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);

  const lookup = calls.find((call) => call.sql.includes("FROM orders"));
  const insert = calls.find((call) => call.sql.includes("INSERT INTO reviews"));
  assert.ok(lookup, "the worker must verify the buyer against a delivered order");
  assert.ok(insert, "verified reviews should be saved in D1");
});

async function signedStripeBody(secret, rawBody) {
  const timestamp = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const bytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
  const digest = [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  return `t=${timestamp},v1=${digest}`;
}

test("a paid checkout still records an order, even when artifact delivery fails", async () => {
  const env = testEnv();
  const calls = [];
  const originalFetch = global.fetch;
  env.ORDERS_DB = {
    prepare(sql) {
      return {
        bind(...values) {
          calls.push({ sql, values });
          return {
            run: async () => ({ meta: { changes: 1 } }),
            first: async () => ({ attempt_number: 1 })
          };
        }
      };
    },
    batch: async statements => ({ statements })
  };
  // Simulates the production incident this test guards against: the R2 artifact object
  // is missing (or any other fulfillment-path failure), so resolveArtifactForProduct throws.
  env.ARTIFACTS = { get: async () => null, head: async () => null };
  global.fetch = async (url) => {
    assert.equal(url, "https://api.resend.com/emails");
    return new Response(JSON.stringify({ id: "re_test_confirmation" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  const session = {
    id: "cs_test_456",
    livemode: false,
    customer_details: { email: "buyer@example.com" },
    currency: "usd",
    amount_total: 700,
    payment_intent: "pi_test_456",
    metadata: { product_ids: "shoe-vendor" }
  };
  const event = { id: "evt_test_456", type: "checkout.session.completed", data: { object: session } };
  const rawBody = JSON.stringify(event);

  try {
    const response = await worker.fetch(new Request("https://api.example.test/stripe/webhook", {
      method: "POST",
      headers: { "Stripe-Signature": await signedStripeBody(env.STRIPE_WEBHOOK_SECRET, rawBody) },
      body: rawBody
    }), env);

    assert.equal(response.status, 500);

    const orderInsert = calls.find(call => call.sql.includes("INSERT INTO orders"));
    assert.ok(orderInsert, "a paid order must be written before fulfillment is attempted");

    const failedEvent = calls.find(call => call.sql.includes("UPDATE payment_events") && call.values.includes("failed"));
    assert.ok(failedEvent, "the Stripe event must be marked failed");
    assert.notEqual(failedEvent.values[1], null, "the failed event must still reference the order it belongs to");

    const failedFulfillment = calls.find(call =>
      call.sql.includes("UPDATE orders") && call.values.includes("failed")
    );
    assert.ok(failedFulfillment, "the order's fulfillment_status must move to failed, not stay stuck in processing");
  } finally {
    global.fetch = originalFetch;
  }
});
