import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Keep the approved architecture synchronized across the documents collaborators use as source material.
const readDoc = name => readFileSync(new URL(`../docs/${name}`, import.meta.url), "utf8");
const prd = readDoc("PRD.md");
const architecture = readDoc("ARCHITECTURE.md");
const roadmap = readDoc("ROADMAP.md");
const artifactSecurity = readDoc("ARTIFACT-SECURITY.md");
const implementationPlan = readDoc("IMPLEMENTATION-PLAN.md");
const specSnapshot = readDoc("SPEC-SNAPSHOT.md");

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
  assert.match(artifactSecurity, /never into logs, D1, ticket systems, public docs, frontend code, generated deployments, or public files/);
});

test("master implementation plan records the resolved hosting and account decisions", () => {
  // These checks prevent future planning passes from reopening settled infrastructure choices.
  assert.match(implementationPlan, /Production remains on GitHub Pages/i);
  assert.match(implementationPlan, /no staging subdomain is required/i);
  assert.match(implementationPlan, /separate Stripe and Resend accounts\/projects/i);
  assert.match(implementationPlan, /pre-commerce \/ storefront preview/i);
});

test("implementation plan separates commerce launch from later analytics work", () => {
  // Analytics is deliberately deferred so a safe low-volume checkout is the only Phase 1 target.
  assert.match(implementationPlan, /Phase 1 — Commerce Readiness/i);
  assert.match(implementationPlan, /Phase 2 — Measurement, SEO Expansion, and Growth/i);
  assert.match(implementationPlan, /Analytics and SEO expansion do not block Phase 1 launch/i);
  assert.match(implementationPlan, /GA4 and Google Tag Manager/i);
});

test("all approved product IDs and prices are tracked server-side", () => {
  // Product IDs are the only catalog values the public browser is allowed to submit.
  for (const [productId, price] of [
    ["shoe-vendor", "$7"],
    ["clothes-vendor", "$7"],
    ["airpods-headphones-vendor", "$7"],
    ["cologne-vendor", "$7"],
    ["all-vendor-bundle", "$12"]
  ]) {
    assert.match(implementationPlan, new RegExp(`${productId}.*\\${price}`));
  }
  assert.match(implementationPlan, /browser never sends prices or Stripe Price IDs/i);
});

test("bundle comparison price stays synchronized across product documents", () => {
  // Four $7 individual resources establish the bundle's honest $28 comparison value.
  for (const document of [prd, roadmap, implementationPlan, specSnapshot]) {
    assert.match(document, /\$28/);
  }
  assert.match(prd, /All Vendor Bundle.*`all-vendor-bundle`.*\$12.*\$28/);
});

test("private fulfillment boundaries remain explicit", () => {
  // Public planning is safe only when real contact data and credentials stay out of Git and tickets.
  assert.match(implementationPlan, /Never copy real contacts into GitHub or tickets/i);
  assert.match(architecture, /must not store supplier-contact contents/i);
  assert.match(artifactSecurity, /contacts\.json/);
  assert.match(artifactSecurity, /Direct contact text in the fulfillment email is the v1 primary artifact/i);
});
