---
name: docdriven-setup
description: Use once in a repository to initialize Documentation Driven Development. Scans the project, creates the Docs tree with knowledge identities and relationships, generates route shards with schema v2, and produces a repo-local project-docdriven skill.
---

# DocDriven Setup

Use this skill to make a repository DocDriven-aware. This is a one-time setup
that scans the project, creates the documentation structure, and generates the
routing protocol.

## Required Workflow

1. Inspect repository files, existing docs, and project shape.
2. Run a Project Dynamics Scan.
3. Decide the docs root, defaulting to `Docs/`.
4. Create the `Docs/` tree with proper frontmatter on all knowledge and view docs.
5. Generate route shards using schema v2 (knowledge IDs, not file paths).
6. Generate `Docs/agent/knowledge-index.json` mapping IDs to paths.
7. Generate `.agents/skills/project-docdriven/SKILL.md`.
8. Run `check-frontmatter` and `check-graph` to verify the output.
9. Report what was detected, created, and what is uncertain.

## Project Dynamics Scan

Detect:

- package usage: package manager, workspaces, scripts, dependencies
- code shape: source dirs, app dirs, package dirs, tests
- runtime dynamics: config, env, CI, deployment, database or schema tools
- architecture dynamics: structural ownership, code organization, contract locations, configuration flow, dependency direction, reuse/composition rules
- validation reality: actual test, build, lint, typecheck, and dev commands
- documentation fit: what humans need, what knowledge areas exist, what routes are warranted

## Knowledge Identity Generation

Every generated knowledge doc gets frontmatter with:

- `id` following the naming convention (`{scope}.{concept}`)
- `type` appropriate to the content
- `authority: canonical` for knowledge docs
- Initial `dependsOn` and `includes` relationships where detectable
- `updateWhen` triggers where obvious

Every generated human doc gets:

- `id` following view convention (`human.{scope}.{concept}`)
- `type: view`
- `derivedFrom` pointing to the canonical sources

## Route Schema v2

Generated routes use the new shape:

```json
{
  "schemaVersion": 2,
  "area": "architecture",
  "routes": [
    {
      "id": "architecture-general",
      "priority": 100,
      "taskTypes": ["architecture change", "code organization"],
      "knowledge": ["architecture.general"],
      "codeAreas": ["src/**"],
      "changeSignals": ["structural ownership", "dependency direction"],
      "validation": ["test"],
      "owner": "unknown"
    }
  ]
}
```

Routes reference knowledge IDs. The agent resolves IDs to files via
`knowledge-index.json` or convention.

## Dynamic Build

The generated tree is a base scaffold. Adapt it to the repository:

- Classify the project: type, size, maturity, direction, risk profile.
- Keep the smallest useful docs surface.
- Remove docs for absent concepts.
- Create project-specific docs when humans or agents have distinct tasks.
- Record uncertain docs in `Docs/agent/gaps.md`.
- Do not turn the scaffold into a mandatory architecture.
- Document reusable primitives when the project has them.

## Generated Repo-Local Skill

The repo-local skill (`.agents/skills/project-docdriven/SKILL.md`) tells future
agents how to work in this specific project. It contains:

- project shape and dynamics
- knowledge IDs and their scopes
- required workflow using schema v2
- project continuity rules
- validation commands
- update protocol referencing propagation

## Generator

Prefer running `scripts/setup-docdriven.mjs` for the base scaffold, then adjust
content and structure to match the project.

## References

- Read `_shared/knowledge-schema.md` for the frontmatter schema.
- Read `_shared/docdriven-structure.md` for the documentation model.
- Read `_shared/agent-operating-contract.md` for route protocol.
- Read `_shared/writing-style.md` before writing docs.
