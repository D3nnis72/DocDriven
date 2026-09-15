import fs from "node:fs";
import path from "node:path";

const baseCommandKeys = ["test", "build", "lint", "typecheck", "dev", "deploy", "debug", "migrate", "seed", "docs", "audit", "doctor"];
const jsFrameworks = ["next", "react", "vite", "express", "fastify", "prisma", "@prisma/client", "vue", "svelte", "astro"];
const externalServices = ["@supabase/supabase-js", "supabase", "firebase", "stripe", "bullmq", "pg", "postgres", "mysql2", "redis", "ioredis", "nodemailer"];

export function scanProject(rootDir) {
  const pkgPath = path.join(rootDir, "package.json");
  const pyprojectPath = path.join(rootDir, "pyproject.toml");
  const project = {
    name: path.basename(rootDir),
    stack: "Unknown",
    packageManager: "not detected",
    scripts: {},
    dependencies: {},
    frameworks: [],
    workspaces: [],
    sourceDirs: detectExisting(rootDir, ["src", "app", "pages", "packages", "apps", "lib", "tests"]),
    configFiles: detectExisting(rootDir, configCandidates()),
    commands: defaultCommands(),
    knowledgeCategories: ["architecture", "features", "interfaces", "operations"],
    operationalSignals: emptySignals(),
    adaptiveHumanDocs: []
  };

  if (fs.existsSync(pkgPath)) hydrateJsProject(project, rootDir, pkgPath);
  if (!fs.existsSync(pkgPath) && fs.existsSync(pyprojectPath)) hydratePythonProject(project, pyprojectPath);

  project.configFiles = unique([...project.configFiles, ...detectEnvFiles(rootDir)]);
  project.operationalSignals = detectOperationalSignals(rootDir, project);
  project.adaptiveHumanDocs = adaptiveHumanDocs(project.operationalSignals);
  if (project.operationalSignals.data && !project.knowledgeCategories.includes("data")) {
    project.knowledgeCategories.push("data");
  }

  return project;
}

export function listDetectedSignals(signals) {
  return Object.entries(signals)
    .filter(([name, value]) => name !== "data" && value.detected)
    .map(([name, value]) => ({ name, evidence: value.evidence }));
}

function hydrateJsProject(project, rootDir, pkgPath) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const scripts = pkg.scripts || {};
  const dependencies = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.peerDependencies,
    ...pkg.optionalDependencies
  };

  project.name = pkg.name || project.name;
  project.stack = "JavaScript/Node.js";
  project.packageManager = detectJsPackageManager(rootDir);
  project.scripts = scripts;
  project.dependencies = dependencies;
  project.frameworks = detectJsFrameworks(dependencies);
  project.workspaces = normalizeWorkspaces(pkg.workspaces);
  project.commands = detectScriptCommands(project.packageManager, scripts);
}

function hydratePythonProject(project, pyprojectPath) {
  const pyproject = fs.readFileSync(pyprojectPath, "utf8");
  project.stack = "Python";
  project.packageManager = "python";
  project.frameworks = detectPythonFrameworks(pyproject);
  project.commands.test = pyproject.includes("pytest") ? "pytest" : "pytest if configured; otherwise inspect manually";
  project.commands.build = pyproject.includes("[build-system]") ? "python -m build" : "python -m build if configured; otherwise inspect manually";
  project.commands.lint = pyproject.includes("ruff") ? "ruff check ." : "ruff check . if configured; otherwise inspect manually";
}

function defaultCommands() {
  return Object.fromEntries(baseCommandKeys.map((key) => [key, "not detected"]));
}

function detectScriptCommands(packageManager, scripts) {
  const commands = defaultCommands();
  for (const key of Object.keys(commands)) {
    if (scripts[key]) commands[key] = key === "test" ? `${packageManager} test` : `${packageManager} run ${key}`;
  }
  return commands;
}

function detectOperationalSignals(rootDir, project) {
  const signals = emptySignals();
  detectEnvironment(rootDir, project, signals.environment);
  detectConfiguration(project, signals.configuration);
  detectServices(rootDir, project, signals.services);
  detectDeployment(project, signals.deployment);
  detectMaintenance(rootDir, project, signals.maintenance);
  detectTroubleshooting(project, signals);
  signals.data = detectData(rootDir, project);
  return signals;
}

function emptySignals() {
  return {
    environment: { detected: false, evidence: [], variables: [] },
    configuration: { detected: false, evidence: [], files: [] },
    services: { detected: false, evidence: [], services: [] },
    deployment: { detected: false, evidence: [], targets: [] },
    troubleshooting: { detected: false, evidence: [], checks: [] },
    maintenance: { detected: false, evidence: [], tasks: [] },
    data: false
  };
}

