import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Keep the cross-agent continuation contract present as documentation evolves.
const readRepoFile = name => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
const handoff = readRepoFile("HANDOFF.md");
const sop = readRepoFile("docs/SOP.md");
const readme = readRepoFile("README.md");

test("handoff links every authoritative continuation source", () => {
  for (const required of [
    "docs/IMPLEMENTATION-PLAN.md",
    "docs/ARCHITECTURE.md",
    "docs/ARTIFACT-SECURITY.md",
    "docs/PRD.md",
    "docs/WEBSITE-SPEC.md",
    "docs/SOP.md",
    "docs/ROADMAP.md",
    "https://github.com/collinbediner/Resale-Planning/issues",
    "https://github.com/users/collinbediner/projects/1"
  ]) {
    assert.match(handoff, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("handoff captures the minimum state needed by another agent", () => {
  for (const heading of [
    "Current Project State",
    "Active Work",
    "Completed On This Branch",
    "Next Exact Actions",
    "Known Blockers And Inputs",
    "Validation Evidence",
    "Session-End Handoff Checklist"
  ]) {
    assert.match(handoff, new RegExp(`## ${heading}`));
  }
  assert.match(handoff, /never trust it blindly/i);
  assert.match(handoff, /Codex, Claude, other AI agents, and human collaborators/i);
});

test("SOP requires start, collision, and end controls for every agent", () => {
  assert.match(sop, /Agent And Multi-Machine Handoff Protocol/);
  assert.match(sop, /Required session start/);
  assert.match(sop, /Claiming work without collisions/);
  assert.match(sop, /one active writer branch/i);
  assert.match(sop, /Required session end/);
  assert.match(sop, /current GitHub state wins/i);
});

test("README sends every contributor to the handoff first", () => {
  assert.match(readme, /Starting Any Work Session/);
  assert.match(readme, /begin with \[HANDOFF\.md\]\(HANDOFF\.md\)/i);
});
