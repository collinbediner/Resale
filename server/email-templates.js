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

function fulfillmentSectionHtml(section) {
  return `<section style="margin:20px 0 0;padding:18px;border:1px solid #282828;border-radius:14px;background:#151515">
    <h2 style="margin:0 0 14px;font-size:21px">${escapeHtml(section.title)}</h2>
    <table role="presentation" style="width:100%;border-collapse:collapse">
      <tr><td style="padding:6px 0;color:#8f8f8f">Company Name</td><td style="padding:6px 0;text-align:right;font-weight:700">${escapeHtml(section.companyName)}</td></tr>
      <tr><td style="padding:6px 0;color:#8f8f8f">Contact Name</td><td style="padding:6px 0;text-align:right;font-weight:700">${escapeHtml(section.contactName)}</td></tr>
      <tr><td style="padding:6px 0;color:#8f8f8f">Phone / WhatsApp</td><td style="padding:6px 0;text-align:right;font-weight:700">${escapeHtml(section.phoneWhatsApp)}</td></tr>
      <tr><td style="padding:6px 0;color:#8f8f8f">Best Contact Method</td><td style="padding:6px 0;text-align:right;font-weight:700">${escapeHtml(section.bestContactMethod)}</td></tr>
    </table>
    <p style="margin:16px 0 0;color:#8f8f8f;font-size:12px;letter-spacing:.08em;text-transform:uppercase">Ordering Notes</p>
    <p style="margin:8px 0 0;color:#d4d4d4;line-height:1.65">${escapeHtml(section.orderingNotes)}</p>
    <p style="margin:16px 0 0;color:#8f8f8f;font-size:12px;letter-spacing:.08em;text-transform:uppercase">Recommended First Message</p>
    <p style="margin:8px 0 0;color:#d4d4d4;line-height:1.65">${escapeHtml(section.recommendedFirstMessage)}</p>
    <p style="margin:16px 0 0;color:#8f8f8f;font-size:12px;letter-spacing:.08em;text-transform:uppercase">Before Ordering</p>
    <p style="margin:8px 0 0;color:#d4d4d4;line-height:1.65">${escapeHtml(section.beforeOrdering)}</p>
  </section>`;
}

function fulfillmentSectionText(section) {
  return [
    section.title,
    `Company Name: ${section.companyName}`,
    `Contact Name: ${section.contactName}`,
    `Phone / WhatsApp: ${section.phoneWhatsApp}`,
    `Best Contact Method: ${section.bestContactMethod}`,
    `Ordering Notes: ${section.orderingNotes}`,
    `Recommended First Message: ${section.recommendedFirstMessage}`,
    `Before Ordering: ${section.beforeOrdering}`,
    `Disclaimer: ${section.disclaimer}`,
  ].join("\n");
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
  const subject = `Thank you for shopping with ResaleLane - ${order.orderId}`;
  const text = `Thank you for shopping with ResaleLane.

We received your order ${order.orderId} and are getting everything ready for you.

Stripe payment reference: ${order.stripeReference}
Total: ${formatMoney(order.totalCents, order.currency)}

If Stripe sends a payment receipt for this checkout, it will come separately from Stripe. ResaleLane sends your delivery email separately after server-side verification.

Support: ${SUPPORT_EMAIL}

${DISCLAIMER}`;

  return {
    subject,
    text,
    html: layout({
      preheader: `Thank you for shopping with ResaleLane.`,
      heading: "Thank you for shopping with ResaleLane.",
      body: `<p style="color:#d4d4d4;line-height:1.65">We received your order and are preparing your delivery now. We appreciate you trusting ResaleLane with your sourcing research.</p>
        <p style="color:#d4d4d4;line-height:1.65">If Stripe sends a payment receipt for this checkout, it will arrive separately from Stripe. Your ResaleLane delivery email will follow after server-side verification.</p>
        ${orderSummary(order)}`
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

export function fulfilledPackageEmail(order, fulfillment) {
  validateOrder(order);
  if (!fulfillment?.artifactVersion || !Array.isArray(fulfillment.resourceTitles) || fulfillment.resourceTitles.length === 0) {
    throw new Error("Artifact version and at least one fulfillment resource title are required.");
  }

  const resourceListText = fulfillment.resourceTitles.map((title) => `- ${title}`).join("\n");
  const resourceListHtml = fulfillment.resourceTitles.map((title) => `<li style="margin:0 0 8px;color:#d4d4d4">${escapeHtml(title)}</li>`).join("");
  const attachmentLine = fulfillment.attachmentCount === 1
    ? "Your PDF is attached to this email."
    : `Your ${fulfillment.attachmentCount} PDF files are attached to this email.`;

  return {
    subject: `Your ResaleLane package is ready - ${order.orderId}`,
    text: `Thank you for shopping with ResaleLane.

Your purchased sourcing package is ready.

Artifact version: ${fulfillment.artifactVersion}
${attachmentLine}

Included in this delivery:
${resourceListText}

This email is your ResaleLane delivery confirmation. If Stripe sends a payment receipt for this order, it will arrive separately from Stripe.

Do not forward this email. If you need help, contact ${SUPPORT_EMAIL} from the checkout email and include order ${order.orderId}.

${DISCLAIMER}`,
    html: layout({
      preheader: `Your order ${order.orderId} is ready.`,
      heading: "Your package is ready.",
      body: `<p style="color:#d4d4d4;line-height:1.65">Thank you for shopping with ResaleLane. Your sourcing package is ready, and the PDF delivery file${fulfillment.attachmentCount === 1 ? "" : "s"} ${fulfillment.attachmentCount === 1 ? "is" : "are"} attached to this email.</p>
        <p style="color:#d4d4d4;line-height:1.65">This email is your ResaleLane delivery confirmation. If Stripe sends a payment receipt for this order, it will arrive separately from Stripe.</p>
        ${orderSummary(order)}
        <p style="color:#737373;font-size:12px">Artifact version ${escapeHtml(fulfillment.artifactVersion)} · Do not forward this email.</p>
        <section style="margin:20px 0 0;padding:18px;border:1px solid #282828;border-radius:14px;background:#151515">
          <p style="margin:0 0 10px;color:#8f8f8f;font-size:12px;letter-spacing:.08em;text-transform:uppercase">Attached PDFs</p>
          <ul style="margin:0;padding-left:20px">${resourceListHtml}</ul>
        </section>
        <section style="margin:20px 0 0;padding:18px;border:1px solid #282828;border-radius:14px;background:#151515">
          <p style="margin:0 0 10px;color:#8f8f8f;font-size:12px;letter-spacing:.08em;text-transform:uppercase">Before you buy from any vendor</p>
          <p style="margin:0;color:#d4d4d4;line-height:1.65">Please verify supplier identity, pricing, minimum order requirements, payment method, shipping details, and product authenticity directly with the vendor before sending money.</p>
        </section>`
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
