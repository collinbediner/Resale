import { buildSupportEmail, validateContactSubmission } from "./contact.js";
import {
  activeArtifactVersionMap,
  artifactAttachmentFilename,
  artifactPackageObjectKey,
  checkoutOrderItems,
  createCheckoutSession,
  environmentMatchesLivemode,
  parseCheckoutProductsFromSession,
  resolveArtifactForProduct,
  validateRequestedProducts,
  verifyStripeWebhookSignature,
} from "./commerce.js";
import {
  claimStripeEvent,
  createDeliveryAttempt,
  createOrder,
  finishDeliveryAttempt,
  finishStripeEvent,
  updateOrderState,
} from "./order-store.js";
import { readBoundedJson, RequestError, securityHeaders } from "./security.js";
import { createReviewSubmission, validateReviewSubmission, verifyReviewBuyer } from "./reviews.js";
import { fulfilledPackageEmail, internalSaleAlertEmail } from "../server/email-templates.js";

const ALLOWED_ORIGINS = new Set([
  "https://shopresalelane.com",
  "https://www.shopresalelane.com",
  "http://localhost:8000",
  "http://127.0.0.1:8000"
]);

function corsHeaders(origin) {
  const headers = {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
  if (ALLOWED_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function jsonResponse(body, status, origin, requestId) {
  return Response.json(body, {
    status,
    headers: {
      ...corsHeaders(origin),
      ...securityHeaders(),
      "Cache-Control": "no-store",
      "X-Request-ID": requestId
    }
  });
}

// Internal sale-copy recipients are configured as a comma-separated env var so
// customer-facing emails can quietly BCC operations without exposing addresses.
function readEmailList(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function sendEmail(env, payload, requestId, replyTo = null, tags = []) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": requestId
    },
    body: JSON.stringify({
      from: payload.from || env.SUPPORT_EMAIL_FROM,
      to: payload.to,
      cc: payload.cc,
      bcc: payload.bcc,
      reply_to: replyTo || undefined,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      attachments: payload.attachments,
      tags,
    })
  });

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    console.error(JSON.stringify({
      event: "email_send_failed",
      requestId,
      providerStatus: response.status,
      providerError: result.error?.message || null,
    }));
    throw new Error("Email provider rejected the request");
  }

  return response.json();
}

async function sendWithResend(env, submission, requestId) {
  const email = buildSupportEmail(submission, requestId);
  return sendEmail(env, {
    from: env.SUPPORT_EMAIL_FROM,
    to: [env.SUPPORT_EMAIL_TO],
    subject: email.subject,
    text: email.text,
    html: email.html,
  }, requestId, submission.email, [{ name: "category", value: "support_request" }]);
}

function readStripeSignature(request) {
  return request.headers.get("Stripe-Signature") || "";
}

function orderIdFromSession(session) {
  return `RL-${session.id.replace(/^cs_(test_|live_)?/i, "").slice(0, 10).toUpperCase()}`;
}

// Fulfillment attachments come from private R2 so customers receive the branded PDFs,
// not raw contact data pasted into the email body.
async function resolvePackageAttachments(env, artifacts) {
  return Promise.all(artifacts.map(async (artifact) => {
    const objectKey = artifactPackageObjectKey(env.ENVIRONMENT, artifact.productId, artifact.artifactVersion);
    const object = await env.ARTIFACTS.get(objectKey);
    if (!object) {
      throw new Error(`Artifact PDF not found for ${artifact.productId}.`);
    }

    return {
      filename: artifactAttachmentFilename(artifact.productId),
      content: Buffer.from(await object.arrayBuffer()).toString("base64"),
    };
  }));
}

