#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Skills are installed one directory at a time, so each skill must carry the
// shared files it references. `skills/_shared/` stays the canonical source and
// `skills/<skill>/_shared/` holds generated copies.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sharedDir = path.join(root, "skills", "_shared");
const check = process.argv.includes("--check");

const vendorMap = {
  docdriven: [
    "agent-operating-contract.md",
    "docdriven-structure.md",
    "writing-style.md"
  ],
  "docdriven-init": [
    "agent-operating-contract.md",
    "operational-scan.mjs",
    "repo-local-skill-template.md"
  ],
  "docdriven-build": [
    "agent-operating-contract.md",
    "docs-tree-template.md",
    "operational-scan.mjs",
    "writing-style.md"
  ],
  "docdriven-audit": [
    "agent-operating-contract.md",
    "audit-checklist.md",
    "operational-scan.mjs"
  ]
};

const drift = [];
const changes = [];

for (const [skill, files] of Object.entries(vendorMap)) {
  const targetDir = path.join(root, "skills", skill, "_shared");
  syncFiles(skill, targetDir, files);
  pruneExtras(skill, targetDir, files);
}

if (check) {
  if (drift.length === 0) {
    console.log("Vendored shared files are up to date.");
    process.exit(0);
  }
  console.error("Vendored shared files are out of sync:");
  for (const item of drift) console.error(`  ${item}`);
  console.error("Run: node scripts/sync-shared.mjs");
  process.exit(1);
}

if (changes.length === 0) {
  console.log("Vendored shared files already up to date.");
} else {
  for (const item of changes) console.log(item);
  console.log(`Synced ${changes.length} file(s).`);
}

function syncFiles(skill, targetDir, files) {
  for (const file of files) {
    const source = path.join(sharedDir, file);
    const target = path.join(targetDir, file);
    const relative = `skills/${skill}/_shared/${file}`;

    if (!fs.existsSync(source)) {
      drift.push(`${relative}: source skills/_shared/${file} is missing`);
      continue;
    }

    const expected = fs.readFileSync(source, "utf8");
    const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null;
    if (current === expected) continue;

    if (check) {
      drift.push(`${relative}: ${current === null ? "missing" : "out of date"}`);
      continue;
    }

    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(target, expected, "utf8");
    changes.push(`${current === null ? "created" : "updated"} ${relative}`);
  }
}

function pruneExtras(skill, targetDir, files) {
  if (!fs.existsSync(targetDir)) return;
  for (const entry of fs.readdirSync(targetDir)) {
    if (files.includes(entry)) continue;
    const relative = `skills/${skill}/_shared/${entry}`;
    if (check) {
      drift.push(`${relative}: not required by this skill`);
      continue;
    }
    fs.rmSync(path.join(targetDir, entry), { recursive: true, force: true });
    changes.push(`removed ${relative}`);
  }
}
