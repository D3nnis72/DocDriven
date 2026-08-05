# DocDriven Structure

DocDriven separates executable truth from explanatory truth.

- Code, tests, configs, schemas, migrations, and build outputs are executable evidence.
- `Docs/knowledge/` contains the canonical explanation of current project truth.
- `Docs/human/` contains short human-facing orientation and day-one operating docs.
- `Docs/agent/` contains the protocol agents use to find and update context.
- `Docs/tmp/` contains temporary plans, visions, notes, and working material.

Default scaffold:

```text
Docs/
├── README.md
├── human/
├── agent/
│   ├── manifest.json
│   ├── init-scan.md
│   ├── context-map.md
│   ├── gaps.md
│   └── routes/
├── knowledge/
└── tmp/
```

Rule: code and checks prove truth; knowledge explains truth; human docs summarize it; agent docs route to it; tmp docs are not truth until promoted.

The scaffold is not a closed structure. Agents should choose the final docs
tree from project evidence, reader needs, ownership boundaries, and validation
reality.

## Adaptive Architecture Contract

The generated architecture structure is a guideline, not a cage. DocDriven must
describe the architecture that exists in the repository and the conventions the
project has chosen for the long term.

Architecture docs should capture:

- current system shape and major boundaries
- dependency direction and import boundaries
- structural ownership for config, code contracts, schemas, generated code,
  provider adapters, shared utilities, and package boundaries
- reuse and composition rules for components, hooks, helpers, adapters, test
  helpers, and shared project primitives
- durable coding patterns that are specific to this project
- when to add, split, rename, or consolidate folders, docs, or route shards

Agents must not hardcode generic preferences such as `types/`, `utils/`,
`services/`, Clean Architecture, MVC, feature folders, or any other pattern just
because it is familiar. They must follow documented project architecture,
executable style config, validation commands, and nearby code.

Docs should not duplicate type, schema, or interface definitions. They should
explain where authoritative code contracts live, which module owns them, how
consumers access them, and when changes require docs or route updates.

Agents should look for existing reusable project primitives before creating new
ones. Reusable components, hooks, helpers, adapters, contracts, config helpers,
and test helpers should have a documented home when they become durable. Keep
feature-local code local until repeated use, stable responsibility, or a
documented composition pattern justifies promotion.

Add structure only when evidence justifies it:

- repeated responsibility appears in multiple places
- ownership is unclear for config, contracts, adapters, or shared code
- files grow beyond a single clear responsibility
- imports cross boundaries in ways that need a rule
- hardcoded runtime settings appear or a config flow is needed
- a new package, domain, service, provider, or integration introduces a boundary
- reusable components, helpers, hooks, adapters, or shared primitives start
  accumulating without clear ownership
- a convention is important enough to validate, lint, test, or audit

When evidence is weak, record a gap instead of inventing structure.

`Docs/human/` usually starts with `overview.md`, `setup.md`, `commands.md`, and
`architecture.md`. Projects with operational evidence may have adaptive human
docs such as `environment.md`, `configuration.md`, `services.md`,
`deployment.md`, `troubleshooting.md`, and `maintenance.md`. These names are
examples, not the full set of valid human docs.

Human docs contain actionable setup and operation facts. Deeper configuration,
service, deployment, and maintenance truth belongs in `Docs/knowledge/operations/`,
with human docs linking there instead of copying implementation detail.

Add docs only when they have a clear job:

- a human doc answers a distinct human question
- a knowledge doc owns durable current truth
- a route shard lowers agent context load or clarifies ownership
- a tmp doc captures temporary work that is not yet truth

If the evidence is weak, record a gap instead of inventing a file.
