import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync(new URL("../migrations/0001_initial_schema.sql", import.meta.url), "utf8");

test("D1 schema defines required commerce and support tables", () => {
  for (const table of [
    "orders",
    "order_items",
    "payment_events",
    "delivery_attempts",
    "support_requests"
  ]) {
    assert.match(schema, new RegExp(`CREATE TABLE ${table}`));
  }
});

test("D1 schema enforces idempotency and environment boundaries", () => {
  assert.match(schema, /stripe_checkout_session_id TEXT UNIQUE/);
  assert.match(schema, /stripe_event_id TEXT PRIMARY KEY/);
  assert.match(schema, /UNIQUE \(order_id, attempt_number\)/);
  assert.match(schema, /environment IN \('staging', 'production'\)/);
  assert.match(schema, /quantity = 1/);
});

test("D1 schema does not contain supplier artifact contents", () => {
  assert.doesNotMatch(schema, /supplier_phone|supplier_email|supplier_contact|artifact_content/i);
});
