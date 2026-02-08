# NocoDB CLI — Status & Roadmap

## What's Done

### SDK (`packages/sdk/src/`)

50+ methods covering CRUD for core metadata and data endpoints, all with typed generics:

- **Bases** — list, create, get, getInfo, update, delete
- **Tables** — list, create, get, update, delete
- **Views** — list, create (v2 type-specific endpoints), get, update, delete
- **View Config** — getFormView, updateFormView, getGalleryView, updateGalleryView, getKanbanView, updateKanbanView, updateGridView
- **View Columns** — listViewColumns
- **View Creation** — createGridView, createFormView, createGalleryView, createKanbanView (v2 type-specific)
- **Filters** — list, create, get, update, delete, listFilterChildren
- **Sorts** — list, create, get, update, delete
- **Columns** — list, create, get, update, delete, setColumnPrimary
- **Links** — listLinks, linkRecords, unlinkRecords (`DataApi`)
- **Hooks** — listHooks, createHook, getHook, updateHook, deleteHook, testHook, listHookFilters, createHookFilter
- **Sources** — listSources, createSource, getSource, updateSource, deleteSource
- **Tokens** — listTokens(baseId), createToken(baseId, body), deleteToken(baseId, tokenId) *(v2 base-scoped)*
- **Base Users** — listBaseUsers, inviteBaseUser, updateBaseUser, removeBaseUser
- **Comments** — listComments, createComment, updateComment, deleteComment
- **Shared Views** — listSharedViews, createSharedView, updateSharedView, deleteSharedView
- **Shared Base** — getSharedBase, createSharedBase, updateSharedBase, deleteSharedBase
- **Duplicate** — duplicateBase, duplicateSource, duplicateTable (with excludeData/excludeViews/excludeHooks options)
- **Visibility Rules** — getVisibilityRules, setVisibilityRules (UI ACL)
- **App Info** — getAppInfo (server version, config)
- **Swagger** — getBaseSwagger
- **Storage** — uploadAttachment
- **Schema** — introspectTable (returns full table schema with columns, primary key, display value, relations)
- **Pagination** — `NocoClient.fetchAllPages<T>()` auto-fetches all pages of any paginated endpoint
- **Low-level** — `NocoClient.request<T>()`, `parseHeader()`, `normalizeBaseUrl()`
- **Typed responses** — all methods use generics (e.g., `Promise<ListResponse<Base>>`, `Promise<Table>`)
- **Typed entities** — `Base`, `Source`, `SourceType`, `Table`, `View`, `Column`, `Filter`, `Sort`, `Row`, `Hook`, `ApiToken`, `BaseUser`, `Comment`, `SharedView`, `SharedBase`, `ViewColumn`, `FormView`, `GalleryView`, `KanbanView`, `GridView`, `AppInfo`, `VisibilityRule`, `DuplicateOptions`, `ViewType`, `ColumnType`
- **Typed errors** — `AuthenticationError`, `NotFoundError`, `ConflictError`, `ValidationError`, `NetworkError`
- **Retry/timeout** — configurable via `RetryOptions` and `timeoutMs`

### CLI (`packages/cli/src/`)

90+ commands including:

- **Config** — `config set/get/show`
- **Headers** — `header set/delete/list`
- **Raw requests** — `request <method> <path>` with `--query`, `--header`, `--data`, `--data-file` options
- **Bases** — `bases list/get/info/create/update/delete`
- **Tables** — `tables list/get/create/update/delete`
- **Views** — `views list/get/create/update/delete` (create supports `--type grid|form|gallery|kanban|calendar`, uses v2 type-specific endpoints)
- **View Config** — `views config get/update <viewId> --view-type <type>` (form, gallery, kanban, grid type-specific settings)
- **View Columns** — `views columns list <viewId>` (field visibility/order)
- **Comments** — `comments list/create/update/delete` (row comment management)
- **Shared Views** — `shared-views list/create/update/delete` (public view links)
- **Shared Base** — `shared-base get/create/update/delete` (public base sharing)
- **Filters** — `filters list/get/create/update/delete/children` (children lists nested filter groups)
- **Sorts** — `sorts list/get/create/update/delete`
- **Columns** — `columns list/get/create/update/delete/set-primary` (with JSON schema validation)
- **Rows** — `rows list/read/create/update/delete/upsert/bulk-create/bulk-update/bulk-upsert/bulk-delete` (with schema validation, `--match`, `--create-only`, `--update-only`, `--all` auto-paginate)
- **Links** — `links list/create/delete`
- **Storage** — `storage upload <filePath>`
- **Schema** — `schema introspect <tableId>` (discover columns, primary key, display value, relations)
- **Hooks** — `hooks list/get/create/update/delete/test` (webhook management), `hooks filters list/create` (hook filter management)
- **Sources** — `sources list/get/create/update/delete` (data source management per base)
- **Tokens** — `tokens list/create/delete <baseId>` (base-scoped API token management, v2)
- **Users** — `users list/invite/update/remove` (base collaborator management)
- **Meta** — `meta swagger/endpoints/cache clear`
- **Dynamic API** — `--base <id> api <tag> <operation>` auto-generated from Swagger
- **Settings** — `settings show/path/set/reset` (timeout, retry count, retry delay, retry status codes)
- **Workspaces** — `workspace add/use/list/show/delete` (multi-account support)
- **Aliases** — `alias set/list/delete/clear` (friendly names for table IDs, namespaced by workspace)
- **Env var support** — `NOCO_TOKEN`, `NOCO_BASE_URL`, `NOCO_BASE_ID` override workspace config for CI/CD
- **Data I/O** — `data export <tableId>` (CSV/JSON, `--out`, `--format`, `--query`) and `data import <tableId> <file>` (CSV/JSON, auto-paginated export, batched import with swagger validation via RowService)
- **Output formats** — `--format json|csv|table` on all commands, `--pretty` for indented JSON
- **Verbose mode** — `--verbose` for request timing and retry logging
- **Error handling** — contextual HTTP error messages with status codes and response bodies

