# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-02-08

### Added

- **SDK (`@stagware/nocodb-sdk`)**
  - Typed HTTP client (`NocoClient`) with retry, timeout, and error mapping
  - `MetaApi` class with 50+ methods for bases, tables, views, columns, filters, sorts, hooks, sources, tokens, users, comments, shared views/base, visibility rules, duplicates, app info, cloud workspaces
  - `DataApi` class for record CRUD and link operations
  - Auto-pagination via `fetchAllPages()`
  - Typed entities, responses, and error classes

- **CLI (`@stagware/nocodb-cli`)**
  - 90+ commands covering all NocoDB v2 API operations
  - Multi-workspace support with per-workspace aliases
  - Data import/export (CSV/JSON) with schema validation
  - Output formats: JSON, CSV, ASCII table, with `--select` field filtering
  - Dynamic API commands generated from Swagger specs
  - Configurable retry/timeout via `settings` commands
  - Environment variable support (`NOCO_TOKEN`, `NOCO_BASE_URL`, `NOCO_BASE_ID`)
  - Verbose mode (`--verbose`) for request timing and retry logging
