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

## Human-facing docs

The rules above keep docs short. For docs that people read to learn a domain
(`Docs/human/`, question lists, briefings), short is not enough. Agent routing
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

