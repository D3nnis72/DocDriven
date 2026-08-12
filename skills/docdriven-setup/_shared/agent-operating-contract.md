# Agent Operating Contract

Agents must use the smallest route that explains the current task.

## Route Graph

Projects use a root manifest and focused route shards:

```text
Docs/agent/
├── manifest.json
├── knowledge-index.json
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
  "schemaVersion": 2,
  "docsRoot": "Docs",
  "routeIndexes": [
    "agent/routes/architecture.json",
    "agent/routes/features.json",
    "agent/routes/interfaces.json",
    "agent/routes/operations.json"
  ],
  "knowledgeIndex": "agent/knowledge-index.json",
  "contextMap": "agent/context-map.md",
  "gaps": "agent/gaps.md"
}
```

Route shards use schema v2:

```json
{
  "schemaVersion": 2,
  "area": "features",
  "routes": [
    {
      "id": "feature-general",
      "priority": 100,
      "taskTypes": ["feature behavior", "user-visible behavior"],
      "knowledge": ["features.general"],
      "codeAreas": ["src/**"],
      "changeSignals": ["user-facing behavior", "feature logic"],
      "validation": ["test"],
      "owner": "unknown"
    }
  ]
}
```

## Route Semantics

- `id` is unique across all route shards.
- `priority` is lower-is-more-specific.
- `knowledge` is a list of knowledge IDs this route concerns.
- `codeAreas` supports exact paths and `**` suffix globs, relative to repo root.
- `changeSignals` are semantic descriptions of code changes that trigger doc review.
- `validation` names commands from `Docs/agent/validation.md` or concrete commands.
- Route shards should stay under 500 lines.
- Split large shards by package, domain, or route type.
- If no route matches, update a route shard or record the gap in `Docs/agent/gaps.md`.

## Knowledge Resolution

The agent resolves knowledge IDs to file paths using:

1. `Docs/agent/knowledge-index.json` (authoritative lookup)
2. Convention: `{scope}.{concept}` → `knowledge/{scope}/{concept}.md`

After resolution, the agent reads canonical docs (`authority: canonical`) first,
then follows relationships (`extends`, `includes`) for depth.

## Context Map

`Docs/agent/context-map.md` is the readable route overview. Required columns:

| Route ID | Task type | Knowledge | Code areas | Change signals | Validation | Owner |
|---|---|---|---|---|---|---|

## Default Workflow

1. Classify the task.
2. Read `Docs/agent/manifest.json`.
3. Load the smallest relevant route shard.
4. Resolve the route's `knowledge` IDs to files.
5. Read canonical knowledge docs first.
6. Follow relationships for additional context as needed.
7. Change code and docs together.
8. Identify affected knowledge IDs from the change.
9. Propagate: update canonical → specializations → views → flag dependents.
10. Update route shards when ownership, validation, or structure changes.
11. Record unknowns in `Docs/agent/gaps.md`.
12. Run route validation.

## Propagation Rules

After a change, determine affected knowledge IDs and propagate:

1. Update the affected canonical doc.
2. Follow `extends` → update specializations.
3. Follow `includes` → verify parent coherence.
4. Follow `derivedFrom` (reverse) → update derived views.
5. Follow `dependsOn` (reverse) → flag for review.

Never update a view before its canonical source. If uncertain whether a
dependent needs updating, record in `Docs/agent/gaps.md`.

## Project Continuity

- Prefer documented long-term project consistency over local convenience.
- Do not invent default folders, architecture styles, or coding conventions.
- If docs do not explain a durable convention, inspect nearby code and record the gap.
- Agents must not create project structure from generic preference.
