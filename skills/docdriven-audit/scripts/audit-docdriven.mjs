#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { inferProjectType, scanProject } from "../_shared/operational-scan.mjs";

const args = process.argv.slice(2);
const root = valueAfter("--root") || process.cwd();
const format = valueAfter("--format") || "text";
const docsRoot = valueAfter("--docs-root") || "Docs";
const docs = path.join(root, docsRoot);
const project = scanProject(root);

const workspaceRequiredFiles = [
  "README.md",
  "agent/context-map.md",
  "agent/gaps.md",
  "agent/knowledge-index.json"
];

const appRequiredFiles = [
  ...workspaceRequiredFiles,
  "human/overview.md",
  "human/setup.md",
  "human/commands.md",
  "human/architecture.md",
  "agent/validation.md",
  "agent/writing-style.md",
  "agent/naming.md",
  "knowledge/README.md",
  "knowledge/architecture/README.md",
  "knowledge/features/README.md",
  "knowledge/interfaces/README.md",
  "knowledge/operations/README.md",
  "tmp/README.md"
];

const manifestSettings = readManifestSettings();
const projectType = manifestSettings.projectType || inferProjectType(project);
const requiredFiles = manifestSettings.requiredDocs || (projectType === "app" ? appRequiredFiles : workspaceRequiredFiles);

const canvasMaxWords = 1500;
const leafLimit = 6;
const sizeExceptionCeiling = 6000;

const requiredColumns = [
  "Task type",
  "Knowledge",
  "Code areas",
  "Change signals",
  "Validation",
  "Owner"
];

