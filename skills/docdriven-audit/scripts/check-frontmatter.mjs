#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const root = valueAfter("--root") || process.cwd();
const docsRoot = valueAfter("--docs-root") || "Docs";
const format = valueAfter("--format") || "text";
const docs = path.join(root, docsRoot);

const validTypes = ["architecture", "rule", "decision", "summary", "procedure", "view"];
const idPattern = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$/;
const findings = [];
const seenIds = new Map();

checkKnowledgeDocs();
checkViewDocs();
checkKnowledgeIndex();

if (format === "json") {
  console.log(JSON.stringify({ findings }, null, 2));
} else {
  printText(findings);
}

process.exit(findings.some((f) => f.severity === "error") ? 1 : 0);

// --- Checks ---

function checkKnowledgeDocs() {
  const knowledgeDir = path.join(docs, "knowledge");
  if (!fs.existsSync(knowledgeDir)) return;

  for (const file of markdownFiles(knowledgeDir)) {
    const relative = path.relative(root, file);
    const content = fs.readFileSync(file, "utf8");
    const frontmatter = parseFrontmatter(content);

    if (!frontmatter) {
      findings.push({ severity: "error", code: "missing-frontmatter", file: relative, message: "Knowledge doc is missing YAML frontmatter." });
      continue;
    }

    if (!frontmatter.id) {
      findings.push({ severity: "error", code: "missing-id", file: relative, message: "Frontmatter is missing required field: id." });
    } else {
      checkIdFormat(frontmatter.id, relative);
      checkIdUnique(frontmatter.id, relative);
    }

    if (!frontmatter.type) {
      findings.push({ severity: "error", code: "missing-type", file: relative, message: "Frontmatter is missing required field: type." });
    } else if (!validTypes.includes(frontmatter.type)) {
      findings.push({ severity: "error", code: "invalid-type", file: relative, message: `Invalid type: ${frontmatter.type}. Must be one of: ${validTypes.join(", ")}.` });
    }

    if (frontmatter.type !== "view" && frontmatter.authority !== "canonical") {
      findings.push({ severity: "error", code: "missing-authority", file: relative, message: "Knowledge doc must have authority: canonical." });
    }

    if (frontmatter.derivedFrom) {
      findings.push({ severity: "warning", code: "canonical-has-derivedFrom", file: relative, message: "Canonical knowledge doc should not have derivedFrom. Use dependsOn instead." });
    }
  }
}

function checkViewDocs() {
  for (const dir of ["human", "agent"]) {
    const surface = path.join(docs, dir);
    if (!fs.existsSync(surface)) continue;

    for (const file of markdownFiles(surface)) {
      const relative = path.relative(root, file);
      const content = fs.readFileSync(file, "utf8");
      const frontmatter = parseFrontmatter(content);

      // Not all agent docs need frontmatter (e.g., gaps.md, validation.md)
      if (!frontmatter) continue;

      if (!frontmatter.id) {
        findings.push({ severity: "warning", code: "view-missing-id", file: relative, message: "View doc is missing id in frontmatter." });
      } else {
        checkIdFormat(frontmatter.id, relative);
        checkIdUnique(frontmatter.id, relative);
      }

      if (!frontmatter.type) {
        findings.push({ severity: "warning", code: "view-missing-type", file: relative, message: "View doc is missing type in frontmatter." });
      }

      if (frontmatter.type === "view" && !frontmatter.derivedFrom) {
        findings.push({ severity: "warning", code: "view-missing-derivedFrom", file: relative, message: "View doc should have derivedFrom listing its canonical sources." });
      }

      if (frontmatter.authority === "canonical") {
        findings.push({ severity: "error", code: "view-has-canonical", file: relative, message: "View docs in human/ or agent/ must not have authority: canonical." });
      }
    }
  }
}

function checkKnowledgeIndex() {
  const indexFile = path.join(docs, "agent", "knowledge-index.json");
  if (!fs.existsSync(indexFile)) {
    findings.push({ severity: "warning", code: "missing-knowledge-index", file: path.relative(root, indexFile), message: "knowledge-index.json is missing." });
    return;
  }

  let index;
  try {
    index = JSON.parse(fs.readFileSync(indexFile, "utf8"));
  } catch (e) {
    findings.push({ severity: "error", code: "invalid-knowledge-index", file: path.relative(root, indexFile), message: `knowledge-index.json is invalid JSON: ${e.message}` });
    return;
  }

  // Check that indexed paths exist
  for (const [id, relativePath] of Object.entries(index)) {
    const file = path.join(docs, relativePath);
    if (!fs.existsSync(file)) {
      findings.push({ severity: "error", code: "index-path-missing", file: path.relative(root, indexFile), message: `Index entry ${id} points to missing file: ${relativePath}.` });
      continue;
    }

    // Check that the file's frontmatter id matches the index key
    const content = fs.readFileSync(file, "utf8");
    const frontmatter = parseFrontmatter(content);
    if (frontmatter && frontmatter.id && frontmatter.id !== id) {
      findings.push({ severity: "warning", code: "index-id-mismatch", file: path.relative(root, indexFile), message: `Index key ${id} does not match file frontmatter id: ${frontmatter.id}.` });
    }
  }

  // Check that all docs with IDs are in the index
  for (const [id, file] of seenIds) {
    if (!index[id]) {
      findings.push({ severity: "warning", code: "id-not-in-index", file, message: `Doc declares id ${id} but it is not in knowledge-index.json.` });
    }
  }
}

// --- Helpers ---

function checkIdFormat(id, file) {
  if (!idPattern.test(id)) {
    findings.push({ severity: "warning", code: "invalid-id-format", file, message: `ID "${id}" does not match dot.separated.lowercase pattern.` });
  }
}

function checkIdUnique(id, file) {
  if (seenIds.has(id)) {
    findings.push({ severity: "error", code: "duplicate-id", file, message: `Duplicate ID: ${id}. First seen in ${seenIds.get(id)}.` });
  } else {
    seenIds.set(id, file);
  }
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const yaml = match[1];
  const result = {};

  for (const line of yaml.split(/\r?\n/)) {
    const kvMatch = line.match(/^(\w+):\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1];
      const value = kvMatch[2].trim();

      if (value === "" || value === "[]") {
        result[key] = [];
      } else if (value.startsWith("[")) {
        result[key] = value.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
      } else {
        result[key] = value.replace(/^["']|["']$/g, "");
      }
    }

    // Handle YAML list items (  - value)
    const listMatch = line.match(/^\s+-\s+(.+)$/);
    if (listMatch) {
      const lastKey = Object.keys(result).pop();
      if (lastKey && Array.isArray(result[lastKey])) {
        result[lastKey].push(listMatch[1].trim().replace(/^["']|["']$/g, ""));
      } else if (lastKey) {
        result[lastKey] = [result[lastKey], listMatch[1].trim().replace(/^["']|["']$/g, "")];
      }
    }
  }

  return result;
}

function markdownFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...markdownFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function printText(items) {
  if (items.length === 0) {
    console.log("check-frontmatter: all docs have valid frontmatter.");
    return;
  }
  for (const f of items) {
    console.log(`[${f.severity}] ${f.code}: ${f.file}`);
    console.log(`  ${f.message}`);
  }
  console.log(`\n${items.length} finding(s).`);
}
