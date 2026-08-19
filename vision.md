# DocDriven Vision

DocDriven is a Documentation Driven Development system for agents and humans.
Its purpose is not to create more documentation. Its purpose is to make a
project easier to understand, change, verify, and maintain by using
documentation as a shared context layer organized as a lightweight knowledge
graph.

## Core Idea

Documentation is a knowledge graph, not a folder of files.

Every important doc has a stable identity that survives renames. Docs declare
explicit relationships that form a dependency graph. Routes reference knowledge
IDs instead of file paths. After a change, the agent traverses the graph to
find everything that needs updating.

This means Markdown behaves like a database — but one you can read, edit, grep,
and version with git. The frontmatter is the schema. The relationships are the
edges. The docs are the nodes.

## The Problem

Most project documentation fails in one of three ways:

1. **Duplication.** The same fact exists in multiple places. When one is updated,
   the others drift. Agents cannot tell which is canonical.

2. **Implicit relationships.** A summary depends on an architecture doc, but
   nothing declares that dependency. When the architecture changes, the summary
   becomes silently stale.

3. **Manual propagation.** After a change, the agent guesses which docs to
   update by scanning filenames and content. In large projects, it misses things.

DocDriven solves all three structurally:

- **One canonical owner per concept** (`authority: canonical`).
- **Explicit relationships** (`extends`, `includes`, `dependsOn`, `derivedFrom`).
- **Mechanical propagation** via graph traversal after every change.

## Architecture

### Documentation Surfaces

DocDriven separates executable truth from explanatory truth:

- Code, tests, configs, schemas are executable evidence.
- `knowledge/` contains canonical explanation with `authority: canonical`.
- `human/` contains derived views with `derivedFrom` pointing to sources.
- `agent/` contains routing protocol (manifest, routes, knowledge index).
- `tmp/` contains temporary material, not truth.

### Knowledge Identity

Every durable doc has YAML frontmatter:

```yaml
---
id: frontend.architecture
type: architecture
scope: frontend
authority: canonical
includes:
  - frontend.testing
  - frontend.state
dependsOn:
  - design.system
updateWhen:
  - shared component architecture changes
---
```

IDs are stable identities. If you rename `knowledge/frontend/architecture.md` to
`knowledge/ui/arch.md`, the conceptual identity `frontend.architecture` survives.
The knowledge index is updated, but every relationship pointing to that ID
remains valid.

### Relationship Types

| Relationship | Direction | Meaning |
|---|---|---|
| `extends` | child → parent | I am a specialization of this base concept |
| `includes` | parent → children | My full picture involves these sub-concepts |
| `dependsOn` | consumer → dependency | I assume this other knowledge is true |
| `derivedFrom` | view → sources | I summarize or reformat these canonical sources |

Bidirectional consistency: if A `includes` B, then B should `extends` A.

### Route Schema v2

Routes are lean task-routing declarations that reference knowledge IDs:

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

The old `readFirst`, `canonicalDocs`, and `updateDocs` are gone. That information
now lives in the docs themselves via `type`, `authority`, and relationships. The
route says "this task involves these concepts." The docs declare their own role
in the knowledge graph.

### Knowledge Resolution

The agent resolves knowledge IDs to files via:

1. `Docs/agent/knowledge-index.json` (authoritative lookup)
2. Convention: `{scope}.{concept}` → `knowledge/{scope}/{concept}.md`

### Propagation

After any change, identify affected knowledge IDs and propagate:

1. Update the canonical doc (the one with `authority: canonical`)
2. Follow `extends` → update specializations
3. Follow `includes` → verify parent coherence
4. Follow `derivedFrom` (reverse) → update derived views
5. Follow `dependsOn` (reverse) → flag consumers for review

Rules:
- Canonical first. Never update a view before its source.
- Propagation is not optional. If a dependent exists, verify or update it.
- Flag, don't guess. If uncertain, record in `gaps.md`.

## How This Affects Development

### For Agents

The agent no longer has to guess which docs are related. The graph tells it.
After changing `frontend.architecture`, the agent runs `check-impact` (or
reasons through the graph) and gets:

```
Changed: frontend.architecture

Direct specializations (extends):
  → frontend.testing
  → frontend.state

Derived views (derivedFrom):
  → human.frontend.overview

Consumers (dependsOn — flag for review):
  → auth.flow
```

This replaces the old workflow of "grep the Docs folder and see what looks
useful" with structural certainty.

### For Humans

The frontmatter makes documentation self-describing. You can look at any doc and
immediately see:
- What it is (`type`)
- What it owns (`authority: canonical`)
- What it depends on (`dependsOn`, `extends`)
- What depends on it (by reverse-searching `derivedFrom`, `extends`, `dependsOn`)
- When it might become stale (`updateWhen`)

### For Projects

The knowledge graph grows naturally through normal agent work. Every time an
agent creates or updates a doc, it declares the identity and relationships. Over
time, the project accumulates a precise map of how knowledge relates — without
anyone maintaining a separate catalog.

## Skills

| Skill | Lifecycle | Purpose |
|-------|-----------|---------|
| `docdriven-setup` | Once | Scan project, create docs with identity + graph, generate routes |
| `docdriven` | Every task | Read knowledge graph, work, propagate through dependencies |
| `docdriven-audit` | Periodic | Validate frontmatter, graph coherence, propagation coverage |

## Validation Scripts

| Script | Purpose |
|--------|---------|
| `check-frontmatter` | Every doc has valid identity, types, fields |
| `check-graph` | No cycles, bidirectional consistency, valid targets |
| `check-impact` | Given a changed ID, list all affected docs |
| `check-staleness` | Compare `sourceVersion` against Git history to flag stale docs |

## Migration Path

This is version zero of a future knowledge fabric:

```text
Today                          Later
─────                          ─────
Markdown frontmatter      →    Artifact database
Explicit relationships    →    Graph database edges
Route JSON                →    Query API
knowledge-index.json      →    Artifact catalog
check-impact script       →    MCP server with semantic search
Git diff + agent          →    Automated invalidation pipeline
```

The conceptual model stays the same. The primitives are:
- Stable identity
- Typed knowledge
- Explicit relationships
- Dependency-aware propagation
- Single canonical owner

These hold whether stored in YAML frontmatter or a PostgreSQL database.

## Design Principles

- Documentation is infrastructure, not an afterthought.
- Markdown is a lightweight knowledge graph.
- Every concept has exactly one canonical owner.
- Relationships are explicit, never implied.
- Propagation is structural, not ad-hoc.
- Views derive from canonical sources and declare it.
- The system is agent-first but human-readable.
- Compact, current, routed context beats comprehensive prose.
- Current truth beats historical explanation.
- Code and checks are evidence; knowledge explains evidence.
- Agents follow documented project conventions, not generic preferences.
- The graph grows through normal work, not separate maintenance.
- Uncertainty is recorded, not hidden.
- Audits validate graph integrity, not just content quality.
- The system scales by adding graph precision, not longer files.

## Success Criteria

DocDriven is working when:

- A new human can understand the project by following derivation links
- An agent can find the right context by resolving knowledge IDs
- After a change, the agent knows exactly what else to update (via graph)
- Each fact has one canonical home with explicit `authority: canonical`
- Derived views declare their sources and can be verified mechanically
- Temporary plans do not become hidden truth
- The knowledge graph is structurally sound (no dangling refs, no cycles)
- `check-impact` shows a clean propagation path for any changed concept
- Large projects have stronger routing, clearer ownership, and narrower shards