### Testing (32 test files, 822+ tests)

- Unit tests for config, headers, settings, and utility parsing
- Unit tests for MetaService, RowService, LinkService, StorageService, SwaggerService
- Unit tests for row upsert, bulk row, and bulk upsert command behavior
- E2E tests with mock HTTP servers for all CRUD commands (bases, tables, views, columns, filters, sorts, links, rows, request)
- E2E tests for workspace and alias management
- Performance tests
- Comprehensive live E2E suite (`scripts/e2e-cli.mjs`) covering 40+ column types, CRUD, link columns, attachments, swagger caching, schema introspection

### API Endpoint Notes

- Most endpoints use NocoDB v2 API (`/api/v2/meta/...`)
- **View creation** now uses v2 API: `POST /api/v2/meta/tables/{tableId}/grids` (and `/forms`, `/galleries`, `/kanbans`)
- The e2e script uses only CLI commands — no direct API calls

---

## What's Still Missing

### SDK Gaps

- ~~**No pagination helpers** — no cursor/offset wrappers for large result sets~~ ✅ Done
- ~~**No user/auth APIs** — no profile, token management, or invitation endpoints~~ ✅ SDK+CLI Done — `tokens list/create/delete`, `users list/invite/update/remove`, `me` ⚠️ e2e blocked: tokens requires session auth (401 with xc-token), users response format needs investigation
- ~~**No webhook/automation APIs** — no hook creation or management~~ ✅ SDK+CLI Done — `hooks list/get/create/update/delete/test` ⚠️ e2e blocked: hook v2 create returns 400 "deprecated / not supported" — needs v3 webhook API migration
- **No NocoDB workspace/org APIs** — no NocoDB-level workspace CRUD or member management (distinct from CLI workspaces)
- **No audit log APIs** — no activity or change tracking
- ~~**No export/import APIs** — no CSV/JSON export or import~~ ✅ Done (client-side via `data export` / `data import`)
- ~~**No comment/collaboration APIs** — no discussion or @mention support~~ ✅ Done — `comments list/create/update/delete`

### CLI Gaps

- ~~**No `nocodb me`** — no quick way to verify auth/identity~~ ✅ Done
- ~~**No env var support for config** — no `NOCO_TOKEN`, `NOCO_BASE_URL` env vars for CI/CD~~ ✅ Done
- ~~**No help examples** — commands lack inline usage examples~~ ✅ Done
- ~~**No `--select` field filtering** — no way to pick specific fields from output~~ ✅ Done

---

## Easy Wins

| # | Feature | Effort | Impact | Notes |
|---|---------|--------|--------|-------|
| 1 | ~~`nocodb me` command~~ | ~~~20 lines~~ | ~~Low~~ | ✅ Done — `nocodb me` calls `/api/v2/auth/user/me` |
| 2 | ~~Env var support for all config options~~ | ~~~30 lines~~ | ~~Medium~~ | ✅ Done — `NOCO_TOKEN`, `NOCO_BASE_URL`, `NOCO_BASE_ID` |
| 3 | ~~Pagination helpers (auto-fetch all pages)~~ | ~~~60 lines~~ | ~~Medium~~ | ✅ Done — `--all` flag + `fetchAllPages()` |
| 4 | ~~`--select` field filtering on output~~ | ~~~40 lines~~ | ~~Medium~~ | ✅ Done — `--select id,title` on all commands |
| 5 | ~~Inline help examples on commands~~ | ~~\~100 lines~~ | ~~Low~~ | ✅ Done — all commands have `addHelpText` examples |

---

## Architecture Notes

### Strengths

- Clean separation between SDK and CLI packages
- TypeScript throughout with fully typed SDK generics
- AJV schema validation for request bodies
- Dynamic command generation from Swagger specs
- Swagger caching with manual invalidation (`meta cache clear`)
- Multi-workspace support with per-workspace aliases
- Configurable retry/timeout with settings persistence
- Verbose mode for debugging (`--verbose`)
- Contextual error messages with HTTP status codes

### Weaknesses