async function sendFulfillment(env, order, artifacts, requestId) {
  const attemptId = crypto.randomUUID();
  const primaryVersion = artifacts.map((artifact) => `${artifact.productId}:${artifact.artifactVersion}`).join(", ");

  const attempt = await createDeliveryAttempt(env.ORDERS_DB, {
    id: attemptId,
    orderId: order.orderId,
    artifactVersion: primaryVersion,
  });

  const attachments = await resolvePackageAttachments(env, artifacts);
  const email = fulfilledPackageEmail(order, {
    artifactVersion: primaryVersion,
    attachmentCount: attachments.length,
    resourceTitles: artifacts.map((artifact) => artifact.productName),
  });

  try {
    const providerResult = await sendEmail(env, {
      from: env.ORDERS_EMAIL_FROM || "ResaleLane Orders <orders@shopresalelane.com>",
      to: [order.buyerEmail],
      bcc: readEmailList(env.ORDER_NOTIFICATION_BCC),
      subject: email.subject,
      text: email.text,
      html: email.html,
      attachments,
    }, requestId, env.SUPPORT_EMAIL_TO, [{ name: "category", value: "fulfillment" }]);

    await finishDeliveryAttempt(env.ORDERS_DB, attemptId, {
      status: "sent",
      providerMessageId: providerResult.id,
    });
    await updateOrderState(
      env.ORDERS_DB,
      order.orderId,
      { payment: "paid", fulfillment: "processing" },
      { payment: "paid", fulfillment: "delivered" }
    );
  } catch (error) {
    await finishDeliveryAttempt(env.ORDERS_DB, attemptId, {
      status: "failed",
      failureCategory: "email_send_failed",
    });
    await updateOrderState(
      env.ORDERS_DB,
      order.orderId,
      { payment: "paid", fulfillment: "processing" },
      { payment: "paid", fulfillment: "failed" }
    );
    throw error;
  }
}

// Internal sale alerts keep support and Collin informed without exposing addresses
// on the buyer-facing emails.
async function sendInternalSaleAlert(env, order, details, requestId) {
  const email = internalSaleAlertEmail(order, details);
  try {
    await sendEmail(env, {
      from: env.ORDERS_EMAIL_FROM || "ResaleLane Orders <orders@shopresalelane.com>",
      to: [env.SUPPORT_EMAIL_TO],
      cc: readEmailList(env.ORDER_NOTIFICATION_CC),
      subject: email.subject,
      text: email.text,
      html: email.html,
    }, `${requestId}:internal-sale`, env.SUPPORT_EMAIL_TO, [{ name: "category", value: "internal_sale_alert" }]);
  } catch (error) {
    console.error(JSON.stringify({
      event: "internal_sale_alert_failed",
      requestId,
      orderId: order.orderId,
      message: error instanceof Error ? error.message : String(error),
    }));
  }
}

async function handleCheckout(request, env, origin, requestId) {
  if (!ALLOWED_ORIGINS.has(origin)) {
    return jsonResponse({ ok: false, error: "This request is not allowed." }, 403, origin, requestId);
  }

  let input;
  try {
    input = await readBoundedJson(request);
  } catch (error) {
    if (error instanceof RequestError) {
      return jsonResponse({ ok: false, error: error.message }, error.status, origin, requestId);
    }
    return jsonResponse({ ok: false, error: "Please try checkout again." }, 400, origin, requestId);
  }

  try {
    const products = validateRequestedProducts(input.productIds);
    const session = await createCheckoutSession(env, products);
    return jsonResponse({ ok: true, sessionId: session.id, url: session.url }, 200, origin, requestId);
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message }, 400, origin, requestId);
  }
}

