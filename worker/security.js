export const MAX_JSON_BYTES = 12_000;

export class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function securityHeaders() {
  return {
    "Cross-Origin-Resource-Policy": "same-site",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY"
  };
}

// Read the body as a stream and enforce the byte cap while reading so oversized
// payloads are rejected even if Content-Length is missing or dishonest.
export async function readBoundedJson(request, maximumBytes = MAX_JSON_BYTES) {
  const contentType = request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new RequestError(415, "Content-Type must be application/json.");
  }

  const declaredLength = Number(request.headers.get("Content-Length") || "0");
  if (declaredLength > maximumBytes) {
    throw new RequestError(413, "That message is too large.");
  }

  if (!request.body) throw new RequestError(400, "A request body is required.");

  const reader = request.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maximumBytes) {
      await reader.cancel();
      throw new RequestError(413, "That message is too large.");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new RequestError(400, "Please complete the contact form and try again.");
  }
}
