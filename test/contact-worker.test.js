import assert from "node:assert/strict";
import test from "node:test";
import { buildSupportEmail, validateContactSubmission } from "../worker/contact.js";

const validSubmission = {
  name: "Taylor Buyer",
  email: "Taylor@example.com",
  order: "RL-12345",
  reason: "Order delivery",
  message: "My delivery email has not arrived yet.",
  messageHtml: "<p>My <strong>delivery</strong> email has not arrived yet.</p>",
  company: ""
};

test("contact validation accepts and normalizes a valid submission", () => {
  const result = validateContactSubmission(validSubmission);
  assert.equal(result.ok, true);
  assert.equal(result.submission.email, "taylor@example.com");
  assert.equal(result.submission.order, "RL-12345");
});

test("contact validation rejects invalid fields", () => {
  assert.equal(validateContactSubmission({ ...validSubmission, email: "not-email" }).ok, false);
  assert.equal(validateContactSubmission({ ...validSubmission, reason: "Fake reason" }).ok, false);
  assert.equal(validateContactSubmission({ ...validSubmission, message: "short" }).ok, false);
});

test("contact validation rejects unexpected fields", () => {
  const result = validateContactSubmission({ ...validSubmission, admin: true });
  assert.equal(result.ok, false);
  assert.match(result.error, /unexpected field/);
});

test("contact validation silently catches the hidden bot field", () => {
  assert.deepEqual(validateContactSubmission({ ...validSubmission, company: "Spam LLC" }), {
    ok: false,
    silent: true
  });
});

test("support email escapes visitor-provided HTML and includes the reply details", () => {
  const result = validateContactSubmission({
    ...validSubmission,
    name: "<script>alert(1)</script>",
    message: "Please help with this delivery.",
    messageHtml: '<p onclick="bad()">Please <u>help</u><script>alert(1)</script></p>'
  });
  const email = buildSupportEmail(result.submission, "request-123");
  assert.match(email.subject, /Order delivery - RL-12345/);
  assert.match(email.text, /taylor@example\.com/);
  assert.doesNotMatch(email.html, /<script>/);
  assert.doesNotMatch(email.html, /onclick/);
  assert.match(email.html, /<u>help<\/u>/);
});
