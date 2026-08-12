---
id: human.operations.deployment
type: view
derivedFrom:
  - operations.general
---
# Deployment

Deploy targets, release commands, and rollback pointers.

| Target | Source | Command |
|---|---|---|
| Docker | Dockerfile | `npm run deploy` |
| GitHub Actions | .github/workflows | `npm run deploy` |
| scripted deploy | package.json | `npm run deploy` |

Detailed deployment truth belongs in canonical knowledge → `operations.general`.
