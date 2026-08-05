# Repo-Local Skill Template

Generate `.agents/skills/project-docdriven/SKILL.md` by default.

Required sections:

- frontmatter with `name: project-docdriven`
- project shape
- docs root
- project dynamics scan summary
- project-specific documentation decisions
- adaptive architecture and structural ownership summary
- adaptive human docs summary
- operational signals summary
- required read order
- project-specific routes
- validation commands
- update protocol
- links to `Docs/agent/context-map.md`
- links to `Docs/agent/manifest.json`
- links to `Docs/agent/init-scan.md`

The generated skill is agent behavior. It must not copy full project docs.
It may summarize detected operational signals so agents know which human docs
exist for setup, environment, configuration, services, deployment,
troubleshooting, and maintenance.
It should also say where the project intentionally diverges from the default
scaffold and where future agents may need to add, split, consolidate, or omit
docs based on evidence.
It should tell agents to follow the documented architecture, code style,
configuration flow, and route ownership instead of hardcoding generic agent
preferences.

Required workflow:

1. Read `Docs/agent/manifest.json`.
2. Load the smallest matching route shard.
3. Read route `readFirst` docs.
4. Inspect route `codeAreas`.
5. Update `updateDocs` and route shards after meaningful changes.
6. Run route validation.
7. Record gaps in `Docs/agent/gaps.md`.

Project continuity rules:

- Use executable truth and project docs before applying generic patterns.
- Do not invent default folders, architecture styles, config flows, or coding
  conventions.
- Look for existing reusable components, helpers, hooks, adapters, and project
  primitives before creating new one-off implementations.
- Keep feature-local code local until repeated use or stable responsibility
  justifies promotion.
- If a durable rule is unclear, infer from nearby code and record the gap.
- Docs describe where code contracts live; they do not duplicate type, schema,
  or interface definitions.
