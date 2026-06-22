const MONITOR_FIELDS = new Set(["status", "siteStatus", "apiStatus", "httpCode", "duration", "runUrl"]);

function clean(value, maximumLength) {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

export function validateMonitorReport(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Invalid monitor report." };
  }
  if (Object.keys(input).some(key => !MONITOR_FIELDS.has(key))) {
    return { ok: false, error: "Unexpected monitor field." };
  }

  const report = {
    status: clean(input.status, 10),
    siteStatus: clean(input.siteStatus, 20),
    apiStatus: clean(input.apiStatus, 20),
    httpCode: clean(input.httpCode, 10),
    duration: clean(input.duration, 20),
    runUrl: clean(input.runUrl, 300)
  };

  if (!["PASS", "FAIL"].includes(report.status)) return { ok: false, error: "Invalid monitor status." };
  if (!["PASS", "FAIL"].includes(report.siteStatus)) return { ok: false, error: "Invalid site status." };
  if (!["PASS", "FAIL"].includes(report.apiStatus)) return { ok: false, error: "Invalid API status." };
  if (!/^https:\/\/github\.com\/collinbediner\/Resale\/actions\/runs\/\d+$/.test(report.runUrl)) {
    return { ok: false, error: "Invalid monitor run URL." };
  }

  return { ok: true, report };
}

export function constantTimeTokenEqual(provided, expected) {
  const left = new TextEncoder().encode(provided || "");
  const right = new TextEncoder().encode(expected || "");
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] || 0) ^ (right[index] || 0);
  }
  return difference === 0;
}

export function buildMonitorEmail(report) {
  const subject = `ResaleLane daily check: ${report.status}`;
  const text = [
    `Production: ${report.status}`,
    `Storefront: ${report.siteStatus}`,
    `Private API: ${report.apiStatus}`,
    `HTTP: ${report.httpCode || "unknown"}`,
    `Response time: ${report.duration || "unknown"}s`,
    "Storefront: https://shopresalelane.com/",
    `Workflow: ${report.runUrl}`
  ].join("\n");
  return { subject, text };
}
