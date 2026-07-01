const SUPPORT_EMAIL = "collin.bediner+support@gmail.com";
const DISCLAIMER = "ResaleLane provides informational sourcing resources only. ResaleLane does not own or control third-party suppliers and does not guarantee pricing, inventory, shipping times, product quality, authenticity, or results.";
const EMAIL_FONT_STACK = "'Aptos', 'Segoe UI', Arial, sans-serif";

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

function layout({ preheader, heading, intro = "", body, action }) {
  const button = action
    ? `<table role="presentation" style="border-collapse:collapse;margin:28px 0 0"><tr><td style="border-radius:12px;background:#ffffff;padding:0"><a href="${escapeHtml(action.url)}" style="display:inline-block;padding:14px 20px;border-radius:12px;background:#ffffff;color:#080808;text-decoration:none;font-size:15px;font-weight:700;line-height:1.2">${escapeHtml(action.label)}</a></td></tr></table>`
    : "";

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#080808;color:#ffffff;font-family:${EMAIL_FONT_STACK}">
  <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</div>
  <table role="presentation" style="width:100%;border-collapse:collapse;background:#080808;mso-table-lspace:0;mso-table-rspace:0">
    <tr>
      <td align="center" style="padding:36px 16px">
        <table role="presentation" style="width:100%;max-width:640px;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0">
          <tr>
            <td style="padding:0 0 24px 8px;font-size:20px;font-weight:700;line-height:1.2;color:#ffffff">ResaleLane</td>
          </tr>
          <tr>
            <td style="border:1px solid #2a2a2a;border-radius:18px;background:#111111;padding:40px 32px">
              <h1 style="margin:0 0 16px;font-size:36px;line-height:1.15;font-weight:800;letter-spacing:-0.03em;color:#ffffff">${escapeHtml(heading)}</h1>
              ${intro ? `<p style="margin:0 0 24px;font-size:18px;line-height:1.7;color:#d4d4d4">${intro}</p>` : ""}
              ${body}
              ${button}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px 0;color:#777777;font-size:12px;line-height:1.7">${escapeHtml(DISCLAIMER)}</td>
          </tr>
          <tr>
            <td style="padding:10px 8px 0;color:#777777;font-size:12px;line-height:1.7">Support: <a href="mailto:${SUPPORT_EMAIL}" style="color:#bdbdbd">${SUPPORT_EMAIL}</a></td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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
  return `<table role="presentation" style="width:100%;border-collapse:collapse;margin:28px 0 0">
    ${orderRows(order.items)}
    <tr><td style="padding-top:16px;font-weight:700;line-height:1.5">Total</td><td style="padding-top:16px;text-align:right;font-weight:800;line-height:1.5">${escapeHtml(formatMoney(order.totalCents, order.currency))}</td></tr>
  </table>
  <p style="margin:18px 0 0;color:#a3a3a3;font-size:13px;line-height:1.7">ResaleLane order: ${escapeHtml(order.orderId)}</p>`;
}

function infoCard(title, innerHtml) {
  return `<table role="presentation" style="width:100%;margin:24px 0 0;border-collapse:separate;border-spacing:0;border:1px solid #282828;border-radius:14px;background:#151515">
    <tr>
      <td style="padding:20px 20px 18px">
        <p style="margin:0 0 10px;color:#8f8f8f;font-size:12px;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(title)}</p>
        ${innerHtml}
      </td>
    </tr>
  </table>`;
}

function statusBadge(label, tone = "neutral") {
  const palette = tone === "success"
    ? { border: "#1f6f43", background: "#0f2418", text: "#9ff0bf" }
    : tone === "warning"
      ? { border: "#7a5a16", background: "#261d0d", text: "#f7d98a" }
      : { border: "#3a3a3a", background: "#191919", text: "#d4d4d4" };

  return `<span style="display:inline-block;padding:7px 12px;border:1px solid ${palette.border};border-radius:999px;background:${palette.background};color:${palette.text};font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(label)}</span>`;
}

function fulfillmentSectionHtml(section) {
  return `<table role="presentation" style="width:100%;margin:20px 0 0;border-collapse:separate;border-spacing:0;border:1px solid #282828;border-radius:14px;background:#151515">
    <tr><td style="padding:18px">
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
    </td></tr>
  </table>`;
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
  if (!order?.orderId || !order?.items?.length) {
    throw new Error("Order ID and at least one item are required.");
  }
  if (!Number.isInteger(order.totalCents) || order.totalCents < 0) {
    throw new Error("Order total must be a non-negative integer in cents.");
  }
}

function validateInternalOrder(order) {
  validateOrder(order);
  if (!order?.stripeReference) {
    throw new Error("Stripe reference is required for internal sale alerts.");
  }
}

