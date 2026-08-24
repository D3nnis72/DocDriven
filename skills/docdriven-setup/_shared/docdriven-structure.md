# DocDriven Structure

DocDriven separates executable truth from explanatory truth and organizes
documentation as a lightweight knowledge graph with explicit identity and
relationships.

## Documentation Surfaces

- Code, tests, configs, schemas, migrations, and build outputs are executable evidence.
- `Docs/knowledge/` contains canonical explanation of current project truth.
- `Docs/human/` contains short human-facing orientation and derived views.
- `Docs/agent/` contains the protocol agents use to find and update context.
- `Docs/tmp/` contains temporary plans, visions, notes, and working material.

## Default Scaffold

```text
Docs/
├── README.md
├── human/
├── agent/
│   ├── manifest.json
│   ├── knowledge-index.json
│   ├── init-scan.md
│   ├── context-map.md
│   ├── gaps.md
│   └── routes/
├── knowledge/
└── tmp/
```

## Knowledge Identity

Every durable documentation file has YAML frontmatter declaring its identity,
type, and relationships. See the knowledge-schema reference for the full schema.

Key rules:

- Every concept has exactly one canonical owner (`authority: canonical`).
- Derived views (`type: view`) never establish truth independently.
- Relationships (`extends`, `includes`, `dependsOn`, `derivedFrom`) form the
  dependency graph that drives propagation after changes.
- IDs are stable identities that survive file renames and restructuring.
- When another knowledge ID owns a concept, reference it by ID. Do not restate
  its content. A single orienting sentence is acceptable.

## Overview Docs

Overview docs (`type: overview`) serve a dual purpose:
- **For humans:** orientation on what exists in a knowledge area.
- **For agents:** navigation hub to decide which children to load for a task.

The agent reads an overview first and selects only relevant children based on the
current task. It does not load all children by default.

```yaml
---
id: payments
type: overview
scope: payments
authority: canonical
sourceVersion: e7f21a3
includes:
  - payments.flow
  - payments.providers
  - payments.errors
---
# Payments

Brief domain orientation.

## Checkout Flow

See → `payments.flow`

## Providers

See → `payments.providers`
```

Rules:
- One sentence of context per child (max). Write it to help the agent decide
  relevance — not just describe the child, but indicate what tasks would need it.
- Detail lives in the child doc — never restate it.
- If the summary exceeds one sentence, the content belongs in the child.

## Grounding and Versioning

Every knowledge doc carries `sourceVersion` — a short commit hash recording
what code or doc state this reflects. The agent updates it automatically during
propagation.

Leaf docs that explain specific code carry `groundedIn` listing the source files.
The audit skill compares `sourceVersion` against Git history to detect stale docs
mechanically.

## Canonical vs Views

```text
Canonical Knowledge (Docs/knowledge/)
        ↓ derivedFrom
Derived Views (Docs/human/, Docs/agent/)
```

Update the canonical source first, then synchronize affected views. Never
independently establish truth in a derived view.

## Route Schema v2

Routes reference knowledge IDs instead of file paths:

```json
{
  "schemaVersion": 2,
  "area": "frontend",
  "routes": [
    {
      "id": "frontend",
      "priority": 100,
      "taskTypes": ["frontend change", "UI component"],
      "knowledge": ["frontend.architecture", "design.system"],
      "codeAreas": ["src/frontend/**"],
      "changeSignals": ["shared UI components", "theme"],
      "validation": ["test"],
      "owner": "unknown"
    }
  ]
}
```

The agent resolves knowledge IDs to files via `knowledge-index.json` or
convention (`{scope}.{concept}` → `knowledge/{scope}/{concept}.md`).

## Core Rules

- Code and checks prove truth; knowledge explains it; human docs summarize it;
  agent docs route to it; tmp docs are not truth until promoted.
- The scaffold is adaptive, not mandatory. Add, omit, split, or consolidate docs
  when the project shape requires it.
