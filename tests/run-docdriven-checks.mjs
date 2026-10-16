#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");

testGeneratedArchitectureContract();
testGeneratedProjectSkillContinuityRules();
testAuditFlagsWeakArchitectureDocs();
testAuditFlagsUndocumentedReusePatterns();
testAuditFlagsHeadingNumberingAfterSplit();
testAuditFlagsFileNames();
testCheckFrontmatter();
testCheckGraph();
testCheckImpact();

console.log("DocDriven regression checks passed.");

function testGeneratedArchitectureContract() {
  const root = makeTempProject("generated-architecture");
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
    name: "generated-architecture",
    scripts: { test: "node -e \"process.exit(0)\"" },
    dependencies: {}
  }, null, 2));
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(path.join(root, "src", "index.js"), "export const ok = true;\n");

  execFileSync("node", [path.join(repoRoot, "skills/docdriven-setup/scripts/setup-docdriven.mjs"), "--root", root], {
    cwd: repoRoot,
    stdio: "pipe"
  });

  const architecture = read(root, "Docs/knowledge/architecture/README.md");
  assert.match(architecture, /Adaptive Architecture Contract/);
  assert.match(architecture, /Project Continuity Rules/);
  assert.match(architecture, /Structural Ownership/);
  assert.match(architecture, /Configuration First/);
  assert.match(architecture, /Reuse And Composition/);
  assert.match(architecture, /Do not copy type or schema definitions into docs/);
  assert.match(architecture, /Prefer existing project primitives over new one-off implementations/);

  // Check frontmatter
  assert.match(architecture, /^---\n/);
  assert.match(architecture, /id: architecture\.general/);
  assert.match(architecture, /authority: canonical/);

  const humanArchitecture = read(root, "Docs/human/architecture.md");
  assert.match(humanArchitecture, /Architecture is documented as an adaptive contract/);
  assert.match(humanArchitecture, /id: human\.architecture/);
  assert.match(humanArchitecture, /type: view/);
  assert.match(humanArchitecture, /derivedFrom/);

  // Route schema v2
  const route = JSON.parse(read(root, "Docs/agent/routes/architecture.json"));
  assert.equal(route.schemaVersion, 2);
  const taskTypes = route.routes.flatMap((entry) => entry.taskTypes);
  assert.ok(taskTypes.includes("code organization"));
  assert.ok(taskTypes.includes("structural ownership"));
  assert.ok(taskTypes.includes("configuration pattern"));
  assert.ok(taskTypes.includes("contract location"));
  assert.ok(taskTypes.includes("coding pattern"));
  assert.ok(taskTypes.includes("component reuse"));
  assert.ok(taskTypes.includes("shared primitive"));
  assert.ok(taskTypes.includes("composition pattern"));

  // Routes use knowledge IDs, not paths
  const archRoute = route.routes[0];
  assert.ok(archRoute.knowledge, "Route should have knowledge array");
  assert.ok(archRoute.knowledge.includes("architecture.general"));
  assert.ok(archRoute.changeSignals, "Route should have changeSignals");
  assert.ok(!archRoute.readFirst, "Route should not have readFirst (schema v1)");
  assert.ok(!archRoute.canonicalDocs, "Route should not have canonicalDocs (schema v1)");
  assert.ok(!archRoute.updateDocs, "Route should not have updateDocs (schema v1)");

  // Knowledge index
  const knowledgeIndex = JSON.parse(read(root, "Docs/agent/knowledge-index.json"));
  assert.ok(knowledgeIndex["architecture.general"]);
  assert.ok(knowledgeIndex["features.general"]);

  // Manifest v2
  const manifest = JSON.parse(read(root, "Docs/agent/manifest.json"));
  assert.equal(manifest.schemaVersion, 2);
  assert.ok(manifest.knowledgeIndex);
}

function testGeneratedProjectSkillContinuityRules() {
  const root = makeTempProject("project-skill-continuity");
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
    name: "project-skill-continuity",
    scripts: { test: "node -e \"process.exit(0)\"" },
    dependencies: {}
  }, null, 2));
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(path.join(root, "src", "index.js"), "export const ok = true;\n");

  execFileSync("node", [path.join(repoRoot, "skills/docdriven-setup/scripts/setup-docdriven.mjs"), "--root", root], {
    cwd: repoRoot,
    stdio: "pipe"
  });

  const skill = read(root, ".agents/skills/project-docdriven/SKILL.md");
  assert.match(skill, /Project Continuity/);
  assert.match(skill, /Do not invent default folders/);
  assert.match(skill, /reusable project primitives/);
  // Schema v2 workflow
  assert.match(skill, /knowledge/);
  assert.match(skill, /Propagate/i);
  assert.match(skill, /knowledge-index/);
}

