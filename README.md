# DocDriven

DocDriven gives your agent a compact, always-current documentation map of your
codebase.

We do not care about pretty documentation. We care that the agent understands
the system.

That is the whole point.

The agent needs the smallest amount of current context that lets it write the
best possible code. Not more. 

DocDriven keeps documentation compact, routed, and current. Agents read the
smallest useful context, make the change, update the affected docs, and leave
validation evidence. Every update enriches the next agent run, because the
project teaches the agent while work is happening.

The failure mode is obvious: if the agent does not understand the codebase, it
guesses. In large projects that means invented types, duplicated decisions,
parallel systems, stale assumptions, and code that looks plausible but does not
fit.

DocDriven exists to stop that.

DocDriven treats documentation as project infrastructure.

It is built for long-lived projects. The agent should not bring a new personal
architecture to every task. It should learn the project's documented structure,
style, config flow, and validation rules, then make the next change fit that
system.

The skill must stay adaptive. Before creating or judging docs, the agent should
ask what kind of project it is in, how large and mature it is, where the project
appears to be going, and what future agents will need to avoid bad changes.
Small projects need compact docs. Very large projects need stronger routing,
clearer ownership, reproducible checks, and explicit update discipline.

## Quickstart

Install all skills:

```bash
npx skills add D3nnis72/DocDriven
```

Install one skill:

```bash
npx skills add D3nnis72/DocDriven --skill docdriven
```

Then, in a project:

1. Run `docdriven-init`.
2. Review the detected project dynamics.
3. Run `docdriven-build`.
4. Work normally with `docdriven`.
5. Run `docdriven-audit` before major merges or periodically.

If you do not know how to start, give this README to your coding agent and tell
it to set up DocDriven for the project. The important part is that it keeps the
system in Markdown files, updates them while it works, and uses the route graph
before changing code.

## How It Works

It starts when an agent enters a project. Instead of jumping straight into code,
the agent first asks: what kind of work is this, and where is the smallest
reliable context for it?

`docdriven-init` scans the repository. It looks at package usage, frameworks,
scripts, source layout, config files, validation commands, and uncertain areas.
From that scan, it creates a repo-local DocDriven skill that tells future agents
how this specific project works.

`docdriven-build` creates the documentation graph. Humans get short orientation
docs. Agents get route files. The project gets canonical knowledge docs. Tmp
plans and notes stay separate until they are promoted into current truth.

When an agent works on the project, it reads the route graph, loads the smallest
relevant route shard, then reads only the docs and code areas needed for the
task. After changing code, it updates the affected docs in the same task. If
something is missing, stale, or uncertain, it records the gap instead of hiding
it.

`docdriven-audit` checks whether the graph is still current. It looks for stale
routes, missing docs, weak validation, unresolved placeholders, orphan knowledge
docs, weak architecture contracts, undocumented structure signals, missing
configuration-pattern documentation, and route/code drift.

Audit should be reproducible inside the target project. The preferred shape is
a local `scripts/audit-docdriven.mjs` entrypoint, backed by the installed
DocDriven audit implementation, plus a documented command such as
`docs:audit` when the project has package scripts.

There is more to it, but that is the core: DocDriven gives agents a shared,
continuously maintained context layer. The agent does not need to remember the
whole repository. It needs a reliable route to the right truth.

This matters for safety and economics. Context is expensive. Bad context is more
expensive. If agents do not understand the system, they waste tokens, write more
code than needed, miss existing abstractions, and make changes that are harder
to review. DocDriven makes understanding the codebase part of the job.

## The Core Model

DocDriven separates executable truth from explanatory truth.

- Code, tests, configs, schemas, migrations, and build outputs are executable evidence.
- `Docs/knowledge/` contains the canonical explanation of current project truth.
- `Docs/human/` contains short human-facing orientation and operating docs.
- `Docs/agent/` contains the protocol agents use to find and update context.
- `Docs/tmp/` contains temporary plans, visions, notes, and working material.

The rule:

> Code and checks prove truth. Knowledge explains truth. Human docs summarize it.
> Agent docs route to it. Tmp docs are not truth until promoted.

## The Basic Workflow

1. `docdriven-init` studies the project dynamics.
2. It generates `.agents/skills/project-docdriven/SKILL.md`.
3. `docdriven-build` creates the `Docs/` tree, manifest, route shards, init scan, and starter docs.
4. `docdriven` guides normal work: read route, load scoped docs, inspect code, change code and docs together.
5. `docdriven-audit` checks drift, stale routes, weak validation, placeholders, orphan docs, and missing coverage.

The agent workflow is:

```text
skill -> manifest -> route shard -> canonical docs -> code -> docs update -> validation -> audit evidence
```

## What's Inside

### Skills

- `docdriven`: the daily Documentation Driven Development workflow.
- `docdriven-init`: scans a repository and generates the repo-local DocDriven skill.
- `docdriven-build`: creates the initial `Docs/` structure and route graph.
- `docdriven-audit`: checks documentation drift, routing, validation, and coverage.

### Generated Project Structure

