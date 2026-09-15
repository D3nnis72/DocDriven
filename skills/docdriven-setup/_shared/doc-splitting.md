# Knowledge Doc Splitting

Split knowledge docs so agents load the smallest useful context. One canonical
owner per concept; a file is not a concept when it answers several independent
routing questions.

## When to split

**Before writing** (preventive): if the target knowledge file is over 1000
words, or the edit adds a second independently routable concern, split first,
then write.

**During audit** (corrective): the audit script flags oversized docs. Execute
splits before other doc updates when a doc is in scope and split-required.

Do not split when the file is one concern that only needs shortening.

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

## Split heuristics

1. Cluster sections (audit provides H2 headings as hints).
2. Target 300–800 words per leaf; up to 1000 for one concern.
3. Merge small sections that only make sense together.
4. Do not create one file per H2 by default.
5. IDs: `features.foo.bar-baz` → `bar-baz.md` (names from concerns, not headings).

Ask the user only when two split shapes are equally valid. Obvious monsters (1500+
words, many H2s) → split without asking.

## Split plan (temporary)

Write to `Docs/tmp/splits/YYYY-MM-DD-<id>-split-plan.md` before executing.
Delete the plan after the split lands. Record unresolved boundaries in
`Docs/agent/gaps.md`.

```markdown
# Split plan: <knowledge-id>

**Source:** <path> (<words> words)
**Structure:** flat siblings | subfolder + overview
**Parent ID:** <unchanged id, becomes overview>

| New ID | File | Sections | extends | dependsOn | groundedIn |
|--------|------|----------|---------|-----------|------------|
| ... | ... | ... | parent | ... | ... |

**Not splitting:** ...
**Siblings to update:** ...
**Propagation:** knowledge-index, route shards, grep old path
```

## Propagation checklist

After a split:

1. Create overview + leaves with frontmatter.
2. Move content once; no duplication between parent and children.
3. Update `knowledge-index.json` and route shard `knowledge` IDs.
4. Point routes at the smallest leaf per task type.
5. Update existing `dependsOn` / `derivedFrom` references.
6. Delete the monolith file (or leave a one-line stub only if external links
   require it — prefer updating references).
7. Delete the split plan in `Docs/tmp/splits/`.

## What not to do

- Mandatory folder taxonomy (`principles/`, `implementation/`, …).
- Subfolder with only one leaf.
- Overview body over ~400 words of duplicated leaf content.
- `dependsOn` chains deeper than one hop for routing context.
- Splitting during spec writing — splits happen at implementation or audit time.