function testAuditFlagsWeakArchitectureDocs() {
  const root = makeTempProject("weak-architecture");
  fs.mkdirSync(path.join(root, "Docs/knowledge/architecture"), { recursive: true });
  fs.mkdirSync(path.join(root, "Docs/human"), { recursive: true });
  fs.writeFileSync(path.join(root, "Docs/knowledge/architecture/README.md"), "# Architecture\n\nUse this folder for system shape.\n");
  fs.writeFileSync(path.join(root, "Docs/human/architecture.md"), "# Architecture\n\nArchitecture summary.\n");

  const result = spawnSync("node", [
    path.join(repoRoot, "skills/docdriven-audit/scripts/audit-docdriven.mjs"),
    "--root",
    root,
    "--format",
    "json"
  ], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  const output = JSON.parse(result.stdout);
  assert.ok(
    output.findings.some((finding) => finding.code === "weak-architecture-contract"),
    "expected audit to report weak-architecture-contract"
  );
}

function testAuditFlagsUndocumentedReusePatterns() {
  const root = makeTempProject("undocumented-reuse");
  fs.mkdirSync(path.join(root, "Docs/knowledge/architecture"), { recursive: true });
  fs.mkdirSync(path.join(root, "src/components"), { recursive: true });
  fs.writeFileSync(path.join(root, "src/components/Button.js"), "export const Button = () => null;\n");
  fs.writeFileSync(path.join(root, "Docs/knowledge/architecture/README.md"), [
    "# Architecture",
    "",
    "## Adaptive Architecture Contract",
    "",
    "Document current structure.",
    "",
    "## Project Continuity Rules",
    "",
    "Follow project conventions.",
    "",
    "## Structural Ownership",
    "",
    "Document ownership.",
    "",
    "## Configuration First",
    "",
    "Document configuration."
  ].join("\n"));

  const result = spawnSync("node", [
    path.join(repoRoot, "skills/docdriven-audit/scripts/audit-docdriven.mjs"),
    "--root",
    root,
    "--format",
    "json"
  ], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  const output = JSON.parse(result.stdout);
  assert.ok(
    output.findings.some((finding) => finding.code === "undocumented-reuse-pattern"),
    "expected audit to report undocumented-reuse-pattern"
  );
}

function testAuditFlagsHeadingNumberingAfterSplit() {
  const root = makeTempProject("heading-numbering");
  const dir = path.join(root, "Docs/knowledge/features/pricing");
  fs.mkdirSync(dir, { recursive: true });
  const leaf = (id, headings, extra = "") => [
    "---",
    `id: ${id}`,
    "type: rule",
    "authority: canonical",
    "---",
    `# ${id}`,
    ...headings.flatMap((heading) => ["", heading, "", "Text."]),
    extra
  ].join("\n");

  // The three leaves of a split monolith: one starts at 7, one at 3, one clean.
  fs.writeFileSync(path.join(dir, "rules.md"), leaf("features.pricing.rules", ["## 7. Rules", "## 8. Exceptions"]));
  fs.writeFileSync(path.join(dir, "tiers.md"), leaf("features.pricing.tiers", ["## 3. Tiers"], "See point 4 for limits."));
  fs.writeFileSync(path.join(dir, "billing.md"), leaf("features.pricing.billing", ["## Billing", "## Invoices"], "A paragraph about 3 principles."));

  const findings = auditJson(root);
  const forFile = (code, name) => findings.filter((f) => f.code === code && f.file.endsWith(name));
  assert.equal(forFile("heading-numbering", "rules.md").length, 1, "expected rules.md (7, 8) to be flagged");
  assert.equal(forFile("heading-numbering", "tiers.md").length, 1, "expected tiers.md (3) to be flagged");
  assert.equal(forFile("positional-reference", "tiers.md").length, 1, "expected 'point 4' to be flagged");
  assert.equal(forFile("heading-numbering", "billing.md").length, 0, "unnumbered headings must pass");
  assert.equal(forFile("positional-reference", "billing.md").length, 0, "'3 principles' is not a positional reference");

  // Clean 1..n numbering is fine in a procedure, a nudge elsewhere.
  fs.writeFileSync(path.join(dir, "runbook.md"), [
    "---", "id: features.pricing.runbook", "type: procedure", "authority: canonical", "---",
    "# Runbook", "", "## 1. Prepare", "", "Text.", "", "## 2. Run", "", "Text."
  ].join("\n"));
  fs.writeFileSync(path.join(dir, "ordered.md"), [
    "---", "id: features.pricing.ordered", "type: rule", "authority: canonical", "---",
    "# Ordered", "", "## 1. First", "", "Text.", "", "## 2. Second", "", "Text."
  ].join("\n"));
  const again = auditJson(root);
  assert.ok(!again.some((f) => f.file.endsWith("runbook.md") && /numbering|numbered/.test(f.code)), "procedure steps 1..n must pass");
  assert.ok(again.some((f) => f.file.endsWith("ordered.md") && f.code === "numbered-headings"), "numbered headings in a rule doc get a nudge");
}

function testAuditFlagsFileNames() {
  const root = makeTempProject("file-names");
  const dir = path.join(root, "Docs/knowledge/features/pricing");
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(root, "Docs/tmp/splits"), { recursive: true });
  fs.mkdirSync(path.join(root, "Docs/knowledge/features/01-intro"), { recursive: true });
  const body = "# Doc\n\nText.\n";
  for (const name of [
    "pricing-rules.md", // fine
    "2026-10-16-churn-analysis.md", // dated report, fine
    "postgres-15.md", // version, no sibling, fine
    "Pricing_Tiers.md", // case and underscore
    "03-billing.md", // order prefix
    "rules-part-2.md", // position
    "rules-final.md", // revision
    "tiers.md",
    "tiers-2.md", // numbered copy of sibling
    "notes.md" // vague
  ]) fs.writeFileSync(path.join(dir, name), body);
  fs.writeFileSync(path.join(dir, "README.md"), body);
  fs.writeFileSync(path.join(root, "Docs/knowledge/features/01-intro/overview.md"), body);
  fs.writeFileSync(path.join(root, "Docs/tmp/splits/2026-10-16-Some_Plan.md"), body);

  const findings = auditJson(root);
  const flagged = new Map(findings.filter((f) => /file-name$/.test(f.code)).map((f) => [path.basename(f.file), f.code]));
  assert.equal(flagged.get("Pricing_Tiers.md"), "invalid-file-name");
  assert.equal(flagged.get("03-billing.md"), "ordinal-file-name");
  assert.equal(flagged.get("rules-part-2.md"), "ordinal-file-name");
  assert.equal(flagged.get("rules-final.md"), "ordinal-file-name");
  assert.equal(flagged.get("tiers-2.md"), "ordinal-file-name");
  assert.equal(flagged.get("notes.md"), "vague-file-name");
  assert.equal(flagged.get("01-intro"), "ordinal-file-name", "folders are checked once");
  for (const fine of ["pricing-rules.md", "2026-10-16-churn-analysis.md", "postgres-15.md", "tiers.md", "README.md", "overview.md", "2026-10-16-Some_Plan.md"]) {
    assert.ok(!flagged.has(fine), `${fine} must not be flagged`);
  }
}

function auditJson(root) {
  const result = spawnSync("node", [
    path.join(repoRoot, "skills/docdriven-audit/scripts/audit-docdriven.mjs"),
    "--root",
    root,
    "--format",
    "json"
  ], { cwd: repoRoot, encoding: "utf8" });
  return JSON.parse(result.stdout).findings;
}

function testCheckFrontmatter() {
  const root = makeTempProject("check-frontmatter");
  fs.mkdirSync(path.join(root, "Docs/knowledge/test"), { recursive: true });
  fs.mkdirSync(path.join(root, "Docs/agent"), { recursive: true });

  // Valid doc
  fs.writeFileSync(path.join(root, "Docs/knowledge/test/valid.md"), [
    "---",
    "id: test.valid",
    "type: rule",
    "authority: canonical",
    "---",
    "# Valid Doc"
  ].join("\n"));

  // Missing frontmatter
  fs.writeFileSync(path.join(root, "Docs/knowledge/test/missing.md"), "# Missing Frontmatter\n");

  // Knowledge index
  fs.writeFileSync(path.join(root, "Docs/agent/knowledge-index.json"), JSON.stringify({
    "test.valid": "knowledge/test/valid.md"
  }, null, 2));

  const result = spawnSync("node", [
    path.join(repoRoot, "skills/docdriven-audit/scripts/check-frontmatter.mjs"),
    "--root",
    root,
    "--format",
    "json"
  ], { encoding: "utf8" });

  const output = JSON.parse(result.stdout);
  assert.ok(
    output.findings.some((f) => f.code === "missing-frontmatter"),
    "expected check-frontmatter to flag missing frontmatter"
  );
}

function testCheckGraph() {
  const root = makeTempProject("check-graph");
  fs.mkdirSync(path.join(root, "Docs/knowledge/base"), { recursive: true });
  fs.mkdirSync(path.join(root, "Docs/human"), { recursive: true });
  fs.mkdirSync(path.join(root, "Docs/agent/routes"), { recursive: true });

  // Base doc that includes child
  fs.writeFileSync(path.join(root, "Docs/knowledge/base/main.md"), [
    "---",
    "id: base.main",
    "type: architecture",
    "authority: canonical",
    "includes:",
    "  - base.child",
    "---",
    "# Main"
  ].join("\n"));

  // Child doc that extends base — bidirectional consistency
  fs.writeFileSync(path.join(root, "Docs/knowledge/base/child.md"), [
    "---",
    "id: base.child",
    "type: procedure",
    "authority: canonical",
    "extends: base.main",
    "---",
    "# Child"
  ].join("\n"));

  // View derived from non-canonical — should error
  fs.writeFileSync(path.join(root, "Docs/human/bad-view.md"), [
    "---",
    "id: human.bad",
    "type: view",
    "derivedFrom:",
    "  - nonexistent.doc",
    "---",
    "# Bad View"
  ].join("\n"));

  // Manifest and route for orphan check
  fs.writeFileSync(path.join(root, "Docs/agent/manifest.json"), JSON.stringify({
    schemaVersion: 2,
    docsRoot: "Docs",
    routeIndexes: ["agent/routes/test.json"],
    knowledgeIndex: "agent/knowledge-index.json"
  }, null, 2));
  fs.writeFileSync(path.join(root, "Docs/agent/routes/test.json"), JSON.stringify({
    schemaVersion: 2,
    area: "test",
    routes: [{ id: "test", priority: 100, taskTypes: ["test"], knowledge: ["base.main"], codeAreas: ["src/**"], validation: ["test"], owner: "unknown" }]
  }, null, 2));

  const result = spawnSync("node", [
    path.join(repoRoot, "skills/docdriven-audit/scripts/check-graph.mjs"),
    "--root",
    root,
    "--format",
    "json"
  ], { encoding: "utf8" });

  const output = JSON.parse(result.stdout);
  assert.ok(
    output.findings.some((f) => f.code === "dangling-derivedFrom"),
    "expected check-graph to flag dangling derivedFrom"
  );
}

function testCheckImpact() {
  const root = makeTempProject("check-impact");
  fs.mkdirSync(path.join(root, "Docs/knowledge/system"), { recursive: true });
  fs.mkdirSync(path.join(root, "Docs/human"), { recursive: true });

  // Parent
  fs.writeFileSync(path.join(root, "Docs/knowledge/system/core.md"), [
    "---",
    "id: system.core",
    "type: architecture",
    "authority: canonical",
    "includes:",
    "  - system.auth",
    "---",
    "# Core"
  ].join("\n"));

  // Child extending parent
  fs.writeFileSync(path.join(root, "Docs/knowledge/system/auth.md"), [
    "---",
    "id: system.auth",
    "type: procedure",
    "authority: canonical",
    "extends: system.core",
    "---",
    "# Auth"
  ].join("\n"));

  // View derived from core
  fs.writeFileSync(path.join(root, "Docs/human/overview.md"), [
    "---",
    "id: human.overview",
    "type: view",
    "derivedFrom:",
    "  - system.core",
    "---",
    "# Overview"
  ].join("\n"));

  const result = spawnSync("node", [
    path.join(repoRoot, "skills/docdriven-audit/scripts/check-impact.mjs"),
    "--root",
    root,
    "--changed",
    "system.core",
    "--format",
    "json"
  ], { encoding: "utf8" });

  const output = JSON.parse(result.stdout);
  assert.equal(output.changed, "system.core");
  assert.ok(output.specializations.some((s) => s.id === "system.auth"), "expected system.auth as specialization");
  assert.ok(output.views.some((v) => v.id === "human.overview"), "expected human.overview as view");
  assert.equal(output.totalAffected, 2);
}

function makeTempProject(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
}

function read(root, relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}
