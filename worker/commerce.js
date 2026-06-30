const DEFAULT_FIRST_MESSAGE = "Hello, I received your contact information through a sourcing resource. Could you please send me your current catalog, pricing, minimum order requirements, payment methods, and shipping options to the United States? Thank you.";
const DEFAULT_BEFORE_ORDERING = "Confirm the current catalog, pricing, minimum order quantity, payment method, shipping cost, delivery estimate, and product details directly with the vendor before sending payment. Keep records of your messages and transactions.";
const DEFAULT_DISCLAIMER = "Informational sourcing resource only. Verify all supplier details independently before purchasing. ResaleLane is not affiliated with, endorsed by, sponsored by, or connected to any third-party brand, marketplace, manufacturer, vendor, or supplier. Pricing, inventory, product details, quality, authenticity, shipping, and availability may change and are controlled by the third party.";

// The product catalog is the server-side source of truth. The browser never sets prices.
export const PRODUCT_CATALOG = Object.freeze([
  { id: "shoe-vendor", name: "Shoe Vendor", unitAmount: 700 },
  { id: "clothes-vendor", name: "Clothes Vendor", unitAmount: 700 },
  { id: "airpods-headphones-vendor", name: "AirPods / Headphones Vendor", unitAmount: 700 },
  { id: "cologne-vendor", name: "Cologne Vendor", unitAmount: 700 },
  { id: "all-vendor-bundle", name: "All Vendor Bundle", unitAmount: 1200 },
]);

function parseJsonObject(rawValue, label) {
  if (!rawValue) return {};
  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`${label} must be a JSON object.`);
    }
    return parsed;
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

function productMap() {
  return new Map(PRODUCT_CATALOG.map((product) => [product.id, product]));
}

function ensureUniqueProductIds(productIds) {
  return [...new Set(productIds)];
}

export function validateRequestedProducts(productIds) {
  if (!Array.isArray(productIds) || productIds.length === 0) {
    throw new Error("Choose at least one product.");
  }

  const catalog = productMap();
  const normalizedIds = ensureUniqueProductIds(
    productIds.filter((value) => typeof value === "string").map((value) => value.trim())
  );

  if (normalizedIds.length === 0) {
    throw new Error("Choose at least one valid product.");
  }

  const products = normalizedIds.map((productId) => {
    const match = catalog.get(productId);
    if (!match) {
      throw new Error(`Unknown product: ${productId}`);
    }
    return match;
  });

  return products;
}

export function listCatalogProductIds() {
  return PRODUCT_CATALOG.map((product) => product.id);
}

export function priceLookupMap(env) {
  return parseJsonObject(env.STRIPE_PRICE_LOOKUP, "STRIPE_PRICE_LOOKUP");
}

export function activeArtifactVersionMap(env) {
  return parseJsonObject(env.ACTIVE_ARTIFACT_VERSIONS, "ACTIVE_ARTIFACT_VERSIONS");
}

export function publicSiteUrl(env) {
  if (env.PUBLIC_SITE_URL) return env.PUBLIC_SITE_URL;
  return env.ENVIRONMENT === "staging"
    ? "https://shopresalelane.com/staging"
    : "https://shopresalelane.com";
}

function buildCheckoutFormBody(env, products) {
  const form = new URLSearchParams();
  const prices = priceLookupMap(env);
  const siteUrl = publicSiteUrl(env).replace(/\/$/, "");

  form.set("mode", "payment");
  // Explicitly require card so live Checkout does not depend on dashboard defaults.
  form.set("payment_method_types[0]", "card");
  form.set("allow_promotion_codes", "true");
  form.set("billing_address_collection", "auto");
  form.set("success_url", `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`);
  form.set("cancel_url", `${siteUrl}/canceled.html`);
  form.set("metadata[environment]", env.ENVIRONMENT);
  form.set("metadata[product_ids]", products.map((product) => product.id).join(","));

  // Stripe receives only server-selected price IDs, never browser prices.
  products.forEach((product, index) => {
    const priceId = prices[product.id];
    if (!priceId) {
      throw new Error(`Missing Stripe price mapping for ${product.id}.`);
    }
    form.set(`line_items[${index}][price]`, priceId);
    form.set(`line_items[${index}][quantity]`, "1");
  });

  return form;
}

