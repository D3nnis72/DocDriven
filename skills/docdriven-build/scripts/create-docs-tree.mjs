#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { scanProject } from "../_shared/operational-scan.mjs";

const args = process.argv.slice(2);
const root = valueAfter("--root") || process.cwd();
const force = args.includes("--force");
const docsRoot = valueAfter("--docs-root") || "Docs";
const docs = path.join(root, docsRoot);
const project = scanProject(root);

const files = new Map([
  ["README.md", rootReadme(project)],
  ["human/overview.md", humanOverview(project)],
  ["human/setup.md", humanSetup(project)],
  ["human/commands.md", humanCommands(project)],
  ["human/architecture.md", humanArchitecture()],
  ["agent/manifest.json", manifest(project)],
  ["agent/init-scan.md", initScan(project)],
  ["agent/context-map.md", contextMap(project)],
  ["agent/update-protocol.md", updateProtocol()],
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

console.log(`Created DocDriven tree at ${docs}`);

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function detectProject(rootDir) {
  const pkgPath = path.join(rootDir, "package.json");
  const pyprojectPath = path.join(rootDir, "pyproject.toml");
  const project = {
    name: path.basename(rootDir),
    stack: "Unknown",
    packageManager: "not detected",
    scripts: {},
    frameworks: [],
    workspaces: [],
    sourceDirs: detectExisting(rootDir, ["src", "app", "pages", "packages", "apps", "lib", "tests"]),
    configFiles: detectExisting(rootDir, [
      ".env.example",
      ".env.local",
      "Dockerfile",
      "docker-compose.yml",
      "compose.yml",
      "next.config.js",
      "vite.config.js",
      "tsconfig.json",
      "ruff.toml",
      "pytest.ini",
      ".github/workflows"
    ]),
    commands: {
      test: "not detected",
      build: "not detected",
      lint: "not detected",
      typecheck: "not detected",
      dev: "not detected"
    }
  };

  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const pm = detectJsPackageManager(rootDir);
    const scripts = pkg.scripts || {};
    const dependencies = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
      ...pkg.optionalDependencies
    };
    project.name = pkg.name || project.name;
    project.stack = "JavaScript/Node.js";
    project.packageManager = pm;
    project.scripts = scripts;
    project.frameworks = detectJsFrameworks(dependencies);
    project.workspaces = normalizeWorkspaces(pkg.workspaces);
    project.commands.test = scripts.test ? `${pm} test` : "not detected";
    project.commands.build = scripts.build ? `${pm} run build` : "not detected";
    project.commands.lint = scripts.lint ? `${pm} run lint` : "not detected";
    project.commands.typecheck = scripts.typecheck ? `${pm} run typecheck` : "not detected";
    project.commands.dev = scripts.dev ? `${pm} run dev` : "not detected";
  } else if (fs.existsSync(pyprojectPath)) {
    const pyproject = fs.readFileSync(pyprojectPath, "utf8");
    project.stack = "Python";
    project.packageManager = "python";
    project.frameworks = detectPythonFrameworks(pyproject);
    project.commands.test = pyproject.includes("pytest") ? "pytest" : "pytest if configured; otherwise inspect manually";
    project.commands.build = pyproject.includes("[build-system]") ? "python -m build" : "python -m build if configured; otherwise inspect manually";
    project.commands.lint = pyproject.includes("ruff") ? "ruff check ." : "ruff check . if configured; otherwise inspect manually";
  }

  return project;
}

