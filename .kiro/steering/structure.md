# Project Structure

## Monorepo Layout

```
nocodb-cli/
├── packages/
│   ├── sdk/          # TypeScript SDK for NocoDB v2 API
│   └── cli/          # Command-line interface
├── openapi/          # OpenAPI specifications (v2 and v3)
├── scripts/          # Build and e2e test scripts
└── .kiro/            # Kiro configuration and specs
```

## SDK Package (`packages/sdk/`)

```
packages/sdk/
├── src/
│   ├── index.ts           # Main exports, NocoClient, MetaApi, DataApi
│   ├── errors.ts          # Typed error classes
│   └── types/
│       ├── entities.ts    # Entity type definitions
│       └── responses.ts   # API response types
├── test/                  # Unit tests
├── dist/                  # Build output (gitignored)
└── package.json
```

**Key Classes**:
- `NocoClient`: Low-level HTTP client with retry logic and error mapping
- `MetaApi`: Metadata operations (bases, tables, views, columns, filters, sorts)
- `DataApi`: Data operations (CRUD on rows)

## CLI Package (`packages/cli/`)

```
packages/cli/
├── src/
│   ├── index.ts           # CLI bootstrap and command registration
│   ├── lib.ts             # Shared utilities and helpers
│   ├── config.ts          # Legacy config management
│   ├── settings.ts        # Settings (timeout, retry)
│   ├── aliases.ts         # Workspace and alias management
│   ├── container.ts       # Dependency injection container
│   ├── commands/          # Command implementations
│   │   ├── api.ts         # Dynamic API commands
│   │   ├── rows.ts        # Row CRUD operations
│   │   ├── links.ts       # Link management
│   │   ├── meta.ts        # Metadata operations
│   │   ├── data-io.ts     # Import/export
│   │   ├── schema.ts      # Schema introspection
│   │   ├── workspace-alias.ts  # Workspace management
│   │   ├── cloud-workspace.ts  # Cloud workspace APIs
│   │   ├── meta-crud/     # Metadata CRUD subcommands
│   │   │   ├── bases.ts
│   │   │   ├── tables.ts
│   │   │   ├── views.ts
│   │   │   ├── columns.ts
│   │   │   ├── filters.ts
│   │   │   └── sorts.ts
│   │   └── ...            # Other command modules
│   ├── config/
│   │   ├── manager.ts     # ConfigManager class
│   │   └── types.ts       # Config type definitions
│   ├── services/          # Business logic services
│   │   ├── meta-service.ts
│   │   ├── row-service.ts
│   │   ├── link-service.ts
│   │   ├── schema-service.ts
│   │   ├── storage-service.ts
│   │   └── swagger-service.ts
│   └── utils/             # Utility functions
│       ├── command-utils.ts
│       ├── error-handling.ts
│       ├── formatting.ts
│       ├── parsing.ts
│       └── swagger.ts
├── test/                  # Unit and integration tests
├── dist/                  # Build output (gitignored)
└── package.json
```

## Architecture Patterns

### Command Structure
- Commands are registered in `index.ts` via `register*Commands()` functions
- Each command module exports a registration function that attaches commands to the program
- Commands use the dependency injection container to access services

### Service Layer
- Services encapsulate business logic and API interactions
- Services are instantiated via the container with their dependencies
- Services use `NocoClient` and API classes from the SDK

### Configuration Management
- `ConfigManager`: Unified workspace and configuration management
- Workspaces store baseUrl, headers, baseId, and aliases
- Settings stored separately for timeout/retry configuration
- Environment variables override workspace config

### Dependency Injection
- `Container` class provides service instances
- Services registered with factory functions
- Lazy initialization of services

### Error Handling
- SDK throws typed errors (AuthenticationError, NotFoundError, etc.)
- CLI catches errors and formats them for terminal output
- `--verbose` flag shows stack traces

## Testing Conventions

- Tests co-located in `test/` directories within each package
- Unit tests mock external dependencies (HTTP, filesystem)
- Integration tests use temporary directories for config
- Property-based tests use fast-check for generative testing
- Test files mirror source structure: `src/foo.ts` → `test/foo.test.ts`

## Import Conventions

- All imports use `.js` extension (ESM requirement)
- Relative imports for local modules
- Absolute imports from `@stagware/nocodb-sdk` for SDK usage in CLI
- No default exports; use named exports

## Configuration Files

- `~/.nocodb-cli/config.json`: Legacy config (deprecated)
- `~/.nocodb-cli/workspaces.json`: Workspace configurations
- `~/.nocodb-cli/settings.json`: Timeout and retry settings
- `~/.nocodb-cli/cache/`: Cached swagger specs per base

## OpenAPI Specifications

- `openapi/v2/`: NocoDB v2 API specs (data and meta)
- `openapi/v3/`: NocoDB v3 API specs (future)
- Used for reference and dynamic command generation
