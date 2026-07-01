import { readTurnstileToken, turnstileFieldSet, validateTurnstileTokenShape } from "./turnstile.js";
import { escapeHtml, infoCard, layout, statusBadge } from "../server/email-templates.js";

const SUPPORT_REASONS = new Set([
  "Order delivery",
  "Wrong package",
  "Duplicate charge",
  "Product question",
  "Partnership",
  "Other"
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTACT_FIELDS = turnstileFieldSet(["name", "email", "order", "reason", "message", "messageHtml", "company"]);

function clean(value, maximumLength) {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

function cleanMessageHtml(value) {
  if (typeof value !== "string") return "";
  // Allow only a tiny formatting subset from the rich-text editor. This keeps the
  // support inbox readable without accepting arbitrary HTML from the browser.
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
    company: clean(input.company, 200),
    turnstileToken: readTurnstileToken(input),
  };

  // Real visitors never see this field. Bots commonly fill every available input.
  if (submission.company) return { ok: false, silent: true };
  if (submission.name.length < 2) return { ok: false, error: "Please enter your name." };
  if (!EMAIL_PATTERN.test(submission.email)) return { ok: false, error: "Please enter a valid email address." };
  if (!SUPPORT_REASONS.has(submission.reason)) return { ok: false, error: "Please choose a valid reason." };
  if (submission.message.length < 10) return { ok: false, error: "Please include a little more detail in your message." };
  const turnstile = validateTurnstileTokenShape(submission.turnstileToken);
  if (!turnstile.ok) return turnstile;

  return { ok: true, submission };
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

  const messageMarkup = submission.messageHtml
    ? `<div style="color:#d4d4d4;line-height:1.75;word-break:break-word">${submission.messageHtml}</div>`
    : `<p style="margin:0;color:#d4d4d4;line-height:1.75;white-space:pre-wrap;word-break:break-word">${escapeHtml(submission.message)}</p>`;

  const html = layout({
    preheader: `New support message from ${submission.name}.`,
    heading: "New support message received.",
    intro: "A customer submitted the contact form from the live ResaleLane support flow.",
    body: `
      <p style="margin:0 0 20px">${statusBadge("Needs reply", "warning")}</p>
      ${infoCard("Support Details", `
        <table role="presentation" style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;color:#8f8f8f">Reference</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#ffffff">${escapeHtml(requestId)}</td></tr>
          <tr><td style="padding:8px 0;color:#8f8f8f">Name</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#ffffff">${escapeHtml(submission.name)}</td></tr>
          <tr><td style="padding:8px 0;color:#8f8f8f">Email</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#ffffff">${escapeHtml(submission.email)}</td></tr>
          <tr><td style="padding:8px 0;color:#8f8f8f">Order ID</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#ffffff">${escapeHtml(order)}</td></tr>
          <tr><td style="padding:8px 0;color:#8f8f8f">Reason</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#ffffff">${escapeHtml(submission.reason)}</td></tr>
        </table>
      `)}
      ${infoCard("Customer Message", messageMarkup)}
      ${infoCard("Reply Guidance", `<p style="margin:0;color:#d4d4d4;line-height:1.7">Reply directly to this email so the response goes back to the customer address on file. Do not ask the customer to share card numbers, passwords, API keys, or supplier credentials.</p>`)}
    `
  });

  return { subject, text, html };
}
