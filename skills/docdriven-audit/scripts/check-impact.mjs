#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const root = valueAfter("--root") || process.cwd();
const docsRoot = valueAfter("--docs-root") || "Docs";
const format = valueAfter("--format") || "text";
const changed = valueAfter("--changed");
const docs = path.join(root, docsRoot);

if (!changed) {
  console.error("Usage: check-impact.mjs --changed <knowledge-id> [--root <path>] [--docs-root <name>] [--format text|json]");
  process.exit(1);
}

const graph = buildGraph();

if (!graph.has(changed)) {
  console.error(`Knowledge ID not found: ${changed}`);
  console.error(`Available IDs: ${[...graph.keys()].join(", ")}`);
  process.exit(1);
}

const impact = computeImpact(changed);

if (format === "json") {
  console.log(JSON.stringify(impact, null, 2));
} else {
  printText(impact);
}

// --- Impact Computation ---

function computeImpact(targetId) {
  const result = {
    changed: targetId,
    changedFile: graph.get(targetId).file,
    specializations: [],
    parents: [],
    views: [],
    consumers: [],
    totalAffected: 0
  };

  for (const [id, node] of graph) {
    if (id === targetId) continue;

    // Specializations: docs that extend the changed doc
    if (node.extends === targetId) {
      result.specializations.push({ id, file: node.file, relationship: "extends" });
    }

    // Parents: docs that include the changed doc
    if (node.includes.includes(targetId)) {
      result.parents.push({ id, file: node.file, relationship: "includes" });
    }

    // Views: docs derived from the changed doc
    if (node.derivedFrom.includes(targetId)) {
      result.views.push({ id, file: node.file, relationship: "derivedFrom" });
    }

    // Consumers: docs that depend on the changed doc
    if (node.dependsOn.includes(targetId)) {
      result.consumers.push({ id, file: node.file, relationship: "dependsOn" });
    }
  }

  result.totalAffected = result.specializations.length + result.parents.length + result.views.length + result.consumers.length;
  return result;
}

// --- Graph Building ---

function buildGraph() {
  const nodes = new Map();

  for (const file of allMarkdownFiles(docs)) {
    const content = fs.readFileSync(file, "utf8");
    const fm = parseFrontmatter(content);
    if (!fm || !fm.id) continue;

    nodes.set(fm.id, {
      id: fm.id,
      file: path.relative(root, file),
      type: fm.type || "unknown",
      authority: fm.authority || null,
      extends: fm.extends ? (Array.isArray(fm.extends) ? fm.extends[0] : fm.extends) : null,
      includes: toArray(fm.includes),
      dependsOn: toArray(fm.dependsOn),
      derivedFrom: toArray(fm.derivedFrom)
    });
  }

  return nodes;
}

// --- Helpers ---

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

      if (value === "" || value === "[]") {
        result[currentKey] = [];
      } else if (value.startsWith("[")) {
        result[currentKey] = value.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
      } else {
        result[currentKey] = value.replace(/^["']|["']$/g, "");
      }
      continue;
    }

    const listMatch = line.match(/^\s+-\s+(.+)$/);
    if (listMatch && currentKey) {
      if (!Array.isArray(result[currentKey])) {
        result[currentKey] = result[currentKey] ? [result[currentKey]] : [];
      }
      result[currentKey].push(listMatch[1].trim().replace(/^["']|["']$/g, ""));
    }
  }

  return result;
}

function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

function allMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...allMarkdownFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function printText(impact) {
  console.log(`Changed: ${impact.changed}`);
  console.log(`File: ${impact.changedFile}`);
  console.log("");

  if (impact.specializations.length) {
    console.log("Direct specializations (extends):");
    for (const s of impact.specializations) console.log(`  → ${s.id} (${s.file})`);
    console.log("");
  }

  if (impact.parents.length) {
    console.log("Parent docs (includes this):");
    for (const p of impact.parents) console.log(`  → ${p.id} (${p.file})`);
    console.log("");
  }

  if (impact.views.length) {
    console.log("Derived views (derivedFrom):");
    for (const v of impact.views) console.log(`  → ${v.id} (${v.file})`);
    console.log("");
  }

  if (impact.consumers.length) {
    console.log("Consumers (dependsOn — flag for review):");
    for (const c of impact.consumers) console.log(`  → ${c.id} (${c.file})`);
    console.log("");
  }

  if (impact.totalAffected === 0) {
    console.log("No dependents found.");
  } else {
    console.log(`Total affected: ${impact.totalAffected} doc(s)`);
  }
}