function detectJsPackageManager(rootDir) {
  if (fs.existsSync(path.join(rootDir, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(rootDir, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(rootDir, "bun.lockb"))) return "bun";
  return "npm";
}

function detectExisting(rootDir, candidates) {
  return candidates.filter((candidate) => fs.existsSync(path.join(rootDir, candidate)));
}

function detectJsFrameworks(dependencies) {
  const known = ["next", "react", "vite", "express", "fastify", "prisma", "@prisma/client", "vue", "svelte", "astro"];
  return known.filter((name) => dependencies && dependencies[name]).map((name) => name.replace(/^@prisma\/client$/, "prisma"));
}

function detectPythonFrameworks(content) {
  return ["fastapi", "django", "flask", "pytest", "ruff"].filter((name) => content.toLowerCase().includes(name));
}

function normalizeWorkspaces(workspaces) {
  if (Array.isArray(workspaces)) return workspaces;
  if (workspaces && Array.isArray(workspaces.packages)) return workspaces.packages;
  return [];
}

function listOrNone(values) {
  return values.length ? values.map((value) => `- ${value}`).join("\n") : "- none detected";
}

function codeArea(project) {
  const source = project.sourceDirs.find((dir) => dir !== "tests") || project.sourceDirs[0];
  return source ? `${source}/**` : "inspect manually";
}

function validationKey(project) {
  return project.commands.test !== "not detected" ? "test" : "not detected";
}

function rootReadme(project) {
  return `# ${project.name} Docs

DocDriven documentation separates human orientation, agent protocol, canonical knowledge, and temporary working material.

## Start Here

- Human orientation: \`human/overview.md\`
- Agent routing: \`agent/context-map.md\`
- Canonical project explanation: \`knowledge/README.md\`
- Temporary work: \`tmp/README.md\`
`;
}

function humanOverview(project) {
  return `# Overview

${project.name} is a ${project.stack} project.

TODO: Replace this with a short human summary of what the project does and who it serves.
`;
}

function humanSetup(project) {
  const adaptiveLinks = project.adaptiveHumanDocs.length
    ? project.adaptiveHumanDocs.map((doc) => `- \`${doc}.md\`: ${adaptiveDocDescription(doc)}`).join("\n")
    : "- none detected";

  return `# Setup

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

Detailed operations truth belongs in \`../knowledge/operations/README.md\`.
`;
}

function humanCommands(project) {
  const rows = Object.entries(project.commands)
    .map(([name, command]) => `| ${titleCase(name)} | \`${command}\` |`)
    .join("\n");

  return `# Commands

| Purpose | Command |
|---|---|
${rows}
`;
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function humanArchitecture() {
  return `# Architecture

Architecture is documented as an adaptive contract.

Use this page for the short human summary: the system shape, the major
boundaries, and the rules a contributor should know before changing structure.

Detailed architecture truth belongs in \`../knowledge/architecture/\`. Do not
copy code contracts here; link to the canonical code and knowledge docs that
explain where contracts live.
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
    ? variables.map((variable) => `| \`${variable.name}\` | ${variable.required} | \`${variable.localExample || "confirm locally"}\` | ${variable.source} | ${variable.failureImpact} |`).join("\n")
    : "| `unknown` | unknown | `confirm locally` | inspect manually | Confirm required environment variables. |";

  return `# Environment

Environment variables and secret setup for local development.

| Variable | Required | Local example | Source | Missing impact |
|---|---|---|---|---|
${rows}

Evidence:
${evidenceList(project.operationalSignals.environment)}

Deeper configuration truth belongs in \`../knowledge/operations/README.md\`.
`;
}

function humanConfiguration(project) {
  const rows = project.operationalSignals.configuration.files.length
    ? project.operationalSignals.configuration.files.map((file) => `| \`${file.path}\` | ${file.purpose} |`).join("\n")
    : "| `inspect manually` | Confirm project configuration files. |";

  return `# Configuration

Project configuration files and runtime settings.

| File | Purpose |
|---|---|
${rows}

Configuration precedence and implementation details belong in \`../knowledge/operations/README.md\`.
`;
}

function humanServices(project) {
  const rows = project.operationalSignals.services.services.length
    ? project.operationalSignals.services.services.map((service) => `| ${service.name} | ${service.source} | ${service.localHint} | ${service.healthHint} |`).join("\n")
    : "| inspect manually | inspect manually | Confirm required services. | Confirm health checks. |";

  return `# Services

Required external services, local emulators, and service checks.

| Service | Source | Local hint | Health hint |
|---|---|---|---|
${rows}

Service contracts and deeper operational details belong in \`../knowledge/operations/README.md\`.
`;
}

function humanDeployment(project) {
  const rows = project.operationalSignals.deployment.targets.length
    ? project.operationalSignals.deployment.targets.map((target) => `| ${target.name} | ${target.source} | \`${target.command}\` |`).join("\n")
    : "| inspect manually | inspect manually | `not detected` |";

  return `# Deployment

Deploy targets, release commands, and rollback pointers.

| Target | Source | Command |
|---|---|---|
${rows}

Run validation before deployment. Rollback and environment-specific behavior belong in \`../knowledge/operations/README.md\`.
`;
}

function humanTroubleshooting(project) {
  const rows = project.operationalSignals.troubleshooting.checks.length
    ? project.operationalSignals.troubleshooting.checks.map((check) => `| ${check.symptom} | \`${check.check}\` | ${check.source} |`).join("\n")
    : "| Setup or runtime issue | `inspect manually` | generated gap |";

  return `# Troubleshooting

Common setup and runtime checks.

| Symptom | First check | Source |
|---|---|---|
${rows}

Keep detailed runbooks and root-cause explanations in \`../knowledge/operations/README.md\`.
`;
}

function humanMaintenance(project) {
  const rows = project.operationalSignals.maintenance.tasks.length
    ? project.operationalSignals.maintenance.tasks.map((task) => `| ${task.name} | \`${task.command}\` | ${task.source} |`).join("\n")
    : "| inspect manually | `not detected` | inspect manually |";

  return `# Maintenance

Recurring operational tasks.

| Task | Command | Source |
|---|---|---|
${rows}

Maintenance strategy, safety notes, and ownership belong in \`../knowledge/operations/README.md\`.
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

function manifest() {
  return `${JSON.stringify({
    schemaVersion: 1,
    docsRoot: "Docs",
    routeIndexes: [
      "agent/routes/architecture.json",
      "agent/routes/features.json",
      "agent/routes/interfaces.json",
      "agent/routes/operations.json"
    ],
    contextMap: "agent/context-map.md",
    gaps: "agent/gaps.md"
  }, null, 2)}\n`;
}

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

function contextMap(project) {
  const operationRows = operationsRoutes(project)
    .map((route) => `| ${route.id} | ${route.taskTypes.join(", ")} | ${route.readFirst.map(tick).join(", ")} | ${route.canonicalDocs.map(tick).join(", ")} | ${route.codeAreas.join(", ")} | ${route.updateDocs.join(", ")} | ${route.validation.join(", ")} | ${route.owner} |`)
    .join("\n");

  return `# Context Map

Use this table to choose the smallest useful context route.

| Route ID | Task type | Read first | Canonical docs | Code areas | Update docs | Validation | Owner |
|---|---|---|---|---|---|---|---|
| architecture-general | Architecture change, code organization, structural ownership, configuration pattern, contract location, coding pattern, component reuse, shared primitive, composition pattern | \`knowledge/architecture/README.md\` | \`knowledge/architecture/README.md\` | ${codeArea(project)} | architecture docs, human architecture if user-facing | ${validationKey(project)} | unknown |
| feature-general | Feature behavior | \`knowledge/features/README.md\` | \`knowledge/features/README.md\` | ${codeArea(project)} | affected feature docs, human overview if needed | ${validationKey(project)} | unknown |
| interface-general | Interface change | \`knowledge/interfaces/README.md\` | \`knowledge/interfaces/README.md\` | ${codeArea(project)} | interface docs and affected feature docs | ${validationKey(project)} | unknown |
${operationRows}
`;
}

function routeShard(project, area) {
  const routeByArea = {
    architecture: {
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
      readFirst: ["knowledge/architecture/README.md"],
      canonicalDocs: ["knowledge/architecture/README.md"],
      codeAreas: [codeArea(project)],
      updateDocs: ["knowledge/architecture/README.md", "human/architecture.md"],
      validation: [validationKey(project)],
      owner: "unknown"
    },
    features: {
      id: "feature-general",
      priority: 100,
      taskTypes: ["feature behavior", "user-visible behavior"],
      readFirst: ["knowledge/features/README.md"],
      canonicalDocs: ["knowledge/features/README.md"],
      codeAreas: [codeArea(project)],
      updateDocs: ["knowledge/features/README.md", "human/overview.md"],
      validation: [validationKey(project)],
      owner: "unknown"
    },
    interfaces: {
      id: "interface-general",
      priority: 100,
      taskTypes: ["interface change", "api change", "cli change", "integration change"],
      readFirst: ["knowledge/interfaces/README.md"],
      canonicalDocs: ["knowledge/interfaces/README.md"],
      codeAreas: [codeArea(project)],
      updateDocs: ["knowledge/interfaces/README.md", "knowledge/features/README.md"],
      validation: [validationKey(project)],
      owner: "unknown"
    },
    operations: {
      routes: operationsRoutes(project)
    }.routes
  };

  const routes = Array.isArray(routeByArea[area]) ? routeByArea[area] : [routeByArea[area]];

  return `${JSON.stringify({
    schemaVersion: 1,
    area,
    routes
  }, null, 2)}\n`;
}

function operationsRoutes(project) {
  const validation = [validationKey(project)];
  const codeAreas = operationCodeAreas(project);
  const base = {
    priority: 100,
    canonicalDocs: ["knowledge/operations/README.md"],
    codeAreas,
    validation,
    owner: "unknown"
  };

  if (project.adaptiveHumanDocs.length === 0) {
    return [{
      ...base,
      id: "operations-general",
      taskTypes: ["setup", "config", "operations", "deployment", "validation command"],
      readFirst: ["human/setup.md"],
      updateDocs: ["knowledge/operations/README.md", "human/setup.md", "human/commands.md", "agent/validation.md"]
    }];
  }

  const routes = [{
    ...base,
    id: "operations-setup",
    taskTypes: ["setup", "local setup", "onboarding"],
    readFirst: ["human/setup.md"],
    updateDocs: ["knowledge/operations/README.md", "human/setup.md", "human/commands.md"]
  }];

  const byDoc = {
    environment: ["environment variable change", "env change", "secret setup"],
    configuration: ["config file change", "runtime setting", "feature flag"],
    services: ["service dependency change", "external service", "local service"],
    deployment: ["deployment change", "release change", "rollback"],
    troubleshooting: ["troubleshooting", "setup failure", "runtime failure"],
    maintenance: ["maintenance task change", "migration", "seed", "scheduled job"]
  };

  for (const doc of project.adaptiveHumanDocs) {
    routes.push({
      ...base,
      id: `operations-${doc}`,
      taskTypes: byDoc[doc],
      readFirst: [`human/${doc}.md`],
      updateDocs: ["knowledge/operations/README.md", "human/setup.md", `human/${doc}.md`]
    });
  }

  routes.push({
    ...base,
    id: "operations-validation",
    taskTypes: ["validation command change", "test command change", "build command change"],
    readFirst: ["agent/validation.md", "human/commands.md"],
    updateDocs: ["agent/validation.md", "human/commands.md", "knowledge/operations/README.md"]
  });

  return routes;
}

function operationCodeAreas(project) {
  return project.configFiles.length ? project.configFiles : ["inspect manually"];
}

function tick(value) {
  return `\`${value}\``;
}

function updateProtocol() {
  return `# Update Protocol

- Behavior changes update affected knowledge docs.
- User-facing setup or command changes update human docs.
- Interface changes update \`knowledge/interfaces/\`.
- Architecture boundary changes update \`knowledge/architecture/\`.
- Structural changes update the architecture route before they become a new convention.
- Do not hardcode generic agent preferences such as default folders, favorite architecture patterns, or personal coding style.
- Follow documented project architecture, coding style, config flow, and route ownership.
- Prefer long-term project consistency over local convenience.
- Prefer existing reusable project primitives before creating one-off implementations.
- Keep feature-local code local until reuse is real.
- Add, split, rename, or consolidate folders and docs only when repository evidence shows stable responsibility, repeated patterns, dependency boundaries, or validation needs.
- When a durable convention is missing, infer from nearby code, choose the smallest consistent change, and record uncertainty in \`agent/gaps.md\`.
- Missing routes go in \`agent/gaps.md\` until fixed.
- Tmp notes are not truth until promoted.
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
- Link to canonical docs instead of copying content.
- Replace stale text instead of appending corrections.
`;
}

function naming() {
  return `# Naming

- Use lowercase kebab-case file names.
- Use \`README.md\` as a local router for folders.
- Avoid vague names like \`misc.md\`, \`notes.md\`, and \`details.md\` outside \`tmp/\`.
- Name docs after stable concepts, features, interfaces, or operations.
`;
}

function gaps() {
  return `# Gaps

Record missing routes, unknown ownership, stale docs, and docs debt here.

| Gap | Evidence | Next step |
|---|---|---|
`;
}

function knowledgeReadme() {
  return `# Knowledge

Knowledge docs contain the canonical explanation of current project truth.

- Architecture: \`architecture/README.md\`
- Features: \`features/README.md\`
- Interfaces: \`interfaces/README.md\`
- Operations: \`operations/README.md\`
`;
}

function architectureReadme() {
  return `# Architecture

Architecture docs describe how this project is actually structured. They are an adaptive contract for long-term project continuity, not a generic folder template.

## Adaptive Architecture Contract

Document current system shape, boundaries, dependency direction, runtime flow, and cross-cutting patterns. Add, split, rename, or consolidate docs and code areas only when repository evidence shows stable responsibility, repeated patterns, dependency boundaries, configuration rules, shared contracts, or validation needs.

Do not invent a standard structure because an agent prefers it.

## Project Continuity Rules

- Follow project docs, nearby code, formatter, linter, and validation commands before applying generic agent taste.
- Prefer long-term project consistency over local convenience.
- New durable conventions require docs and route updates.
- If the convention is unclear, record a gap instead of silently starting a new pattern.

## Structural Ownership

Document where authoritative code contracts and structural concepts live: configuration modules, API contracts, schemas, domain models, provider adapters, shared utilities, generated code, and package boundaries.

Do not copy type, schema, or interface definitions into docs. Explain where authoritative code lives, which module owns it, how consumers access it, and when changes require docs or route updates.

## Configuration First

Runtime configuration should be discoverable through documented project paths. Avoid hardcoded URLs, provider IDs, secrets, feature flags, limits, and other runtime settings in feature code when the project has or needs a config flow.

Document where configuration is loaded, validated, typed if applicable, and overridden by environment or deployment settings. Detailed operational setup belongs in \`../operations/README.md\` or a routed operations doc.

## Reuse And Composition

Prefer existing project primitives over new one-off implementations. Look for reusable components, helpers, hooks, adapters, contracts, config helpers, test helpers, and established composition patterns before creating a new abstraction.

Keep feature-local code local until reuse is real. Promote reusable code only when repeated use, stable responsibility, or a documented composition pattern justifies it. Do not create parallel components or helpers for concepts that already have a project home.

## Current Structure

Replace this section with verified project structure after inspecting the repository.

## Boundaries And Dependency Direction

Record allowed dependency direction and import boundaries when verified.

## Coding Patterns

Record durable coding patterns that future agents should follow. Keep this focused on project-specific conventions, not generic style advice.

## Open Questions

Record uncertain architecture ownership in \`../../agent/gaps.md\` instead of guessing.
`;
}

function featuresReadme() {
  return `# Features

Use this folder for user-visible or business-visible capabilities and behavior.
`;
}

function interfacesReadme() {
  return `# Interfaces

Use this folder for APIs, CLI commands, events, integrations, and public contracts.
`;
}

function operationsReadme() {
  return `# Operations

Use this folder for configuration, testing strategy, deployment, troubleshooting, and maintenance.
`;
}

function tmpReadme() {
  return `# Tmp

Temporary plans, visions, notes, and exploration live here.

Tmp is not truth. Promote stable or implemented facts into \`human/\`, \`agent/\`, or \`knowledge/\`.
`;
}
