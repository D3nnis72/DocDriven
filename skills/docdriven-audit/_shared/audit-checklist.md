# Audit Checklist

## Structure Checks (check-frontmatter)

- Every file in `knowledge/` has frontmatter with `id`, `type`, `authority: canonical`
- Every view in `human/` or `agent/` (non-JSON) has `id`, `type`
- Views have `derivedFrom`; canonical docs do not have `derivedFrom`
- All `id` values are unique across the docs tree
- ID format matches `dot.separated.name` convention
- `type` is one of: architecture, rule, decision, summary, procedure, overview, view
- No files in `knowledge/` missing frontmatter
- Knowledge index is in sync with actual frontmatter IDs and paths

## Graph Checks (check-graph)

- No circular `extends` chains
- No circular `dependsOn` chains
- If A `includes` B, then B `extends` A (bidirectional consistency)
- All `dependsOn` targets exist as declared IDs
- All `derivedFrom` targets are canonical docs (cannot derive from a view)
- All `extends` targets exist as declared IDs
- All `includes` targets exist as declared IDs
- No orphan canonical docs (not referenced by any route's `knowledge` array)
- Views do not have `authority: canonical`
- Every route `knowledge` ID resolves to an existing doc

## Impact Checks (check-impact)

- Given a changed knowledge ID, list all direct dependents
- Traverse `extends` to find specializations
- Traverse `includes` (reverse) to find parent docs
- Traverse `derivedFrom` (reverse) to find views
- Traverse `dependsOn` (reverse) to find consumers
- Report propagation targets by relationship type

## Route Checks

- `manifest.json` exists and parses
- Route shards exist and parse
- Route IDs are unique across shards
- Route `knowledge` IDs resolve via knowledge-index.json or convention
- Route code areas resolve or are explicitly unknown
- Route validation is declared and not weak
- Route shards stay under 500 lines
- `context-map.md` has required columns and route IDs match shards

## Content Checks

- Required DocDriven files exist
- Docs stay under size targets (human 700, agent 500, knowledge 1500 focused leaf,
  router 250 words; knowledge 1500-3000 review band; over 3000 split by default)
- Oversized knowledge docs have split-required or split-review-required findings
- Split plans in `tmp/splits/` are executed or deleted, not left as truth
- File and folder names are lowercase ASCII kebab-case, carry no order prefix or
  revision suffix, and are not vague (`invalid-file-name`, `ordinal-file-name`,
  `vague-file-name`)
- H2 headings are not numbered; a numbered sequence starts at 1 without gaps and
  only appears in procedure docs (`heading-numbering`, `numbered-headings`)
- No positional references ("point 7", "§4") in knowledge or human docs
  (`positional-reference`)
- Generated placeholder text is not left as completed docs
- `tmp/` content is not treated as truth
- Validation commands match executable project files
- owned-code markers point to existing paths
- Adaptive human docs exist when routes/signals require them
- Architecture contract has required sections

## Change-Scoped Checks

- Diff determines changed concepts
- Changed concepts map to knowledge IDs
- Explicit dependents (extends, includes, derivedFrom, dependsOn) are identified
- Concept search catches undeclared relationships
- Each finding gets an action: Update, Verify, Add gap, Promote, Split, None
