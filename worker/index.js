import { buildSupportEmail, validateContactSubmission } from "./contact.js";
import {
  activeArtifactVersionMap,
  artifactAttachmentFilename,
  artifactPackageObjectKey,
  catalogProductMap,
  checkoutOrderItems,
  createCheckoutSession,
  environmentMatchesLivemode,
  parseCheckoutProductsFromSession,
  resolveArtifactForProduct,
  resolveArtifactForVersion,
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
import { buildMonitorEmail, constantTimeTokenEqual, validateMonitorReport } from "./monitor.js";
import { readBoundedJson, RequestError, securityHeaders } from "./security.js";
import { createReviewSubmission, validateReviewSubmission, verifyReviewBuyer } from "./reviews.js";
import { readTurnstileToken, verifyTurnstileToken } from "./turnstile.js";
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

function redactEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  const [localPart, domain] = normalized.split("@");
  if (!localPart || !domain) return "redacted";
  return `${localPart.slice(0, 2)}***@${domain}`;
}

function safeErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function logOpsEvent(event, details = {}) {
  console.log(JSON.stringify({ event, ...details }));
}

function createOperationalError(message, { category, retryable = false, status = null } = {}) {
  const error = new Error(message);
  error.category = category || "unknown_failure";
  error.retryable = retryable;
  error.providerStatus = status;
  return error;
}

function failureCategory(error, fallback = "unknown_failure") {
  return error?.category || fallback;
}

function isRetryableFailure(error) {
  return error?.retryable === true;
}

async function pause(milliseconds) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function environmentLabel(environment) {
  return String(environment || "production").toUpperCase();
}

async function limitRoute(rateLimiter, key, errorMessage, origin, requestId) {
  if (!rateLimiter?.limit) return null;
  const rateLimit = await rateLimiter.limit({ key });
  if (rateLimit.success) return null;
  return jsonResponse({ ok: false, error: errorMessage }, 429, origin, requestId);
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

function ntfyEndpoint(env) {
  const baseUrl = (env.NTFY_BASE_URL || "https://ntfy.sh").replace(/\/$/, "");
  const topic = String(env.NTFY_TOPIC || "").trim();
  if (!topic) return null;
  return `${baseUrl}/${encodeURIComponent(topic)}`;
}

function internalSaleAlertPushText(order, details) {
  return [
    `Environment ${environmentLabel(details?.environment || "production")}`,
    `Order ${order.orderId}`,
    `Buyer ${order.buyerEmail}`,
    `Status ${details?.saleStatus || "paid"}`,
    `Version ${details?.artifactVersion || "pending"}`,
    `Total ${order.totalCents / 100} ${String(order.currency || "USD").toUpperCase()}`,
  ].join("\n");
}

function operationalAlertText(details) {
  return [
    `Environment ${environmentLabel(details.environment)}`,
    `Type ${details.type}`,
    `Request ${details.requestId}`,
    details.orderId ? `Order ${details.orderId}` : null,
    details.eventId ? `Stripe event ${details.eventId}` : null,
    details.failureCategory ? `Failure ${details.failureCategory}` : null,
    details.retryAttempt ? `Attempt ${details.retryAttempt}` : null,
    details.retryDelayMs ? `Next retry ${details.retryDelayMs}ms` : null,
    details.httpStatus ? `HTTP ${details.httpStatus}` : null,
    details.buyerEmail ? `Buyer ${details.buyerEmail}` : null,
    details.message ? `Message ${details.message}` : null,
  ].filter(Boolean).join("\n");
}

async function sendEmail(env, payload, requestId, replyTo = null, tags = []) {
  let response;
  try {
    response = await fetch("https://api.resend.com/emails", {
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
  } catch (error) {
    throw createOperationalError("Email provider request failed", {
      category: "email_network_failed",
      retryable: true,
    });
  }

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    logOpsEvent("email_send_failed", {
      event: "email_send_failed",
      requestId,
      providerStatus: response.status,
      providerError: result.error?.message || null,
    });
    throw createOperationalError("Email provider rejected the request", {
      category: response.status >= 500 ? "email_provider_failed" : "email_provider_rejected",
      retryable: response.status >= 500,
      status: response.status,
    });
  }

  return response.json();
}

async function sendNtfyAlert(env, order, details, requestId) {
  const endpoint = ntfyEndpoint(env);
  if (!endpoint) return;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Title": `ResaleLane ${environmentLabel(details?.environment || env.ENVIRONMENT)} sale ${order.orderId}`,
      "Priority": details?.saleStatus === "delivery_failed" ? "urgent" : "default",
      "Tags": details?.saleStatus === "delivery_failed" ? "warning,rotating_light,moneybag" : "white_check_mark,moneybag",
      "X-Request-ID": `${requestId}:ntfy`,
    },
    body: internalSaleAlertPushText(order, details),
  });

  if (!response.ok) {
    const providerError = await response.text().catch(() => "");
    throw createOperationalError(`ntfy rejected the request (${response.status}): ${providerError || "unknown error"}`, {
      category: "ntfy_rejected",
      retryable: response.status >= 500,
      status: response.status,
    });
  }
}

