#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { listDetectedSignals, scanProject } from "../_shared/operational-scan.mjs";

const args = process.argv.slice(2);
const root = valueAfter("--root") || process.cwd();
const force = args.includes("--force");
const docsRoot = valueAfter("--docs-root") || "Docs";
const docs = path.join(root, docsRoot);
const project = scanProject(root);

// --- Knowledge IDs ---

const knowledgeIds = {
  "knowledge.index": "knowledge/README.md",
  "architecture.general": "knowledge/architecture/README.md",
  "features.general": "knowledge/features/README.md",
  "interfaces.general": "knowledge/interfaces/README.md",
  "operations.general": "knowledge/operations/README.md"
};

const viewIds = {
  "human.overview": "human/overview.md",
  "human.setup": "human/setup.md",
  "human.commands": "human/commands.md",
  "human.architecture": "human/architecture.md"
};

for (const doc of project.adaptiveHumanDocs) {
  viewIds[`human.operations.${doc}`] = `human/${doc}.md`;
}

// --- Generate Docs Tree ---

const files = new Map([
  ["README.md", rootReadme(project)],
  ["human/overview.md", humanOverview(project)],
  ["human/setup.md", humanSetup(project)],
  ["human/commands.md", humanCommands(project)],
  ["human/architecture.md", humanArchitecture()],
  ["agent/manifest.json", manifest()],
  ["agent/knowledge-index.json", knowledgeIndex()],
  ["agent/init-scan.md", initScan(project)],
  ["agent/context-map.md", contextMap(project)],
  ["agent/validation.md", validation(project)],
  ["agent/writing-style.md", writingStyle()],
  ["agent/naming.md", naming()],
  ["agent/gaps.md", gaps()],
  ["agent/routes/architecture.json", routeShard(project, "architecture")],
  ["agent/routes/features.json", routeShard(project, "features")],
  ["agent/routes/interfaces.json", routeShard(project, "interfaces")],
  ["agent/routes/operations.json", routeShard(project, "operations")],
  ["knowledge/README.md", knowledgeReadme()],
  ["knowledge/architecture/README.md", architectureReadme()],
  ["knowledge/features/README.md", featuresReadme()],
  ["knowledge/interfaces/README.md", interfacesReadme()],
  ["knowledge/operations/README.md", operationsReadme()],
  ["tmp/README.md", tmpReadme()]
]);

for (const doc of project.adaptiveHumanDocs) {
  files.set(`human/${doc}.md`, adaptiveHumanDoc(project, doc));
}

