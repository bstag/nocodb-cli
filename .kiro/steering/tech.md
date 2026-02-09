# Technology Stack

## Build System & Package Management

- **Package Manager**: npm (v11+)
- **Monorepo**: npm workspaces with two packages (sdk, cli)
- **Build Tool**: tsup for bundling TypeScript to ESM
- **Module System**: ESM (type: "module" in package.json)
- **Node Version**: >=18

## Core Technologies

- **Language**: TypeScript 5.9+ with strict mode enabled
- **Runtime**: Node.js (ES2022 target)
- **HTTP Client**: ofetch for SDK requests
- **CLI Framework**: commander v14 for command parsing
- **Configuration**: conf v15 for persistent CLI settings
- **Schema Validation**: ajv v8 for JSON schema validation

## Testing

- **Framework**: vitest v4
- **Property-Based Testing**: fast-check v4 for generative testing
- **Test Location**: Co-located in `test/` directories within each package
- **Test Naming**: `*.test.ts` suffix

## TypeScript Configuration

- **Target**: ES2022
- **Module**: ESNext with Bundler resolution
- **Strict Mode**: Enabled with all strict checks
- **Declaration**: Generated with source maps
- **Shared Config**: `tsconfig.base.json` extended by packages

## Common Commands

### Development
```bash
npm install              # Install all dependencies
npm run build           # Build both packages (sdk first, then cli)
npm run dev             # Run CLI in development mode with tsx
npm test                # Run all tests in both packages
npm run lint            # Run linters (placeholder currently)
```

### Package-Specific
```bash
# SDK
npm --prefix packages/sdk run build
npm --prefix packages/sdk run test

# CLI
npm --prefix packages/cli run build
npm --prefix packages/cli run test
npm --prefix packages/cli run dev
```

### Testing
```bash
npm test                # Run all tests
npm run e2e             # Run end-to-end CLI tests
```

### Publishing
```bash
npm run prepublishOnly  # Runs build + test before publishing
```

## Build Outputs

- **SDK**: `packages/sdk/dist/` - ESM bundle with type declarations
- **CLI**: `packages/cli/dist/` - Bundled executable with shebang
- **CLI Binary**: `nocodb` command (defined in package.json bin field)

## File Extensions

- Source files use `.ts` extension
- Imports must include `.js` extension (ESM requirement)
- Test files use `.test.ts` suffix

## Environment Variables

- `NOCO_BASE_URL`: NocoDB instance URL
- `NOCO_TOKEN`: API authentication token
- `NOCO_BASE_ID`: Default base ID
- `NOCO_CONFIG_DIR`: Override config directory location
- `NOCODB_SETTINGS_DIR`: Override settings directory location
- `NOCO_QUIET`: Suppress output (set to "1")
- `NOCO_KEEP`: Keep test data in e2e tests (set to "1")
