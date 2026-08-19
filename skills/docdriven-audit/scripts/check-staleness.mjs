#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const root = valueAfter("--root") || process.cwd();
const docsRoot = valueAfter("--docs-root") || "Docs";
const format = valueAfter("--format") || "text";
const docs = path.join(root, docsRoot);

const findings = [];

checkStaleness();

if (format === "json") {
  console.log(JSON.stringify({ findings }, null, 2));
} else {
  printText(findings);
}

process.exit(findings.some((f) => f.severity === "error") ? 1 : 0);

// --- Main Check ---

function checkStaleness() {
  if (!isGitRepo()) {
    findings.push({
      severity: "warning",
      code: "not-git-repo",
      file: root,
      message: "Not a Git repository. Staleness detection requires Git."
    });
    return;
  }

  const allDocs = allMarkdownFiles(docs);
  const docMap = new Map(); // id -> { file, frontmatter }

  for (const file of allDocs) {
    const content = fs.readFileSync(file, "utf8");
    const fm = parseFrontmatter(content);
    if (!fm || !fm.id) continue;
    docMap.set(fm.id, { file, fm });
  }

  // Check docs with groundedIn
  for (const [id, { file, fm }] of docMap) {
    if (!fm.sourceVersion) continue;

    if (fm.groundedIn && fm.groundedIn.length > 0) {
      checkGroundedStaleness(id, file, fm);
    } else if (fm.type === "overview" && fm.includes && fm.includes.length > 0) {
      checkOverviewStaleness(id, file, fm, docMap);
    }
  }
}

function checkGroundedStaleness(id, file, fm) {
  const groundedPaths = Array.isArray(fm.groundedIn) ? fm.groundedIn : [fm.groundedIn];
  const resolvedPaths = groundedPaths.map((p) => p.replace(/^["']|["']$/g, ""));

  const latestCommit = getLatestCommit(resolvedPaths);
  if (!latestCommit) return; // no Git history for these paths

  if (latestCommit !== fm.sourceVersion) {
    findings.push({
      severity: "warning",
      code: "stale-grounded-doc",
      file: path.relative(root, file),
      message: `Doc ${id} has sourceVersion ${fm.sourceVersion} but grounded files were last changed at ${latestCommit}.`
    });
  }
}

function checkOverviewStaleness(id, file, fm, docMap) {
  const includes = Array.isArray(fm.includes) ? fm.includes : [fm.includes];
  const childFiles = [];

  for (const childId of includes) {
    const child = docMap.get(childId);
    if (child) {
      childFiles.push(path.relative(root, child.file));
    }
  }

  if (childFiles.length === 0) return;

  const latestCommit = getLatestCommit(childFiles);
  if (!latestCommit) return;

  if (latestCommit !== fm.sourceVersion) {
    findings.push({
      severity: "warning",
      code: "stale-overview-doc",
      file: path.relative(root, file),
      message: `Overview ${id} has sourceVersion ${fm.sourceVersion} but child docs were last changed at ${latestCommit}.`
    });
  }
}

// --- Git Helpers ---

function isGitRepo() {
  try {
    execSync("git rev-parse --git-dir", { cwd: root, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function getLatestCommit(paths) {
  // Expand globs and get latest commit across all matching paths
  const expandedPaths = [];
  for (const p of paths) {
    if (p.includes("*")) {
      // Use git ls-files for glob expansion
      try {
        const output = execSync(`git ls-files -- "${p}"`, { cwd: root, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
        if (output) expandedPaths.push(...output.split("\n"));
      } catch {
        // If glob doesn't match, skip
      }
    } else {
      expandedPaths.push(p);
    }
  }

  if (expandedPaths.length === 0) return null;

  try {
    const pathArgs = expandedPaths.map((p) => `"${p}"`).join(" ");
    const result = execSync(`git log -1 --format=%h -- ${pathArgs}`, {
      cwd: root,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    return result || null;
  } catch {
    return null;
  }
}

// --- Parsing ---

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

// --- Utilities ---

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
    console.log("check-staleness: all docs with sourceVersion are current.");
    return;
  }
  for (const f of items) {
    console.log(`[${f.severity}] ${f.code}: ${f.file}`);
    console.log(`  ${f.message}`);
  }
  console.log(`\n${items.length} finding(s).`);
}