- Swagger parsing assumes specific NocoDB path format
- No automatic cache invalidation strategy
- ~~View creation requires v1 API (v2 doesn't support it)~~ ✅ Fixed — migrated to v2 type-specific endpoints
- ~~No env var fallback for config~~ ✅ Fixed — `NOCO_TOKEN`, `NOCO_BASE_URL`, `NOCO_BASE_ID` supported

### Recent Fixes

- **Env var override** — `applyEnvVarOverrides` uses nullish coalescing (`??`) so empty-string env vars are treated as explicitly set
- **Data import validation** — `data import` now routes through `RowService` for swagger schema validation (consistent with `rows` commands)
- **Path traversal guards** — `data import` and `data export --out` validate file paths to prevent traversal (matching `--data-file` behavior)
- **CSV parser** — `parseCsv` no longer trims data rows, preserving whitespace-significant field values
- **Upsert duplicate detection** — `data import --match` uses `RowService.bulkUpsert` which properly detects duplicate match values

---

## API Gaps vs. v2 Meta OpenAPI Spec

Comparison of `openapi/v2/nocodb-meta-v2-openapi.json` against SDK and CLI. All 13 identified gaps are resolved (12 implemented, 2 deferred).

### Completed Gaps

| # | Gap | Endpoints | SDK Methods | CLI Commands |
|---|-----|-----------|-------------|--------------|
| 1 | Sources (Data Sources) | 5 CRUD on `/bases/{baseId}/sources` | `listSources`, `createSource`, `getSource`, `updateSource`, `deleteSource` | `sources list/get/create/update/delete` |
| 2 | Tokens v1→v2 | 3 on `/bases/{baseId}/api-tokens` | `listTokens(baseId)`, `createToken(baseId)`, `deleteToken(baseId, tokenId)` | `tokens list/create/delete <baseId>` |
| 3 | Comments | 4 on `/comments` + `/comment/{id}` | `listComments`, `createComment`, `updateComment`, `deleteComment` | `comments list/create/update/delete` |
| 4 | Shared Views | 4 on `/tables/{id}/share` + `/views/{id}/share` | `listSharedViews`, `createSharedView`, `updateSharedView`, `deleteSharedView` | `shared-views list/create/update/delete` |
| 5 | Shared Base | 4 on `/bases/{baseId}/shared` | `getSharedBase`, `createSharedBase`, `updateSharedBase`, `deleteSharedBase` | `shared-base get/create/update/delete` |
| 6 | View-Type Endpoints | v2 creation (`/grids`, `/forms`, etc.), config get/update, view columns | `createGridView`, `createFormView`, `createGalleryView`, `createKanbanView`, `get/updateFormView`, `get/updateGalleryView`, `get/updateKanbanView`, `updateGridView`, `listViewColumns` | `views create --type`, `views config get/update`, `views columns list` |
| 7 | Filter Children | 1: `GET /filters/{id}/children` | `listFilterChildren` | `filters children <filterGroupId>` |
| 8 | Hook Filters | 2: `GET/POST /hooks/{id}/filters` | `listHookFilters`, `createHookFilter` | `hooks filters list/create <hookId>` |
| 9 | Set Primary Column | 1: `POST /columns/{id}/primary` | `setColumnPrimary` | `columns set-primary <columnId>` |
| 10 | Duplicate Operations | 3: `POST /duplicate/{baseId}[/{sourceId}][/table/{tableId}]` | `duplicateBase`, `duplicateSource`, `duplicateTable` | `duplicate base/source/table` with `--exclude-data/views/hooks` |
| 11 | Visibility Rules | 2: `GET/POST /bases/{id}/visibility-rules` | `getVisibilityRules`, `setVisibilityRules` | `visibility-rules get/set <baseId>` |
| 12 | App Info | 1: `GET /nocodb/info` | `getAppInfo` | `info` |
| 15 | Base Type Incomplete | — (type-only) | Expanded `Base` interface + `Source` type | — |
| 13 | Auth `me` v1→v2 | 1: path fix | — | `me` uses v2 path |

### Deferred Gaps

#### Gap 13: Full Auth APIs — **DEPRIORITIZED**

CLI primarily uses API tokens (`xc-token`), not JWT auth. Most auth endpoints (signup, forgot password, email validation) aren't relevant for CLI usage. The `me` v1→v2 path fix was done as a quick win.

If needed: new `AuthApi` class with `signin`, `signout`, `changePassword`, `refreshToken`, `updateProfile`. CLI: `auth signin/signout/change-password`.

#### Gap 14: Cloud Workspace APIs — **DONE** ✅

Cloud-only (☁) workspace endpoints implemented. SDK: `listWorkspaces`, `getWorkspace`, `createWorkspace`, `updateWorkspace`, `deleteWorkspace`, `listWorkspaceUsers`, `getWorkspaceUser`, `inviteWorkspaceUser`, `updateWorkspaceUser`, `deleteWorkspaceUser`, `listWorkspaceBases`, `createWorkspaceBase`. Types: `NcWorkspace`, `NcWorkspaceUser`. CLI: `workspace cloud list/get/create/update/delete/users/user-get/invite/user-update/user-remove/bases/create-base`. Naming collision resolved by nesting under `workspace cloud` subcommand group — existing local workspace management (`workspace add/use/list/delete/show`) is unaffected.
