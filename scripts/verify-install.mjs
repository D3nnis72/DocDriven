#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Skills are installed as single directories, so this copies each skill out of
// the repo on its own and checks it still resolves its references and runs.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = path.join(root, "skills");
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "docdriven-install-"));
const installDir = path.join(workDir, "installed");
const projectDir = path.join(workDir, "project");
const failures = [];

const skills = fs
  .readdirSync(skillsDir)
  .filter((entry) => !entry.startsWith("_"))
  .filter((entry) => fs.statSync(path.join(skillsDir, entry)).isDirectory());

for (const skill of skills) {
  fs.cpSync(path.join(skillsDir, skill), path.join(installDir, skill), { recursive: true });
}

fs.cpSync(path.join(root, "tests", "fixtures", "operational-js"), projectDir, { recursive: true });
fs.rmSync(path.join(projectDir, "Docs"), { recursive: true, force: true });
fs.rmSync(path.join(projectDir, ".agents"), { recursive: true, force: true });

for (const skill of skills) {
  checkReferences(skill);
}

runScript("docdriven-setup", "setup-docdriven.mjs", ["--root", projectDir], [0]);
runScript("docdriven-audit", "audit-docdriven.mjs", ["--root", projectDir, "--format", "json"], [0, 1]);

fs.rmSync(workDir, { recursive: true, force: true });

if (failures.length > 0) {
  console.error("Standalone install verification failed:");
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log(`Verified ${skills.length} skill(s) as standalone installs.`);

function checkReferences(skill) {
  const skillRoot = path.join(installDir, skill);
  for (const file of markdownFiles(skillRoot)) {
    const content = fs.readFileSync(file, "utf8");
    const from = path.relative(installDir, file);
    for (const reference of content.matchAll(/`([^`\s]*_shared\/[^`\s]+)`/g)) {
      const target = path.resolve(path.dirname(file), reference[1]);
      if (!fs.existsSync(target)) {
        failures.push(`${from}: reference ${reference[1]} does not resolve after install`);
      }
    }
  }
}

function markdownFiles(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...markdownFiles(full));
    else if (entry.name.endsWith(".md")) found.push(full);
  }
  return found;
}

function runScript(skill, script, scriptArgs, allowedCodes) {
  const target = path.join(installDir, skill, "scripts", script);
  if (!fs.existsSync(target)) {
    failures.push(`${skill}: missing scripts/${script} after install`);
    return;
  }

  const result = spawnSync("node", [target, ...scriptArgs], { encoding: "utf8" });
  const stderr = result.stderr || "";

  if (stderr.includes("ERR_MODULE_NOT_FOUND")) {
    failures.push(`${skill}/${script}: cannot resolve an import after install`);
    return;
  }

  if (!allowedCodes.includes(result.status)) {
    failures.push(`${skill}/${script}: exited ${result.status}\n    ${stderr.trim().split("\n")[0] || ""}`);
  }
}