async function sendOperationalAlert(env, details) {
  const environment = details.environment || env.ENVIRONMENT;
  const subject = `ResaleLane ${environmentLabel(environment)} ops alert: ${details.type}`;
  const text = operationalAlertText({
    ...details,
    environment,
  });

  try {
    await Promise.all([
      sendEmail(env, {
        from: env.ORDERS_EMAIL_FROM || "ResaleLane Orders <orders@shopresalelane.com>",
        to: [env.SUPPORT_EMAIL_TO],
        cc: readEmailList(env.ORDER_NOTIFICATION_CC),
        subject,
        text,
      }, `${details.requestId}:ops:${details.type}`, env.SUPPORT_EMAIL_TO, [{ name: "category", value: "ops_alert" }]),
      sendNtfyOperationalAlert(env, { ...details, environment }),
    ]);
  } catch (error) {
    logOpsEvent("ops_alert_failed", {
      requestId: details.requestId,
      alertType: details.type,
      message: safeErrorMessage(error),
    });
  }
}

async function sendNtfyOperationalAlert(env, details) {
  const endpoint = ntfyEndpoint(env);
  if (!endpoint) return;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Title": `ResaleLane ${environmentLabel(details.environment)} ${details.type}`,
      "Priority": details.type.includes("failure") || details.type.includes("exhausted") ? "urgent" : "default",
      "Tags": details.type.includes("failure") || details.type.includes("exhausted") ? "warning,rotating_light" : "information_source",
      "X-Request-ID": `${details.requestId}:ops-ntfy`,
    },
    body: operationalAlertText(details),
  });

  if (!response.ok) {
    const providerError = await response.text().catch(() => "");
    throw createOperationalError(`ntfy rejected the request (${response.status}): ${providerError || "unknown error"}`, {
      category: "ntfy_rejected",
      retryable: response.status >= 500,
      status: response.status,
    });
  }
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

async function verifyHumanCheck(env, request, token, action, origin, requestId) {
  if (!env.TURNSTILE_SECRET_KEY) {
    return jsonResponse(
      { ok: false, error: "The security check is temporarily unavailable. Please try again shortly." },
      503,
      origin,
      requestId
    );
  }

  const verification = await verifyTurnstileToken(
    env.TURNSTILE_SECRET_KEY,
    token,
    {
      ip: request.headers.get("CF-Connecting-IP") || "",
      action,
    }
  );
  if (verification.ok) return null;
  return jsonResponse({ ok: false, error: verification.error }, 400, origin, requestId);
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
      throw createOperationalError(`Artifact PDF not found for ${artifact.productId}.`, {
        category: "artifact_missing",
        retryable: false,
      });
    }

    return {
      filename: artifactAttachmentFilename(artifact.productId),
      content: Buffer.from(await object.arrayBuffer()).toString("base64"),
    };
  }));
}

async function sendFulfillmentAttempt(env, order, artifacts, requestId) {
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
    return { attemptNumber: attempt.attempt_number, artifactVersion: primaryVersion };
  } catch (error) {
    await finishDeliveryAttempt(env.ORDERS_DB, attemptId, {
      status: "failed",
      failureCategory: failureCategory(error, "fulfillment_failed"),
    });
    throw error;
  }
}

