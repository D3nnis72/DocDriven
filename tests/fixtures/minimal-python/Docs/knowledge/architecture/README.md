---
id: architecture.general
type: architecture
scope: architecture
authority: canonical
dependsOn: []
updateWhen:
  - system boundaries change
  - dependency direction changes
  - structural ownership changes
  - configuration flow changes
  - reuse patterns change
---
# Architecture

Architecture docs describe how this project is actually structured. They are an
adaptive contract for long-term project continuity.

## Adaptive Architecture Contract

Document current system shape, boundaries, dependency direction, runtime flow,
and cross-cutting patterns. Add, split, rename, or consolidate structure only
when repository evidence justifies it.

## Project Continuity Rules

- Follow project docs, nearby code, formatter, linter, and validation commands.
- Prefer long-term project consistency over local convenience.
- New durable conventions require docs and route updates.
- If the convention is unclear, record a gap.

## Structural Ownership

Document where authoritative code contracts live: configuration modules, API
contracts, schemas, domain models, provider adapters, shared utilities.

Do not copy type or schema definitions into docs. Explain where code lives,
which module owns it, and when changes require docs updates.

## Configuration First

Runtime configuration should be discoverable through documented paths. Document
where configuration is loaded, validated, and overridden.

## Reuse And Composition

Prefer existing project primitives over new one-off implementations. Keep
feature-local code local until reuse is real.

## Current Structure

Replace this section with verified project structure after inspecting the repository.

## Boundaries And Dependency Direction

Record allowed dependency direction and import boundaries when verified.

## Coding Patterns

Record durable coding patterns that future agents should follow.

## Open Questions

Record uncertain architecture ownership in `../../agent/gaps.md`.
