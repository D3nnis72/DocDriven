# Audit Checklist

Check:

- required DocDriven files exist
- `manifest.json` exists and parses
- route shards exist and parse
- route IDs are unique
- route docs paths exist
- route code areas resolve or are explicitly unknown
- route validation is declared
- `context-map.md` has required columns and matches route IDs
- docs do not duplicate canonical concepts
- docs stay under size targets
- generated placeholder text is not left as completed docs
- `tmp/` content is not treated as truth
- validation commands match executable project files
- a repo-local audit entrypoint exists when possible, usually
  `scripts/audit-docdriven.mjs`
- owned-code markers point to existing paths when present
- missing routes are listed in `Docs/agent/gaps.md`
- knowledge docs are referenced by at least one route or are folder routers
