---
name: project-docdriven
description: Use when working in this repository. Reads the project knowledge graph before code changes and propagates updates through the dependency graph after changes.
---

# Project DocDriven

## Project Shape

- Stack: JavaScript/Node.js
- Package manager: npm
- Docs root: Docs/

## Project Dynamics

Frameworks:
- none detected

Workspaces:
- none detected

Source dirs:
- src

Config files:
- none detected

Adaptive human docs:
- none detected

Operational signals:
- none detected

## Required Workflow

1. Read Docs/agent/manifest.json.
2. Load the smallest matching route shard.
3. Resolve route `knowledge` IDs via knowledge-index.json.
4. Read canonical docs (`authority: canonical`) first.
5. Follow `extends` and `includes` for depth.
6. Change code and docs together.
7. Identify affected knowledge IDs from the change.
8. Propagate: canonical → specializations → views → flag dependents.
9. Run route validation.
10. Record gaps in Docs/agent/gaps.md.

## Propagation Protocol

After any meaningful change:

1. Determine which knowledge IDs were affected.
2. Update the canonical doc first.
3. Follow `extends` → update specializations.
4. Follow `includes` → verify parent coherence.
5. Follow `derivedFrom` (reverse) → update views.
6. Follow `dependsOn` (reverse) → flag for review.

Never update a view before its canonical source. If uncertain, record in gaps.

## Project Continuity

Follow this repository's documented architecture, coding style, configuration
flow, route ownership, and validation commands before applying generic preferences.

Do not invent default folders, architecture styles, or coding conventions. If a
durable convention is unclear, inspect nearby code, choose the smallest locally
consistent change, and record the gap.

Before creating new code, search for reusable project primitives. Keep
feature-local code local until reuse is real.

## Knowledge Categories

- architecture
- features
- interfaces
- operations

## Validation

- test: npm test
- build: npm run build
- lint: not detected
- typecheck: not detected
- dev: not detected
- deploy: not detected
- debug: not detected
- migrate: not detected
- seed: not detected
- docs: not detected
- audit: not detected
- doctor: not detected

## Update Protocol

- Behavior changes update the affected canonical knowledge doc, then propagate.
- Architecture changes update `architecture.general` and the relevant route shard.
- Operations changes update `operations.general` and affected views.
- Route, ownership, or validation changes update manifest and route shards.
- New relationships require updating frontmatter on affected docs.
