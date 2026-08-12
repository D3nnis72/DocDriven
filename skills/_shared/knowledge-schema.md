# Knowledge Schema

Every durable documentation file has a YAML frontmatter block that declares its
identity, type, authority, and relationships.

## Frontmatter Fields

| Field | Required | Values | Purpose |
|---|---|---|---|
| `id` | yes | `dot.separated.name` | Stable identity that survives renames |
| `type` | yes | `architecture`, `rule`, `decision`, `summary`, `procedure`, `view` | What kind of knowledge this is |
| `scope` | no | free text | Domain this belongs to |
| `authority` | canonical docs only | `canonical` | Marks this as the single owner of a concept |
| `extends` | no | single ID | This doc specializes a base concept |
| `includes` | no | list of IDs | Sub-concepts that complete this doc's picture |
| `dependsOn` | no | list of IDs | This doc assumes these are true |
| `derivedFrom` | views only | list of IDs | This view summarizes these sources |
| `updateWhen` | no | list of change descriptions | What makes this doc potentially stale |

## ID Naming Convention

- Canonical knowledge: `{scope}.{concept}` — e.g., `frontend.architecture`, `auth.flow`
- Specializations: `{scope}.{concept}.{sub}` — e.g., `frontend.architecture.testing`
- Views: `{surface}.{scope}.{concept}` — e.g., `human.frontend.overview`

IDs must be unique across the entire docs tree.

## Relationship Types

| Relationship | Direction | Meaning | Example |
|---|---|---|---|
| `extends` | child → parent | I am a specialization of this base | `frontend.testing` extends `frontend.architecture` |
| `includes` | parent → children | My full picture involves these sub-concepts | `frontend.architecture` includes `frontend.testing` |
| `dependsOn` | consumer → dependency | I assume this other knowledge is true | `frontend.architecture` depends on `design.system` |
| `derivedFrom` | view → sources | I summarize or reformat these sources | `human.frontend` derived from `frontend.architecture` |

Bidirectional consistency: if A `includes` B, then B should `extends` A.

## Authority Rules

- Every durable concept has exactly one canonical owner.
- Derived views never establish truth independently.
- If a fact belongs to another knowledge ID, reference it or mark it as a view.
- Update the canonical source first, then propagate to dependents and views.

## Canonical Knowledge Example

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
  - state management pattern changes
---
# Frontend Architecture

...architecture content...

## Testing

See → `frontend.testing`

## State Management

See → `frontend.state`
```

## Specialization Example

```yaml
---
id: frontend.testing
type: procedure
scope: frontend
authority: canonical
extends: frontend.architecture
updateWhen:
  - test framework changes
  - testing conventions change
---
# Frontend Testing

...testing details owned here, not duplicated in architecture...
```

## Derived View Example

```yaml
---
id: human.frontend.overview
type: view
scope: frontend
derivedFrom:
  - frontend.architecture
  - frontend.testing
---
# Frontend Overview

...short human summary, links to canonical sources for depth...
```

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

Route fields:

- `knowledge` — knowledge IDs this route concerns; agent resolves to files
- `codeAreas` — repo-relative paths/globs for code ownership
- `changeSignals` — semantic hints about which code changes trigger doc review
- `validation` — commands to run after changes
- `owner` — team or module owner

## Knowledge Index

`Docs/agent/knowledge-index.json` maps IDs to file paths:

```json
{
  "frontend.architecture": "knowledge/frontend/architecture.md",
  "frontend.testing": "knowledge/frontend/testing.md",
  "human.frontend.overview": "human/frontend.md"
}
```

Convention-based resolution (`{scope}.{concept}` → `knowledge/{scope}/{concept}.md`)
is the default. The index is the authority when convention does not hold.

## Propagation Order

After changing a knowledge doc:

1. Update the canonical doc
2. Follow `extends` → update specializations
3. Follow `includes` → verify parent coherence
4. Follow `derivedFrom` (reverse) → update views
5. Follow `dependsOn` (reverse) → flag for review