function detectEnvironment(rootDir, project, signal) {
  const envFiles = detectEnvFiles(rootDir);
  for (const file of envFiles) {
    addEvidence(signal, file);
    for (const variable of parseEnvFile(path.join(rootDir, file), file)) signal.variables.push(variable);
  }

  for (const sourceFile of sourceFiles(rootDir, project.sourceDirs)) {
    const content = fs.readFileSync(sourceFile, "utf8");
    const matches = [...content.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((match) => match[1]);
    for (const name of matches) {
      addEvidence(signal, path.relative(rootDir, sourceFile));
      signal.variables.push({
        name,
        required: "unknown",
        localExample: "",
        source: path.relative(rootDir, sourceFile),
        failureImpact: "Confirm what breaks when this value is missing."
      });
    }
  }

  dedupeVariables(signal);
  signal.detected = signal.evidence.length > 0 || signal.variables.length > 0;
}

function detectConfiguration(project, signal) {
  const files = project.configFiles.filter((file) => !file.startsWith(".env"));
  for (const file of files) {
    addEvidence(signal, file);
    signal.files.push({ path: file, purpose: configPurpose(file) });
  }
  signal.detected = signal.files.length > 0;
}

function detectServices(rootDir, project, signal) {
  for (const composeFile of ["docker-compose.yml", "compose.yml"]) {
    const file = path.join(rootDir, composeFile);
    if (!fs.existsSync(file)) continue;
    addEvidence(signal, composeFile);
    for (const service of parseComposeServices(file)) {
      signal.services.push({ name: service, source: composeFile, localHint: "Start with Docker Compose if configured.", healthHint: "Confirm service-specific health checks." });
    }
  }

  for (const dep of Object.keys(project.dependencies || {})) {
    if (!externalServices.includes(dep)) continue;
    addEvidence(signal, `dependency:${dep}`);
    signal.services.push({ name: dep, source: "package.json", localHint: "Confirm required account, emulator, or local service.", healthHint: "Confirm the service connection before development." });
  }

  if (fs.existsSync(path.join(rootDir, "prisma"))) {
    addEvidence(signal, "prisma/");
    signal.services.push({ name: "database", source: "prisma/", localHint: "Confirm database URL and migration workflow.", healthHint: "Run the configured database check or migration command." });
  }

  dedupeBy(signal.services, "name");
  signal.detected = signal.evidence.length > 0 || signal.services.length > 0;
}

function detectDeployment(project, signal) {
  const deploymentFiles = project.configFiles.filter((file) =>
    ["Dockerfile", "vercel.json", "netlify.toml", "fly.toml", "render.yaml", "railway.json", ".github/workflows"].some((candidate) => file === candidate || file.startsWith(`${candidate}/`))
  );
  for (const file of deploymentFiles) {
    addEvidence(signal, file);
    signal.targets.push({ name: deploymentTarget(file), source: file, command: project.commands.deploy });
  }
  if (project.commands.deploy !== "not detected") {
    addEvidence(signal, "script:deploy");
    signal.targets.push({ name: "scripted deploy", source: "package.json", command: project.commands.deploy });
  }
  dedupeBy(signal.targets, "source");
  signal.detected = signal.evidence.length > 0;
}

function detectMaintenance(rootDir, project, signal) {
  const taskMap = [
    ["migrate", project.commands.migrate],
    ["seed", project.commands.seed]
  ];
  for (const [name, command] of taskMap) {
    if (command === "not detected") continue;
    addEvidence(signal, `script:${name}`);
    signal.tasks.push({ name, command, source: "package.json" });
  }
  for (const dir of ["migrations", "prisma/migrations", "queues", "cron", "jobs"]) {
    if (!fs.existsSync(path.join(rootDir, dir))) continue;
    addEvidence(signal, `${dir}/`);
    signal.tasks.push({ name: path.basename(dir), command: "inspect manually", source: `${dir}/` });
  }
  dedupeBy(signal.tasks, "source");
  signal.detected = signal.evidence.length > 0;
}

function detectTroubleshooting(project, signals) {
  const signal = signals.troubleshooting;
  for (const key of ["doctor", "debug"]) {
    if (project.commands[key] === "not detected") continue;
    addEvidence(signal, `script:${key}`);
    signal.checks.push({ symptom: "Project health or debugging needed", check: project.commands[key], source: "package.json" });
  }
  const complexSetup = [signals.environment, signals.services, signals.deployment, signals.maintenance].filter((entry) => entry.detected).length >= 2;
  if (complexSetup) {
    addEvidence(signal, "complex setup signals");
    signal.checks.push({ symptom: "Local setup has multiple moving parts", check: "Review environment, services, and setup docs first.", source: "detected signals" });
  }
  signal.detected = signal.evidence.length > 0;
}

function detectData(rootDir, project) {
  return Boolean(
    fs.existsSync(path.join(rootDir, "prisma")) ||
      fs.existsSync(path.join(rootDir, "migrations")) ||
      project.frameworks.includes("prisma")
  );
}

function adaptiveHumanDocs(signals) {
  return [
    ["environment", signals.environment.detected],
    ["configuration", signals.configuration.detected],
    ["services", signals.services.detected],
    ["deployment", signals.deployment.detected],
    ["troubleshooting", signals.troubleshooting.detected],
    ["maintenance", signals.maintenance.detected]
  ]
    .filter(([, detected]) => detected)
    .map(([name]) => name);
}

function configCandidates() {
  return [
    ".env.example",
    ".env.local",
    "Dockerfile",
    "docker-compose.yml",
    "compose.yml",
    "next.config.js",
    "next.config.mjs",
    "vite.config.js",
    "vite.config.ts",
    "tsconfig.json",
    "ruff.toml",
    "pytest.ini",
    "vercel.json",
    "netlify.toml",
    "fly.toml",
    "render.yaml",
    "railway.json",
    ".github/workflows"
  ];
}

function detectEnvFiles(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  return fs
    .readdirSync(rootDir)
    .filter((entry) => entry === ".env.example" || entry === ".env.local" || entry.startsWith(".env."))
    .sort();
}

function parseEnvFile(file, source) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const [name, ...rest] = line.split("=");
      return {
        name: name.trim(),
        required: "unknown",
        localExample: rest.join("=").trim(),
        source,
        failureImpact: "Confirm what breaks when this value is missing."
      };
    });
}

