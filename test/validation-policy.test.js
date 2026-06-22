import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

import { classifyValidationTier } from "../scripts/validation-policy.mjs";

// Read policy artifacts once so the QA assertions verify the complete CI contract.
const readRepoFile = filePath => readFileSync(new URL(`../${filePath}`, import.meta.url), "utf8");
const ciWorkflow = readRepoFile(".github/workflows/ci.yml");
const previewWorkflow = readRepoFile(".github/workflows/preview.yml");
const deployWorkflow = readRepoFile(".github/workflows/deploy.yml");
const stagingWorkflow = readRepoFile(".github/workflows/staging.yml");
const codeqlWorkflow = readRepoFile(".github/workflows/codeql.yml");
const packageManifest = JSON.parse(readRepoFile("package.json"));
const sop = readRepoFile("docs/SOP.md");

test("unit: Markdown documentation receives the lightweight tier", () => {
  assert.equal(classifyValidationTier(["README.md"]), "docs-only");
  assert.equal(
    classifyValidationTier(["HANDOFF.md", "CONTRIBUTING.md", "docs/SOP.md", "docs/guides/RELEASE.md"]),
    "docs-only"
  );
});

test("unit: executable, configuration, asset, and mixed changes require full validation", () => {
  for (const filePath of [
    ".github/workflows/ci.yml",
    "migrations/0003_example.sql",
    "package.json",
    "scripts/build.mjs",
    "server/email-templates.js",
    "site/index.html",
    "site/assets/logo.svg",
    "test/site.test.js",
    "worker/index.js"
  ]) {
    assert.equal(classifyValidationTier([filePath]), "full", filePath);
  }

  assert.equal(classifyValidationTier(["docs/SOP.md", "site/app.js"]), "full");
  assert.equal(classifyValidationTier([]), "full");
});

test("unit: command-line classifier emits the GitHub Actions output", () => {
  // Invoke the same relative script path CI uses so entrypoint regressions cannot silently skip every tier.
  const runClassifier = changedPaths => execFileSync(
    process.execPath,
    ["scripts/validation-policy.mjs"],
    { cwd: new URL("..", import.meta.url), input: `${changedPaths.join("\n")}\n`, encoding: "utf8" }
  );

  assert.equal(runClassifier(["docs/SOP.md"]), "validation-tier=docs-only\n");
  assert.equal(runClassifier(["docs/SOP.md", "site/app.js"]), "validation-tier=full\n");
});

test("QA: CI computes scope safely and runs exactly the selected validation tier", () => {
  assert.match(ciWorkflow, /fetch-depth: 0/);
  assert.match(ciWorkflow, /git diff --name-only --no-renames/);
  assert.match(ciWorkflow, /node scripts\/validation-policy\.mjs/);
  assert.match(ciWorkflow, /validation-tier == 'docs-only'[\s\S]*npm run check:docs/);
  assert.match(ciWorkflow, /validation-tier == 'full'[\s\S]*npm run check/);
  assert.match(ciWorkflow, /Validate Worker environments[\s\S]*validation-tier == 'full'/);
});

test("QA: docs-only changes skip deployments and pull-request CodeQL", () => {
  for (const workflow of [previewWorkflow, deployWorkflow, stagingWorkflow]) {
    assert.match(workflow, /needs\.test\.outputs\.validation-tier == 'full'/);
  }
  assert.match(codeqlWorkflow, /pull_request:[\s\S]*paths-ignore:[\s\S]*docs\/\*\*\/\*\.md/);
});

test("QA: package commands and SOP preserve both validation paths", () => {
  assert.match(packageManifest.scripts["check:docs"], /security:scan/);
  assert.match(packageManifest.scripts["check:docs"], /validation-policy\.test\.js/);
  assert.match(packageManifest.scripts.check, /node --test/);
  assert.match(sop, /Risk-Based Validation/);
  assert.match(sop, /Documentation-only tier/);
  assert.match(sop, /Full tier/);
  assert.match(sop, /When uncertain, use the full tier/);
});
