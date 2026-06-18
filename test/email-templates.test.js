import assert from "node:assert/strict";
import test from "node:test";
import {
  deliveryDelayedEmail,
  deliveryEmail,
  orderConfirmationEmail,
  supportAcknowledgementEmail
} from "../server/email-templates.js";

const order = {
  orderId: "RL-12345",
  stripeReference: "cs_test_123",
  currency: "USD",
  totalCents: 1200,
  items: [{ name: "All Vendor Bundle", amountCents: 1200 }]
};

test("confirmation distinguishes Stripe receipt from ResaleLane fulfillment", () => {
  const email = orderConfirmationEmail(order);
  assert.match(email.subject, /RL-12345/);
  assert.match(email.text, /Stripe provides the official payment receipt/);
  assert.match(email.text, /\$12\.00/);
  assert.doesNotMatch(email.text, /supplier contact/i);
});

test("delivery uses an expiring order-specific URL and artifact version", () => {
  const email = deliveryEmail(order, {
    url: "https://delivery.example/token",
    expiresAt: "June 19, 2026 at 9:00 AM ET",
    artifactVersion: "2026-06-18.1"
  });
  assert.match(email.text, /Do not forward/);
  assert.match(email.html, /Download your package/);
  assert.match(email.html, /2026-06-18\.1/);
});

test("delayed delivery prevents duplicate purchasing", () => {
  const email = deliveryDelayedEmail(order);
  assert.match(email.text, /do not need to purchase again/i);
  assert.match(email.text, /retry automatically/i);
});

test("support acknowledgement escapes untrusted content", () => {
  const email = supportAcknowledgementEmail({
    requestId: "SUP-100",
    orderId: "RL-12345",
    reason: "<script>alert(1)</script>"
  });
  assert.doesNotMatch(email.html, /<script>/);
  assert.match(email.html, /&lt;script&gt;/);
  assert.match(email.text, /Never send card numbers/);
});

test("templates reject incomplete transactional data", () => {
  assert.throws(() => orderConfirmationEmail({}), /required/);
  assert.throws(() => deliveryEmail(order, {}), /required/);
});
