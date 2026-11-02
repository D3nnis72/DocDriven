---
name: docdriven
description: Use when working in a Documentation Driven Development project or when creating, changing, or maintaining docs-driven architecture, implementation, or project documentation. Enforces read-before-change, dependency-aware propagation after changes, one canonical owner per concept, and separate human, agent, knowledge, and tmp documentation surfaces.
---

# DocDriven

DocDriven is Documentation Driven Development for agents and humans.

## Required Workflow

1. Check whether the project has a repo-local DocDriven skill.
2. If it exists, read it before continuing.
3. Read `Docs/agent/manifest.json` when present.
4. Load only the smallest relevant route shard.
5. Resolve the route's `knowledge` IDs to files via `knowledge-index.json` or convention.
6. If a resolved ID is a `type: overview` doc, read it first and select only the children relevant to the current task. Do not load all children by default — use the overview as a navigation hub.
7. Read canonical docs (`authority: canonical`) first.
8. Follow `extends` and `includes` for additional context as needed.
9. Follow `dependsOn` to load dependencies as supporting context (one level only, not transitive).
10. Before editing a knowledge doc, check size and scope. Split first when the
    file is oversized or mixes multiple routing concerns (see `_shared/doc-splitting.md`).
11. Do the work — change code and docs together.
12. Propagate changes through the knowledge graph (see Propagation below).
13. Run validation from the route.

## Core Rules

- Code and checks prove truth.
- `Docs/knowledge/` explains current truth. Each concept has one canonical owner.
- `Docs/human/` summarizes for people as derived views.
- `Docs/agent/` routes agents.
- `Docs/tmp/` is temporary and not truth.
- Never independently establish truth in a derived view.
- Reference knowledge IDs instead of duplicating content.
- Never create a knowledge doc for something fully expressed in code. Knowledge exists only for what grounding sources can't express (decisions, constraints, boundaries, strategies, ownership rules).
- Name files after the concern they answer, in lowercase kebab-case. A name is
  specific without its folder: subject plus aspect, usually two to four words,
  never a generic word alone (`invoice-extraction-quality.md`, not
  `invoices.md`). No order prefixes, no `part-2` (see `_shared/knowledge-schema.md`).
- The ID mirrors the path. Move or rename only with the rename procedure in
  `_shared/knowledge-schema.md`.
- Canvases are temporary and hold open work steps only. Rules go to the owner
  when settled, numbers stay in the finding; the canvas links both.
- If the `visual-markdown` skill is available, load it before writing human
  docs, status pages and canvases. Knowledge docs stay plain Markdown.
- No numbers in headings and no positional references ("see point 7"). Link
  knowledge IDs. Numbers are only for ordered steps in procedure docs.
- Follow the project's documented architecture and coding style.
- Prefer long-term project consistency over local convenience.

## Propagation

After any change, identify which knowledge IDs were affected and propagate:

1. **Update canonical docs** — the affected knowledge ID's canonical file.
2. **Follow extends** — update specializations that build on this concept.
3. **Follow includes** — verify the parent doc remains coherent.
4. **Follow derivedFrom (reverse)** — update views that summarize this source.
5. **Follow dependsOn (reverse)** — flag consumers for review.

Rules:

- Canonical first. Always update the canonical owner before touching dependents.
- Propagation is not optional. If a dependent exists, verify or update it.
- **Stop condition.** If verifying a parent/dependent confirms it is still accurate (includes list correct, summary unchanged), update only its `sourceVersion` and stop propagating further upward. Only continue upward if the parent's content actually changed.
- Flag, don't guess. If uncertain, write to `Docs/agent/gaps.md` rather than making a potentially wrong edit.
- Use `changeSignals` as a heuristic: if the diff semantically matches a route's change signals, review that route's knowledge IDs even if no doc was directly touched.
- Status carriers outside the graph count too. Canvases, specs, plans, roadmaps and tmp notes can still call the changed thing open, later or missing. Search them by the words of the changed concept and update or trim them in the same task. A user who asks "is it in the canvas too?" found one you skipped.

## Dynamic Structure

