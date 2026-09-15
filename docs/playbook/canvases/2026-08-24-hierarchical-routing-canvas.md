# Hierarchical Routing & Smarter Context Resolution — Brainstorming Canvas

> **Status:** Approved — basis for specs
>
> Living summary of this brainstorm. Keep it updated when decisions change.
> Specs and plans are distilled from this file. Not canonical product behavior —
> after shipping, knowledge docs own shipped truth; leftovers hold remaining
> work only, then delete when nothing remains.

## Promise

Make DocDriven's context resolution progressive and efficient — the agent
traverses a hierarchy (overview → children → grounding) rather than loading
everything a route references. Propagation becomes smarter by stopping when
nothing meaningful changed.

## Inspiration

Conversation on persistent knowledge representations for agents. Key
transferable ideas that map to DocDriven improvements:

- **Coarse-to-fine routing** — traverse a hierarchy rather than flat search
- **Aggregate representations per region** — overview docs as routing hubs
- **Local propagation with stop conditions** — don't propagate when nothing changed
- **Cross-links as routing hints** — `dependsOn` informs context loading, not just propagation

## Decisions

- **Delivery:** All 5 improvements ship as one cohesive update.
- **Scope:** Pure instruction/shared-doc changes. No new scripts.
- **Dropped #5 (abstract interface wording):** No service layer exists; the files
  ARE the interface. Abstracting adds vagueness without benefit today.
- **Dropped #6 (inline staleness check):** The existing `check-staleness.mjs` in
  audit handles this at the right frequency (before merges). Bolting git calls
  into every task start adds friction for a problem that mostly doesn't occur.

## Design

### 1. Hierarchical route resolution via overview docs

**Current:** Route lists knowledge IDs. Agent loads all of them.

**New:** When a route's `knowledge` list includes an overview doc (`type:
overview`), the agent reads the overview first, compares the task against child
descriptions, and loads only relevant children.

**Example flow:**

```
Route references: ["ui.overview", "architecture.general"]
                        ↓
Agent reads ui.overview:
  includes: [ui.buttons, ui.forms, ui.onboarding, ui.navigation]
  
Task: "Add a primary CTA to onboarding"
                        ↓
Agent selects: ui.buttons, ui.onboarding (skips forms, navigation)
                        ↓
Agent reads those children + follows their groundedIn for code
```

### 2. Overview docs as navigation hubs

**Current:** `type: overview` is a documentation pattern (one sentence per child).

**New:** Overview docs serve a dual purpose:
- **For humans:** orientation (what exists in this area)
- **For agents:** routing (which children to load for this task)

The one-sentence-per-child description should be written with routing in mind —
it should help the agent decide relevance, not just describe the child.

### 3. Propagation stop condition

**Current rule:** "If a dependent exists, verify or update it." (Unconditional.)

**New rule:** After verifying a parent/dependent:
- If content needs no edit (includes list correct, summary still accurate),
  update only `sourceVersion` to record verification.
- **Stop propagating further upward.** The parent's meaning didn't change, so
  its parents don't need re-verification.
- Only continue propagating upward if the parent's content actually changed.

**Principle:** Verification that confirms "still accurate" is a terminal event.
Only semantic changes propagate.

### 5. Organic hierarchy growth (subfolder promotion)

**Current:** The agent creates knowledge docs at whatever level seems natural.
Flat folders accumulate 8-12 files without structure.

**New:** When a knowledge folder exceeds ~5-6 leaf docs at the same level, the
agent should group related docs into a subfolder and create an overview doc for
that subfolder. This creates the hierarchy that makes routing possible.

**Trigger:** During propagation or when creating a new knowledge doc, if the
target folder already has 6+ siblings, consider whether a group of them share a
concern that deserves its own subfolder + overview.

**Example:**

```
Before (flat):
knowledge/ui/
  buttons.md
  forms.md
  navigation.md
  onboarding.md
  modals.md
  tooltips.md
  toasts.md

After (hierarchical):
knowledge/ui/
  overview.md          (type: overview, includes: [ui.inputs, ui.feedback, ...])
  inputs/
    overview.md        (type: overview, includes: [ui.buttons, ui.forms])
    buttons.md
    forms.md
  feedback/
    overview.md        (type: overview, includes: [ui.modals, ui.tooltips, ui.toasts])
    modals.md
    tooltips.md
    toasts.md
  navigation.md
  onboarding.md
