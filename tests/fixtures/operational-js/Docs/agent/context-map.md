# Context Map

Use this table to choose the smallest useful context route.

| Route ID | Task type | Knowledge | Code areas | Change signals | Validation | Owner |
|---|---|---|---|---|---|---|
| architecture-general | Architecture, code organization, structural ownership | `architecture.general` | src/** | structural ownership, dependency direction | test | unknown |
| feature-general | Feature behavior | `features.general` | src/** | user-facing behavior, feature logic | test | unknown |
| interface-general | Interface, API, CLI change | `interfaces.general` | src/** | public API, integration contracts | test | unknown |
| operations-setup | setup, local setup, onboarding | `operations.general` | .env.example, Dockerfile, docker-compose.yml, .github/workflows | install steps, prerequisites, local development | test | unknown |
| operations-environment | environment variable change, env change, secret setup | `operations.general` | .env.example, Dockerfile, docker-compose.yml, .github/workflows | env files, secrets, environment variables | test | unknown |
| operations-configuration | config file change, runtime setting, feature flag | `operations.general` | .env.example, Dockerfile, docker-compose.yml, .github/workflows | config files, runtime settings, feature flags | test | unknown |
| operations-services | service dependency change, external service, local service | `operations.general` | .env.example, Dockerfile, docker-compose.yml, .github/workflows | service connections, external APIs, docker services | test | unknown |
| operations-deployment | deployment change, release change, rollback | `operations.general` | .env.example, Dockerfile, docker-compose.yml, .github/workflows | deploy config, CI workflows, release process | test | unknown |
| operations-troubleshooting | troubleshooting, setup failure, runtime failure | `operations.general` | .env.example, Dockerfile, docker-compose.yml, .github/workflows | error handling, health checks, debugging | test | unknown |
| operations-maintenance | maintenance task change, migration, seed, scheduled job | `operations.general` | .env.example, Dockerfile, docker-compose.yml, .github/workflows | migrations, cron jobs, database seeds | test | unknown |
| operations-validation | validation command change, test command change, build command change | `operations.general` | .env.example, Dockerfile, docker-compose.yml, .github/workflows | test commands, build commands, lint configuration | test | unknown |
