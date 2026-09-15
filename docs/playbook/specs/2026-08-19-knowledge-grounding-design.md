# Knowledge Grounding & Versioning

**Size:** M      **Type:** data      **Plan tier:** Lite      **Depends on:** —      **Canvas:** `docs/playbook/canvases/2026-08-19-knowledge-grounding-canvas.md`

## Vision

DocDriven's knowledge graph currently has no mechanical way to detect staleness. When code changes, the agent must guess which docs are affected by scanning `updateWhen` hints or relying on route `changeSignals`. There is no explicit link from a knowledge doc to the code it explains, and no record of which code state the doc was last verified against.

This means drift is invisible until a human or agent happens to notice it. In large projects, that gap grows.

### Target

When this is done, every knowledge doc carries a `sourceVersion` field recording the commit it was last verified against. Leaf docs that explain specific code carry a `groundedIn` field listing the files they describe. The audit skill uses these fields to mechanically detect stale docs by comparing `sourceVersion` against Git history of grounded files or child docs.

Overview docs (a new recognized type) formalize the existing README/index.md pattern: they carry `includes`, provide one-sentence orientation per child, and reference children by ID without restating their content. The writing-style guide enforces a hard rule: reference IDs, never duplicate.

`derivedFrom` accepts an optional section-level specifier so propagation can be more precise — views that derived from unchanged sections can skip updates.

## Approach

**Governing rule:** every knowledge doc declares what code state it reflects (`sourceVersion`) and leaf docs declare which code they explain (`groundedIn`). The agent updates these automatically during propagation. The audit skill compares them against Git to flag staleness.

**`sourceVersion` field** — a short commit hash on every knowledge doc. For leaf docs grounded in code, it records the latest commit of the `groundedIn` paths at the time the doc was verified. For overview docs, it records the latest commit among included child doc files. The agent sets this during propagation using `git log -1 --format=%h -- <paths>`. No human bookkeeping.

**`groundedIn` field** — a list of file paths or globs on leaf knowledge docs. Declares which source files this doc is the canonical explanation of. Only leaf docs carry this; overview docs are grounded in their children, not directly in code. This is distinct from route-level `codeAreas` which serve task routing rather than doc-level grounding.

**`type: overview`** — formalizes the existing README/index.md pattern. An overview doc carries `includes`, provides a brief orientation sentence, and references each child by ID. The body pattern is: one sentence describing the child's concern, then `See → \`child.id\``. If the summary grows beyond one sentence per child, the content belongs in the child.

**`derivedFrom` with sections** — backward compatible extension. Plain ID strings still work. The object form adds an optional `sections` list of heading anchors. During propagation, if the source doc changed only in sections not listed, the view may skip update. This makes propagation less noisy in large graphs.

**Reference-by-ID hard rule** — when another knowledge ID owns a concept, reference it by ID. A single orienting sentence is acceptable. Anything more is duplication and violates single-source-of-truth. This applies in overview→children, view→source, and cross-domain references.

**Unchanged:** route schema v2 structure, manifest format, knowledge-index format, `codeAreas` on routes, existing relationship types (`extends`, `includes`, `dependsOn`, `derivedFrom`), audit frontmatter and graph checks. The existing fields and flows remain; this adds new optional fields and one new type value.

## Scope

**Areas involved**
- Knowledge schema definition (`knowledge-schema.md`)
- DocDriven structure doc (`docdriven-structure.md`)
- Writing style guide (`writing-style.md`)
- Audit skill logic (staleness check)
- Setup skill (generate `sourceVersion` and `groundedIn` during init)

**Reuse**
- Git CLI for commit hash lookup — no new dependencies
- Existing frontmatter validation in `check-frontmatter.mjs`

**Docs to read**
- `skills/_shared/knowledge-schema.md` — the schema this extends
- `skills/_shared/docdriven-structure.md` — the structure this formalizes
- `skills/_shared/writing-style.md` — the style guide getting the new hard rule

**Skills to use**
- `docdriven` — for propagation after changes to shared docs

**Guardrails**
- All new fields are optional to maintain backward compatibility with existing projects
- No breaking changes to route schema v2 or manifest
- `sourceVersion` is always a short commit hash (7 chars), never a full hash or tag
- `groundedIn` uses repo-relative paths, same convention as route `codeAreas`

**Affected domains:** knowledge-schema, docdriven-structure, writing-style, audit

## Not now

- Event-sourced changelog (`changelog.jsonl`) — valuable later, not needed for mechanical staleness detection
- Merkle digest hashing on overview docs — `sourceVersion` comparison achieves the same result more simply
- `epistemicStatus` field — `gaps.md` handles contested knowledge
- `observedAt` timestamp — Git modification time is sufficient
- Semantic vector indexes for routing
- CRDT merge semantics

## Verification

**Tier:** Check

After implementation, verify:

1. A leaf knowledge doc in a test fixture has `groundedIn` and `sourceVersion` in its frontmatter. Running `check-frontmatter` passes without error.
2. An overview doc with `type: overview` and `includes` passes frontmatter validation.
3. A `derivedFrom` entry using the object form (`{id, sections}`) passes validation alongside plain string entries.
4. The audit script detects a stale doc: given a fixture where `sourceVersion` is older than the latest commit on `groundedIn` paths, the audit reports it as potentially stale.
5. The writing-style doc contains the hard rule about referencing IDs instead of duplicating content.
