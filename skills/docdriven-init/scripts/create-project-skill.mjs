#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { listDetectedSignals, scanProject } from "../_shared/operational-scan.mjs";

const args = process.argv.slice(2);
const root = valueAfter("--root") || process.cwd();
const force = args.includes("--force");
const docsRoot = valueAfter("--docs-root") || "Docs";
const outDir = path.join(root, ".agents", "skills", "project-docdriven");
const outFile = path.join(outDir, "SKILL.md");

const project = scanProject(root);

if (fs.existsSync(outFile) && !force) {
  console.error(`${outFile} already exists. Use --force to overwrite.`);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, renderSkill(project, docsRoot), "utf8");
console.log(`Wrote ${outFile}`);

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function detectProject(rootDir) {
  const pkgPath = path.join(rootDir, "package.json");
  const pyprojectPath = path.join(rootDir, "pyproject.toml");
  const project = {
    stack: "Unknown; inspect manually.",
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
    },
    knowledgeCategories: ["architecture", "features", "interfaces", "operations"]
  };

  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const scripts = pkg.scripts || {};
    const dependencies = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
      ...pkg.optionalDependencies
    };
    project.stack = "JavaScript/Node.js";
    project.packageManager = detectJsPackageManager(rootDir);
    project.scripts = scripts;
    project.frameworks = detectJsFrameworks(dependencies);
    project.workspaces = normalizeWorkspaces(pkg.workspaces);
    project.commands.test = scripts.test ? `${project.packageManager} test` : "not detected";
    project.commands.build = scripts.build ? `${project.packageManager} run build` : "not detected";
    project.commands.lint = scripts.lint ? `${project.packageManager} run lint` : "not detected";
    project.commands.typecheck = scripts.typecheck ? `${project.packageManager} run typecheck` : "not detected";
    project.commands.dev = scripts.dev ? `${project.packageManager} run dev` : "not detected";
  } else if (fs.existsSync(pyprojectPath)) {
    const pyproject = fs.readFileSync(pyprojectPath, "utf8");
    project.stack = "Python";
    project.packageManager = "python";
    project.frameworks = detectPythonFrameworks(pyproject);
    project.commands.test = pyproject.includes("pytest") ? "pytest" : "pytest if configured; otherwise inspect manually";
    project.commands.build = pyproject.includes("[build-system]") ? "python -m build" : "python -m build if configured; otherwise inspect manually";
    project.commands.lint = pyproject.includes("ruff") ? "ruff check ." : "ruff check . if configured; otherwise inspect manually";
  }

  if (
    fs.existsSync(path.join(rootDir, "prisma")) ||
    fs.existsSync(path.join(rootDir, "migrations")) ||
    project.frameworks.includes("prisma")
  ) {
    project.knowledgeCategories.push("data");
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

function commandLines(commands) {
  return Object.entries(commands)
    .map(([name, command]) => `- ${name}: ${command}`)
    .join("\n");
}

function adaptiveDocLines(project) {
  return project.adaptiveHumanDocs.length ? project.adaptiveHumanDocs.map((name) => `- ${name}`).join("\n") : "- none detected";
}

function operationalSignalLines(project) {
  const signals = listDetectedSignals(project.operationalSignals);
  if (signals.length === 0) return "- none detected";
  return signals
    .map(({ name, evidence }) => `- ${name}: ${evidence.slice(0, 3).join(", ") || "detected"}`)
    .join("\n");
}

function renderSkill(project, docsRoot) {
  const docs = docsRoot.replace(/\/$/, "");
  const categories = project.knowledgeCategories.map((name) => `- ${name}`).join("\n");

  return `---
name: project-docdriven
description: Use when working in this repository. Reads the project DocDriven context map before code changes and keeps Docs aligned with implementation.
---

# Project DocDriven

## Project Shape

- Stack: ${project.stack}
- Package manager: ${project.packageManager}
- Docs root: ${docs}/

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
${adaptiveDocLines(project)}

Operational signals:
${operationalSignalLines(project)}

## Required Workflow

1. Read ${docs}/agent/manifest.json if present.
2. Load the smallest matching route shard.
3. Read route \`readFirst\` docs.
4. Inspect route \`codeAreas\`.
5. Update \`updateDocs\` and route shards after meaningful changes.
6. Run route validation.
7. Record gaps in ${docs}/agent/gaps.md.

## Project Continuity

DocDriven is for long-lived projects. Follow this repository's documented
architecture, coding style, configuration flow, route ownership, and validation
commands before applying generic agent preferences.

Do not invent default folders, architecture styles, config patterns, testing
patterns, or coding conventions. If a durable convention is unclear, inspect
nearby code, choose the smallest locally consistent change, and record the gap
in ${docs}/agent/gaps.md.

Architecture, structural ownership, configuration patterns, code organization,
contract locations, component reuse, shared primitives, composition patterns,
and durable coding patterns route through
${docs}/agent/routes/architecture.json and ${docs}/knowledge/architecture/README.md.

Before creating new code, search for reusable components, helpers, hooks, adapters, and project primitives. Extend an existing primitive when that fits the documented pattern. Keep feature-local code local until repeated use or stable responsibility justifies promotion.

Docs must not copy type, schema, or interface definitions from code. They should
explain where authoritative code contracts live, which module owns them, how
consumers access them, and when changes require docs or route updates.

## Knowledge Categories

${categories}

## Validation

${commandLines(project.commands)}

## Update Protocol

- Behavior changes update the affected knowledge docs.
- User-facing changes update human docs when orientation, setup, or commands change.
- Environment, configuration, services, deployment, troubleshooting, and maintenance changes update affected human docs and ${docs}/knowledge/operations/README.md.
- Architecture, structural ownership, configuration patterns, code organization, contract locations, component reuse, shared primitives, composition patterns, and durable coding-pattern changes update ${docs}/knowledge/architecture/README.md and the relevant route shard.
- Routing gaps update ${docs}/agent/context-map.md or ${docs}/agent/gaps.md.
- Route, ownership, code area, and validation changes update ${docs}/agent/manifest.json and route shards.
- Validation command changes update ${docs}/agent/validation.md and ${docs}/human/commands.md.
`;
}
