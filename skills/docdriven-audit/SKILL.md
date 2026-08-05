---
name: docdriven-audit
description: Use to audit a DocDriven project for stale docs, missing routes, duplicate truth, invalid context maps, oversized files, tmp content that should be promoted, and weak validation evidence. Also use in change-scoped mode to determine which docs a specific change made false, given a diff range.
---

# DocDriven Audit

Use this skill to check documentation drift and maintainability.

## Modes

| Mode | Input | Question answered |
|------|-------|-------------------|
| **Project audit** | The repository | Where has the documentation system drifted, and is it still maintainable? |
| **Change-scoped audit** | A diff range | Which docs stopped being true because of this change? |

Project audit is the default. Use change-scoped audit when a plan's final work
unit needs the list of docs to update, or whenever someone asks "what docs does
this change affect?". Both modes report; neither updates docs unless asked.

## Project Audit Workflow

1. Read the repo-local `project-docdriven` skill if present.
2. Read `Docs/agent/manifest.json`.
3. Load route shards listed by the manifest.
4. Run deterministic checks with `scripts/audit-docdriven.mjs` when possible.
5. If no repo-local audit entrypoint exists, use the installed global audit
   script as a fallback and report the missing local entrypoint as a P3
   reproducibility issue.
6. Inspect reported gaps manually.
7. Report findings by severity.
8. Update docs only when asked.

Audit checks the route graph, referenced docs, referenced code areas, validation
evidence, placeholder text, oversized shards, orphan knowledge docs, tmp
content, context-map drift, weak architecture contracts, undocumented structure
signals, missing configuration-pattern documentation, and missing
reuse/composition documentation for reusable project primitives.

The audit should remain project-aware. Before judging structure, consider the
project type, size, maturity, direction, and risk profile. Small projects should
not be forced into heavyweight routing, but large projects need reproducible
checks, clear ownership, narrow route shards, and stronger evidence that docs
match code.

A DocDriven project should have a stable local audit command. Prefer a thin
`scripts/audit-docdriven.mjs` wrapper that invokes the installed DocDriven audit
implementation and fails with a clear install or upgrade hint when it cannot be
found. For Node projects, prefer documenting or adding a package script such as
`docs:audit`.

## Change-Scoped Audit

Given a diff range, find every doc that this change made false. The diff is the
evidence — not a spec, not a plan, not a list written before the code existed.

1. Read the repo-local `project-docdriven` skill if present.
2. Establish what changed:
   - `git diff --stat BASE..HEAD` and `git log --oneline BASE..HEAD`
   - Write a short list of the changed behavior, public interfaces, config,
     environment, dependencies, package scripts, schema, migrations,
     architecture, ownership, and validation. That list is the audit subject.
3. Read `Docs/agent/manifest.json` and load the route shards whose domains the
   change touches.
4. Search the docs tree for documents describing anything in the Step 2 list.
   Search by concept, not filename: grep for the component names, contracts,
   flows, and config keys that changed. A doc that never names the feature can
   still describe the behavior that changed.

| Surface | What to look for |
|---------|------------------|
| Route shards | `updateDocs` entries for the touched domains; `readFirst` and `codeAreas` that moved; ownership or validation that changed |
| `Docs/knowledge/` | Canonical explanations of the changed behavior, architecture, or contracts |
| `Docs/human/` | Roadmap milestones, onboarding, and task guides referencing this behavior |
| `Docs/agent/gaps.md` | Gaps this change closed, and new uncertainties it introduced |
| `Docs/tmp/` | Temporary content this change makes promotable or obsolete |
| Specs and plans | Specs this change supersedes in part, and divergences from what was specified |

5. Assign an action per finding: **Update** (now false), **Verify** (probably
   still accurate, confirm while editing), **Add gap** (new uncertainty),
   **Promote** (tmp content that is now durable truth), **None**.
6. Flag duplication: when two docs explain the same concept, name the owner and
   say which doc should link instead of restating. One canonical explanation per
   concept is the point.
7. Report. Do not edit docs in this mode.

Report format:

```markdown
## Change-scoped doc audit (BASE..HEAD)

**Changed subjects:** [behavior, contracts, config, schema, ownership...]
**Domains touched:** [domain ids]

| Doc | Action | What became false |
|-----|--------|-------------------|
| ... | Update / Verify / Add gap / Promote / None | ... |

**Route shard changes needed:** [list or none]
**Duplication:** [doc pairs and which should link, or none]
**Divergence from spec:** [what was built differently, or none]
```

Every row must name what specifically became false. Do not list docs merely
adjacent to the topic. An empty table is a finding worth stating explicitly, not
a default.

## References

- Read `_shared/audit-checklist.md`.
- Read `_shared/agent-operating-contract.md`.
