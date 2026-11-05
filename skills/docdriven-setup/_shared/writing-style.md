# DocDriven Writing Style

- Use simple language.
- Use short declarative sentences.
- Prefer bullets and tables.
- Avoid marketing language.
- Avoid generic explanations.
- Link to canonical docs instead of copying content.
- Mark uncertainty explicitly.
- Replace stale text instead of appending corrections.
- **Reference by ID, never duplicate.** When another knowledge ID owns a concept,
  reference it by ID. A single orienting sentence is acceptable. Anything more
  belongs in the canonical owner.

## Headings and references

- No numbers in headings. A number is a position, and positions change when a
  doc splits or sections move. Exception: ordered steps in a `procedure` doc,
  counted from 1 in that file.
- A project that needs stable numbers (requirements, decisions) uses IDs that
  never move (`FR-12`, `ADR-004`), not positions.
- Never refer to a position ("see point 7", "section 3", "§4"). Link the
  knowledge ID or the heading anchor.
- Sections that move into another file lose their old numbers, and positional
  references to them are replaced across the whole package.

## Problem collections and review overviews

A problem entry contains a concrete failure and the desired behaviour, usually in
one short paragraph. Put evidence directly below it. If a missing fact changes the
fix or priority, add that specific open question. Keep confirmed causes and partial
fixes with their remaining scope; link detailed investigations to their owner.

An overview entry contains a short title, priority, one sentence explaining the
impact, and a link to the problem. The detail page owns reproduction, causes and
acceptance checks.

For example: “The supplier list cannot be sorted by name or spend. Make the
columns sortable in both directions across all filtered pages.” A screenshot's
unrelated empty cells do not need a second investigation in this entry.

These entries are complete when the reader can identify the problem and expected
result. Their length follows the information needed, not the human-file targets.

## Explanations and briefings

The rules above keep docs short. For docs that people read to learn a domain
(domain guides and briefings), short is not enough. Agent routing
docs stay tight.

- Define every domain term, acronym, and code on first use, or link the
  knowledge ID that defines it. Do not assume the reader knows the domain.
- Explain each non-obvious concept with one real example from the project: the
  actual file, column, and value.
- Order by the reader's questions: what is this, why does it matter here, what
  does the example show, what is still open.
- For every question or requirement, say why it exists and what we do with the
  answer.
- Replace vague labels such as "historical data" with what they refer to.
- When a reader says "I don't get this", fix the order and the examples, not
  only the wording.

Size targets:

- Router files: 100-250 words.
- Human files: 300-700 words.
- Agent protocol files: 200-500 words.
- Knowledge leaf files: 300-1,500 words for a focused leaf; 1,500-3,000 needs
  review; over 3,000 split by default unless a documented exception applies.
- Knowledge overview files: 100-400 words of navigation; link to leaves.

Split immediately when multiple independently routable concerns appear, regardless
of size. See `doc-splitting.md`.