async function handleStripeWebhook(request, env, requestId) {
  const rawBody = await request.text();

  try {
    await verifyStripeWebhookSignature(env.STRIPE_WEBHOOK_SECRET, rawBody, readStripeSignature(request));
  } catch (error) {
    return Response.json(
      { ok: false, error: "Invalid Stripe signature." },
      { status: 400, headers: { ...securityHeaders(), "Cache-Control": "no-store", "X-Request-ID": requestId } }
    );
  }

  const event = JSON.parse(rawBody);
  const eventClaimed = await claimStripeEvent(env.ORDERS_DB, event);
  if (!eventClaimed) {
    return Response.json(
      { ok: true, duplicate: true },
      { headers: { ...securityHeaders(), "Cache-Control": "no-store", "X-Request-ID": requestId } }
    );
  }

  try {
    if (event.type !== "checkout.session.completed") {
      await finishStripeEvent(env.ORDERS_DB, event.id, "ignored");
      return Response.json(
        { ok: true, ignored: true },
        { headers: { ...securityHeaders(), "Cache-Control": "no-store", "X-Request-ID": requestId } }
      );
    }

    const session = event.data?.object || {};
    if (!environmentMatchesLivemode(env.ENVIRONMENT, session.livemode)) {
      throw new Error("Stripe event mode does not match the current environment.");
    }

    const products = parseCheckoutProductsFromSession(session);
    // Known artifact versions come from server config (no R2 fetch), so the order can be
    // recorded even if the R2 content fetch below fails.
    const knownVersions = activeArtifactVersionMap(env);
    const items = checkoutOrderItems(products).map((item) => ({
      ...item,
      artifactVersion: knownVersions[item.productId] || null,
    }));
    const order = {
      orderId: orderIdFromSession(session),
      buyerEmail: session.customer_details?.email || session.customer_email,
      stripeReference: session.id,
      currency: String(session.currency || "usd").toUpperCase(),
      totalCents: Number(session.amount_total || 0),
      items: items.map((item) => ({ name: item.name, amountCents: item.amountCents })),
    };

    if (!order.buyerEmail) {
      throw new Error("Checkout Session is missing the buyer email.");
    }

    await createOrder(env.ORDERS_DB, {
      id: order.orderId,
      environment: env.ENVIRONMENT,
      checkoutSessionId: session.id,
      paymentIntentId: session.payment_intent || null,
      buyerEmail: order.buyerEmail,
      currency: String(session.currency || "usd").toLowerCase(),
      amountTotal: order.totalCents,
      paymentStatus: "paid",
      items: items.map((item) => ({
        productId: item.productId,
        unitAmount: item.unitAmount,
        artifactVersion: item.artifactVersion,
      })),
    });

    await updateOrderState(
      env.ORDERS_DB,
      order.orderId,
      { payment: "paid", fulfillment: "pending" },
      { payment: "paid", fulfillment: "processing" }
    );

    // Alert support as soon as the paid order is durable in D1 so Collin gets a heads-up
    // even if fulfillment later fails and needs manual attention.
    await sendInternalSaleAlert(env, order, {
      saleStatus: "paid",
      artifactVersion: items.map((item) => `${item.productId}:${item.artifactVersion || "pending"}`).join(", "),
    }, requestId);

    // The order row above is now durable. Artifact content fetch and email send can still
    // fail here, but a paid order is never lost: it lands in fulfillment_status "failed"
    // with the Stripe event recorded against this order ID for support/resend (#13).
    try {
      const artifacts = await Promise.all(products.map((product) => resolveArtifactForProduct(env, product)));
      await sendFulfillment(env, order, artifacts, requestId);
      await finishStripeEvent(env.ORDERS_DB, event.id, "processed", order.orderId);
    } catch (fulfillmentError) {
      await sendInternalSaleAlert(env, order, {
        saleStatus: "delivery_failed",
        artifactVersion: items.map((item) => `${item.productId}:${item.artifactVersion || "pending"}`).join(", "),
      }, `${requestId}:delivery-failed`);
      await updateOrderState(
        env.ORDERS_DB,
        order.orderId,
        { payment: "paid", fulfillment: "processing" },
        { payment: "paid", fulfillment: "failed" }
      );
      await finishStripeEvent(env.ORDERS_DB, event.id, "failed", order.orderId, "fulfillment_failed");
      return Response.json(
        { ok: false, error: "Webhook processing failed." },
        { status: 500, headers: { ...securityHeaders(), "Cache-Control": "no-store", "X-Request-ID": requestId } }
      );
    }

    return Response.json(
      { ok: true, orderId: order.orderId },
      { headers: { ...securityHeaders(), "Cache-Control": "no-store", "X-Request-ID": requestId } }
    );
  } catch (error) {
    await finishStripeEvent(env.ORDERS_DB, event.id, "failed", null, "fulfillment_failed");
    return Response.json(
      { ok: false, error: "Webhook processing failed." },
      { status: 500, headers: { ...securityHeaders(), "Cache-Control": "no-store", "X-Request-ID": requestId } }
    );
  }
}

async function handleReviews(request, env, origin, requestId) {
  if (!ALLOWED_ORIGINS.has(origin)) {
    return jsonResponse({ ok: false, error: "This request is not allowed." }, 403, origin, requestId);
  }

  let input;
  try {
    input = await readBoundedJson(request);
  } catch (error) {
    if (error instanceof RequestError) {
      return jsonResponse({ ok: false, error: error.message }, error.status, origin, requestId);
    }
    return jsonResponse({ ok: false, error: "Please complete the review form and try again." }, 400, origin, requestId);
  }

  const validation = validateReviewSubmission(input);
  if (!validation.ok) {
    return jsonResponse({ ok: false, error: validation.error }, 400, origin, requestId);
  }

  const match = await verifyReviewBuyer(env.ORDERS_DB, validation.submission);
  if (!match) {
    return jsonResponse(
      { ok: false, error: "We could not match that order ID and checkout email to a delivered purchase yet." },
      404,
      origin,
      requestId
    );
  }

  try {
    await createReviewSubmission(env.ORDERS_DB, {
      id: `REV-${crypto.randomUUID()}`,
      ...validation.submission,
    });
    return jsonResponse(
      {
        ok: true,
        requestId,
        message: "Thank you. Your verified review was received and is pending approval."
      },
      200,
      origin,
      requestId
    );
  } catch (error) {
    if (String(error).includes("UNIQUE")) {
      return jsonResponse(
        { ok: false, error: "A verified review has already been submitted for this order." },
        409,
        origin,
        requestId
      );
    }
    return jsonResponse(
      { ok: false, error: "Your review could not be saved right now. Please try again shortly." },
      502,
      origin,
      requestId
    );
  }
}

