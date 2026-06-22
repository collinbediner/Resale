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
    CONTACT_RATE_LIMITER: { limit: async () => ({ success: true }) }
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
  assert.equal(forbidden.headers.get("Access-Control-Allow-Origin"), "https://shopresalelane.com");
});
