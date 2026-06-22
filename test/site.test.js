import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { resolveCartAdd } from "../site/cart-logic.js";

const html = readFileSync(new URL("../site/index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../site/app.js", import.meta.url), "utf8");
const success = readFileSync(new URL("../site/success.html", import.meta.url), "utf8");
const canceled = readFileSync(new URL("../site/canceled.html", import.meta.url), "utf8");
const worker = readFileSync(new URL("../worker/index.js", import.meta.url), "utf8");
const wrangler = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
const bundleId = "all-vendor-bundle";

test("production page includes required public content and safety controls", () => {
  assert.match(html, /Premium Vendors for Resellers/);
  assert.match(app, /Continue to Stripe \(Setup Pending\)/);
  assert.match(app, /disabled/);
  assert.match(html, /ResaleLane sells informational vendor resources only/);
  assert.match(html, /collin\.bediner\+support@gmail\.com/);
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /object-src 'none'/);
  assert.match(html, /name="referrer" content="strict-origin-when-cross-origin"/);
});

test("contact form sends through the private API and keeps a direct email fallback", () => {
  assert.match(app, /https:\/\/api\.shopresalelane\.com\/support/);
  assert.match(app, /method: "POST"/);
  assert.doesNotMatch(app, /window\.location\.href = `mailto:/);
  assert.match(html, /name="company"/);
  assert.match(html, /name="reason" required/);
  assert.match(html, /data-format="bold"/);
  assert.match(html, /data-format="underline"/);
  assert.match(html, /data-format="insertUnorderedList"/);
  assert.match(html, /data-contact-status/);
  assert.match(app, /collin\.bediner\+support@gmail\.com/);
});

test("Worker keeps staging and production D1 and R2 bindings isolated", () => {
  assert.match(worker, /url\.pathname === "\/health"/);
  assert.match(worker, /env\.ORDERS_DB/);
  assert.match(worker, /env\.ARTIFACTS/);
  assert.match(wrangler, /resalelane-orders-production/);
  assert.match(wrangler, /resalelane-artifacts-production/);
  assert.match(wrangler, /resalelane-orders-staging/);
  assert.match(wrangler, /resalelane-artifacts-staging/);
  assert.match(wrangler, /"ENVIRONMENT": "production"/);
  assert.match(wrangler, /"ENVIRONMENT": "staging"/);
});

test("all referenced local assets exist", () => {
  const references = [...html.matchAll(/(?:src|href)="\.\/([^"?#]+)/g)].map(match => match[1]);
  for (const reference of references) {
    assert.equal(existsSync(new URL(`../site/${reference}`, import.meta.url)), true, reference);
  }
});

test("eBay discovery card uses the verified store, local brand assets, and safe external-link behavior", () => {
  // Protect the strategic placement: the secondary marketplace comes after the primary bundle offer.
  assert.ok(html.indexOf('id="bundle"') < html.indexOf('class="ebay-feature shell"'));
  assert.match(html, /href="https:\/\/www\.ebay\.com\/usr\/collinresale"/);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /src="\.\/assets\/collin-ebay-store\.webp"/);
  assert.match(html, /src="\.\/assets\/ebay-logo\.svg"/);
});

test("footer presents Shop and Help as one balanced navigation landmark", () => {
  // Keep related footer destinations grouped semantically and visually.
  assert.match(html, /<nav class="footer-nav" aria-label="Footer navigation">/);
  assert.equal((html.match(/class="footer-link-group"/g) || []).length, 2);
  assert.match(html, /<strong>Shop<\/strong>[\s\S]*?<strong>Help<\/strong>/);
});

test("catalog keeps launch prices and bundle price authoritative in code", () => {
  assert.equal((app.match(/price: 7/g) || []).length, 4);
  assert.match(app, /id: "all-vendor-bundle"[\s\S]*?price: 12/);
});

test("adding a normal product adds exactly that product", () => {
  assert.deepEqual(resolveCartAdd([], "shoe-vendor", bundleId), {
    cart: ["shoe-vendor"], conflict: null, status: "added"
  });
});

test("duplicates are blocked", () => {
  assert.deepEqual(resolveCartAdd(["shoe-vendor"], "shoe-vendor", bundleId), {
    cart: ["shoe-vendor"], conflict: null, status: "duplicate"
  });
});

test("bundle and individual conflicts follow the storefront rules", () => {
  assert.deepEqual(resolveCartAdd(["shoe-vendor"], bundleId, bundleId), {
    cart: ["shoe-vendor", bundleId], conflict: { type: "bundle" }, status: "added"
  });
  assert.deepEqual(resolveCartAdd([bundleId], "shoe-vendor", bundleId), {
    cart: [bundleId], conflict: { type: "individual", pendingId: "shoe-vendor" }, status: "conflict"
  });
});

test("source HTML uses build-managed asset references", () => {
  assert.match(html, /data-release="source"/);
  assert.match(html, /href="\.\/styles\.css"/);
  assert.match(html, /src="\.\/app\.js"/);
  assert.doesNotMatch(html, /styles\.css\?v=/);
  assert.doesNotMatch(html, /app\.js\?v=/);
});

test("checkout result pages are safe, private, and support-focused", () => {
  assert.match(success, /We're confirming your order/);
  assert.match(success, /server-side payment verification/);
  assert.match(success, /after 15 minutes/);
  assert.doesNotMatch(success, /supplier contact|marketplace link/i);
  assert.match(canceled, /No order was placed/);
  assert.match(canceled, /generally final after successful delivery/);
  assert.match(success + canceled, /noindex/);
});
