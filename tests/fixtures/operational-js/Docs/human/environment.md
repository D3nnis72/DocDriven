---
id: human.operations.environment
type: view
derivedFrom:
  - operations.general
---
# Environment

Environment variables and secret setup for local development.

| Variable | Required | Local example | Source | Missing impact |
|---|---|---|---|---|
| `DATABASE_URL` | unknown | `postgres://postgres:postgres@localhost:5432/operational_js` | .env.example | Confirm what breaks when this value is missing. |
| `SUPABASE_URL` | unknown | `http://localhost:54321` | .env.example | Confirm what breaks when this value is missing. |
| `SUPABASE_ANON_KEY` | unknown | `local-anon-key` | .env.example | Confirm what breaks when this value is missing. |
| `STRIPE_SECRET_KEY` | unknown | `sk_test_local` | .env.example | Confirm what breaks when this value is missing. |

Evidence:
- `.env.example`

Deeper truth belongs in canonical knowledge → `operations.general`.