- Do not duplicate canonical content. Reference the knowledge ID instead.
- Follow the project's documented architecture and coding style.
- Prefer long-term project consistency over local convenience.

## Adaptive Architecture Contract

Architecture docs describe the actual repository structure and durable
conventions. They must capture:

- current system shape and major boundaries
- dependency direction and import boundaries
- structural ownership for config, code contracts, schemas, and packages
- reuse and composition rules for components, hooks, helpers, and adapters
- durable coding patterns specific to this project
- when to add, split, rename, or consolidate structure

Agents must not hardcode generic architecture preferences. They must follow
documented project architecture, executable style config, and validation commands.

## Dynamic Structure

The generated tree is a starting scaffold. Agents choose the final shape from
project evidence and reader needs:

- Add a human doc only when a person has a distinct task or question.
- Add a knowledge doc only when durable truth needs a canonical home and that
  truth is not already expressed in code.
- Never create a knowledge doc for something fully expressed in grounding sources
  (types, schemas, API specs, config). Knowledge exists only for what code can't
  tell you: decisions, constraints, boundaries, strategies, ownership rules.
- Split routes only when it reduces context load or clarifies ownership.
- Do not create docs for absent concepts.
- Record uncertain needs in `Docs/agent/gaps.md`.
- Large projects need stronger routing, clearer ownership, narrower shards, and
  better validation evidence than small projects.

## Hierarchy Growth

When a knowledge folder accumulates 6+ leaf docs at the same level, group
related docs into a subfolder and create an overview doc for that subfolder.
This creates the navigable hierarchy that enables progressive routing.

**When to promote:** During propagation or when creating a new knowledge doc, if
the target folder has 6+ siblings, consider whether a group shares a concern
that deserves its own subfolder + overview.

**Common knowledge categories** (use as inspiration, not a fixed taxonomy):

| Category | What belongs here | Nesting examples |
|---|---|---|
| `architecture/` | System shape, boundaries, dependency rules, structural decisions | `architecture/testing/`, `architecture/security/`, `architecture/data/` |
| `features/` | Business capabilities, user-facing behavior | `features/auth/`, `features/messaging/` |
| `integrations/` | Third-party services, external systems, providers | `integrations/payments/`, `integrations/auth/` |
| `operations/` | Deployment, CI/CD, environments, monitoring | `operations/ci/`, `operations/monitoring/` |
| `design-system/` | Tokens, visual components, patterns, accessibility | `design-system/tokens/`, `design-system/components/` |
| `security/` | Auth flows, permissions, data handling, compliance | Could nest under `architecture/security/` if small |
| `testing/` | Test strategy, coverage, fixtures, test infra | Top-level if complex; `architecture/testing/` if just strategy |
| `conventions/` | Coding patterns, naming, file structure, error handling | Often stays top-level as cross-cutting reference |
| `workflows/` | Multi-step processes, state machines, orchestration | Distinct from features: flows that span multiple features |
| `configuration/` | Feature flags, env vars, runtime config, tenant settings | Could nest under `operations/config/` if small |

**Deciding question:** Where would the agent look first for this concept?

**Category disambiguation:**
- Rule constrains **where code lives or how modules depend on each other** → `architecture/`
- Rule constrains **how code is written within a module** → `conventions/`
- Features = what the system does (capabilities). Workflows = how a process flows
  across multiple features (orchestration).

**Rules:**
- Only create a category if 2+ docs belong there. One doc = keep in parent.
- Categories can live at any level — top-level or nested.
- The default setup (`architecture/`, `features/`, `operations/`) covers ~80% of
  projects. Add from the catalog when the project demands it.

## Human Docs

`Docs/human/` usually starts with `overview.md`, `setup.md`, `commands.md`, and
`architecture.md`. Projects with operational evidence may have adaptive docs such
as `environment.md`, `configuration.md`, `services.md`, `deployment.md`,
`troubleshooting.md`, and `maintenance.md`.

Human docs contain actionable orientation. Deeper truth belongs in
`Docs/knowledge/`, with human docs linking there via knowledge IDs.
