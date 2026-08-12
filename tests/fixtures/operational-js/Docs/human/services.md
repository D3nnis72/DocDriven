---
id: human.operations.services
type: view
derivedFrom:
  - operations.general
---
# Services

Required external services, local emulators, and service checks.

| Service | Source | Local hint | Health hint |
|---|---|---|---|
| postgres | docker-compose.yml | Start with Docker Compose if configured. | Confirm service-specific health checks. |
| redis | docker-compose.yml | Start with Docker Compose if configured. | Confirm service-specific health checks. |
| @supabase/supabase-js | package.json | Confirm required account, emulator, or local service. | Confirm the service connection before development. |
| stripe | package.json | Confirm required account, emulator, or local service. | Confirm the service connection before development. |
| database | prisma/ | Confirm database URL and migration workflow. | Run the configured database check or migration command. |

Service contracts and details belong in canonical knowledge → `operations.general`.