async function sendFulfillmentWithRetry(env, order, artifacts, requestId) {
  const retryDelays = [250, 750];

  for (let attemptIndex = 0; attemptIndex <= retryDelays.length; attemptIndex += 1) {
    try {
      const result = await sendFulfillmentAttempt(env, order, artifacts, `${requestId}:attempt-${attemptIndex + 1}`);
      await updateOrderState(
        env.ORDERS_DB,
        order.orderId,
        { payment: "paid", fulfillment: "processing" },
        { payment: "paid", fulfillment: "delivered" }
      );
      return result;
    } catch (error) {
      const retryable = isRetryableFailure(error);
      const delay = retryDelays[attemptIndex];

      logOpsEvent("fulfillment_attempt_failed", {
        requestId,
        orderId: order.orderId,
        buyerEmail: redactEmail(order.buyerEmail),
        failureCategory: failureCategory(error, "fulfillment_failed"),
        retryable,
        retryAttempt: attemptIndex + 1,
      });

      if (!retryable || delay == null) {
        throw createOperationalError(safeErrorMessage(error), {
          category: retryable ? "retry_exhausted" : failureCategory(error, "fulfillment_failed"),
          retryable: false,
        });
      }

      await sendOperationalAlert(env, {
        type: "fulfillment_retry_scheduled",
        requestId,
        orderId: order.orderId,
        buyerEmail: redactEmail(order.buyerEmail),
        failureCategory: failureCategory(error, "fulfillment_failed"),
        retryAttempt: attemptIndex + 1,
        retryDelayMs: delay,
        message: "Transient fulfillment failure detected. Automatic retry scheduled.",
      });
      await pause(delay);
    }
  }

  throw createOperationalError("Retry loop exited unexpectedly", {
    category: "retry_exhausted",
    retryable: false,
  });
}

// Internal sale alerts keep support and Collin informed without exposing addresses
// on the buyer-facing emails.
async function sendInternalSaleAlert(env, order, details, requestId) {
  const email = internalSaleAlertEmail(order, details);
  try {
    await Promise.all([
      sendEmail(env, {
      from: env.ORDERS_EMAIL_FROM || "ResaleLane Orders <orders@shopresalelane.com>",
      to: [env.SUPPORT_EMAIL_TO],
      cc: readEmailList(env.ORDER_NOTIFICATION_CC),
      subject: email.subject,
      text: email.text,
      html: email.html,
      }, `${requestId}:internal-sale`, env.SUPPORT_EMAIL_TO, [{ name: "category", value: "internal_sale_alert" }]),
      // Push mirrors the internal sale email so ops gets a faster heads-up without
      // changing the buyer-facing flow.
      sendNtfyAlert(env, order, details, requestId),
    ]);
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
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("Please try checkout again.");
    }
    if (Object.keys(input).some((key) => !["productIds", "turnstileToken"].includes(key))) {
      throw new Error("Unexpected checkout field. Please refresh and try again.");
    }

    const turnstileFailure = await verifyHumanCheck(env, request, readTurnstileToken(input), "checkout", origin, requestId);
    if (turnstileFailure) return turnstileFailure;

    const products = validateRequestedProducts(input.productIds);
    const session = await createCheckoutSession(env, products);
    return jsonResponse({ ok: true, sessionId: session.id, url: session.url }, 200, origin, requestId);
  } catch (error) {
    if (!/Choose at least one|Unknown product|Unexpected checkout field|Please try checkout again/.test(error.message || "")) {
      await sendOperationalAlert(env, {
        type: "checkout_failure",
        requestId,
        failureCategory: failureCategory(error, "checkout_failed"),
        message: safeErrorMessage(error),
      });
    }
    return jsonResponse({ ok: false, error: error.message }, 400, origin, requestId);
  }
}