const worker = {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const requestId = crypto.randomUUID();
    const url = new URL(request.url);

    if (url.pathname === "/health" && request.method === "GET") {
      try {
        const databaseCheck = await env.ORDERS_DB.prepare(
          "SELECT COUNT(*) AS table_count FROM sqlite_master WHERE type = 'table' AND name IN ('orders', 'order_items', 'payment_events', 'delivery_attempts', 'support_requests', 'reviews')"
        ).first();
        const storageCheck = await env.ARTIFACTS.head("__resalelane_healthcheck__");
        return Response.json({
          ok: databaseCheck?.table_count === 6 && storageCheck === null,
          apiVersion: "1",
          environment: env.ENVIRONMENT,
          services: { d1: "schema-ready", r2: "connected" }
        }, { headers: { ...securityHeaders(), "Cache-Control": "no-store", "X-Request-ID": requestId } });
      } catch {
        return Response.json(
          { ok: false, environment: env.ENVIRONMENT, error: "Service check failed." },
          { status: 503, headers: { ...securityHeaders(), "Cache-Control": "no-store", "X-Request-ID": requestId } }
        );
      }
    }

    if (request.method === "OPTIONS") {
      if (!ALLOWED_ORIGINS.has(origin)) {
        return jsonResponse({ ok: false, error: "This request is not allowed." }, 403, origin, requestId);
      }
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname === "/checkout" && request.method === "POST") {
      return handleCheckout(request, env, origin, requestId);
    }

    if (url.pathname === "/stripe/webhook" && request.method === "POST") {
      return handleStripeWebhook(request, env, requestId);
    }

    if (url.pathname === "/reviews" && request.method === "POST") {
      return handleReviews(request, env, origin, requestId);
    }

    if (url.pathname !== "/support" || request.method !== "POST") {
      return jsonResponse({ ok: false, error: "Not found." }, 404, origin, requestId);
    }

    if (!ALLOWED_ORIGINS.has(origin)) {
      return jsonResponse({ ok: false, error: "This request is not allowed." }, 403, origin, requestId);
    }

    const clientKey = request.headers.get("CF-Connecting-IP") || "unknown";
    const rateLimit = await env.CONTACT_RATE_LIMITER.limit({ key: `support:${clientKey}` });
    if (!rateLimit.success) {
      return jsonResponse(
        { ok: false, error: "Too many messages were sent. Please wait a minute and try again." },
        429,
        origin,
        requestId
      );
    }

    let input;
    try {
      input = await readBoundedJson(request);
    } catch (error) {
      if (error instanceof RequestError) {
        return jsonResponse({ ok: false, error: error.message }, error.status, origin, requestId);
      }
      return jsonResponse({ ok: false, error: "Please complete the contact form and try again." }, 400, origin, requestId);
    }

    const validation = validateContactSubmission(input);
    if (!validation.ok) {
      // A silent success prevents bots from learning that the hidden trap caught them.
      if (validation.silent) return jsonResponse({ ok: true, requestId }, 200, origin, requestId);
      return jsonResponse({ ok: false, error: validation.error }, 400, origin, requestId);
    }

    try {
      const providerResult = await sendWithResend(env, validation.submission, requestId);
      console.log(JSON.stringify({
        event: "support_email_sent",
        requestId,
        providerMessageId: providerResult.id
      }));
      return jsonResponse({ ok: true, requestId }, 200, origin, requestId);
    } catch {
      return jsonResponse(
        { ok: false, error: "Your message could not be sent right now. Please try again shortly." },
        502,
        origin,
        requestId
      );
    }
  }
};

export default worker;
