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

Overview docs (`type: overview`) are the entry point to a knowledge area. They
provide brief orientation and reference children by ID:

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
- One sentence of context per child (max).
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
- Add a knowledge doc only when durable truth needs a canonical home.
- Split routes only when it reduces context load or clarifies ownership.
- Do not create docs for absent concepts.
- Record uncertain needs in `Docs/agent/gaps.md`.
- Large projects need stronger routing, clearer ownership, narrower shards, and
  better validation evidence than small projects.

## Human Docs

`Docs/human/` usually starts with `overview.md`, `setup.md`, `commands.md`, and
`architecture.md`. Projects with operational evidence may have adaptive docs such
as `environment.md`, `configuration.md`, `services.md`, `deployment.md`,
`troubleshooting.md`, and `maintenance.md`.

Human docs contain actionable orientation. Deeper truth belongs in
`Docs/knowledge/`, with human docs linking there via knowledge IDs.