async function handleStripeWebhook(request, env, requestId) {
  const rawBody = await request.text();

  try {
    await verifyStripeWebhookSignature(env.STRIPE_WEBHOOK_SECRET, rawBody, readStripeSignature(request));
  } catch (error) {
    logOpsEvent("webhook_signature_rejected", {
      requestId,
      failureCategory: "invalid_signature",
    });
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
      environment: env.ENVIRONMENT,
      artifactVersion: items.map((item) => `${item.productId}:${item.artifactVersion || "pending"}`).join(", "),
    }, requestId);

    // The order row above is now durable. Artifact content fetch and email send can still
    // fail here, but a paid order is never lost: it lands in fulfillment_status "failed"
    // with the Stripe event recorded against this order ID for support/resend (#13).
    try {
      const artifacts = await Promise.all(products.map((product) => resolveArtifactForProduct(env, product)));
      await sendFulfillmentWithRetry(env, order, artifacts, requestId);
      await finishStripeEvent(env.ORDERS_DB, event.id, "processed", order.orderId);
    } catch (fulfillmentError) {
      await sendInternalSaleAlert(env, order, {
        saleStatus: failureCategory(fulfillmentError, "fulfillment_failed") === "retry_exhausted" ? "retry_exhausted" : "delivery_failed",
        environment: env.ENVIRONMENT,
        artifactVersion: items.map((item) => `${item.productId}:${item.artifactVersion || "pending"}`).join(", "),
      }, `${requestId}:delivery-failed`);
      await sendOperationalAlert(env, {
        type: "webhook_failure",
        requestId,
        orderId: order.orderId,
        eventId: event.id,
        buyerEmail: redactEmail(order.buyerEmail),
        failureCategory: failureCategory(fulfillmentError, "fulfillment_failed"),
        message: safeErrorMessage(fulfillmentError),
      });
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
    await sendOperationalAlert(env, {
      type: "webhook_failure",
      requestId,
      eventId: event.id,
      failureCategory: failureCategory(error, "webhook_failed"),
      message: safeErrorMessage(error),
    });
    await finishStripeEvent(env.ORDERS_DB, event.id, "failed", null, "fulfillment_failed");
    return Response.json(
      { ok: false, error: "Webhook processing failed." },
      { status: 500, headers: { ...securityHeaders(), "Cache-Control": "no-store", "X-Request-ID": requestId } }
    );
  }
}

async function handleInternalMonitor(request, env, requestId) {
  const authorization = request.headers.get("Authorization") || "";
  const providedToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!constantTimeTokenEqual(providedToken, env.MONITOR_TOKEN || "")) {
    return Response.json(
      { ok: false, error: "Unauthorized." },
      { status: 401, headers: { ...securityHeaders(), "Cache-Control": "no-store", "X-Request-ID": requestId } }
    );
  }

  let input;
  try {
    input = await readBoundedJson(request);
  } catch (error) {
    if (error instanceof RequestError) {
      return Response.json(
        { ok: false, error: error.message },
        { status: error.status, headers: { ...securityHeaders(), "Cache-Control": "no-store", "X-Request-ID": requestId } }
      );
    }
    return Response.json(
      { ok: false, error: "Invalid monitor report." },
      { status: 400, headers: { ...securityHeaders(), "Cache-Control": "no-store", "X-Request-ID": requestId } }
    );
  }

  const validation = validateMonitorReport(input);
  if (!validation.ok) {
    return Response.json(
      { ok: false, error: validation.error },
      { status: 400, headers: { ...securityHeaders(), "Cache-Control": "no-store", "X-Request-ID": requestId } }
    );
  }

  const email = buildMonitorEmail(validation.report, env.ENVIRONMENT);
  try {
    await sendEmail(env, {
      from: env.SUPPORT_EMAIL_FROM,
      to: [env.SUPPORT_EMAIL_TO],
      cc: readEmailList(env.ORDER_NOTIFICATION_CC),
      subject: email.subject,
      text: email.text,
    }, `${requestId}:monitor`, env.SUPPORT_EMAIL_TO, [{ name: "category", value: "monitor_report" }]);

    if (validation.report.status === "FAIL") {
      await sendOperationalAlert(env, {
        type: "monitor_failure",
        requestId,
        httpStatus: validation.report.httpCode,
        message: `Storefront ${validation.report.siteStatus}, API ${validation.report.apiStatus}, workflow ${validation.report.runUrl}`,
      });
    }

    return Response.json(
      { ok: true },
      { headers: { ...securityHeaders(), "Cache-Control": "no-store", "X-Request-ID": requestId } }
    );
  } catch (error) {
    return Response.json(
      { ok: false, error: "Monitor email failed." },
      { status: 502, headers: { ...securityHeaders(), "Cache-Control": "no-store", "X-Request-ID": requestId } }
    );
  }
}