```text
Docs/
|-- README.md
|-- human/
|   |-- overview.md
|   |-- setup.md
|   |-- commands.md
|   |-- architecture.md
|   `-- adaptive files when detected
|-- agent/
|   |-- manifest.json
|   |-- init-scan.md
|   |-- context-map.md
|   |-- update-protocol.md
|   |-- validation.md
|   |-- writing-style.md
|   |-- naming.md
|   |-- gaps.md
|   `-- routes/
|       |-- architecture.json
|       |-- features.json
|       |-- interfaces.json
|       `-- operations.json
|-- knowledge/
|   |-- README.md
|   |-- architecture/
|   |-- features/
|   |-- interfaces/
|   `-- operations/
`-- tmp/
    `-- README.md
```

### Shared Skill Files

`npx skills` installs one skill directory at a time, so a skill can only rely on
files inside its own folder. `skills/_shared/` is the canonical source, and each
skill carries a generated copy of the shared files it uses in
`skills/<skill>/_shared/`.

Edit `skills/_shared/`, then run:

```bash
node scripts/sync-shared.mjs
```

Two checks keep this honest and run in CI:

- `node scripts/sync-shared.mjs --check` fails when a copy drifts from the source.
- `node scripts/verify-install.mjs` copies each skill out of the repo on its own
  and fails when a reference or script import no longer resolves.

## Scalable Routing

Large projects should not have one giant routing file. DocDriven uses a small
root manifest and focused route shards.

- `Docs/agent/manifest.json` points to route shards.
- `Docs/agent/routes/*.json` maps task types to docs, code areas, update targets, owners, and validation.
- `Docs/agent/context-map.md` is the readable route view.
- `Docs/agent/init-scan.md` records detected project dynamics and uncertain items.
- `Docs/agent/gaps.md` records missing routes, unknown ownership, and docs debt.

Route shards can be split by package, domain, feature area, or interface area.
The goal is low-token context loading: agents read the index, choose a shard,
and load only the relevant project truth.

## Adaptive Architecture

DocDriven treats architecture as an adaptive contract. The generated structure
is a starting map, not a mandatory project shape.

Architecture docs should explain how the current project is organized, where
authoritative code contracts live, which modules own configuration and adapter
boundaries, what dependency direction is allowed, and which coding patterns are
durable. They should not copy type, schema, or interface definitions from code.
They should also explain where reusable components, hooks, helpers, adapters,
test helpers, and shared project primitives live when the project has them.

Agents must not hardcode favorite folders, architecture styles, config flows,
or coding conventions. If the project has a documented rule, follow it. If the
rule is missing, inspect nearby code, choose the smallest consistent change,
and record the gap instead of silently starting a parallel pattern.

New folders, docs, or route shards are justified by evidence: repeated
responsibility, unclear ownership, files that outgrow one purpose, boundary
changes, hardcoded runtime settings, shared contracts, or conventions important
enough to validate.

Reuse follows the same rule. Prefer existing project primitives over new
one-off implementations. Keep feature-local code local until repeated use,
stable responsibility, or a documented composition pattern justifies promotion.

## Why This Exists

Most project documentation tries to serve too many readers at once.

Humans need quick orientation:

- What is this project?
- How do I set it up?
- Which environment variables, config files, services, and accounts do I need?
- How do I run, test, build, and deploy it?
- What is the architecture in simple terms?
- What should I know before operating or changing it?

Agents need precise routing:

- What kind of task is this?
- Which docs must be read first?
- Which files contain the canonical explanation?
- Which code areas are likely affected?
- Which docs must be updated after the change?
- Which command or evidence proves the change?

DocDriven separates those needs without duplicating project truth.

The main failure mode is not "there are no docs." The main failure mode is that
agents cannot tell which docs matter, whether they are current, and what code
they own. In large projects, that turns into bad engineering fast: duplicated
models, invented interfaces, stale assumptions, missed validation, and changes
that look plausible but do not fit the system.

DocDriven exists to stop that. It gives agents a compact route into the project
instead of asking them to search blindly.

## Philosophy

- Documentation is infrastructure.
- The system is agent-first.
- Human docs should orient; agent docs should route.
- Compact, current, routed context beats long prose.
- Current truth beats historical explanation.
- Code and checks are evidence.
- Knowledge docs explain the current system.
- Architecture docs preserve long-term project continuity.
- Every concept should have one canonical home.
- Agents should read the smallest useful context, not the whole docs folder.
- Agents should follow documented project style, not generic agent taste.
- Agents should reuse documented project primitives before creating parallel implementations.
- Meaningful code changes should update docs in the same task.
- Large LLM-driven tasks, refactors, migrations, and architecture changes are
  not complete until the affected DocDriven docs are current.
- Missing docs are part of the work, not a later cleanup.
- Uncertainty should be recorded, not hidden.
- Audits should detect drift, not just lint Markdown.
- We care less about documentation as an artifact and more about whether the
  next agent can understand the codebase quickly and safely.

## Updating

DocDriven works best when it is used continuously.

Run `docdriven-audit` before major merges, after large refactors, after changing
package scripts or validation commands, and whenever agents start getting lost.

The more the project changes, the more important the route graph becomes.
The larger the project becomes, the more important local audit commands,
route ownership, and post-change documentation updates become.
