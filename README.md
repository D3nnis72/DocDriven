# DocDriven

DocDriven gives your agent a compact, always-current documentation map of your
codebase — organized as a lightweight knowledge graph with explicit identity,
relationships, and dependency-aware propagation.

We do not care about pretty documentation. We care that the agent understands
the system.

That is the whole point.

The agent needs the smallest amount of current context that lets it write the
best possible code. Not more.

DocDriven keeps documentation compact, routed, and current. Every knowledge doc
has a stable identity and explicit relationships. When something changes, the
agent knows exactly what else is affected — not by guessing, but by traversing
the dependency graph.

The failure mode is obvious: if the agent does not understand the codebase, it
guesses. In large projects that means invented types, duplicated decisions,
parallel systems, stale assumptions, and code that looks plausible but does not
fit.

DocDriven exists to stop that.

## The Big Idea

Markdown behaves like a lightweight knowledge graph.

Every important doc has a stable identity (`id: frontend.architecture`) that
survives renames and restructuring. Docs declare explicit relationships
(`extends`, `includes`, `dependsOn`, `derivedFrom`) that form a dependency graph.
Routes reference knowledge IDs instead of file paths. After a change, the agent
traverses the graph to find everything that needs updating.

This means:

- **No guessing** which docs are related — the relationships are declared.
- **No duplication** — each concept has one canonical owner, everything else references it.
- **No stale views** — derived docs explicitly declare their sources, so staleness is mechanically detectable.
- **No manual propagation** — the graph tells the agent exactly what to update after a change.

## Quickstart

Install all skills:

```bash
npx skills add D3nnis72/DocDriven
```

Install one skill:

```bash
npx skills add D3nnis72/DocDriven --skill docdriven
```

Then, in a project:

1. Run `docdriven-setup`.
2. Review the detected project dynamics and generated structure.
3. Work normally with `docdriven`.
4. Run `docdriven-audit` before major merges or periodically.

If you do not know how to start, give this README to your coding agent and tell
it to set up DocDriven for the project. The important part is that it keeps the
system in Markdown files, updates them while it works, and uses the knowledge
graph before changing code.

## How It Works

It starts when an agent enters a project. Instead of jumping straight into code,
the agent first asks: what kind of work is this, and where is the smallest
reliable context for it?

`docdriven-setup` scans the repository. It looks at package usage, frameworks,
scripts, source layout, config files, and validation commands. From that scan, it
creates:

- A `Docs/` tree with frontmatter identity on every doc
- Route shards that reference knowledge IDs (not file paths)
- A knowledge index mapping IDs to files
- A repo-local skill telling future agents how to work in this project

When an agent works on the project, it reads the route graph, resolves the
relevant knowledge IDs, reads canonical docs first, then follows relationships
for depth. After changing code, it propagates through the dependency graph:
update the canonical source, then specializations, then views, then flag
consumers. If something is uncertain, it records the gap.

`docdriven-audit` checks whether the graph is structurally sound. It validates
frontmatter integrity, relationship coherence, route resolution, and content
quality. In change-scoped mode, it takes a diff and traverses the graph to find
every doc the change made false.

## The Core Model

DocDriven separates executable truth from explanatory truth, organized as a
knowledge graph.

- Code, tests, configs, schemas, migrations, and build outputs are executable evidence.
- `Docs/knowledge/` contains canonical explanation — each doc has `authority: canonical`.
- `Docs/human/` contains derived views for people — each doc has `derivedFrom` pointing to its sources.
- `Docs/agent/` contains the routing protocol — manifest, routes, knowledge index.
- `Docs/tmp/` contains temporary material — not truth until promoted.

The rule:

> Code and checks prove truth. Knowledge explains truth. Human docs are derived
> views. Agent docs route to it. Every concept has one canonical owner.

## Knowledge Identity

Every durable doc has YAML frontmatter:

```yaml
---
id: frontend.architecture
type: architecture
scope: frontend
authority: canonical
extends: design.system
includes:
  - frontend.testing
  - frontend.state
dependsOn:
  - config.frontend
updateWhen:
  - shared component architecture changes
  - state management pattern changes
---
```

Relationship types:

| Relationship | Meaning |
|---|---|
| `extends` | I am a specialization of this base concept |
| `includes` | My full picture involves these sub-concepts |
| `dependsOn` | I assume this other knowledge is true |
| `derivedFrom` | I summarize or reformat these canonical sources |

The key principle: **a concept is documented once in its canonical owner. Other
docs reference it instead of restating it.**

## Route Schema v2

Routes reference knowledge IDs instead of repeating file paths:

```json
{
  "schemaVersion": 2,
  "area": "frontend",
  "routes": [
    {
      "id": "frontend",
      "priority": 100,
      "taskTypes": ["frontend change", "UI component", "styling"],
      "knowledge": ["frontend.architecture", "design.system"],
      "codeAreas": ["src/frontend/**"],
      "changeSignals": ["shared UI components", "theme"],
      "validation": ["test"],
      "owner": "unknown"
    }
  ]
}
```

- `knowledge` — which knowledge IDs this route concerns
- `changeSignals` — what kinds of code changes should trigger a doc review
- No more `readFirst`, `canonicalDocs`, or `updateDocs` — the docs declare their own roles