The DocDriven tree is a starting scaffold. Choose the final docs from project
evidence and reader needs.

- Add a human doc only when a person has a distinct task or question.
- Add a knowledge doc only when durable current truth needs a canonical home and that truth is not already expressed in code.
- Split knowledge docs when they exceed size targets or mix routing concerns.
  Prefer a subfolder + overview when 3+ leaves belong together; flat siblings
  when fewer leaves suffice. See `_shared/doc-splitting.md`.
- Split routes only when it reduces context load or clarifies ownership.
- Do not create docs for absent concepts.
- Record uncertain needs in `Docs/agent/gaps.md`.

## Hierarchy Growth

A knowledge folder with six or more leaf docs next to its `README.md` must be
grouped into subfolders with `README.md` overviews, in the same task that adds
the sixth leaf. The audit reports `crowded-knowledge-folder`.

**Direction change → structure pass.** When the project changes direction (new
goal or deliverable, replaced approach or pipeline, re-cut scope), check every
knowledge folder, not only the docs in the diff. Checklist in
`_shared/docdriven-structure.md` under Hierarchy Growth.

**Test for a knowledge doc's existence:**
1. Can I find this fact by reading code? → No doc. Use `groundedIn` to point at code.
2. Is this a decision/rule/constraint with no home in code? → Knowledge doc.
3. Is this a boundary that code implies but never states? → Knowledge doc.

## Project Continuity

Agents must not introduce favorite folders, architecture styles, config patterns,
or coding preferences. Use project evidence in this order:

1. Executable truth (formatter, linter, type, schema, config, test files)
2. `Docs/agent/` routes and validation protocol
3. `Docs/knowledge/` canonical docs
4. Nearby code when docs do not yet explain the convention

Before creating new code, search for existing reusable primitives. Keep
feature-local code local until reuse is real.

## Meaningful Changes

Update docs for behavior, public interface, config, environment, deployment,
dependency, schema, migration, architecture, ownership, and validation changes.

After any large task, multi-step implementation, refactor, or architectural
change, propagate through the knowledge graph before claiming the work complete.

## Stale Or Missing Docs

- If docs contradict code, inspect code and update the canonical doc first.
- If truth cannot be verified, record uncertainty in `Docs/agent/gaps.md`.
- If no route matches, update the route graph or record the gap.
- Missing documentation is part of the task.
- Before you report a gap, a limitation or a new requirement, search the canonical docs and canvases for an existing decision on it and cite it. A limitation the docs call intended is not a gap. A term from a canvas enters a canonical doc only after it matches the glossary, the code and the UI names.

## Capture Decisions And Corrections

A rule, decision, or correction the user states in chat is project truth as soon
as it applies beyond this turn. Record it without being asked.

1. When the user states a rule, decision, or process change, or points out a
   mistake in a flow, write it to its canonical owner in the same task. For a
   mistake, fix the flow or skill that allowed it, not only the output.
2. Use the project's own home: the subject's owning knowledge doc (or a
   `type: decision` doc in its folder, see Decision Docs in
   `_shared/knowledge-schema.md`), the flow doc, or `AGENTS.md` for working
   rules. Prefer repo files over private agent memory so the user and every
   agent can read the rule. A decision ledger in `playbook/` or a canvas may
   hold history and reasoning and link the owner; it is never where the rule
   lives.
3. Mark its status: decided, provisional (name the open question and who
   decides), deferred (name the `revisitWhen` trigger and keep the draft), or
   time-limited (name the date to revisit).
4. Name the file and section in the final reply. If you recorded nothing, say
   why.
