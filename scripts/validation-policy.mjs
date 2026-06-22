import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Keep validation decisions deterministic so CI never relies on an agent's risk judgment.
const ROOT_DOCUMENTATION = new Set(["CONTRIBUTING.md", "HANDOFF.md", "README.md"]);

// Only public Markdown documentation qualifies for the lightweight validation tier.
export function isDocumentationPath(filePath) {
  return ROOT_DOCUMENTATION.has(filePath) || /^docs\/.+\.md$/u.test(filePath);
}

// Empty or mixed change sets deliberately fall back to full validation.
export function classifyValidationTier(filePaths) {
  const normalizedPaths = filePaths.map(filePath => filePath.trim()).filter(Boolean);
  return normalizedPaths.length > 0 && normalizedPaths.every(isDocumentationPath)
    ? "docs-only"
    : "full";
}

// The command-line mode accepts newline-delimited Git paths and emits a GitHub Actions output.
const invokedScriptUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedScriptUrl) {
  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  const validationTier = classifyValidationTier(input.split(/\r?\n/u));
  process.stdout.write(`validation-tier=${validationTier}\n`);
}