## The Workflow

```text
Task → Route → Knowledge IDs → Canonical Docs → Work → Propagate → Validate
```

After every change, the agent propagates through the graph:

1. Update the affected canonical doc
2. Follow `extends` → update specializations
3. Follow `includes` → verify parent coherence
4. Follow `derivedFrom` (reverse) → update derived views
5. Follow `dependsOn` (reverse) → flag consumers for review

This is not optional. If a dependent exists, the agent verifies or updates it.
If uncertain, it records the gap.

## What's Inside

### Skills

| Skill | When | Purpose |
|-------|------|---------|
| `docdriven-setup` | Once per project | Scan repo, create docs structure with knowledge graph |
| `docdriven` | Every task | Read-before, work, propagate-after |
| `docdriven-audit` | Periodic / CI | Validate structure, graph coherence, and drift |

### Validation Scripts

| Script | Purpose |
|--------|---------|
| `check-frontmatter` | Every doc has valid identity, types, required fields |
| `check-graph` | Relationships are coherent (no cycles, bidirectional, valid targets) |
| `check-impact` | Given a changed ID, shows what else needs review |

```bash
node scripts/check-frontmatter.mjs --root .
node scripts/check-graph.mjs --root .
node scripts/check-impact.mjs --changed frontend.architecture
```

### Generated Project Structure

```text
Docs/
|-- README.md
|-- human/                      (derived views for people)
|   |-- overview.md             derivedFrom: [architecture.general, features.general]
|   |-- setup.md                derivedFrom: [operations.general]
|   |-- commands.md             derivedFrom: [operations.general]
|   |-- architecture.md         derivedFrom: [architecture.general]
|   `-- adaptive files when detected
|-- agent/                      (routing protocol)
|   |-- manifest.json           schema v2, points to route shards
|   |-- knowledge-index.json    maps IDs to file paths
|   |-- init-scan.md
|   |-- context-map.md
|   |-- validation.md
|   |-- writing-style.md
|   |-- naming.md
|   |-- gaps.md
|   `-- routes/
|       |-- architecture.json
|       |-- features.json
|       |-- interfaces.json
|       `-- operations.json
|-- knowledge/                  (canonical truth, each doc has id + authority)
|   |-- README.md
|   |-- architecture/
|   |-- features/
|   |-- interfaces/
|   `-- operations/
`-- tmp/
    `-- README.md
```

### Shared Skill Files

`npx skills` installs one skill directory at a time. `skills/_shared/` is the
canonical source, and each skill carries a vendored copy.

Edit `skills/_shared/`, then run:

```bash
node scripts/sync-shared.mjs
```

Two checks keep this honest and run in CI:

- `node scripts/sync-shared.mjs --check` fails when a copy drifts.
- `node scripts/verify-install.mjs` copies each skill out and verifies imports resolve.

## Why This Architecture

The knowledge graph solves three problems that flat documentation cannot:

**1. Propagation.** When `frontend.architecture` changes, what else becomes
false? Without explicit relationships, the agent has to grep and guess. With the
graph, it traverses `extends`, `derivedFrom`, and `dependsOn` to get a complete
list mechanically.

**2. Duplication.** If two docs explain the same concept, which one is truth?
Without identity, you get drift. With `authority: canonical` on exactly one doc
and `derivedFrom` on everything else, duplication is structurally prevented.

**3. Staleness.** Is this summary still current? Without `derivedFrom`, you
cannot tell. With it, you can check whether the source has changed since the
view was last updated — today by convention, later by automation.

## Migration Path

This system is designed as version zero of a future knowledge fabric:

```text
Today:                          Later:
─────                           ─────
Markdown frontmatter      →     Artifact database
Route JSON                →     Query API
Explicit links            →     Graph database
Git diff + agent          →     Automated invalidation
check-impact script       →     MCP server
```

The conceptual model remains the same. `id: frontend.architecture` becomes a
database row. `derivedFrom: [frontend.architecture]` becomes a graph edge.
Nothing is thrown away.

## Adaptive Architecture

Architecture docs describe how the current project is organized. They are an
adaptive contract, not a template.

Architecture docs should explain:

- current system shape and boundaries
- dependency direction and import rules
- structural ownership for code, config, contracts, and packages
- reuse and composition patterns
- durable coding patterns specific to this project

Agents must not hardcode favorite folders, architecture styles, or coding
conventions. If the project has a documented rule, follow it. If the rule is
missing, inspect nearby code, choose the smallest consistent change, and record
the gap.

## Philosophy

- Documentation is infrastructure.
- Markdown is a lightweight knowledge graph.
- Every concept has one canonical owner.
- Relationships are explicit, not implied.
- Propagation is structural, not ad-hoc.
- The system is agent-first.
- Human docs are derived views, not independent truth.
- Compact, current, routed context beats long prose.
- Code and checks are evidence.
- Agents should read the smallest useful context, not the whole docs folder.
- Agents should follow documented project style, not generic agent taste.
- Meaningful code changes propagate through the knowledge graph in the same task.
- Missing docs are part of the work, not a later cleanup.
- Uncertainty should be recorded, not hidden.
- Audits should validate graph integrity, not just lint Markdown.
