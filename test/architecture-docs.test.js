import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Keep the approved architecture synchronized across the documents collaborators use as source material.
const readDoc = name => readFileSync(new URL(`../docs/${name}`, import.meta.url), "utf8");
const prd = readDoc("PRD.md");
const architecture = readDoc("ARCHITECTURE.md");
const roadmap = readDoc("ROADMAP.md");
const artifactSecurity = readDoc("ARTIFACT-SECURITY.md");

test("approved architecture names every public and private service boundary", () => {
  for (const required of [
    "GitHub Pages",
    "Cloudflare Worker",
    "Stripe Price IDs",
    "Stripe Checkout",
    "D1",
    "private R2",
    "Resend",
    "orders@shopresalelane.com"
  ]) {
    assert.match(prd, new RegExp(required, "i"));
    assert.match(architecture, new RegExp(required, "i"));
  }
});

test("stale hosting and staging-hostname targets are no longer launch blockers", () => {
  // Scope the negative assertions to the blocker list while allowing the approved decision to be documented below it.
  const launchBlockers = roadmap.match(/## Launch Blockers([\s\S]*?)## After Checkout Is Working/)?.[1] || "";
  assert.doesNotMatch(launchBlockers, /move.*production.*Cloudflare Pages/i);
  assert.doesNotMatch(launchBlockers, /dedicated staging hostname/i);
  assert.match(roadmap, /dedicated staging hostname is not required/i);
});

test("fulfillment permits direct private contact delivery only after verification", () => {
  assert.match(artifactSecurity, /verified purchase/);
  assert.match(artifactSecurity, /contact details directly in the Resend fulfillment email/);
  assert.match(artifactSecurity, /never into the manifest, logs, database, ticket system, or public files/);
});