5. Do not record a one-off instruction for the current task ("only October
   tickets this run"). Do not leave findings or working data in `/tmp` or only
   in the session; put them where the project keeps such material.

## Keep Status Docs Readable

A canvas, roadmap, status summary, or flow doc that several sessions update turns
into a log, and the user can no longer see what is open.

1. When you update one, rewrite the whole document, not only the changed line.
   Open items, their next step, and the owner come first, grouped by topic.
   Finished work shrinks to one line or moves to its canonical doc.
2. The first screen answers: what is open, what is next, where do I look. If it
   does not, restructure before you add anything.
3. When several canvases or plans cover one subject, give them one overview that
   says which file owns what, or one folder that opens with the overview. Do not
   add another sibling. A canvas folder is cut by work steps, never by topic
   (Playbook `brainstorming`).
4. A human overview or README starts with what it is and the command or entry
   point to start. Short paragraphs, not blocks of bullets nobody reads.

## Analysis Findings

Findings from an analysis or investigation do not get a new document by default.

1. Find the owner of the topic through the route and `knowledge-index.json`.
   Update the owner first and link run artifacts (scripts, extracts, data
   files) from there as evidence.
2. Write a dated report only for a bounded result that people will cite on its
   own. Look for an earlier report on the same subject first and extend or
   rewrite it around the current answer instead of adding a sibling. Replace
   superseded results; do not append a new result below contradictory old text.
3. A report holds the question, the answer, and the evidence. It references
   canonical IDs instead of restating them.
4. Numbers and measurements live in the finding or owner that produced them.
   Canvases, plans, and status docs link them instead of copying tables.
5. `Docs/agent/gaps.md` lists open uncertainty. Remove items once they are
   resolved or moved into their owner. Do not use it as a changelog.

## Replace Superseded Content

New evidence triggers a removal pass in the canonical doc and its affected
consumers, including canvases, status pages, question lists, specs and plans.
Read the whole affected document before adding the update. Replace old claims,
counts, pending approvals and completed work that the new evidence supersedes.
Marking them "outdated" and appending the correction is not enough.

Keep an older result only when it still serves a concrete current purpose:
explaining an unresolved risk, a regression, a decision or a required historical
comparison. Keep only the context needed for that purpose and its source. "We
might need it someday" is not a retention reason. Git and linked run artifacts
hold the history; do not create an archive doc or a new history section just to
avoid deleting stale prose. Preserve still-valid limitations, open work and
applicable decisions. Do not delete original evidence, run artifacts or other
people's changes as part of prose cleanup.

After rewriting, search for removed claims and heading anchors across affected
consumers. Remove obsolete tasks and whole docs that no longer have a purpose;
update links to surviving owners or evidence. Before finishing, read the result
as one current answer: no conflicting statuses, duplicate snapshots or completed
steps presented as pending. A smaller current doc is a successful update.

## Completion Evidence

Give this evidence in your final reply to the user. Do not write it into docs.
No route, owner-read, or validation trailers, and no session logs. Docs hold
current truth and the sources for it, not a record of how the agent worked.

When finishing DocDriven work, report:

- Knowledge IDs read
- Routes used
- Code changed
- Canonical docs updated
- Propagation performed (which dependents were updated/verified/flagged)
- Validation run
- Gaps recorded

## Knowledge Doc Splits

Oversized knowledge files defeat routing. Before appending to a knowledge doc:

- Multiple independently routable concerns → split immediately, any size.
- Over 3,000 words → split by default unless a documented exception applies
  (brainstorm, research snapshot, ledger, historical reference), marked with
  `sizeException` and `revisitWhen`. No exception passes 6,000 words.
- 1,500–3,000 words → review during maintainability pass; split only if concerns
  diverge.
- Parent keeps the stable ID and becomes `type: overview` with `includes`.
- Leaves `extend` the parent and carry `groundedIn` when they explain code.
- Split `dependsOn` per leaf; do not copy the monolith's full list everywhere.
- Long exception docs must not sit on broad routes that never need them.
- Moved sections lose their heading numbers, positional references become IDs,
  and leaves are named after their concern, never by order.

Full heuristics, split-plan format, and propagation checklist:
`_shared/doc-splitting.md`.

## References

- Read `_shared/knowledge-schema.md` for the frontmatter and relationship schema.
- Read `_shared/docdriven-structure.md` for the documentation model.
- Read `_shared/doc-splitting.md` before splitting or restructuring knowledge docs.
- Read `_shared/agent-operating-contract.md` for route protocol.
- Read `_shared/writing-style.md` before writing or editing docs.
