# Agent Operating Contract

Agents must use the smallest route that explains the current task.

## Route Graph

Large projects use a small root manifest and focused route shards:

```text
Docs/agent/
├── manifest.json
├── init-scan.md
├── context-map.md
├── gaps.md
└── routes/
    ├── architecture.json
    ├── features.json
    ├── interfaces.json
    └── operations.json
```

`manifest.json` is the machine-readable entry point:

```json
{
  "schemaVersion": 1,
  "docsRoot": "Docs",
  "routeIndexes": [
    "agent/routes/architecture.json",
    "agent/routes/features.json",
    "agent/routes/interfaces.json",
    "agent/routes/operations.json"
  ],
  "contextMap": "agent/context-map.md",
  "gaps": "agent/gaps.md"
}
```

Route shards use this shape:

```json
{
  "schemaVersion": 1,
  "area": "features",
  "routes": [
    {
      "id": "feature-general",
      "priority": 100,
      "taskTypes": ["feature behavior", "user-visible behavior"],
      "readFirst": ["knowledge/features/README.md"],
      "canonicalDocs": ["knowledge/features/README.md"],
      "codeAreas": ["src/**"],
      "updateDocs": ["knowledge/features/README.md"],
      "validation": ["test"],
      "owner": "unknown"
    }
  ]
}
```

## Route Semantics

- `id` is unique across all route shards.
- `priority` is lower-is-more-specific.
- Documentation paths are relative to `Docs/`.
- Code paths are relative to the repository root.
- `codeAreas` supports exact paths and `**` suffix globs.
- `validation` names commands from `Docs/agent/validation.md` or concrete commands.
- Route shards should stay under 500 lines.
- Split large shards by package, domain, or route type.
- If no route matches, update a route shard or record the gap in `Docs/agent/gaps.md`.
- Architecture routes cover structural ownership, configuration patterns, code
  organization, contract locations, dependency direction, and durable coding
  patterns.
- Architecture routes also cover reusable components, shared primitives, hooks,
  helpers, adapters, and composition patterns when they affect long-term project
  structure.
- Agents must not create project structure from generic preference. New folders,
  docs, or route shards need repository evidence and docs updates.

## Context Map

`Docs/agent/context-map.md` is the readable route view. It should include route
IDs that match the JSON route graph.

Required columns:

| Route ID | Task type | Read first | Canonical docs | Code areas | Update docs | Validation | Owner |
|---|---|---|---|---|---|---|---|

Operational projects may route to adaptive human docs:

| Route ID | Task type | Read first | Canonical docs | Code areas | Update docs | Validation | Owner |
|---|---|---|---|---|---|---|---|
| operations-environment | Environment config | `human/environment.md` | `knowledge/operations/README.md` | env examples, config files | setup, environment, operations docs | documented setup check | operations |
| operations-deployment | Deployment | `human/deployment.md` | `knowledge/operations/README.md` | deploy config, workflows | deployment, commands, validation | deploy preflight | operations |

Every route must define read targets, code areas, update targets, validation,
and ownership.

Default workflow:

1. Classify the task.
2. Read `Docs/agent/manifest.json` if present.
3. Load the smallest relevant route shard.
4. Read the route's `readFirst` docs.
5. Inspect the route's `codeAreas`.
6. Change code and docs together.
7. Update `updateDocs` and route shards when ownership, validation, or structure changes.
8. Record unknowns in `Docs/agent/gaps.md`.
9. Run route validation.

Project continuity rule: prefer documented long-term project consistency over
local convenience. If the docs do not explain a durable convention, inspect
nearby code and record the gap instead of silently starting a parallel pattern.