const sizeTargets = [
  { pattern: /\/human\//, maxWords: 700, type: "human" },
  { pattern: /\/agent\//, maxWords: 500, type: "agent" },
  { pattern: /\/knowledge\//, maxWords: 1500, type: "knowledge" },
  { pattern: /(^|\/)README\.md$/, maxWords: 250, type: "router" }
];

const vagueNames = new Set(["misc", "notes", "details", "other", "stuff", "scratch", "untitled"]);
const leftoverNameTokens = new Set(["copy", "final", "old", "backup", "draft"]);
const genericNames = new Set([
  "analysis", "cases", "config", "configuration", "data", "files", "findings", "flow", "general",
  "history", "info", "invoice", "invoices", "linking", "model", "models", "overview", "pipeline",
  "pricing", "process", "project", "quality", "requirements", "results", "rules", "scope", "sources",
  "status", "summary", "terms", "types"
]);

const findings = [];

checkRequiredFiles();
const routeGraph = checkManifest();
checkContextMap();
checkSizes();
checkFileNames();
checkKnowledgeNames();
checkKnowledgeFolders();
checkHeadings();
checkTmp();
checkCanvases();
checkOwnedCodeMarkers();
if (routeGraph) {
  checkRouteGraph(routeGraph);
  checkContextMapRouteIds(routeGraph);
  checkOrphanKnowledgeDocs(routeGraph);
  if (projectType === "app") checkAdaptiveHumanDocs(routeGraph);
}
checkPlaceholders();
checkArchitectureContract();

if (format === "json") {
  console.log(JSON.stringify({ findings }, null, 2));
} else {
  printText(findings);
}

process.exit(findings.some((finding) => finding.severity === "error") ? 1 : 0);

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function readManifestSettings() {
  try {
    const manifest = readJson(path.join(docs, "agent", "manifest.json"));
    return {
      projectType: typeof manifest.projectType === "string" ? manifest.projectType : undefined,
      requiredDocs: Array.isArray(manifest.requiredDocs) ? manifest.requiredDocs : undefined
    };
  } catch {
    return {};
  }
}

function checkRequiredFiles() {
  for (const relative of requiredFiles) {
    const file = path.join(docs, relative);
    if (!fs.existsSync(file)) {
      findings.push({
        severity: "error",
        code: "missing-required-file",
        file: path.relative(root, file),
        message: `Required DocDriven file is missing for projectType ${projectType}${manifestSettings.requiredDocs ? " (manifest requiredDocs)" : ""}.`
      });
    }
  }
}

function checkManifest() {
  const file = path.join(docs, "agent", "manifest.json");
  if (!fs.existsSync(file)) {
    findings.push({
      severity: "warning",
      code: "missing-manifest",
      file: path.relative(root, file),
      message: "Route graph manifest is missing."
    });
    return null;
  }

  let manifest;
  try {
    manifest = readJson(file);
  } catch (error) {
    findings.push({
      severity: "error",
      code: "invalid-manifest-json",
      file: path.relative(root, file),
      message: `Manifest JSON is invalid: ${error.message}`
    });
    return null;
  }

  if (manifest.schemaVersion !== 2) {
    findings.push({
      severity: "warning",
      code: "old-schema-version",
      file: path.relative(root, file),
      message: `Manifest uses schema version ${manifest.schemaVersion}; expected 2.`
    });
  }

  if (!Array.isArray(manifest.routeIndexes) || manifest.routeIndexes.length === 0) {
    findings.push({
      severity: "error",
      code: "missing-route-indexes",
      file: path.relative(root, file),
      message: "Manifest must define a non-empty routeIndexes array."
    });
    return null;
  }

  const shards = [];
  for (const relative of manifest.routeIndexes) {
    const shardFile = docsPath(relative);
    if (!fs.existsSync(shardFile)) {
      findings.push({
        severity: "error",
        code: "missing-route-shard",
        file: path.relative(root, shardFile),
        message: `Manifest references a missing route shard: ${relative}.`
      });
      continue;
    }
    try {
      shards.push({ file: shardFile, relative, data: readJson(shardFile) });
    } catch (error) {
      findings.push({
        severity: "error",
        code: "invalid-route-shard-json",
        file: path.relative(root, shardFile),
        message: `Route shard JSON is invalid: ${error.message}`
      });
    }
  }

  return { manifest, shards };
}

function checkContextMap() {
  const file = path.join(docs, "agent", "context-map.md");
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, "utf8");
  const header = content
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith("| Route ID |") || line.trim().startsWith("| Task type |"));
  if (!header) {
    findings.push({
      severity: "error",
      code: "missing-route-table",
      file: path.relative(root, file),
      message: "Context map must contain a route table header."
    });
    return;
  }
  for (const column of requiredColumns) {
    if (!header.includes(column)) {
      findings.push({
        severity: "error",
        code: "missing-route-column",
        file: path.relative(root, file),
        message: `Context map is missing required column: ${column}.`
      });
    }
  }
  if (!header.includes("Route ID")) {
    findings.push({
      severity: "warning",
      code: "missing-route-id-column",
      file: path.relative(root, file),
      message: "Context map should include a Route ID column."
    });
  }
}

function checkRouteGraph(routeGraph) {
  const ids = new Map();
  for (const shard of routeGraph.shards) {
    const lineCount = fs.readFileSync(shard.file, "utf8").split(/\r?\n/).length;
    if (lineCount > 500) {
      findings.push({
        severity: "warning",
        code: "oversized-route-shard",
        file: path.relative(root, shard.file),
        message: `Route shard has ${lineCount} lines; split shards above 500 lines.`
      });
    }

    if (!Array.isArray(shard.data.routes)) {
      findings.push({
        severity: "error",
        code: "missing-routes-array",
        file: path.relative(root, shard.file),
        message: "Route shard must define a routes array."
      });
      continue;
    }

    for (const route of shard.data.routes) {
      checkRouteSchema(route, shard.file);
      if (!route || !route.id) continue;
      if (ids.has(route.id)) {
        findings.push({
          severity: "error",
          code: "duplicate-route-id",
          file: path.relative(root, shard.file),
          message: `Route ID is duplicated: ${route.id}. First seen in ${ids.get(route.id)}.`
        });
      } else {
        ids.set(route.id, path.relative(root, shard.file));
      }
      checkRouteKnowledge(route, shard.file);
      checkRouteCodeAreas(route, shard.file);
      checkRouteValidation(route, shard.file);
    }
  }
}

function checkRouteSchema(route, file) {
  const required = ["id", "knowledge", "codeAreas", "validation", "owner"];
  if (!route || typeof route !== "object") {
    findings.push({
      severity: "error",
      code: "invalid-route",
      file: path.relative(root, file),
      message: "Route entries must be objects."
    });
    return;
  }
  for (const key of required) {
    if (!(key in route)) {
      findings.push({
        severity: "error",
        code: "missing-route-field",
        file: path.relative(root, file),
        message: `Route ${route.id || "(missing id)"} is missing required field: ${key}.`
      });
    }
  }
  if (typeof route.priority !== "number") {
    findings.push({
      severity: "error",
      code: "invalid-route-priority",
      file: path.relative(root, file),
      message: `Route ${route.id || "(missing id)"} must define numeric priority.`
    });
  }
}

function checkRouteKnowledge(route, file) {
  const indexFile = path.join(docs, "agent", "knowledge-index.json");
  let index = null;
  if (fs.existsSync(indexFile)) {
    try { index = readJson(indexFile); } catch { /* skip */ }
  }

  for (const kid of arrayValue(route.knowledge)) {
    // Try to resolve via index
    if (index && index[kid]) {
      const resolved = docsPath(index[kid]);
      if (!fs.existsSync(resolved)) {
        findings.push({
          severity: "error",
          code: "knowledge-file-missing",
          file: path.relative(root, file),
          message: `Route ${route.id} knowledge ID ${kid} resolves to missing file: ${index[kid]}.`
        });
      }
      continue;
    }

    // Try convention: scope.concept -> knowledge/scope/concept.md
    const parts = kid.split(".");
    if (parts.length >= 2) {
      const conventionPath = `knowledge/${parts.slice(0, -1).join("/")}/${parts[parts.length - 1]}.md`;
      const readmePath = `knowledge/${parts.join("/")}/README.md`;
      if (!fs.existsSync(docsPath(conventionPath)) && !fs.existsSync(docsPath(readmePath))) {
        // Also try knowledge/{first}/README.md for {first}.general pattern
        const generalPath = `knowledge/${parts[0]}/README.md`;
        if (!fs.existsSync(docsPath(generalPath))) {
          findings.push({
            severity: "warning",
            code: "knowledge-unresolved",
            file: path.relative(root, file),
            message: `Route ${route.id} knowledge ID ${kid} cannot be resolved by index or convention.`
          });
        }
      }
    }
  }
}

function checkRouteCodeAreas(route, file) {
  for (const area of arrayValue(route.codeAreas)) {
    const value = stripTicks(area);
    if (isLooseValue(value)) continue;
    if (matchRepoPaths(value).length === 0) {
      findings.push({
        severity: "warning",
        code: "unmatched-code-area",
        file: path.relative(root, file),
        message: `Route ${route.id} code area matches no files: ${value}.`
      });
    }
  }
}

function checkRouteValidation(route, file) {
  const values = arrayValue(route.validation);
  const nonTemporary = !(arrayValue(route.taskTypes).join(" ").toLowerCase().includes("temporary"));
  if (values.length === 0 && nonTemporary) {
    findings.push({
      severity: "warning",
      code: "missing-validation",
      file: path.relative(root, file),
      message: `Route ${route.id} has no validation evidence.`
    });
  }
  for (const value of values) {
    const normalized = String(value).toLowerCase();
    if (nonTemporary && (!normalized || normalized === "none" || normalized.includes("not detected"))) {
      findings.push({
        severity: "warning",
        code: "weak-validation",
        file: path.relative(root, file),
        message: `Route ${route.id} has weak validation: ${value}.`
      });
    }
  }
}

function extractH2Sections(content) {
  const sections = [];
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^##\s+(.+)$/);
    if (match) sections.push(match[1].trim());
  }
  return sections;
}

