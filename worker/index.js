import { buildSupportEmail, validateContactSubmission } from "./contact.js";
import { readBoundedJson, RequestError, securityHeaders } from "./security.js";

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

async function sendWithResend(env, submission, requestId) {
  const email = buildSupportEmail(submission, requestId);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": requestId
    },
    body: JSON.stringify({
      from: env.SUPPORT_EMAIL_FROM,
      to: [env.SUPPORT_EMAIL_TO],
      reply_to: submission.email,
      subject: email.subject,
      text: email.text,
      html: email.html,
      tags: [{ name: "category", value: "support_request" }]
    })
  });

  if (!response.ok) {
    console.error(JSON.stringify({
      event: "support_email_failed",
      requestId,
      providerStatus: response.status
    }));
    throw new Error("Email provider rejected the request");
  }

  return response.json();
}

const worker = {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const requestId = crypto.randomUUID();
    const url = new URL(request.url);

    if (url.pathname === "/health" && request.method === "GET") {
      try {
        const databaseCheck = await env.ORDERS_DB.prepare(
          "SELECT COUNT(*) AS table_count FROM sqlite_master WHERE type = 'table' AND name IN ('orders', 'order_items', 'payment_events', 'delivery_attempts', 'support_requests')"
        ).first();
        const storageCheck = await env.ARTIFACTS.head("__resalelane_healthcheck__");
        return Response.json({
          ok: databaseCheck?.table_count === 5 && storageCheck === null,
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
