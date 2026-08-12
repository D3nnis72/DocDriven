# Context Map

Use this table to choose the smallest useful context route.

| Route ID | Task type | Knowledge | Code areas | Change signals | Validation | Owner |
|---|---|---|---|---|---|---|
| architecture-general | Architecture, code organization, structural ownership | `architecture.general` | src/** | structural ownership, dependency direction | test | unknown |
| feature-general | Feature behavior | `features.general` | src/** | user-facing behavior, feature logic | test | unknown |
| interface-general | Interface, API, CLI change | `interfaces.general` | src/** | public API, integration contracts | test | unknown |
| operations-general | setup, config, operations, deployment, validation command | `operations.general` | *.config.* | environment variables, configuration files, deployment targets | test | unknown |
