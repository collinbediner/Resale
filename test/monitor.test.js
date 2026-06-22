import assert from "node:assert/strict";
import test from "node:test";
import { buildMonitorEmail, constantTimeTokenEqual, validateMonitorReport } from "../worker/monitor.js";

const report = {
  status: "PASS",
  siteStatus: "PASS",
  apiStatus: "PASS",
  httpCode: "200",
  duration: "0.25",
  runUrl: "https://github.com/collinbediner/Resale/actions/runs/123"
};

test("monitor reports accept only fixed safe fields", () => {
  assert.equal(validateMonitorReport(report).ok, true);
  assert.equal(validateMonitorReport({ ...report, recipient: "attacker@example.com" }).ok, false);
  assert.equal(validateMonitorReport({ ...report, runUrl: "https://example.com" }).ok, false);
});

test("monitor token comparison handles equal and unequal values", () => {
  assert.equal(constantTimeTokenEqual("same-token", "same-token"), true);
  assert.equal(constantTimeTokenEqual("wrong-token", "same-token"), false);
  assert.equal(constantTimeTokenEqual("short", "a-much-longer-token"), false);
});

test("monitor email contains operational status but no customer data", () => {
  const email = buildMonitorEmail(report);
  assert.equal(email.subject, "ResaleLane daily check: PASS");
  assert.match(email.text, /Storefront: PASS/);
  assert.match(email.text, /Private API: PASS/);
  assert.doesNotMatch(email.text, /buyer|vendor|supplier/i);
});
