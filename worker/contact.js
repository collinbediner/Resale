const SUPPORT_REASONS = new Set([
  "Order delivery",
  "Wrong package",
  "Duplicate charge",
  "Product question",
  "Partnership",
  "Other"
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTACT_FIELDS = new Set(["name", "email", "order", "reason", "message", "messageHtml", "company"]);

function clean(value, maximumLength) {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

function cleanMessageHtml(value) {
  if (typeof value !== "string") return "";
  return value
    .slice(0, 8000)
    .replace(/<(?!\/?(?:b|strong|u|ul|ol|li|p|br)(?:\s*\/?)>)[^>]*>/gi, "")
    .replace(/<(b|strong|u|ul|ol|li|p)\s+[^>]*>/gi, "<$1>");
}

export function validateContactSubmission(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Please complete the contact form and try again." };
  }
  if (Object.keys(input).some(key => !CONTACT_FIELDS.has(key))) {
    return { ok: false, error: "The form included an unexpected field. Please refresh and try again." };
  }

  const submission = {
    name: clean(input.name, 100),
    email: clean(input.email, 254).toLowerCase(),
    order: clean(input.order, 50),
    reason: clean(input.reason, 50),
    message: clean(input.message, 4000),
    messageHtml: cleanMessageHtml(input.messageHtml),
    company: clean(input.company, 200)
  };

  // Real visitors never see this field. Bots commonly fill every available input.
  if (submission.company) return { ok: false, silent: true };
  if (submission.name.length < 2) return { ok: false, error: "Please enter your name." };
  if (!EMAIL_PATTERN.test(submission.email)) return { ok: false, error: "Please enter a valid email address." };
  if (!SUPPORT_REASONS.has(submission.reason)) return { ok: false, error: "Please choose a valid reason." };
  if (submission.message.length < 10) return { ok: false, error: "Please include a little more detail in your message." };

  return { ok: true, submission };
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

export function buildSupportEmail(submission, requestId) {
  const order = submission.order || "Not provided";
  const subject = `[ResaleLane Support] ${submission.reason}${submission.order ? ` - ${submission.order}` : ""}`;
  const text = [
    `New ResaleLane support message (${requestId})`,
    "",
    `Name: ${submission.name}`,
    `Email: ${submission.email}`,
    `Order ID: ${order}`,
    `Reason: ${submission.reason}`,
    "",
    submission.message
  ].join("\n");

  const html = `
    <h2>New ResaleLane support message</h2>
    <p><strong>Reference:</strong> ${escapeHtml(requestId)}</p>
    <p>
      <strong>Name:</strong> ${escapeHtml(submission.name)}<br>
      <strong>Email:</strong> ${escapeHtml(submission.email)}<br>
      <strong>Order ID:</strong> ${escapeHtml(order)}<br>
      <strong>Reason:</strong> ${escapeHtml(submission.reason)}
    </p>
    <hr>
    <div>${submission.messageHtml || `<p style="white-space:pre-wrap">${escapeHtml(submission.message)}</p>`}</div>
  `.trim();

  return { subject, text, html };
}
