# Knowledge Grounding & Versioning Improvements — Brainstorming Canvas

> **Status:** Approved — basis for specs
>
> Living summary of this brainstorm. Keep it updated when decisions change.
> Specs and plans are distilled from this file. Not canonical product behavior —
> after shipping, knowledge docs own shipped truth; leftovers hold remaining
> work only, then delete when nothing remains.

## Promise

Make DocDriven's knowledge graph temporally aware and explicitly grounded in
source code, so staleness detection becomes mechanical rather than guesswork,
while reinforcing single-source-of-truth through reference-by-ID conventions.

## Inspiration

Research on persistent knowledge representations for intelligent agents. Key
transferable ideas:

- **Temporal validity**: facts have a "verified as of" state, not just content
- **Explicit grounding**: knowledge declares which artifacts it explains
- **Multiresolution routing**: higher-level docs route to detail, they don't duplicate it
- **Provenance precision**: derivations can be section-specific

## Now vs. After

| Aspect | Current | After |
|--------|---------|-------|
| **Staleness detection** | Agent guesses via `updateWhen` heuristics and manual review | Mechanical: compare `sourceVersion` against `git log` of `groundedIn` paths or child docs |
| **Code grounding** | Implicit via route `codeAreas` globs (route-level, not doc-level) | Explicit `groundedIn` field on each knowledge doc |
| **Temporal tracking** | None — only Git history of the doc file itself | `sourceVersion` on every doc = "I reflect reality as of this commit" |
| **Overview docs** | Exist informally as README.md, no enforced pattern | Formal `type: overview` with `includes` list, one-sentence-per-child, reference by ID |
| **Duplication prevention** | Soft rule in writing-style.md | Hard rule: reference IDs, never restate. Overview docs are routing hubs, not summaries |
| **`derivedFrom` precision** | Points to whole knowledge IDs | Optionally specifies which sections were derived from |
| **Propagation accuracy** | Always propagate to all `derivedFrom` consumers | Can skip views that only derived from unchanged sections |

## Design Decisions

### 1. `sourceVersion` — on every knowledge doc

```yaml
sourceVersion: a3f92b1   # short commit hash
```

- **Leaf docs (grounded in code):** latest commit of `groundedIn` files at time the doc was verified
- **Overview docs:** latest commit of included child docs at time the overview was verified
- **Updated automatically** by the agent during propagation — no human bookkeeping
- **Audit compares:** `sourceVersion` vs. `git log -1 --format=%h -- <relevant paths>`

### 2. `groundedIn` — optional, for docs that explain code/config

```yaml
groundedIn:
  - src/payments/checkout.ts
  - src/payments/providers/*.ts
  - config/payments.yaml
```

- Lists the code/config files this doc is the canonical explanation of
- Globs allowed
- Only on leaf knowledge docs, not overview docs
- Routes keep `codeAreas` for task routing (different purpose: "which code triggers this route")
- `groundedIn` is doc-level: "which code does THIS doc explain"

### 3. `type: overview` — formalized overview pattern

```yaml
---
id: payments
type: overview
scope: payments
authority: canonical
sourceVersion: b7e44c2
includes:
  - payments.flow
  - payments.providers
  - payments.errors
  - payments.testing
---
# Payments

Handles all payment processing.

## Checkout Flow

See → `payments.flow`

## Provider Integrations

See → `payments.providers`

## Error Handling

See → `payments.errors`

## Testing

See → `payments.testing`
```

Rules:
- One sentence of orientation per child (max)
- Detail lives in the child doc
- If summary exceeds one sentence, you're duplicating — move it to the child

### 4. `derivedFrom` with optional sections

```yaml
derivedFrom:
  - id: frontend.architecture
    sections: ["## Component Model", "## State"]
```

- Backward compatible — plain ID list still works
- Sections are optional refinement for precision propagation
- If source doc changes only in sections not listed, the view may skip update

### 5. Hard rule: reference by ID, never duplicate

Applies everywhere:
- Overview → children: reference by ID
- View → canonical source: summarize briefly, never add new truth
- Cross-domain mention: reference the owning ID, don't explain it

## Schema Changes Summary

### New fields

| Field | Required | Where | Type |
|-------|----------|-------|------|
| `sourceVersion` | recommended | all knowledge docs | short commit hash string |
| `groundedIn` | optional | leaf docs explaining code | list of file paths/globs |

### Modified fields

| Field | Change |
|-------|--------|
| `derivedFrom` | Allow object form with `id` + `sections` alongside plain ID strings |
| `type` | Add `overview` as a recognized type |

### No changes to

- `id`, `scope`, `authority`, `extends`, `includes`, `dependsOn`, `updateWhen`
- Route schema v2 structure
- Knowledge-index format
- Manifest format

## Workflow: How `sourceVersion` Gets Updated

```
1. Code change happens (commit abc123)
2. Agent detects affected knowledge docs via:
   - Route changeSignals match, OR
   - Audit finds: git log of groundedIn paths > doc's sourceVersion
3. Agent reads and updates the knowledge doc content
4. Agent sets sourceVersion to latest commit of groundedIn paths
5. Agent propagates to dependents (updates their sourceVersion too if touched)
6. Everything commits together
```

For overview docs:
```
1. Child doc was updated (its sourceVersion advanced)
2. Agent checks overview: does includes list still match? Is one-sentence summary still accurate?
3. If yes: update overview's sourceVersion to current commit of child docs
4. If no: update summary sentence + sourceVersion
```

## Audit Enhancements

The audit skill gains a new check:

```
For each doc with groundedIn:
  latest = git log -1 --format=%h -- <groundedIn paths>
  if latest != doc.sourceVersion → flag "potentially stale"

For each overview doc:
  for each child in includes:
    if child.sourceVersion > overview.sourceVersion → flag "overview may need refresh"
```

## Not Doing (decided against)

| Idea | Why not |
|------|---------|
| `observedAt` timestamp | Git already tracks when doc was modified |
| `epistemicStatus` field | `gaps.md` handles contested knowledge informally; adding a field overcomplicates |
| Separate version ID tier | `sourceVersion` as commit hash is sufficient; no need for a custom version scheme |
| Merkle digest hashing | Too mechanical for Markdown; `sourceVersion` comparison achieves the same staleness detection |
| Event-sourced changelog | Nice-to-have later; Git log + audit already covers this |

## Open Questions

- Should `groundedIn` on an overview doc point to a directory glob (e.g., `src/payments/**`) or should only leaves carry it?
  - Current decision: only leaves. Overview docs are grounded in their children, not directly in code.
- Should the writing-style doc be updated to include the "reference by ID, never duplicate" rule as a hard constraint?
  - Leaning yes.

## Size & Plan Tier

- **Size:** M — schema additions, skill instruction updates, audit script additions
- **Plan tier:** Lite — one cohesive capability across schema + skills + scripts
