#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const root = valueAfter("--root") || process.cwd();
const docsRoot = valueAfter("--docs-root") || "Docs";
const format = valueAfter("--format") || "text";
const docs = path.join(root, docsRoot);

const findings = [];
const graph = buildGraph();

checkCircularExtends();
checkBidirectionalConsistency();
checkTargetsExist();
checkDerivedFromTargetsAreCanonical();
checkOrphanCanonicalDocs();
checkRouteKnowledgeIds();

if (format === "json") {
  console.log(JSON.stringify({ findings }, null, 2));
} else {
  printText(findings);
}

process.exit(findings.some((f) => f.severity === "error") ? 1 : 0);

// --- Graph Building ---

function buildGraph() {
  const nodes = new Map(); // id -> { id, file, type, authority, extends, includes, dependsOn, derivedFrom }

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

// --- Checks ---

function checkCircularExtends() {
  for (const [id, node] of graph) {
    if (!node.extends) continue;
    const visited = new Set();
    let current = id;

    while (current) {
      if (visited.has(current)) {
        findings.push({ severity: "error", code: "circular-extends", file: node.file, message: `Circular extends chain detected involving: ${id}.` });
        break;
      }
      visited.add(current);
      const parent = graph.get(current);
      current = parent ? parent.extends : null;
    }
  }
}

function checkBidirectionalConsistency() {
  for (const [id, node] of graph) {
    // If A includes B, B should extend A
    for (const childId of node.includes) {
      const child = graph.get(childId);
      if (!child) continue; // Missing target is caught elsewhere
      if (child.extends !== id) {
        findings.push({
          severity: "warning",
          code: "missing-bidirectional-extends",
          file: node.file,
          message: `${id} includes ${childId}, but ${childId} does not extend ${id}.`
        });
      }
    }

    // If A extends B, B should include A
    if (node.extends) {
      const parent = graph.get(node.extends);
      if (parent && !parent.includes.includes(id)) {
        findings.push({
          severity: "warning",
          code: "missing-bidirectional-includes",
          file: node.file,
          message: `${id} extends ${node.extends}, but ${node.extends} does not include ${id}.`
        });
      }
    }
  }
}

function checkTargetsExist() {
  for (const [id, node] of graph) {
    if (node.extends && !graph.has(node.extends)) {
      findings.push({ severity: "error", code: "dangling-extends", file: node.file, message: `${id} extends non-existent ID: ${node.extends}.` });
    }

    for (const target of node.includes) {
      if (!graph.has(target)) {
        findings.push({ severity: "error", code: "dangling-includes", file: node.file, message: `${id} includes non-existent ID: ${target}.` });
      }
    }

    for (const target of node.dependsOn) {
      if (!graph.has(target)) {
        findings.push({ severity: "error", code: "dangling-dependsOn", file: node.file, message: `${id} dependsOn non-existent ID: ${target}.` });
      }
    }

    for (const target of node.derivedFrom) {
      if (!graph.has(target)) {
        findings.push({ severity: "error", code: "dangling-derivedFrom", file: node.file, message: `${id} derivedFrom non-existent ID: ${target}.` });
      }
    }
  }
}

function checkDerivedFromTargetsAreCanonical() {
  for (const [id, node] of graph) {
    for (const target of node.derivedFrom) {
      const source = graph.get(target);
      if (!source) continue; // Missing target caught elsewhere
      if (source.authority !== "canonical") {
        findings.push({
          severity: "error",
          code: "derived-from-non-canonical",
          file: node.file,
          message: `${id} derivedFrom ${target}, but ${target} is not authority: canonical.`
        });
      }
    }
  }
}

function checkOrphanCanonicalDocs() {
  const manifestFile = path.join(docs, "agent", "manifest.json");
  if (!fs.existsSync(manifestFile)) return;

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  } catch { return; }

  const routeKnowledgeIds = new Set();
  for (const shardPath of manifest.routeIndexes || []) {
    const shardFile = path.join(docs, shardPath);
    if (!fs.existsSync(shardFile)) continue;
    try {
      const shard = JSON.parse(fs.readFileSync(shardFile, "utf8"));
      for (const route of shard.routes || []) {
        for (const kid of route.knowledge || []) {
          routeKnowledgeIds.add(kid);
        }
      }
    } catch { continue; }
  }

  for (const [id, node] of graph) {
    if (node.authority !== "canonical") continue;
    if (routeKnowledgeIds.has(id)) continue;

    // Check if it's referenced by another doc (extends, includes, dependsOn, derivedFrom)
    let referenced = false;
    for (const [, other] of graph) {
      if (other.extends === id || other.includes.includes(id) || other.dependsOn.includes(id) || other.derivedFrom.includes(id)) {
        referenced = true;
        break;
      }
    }

    if (!referenced) {
      findings.push({ severity: "warning", code: "orphan-canonical", file: node.file, message: `Canonical doc ${id} is not referenced by any route or relationship.` });
    }
  }
}

function checkRouteKnowledgeIds() {
  const manifestFile = path.join(docs, "agent", "manifest.json");
  if (!fs.existsSync(manifestFile)) return;

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  } catch { return; }

  for (const shardPath of manifest.routeIndexes || []) {
    const shardFile = path.join(docs, shardPath);
    if (!fs.existsSync(shardFile)) continue;

    let shard;
    try {
      shard = JSON.parse(fs.readFileSync(shardFile, "utf8"));
    } catch { continue; }

    for (const route of shard.routes || []) {
      for (const kid of route.knowledge || []) {
        if (!graph.has(kid)) {
          findings.push({
            severity: "error",
            code: "route-knowledge-unresolved",
            file: path.relative(root, shardFile),
            message: `Route ${route.id} references knowledge ID ${kid} which does not exist.`
          });
        }
      }
    }
  }
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

function printText(items) {
  if (items.length === 0) {
    console.log("check-graph: knowledge graph is coherent.");
    return;
  }
  for (const f of items) {
    console.log(`[${f.severity}] ${f.code}: ${f.file}`);
    console.log(`  ${f.message}`);
  }
  console.log(`\n${items.length} finding(s).`);
}
