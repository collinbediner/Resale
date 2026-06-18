import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { resolveCartAdd } from "../site/cart-logic.js";

const html = readFileSync(new URL("../site/index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../site/app.js", import.meta.url), "utf8");
const success = readFileSync(new URL("../site/success.html", import.meta.url), "utf8");
const canceled = readFileSync(new URL("../site/canceled.html", import.meta.url), "utf8");
const bundleId = "all-vendor-bundle";

test("production page includes required public content and safety controls", () => {
  assert.match(html, /Premium Vendors for Resellers/);
  assert.match(app, /Continue to Stripe \(Setup Pending\)/);
  assert.match(app, /disabled/);
  assert.match(html, /ResaleLane sells informational vendor resources only/);
  assert.match(html, /collin\.bediner\+support@gmail\.com/);
});

test("all referenced local assets exist", () => {
  const references = [...html.matchAll(/(?:src|href)="\.\/([^"?#]+)/g)].map(match => match[1]);
  for (const reference of references) {
    assert.equal(existsSync(new URL(`../site/${reference}`, import.meta.url)), true, reference);
  }
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