function oversizedKnowledgeFinding({ relative, words, maxWords, content }) {
  const h2Sections = extractH2Sections(content);
  const frontmatter = parseFrontmatter(content) || {};
  const revisit = arrayValue(frontmatter.revisitWhen).filter(Boolean);
  if (words > 3000 && frontmatter.sizeException && revisit.length > 0) {
    const overCeiling = words > sizeExceptionCeiling;
    return {
      severity: overCeiling ? "error" : "warning",
      code: overCeiling ? "size-exception-over-ceiling" : "size-exception",
      file: relative,
      words,
      maxWords: sizeExceptionCeiling,
      suggestedAction: overCeiling ? "split-required" : "revisit",
      h2Sections,
      message: overCeiling
        ? `Size exception (${frontmatter.sizeException}) has ${words} words; the ceiling is ${sizeExceptionCeiling}. Split it by date, question, period, or source.`
        : `Kept size exception (${frontmatter.sizeException}, ${words} words). Revisit when: ${revisit.join("; ")}.`
    };
  }
  const severity = words > 3000 ? "error" : "warning";
  const suggestedAction = words > 3000 ? "split-required" : "split-review-required";
  const band =
    words > 3000
      ? "over 3000 words (split by default)"
      : "1500-3000 words (review required)";

  const sectionHint =
    h2Sections.length > 0
      ? ` H2 sections: ${h2Sections.slice(0, 12).join("; ")}${h2Sections.length > 12 ? "; …" : ""}.`
      : "";

  return {
    severity,
    code: "oversized-doc",
    file: relative,
    words,
    maxWords,
    suggestedAction,
    h2Sections,
    message: `knowledge doc has ${words} words; ${band}. suggestedAction: ${suggestedAction}.${sectionHint}`
  };
}

