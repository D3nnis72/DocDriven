# Knowledge Doc Splitting

Split knowledge docs so agents load the smallest useful context. One canonical
owner per concept; a file is not a concept when it answers several independent
routing questions.

## Size and split policy

| Size | Treatment |
|------|-----------|
| Up to 1,500 words | Normal range for a focused knowledge leaf |
| 1,500–3,000 words | Review required during maintainability pass; no automatic split |
| Over 3,000 words | Split by default |
| Any size | Split immediately when multiple independently routable topics are present |

**Before writing** (preventive): split first when the edit adds a second
independently routable concern, or when the file is over 3,000 words and not a
documented exception.

**During audit** (corrective): execute splits when `suggestedAction` is
`split-required`. Review when `split-review-required`; split only if the review
finds multiple routing concerns or the doc clearly outgrew one leaf.

Do not split a cohesive single-concern doc just because it is long within the
review band.

## Exceptions over 3,000 words

Some docs may stay long when they are one cohesive artifact, not several routable
concerns:

- idea collections and brainstorm captures
- research snapshots
- ledgers and evidence logs
- historical reference dumps

Example: a long acquisition brainstorm may stay unsplit. Mark the exception in
the split plan or `gaps.md` when you keep it, and **narrow routing** so broad
task routes do not load it by default. Normal UI or feature work should not pull
an 8,000-word idea collection into context.

## The deciding question

Which task should an agent solve with minimal context? Group sections by routing
concern, change frequency, and `groundedIn` boundaries — not by H2 count alone.

## Flat siblings vs subfolder

| Situation | Structure |
|-----------|-----------|
| 2–4 leaves, one feature package | Flat siblings in the parent folder |
| 3+ leaves that belong together | Subfolder + `README.md` overview |
| 6+ leaves at the same level | Group into a subfolder (Hierarchy Growth) |
| One leaf after split | Do not create a subfolder for a single child |

A subfolder is a navigation hub. No hub needed → flat siblings are fine.

## Relationships after a split

**Parent overview** (`type: overview`):

- Keeps the stable ID (`features.foo` stays `features.foo`).
- Short purpose, principles, and a table of what lives where.
- `includes`: every new leaf ID.
- Do not keep full leaf content in the overview.

**Leaves**:

- `extends`: parent ID.
- `dependsOn`: only what this leaf assumes (split from the monolith; do not
  copy the parent's full dependency list blindly).
- `groundedIn`: only on leaves, pointing at the code this leaf explains.

**Existing siblings**: update their `dependsOn` to the smallest relevant leaf,
not only the parent overview.

Bidirectional rule: if parent `includes` B, then B `extends` parent.

## Package coherence after a split

After splitting or moving docs, verify the package is coherent — not just that
each file is under the word limit.

| Signal | Fix |
|--------|-----|
| Prefix orphans outside the package folder (e.g. `document-design-*` next to `application-document-design/`) | Move into the package folder; rename ID to `parent.child` |
| Sibling references parent children via `dependsOn` instead of `extends` | Use `extends: parent` on the sibling; link related siblings in prose |
| `dependsOn` between docs in the same package | Prefer `extends` + parent `includes`; siblings should not depend on each other for routing |
| Circular `dependsOn` within a package | Break the cycle; use prose links or parent overview for cross-references |
| Leaf not in parent `includes` | Add to parent `includes` and set `extends` on the leaf |

Run `docs:graph` after package moves. Treat `missing-bidirectional-includes`,
`missing-bidirectional-extends`, and `circular-dependsOn` as split follow-ups.

## Split heuristics

1. Cluster sections (audit provides H2 headings as hints).
2. Target 300–1,500 words per focused leaf.
3. Merge small sections that only make sense together.
4. Do not create one file per H2 by default.
5. IDs: `features.foo.bar-baz` → `bar-baz.md` (names from concerns, not
   headings). Never name a leaf by order (`foo-2.md`, `foo-part-2.md`, `03-foo.md`).
   See File Naming in `knowledge-schema.md`.
6. Moved sections start clean. Drop old heading numbers and replace positional
   references ("see point 7") with knowledge IDs or anchors. Each leaf gets its
   own H1; no number from the monolith survives.

Ask the user only when two split shapes are equally valid. Over 3,000 words with
multiple concerns → split without asking unless a documented exception applies.

## Split plan (temporary)

Write to `Docs/tmp/splits/YYYY-MM-DD-<id>-split-plan.md` before executing.
Delete the plan after the split lands. Record unresolved boundaries or kept
exceptions in `Docs/agent/gaps.md`.

```markdown
# Split plan: <knowledge-id>

**Source:** <path> (<words> words)
**Structure:** flat siblings | subfolder + overview | keep (exception)
**Parent ID:** <unchanged id, becomes overview>

| New ID | File | Sections | extends | dependsOn | groundedIn |
|--------|------|----------|---------|-----------|------------|
| ... | ... | ... | parent | ... | ... |

**Heading fixes:** numbered headings removed, positional references replaced (list files)
**Not splitting:** ...
**Exception rationale:** ... (if keeping >3k words)
**Route narrowing:** ... (if exception — which routes should load this)
**Siblings to update:** ...
**Propagation:** knowledge-index, route shards, grep old path
```

## Propagation checklist

After a split:

1. Create overview + leaves with frontmatter.
2. Move content once; no duplication between parent and children.
3. Normalize the moved sections: remove heading numbers, then grep the whole
   package and its dependents for `Punkt N`, `section N`, `§N` and replace them
   with knowledge IDs or anchors.
4. Update `knowledge-index.json` and route shard `knowledge` IDs.
5. Point routes at the smallest leaf per task type.
6. Update existing `dependsOn` / `derivedFrom` references.
7. Delete the monolith file (or leave a one-line stub only if external links
   require it — prefer updating references).
8. Run the audit. Fix `heading-numbering`, `positional-reference`,
   `invalid-file-name`, and `ordinal-file-name` findings in the package.
9. Delete the split plan in `Docs/tmp/splits/`.

## What not to do

- Mandatory folder taxonomy (`principles/`, `implementation/`, …).
- Subfolder with only one leaf.
- Overview body over ~400 words of duplicated leaf content.
- `dependsOn` chains deeper than one hop for routing context.
- Auto-split every doc over 1,500 words without checking routing concerns.
- Leave long exception docs on broad routes that never need them.
- Splitting during spec writing — splits happen at implementation or audit time.
- Carry heading numbers or positional references from the monolith into leaves.
- Name leaves by order (`-2`, `part-2`, `01-`) instead of by concern.
