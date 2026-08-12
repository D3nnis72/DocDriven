---
name: docdriven
description: Use when working in a Documentation Driven Development project or when creating, changing, or maintaining docs-driven architecture, implementation, or project documentation. Enforces read-before-change, dependency-aware propagation after changes, one canonical owner per concept, and separate human, agent, knowledge, and tmp documentation surfaces.
---

# DocDriven

DocDriven is Documentation Driven Development for agents and humans.

## Required Workflow

1. Check whether the project has a repo-local DocDriven skill.
2. If it exists, read it before continuing.
3. Read `Docs/agent/manifest.json` when present.
4. Load only the smallest relevant route shard.
5. Resolve the route's `knowledge` IDs to files via `knowledge-index.json` or convention.
6. Read canonical docs (`authority: canonical`) first.
7. Follow `extends` and `includes` for additional context as needed.
8. Do the work — change code and docs together.
9. Propagate changes through the knowledge graph (see Propagation below).
10. Run validation from the route.

## Core Rules

- Code and checks prove truth.
- `Docs/knowledge/` explains current truth. Each concept has one canonical owner.
- `Docs/human/` summarizes for people as derived views.
- `Docs/agent/` routes agents.
- `Docs/tmp/` is temporary and not truth.
- Never independently establish truth in a derived view.
- Reference knowledge IDs instead of duplicating content.
- Follow the project's documented architecture and coding style.
- Prefer long-term project consistency over local convenience.

## Propagation

After any change, identify which knowledge IDs were affected and propagate:

1. **Update canonical docs** — the affected knowledge ID's canonical file.
2. **Follow extends** — update specializations that build on this concept.
3. **Follow includes** — verify the parent doc remains coherent.
4. **Follow derivedFrom (reverse)** — update views that summarize this source.
5. **Follow dependsOn (reverse)** — flag consumers for review.

Rules:

- Canonical first. Always update the canonical owner before touching dependents.
- Propagation is not optional. If a dependent exists, verify or update it.
- Flag, don't guess. If uncertain, write to `Docs/agent/gaps.md` rather than making a potentially wrong edit.
- Use `changeSignals` as a heuristic: if the diff semantically matches a route's change signals, review that route's knowledge IDs even if no doc was directly touched.

## Dynamic Structure

The DocDriven tree is a starting scaffold. Choose the final docs from project
evidence and reader needs.

- Add a human doc only when a person has a distinct task or question.
- Add a knowledge doc only when durable current truth needs a canonical home.
- Split routes only when it reduces context load or clarifies ownership.
- Do not create docs for absent concepts.
- Record uncertain needs in `Docs/agent/gaps.md`.

## Project Continuity

Agents must not introduce favorite folders, architecture styles, config patterns,
or coding preferences. Use project evidence in this order:

1. Executable truth (formatter, linter, type, schema, config, test files)
2. `Docs/agent/` routes and validation protocol
3. `Docs/knowledge/` canonical docs
4. Nearby code when docs do not yet explain the convention

Before creating new code, search for existing reusable primitives. Keep
feature-local code local until reuse is real.

## Meaningful Changes

Update docs for behavior, public interface, config, environment, deployment,
dependency, schema, migration, architecture, ownership, and validation changes.

After any large task, multi-step implementation, refactor, or architectural
change, propagate through the knowledge graph before claiming the work complete.

## Stale Or Missing Docs

- If docs contradict code, inspect code and update the canonical doc first.
- If truth cannot be verified, record uncertainty in `Docs/agent/gaps.md`.
- If no route matches, update the route graph or record the gap.
- Missing documentation is part of the task.

## Completion Evidence

When finishing DocDriven work, report:

- Knowledge IDs read
- Routes used
- Code changed
- Canonical docs updated
- Propagation performed (which dependents were updated/verified/flagged)
- Validation run
- Gaps recorded

## References

- Read `_shared/knowledge-schema.md` for the frontmatter and relationship schema.
- Read `_shared/docdriven-structure.md` for the documentation model.
- Read `_shared/agent-operating-contract.md` for route protocol.
- Read `_shared/writing-style.md` before writing or editing docs.