function checkSizes() {
  for (const file of markdownFiles(docs)) {
    const relative = path.relative(root, file);
    const normalized = relative.split(path.sep).join("/");
    if (isCanvas(file)) continue;
    const content = fs.readFileSync(file, "utf8");
    const words = countWords(content);
    const target = sizeTargets.find((entry) => entry.pattern.test(`/${normalized}`));
    if (!target || words <= target.maxWords) continue;

    if (target.type === "knowledge") {
      if (words <= target.maxWords) continue;
      findings.push(oversizedKnowledgeFinding({
        relative,
        words,
        maxWords: target.maxWords,
        content
      }));
      continue;
    }

    findings.push({
      severity: "warning",
      code: "oversized-doc",
      file: relative,
      words,
      maxWords: target.maxWords,
      message: `${target.type} doc has ${words} words; target is ${target.maxWords}.`
    });
  }
}

function checkFileNames() {
  const reportedDirs = new Set();
  for (const file of markdownFiles(docs)) {
    const relative = path.relative(docs, file).split(path.sep).join("/");
    if (relative.startsWith("tmp/") || relative.startsWith("playbook/")) continue;
    const segments = relative.split("/");
    const fileName = segments.pop();

    let dirPath = "";
    for (const dir of segments) {
      dirPath = dirPath ? `${dirPath}/${dir}` : dir;
      if (reportedDirs.has(dirPath)) continue;
      reportedDirs.add(dirPath);
      reportNameProblem(path.join(docs, dirPath), dir, null);
    }

    if (fileName === "README.md") continue;
    const siblings = new Set(
      fs.readdirSync(path.dirname(file)).filter((name) => name.endsWith(".md")).map((name) => name.slice(0, -3))
    );
    reportNameProblem(file, fileName.slice(0, -3), siblings, fileName);
  }
}

function reportNameProblem(absolute, base, siblings, display = base) {
  const problem = nameProblem(base, siblings);
  if (!problem) return;
  findings.push({
    severity: "warning",
    code: problem.code,
    file: path.relative(root, absolute),
    message: `"${display}" ${problem.reason} Rename it and update knowledge-index.json and references.`
  });
}

function nameProblem(base, siblings) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(base)) {
    return { code: "invalid-file-name", reason: "is not lowercase ASCII kebab-case." };
  }
  if (/^\d{1,3}-/.test(base)) {
    return { code: "ordinal-file-name", reason: "starts with an order number. Order lives in the overview doc, not in names." };
  }
  if (/(^|-)(part|teil)-?\d+(-|$)/.test(base) || base.split("-").some((token) => leftoverNameTokens.has(token))) {
    return { code: "ordinal-file-name", reason: "names a position or revision, not a concern. Name it after what it answers." };
  }
  const numbered = base.match(/^(.+)-v?\d{1,2}$/);
  if (numbered && siblings && (siblings.has(numbered[1]) || siblings.has(`${numbered[1]}-1`))) {
    return { code: "ordinal-file-name", reason: "is a numbered copy of a sibling. Name it after what it answers." };
  }
  if (vagueNames.has(base)) {
    return { code: "vague-file-name", reason: "is a vague name. Name docs after stable concepts, features, interfaces, or operations." };
  }
  return null;
}

