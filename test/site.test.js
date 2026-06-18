import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { resolveCartAdd } from "../site/cart-logic.js";

const html = readFileSync(new URL("../site/index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../site/app.js", import.meta.url), "utf8");
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
