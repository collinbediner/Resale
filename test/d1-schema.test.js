import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync(new URL("../migrations/0001_initial_schema.sql", import.meta.url), "utf8");
const reliability = readFileSync(new URL("../migrations/0002_reliability_and_retention.sql", import.meta.url), "utf8");
const reviews = readFileSync(new URL("../migrations/0003_verified_reviews.sql", import.meta.url), "utf8");
const retention = readFileSync(new URL("../docs/DATA-RETENTION.md", import.meta.url), "utf8");

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

test("reliability migration supports failure queues and retention review", () => {
  assert.match(reliability, /idx_payment_events_processing_status/);
  assert.match(reliability, /idx_delivery_attempts_status/);
  assert.match(reliability, /retention_expires_at/);
  assert.match(reliability, /anonymized_at/);
});

test("review submissions stay verified, moderated, and tied to a paid order", () => {
  assert.match(reviews, /CREATE TABLE reviews/);
  assert.match(reviews, /REFERENCES orders\(id\) ON DELETE CASCADE/);
  assert.match(reviews, /rating BETWEEN 1 AND 5/);
  assert.match(reviews, /review_status IN \('pending', 'approved', 'rejected'\)/);
  assert.match(reviews, /UNIQUE \(order_id, buyer_email\)/);
});

test("retention policy minimizes PII and documents recovery", () => {
  assert.match(retention, /24 months/);
  assert.match(retention, /Do not store customer names, billing addresses, card details, or IP addresses/);
  assert.match(retention, /Migrations are forward-only/);
  assert.match(retention, /staging database and synthetic records/);
});