function checkKnowledgeNames() {
  const byName = new Map();
  for (const file of markdownFiles(path.join(docs, "knowledge"))) {
    const name = path.basename(file);
    if (name === "README.md") continue;
    const base = name.slice(0, -3);
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(path.relative(root, file));
    if (genericNames.has(base)) {
      findings.push({
        severity: "warning",
        code: "generic-file-name",
        file: path.relative(root, file),
        message: `"${name}" is a generic word on its own. Name the subject plus the aspect, specific without its folder (for example invoice-extraction-quality.md, not invoices.md).`
      });
    }
  }
  for (const [name, files] of byName) {
    if (files.length < 2) continue;
    findings.push({
      severity: "warning",
      code: "duplicate-file-name",
      file: files[0],
      message: `"${name}" exists ${files.length} times: ${files.join(", ")}. A name must not be confusable with another file in the tree.`
    });
  }
}

function checkKnowledgeFolders() {
  for (const dir of directories(path.join(docs, "knowledge"))) {
    const leaves = fs.readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md")
      .map((entry) => entry.name);
    if (leaves.length < leafLimit) continue;
    findings.push({
      severity: "warning",
      code: "crowded-knowledge-folder",
      file: path.relative(root, dir),
      count: leaves.length,
      message: `Knowledge folder holds ${leaves.length} leaf docs (limit ${leafLimit - 1}). Group related leaves into subfolders with README.md overviews: ${leaves.join(", ")}.`
    });
  }
}

function checkCanvases() {
  const canvasRoot = path.join(docs, "playbook", "canvases");
  if (!fs.existsSync(canvasRoot)) return;
  const knowledgeNumbers = markdownFiles(path.join(docs, "knowledge"))
    .map((file) => ({ file, numbers: distinctiveNumbers(fs.readFileSync(file, "utf8")) }));

  for (const entry of fs.readdirSync(canvasRoot, { withFileTypes: true })) {
    const absolute = path.join(canvasRoot, entry.name);
    if (entry.isDirectory()) checkCanvasFolder(absolute, knowledgeNumbers);
    else if (entry.name.endsWith(".md")) checkCanvasFile(absolute, knowledgeNumbers);
  }
}

function checkCanvasFolder(dir, knowledgeNumbers) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  if (!entries.some((entry) => entry.isFile() && entry.name === "00_overview.md")) {
    findings.push({
      severity: "warning",
      code: "canvas-folder-missing-overview",
      file: path.relative(root, dir),
      message: "Canvas folder has no 00_overview.md. A canvas folder opens with 00_overview.md, followed by numbered work steps."
    });
  }
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (/^\d{2}_[a-z0-9]+(?:_[a-z0-9]+)*$/.test(entry.name)) checkCanvasFolder(absolute, knowledgeNumbers);
      else reportUnnumberedCanvasEntry(absolute, entry.name);
      continue;
    }
    if (!entry.name.endsWith(".md")) continue;
    if (entry.name !== "00_overview.md" && !/^\d{2}_[a-z0-9]+(?:_[a-z0-9]+)*\.md$/.test(entry.name)) {
      reportUnnumberedCanvasEntry(absolute, entry.name);
    }
    checkCanvasFile(absolute, knowledgeNumbers);
  }
}

function reportUnnumberedCanvasEntry(absolute, name) {
  const hint = name === "README.md"
    ? "Rename it to 00_overview.md."
    : "Ask whether it can be finished. A work step becomes NN_<step>.md; a topic or chapter that never ends belongs to its knowledge owner, and the overview links it.";
  findings.push({
    severity: "warning",
    code: "canvas-unnumbered-file",
    file: path.relative(root, absolute),
    message: `"${name}" is not a numbered work step. ${hint}`
  });
}

