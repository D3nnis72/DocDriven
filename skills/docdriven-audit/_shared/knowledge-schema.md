# Knowledge Schema

Every durable documentation file has a YAML frontmatter block that declares its
identity, type, authority, and relationships.

## Frontmatter Fields

| Field | Required | Values | Purpose |
|---|---|---|---|
| `id` | yes | `dot.separated.name` | Stable identity that survives renames |
| `type` | yes | `architecture`, `rule`, `decision`, `summary`, `procedure`, `overview`, `view` | What kind of knowledge this is |
| `scope` | no | free text | Domain this belongs to |
| `authority` | canonical docs only | `canonical` | Marks this as the single owner of a concept |
| `sourceVersion` | recommended | short commit hash (7 chars) | The code/doc state this was last verified against |
| `groundedIn` | optional, leaf docs | list of repo-relative file paths or globs | Which source files this doc explains |
| `extends` | no | single ID | This doc specializes a base concept |
| `includes` | no | list of IDs | Sub-concepts that complete this doc's picture |
| `dependsOn` | no | list of IDs | This doc assumes these are true |
| `derivedFrom` | views only | list of IDs or objects | This view summarizes these sources |
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

## Grounding and Versioning

### `sourceVersion`

Every knowledge doc should carry `sourceVersion` — a short commit hash (7 chars)
recording the code or doc state this was last verified against.

- **Leaf docs with `groundedIn`:** the latest commit of the grounded files at the
  time the doc was written or verified.
- **Overview docs:** the latest commit among included child doc files at the time
  the overview was verified.
- **Updated automatically** by the agent during propagation using
  `git log -1 --format=%h -- <relevant paths>`.

### `groundedIn`

Optional field on leaf knowledge docs. Lists the repo-relative source files or
globs this doc is the canonical explanation of.

```yaml
groundedIn:
  - src/payments/checkout.ts
  - src/payments/providers/*.ts
  - config/payments.yaml
```

Only leaf docs carry `groundedIn`. Overview docs are grounded in their children,
not directly in code. This field is distinct from route-level `codeAreas` which
serves task routing rather than doc-level grounding.

### Staleness detection

The audit skill uses `sourceVersion` and `groundedIn` to detect stale docs:

- For docs with `groundedIn`: compare `sourceVersion` against
  `git log -1 --format=%h -- <groundedIn paths>`. If they differ, the doc is
  potentially stale.
- For overview docs: if any child's `sourceVersion` is newer than the overview's
  `sourceVersion`, the overview may need refresh.

## `derivedFrom` Extended Format

`derivedFrom` accepts plain ID strings (backward compatible) or objects with
optional section specificity:

```yaml
# Plain format (still valid)
derivedFrom:
  - frontend.architecture
  - frontend.testing

# Extended format with sections
derivedFrom:
  - id: frontend.architecture
    sections: ["## Component Model", "## State"]
  - frontend.testing
```

When sections are specified, propagation can be more precise: if the source doc
changed only in sections not listed, the derived view may skip the update.
Plain strings and objects can be mixed in the same list.

## Authority Rules

- Every durable concept has exactly one canonical owner.
- Derived views never establish truth independently.
- If a fact belongs to another knowledge ID, reference it or mark it as a view.
- When another knowledge ID owns a concept, reference it by ID. Do not restate
  its content. A single orienting sentence is acceptable; anything more is
  duplication and violates single-source-of-truth.
- Update the canonical source first, then propagate to dependents and views.

## Canonical Knowledge Example

```yaml
---
id: frontend.architecture
type: architecture
scope: frontend
authority: canonical
sourceVersion: a3f92b1
groundedIn:
  - src/frontend/components/**
  - src/frontend/state/**
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
sourceVersion: c4d88e2
groundedIn:
  - src/frontend/__tests__/**
extends: frontend.architecture
updateWhen:
  - test framework changes
  - testing conventions change
---
# Frontend Testing

...testing details owned here, not duplicated in architecture...
```

## Overview Example

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
  - payments.testing
---
# Payments

Handles all payment processing — checkout, provider integrations, error
handling, and retry semantics.

## Checkout Flow

See → `payments.flow`

## Provider Integrations

See → `payments.providers`

## Error Handling

See → `payments.errors`

## Testing

See → `payments.testing`
```

Overview docs provide brief orientation and reference children by ID. Rules:

- One sentence of context per child (max).
- Detail lives in the child doc.
- If the summary exceeds one sentence, the content belongs in the child.
- Never restate what a child doc says — reference the ID instead.

## Derived View Example

```yaml
---
id: human.frontend.overview
type: view
scope: frontend
sourceVersion: a3f92b1
derivedFrom:
  - id: frontend.architecture
    sections: ["## Component Model", "## State"]
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
