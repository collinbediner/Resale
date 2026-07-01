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
    CHECKOUT_RATE_LIMITER: { limit: async () => ({ success: true }) },
    REVIEW_RATE_LIMITER: { limit: async () => ({ success: true }) },
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
    TURNSTILE_SECRET_KEY: "turnstile_test_secret",
    RESEND_API_KEY: "re_test_example",
    NTFY_BASE_URL: "https://ntfy.test",
    NTFY_TOPIC: "resalelane-test-topic",
    SUPPORT_EMAIL_TO: "collin.bediner+support@gmail.com",
    ORDERS_EMAIL_FROM: "ResaleLane Orders <orders@shopresalelane.com>",
    ORDER_NOTIFICATION_CC: "collin.bediner@gmail.com",
    PUBLIC_SITE_URL: "https://shopresalelane.com/staging"
  };
}

function installFetchMock(handler) {
  const originalFetch = global.fetch;
  global.fetch = handler;
  return () => {
    global.fetch = originalFetch;
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
  const restoreFetch = installFetchMock(async (url, init) => {
    if (url === "https://challenges.cloudflare.com/turnstile/v0/siteverify") {
      return new Response(JSON.stringify({ success: true, action: "checkout" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    assert.equal(url, "https://api.stripe.com/v1/checkout/sessions");
    assert.match(String(init.body), /line_items%5B0%5D%5Bprice%5D=price_test_shoe/);
    return new Response(JSON.stringify({ id: "cs_test_123", url: "https://checkout.stripe.test/session" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  });

  try {
    const response = await worker.fetch(new Request("https://api.example.test/checkout", {
      method: "POST",
      headers: { Origin: "https://shopresalelane.com", "Content-Type": "application/json" },
      body: JSON.stringify({
        productIds: ["shoe-vendor"],
        turnstileToken: "turnstile_test_token_1234567890"
      })
    }), env);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      sessionId: "cs_test_123",
      url: "https://checkout.stripe.test/session"
    });
  } finally {
    restoreFetch();
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

  const restoreFetch = installFetchMock(async (url) => {
    assert.equal(url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    return new Response(JSON.stringify({ success: true, action: "review" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  });

  try {
    const response = await worker.fetch(new Request("https://api.example.test/reviews", {
      method: "POST",
      headers: { Origin: "https://shopresalelane.com", "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: "RL-123456",
        email: "buyer@example.com",
        rating: 5,
        headline: "Worth it",
        displayName: "Roman",
        reviewText: "This package arrived quickly and gave me a useful starting point for sourcing research.",
        turnstileToken: "turnstile_test_token_1234567890"
      })
    }), env);

    assert.equal(response.status, 200);
    assert.equal((await response.json()).ok, true);

    const lookup = calls.find((call) => call.sql.includes("FROM orders"));
    const insert = calls.find((call) => call.sql.includes("INSERT INTO reviews"));
    assert.ok(lookup, "the worker must verify the buyer against a delivered order");
    assert.ok(insert, "verified reviews should be saved in D1");
  } finally {
    restoreFetch();
  }
});

test("support endpoint rejects a missing or invalid Turnstile token before emailing support", async () => {
  const env = testEnv();
  const missingToken = await worker.fetch(new Request("https://api.example.test/support", {
    method: "POST",
    headers: { Origin: "https://shopresalelane.com", "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Roman",
      email: "roman@example.com",
      reason: "Product question",
      message: "Can you explain the difference between the bundle and single SKU?"
    })
  }), env);
  assert.equal(missingToken.status, 400);
  assert.match((await missingToken.json()).error, /security check/i);

  const restoreFetch = installFetchMock(async () => new Response(JSON.stringify({ success: false }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  }));

  try {
    const invalidToken = await worker.fetch(new Request("https://api.example.test/support", {
      method: "POST",
      headers: { Origin: "https://shopresalelane.com", "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Roman",
        email: "roman@example.com",
        reason: "Product question",
        message: "Can you explain the difference between the bundle and single SKU?",
        turnstileToken: "turnstile_test_token_1234567890"
      })
    }), env);
    assert.equal(invalidToken.status, 400);
    assert.match((await invalidToken.json()).error, /security check/i);
  } finally {
    restoreFetch();
  }
});

test("security-protected routes fail safely when the Turnstile secret is missing", async () => {
  const env = testEnv();
  delete env.TURNSTILE_SECRET_KEY;

  const response = await worker.fetch(new Request("https://api.example.test/checkout", {
    method: "POST",
    headers: { Origin: "https://shopresalelane.com", "Content-Type": "application/json" },
    body: JSON.stringify({
      productIds: ["shoe-vendor"],
      turnstileToken: "turnstile_test_token_1234567890"
    })
  }), env);

  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.ok, false);
  assert.match(body.error, /temporarily unavailable/i);
  assert.doesNotMatch(body.error, /TURNSTILE_SECRET_KEY/i);
});

test("checkout endpoint rate-limits abusive retries with a safe message", async () => {
  const env = testEnv();
  env.CHECKOUT_RATE_LIMITER = { limit: async () => ({ success: false }) };

  const response = await worker.fetch(new Request("https://api.example.test/checkout", {
    method: "POST",
    headers: { Origin: "https://shopresalelane.com", "Content-Type": "application/json" },
    body: JSON.stringify({
      productIds: ["shoe-vendor"],
      turnstileToken: "turnstile_test_token_1234567890"
    })
  }), env);

  assert.equal(response.status, 429);
  assert.match((await response.json()).error, /Too many checkout attempts/i);
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
  const emailCalls = [];
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
  const restoreFetch = installFetchMock(async (url, init) => {
    if (url === "https://api.resend.com/emails") {
      emailCalls.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ id: "re_test_confirmation" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    assert.equal(url, "https://ntfy.test/resalelane-test-topic");
    return new Response("ok", { status: 200 });
  });

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

    assert.equal(emailCalls.length, 2, "support should get a paid alert and a delivery-failed alert");
    assert.match(emailCalls[0].subject, /New ResaleLane sale/);
    assert.match(emailCalls[0].text, /Sale status: paid/);
    assert.match(emailCalls[1].text, /Sale status: delivery_failed/);
  } finally {
    restoreFetch();
  }
});

test("a successful paid checkout sends one buyer fulfillment email plus one paid-sale alert", async () => {
  const env = testEnv();
  const emailCalls = [];
  env.ORDERS_DB = {
    prepare() {
      return {
        bind() {
          return {
            run: async () => ({ meta: { changes: 1 } }),
            first: async () => ({ attempt_number: 1 })
          };
        }
      };
    },
    batch: async statements => ({ statements })
  };
  env.ARTIFACTS = {
    get: async (key) => {
      if (String(key).endsWith("/contacts.json")) {
        return {
          text: async () => JSON.stringify({
            title: "All Vendor Bundle",
            artifactVersion: "v1",
            sections: [{
              title: "All Vendor Bundle",
              companyName: "ResaleLane Test Vendor",
              contactName: "Test Contact",
              phoneWhatsApp: "555-0100",
              bestContactMethod: "Email",
              orderingNotes: "Ask for the current catalog first.",
              recommendedFirstMessage: "Hello, can you send the latest catalog?",
              beforeOrdering: "Verify every detail before paying.",
              disclaimer: "Testing artifact payload."
            }]
          })
        };
      }
      if (String(key).endsWith("/package.pdf")) {
        return new Blob(["fake pdf"], { type: "application/pdf" });
      }
      return null;
    },
    head: async () => null
  };

  const restoreFetch = installFetchMock(async (url, init) => {
    if (url === "https://api.resend.com/emails") {
      const payload = JSON.parse(init.body);
      emailCalls.push(payload);
      return new Response(JSON.stringify({ id: `re_${emailCalls.length}` }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    assert.equal(url, "https://ntfy.test/resalelane-test-topic");
    return new Response("ok", { status: 200 });
  });

  const session = {
    id: "cs_test_success",
    livemode: false,
    customer_details: { email: "buyer@example.com" },
    currency: "usd",
    amount_total: 1200,
    payment_intent: "pi_test_success",
    metadata: { product_ids: "all-vendor-bundle" }
  };
  const event = { id: "evt_test_success", type: "checkout.session.completed", data: { object: session } };
  const rawBody = JSON.stringify(event);

  try {
    const response = await worker.fetch(new Request("https://api.example.test/stripe/webhook", {
      method: "POST",
      headers: { "Stripe-Signature": await signedStripeBody(env.STRIPE_WEBHOOK_SECRET, rawBody) },
      body: rawBody
    }), env);

    assert.equal(response.status, 200);
    assert.equal(emailCalls.length, 2, "only the buyer fulfillment email and the internal sale alert should send");

    const buyerEmail = emailCalls.find((payload) => Array.isArray(payload.to) && payload.to.includes("buyer@example.com"));
    const internalAlert = emailCalls.find((payload) => Array.isArray(payload.to) && payload.to.includes(env.SUPPORT_EMAIL_TO));

    assert.ok(buyerEmail, "buyer fulfillment email should be sent");
    assert.ok(internalAlert, "internal sale alert should be sent");
    assert.equal(buyerEmail.subject.startsWith("Thank you for shopping with ResaleLane"), false);
    assert.match(buyerEmail.subject, /Your ResaleLane package is ready/);
    assert.doesNotMatch(buyerEmail.html, /Stripe reference:/i);
    assert.equal(buyerEmail.tags.some((tag) => tag.value === "order_confirmation"), false);
    assert.match(internalAlert.text, /Sale status: paid/);
  } finally {
    restoreFetch();
  }
});