function checkCanvasFile(file, knowledgeNumbers) {
  const relative = path.relative(root, file);
  const content = fs.readFileSync(file, "utf8");
  const head = content.replace(/^---[\s\S]*?---/, "").split(/\r?\n/).slice(0, 40).join("\n");
  if (!/^\s*>?\s*\*\*Status(?::\*\*|\*\*\s*:)/m.test(head)) {
    findings.push({
      severity: "warning",
      code: "canvas-missing-status",
      file: relative,
      message: "Canvas has no status header (> **Status:** ...). Every canvas file starts with one."
    });
  }

  const words = countWords(content);
  if (words > canvasMaxWords) {
    findings.push({
      severity: "warning",
      code: "oversized-canvas",
      file: relative,
      words,
      maxWords: canvasMaxWords,
      message: `Canvas has ${words} words; the limit is ${canvasMaxWords}. Split it into work steps, or move settled rules to their knowledge owner and link them.`
    });
  }

  const numbers = distinctiveNumbers(content);
  if (numbers.size === 0) return;
  let best = null;
  for (const doc of knowledgeNumbers) {
    const shared = [...numbers].filter((value) => doc.numbers.has(value)).length;
    if (!best || shared > best.shared) best = { file: doc.file, shared };
  }
  if (best && best.shared >= 10 && best.shared / numbers.size >= 0.4) {
    findings.push({
      severity: "warning",
      code: "canvas-shares-numbers",
      file: relative,
      shared: best.shared,
      total: numbers.size,
      source: path.relative(root, best.file),
      message: `Canvas shares ${best.shared} of its ${numbers.size} numbers with ${path.relative(root, best.file)}. Numbers belong to the finding; link it instead of copying.`
    });
  }
}

function isCanvas(file) {
  const relative = path.relative(docs, file).split(path.sep).join("/");
  return relative.startsWith("playbook/canvases/");
}

