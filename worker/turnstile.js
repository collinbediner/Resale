const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TOKEN_PATTERN = /^[A-Za-z0-9._-]{20,2048}$/;

function trimmed(value, maximumLength = 4096) {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

export function readTurnstileToken(input) {
  return trimmed(input?.turnstileToken, 4096);
}

export function turnstileFieldSet(extraFields = []) {
  return new Set(["turnstileToken", ...extraFields]);
}

export function validateTurnstileTokenShape(token) {
  if (!token) return { ok: false, error: "Please complete the security check and try again." };
  if (!TOKEN_PATTERN.test(token)) {
    return { ok: false, error: "The security check response was invalid. Please try again." };
  }
  return { ok: true };
}

// Server-side verification ensures the browser cannot bypass Turnstile by posting
// a fake success flag or skipping the widget entirely.
export async function verifyTurnstileToken(secret, token, { ip = "", action = "" } = {}) {
  if (!secret) throw new Error("TURNSTILE_SECRET_KEY is not configured.");

  const body = new URLSearchParams({
    secret,
    response: token,
  });
  if (ip) body.set("remoteip", ip);

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result?.success) {
    return { ok: false, error: "Please complete the security check and try again." };
  }
  if (action && result.action && result.action !== action) {
    return { ok: false, error: "The security check did not match this form. Please try again." };
  }

  return { ok: true };
}
