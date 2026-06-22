import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const forbiddenPaths = [
  /^\.env(?:\.|$)/,
  /^\.secrets\//,
  /^Supplier Delivery Data - Private\//,
  /\.gdoc$|\.gsheet$|\.gslides$/
];
const secretPatterns = [
  { name: "Resend API key", pattern: /\bre_[A-Za-z0-9_]{20,}\b/g },
  { name: "Stripe secret key", pattern: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/g },
  { name: "Stripe webhook secret", pattern: /\bwhsec_[A-Za-z0-9]{16,}\b/g },
  { name: "GitHub token", pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g }
];

const findings = [];
for (const file of files) {
  if (forbiddenPaths.some(pattern => pattern.test(file))) {
    findings.push(`${file}: private file type must not be tracked`);
    continue;
  }
  if (/\.(?:png|jpe?g|gif|webp|pdf|ico)$/i.test(file)) continue;
  const bytes = readFileSync(file);
  if (bytes.byteLength > 1_000_000) continue;
  const contents = bytes.toString("utf8");
  for (const { name, pattern } of secretPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(contents)) findings.push(`${file}: possible ${name}`);
  }
}

if (findings.length) {
  console.error(`Secret scan failed:\n${findings.map(item => `- ${item}`).join("\n")}`);
  process.exit(1);
}

console.log(`Secret scan passed across ${files.length} tracked files.`);