// Numbers with three or more digits, without years: short numbers like days or
// small counts appear in almost every doc and would make every canvas "shared".
function distinctiveNumbers(content) {
  const text = content
    .replace(/^---[\s\S]*?---/, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\]\([^)]*\)/g, "]")
    .replace(/`[^`]*`/g, " ");
  const numbers = new Set();
  for (const match of text.matchAll(/(?<![\w.,\/-])\d[\d.,]*\d/g)) {
    const value = match[0].replace(/[.,]$/, "");
    if (value.replace(/[.,]/g, "").length < 3) continue;
    if (/^(19|20)\d\d$/.test(value)) continue;
    numbers.add(value);
  }
  return numbers;
}

function checkHeadings() {
  const files = [...markdownFiles(path.join(docs, "knowledge")), ...markdownFiles(path.join(docs, "human"))];
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const type = parseFrontmatter(content)?.type;
    const body = content
      .replace(/^---[\s\S]*?---/, "")
      .replace(/```[\s\S]*?```/g, "");

    const numbers = [];
    for (const line of body.split(/\r?\n/)) {
      const match = line.match(/^##\s+(\d+)(?:(?:\.\d+)+|[.)])\s+\S/);
      if (match) numbers.push(Number(match[1]));
    }
    if (numbers.length > 0) {
      const inOrder = numbers.every((number, index) => number === index + 1);
      if (!inOrder) {
        findings.push({
          severity: "warning",
          code: "heading-numbering",
          file: path.relative(root, file),
          message: `H2 headings are numbered ${numbers.join(", ")}. A file counts from 1 without gaps; leftover numbers from a split or edit make the order lie. Remove the numbers.`
        });
      } else if (type !== "procedure") {
        findings.push({
          severity: "info",
          code: "numbered-headings",
          file: path.relative(root, file),
          message: "H2 headings are numbered. Numbers belong only to ordered steps in procedure docs; they break when the doc is split."
        });
      }
    }

    const references = [...body.matchAll(/\b(?:punkt|abschnitt|kapitel|section|chapter|point)\s+\d+\b|§\s?\d+/gi)].map((match) => match[0]);
    if (references.length > 0) {
      findings.push({
        severity: "warning",
        code: "positional-reference",
        file: path.relative(root, file),
        message: `Positional references (${[...new Set(references)].slice(0, 3).join("; ")}) break when sections move. Reference a knowledge ID or heading anchor instead; ignore if it cites an external document.`
      });
    }
  }
}

function checkTmp() {
  const tmpDir = path.join(docs, "tmp");
  if (!fs.existsSync(tmpDir)) return;
  for (const file of markdownFiles(tmpDir)) {
    const relativeToTmp = path.relative(tmpDir, file);
    if (relativeToTmp !== "README.md") {
      findings.push({
        severity: "info",
        code: "tmp-content",
        file: path.relative(root, file),
        message: "Tmp content exists. Confirm it is not durable project truth."
      });
    }
  }
}

function checkOwnedCodeMarkers() {
  for (const file of markdownFiles(docs)) {
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/owned-code:\s*(.+)$/i);
      if (!match) continue;
      const ownedPath = match[1].trim().replace(/^`|`$/g, "");
      const absolute = path.join(root, ownedPath);
      if (!fs.existsSync(absolute)) {
        findings.push({
          severity: "warning",
          code: "missing-owned-code",
          file: path.relative(root, file),
          message: `owned-code path does not exist: ${ownedPath}.`
        });
      }
    }
  }
}

function checkPlaceholders() {
  const patterns = [
    /TODO:/i,
    /inspect manually/i,
    /unknown/i,
    /not detected/i
  ];
  for (const file of markdownFiles(docs)) {
    const content = fs.readFileSync(file, "utf8");
    const matched = patterns.find((pattern) => pattern.test(content));
    if (!matched) continue;
    findings.push({
      severity: "warning",
      code: "placeholder-text",
      file: path.relative(root, file),
      message: `Doc contains generated placeholder or unresolved text matching ${matched}.`
    });
  }
}

function checkArchitectureContract() {
  const architectureFile = docsPath("knowledge/architecture/README.md");
  if (!fs.existsSync(architectureFile)) return;

  const content = fs.readFileSync(architectureFile, "utf8");
  const requiredSignals = [
    /Adaptive Architecture Contract/i,
    /Project Continuity Rules/i,
    /Structural Ownership/i,
    /Configuration First/i,
    /Reuse And Composition/i
  ];
  const missing = requiredSignals.filter((pattern) => !pattern.test(content));
  if (missing.length) {
    findings.push({
      severity: "warning",
      code: "weak-architecture-contract",
      file: path.relative(root, architectureFile),
      message: "Architecture docs should explain adaptive structure, project continuity, structural ownership, configuration-first rules, and reuse/composition rules."
    });
  }

  const lower = content.toLowerCase();
  const structureSignals = ["apps", "packages", "src", "lib", "services", "domain", "domains"]
    .filter((candidate) => fs.existsSync(path.join(root, candidate)));
  if (structureSignals.length && !mentionsAny(lower, ["current structure", "boundary", "boundaries", "dependency direction", "structural ownership"])) {
    findings.push({
      severity: "warning",
      code: "undocumented-structure-signals",
      file: path.relative(root, architectureFile),
      message: `Repository has structure signals (${structureSignals.join(", ")}) but architecture docs do not explain structure or boundaries.`
    });
  }

  if (project.configFiles.length && !mentionsAny(lower, ["configuration first", "configuration", "config flow", "runtime setting"])) {
    findings.push({
      severity: "warning",
      code: "undocumented-configuration-pattern",
      file: path.relative(root, architectureFile),
      message: "Repository has configuration files but architecture docs do not explain the configuration pattern."
    });
  }

  const reuseSignals = ["components", "ui", "hooks", "composables", "utils", "shared"]
    .filter((candidate) => fs.existsSync(path.join(root, candidate)) || fs.existsSync(path.join(root, "src", candidate)));
  if (reuseSignals.length && !mentionsAny(lower, ["reuse and composition", "reusable", "component", "project primitive", "shared primitive", "composition pattern"])) {
    findings.push({
      severity: "warning",
      code: "undocumented-reuse-pattern",
      file: path.relative(root, architectureFile),
      message: `Repository has reuse signals (${reuseSignals.join(", ")}) but architecture docs do not explain reusable primitives.`
    });
  }
}

function checkContextMapRouteIds(routeGraph) {
  const file = path.join(docs, "agent", "context-map.md");
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, "utf8");
  if (!content.includes("| Route ID |")) return;

  const routeIds = new Set(routeGraph.shards.flatMap((shard) => (shard.data.routes || []).map((route) => route.id).filter(Boolean)));
  const mapIds = new Set(
    content
      .split(/\r?\n/)
      .filter((line) => line.trim().startsWith("|") && !line.includes("---") && !line.includes("Route ID"))
      .map((line) => line.split("|")[1]?.trim())
      .filter(Boolean)
  );

  for (const id of routeIds) {
    if (!mapIds.has(id)) {
      findings.push({
        severity: "warning",
        code: "context-map-missing-route",
        file: path.relative(root, file),
        message: `Context map is missing route ID from manifest: ${id}.`
      });
    }
  }
  for (const id of mapIds) {
    if (!routeIds.has(id)) {
      findings.push({
        severity: "warning",
        code: "context-map-extra-route",
        file: path.relative(root, file),
        message: `Context map has route ID not found in manifest: ${id}.`
      });
    }
  }
}

function checkOrphanKnowledgeDocs(routeGraph) {
  const referenced = new Set();
  for (const shard of routeGraph.shards) {
    for (const route of shard.data.routes || []) {
      for (const kid of arrayValue(route.knowledge)) {
        referenced.add(kid);
      }
    }
  }

  // Load index to map files to IDs
  const indexFile = path.join(docs, "agent", "knowledge-index.json");
  let index = {};
  if (fs.existsSync(indexFile)) {
    try { index = readJson(indexFile); } catch { /* skip */ }
  }
  const indexedIds = new Set(Object.keys(index));

  for (const file of markdownFiles(path.join(docs, "knowledge"))) {
    const relative = path.relative(docs, file).split(path.sep).join("/");
    if (relative.endsWith("/README.md") && relative === "knowledge/README.md") continue;
    const content = fs.readFileSync(file, "utf8");
    const fm = parseFrontmatter(content);
    if (!fm || !fm.id) continue;
    if (!referenced.has(fm.id) && !isReferencedByOtherDoc(fm.id, indexedIds)) {
      findings.push({
        severity: "warning",
        code: "orphan-knowledge-doc",
        file: path.relative(root, file),
        message: `Knowledge doc ${fm.id} is not referenced by any route.`
      });
    }
  }
}

function isReferencedByOtherDoc(id, indexedIds) {
  // A knowledge doc might be referenced via includes/extends/dependsOn
  // We do a lightweight check here; check-graph does the full analysis
  return false;
}

function checkAdaptiveHumanDocs(routeGraph) {
  const adaptiveNames = ["environment", "configuration", "services", "deployment", "troubleshooting", "maintenance"];
  const expected = new Set(project.adaptiveHumanDocs.map((name) => `human/${name}.md`));

  for (const relative of expected) {
    const file = docsPath(relative);
    if (!fs.existsSync(file)) {
      findings.push({
        severity: "error",
        code: "missing-adaptive-human-doc",
        file: path.relative(root, file),
        message: `Adaptive human doc is required by detected signals: ${relative}.`
      });
    }
  }
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const yaml = match[1];
  const result = {};
  let currentKey = null;
  for (const line of yaml.split(/\r?\n/)) {
    const kvMatch = line.match(/^(\w+):\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const value = kvMatch[2].trim();
      if (value === "" || value === "[]") result[currentKey] = [];
      else result[currentKey] = value.replace(/^["']|["']$/g, "");
      continue;
    }
    const listMatch = line.match(/^\s+-\s+(.+)$/);
    if (listMatch && currentKey) {
      if (!Array.isArray(result[currentKey])) result[currentKey] = result[currentKey] ? [result[currentKey]] : [];
      result[currentKey].push(listMatch[1].trim().replace(/^["']|["']$/g, ""));
    }
  }
  return result;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function docsPath(relative) {
  return path.join(docs, stripTicks(relative));
}

function stripTicks(value) {
  return String(value).trim().replace(/^`|`$/g, "");
}

function arrayValue(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function isLooseValue(value) {
  const normalized = String(value).trim().toLowerCase();
  return ["", "none", "inspect manually", "*.config.*"].includes(normalized);
}

function matchRepoPaths(pattern) {
  const normalized = pattern.split(path.sep).join("/");
  if (normalized.endsWith("/**")) {
    const prefix = normalized.slice(0, -3);
    const dir = path.join(root, prefix);
    return fs.existsSync(dir) ? [dir] : [];
  }
  const exact = path.join(root, normalized);
  if (fs.existsSync(exact)) return [exact];
  return [];
}

function markdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...markdownFiles(absolute));
    if (entry.isFile() && entry.name.endsWith(".md")) out.push(absolute);
  }
  return out;
}

function directories(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [dir];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) out.push(...directories(path.join(dir, entry.name)));
  }
  return out;
}

function countWords(content) {
  return content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^---[\s\S]*?---/m, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function mentionsAny(content, values) {
  return values.some((value) => content.includes(value));
}

function printText(items) {
  if (items.length === 0) {
    console.log("DocDriven audit passed: no findings.");
    return;
  }
  for (const finding of items) {
    console.log(`[${finding.severity}] ${finding.code}: ${finding.file}`);
    console.log(`  ${finding.message}`);
  }
}