async function readRetryOrder(db, orderId) {
  const order = await db.prepare(`
    SELECT id, buyer_email, currency, amount_total, payment_status, fulfillment_status
    FROM orders
    WHERE id = ?
  `).bind(orderId).first();

  if (!order) return null;

  const itemRows = await db.prepare(`
    SELECT product_id, unit_amount, artifact_version
    FROM order_items
    WHERE order_id = ?
    ORDER BY id ASC
  `).bind(orderId).all();

  return { order, items: itemRows?.results || [] };
}

async function handleManualFulfillmentRetry(request, env, requestId) {
  const authorization = request.headers.get("Authorization") || "";
  const providedToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!constantTimeTokenEqual(providedToken, env.MONITOR_TOKEN || "")) {
    return Response.json(
      { ok: false, error: "Unauthorized." },
      { status: 401, headers: { ...securityHeaders(), "Cache-Control": "no-store", "X-Request-ID": requestId } }
    );
  }

  let input;
  try {
    input = await readBoundedJson(request);
  } catch (error) {
    if (error instanceof RequestError) {
      return Response.json(
        { ok: false, error: error.message },
        { status: error.status, headers: { ...securityHeaders(), "Cache-Control": "no-store", "X-Request-ID": requestId } }
      );
    }
    return Response.json(
      { ok: false, error: "Invalid retry request." },
      { status: 400, headers: { ...securityHeaders(), "Cache-Control": "no-store", "X-Request-ID": requestId } }
    );
  }

  const orderId = String(input?.orderId || "").trim();
  if (!/^RL-[A-Z0-9]+$/.test(orderId)) {
    return Response.json(
      { ok: false, error: "A valid ResaleLane order ID is required." },
      { status: 400, headers: { ...securityHeaders(), "Cache-Control": "no-store", "X-Request-ID": requestId } }
    );
  }

  const retryOrder = await readRetryOrder(env.ORDERS_DB, orderId);
  if (!retryOrder) {
    return Response.json(
      { ok: false, error: "Order not found." },
      { status: 404, headers: { ...securityHeaders(), "Cache-Control": "no-store", "X-Request-ID": requestId } }
    );
  }

  if (retryOrder.order.payment_status !== "paid") {
    return Response.json(
      { ok: false, error: "Only paid orders can be retried." },
      { status: 409, headers: { ...securityHeaders(), "Cache-Control": "no-store", "X-Request-ID": requestId } }
    );
  }

  if (retryOrder.order.fulfillment_status !== "failed") {
    return Response.json(
      { ok: false, error: "Only failed fulfillment orders can be retried." },
      { status: 409, headers: { ...securityHeaders(), "Cache-Control": "no-store", "X-Request-ID": requestId } }
    );
  }

  const catalog = catalogProductMap();
  const itemCatalog = retryOrder.items.map((item) => ({
    productId: item.product_id,
    unitAmount: item.unit_amount,
    artifactVersion: item.artifact_version,
    product: catalog.get(item.product_id),
  }));

  if (itemCatalog.some((item) => !item.product || !item.artifactVersion)) {
    return Response.json(
      { ok: false, error: "Order items are missing retry metadata." },
      { status: 409, headers: { ...securityHeaders(), "Cache-Control": "no-store", "X-Request-ID": requestId } }
    );
  }

  const order = {
    orderId: retryOrder.order.id,
    buyerEmail: retryOrder.order.buyer_email,
    currency: String(retryOrder.order.currency || "usd").toUpperCase(),
    totalCents: Number(retryOrder.order.amount_total || 0),
    items: itemCatalog.map((item) => ({
      name: item.product.name,
      amountCents: item.unitAmount,
    })),
  };

  try {
    await updateOrderState(
      env.ORDERS_DB,
      order.orderId,
      { payment: "paid", fulfillment: "failed" },
      { payment: "paid", fulfillment: "processing" }
    );

    const artifacts = await Promise.all(itemCatalog.map((item) =>
      resolveArtifactForVersion(env, item.product, item.artifactVersion)
    ));
    await sendFulfillmentWithRetry(env, order, artifacts, `${requestId}:manual-retry`);

    await sendInternalSaleAlert(env, order, {
      saleStatus: "manual_retry_delivered",
      environment: env.ENVIRONMENT,
      artifactVersion: itemCatalog.map((item) => `${item.productId}:${item.artifactVersion}`).join(", "),
    }, `${requestId}:manual-retry`);

    return Response.json(
      { ok: true, orderId: order.orderId },
      { headers: { ...securityHeaders(), "Cache-Control": "no-store", "X-Request-ID": requestId } }
    );
  } catch (error) {
    await updateOrderState(
      env.ORDERS_DB,
      order.orderId,
      { payment: "paid", fulfillment: "processing" },
      { payment: "paid", fulfillment: "failed" }
    ).catch(() => null);

    await sendOperationalAlert(env, {
      type: "manual_retry_failure",
      requestId,
      orderId: order.orderId,
      buyerEmail: redactEmail(order.buyerEmail),
      failureCategory: failureCategory(error, "manual_retry_failed"),
      message: safeErrorMessage(error),
    });

    return Response.json(
      { ok: false, error: "Manual retry failed." },
      { status: 502, headers: { ...securityHeaders(), "Cache-Control": "no-store", "X-Request-ID": requestId } }
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

  const turnstileFailure = await verifyHumanCheck(env, request, validation.submission.turnstileToken, "review", origin, requestId);
  if (turnstileFailure) return turnstileFailure;

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
      const clientKey = request.headers.get("CF-Connecting-IP") || "unknown";
      const blocked = await limitRoute(
        env.CHECKOUT_RATE_LIMITER,
        `checkout:${clientKey}`,
        "Too many checkout attempts were started. Please wait a minute and try again.",
        origin,
        requestId
      );
      if (blocked) return blocked;
      return handleCheckout(request, env, origin, requestId);
    }

    if (url.pathname === "/stripe/webhook" && request.method === "POST") {
      return handleStripeWebhook(request, env, requestId);
    }

    if (url.pathname === "/internal/monitor" && request.method === "POST") {
      return handleInternalMonitor(request, env, requestId);
    }

    if (url.pathname === "/internal/fulfillment/retry" && request.method === "POST") {
      return handleManualFulfillmentRetry(request, env, requestId);
    }

    if (url.pathname === "/reviews" && request.method === "POST") {
      const clientKey = request.headers.get("CF-Connecting-IP") || "unknown";
      const blocked = await limitRoute(
        env.REVIEW_RATE_LIMITER,
        `review:${clientKey}`,
        "Too many review attempts were sent. Please wait a minute and try again.",
        origin,
        requestId
      );
      if (blocked) return blocked;
      return handleReviews(request, env, origin, requestId);
    }

    if (url.pathname !== "/support" || request.method !== "POST") {
      return jsonResponse({ ok: false, error: "Not found." }, 404, origin, requestId);
    }

    if (!ALLOWED_ORIGINS.has(origin)) {
      return jsonResponse({ ok: false, error: "This request is not allowed." }, 403, origin, requestId);
    }

    const clientKey = request.headers.get("CF-Connecting-IP") || "unknown";
    const supportBlocked = await limitRoute(
      env.CONTACT_RATE_LIMITER,
      `support:${clientKey}`,
      "Too many messages were sent. Please wait a minute and try again.",
      origin,
      requestId
    );
    if (supportBlocked) return supportBlocked;

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

    const turnstileFailure = await verifyHumanCheck(env, request, validation.submission.turnstileToken, "support", origin, requestId);
    if (turnstileFailure) return turnstileFailure;

    try {
      const providerResult = await sendWithResend(env, validation.submission, requestId);
      logOpsEvent("support_email_sent", {
        requestId,
        providerMessageId: providerResult.id
      });
      return jsonResponse({ ok: true, requestId }, 200, origin, requestId);
    } catch (error) {
      await sendOperationalAlert(env, {
        type: "support_email_failure",
        requestId,
        failureCategory: failureCategory(error, "support_email_failed"),
        message: safeErrorMessage(error),
      });
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