for (const [relative, content] of files) {
  const file = path.join(docs, relative);
  if (fs.existsSync(file) && !force) continue;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

// --- Generate Repo-Local Skill ---

const skillDir = path.join(root, ".agents", "skills", "project-docdriven");
const skillFile = path.join(skillDir, "SKILL.md");

if (!fs.existsSync(skillFile) || force) {
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(skillFile, renderLocalSkill(project, docsRoot), "utf8");
  console.log(`Wrote ${skillFile}`);
}

console.log(`Created DocDriven tree at ${docs}`);

// --- Helpers ---

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function codeArea(project) {
  const source = project.sourceDirs.find((dir) => dir !== "tests") || project.sourceDirs[0];
  return source ? `${source}/**` : "src/**";
}

function validationKey(project) {
  return project.commands.test !== "not detected" ? "test" : "not detected";
}

function listOrNone(values) {
  return values.length ? values.map((value) => `- ${value}`).join("\n") : "- none detected";
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// --- Knowledge Index ---

function knowledgeIndex() {
  const index = { ...knowledgeIds, ...viewIds };
  return `${JSON.stringify(index, null, 2)}\n`;
}

// --- Manifest ---

function manifest() {
  return `${JSON.stringify({
    schemaVersion: 2,
    docsRoot: "Docs",
    routeIndexes: [
      "agent/routes/architecture.json",
      "agent/routes/features.json",
      "agent/routes/interfaces.json",
      "agent/routes/operations.json"
    ],
    knowledgeIndex: "agent/knowledge-index.json",
    contextMap: "agent/context-map.md",
    gaps: "agent/gaps.md"
  }, null, 2)}\n`;
}

// --- Route Shards (Schema v2) ---

function routeShard(project, area) {
  const routeByArea = {
    architecture: [{
      id: "architecture-general",
      priority: 100,
      taskTypes: [
        "architecture change",
        "dependency direction",
        "runtime flow",
        "code organization",
        "structural ownership",
        "configuration pattern",
        "contract location",
        "coding pattern",
        "component reuse",
        "shared primitive",
        "composition pattern"
      ],
      knowledge: ["architecture.general"],
      codeAreas: [codeArea(project)],
      changeSignals: ["structural ownership", "dependency direction", "import boundaries", "configuration flow", "reuse patterns"],
      validation: [validationKey(project)],
      owner: "unknown"
    }],
    features: [{
      id: "feature-general",
      priority: 100,
      taskTypes: ["feature behavior", "user-visible behavior"],
      knowledge: ["features.general"],
      codeAreas: [codeArea(project)],
      changeSignals: ["user-facing behavior", "feature logic", "business rules"],
      validation: [validationKey(project)],
      owner: "unknown"
    }],
    interfaces: [{
      id: "interface-general",
      priority: 100,
      taskTypes: ["interface change", "api change", "cli change", "integration change"],
      knowledge: ["interfaces.general"],
      codeAreas: [codeArea(project)],
      changeSignals: ["public API", "CLI commands", "integration contracts"],
      validation: [validationKey(project)],
      owner: "unknown"
    }],
    operations: operationsRoutes(project)
  };

  return `${JSON.stringify({
    schemaVersion: 2,
    area,
    routes: routeByArea[area]
  }, null, 2)}\n`;
}

function operationsRoutes(project) {
  const validation = [validationKey(project)];
  const codeAreas = operationCodeAreas(project);
  const base = {
    priority: 100,
    knowledge: ["operations.general"],
    codeAreas,
    validation,
    owner: "unknown"
  };

  if (project.adaptiveHumanDocs.length === 0) {
    return [{
      ...base,
      id: "operations-general",
      taskTypes: ["setup", "config", "operations", "deployment", "validation command"],
      changeSignals: ["environment variables", "configuration files", "deployment targets"]
    }];
  }

  const routes = [{
    ...base,
    id: "operations-setup",
    taskTypes: ["setup", "local setup", "onboarding"],
    changeSignals: ["install steps", "prerequisites", "local development"]
  }];

  const byDoc = {
    environment: { taskTypes: ["environment variable change", "env change", "secret setup"], changeSignals: ["env files", "secrets", "environment variables"] },
    configuration: { taskTypes: ["config file change", "runtime setting", "feature flag"], changeSignals: ["config files", "runtime settings", "feature flags"] },
    services: { taskTypes: ["service dependency change", "external service", "local service"], changeSignals: ["service connections", "external APIs", "docker services"] },
    deployment: { taskTypes: ["deployment change", "release change", "rollback"], changeSignals: ["deploy config", "CI workflows", "release process"] },
    troubleshooting: { taskTypes: ["troubleshooting", "setup failure", "runtime failure"], changeSignals: ["error handling", "health checks", "debugging"] },
    maintenance: { taskTypes: ["maintenance task change", "migration", "seed", "scheduled job"], changeSignals: ["migrations", "cron jobs", "database seeds"] }
  };

  for (const doc of project.adaptiveHumanDocs) {
    const config = byDoc[doc];
    routes.push({
      ...base,
      id: `operations-${doc}`,
      taskTypes: config.taskTypes,
      changeSignals: config.changeSignals
    });
  }

  routes.push({
    ...base,
    id: "operations-validation",
    taskTypes: ["validation command change", "test command change", "build command change"],
    changeSignals: ["test commands", "build commands", "lint configuration"]
  });

  return routes;
}

function operationCodeAreas(project) {
  return project.configFiles.length ? project.configFiles : ["*.config.*"];
}

// --- Context Map ---

function contextMap(project) {
  const rows = [
    `| architecture-general | Architecture, code organization, structural ownership | \`architecture.general\` | ${codeArea(project)} | structural ownership, dependency direction | ${validationKey(project)} | unknown |`,
    `| feature-general | Feature behavior | \`features.general\` | ${codeArea(project)} | user-facing behavior, feature logic | ${validationKey(project)} | unknown |`,
    `| interface-general | Interface, API, CLI change | \`interfaces.general\` | ${codeArea(project)} | public API, integration contracts | ${validationKey(project)} | unknown |`
  ];

  const opRoutes = operationsRoutes(project);
  for (const route of opRoutes) {
    rows.push(`| ${route.id} | ${route.taskTypes.join(", ")} | \`${route.knowledge.join("`, `")}\` | ${route.codeAreas.join(", ")} | ${route.changeSignals.join(", ")} | ${route.validation.join(", ")} | ${route.owner} |`);
  }

  return `# Context Map

Use this table to choose the smallest useful context route.

| Route ID | Task type | Knowledge | Code areas | Change signals | Validation | Owner |
|---|---|---|---|---|---|---|
${rows.join("\n")}
`;
}

// --- Docs Content ---

function rootReadme(project) {
  return `# ${project.name} Docs

DocDriven documentation with knowledge identity and dependency-aware propagation.

## Start Here

- Human orientation: \`human/overview.md\`
- Agent routing: \`agent/context-map.md\`
- Knowledge index: \`agent/knowledge-index.json\`
- Canonical knowledge: \`knowledge/README.md\`
- Temporary work: \`tmp/README.md\`
`;
}

function humanOverview(project) {
  return `---
id: human.overview
type: view
derivedFrom:
  - architecture.general
  - features.general
---
# Overview

${project.name} is a ${project.stack} project.

TODO: Replace this with a short human summary of what the project does and who it serves.
`;
}

function humanSetup(project) {
  const adaptiveLinks = project.adaptiveHumanDocs.length
    ? project.adaptiveHumanDocs.map((doc) => `- \`${doc}.md\`: ${adaptiveDocDescription(doc)}`).join("\n")
    : "- none detected";

  return `---
id: human.setup
type: view
derivedFrom:
  - operations.general
---
# Setup

Stack: ${project.stack}
Package manager: ${project.packageManager}

## Checklist

1. Install project dependencies with the detected package manager.
2. Configure required environment and project settings.
3. Start required services before running the app.
4. Run validation before making changes.

## Required Configuration

${setupConfigurationSummary(project)}

## More Human Docs

${adaptiveLinks}

Detailed operations truth belongs in canonical knowledge → \`operations.general\`.
`;
}

function humanCommands(project) {
  const rows = Object.entries(project.commands)
    .map(([name, command]) => `| ${titleCase(name)} | \`${command}\` |`)
    .join("\n");

  return `---
id: human.commands
type: view
derivedFrom:
  - operations.general
---
# Commands

| Purpose | Command |
|---|---|
${rows}
`;
}

function humanArchitecture() {
  return `---
id: human.architecture
type: view
derivedFrom:
  - architecture.general
---
# Architecture

Architecture is documented as an adaptive contract.

Use this page for the short human summary: the system shape, the major
boundaries, and the rules a contributor should know before changing structure.

Detailed architecture truth belongs in canonical knowledge → \`architecture.general\`.
`;
}

function adaptiveHumanDoc(project, doc) {
  const renderers = {
    environment: humanEnvironment,
    configuration: humanConfiguration,
    services: humanServices,
    deployment: humanDeployment,
    troubleshooting: humanTroubleshooting,
    maintenance: humanMaintenance
  };
  return renderers[doc](project);
}

function humanEnvironment(project) {
  const variables = project.operationalSignals.environment.variables;
  const rows = variables.length
    ? variables.map((v) => `| \`${v.name}\` | ${v.required} | \`${v.localExample || "confirm locally"}\` | ${v.source} | ${v.failureImpact} |`).join("\n")
    : "| `unknown` | unknown | `confirm locally` | inspect manually | Confirm required environment variables. |";

  return `---
id: human.operations.environment
type: view
derivedFrom:
  - operations.general
---
# Environment

Environment variables and secret setup for local development.

| Variable | Required | Local example | Source | Missing impact |
|---|---|---|---|---|
${rows}

Evidence:
${evidenceList(project.operationalSignals.environment)}

Deeper truth belongs in canonical knowledge → \`operations.general\`.
`;
}

function humanConfiguration(project) {
  const rows = project.operationalSignals.configuration.files.length
    ? project.operationalSignals.configuration.files.map((file) => `| \`${file.path}\` | ${file.purpose} |`).join("\n")
    : "| `inspect manually` | Confirm project configuration files. |";

  return `---
id: human.operations.configuration
type: view
derivedFrom:
  - operations.general
---
# Configuration

Project configuration files and runtime settings.

| File | Purpose |
|---|---|
${rows}

Configuration precedence and details belong in canonical knowledge → \`operations.general\`.
`;
}

function humanServices(project) {
  const rows = project.operationalSignals.services.services.length
    ? project.operationalSignals.services.services.map((s) => `| ${s.name} | ${s.source} | ${s.localHint} | ${s.healthHint} |`).join("\n")
    : "| inspect manually | inspect manually | Confirm required services. | Confirm health checks. |";

  return `---
id: human.operations.services
type: view
derivedFrom:
  - operations.general
---
# Services

Required external services, local emulators, and service checks.

| Service | Source | Local hint | Health hint |
|---|---|---|---|
${rows}

Service contracts and details belong in canonical knowledge → \`operations.general\`.
`;
}

function humanDeployment(project) {
  const rows = project.operationalSignals.deployment.targets.length
    ? project.operationalSignals.deployment.targets.map((t) => `| ${t.name} | ${t.source} | \`${t.command}\` |`).join("\n")
    : "| inspect manually | inspect manually | `not detected` |";

  return `---
id: human.operations.deployment
type: view
derivedFrom:
  - operations.general
---
# Deployment

Deploy targets, release commands, and rollback pointers.

| Target | Source | Command |
|---|---|---|
${rows}

Detailed deployment truth belongs in canonical knowledge → \`operations.general\`.
`;
}

function humanTroubleshooting(project) {
  const rows = project.operationalSignals.troubleshooting.checks.length
    ? project.operationalSignals.troubleshooting.checks.map((c) => `| ${c.symptom} | \`${c.check}\` | ${c.source} |`).join("\n")
    : "| Setup or runtime issue | `inspect manually` | generated gap |";

  return `---
id: human.operations.troubleshooting
type: view
derivedFrom:
  - operations.general
---
# Troubleshooting

Common setup and runtime checks.

| Symptom | First check | Source |
|---|---|---|
${rows}

Detailed runbooks belong in canonical knowledge → \`operations.general\`.
`;
}

function humanMaintenance(project) {
  const rows = project.operationalSignals.maintenance.tasks.length
    ? project.operationalSignals.maintenance.tasks.map((t) => `| ${t.name} | \`${t.command}\` | ${t.source} |`).join("\n")
    : "| inspect manually | `not detected` | inspect manually |";

  return `---
id: human.operations.maintenance
type: view
derivedFrom:
  - operations.general
---
# Maintenance

Recurring operational tasks.

| Task | Command | Source |
|---|---|---|
${rows}

Maintenance strategy and ownership belong in canonical knowledge → \`operations.general\`.
`;
}

function setupConfigurationSummary(project) {
  if (project.adaptiveHumanDocs.includes("environment")) {
    return "- Environment variables are documented in `environment.md`.";
  }
  if (project.configFiles.length) {
    return project.configFiles.map((file) => `- Review \`${file}\`.`).join("\n");
  }
  return "- No required configuration files were detected. Confirm setup manually.";
}

function adaptiveDocDescription(doc) {
  const descriptions = {
    environment: "environment variables and secret sources",
    configuration: "config files, flags, and runtime settings",
    services: "external services and local dependencies",
    deployment: "deploy targets and release commands",
    troubleshooting: "common setup and runtime checks",
    maintenance: "recurring operational tasks"
  };
  return descriptions[doc];
}

function evidenceList(signal) {
  return signal.evidence.length ? signal.evidence.map((item) => `- \`${item}\``).join("\n") : "- inspect manually";
}

// --- Knowledge Docs ---

function knowledgeReadme() {
  return `---
id: knowledge.index
type: summary
scope: project
authority: canonical
---
# Knowledge

Knowledge docs contain the canonical explanation of current project truth.

- Architecture: \`architecture.general\` → \`architecture/README.md\`
- Features: \`features.general\` → \`features/README.md\`
- Interfaces: \`interfaces.general\` → \`interfaces/README.md\`
- Operations: \`operations.general\` → \`operations/README.md\`
`;
}

function architectureReadme() {
  return `---
id: architecture.general
type: architecture
scope: architecture
authority: canonical
dependsOn: []
updateWhen:
  - system boundaries change
  - dependency direction changes
  - structural ownership changes
  - configuration flow changes
  - reuse patterns change
---
# Architecture

Architecture docs describe how this project is actually structured. They are an
adaptive contract for long-term project continuity.

## Adaptive Architecture Contract

Document current system shape, boundaries, dependency direction, runtime flow,
and cross-cutting patterns. Add, split, rename, or consolidate structure only
when repository evidence justifies it.

## Project Continuity Rules

- Follow project docs, nearby code, formatter, linter, and validation commands.
- Prefer long-term project consistency over local convenience.
- New durable conventions require docs and route updates.
- If the convention is unclear, record a gap.

## Structural Ownership

Document where authoritative code contracts live: configuration modules, API
contracts, schemas, domain models, provider adapters, shared utilities.

Do not copy type or schema definitions into docs. Explain where code lives,
which module owns it, and when changes require docs updates.

## Configuration First

Runtime configuration should be discoverable through documented paths. Document
where configuration is loaded, validated, and overridden.

## Reuse And Composition

Prefer existing project primitives over new one-off implementations. Keep
feature-local code local until reuse is real.

## Current Structure

Replace this section with verified project structure after inspecting the repository.

## Boundaries And Dependency Direction

Record allowed dependency direction and import boundaries when verified.

## Coding Patterns

Record durable coding patterns that future agents should follow.

## Open Questions

Record uncertain architecture ownership in \`../../agent/gaps.md\`.
`;
}

function featuresReadme() {
  return `---
id: features.general
type: summary
scope: features
authority: canonical
updateWhen:
  - user-visible behavior changes
  - feature boundaries change
---
# Features

Use this folder for user-visible or business-visible capabilities and behavior.
`;
}

function interfacesReadme() {
  return `---
id: interfaces.general
type: summary
scope: interfaces
authority: canonical
updateWhen:
  - public API changes
  - CLI commands change
  - integration contracts change
---
# Interfaces

Use this folder for APIs, CLI commands, events, integrations, and public contracts.
`;
}

function operationsReadme() {
  return `---
id: operations.general
type: summary
scope: operations
authority: canonical
updateWhen:
  - environment variables change
  - deployment targets change
  - service dependencies change
  - maintenance tasks change
---
# Operations

Use this folder for configuration, testing strategy, deployment, troubleshooting,
and maintenance.
`;
}

function tmpReadme() {
  return `# Tmp

Temporary plans, visions, notes, and exploration live here.

Tmp is not truth. Promote stable or implemented facts into \`human/\`, \`agent/\`,
or \`knowledge/\`.
`;
}

// --- Agent Docs ---

function initScan(project) {
  const scripts = Object.entries(project.scripts)
    .map(([name, command]) => `- ${name}: \`${command}\``)
    .join("\n") || "- none detected";

  return `# Init Scan

This scan records detected project dynamics. Verify uncertain items before
treating them as durable project truth.

## Project

- Name: ${project.name}
- Stack: ${project.stack}
- Package manager: ${project.packageManager}

## Frameworks

${listOrNone(project.frameworks)}

## Workspaces

${listOrNone(project.workspaces)}

## Source Dirs

${listOrNone(project.sourceDirs)}

## Config Files

${listOrNone(project.configFiles)}

## Scripts

${scripts}

## Uncertain Items

- Replace generated human and knowledge placeholders.
- Confirm route owners.
- Confirm validation commands marked as not detected.
`;
}

function validation(project) {
  const rows = Object.entries(project.commands)
    .map(([name, command]) => `| ${name} | \`${command}\` |`)
    .join("\n");

  return `# Validation

| Purpose | Command |
|---|---|
${rows}

If a command is not detected, inspect the project before claiming validation passed.
`;
}

function writingStyle() {
  return `# Writing Style

- Use simple language.
- Use short declarative sentences.
- Prefer bullets and tables.
- Link to canonical knowledge IDs instead of copying content.
- Replace stale text instead of appending corrections.
- Include frontmatter on all durable docs.
`;
}

function naming() {
  return `# Naming

- Use lowercase kebab-case file names.
- Use \`README.md\` as a local router for folders.
- Avoid vague names like \`misc.md\`, \`notes.md\`, and \`details.md\` outside \`tmp/\`.
- Name docs after stable concepts, features, interfaces, or operations.
- Knowledge IDs use dot.separated.names matching scope.concept pattern.
`;
}

function gaps() {
  return `# Gaps

Record missing routes, unknown ownership, stale docs, relationship gaps, and docs debt here.

| Gap | Evidence | Next step |
|---|---|---|
`;
}

// --- Repo-Local Skill ---

function renderLocalSkill(project, docsRoot) {
  const docsDir = docsRoot.replace(/\/$/, "");
  const categories = project.knowledgeCategories.map((name) => `- ${name}`).join("\n");
  const commandLines = Object.entries(project.commands)
    .map(([name, command]) => `- ${name}: ${command}`)
    .join("\n");
  const adaptiveLines = project.adaptiveHumanDocs.length
    ? project.adaptiveHumanDocs.map((name) => `- ${name}`).join("\n")
    : "- none detected";
  const signals = listDetectedSignals(project.operationalSignals);
  const signalLines = signals.length
    ? signals.map(({ name, evidence }) => `- ${name}: ${evidence.slice(0, 3).join(", ") || "detected"}`).join("\n")
    : "- none detected";

  return `---
name: project-docdriven
description: Use when working in this repository. Reads the project knowledge graph before code changes and propagates updates through the dependency graph after changes.
---

# Project DocDriven

## Project Shape

- Stack: ${project.stack}
- Package manager: ${project.packageManager}
- Docs root: ${docsDir}/

## Project Dynamics

Frameworks:
${listOrNone(project.frameworks)}

Workspaces:
${listOrNone(project.workspaces)}

Source dirs:
${listOrNone(project.sourceDirs)}

Config files:
${listOrNone(project.configFiles)}

Adaptive human docs:
${adaptiveLines}

Operational signals:
${signalLines}

## Required Workflow

1. Read ${docsDir}/agent/manifest.json.
2. Load the smallest matching route shard.
3. Resolve route \`knowledge\` IDs via knowledge-index.json.
4. Read canonical docs (\`authority: canonical\`) first.
5. Follow \`extends\` and \`includes\` for depth.
6. Change code and docs together.
7. Identify affected knowledge IDs from the change.
8. Propagate: canonical → specializations → views → flag dependents.
9. Run route validation.
10. Record gaps in ${docsDir}/agent/gaps.md.

## Propagation Protocol

After any meaningful change:

1. Determine which knowledge IDs were affected.
2. Update the canonical doc first.
3. Follow \`extends\` → update specializations.
4. Follow \`includes\` → verify parent coherence.
5. Follow \`derivedFrom\` (reverse) → update views.
6. Follow \`dependsOn\` (reverse) → flag for review.

Never update a view before its canonical source. If uncertain, record in gaps.

## Project Continuity

Follow this repository's documented architecture, coding style, configuration
flow, route ownership, and validation commands before applying generic preferences.

Do not invent default folders, architecture styles, or coding conventions. If a
durable convention is unclear, inspect nearby code, choose the smallest locally
consistent change, and record the gap.

Before creating new code, search for reusable project primitives. Keep
feature-local code local until reuse is real.

## Knowledge Categories

${categories}

## Validation

${commandLines}

## Update Protocol

- Behavior changes update the affected canonical knowledge doc, then propagate.
- Architecture changes update \`architecture.general\` and the relevant route shard.
- Operations changes update \`operations.general\` and affected views.
- Route, ownership, or validation changes update manifest and route shards.
- New relationships require updating frontmatter on affected docs.
`;
}