function parseComposeServices(file) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  const services = [];
  let inServices = false;
  for (const line of lines) {
    if (/^services:\s*$/.test(line)) {
      inServices = true;
      continue;
    }
    if (inServices && /^\S/.test(line)) break;
    const match = inServices ? line.match(/^  ([A-Za-z0-9_-]+):\s*$/) : null;
    if (match) services.push(match[1]);
  }
  return services;
}

function sourceFiles(rootDir, sourceDirs) {
  return sourceDirs.flatMap((dir) => allFiles(path.join(rootDir, dir))).filter((file) => /\.(js|jsx|ts|tsx|mjs|cjs|py)$/.test(file));
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
  return jsFrameworks.filter((name) => dependencies && dependencies[name]).map((name) => name.replace(/^@prisma\/client$/, "prisma"));
}

function detectPythonFrameworks(content) {
  return ["fastapi", "django", "flask", "pytest", "ruff"].filter((name) => content.toLowerCase().includes(name));
}

function normalizeWorkspaces(workspaces) {
  if (Array.isArray(workspaces)) return workspaces;
  if (workspaces && Array.isArray(workspaces.packages)) return workspaces.packages;
  return [];
}

function allFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "Docs"].includes(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...allFiles(absolute));
    if (entry.isFile()) out.push(absolute);
  }
  return out;
}

function addEvidence(signal, evidence) {
  if (!signal.evidence.includes(evidence)) signal.evidence.push(evidence);
}

function dedupeVariables(signal) {
  const seen = new Set();
  signal.variables = signal.variables.filter((variable) => {
    if (seen.has(variable.name)) return false;
    seen.add(variable.name);
    return true;
  });
}

function dedupeBy(items, key) {
  const seen = new Set();
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const value = items[index][key];
    if (seen.has(value)) items.splice(index, 1);
    seen.add(value);
  }
}

function unique(values) {
  return [...new Set(values)];
}

function configPurpose(file) {
  if (file.includes("tsconfig")) return "TypeScript configuration";
  if (file.includes("vite")) return "Vite configuration";
  if (file.includes("next")) return "Next.js configuration";
  if (file.includes("ruff")) return "Python lint configuration";
  if (file.includes("pytest")) return "Python test configuration";
  if (file.includes("Docker") || file.includes("compose")) return "Container configuration";
  if (file.includes(".github/workflows")) return "CI workflow";
  return "Project configuration";
}

function deploymentTarget(file) {
  if (file.includes("vercel")) return "Vercel";
  if (file.includes("netlify")) return "Netlify";
  if (file.includes("fly")) return "Fly";
  if (file.includes("render")) return "Render";
  if (file.includes("railway")) return "Railway";
  if (file.includes("Dockerfile")) return "Docker";
  if (file.includes(".github/workflows")) return "GitHub Actions";
  return "deployment";
}