```

**Principle:** Hierarchy is what makes coarse-to-fine routing work. Without
subfolders + overviews, the agent must load everything at a level. Promoting
related docs into a subfolder with an overview creates a navigable tree.

**When does a knowledge doc earn its existence?**

Knowledge docs exist only for what grounding sources can't express. If code,
config, schemas, or types already declare it, don't restate it — `groundedIn`
points at the source. A knowledge doc captures what has no other canonical home.

| Code tells you | Knowledge doc tells you |
|---|---|
| Entity shapes, fields, relations | Why it's structured this way (decisions) |
| Validation rules | Consistency boundaries, transactional guarantees |
| Migration files | Migration strategy (zero-downtime? rollback approach?) |
| Type definitions | Ownership rules (which package owns which types) |
| API endpoints + schemas | Stability contracts, versioning strategy |
| Test files | Test strategy, coverage expectations |
| Import graph | Cross-module dependency rules, boundary constraints |

**The test:**
1. Can I find this fact by reading code? → No knowledge doc. Use `groundedIn`.
2. Is this a decision/rule/constraint with no home in code? → Knowledge doc.
3. Is this a boundary that code implies but never states? → Knowledge doc.

**Category disambiguation:**
- Rule constrains **where code lives or how modules depend** → `architecture/`
- Rule constrains **how code is written within a module** → `conventions/`
- When unclear, pick one. The knowledge ID makes it findable regardless of folder.

**Category catalog — common groupings as inspiration:**

These are not a fixed taxonomy. They can live at top-level OR nested depending on
scope. The deciding question: *where would the agent look first for this concept?*

| Category | What belongs here | Nesting examples |
|---|---|---|
| `architecture/` | System shape, boundaries, dependency rules, structural decisions | `architecture/testing/`, `architecture/security/`, `architecture/data/` |
| `features/` | Business capabilities, user-facing behavior | `features/auth/`, `features/messaging/` |
| `integrations/` | Third-party services, external systems, providers | `integrations/payments/`, `integrations/auth/` |
| `operations/` | Deployment, CI/CD, environments, monitoring | `operations/ci/`, `operations/monitoring/` |
| `design-system/` | Tokens, visual components, patterns, accessibility | `design-system/tokens/`, `design-system/components/` |
| `security/` | Auth flows, permissions, data handling, compliance | Could nest under `architecture/security/` if small |
| `testing/` | Test strategy, coverage, fixtures, test infra | Top-level if complex; `architecture/testing/` if just strategy |
| `conventions/` | Coding patterns, naming, file structure, error handling | Often stays top-level as cross-cutting reference |
| `workflows/` | Multi-step processes, state machines, orchestration | Distinct from features: flows that span multiple features |
| `configuration/` | Feature flags, env vars, runtime config, tenant settings | Could nest under `operations/config/` if small |

**Ambiguity is normal.** Testing could be top-level or nested under architecture.
The right answer depends on how much knowledge exists in that area.

**Rules:**
- Only create a category if 2+ docs belong there. One doc = keep in parent.
- Features vs. workflows: features = what the system does (capabilities).
  Workflows = how a process flows across multiple features (orchestration).
- The default setup (`architecture/`, `features/`, `operations/`) covers ~80% of
  projects. Add from the catalog when scope demands it.

### 4. `dependsOn` as routing-time signal

**Current:** `dependsOn` is used during propagation to flag consumers.

**New additional behavior:** During context resolution, when the agent loads a
knowledge doc and that doc has `dependsOn: [X, Y]`, the agent also loads X and Y
as supporting context.

**Constraint:** Only follow one level of `dependsOn` during routing (not
transitive). If X also `dependsOn` Z, don't auto-load Z — the agent can follow
it manually if needed.

## Files to Change

| File | What changes |
|------|-------------|
| `skills/docdriven/SKILL.md` | Workflow steps for hierarchical resolution, propagation stop rule, dependsOn routing, subfolder promotion guidance |
| `skills/_shared/agent-operating-contract.md` | Knowledge resolution adds overview-as-hub, propagation adds stop condition |
| `skills/_shared/docdriven-structure.md` | Overview docs section adds routing purpose, adds subfolder promotion rule |
| `skills/_shared/knowledge-schema.md` | Overview type description adds routing semantics |

## Not Now

- Embeddings or learned routing representations
- MCP server interface
- Separate Knowledge Git repository
- Trained routing from usage traces
- Internal maintenance agent
- Abstract interface wording (no service layer to abstract toward)
- Inline staleness check (audit already handles it)

## Size & Plan Tier

- **Size:** S — instruction wording changes across 4 files
- **Plan tier:** Direct — implement after approval, no spec needed