export function orderConfirmationEmail(order) {
  validateOrder(order);
  const subject = `Thank you for shopping with ResaleLane - ${order.orderId}`;
  const text = `Thank you for shopping with ResaleLane.

We received your order ${order.orderId} and are getting everything ready for you.

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
      intro: "We received your order and are preparing your delivery now.",
      body: `<p style="margin:0 0 18px;color:#d4d4d4;line-height:1.7">If Stripe sends a payment receipt for this checkout, it will arrive separately from Stripe. Your ResaleLane delivery email will follow after server-side verification.</p>
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
      intro: "Use the secure, order-specific link below. Do not forward it.",
      body: `<p style="margin:0;color:#d4d4d4;line-height:1.7">This link expires on <strong>${escapeHtml(delivery.expiresAt)}</strong>.</p>
        <p style="margin:18px 0 0;color:#737373;font-size:12px;line-height:1.7">Order ${escapeHtml(order.orderId)} · Artifact version ${escapeHtml(delivery.artifactVersion)}</p>`,
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
    text: `Your purchased sourcing package is ready.

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
      intro: `Your sourcing package is ready, and the PDF delivery file${fulfillment.attachmentCount === 1 ? "" : "s"} ${fulfillment.attachmentCount === 1 ? "is" : "are"} attached to this email.`,
      body: `<p style="margin:0 0 18px;color:#d4d4d4;line-height:1.7">This is your full ResaleLane delivery email. If Stripe sends a payment receipt for this order, it will arrive separately from Stripe.</p>
        ${orderSummary(order)}
        <p style="margin:18px 0 0;color:#737373;font-size:12px;line-height:1.7">Artifact version ${escapeHtml(fulfillment.artifactVersion)} · Do not forward this email.</p>
        ${infoCard("Attached PDFs", `<ul style="margin:0;padding-left:20px">${resourceListHtml}</ul>`)}
        ${infoCard("Before you buy from any vendor", `<p style="margin:0;color:#d4d4d4;line-height:1.7">Please verify supplier identity, pricing, minimum order requirements, payment method, shipping details, and product authenticity directly with the vendor before sending money.</p>`)}`
    })
  };
}

export function internalSaleAlertEmail(order, details) {
  validateInternalOrder(order);
  const saleStatus = details?.saleStatus || "paid";
  const artifactVersion = details?.artifactVersion || "pending";
  const itemList = order.items.map((item) => `- ${item.name}: ${formatMoney(item.amountCents, order.currency)}`).join("\n");
  const itemListHtml = order.items.map((item) => `<li style="margin:0 0 8px;color:#d4d4d4">${escapeHtml(item.name)} <span style="float:right;font-weight:700">${escapeHtml(formatMoney(item.amountCents, order.currency))}</span></li>`).join("");
  const statusTone = saleStatus === "delivered" ? "success" : saleStatus.includes("failed") ? "warning" : "neutral";
  const nextStepText = saleStatus.includes("failed")
    ? "Review the order record and delivery logs before contacting the buyer."
    : "Watch for any follow-up support reply from the buyer inbox and confirm the delivery attachment was sent.";

  return {
    subject: `New ResaleLane sale - ${order.orderId}`,
    text: `A ResaleLane sale was completed.

Order: ${order.orderId}
Buyer email: ${order.buyerEmail}
Sale status: ${saleStatus}
Artifact version: ${artifactVersion}
Total: ${formatMoney(order.totalCents, order.currency)}

Items:
${itemList}

Next step: ${nextStepText}`,
    html: layout({
      preheader: `New ResaleLane sale ${order.orderId}.`,
      heading: "A ResaleLane sale was completed.",
      intro: "This is an internal order alert for support and operations.",
      body: `
        <p style="margin:0 0 20px">${statusBadge(saleStatus, statusTone)}</p>
        <table role="presentation" style="width:100%;border-collapse:collapse;margin:20px 0">
          <tr><td style="padding:8px 0;color:#8f8f8f">Order</td><td style="padding:8px 0;text-align:right;font-weight:700">${escapeHtml(order.orderId)}</td></tr>
          <tr><td style="padding:8px 0;color:#8f8f8f">Buyer email</td><td style="padding:8px 0;text-align:right;font-weight:700">${escapeHtml(order.buyerEmail)}</td></tr>
          <tr><td style="padding:8px 0;color:#8f8f8f">Sale status</td><td style="padding:8px 0;text-align:right;font-weight:700">${escapeHtml(saleStatus)}</td></tr>
          <tr><td style="padding:8px 0;color:#8f8f8f">Artifact version</td><td style="padding:8px 0;text-align:right;font-weight:700">${escapeHtml(artifactVersion)}</td></tr>
          <tr><td style="padding:8px 0;color:#8f8f8f">Total</td><td style="padding:8px 0;text-align:right;font-weight:700">${escapeHtml(formatMoney(order.totalCents, order.currency))}</td></tr>
        </table>
        ${infoCard("Items", `<ul style="margin:0;padding-left:20px">${itemListHtml}</ul>`)}
        ${infoCard("Next Step", `<p style="margin:0;color:#d4d4d4;line-height:1.7">${escapeHtml(nextStepText)}</p>`)}`
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
      intro: "Your payment was received. You do not need to purchase again.",
      body: `<p style="margin:0;color:#d4d4d4;line-height:1.7">Our system will retry automatically.</p>
        <p style="margin:18px 0 0;color:#a3a3a3;line-height:1.7">If the package has not arrived within 30 minutes, contact support from the checkout email and include order <strong>${escapeHtml(order.orderId)}</strong>.</p>`
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
      intro: `Reference: ${escapeHtml(request.requestId)}`,
      body: `${request.orderId ? `<p style="margin:0 0 12px;color:#a3a3a3;line-height:1.7">Order: ${escapeHtml(request.orderId)}</p>` : ""}
        <p style="margin:0 0 18px;color:#a3a3a3;line-height:1.7">Reason: ${escapeHtml(request.reason)}</p>
        <p style="margin:0;color:#737373;font-size:12px;line-height:1.7">Reply if you need to add information. Never send card numbers, passwords, API keys, or supplier credentials.</p>`
    })
  };
}

export { DISCLAIMER, EMAIL_FONT_STACK, SUPPORT_EMAIL, escapeHtml, infoCard, layout, statusBadge };
