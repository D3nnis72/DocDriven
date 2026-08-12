---
name: docdriven-audit
description: Use to audit a DocDriven project for structural integrity, knowledge graph coherence, stale docs, missing routes, and propagation gaps. Also use in change-scoped mode to determine which docs a specific change made false by traversing the dependency graph.
---

# DocDriven Audit

Use this skill to check documentation drift and knowledge graph integrity.

## Modes

| Mode | Input | Question answered |
|------|-------|-------------------|
| **Project audit** | The repository | Is the knowledge graph structurally sound and are docs current? |
| **Change-scoped audit** | A diff range | Which docs stopped being true because of this change? |

## Project Audit Workflow

1. Read the repo-local `project-docdriven` skill if present.
2. Read `Docs/agent/manifest.json`.
3. Load route shards listed by the manifest.
4. Run deterministic checks:
   - `check-frontmatter` — validate all docs have proper identity and metadata
   - `check-graph` — validate relationship coherence (no cycles, bidirectional consistency, valid targets)
   - Route and content checks from `audit-docdriven.mjs`
5. Inspect reported gaps manually.
6. Report findings by severity.
7. Update docs only when asked.

## Validation Scripts

| Script | Purpose | When to run |
|--------|---------|-------------|
| `check-frontmatter` | Every doc has valid identity, types, required fields | After creating/editing docs |
| `check-graph` | Relationships are coherent, no dangling refs, bidirectional consistency | After changing relationships |
| `check-impact` | Given a changed ID, shows what else needs review | After any code or doc change |

Usage:

```bash
node scripts/check-frontmatter.mjs --root .
node scripts/check-graph.mjs --root .
node scripts/check-impact.mjs --changed frontend.architecture
```

## Change-Scoped Audit

Given a diff range, find every doc that this change made false using the
knowledge graph for traversal.

1. Read the repo-local `project-docdriven` skill if present.
2. Establish what changed:
   - `git diff --stat BASE..HEAD` and `git log --oneline BASE..HEAD`
   - Identify changed behavior, interfaces, config, architecture, ownership.
3. Map changes to knowledge IDs:
   - Which knowledge IDs does the changed code belong to? (via route `codeAreas`)
   - Which routes have matching `changeSignals`?
4. Run `check-impact` on each affected knowledge ID.
5. Traverse explicit dependencies:
   - `extends` → specializations that may be invalidated
   - `includes` (reverse) → parents that reference this concept
   - `derivedFrom` (reverse) → views that need updating
   - `dependsOn` (reverse) → consumers that assume this truth
6. Search for undeclared relationships (concept grep as fallback).
7. Assign actions per finding: **Update**, **Verify**, **Add gap**, **Promote**, **None**.

Report format:

```markdown
## Change-scoped doc audit (BASE..HEAD)

**Changed subjects:** [behavior, contracts, config, schema, ownership...]
**Affected knowledge IDs:** [id list]

| Doc (ID) | Action | Relationship | What became false |
|----------|--------|--------------|-------------------|
| ... | Update / Verify / Add gap / Promote / None | extends / derivedFrom / dependsOn / undeclared | ... |

**Route shard changes needed:** [list or none]
**Propagation coverage:** [explicit graph: N docs, concept search: M docs]
**Gaps:** [new uncertainties]
```

## Project Audit Checks

Structure:
- All knowledge docs have valid frontmatter (id, type, authority)
- All views have derivedFrom
- IDs are unique, format is valid
- Knowledge index matches actual files

Graph:
- No circular extends chains
- Bidirectional consistency (includes ↔ extends)
- All relationship targets exist
- Cannot derive from a view
- No orphan canonical docs

Routes:
- manifest.json parses, route indexes exist
- Route IDs unique, knowledge IDs resolve
- Code areas match real files
- Validation is declared and not weak

Content:
- Size targets met
- No placeholder text left
- tmp content flagged
- Architecture contract complete

## References

- Read `_shared/audit-checklist.md` for the full check list.
- Read `_shared/knowledge-schema.md` for frontmatter validation rules.
- Read `_shared/agent-operating-contract.md` for route protocol.
