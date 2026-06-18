const SUPPORT_EMAIL = "collin.bediner+support@gmail.com";
const DISCLAIMER = "ResaleLane provides informational sourcing resources only. ResaleLane does not own or control third-party suppliers and does not guarantee pricing, inventory, shipping times, product quality, authenticity, or results.";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(cents, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(cents / 100);
}

function layout({ preheader, heading, body, action }) {
  const button = action
    ? `<p style="margin:28px 0"><a href="${escapeHtml(action.url)}" style="display:inline-block;padding:13px 20px;border-radius:10px;background:#ffffff;color:#080808;text-decoration:none;font-weight:700">${escapeHtml(action.label)}</a></p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#080808;color:#ffffff;font-family:Arial,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</div>
  <main style="max-width:620px;margin:0 auto;padding:36px 22px">
    <p style="font-size:20px;font-weight:700;margin:0 0 42px">ResaleLane</p>
    <section style="background:#111111;border:1px solid #2a2a2a;border-radius:16px;padding:28px">
      <h1 style="margin:0 0 18px;font-size:28px;line-height:1.2">${escapeHtml(heading)}</h1>
      ${body}
      ${button}
    </section>
    <p style="margin:24px 0 0;color:#777777;font-size:12px;line-height:1.6">${escapeHtml(DISCLAIMER)}</p>
    <p style="color:#777777;font-size:12px">Support: <a href="mailto:${SUPPORT_EMAIL}" style="color:#bdbdbd">${SUPPORT_EMAIL}</a></p>
  </main>
</body>
</html>`;
}

function orderRows(items) {
  return items.map(item => `<tr>
    <td style="padding:9px 0;border-bottom:1px solid #282828;color:#d4d4d4">${escapeHtml(item.name)}</td>
    <td style="padding:9px 0;border-bottom:1px solid #282828;text-align:right;font-weight:700">${escapeHtml(formatMoney(item.amountCents))}</td>
  </tr>`).join("");
}

function orderSummary(order) {
  return `<table role="presentation" style="width:100%;border-collapse:collapse;margin:20px 0">
    ${orderRows(order.items)}
    <tr><td style="padding-top:14px;font-weight:700">Total</td><td style="padding-top:14px;text-align:right;font-weight:800">${escapeHtml(formatMoney(order.totalCents, order.currency))}</td></tr>
  </table>
  <p style="color:#a3a3a3;font-size:13px">ResaleLane order: ${escapeHtml(order.orderId)}<br>Stripe reference: ${escapeHtml(order.stripeReference)}</p>`;
}

function validateOrder(order) {
  if (!order?.orderId || !order?.stripeReference || !order?.items?.length) {
    throw new Error("Order ID, Stripe reference, and at least one item are required.");
  }
  if (!Number.isInteger(order.totalCents) || order.totalCents < 0) {
    throw new Error("Order total must be a non-negative integer in cents.");
  }
}

export function orderConfirmationEmail(order) {
  validateOrder(order);
  const subject = `ResaleLane order received - ${order.orderId}`;
  const text = `We received your ResaleLane order ${order.orderId}.

Stripe payment reference: ${order.stripeReference}
Total: ${formatMoney(order.totalCents, order.currency)}

Stripe provides the official payment receipt. Your purchased sourcing resource will be sent separately after server-side payment verification.

Support: ${SUPPORT_EMAIL}

${DISCLAIMER}`;

  return {
    subject,
    text,
    html: layout({
      preheader: `We received order ${order.orderId}.`,
      heading: "We received your order.",
      body: `<p style="color:#d4d4d4;line-height:1.65">Stripe provides the official payment receipt. ResaleLane will send your purchased sourcing resource separately after server-side payment verification.</p>${orderSummary(order)}`
    })
  };
}

export function deliveryEmail(order, delivery) {
  validateOrder(order);
  if (!delivery?.url || !delivery?.expiresAt || !delivery?.artifactVersion) {
    throw new Error("Delivery URL, expiration, and artifact version are required.");
  }

  const subject = `Your ResaleLane package is ready - ${order.orderId}`;
  const text = `Your purchased ResaleLane sourcing resource is ready.

Secure download: ${delivery.url}
Link expires: ${delivery.expiresAt}
Artifact version: ${delivery.artifactVersion}

Do not forward this order-specific link. If it expires or does not work, contact ${SUPPORT_EMAIL} from the checkout email and include order ${order.orderId}.

${DISCLAIMER}`;

  return {
    subject,
    text,
    html: layout({
      preheader: `Your order ${order.orderId} is ready for secure download.`,
      heading: "Your package is ready.",
      body: `<p style="color:#d4d4d4;line-height:1.65">Use the secure, order-specific link below. Do not forward it. The link expires on <strong>${escapeHtml(delivery.expiresAt)}</strong>.</p>
        <p style="color:#737373;font-size:12px">Order ${escapeHtml(order.orderId)} · Artifact version ${escapeHtml(delivery.artifactVersion)}</p>`,
      action: { label: "Download your package", url: delivery.url }
    })
  };
}

export function deliveryDelayedEmail(order) {
  validateOrder(order);
  return {
    subject: `Update on your ResaleLane delivery - ${order.orderId}`,
    text: `We received your payment, but delivery is taking longer than expected. You do not need to purchase again.

Our system will retry automatically. If the package has not arrived within 30 minutes, contact ${SUPPORT_EMAIL} from the checkout email and include order ${order.orderId}.

${DISCLAIMER}`,
    html: layout({
      preheader: `Delivery for order ${order.orderId} is delayed.`,
      heading: "Your delivery is taking longer than expected.",
      body: `<p style="color:#d4d4d4;line-height:1.65">Your payment was received. You do not need to purchase again. Our system will retry automatically.</p>
        <p style="color:#a3a3a3;line-height:1.65">If the package has not arrived within 30 minutes, contact support from the checkout email and include order <strong>${escapeHtml(order.orderId)}</strong>.</p>`
    })
  };
}

export function supportAcknowledgementEmail(request) {
  if (!request?.requestId || !request?.reason) {
    throw new Error("Support request ID and reason are required.");
  }
  const orderLine = request.orderId ? `Order: ${request.orderId}\n` : "";
  return {
    subject: `ResaleLane support request received - ${request.requestId}`,
    text: `We received your support request.

Request: ${request.requestId}
${orderLine}Reason: ${request.reason}

Reply to this email if you need to add information. Never send card numbers, passwords, API keys, or supplier credentials.

Support: ${SUPPORT_EMAIL}`,
    html: layout({
      preheader: `Support request ${request.requestId} was received.`,
      heading: "We received your message.",
      body: `<p style="color:#d4d4d4;line-height:1.65">Reference: <strong>${escapeHtml(request.requestId)}</strong></p>
        ${request.orderId ? `<p style="color:#a3a3a3">Order: ${escapeHtml(request.orderId)}</p>` : ""}
        <p style="color:#a3a3a3">Reason: ${escapeHtml(request.reason)}</p>
        <p style="color:#737373;font-size:12px;line-height:1.6">Reply if you need to add information. Never send card numbers, passwords, API keys, or supplier credentials.</p>`
    })
  };
}

export { DISCLAIMER, SUPPORT_EMAIL };
