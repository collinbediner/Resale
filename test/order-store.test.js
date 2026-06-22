import assert from "node:assert/strict";
import test from "node:test";
import {
  canTransition,
  claimStripeEvent,
  createDeliveryAttempt,
  createOrder,
  finishDeliveryAttempt,
  finishStripeEvent,
  requireTransition,
  updateOrderState
} from "../worker/order-store.js";

function fakeDb({ changes = 1, first = { attempt_number: 1 } } = {}) {
  const calls = [];
  const statement = sql => ({
    bind(...values) {
      const call = { sql, values };
      calls.push(call);
      return {
        run: async () => ({ meta: { changes } }),
        first: async () => first
      };
    }
  });
  return {
    calls,
    prepare: statement,
    batch: async statements => ({ statements })
  };
}

test("payment and fulfillment transitions are explicit and retry-safe", () => {
  assert.equal(canTransition("payment", "pending", "paid"), true);
  assert.equal(canTransition("payment", "paid", "pending"), false);
  assert.equal(canTransition("fulfillment", "failed", "processing"), true);
  assert.equal(canTransition("fulfillment", "delivered", "processing"), false);
  assert.throws(() => requireTransition("fulfillment", "delivered", "failed"));
});

test("Stripe events are claimed once and duplicates are ignored", async () => {
  assert.equal(await claimStripeEvent(fakeDb(), { id: "evt_1", type: "checkout.session.completed" }), true);
  assert.equal(await claimStripeEvent(fakeDb({ changes: 0 }), { id: "evt_1", type: "checkout.session.completed" }), false);
});

test("order creation normalizes email and batches items atomically", async () => {
  const db = fakeDb();
  await createOrder(db, {
    id: "RL-1",
    environment: "staging",
    checkoutSessionId: "cs_test_1",
    paymentIntentId: "pi_test_1",
    buyerEmail: " Buyer@Example.com ",
    currency: "usd",
    amountTotal: 700,
    paymentStatus: "paid",
    items: [{ productId: "shoe-vendor", unitAmount: 700, artifactVersion: "v1" }]
  });
  assert.equal(db.calls.length, 2);
  assert.ok(db.calls[0].values.includes("buyer@example.com"));
  assert.ok(db.calls[1].values.includes("shoe-vendor"));
});

test("delivery retries receive increasing attempt numbers", async () => {
  const first = await createDeliveryAttempt(fakeDb({ first: { attempt_number: 1 } }), {
    id: "delivery-1", orderId: "RL-1", artifactVersion: "v1"
  });
  const retry = await createDeliveryAttempt(fakeDb({ first: { attempt_number: 2 } }), {
    id: "delivery-2", orderId: "RL-1", artifactVersion: "v1"
  });
  assert.equal(first.attempt_number, 1);
  assert.equal(retry.attempt_number, 2);
});

test("state and completion updates use compare-and-set guards", async () => {
  const db = fakeDb();
  await updateOrderState(db, "RL-1",
    { payment: "paid", fulfillment: "pending" },
    { payment: "paid", fulfillment: "processing" });
  await finishDeliveryAttempt(db, "delivery-1", { status: "sent", providerMessageId: "email-1" });
  await finishStripeEvent(db, "evt_1", "processed", "RL-1");
  assert.match(db.calls[0].sql, /WHERE id = \? AND payment_status = \? AND fulfillment_status = \?/);
  assert.match(db.calls[1].sql, /delivery_status = 'pending'/);
  assert.match(db.calls[2].sql, /processing_status = 'received'/);
});

test("invalid delivery and event outcomes are rejected", async () => {
  await assert.rejects(() => finishDeliveryAttempt(fakeDb(), "delivery-1", { status: "maybe" }));
  await assert.rejects(() => finishStripeEvent(fakeDb(), "evt_1", "maybe"));
  await assert.rejects(() => createOrder(fakeDb(), { items: [] }));
});