export async function createCheckoutSession(env, products) {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: buildCheckoutFormBody(env, products),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error?.message || "Stripe rejected the checkout request.");
  }
  if (!result.url || !result.id) {
    throw new Error("Stripe did not return a Checkout Session URL.");
  }

  return result;
}

function parseStripeSignature(headerValue) {
  const parts = Object.create(null);
  for (const part of (headerValue || "").split(",")) {
    const [key, value] = part.split("=");
    if (!key || !value) continue;
    if (!parts[key]) parts[key] = [];
    parts[key].push(value);
  }
  return parts;
}

async function hmacHex(secret, payload) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function verifyStripeWebhookSignature(secret, rawBody, signatureHeader, toleranceSeconds = 300) {
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");

  const signature = parseStripeSignature(signatureHeader);
  const timestamp = Number(signature.t?.[0]);
  const expectedPayload = `${timestamp}.${rawBody}`;

  if (!timestamp || !signature.v1?.length) {
    throw new Error("Stripe signature header is missing required fields.");
  }

  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (ageSeconds > toleranceSeconds) {
    throw new Error("Stripe signature timestamp is outside the accepted window.");
  }

  const expectedDigest = await hmacHex(secret, expectedPayload);
  if (!signature.v1.some((candidate) => constantTimeEqual(candidate, expectedDigest))) {
    throw new Error("Stripe signature verification failed.");
  }
}

export function parseCheckoutProductsFromSession(session) {
  const productIds = session?.metadata?.product_ids?.split(",").map((value) => value.trim()).filter(Boolean) || [];
  return validateRequestedProducts(productIds);
}

function normalizeSingleArtifactSection(source, fallbackTitle) {
  return {
    title: source.title || fallbackTitle,
    companyName: source.companyName || source.company_name || "Not available",
    contactName: source.contactName || source.contact_name || "Not available",
    phoneWhatsApp: source.phoneWhatsApp || source.phone_whatsapp || "Not available",
    bestContactMethod: source.bestContactMethod || source.best_contact_method || "Not available",
    orderingNotes: source.orderingNotes || source.ordering_notes || "Not available",
    recommendedFirstMessage: source.recommendedFirstMessage || DEFAULT_FIRST_MESSAGE,
    beforeOrdering: source.beforeOrdering || DEFAULT_BEFORE_ORDERING,
    disclaimer: source.disclaimer || DEFAULT_DISCLAIMER,
  };
}

// The artifact reader accepts both a bundle-style list and a single-vendor payload shape.
export function normalizeArtifactPayload(product, version, payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(`Artifact payload for ${product.id} is invalid.`);
  }

  const sections = Array.isArray(payload.sections)
    ? payload.sections.map((section) => normalizeSingleArtifactSection(section, section.title || product.name))
    : Array.isArray(payload.vendors)
      ? payload.vendors.map((vendor) => normalizeSingleArtifactSection(vendor, vendor.title || product.name))
      : [normalizeSingleArtifactSection(payload, payload.title || product.name)];

  return {
    productId: product.id,
    productName: payload.title || product.name,
    artifactVersion: payload.artifactVersion || payload.version || version,
    previewImageUrl: payload.previewImageUrl || null,
    sections,
  };
}

export async function resolveArtifactForProduct(env, product) {
  const versions = activeArtifactVersionMap(env);
  const version = versions[product.id];
  if (!version) {
    throw new Error(`Missing active artifact version for ${product.id}.`);
  }

  const objectKey = `artifacts/${env.ENVIRONMENT}/${product.id}/${version}/contacts.json`;
  const object = await env.ARTIFACTS.get(objectKey);
  if (!object) {
    throw new Error(`Artifact object not found for ${product.id}.`);
  }

  const payload = JSON.parse(await object.text());
  return normalizeArtifactPayload(product, version, payload);
}

export function checkoutOrderItems(products) {
  return products.map((product) => ({
    productId: product.id,
    name: product.name,
    amountCents: product.unitAmount,
    unitAmount: product.unitAmount,
  }));
}

export function environmentMatchesLivemode(environment, livemode) {
  return environment === "production" ? livemode === true : livemode === false;
}
