# NocoDB API v3 Migration — Analysis & Roadmap

## Executive Summary

The NocoDB v3 API is a **significant redesign**, not a simple version bump. It introduces:
- **Workspace-centric hierarchy** (bases now live under workspaces)
- **Restructured data format** (records use `{ id, fields: {...} }` envelope instead of flat key-value)
- **Renamed concepts** (columns → fields, `uidt` → `type`, `fk_column_id` → `field_id`)
- **Merged view configuration** (filters, sorts, fields, options all inline in view CRUD)
- **New resource types** (Scripts, Teams, Button Actions, Calendar views)
- **Removed endpoints** (hooks, comments, shared views/base, visibility rules, duplicates, app info — all absent from v3 spec)

Running v2 and v3 side-by-side is feasible but requires a **versioned API layer** in both the SDK and CLI.

---

## v3 Endpoint Inventory

### Meta API (`/api/v3/meta/...`)

| Tag | Path | Methods | operationId(s) |
|-----|------|---------|-----------------|
| **Workspaces** | `/workspaces` | GET, POST | `workspace-list`, `workspace-create` |
| | `/workspaces/{workspaceId}` | GET, PATCH, DELETE | `workspace-read`, `workspace-update`, `workspace-delete` |
| **Workspace Members** | `/workspaces/{workspaceId}?include[]=members` | GET | `workspace-members-read` |
| | `/workspaces/{workspaceId}/members` | POST, PATCH, DELETE | `workspace-members-invite`, `workspace-members-update`, `workspace-members-delete` |
| **Bases** | `/workspaces/{workspaceId}/bases` | GET, POST | `bases-list`, `base-create` |
| | `/bases/{baseId}` | GET, PATCH, DELETE | `base-read`, `base-update`, `base-delete` |
| **Base Members** | `/bases/{baseId}?include[]=members` | GET | `base-members-list` |
| | `/bases/{base_id}/members` | POST, PATCH, DELETE | `base-members-invite`, `base-members-update`, `base-members-delete` |
| **Tables** | `/bases/{base_id}/tables` | GET, POST | `tables-list`, `table-create` |
| | `/bases/{baseId}/tables/{tableId}` | GET, PATCH, DELETE | `table-read`, `table-update`, `table-delete` |
| **Views** | `/bases/{baseId}/tables/{tableId}/views` | GET, POST | `views-list`, `view-create` |
| | `/bases/{baseId}/views/{viewId}` | GET, PATCH, DELETE | `view-read`, `view-update`, `view-delete` |
| **Fields** | `/bases/{baseId}/tables/{tableId}/fields` | POST | `field-create` |
| | `/bases/{baseId}/fields/{fieldId}` | GET, PATCH, DELETE | `field-read`, `field-update`, `field-delete` |
| **View Filters** | `/bases/{baseId}/views/{viewId}/filters` | GET, POST, PUT | `view-filters-list`, `view-filter-create`, `view-filter-replace` |
| | `/bases/{baseId}/filters/{filterId}` | PATCH, DELETE | `view-filter-update`, `view-filter-delete` |
| **View Sorts** | `/bases/{baseId}/views/{viewId}/sorts` | GET, POST | `view-sorts-list`, `view-sort-create` |
| | `/bases/{baseId}/sorts/{sortId}` | PATCH, DELETE | `view-sort-update`, `view-sort-delete` |
| **Scripts** | `/bases/{base_id}/scripts` | GET, POST | `scripts-list`, `script-create` |
| | `/bases/{base_id}/scripts/{script_id}` | GET, PATCH, DELETE | `script-read`, `script-update`, `script-delete` |
| **Teams** | `/workspaces/{workspaceId}/teams` | GET, POST | `teams-list-v3`, `teams-create-v3` |
| | `/workspaces/{workspaceId}/teams/{teamId}` | GET, PATCH, DELETE | `teams-get-v3`, `teams-update-v3`, `teams-delete-v3` |
| | `/workspaces/{workspaceId}/teams/{teamId}/members` | POST, PATCH, DELETE | `teams-members-add-v3`, `teams-members-update-v3`, `teams-members-remove-v3` |
| **API Tokens** | `/tokens` | GET, POST | (list, create) |
| | `/tokens/{tokenId}` | DELETE | (delete) |

### Data API (`/api/v3/data/...`)

| Tag | Path | Methods | operationId(s) |
|-----|------|---------|-----------------|
| **Table Records** | `/{baseId}/{tableId}/records` | GET, POST, PATCH, DELETE | `db-data-table-row-list`, `db-data-table-row-create`, `db-data-table-row-update`, `db-data-table-row-delete` |
| | `/{baseId}/{tableId}/records/{recordId}` | GET | `db-data-table-row-read` |
| | `/{baseId}/{tableId}/count` | GET | `db-data-table-row-count` |
| | `/{baseId}/{modelId}/records/{recordId}/fields/{fieldId}/upload` | POST | `db-data-table-row-attachment-upload` |
| | `/{baseId}/{tableId}/actions/{columnId}` | POST | `trigger-action` (Button Actions) |
| **Linked Records** | `/{baseId}/{tableId}/links/{linkFieldId}/{recordId}` | GET, POST, DELETE | `db-data-table-row-nested-list`, `db-data-table-row-nested-link`, `db-data-table-row-nested-unlink` |

---

## Endpoint-by-Endpoint Comparison: v2 → v3

### Category A: Near 1:1 Correlations (path change + minor schema tweaks)

These endpoints exist in both v2 and v3 with the same semantics. The main differences are path structure and response schema.

| v2 SDK Method | v2 Path | v3 Path | Breaking Changes |
|---------------|---------|---------|------------------|
| `getBase(baseId)` | `GET /api/v2/meta/bases/{baseId}` | `GET /api/v3/meta/bases/{baseId}` | Response adds `workspace_id`, `sources[]`; drops `prefix`, `status`, `is_meta` |
| `updateBase(baseId, body)` | `PATCH /api/v2/meta/bases/{baseId}` | `PATCH /api/v3/meta/bases/{baseId}` | Body uses `meta: { icon_color }` instead of flat fields |
| `deleteBase(baseId)` | `DELETE /api/v2/meta/bases/{baseId}` | `DELETE /api/v3/meta/bases/{baseId}` | Returns 204 instead of 200 |
| `listTables(baseId)` | `GET /api/v2/meta/bases/{baseId}/tables` | `GET /api/v3/meta/bases/{base_id}/tables` | Response items add `workspace_id`, `description`, `meta.icon` |
| `getTable(tableId)` | `GET /api/v2/meta/tables/{tableId}` | `GET /api/v3/meta/bases/{baseId}/tables/{tableId}` | **Now requires `baseId`**; response uses `fields[]` not `columns[]`; field schema completely different (see Category C) |
| `updateTable(tableId, body)` | `PATCH /api/v2/meta/tables/{tableId}` | `PATCH /api/v3/meta/bases/{baseId}/tables/{tableId}` | **Now requires `baseId`**; adds `display_field_id`, `description` |
| `deleteTable(tableId)` | `DELETE /api/v2/meta/tables/{tableId}` | `DELETE /api/v3/meta/bases/{baseId}/tables/{tableId}` | **Now requires `baseId`**; returns 204 |
| `listViews(tableId)` | `GET /api/v2/meta/tables/{tableId}/views` | `GET /api/v3/meta/bases/{baseId}/tables/{tableId}/views` | **Now requires `baseId`**; response items add `lock_type`, `created_by`, `description` |
| `getView(viewId)` | `GET /api/v2/meta/views/{viewId}` | `GET /api/v3/meta/bases/{baseId}/views/{viewId}` | **Now requires `baseId`**; response includes inline `fields[]`, `options`, `sorts[]`, `filters` |
| `updateView(viewId, body)` | `PATCH /api/v2/meta/views/{viewId}` | `PATCH /api/v3/meta/bases/{baseId}/views/{viewId}` | **Now requires `baseId`**; can set `fields`, `sorts`, `filters`, `options` inline |
| `deleteView(viewId)` | `DELETE /api/v2/meta/views/{viewId}` | `DELETE /api/v3/meta/bases/{baseId}/views/{viewId}` | **Now requires `baseId`**; returns 204 |
| `listViewFilters(viewId)` | `GET /api/v2/meta/views/{viewId}/filters` | `GET /api/v3/meta/bases/{baseId}/views/{viewId}/filters` | **Now requires `baseId`**; response is nested tree structure (groups with children), not flat list |
| `createViewFilter(viewId, body)` | `POST /api/v2/meta/views/{viewId}/filters` | `POST /api/v3/meta/bases/{baseId}/views/{viewId}/filters` | **Now requires `baseId`**; body uses `field_id` not `fk_column_id`, `operator` not `comparison_op` |
| `updateFilter(filterId, body)` | `PATCH /api/v2/meta/filters/{filterId}` | `PATCH /api/v3/meta/bases/{baseId}/filters/{filterId}` | **Now requires `baseId`** |
| `deleteFilter(filterId)` | `DELETE /api/v2/meta/filters/{filterId}` | `DELETE /api/v3/meta/bases/{baseId}/filters/{filterId}` | **Now requires `baseId`**; returns 204 |
| `listViewSorts(viewId)` | `GET /api/v2/meta/views/{viewId}/sorts` | `GET /api/v3/meta/bases/{baseId}/views/{viewId}/sorts` | **Now requires `baseId`**; sort uses `field_id` + `order` not `fk_column_id` + `direction` |
| `createViewSort(viewId, body)` | `POST /api/v2/meta/views/{viewId}/sorts` | `POST /api/v3/meta/bases/{baseId}/views/{viewId}/sorts` | **Now requires `baseId`** |
| `updateSort(sortId, body)` | `PATCH /api/v2/meta/sorts/{sortId}` | `PATCH /api/v3/meta/bases/{baseId}/sorts/{sortId}` | **Now requires `baseId`** |
| `deleteSort(sortId)` | `DELETE /api/v2/meta/sorts/{sortId}` | `DELETE /api/v3/meta/bases/{baseId}/sorts/{sortId}` | **Now requires `baseId`**; returns 204 |

### Category B: Structurally Changed Endpoints

These endpoints exist in both versions but have fundamentally different path structures, request/response shapes, or semantics.

#### B1. Base Listing — Now Workspace-Scoped

| | v2 | v3 |
|---|---|---|
| **Path** | `GET /api/v2/meta/bases` | `GET /api/v3/meta/workspaces/{workspaceId}/bases` |
| **Change** | Global list of all bases | Must specify workspace; returns bases for that workspace |
| **Impact** | `listBases()` needs a `workspaceId` param in v3 | High — CLI `bases list` needs workspace context |

#### B2. Base Creation — Now Workspace-Scoped

| | v2 | v3 |
|---|---|---|
| **Path** | `POST /api/v2/meta/bases` | `POST /api/v3/meta/workspaces/{workspaceId}/bases` |
| **Change** | Creates base globally | Must specify workspace |
| **Impact** | `createBase(body)` → `createBase(workspaceId, body)` | High |

#### B3. Table Creation — Richer Schema

| | v2 | v3 |
|---|---|---|
| **Path** | `POST /api/v2/meta/bases/{baseId}/tables` | `POST /api/v3/meta/bases/{base_id}/tables` |
| **Body** | `{ title, table_name, columns: [...] }` | `{ title, description, fields: [...], source_id?, meta? }` |
| **Change** | `columns` → `fields`; field schema uses `type` (e.g. `"SingleLineText"`) not `uidt`; adds `options`, `default_value`, `unique` | High |

#### B4. Column/Field CRUD — Renamed + Restructured

| | v2 | v3 |
|---|---|---|
| **Create** | `POST /api/v2/meta/tables/{tableId}/columns` | `POST /api/v3/meta/bases/{baseId}/tables/{tableId}/fields` |
| **Get** | `GET /api/v2/meta/columns/{columnId}` | `GET /api/v3/meta/bases/{baseId}/fields/{fieldId}` |
| **Update** | `PATCH /api/v2/meta/columns/{columnId}` | `PATCH /api/v3/meta/bases/{baseId}/fields/{fieldId}` |
| **Delete** | `DELETE /api/v2/meta/columns/{columnId}` | `DELETE /api/v3/meta/bases/{baseId}/fields/{fieldId}` |
| **List** | `GET /api/v2/meta/tables/{tableId}/columns` | **No dedicated list endpoint** — fields come embedded in table read response |
| **Changes** | `uidt` → `type`, `column_name` → implicit, `colOptions` → `options`, adds `default_value`, `unique`, `description` | **Very High** — all column types need remapping |

#### B5. View Creation — Unified Endpoint

| | v2 | v3 |
|---|---|---|
| **v2** | Separate endpoints per type: `POST .../grids`, `.../forms`, `.../galleries`, `.../kanbans` | Single: `POST /api/v3/meta/bases/{baseId}/tables/{tableId}/views` |
| **Body** | `{ title }` | `{ title, type: "grid"/"gallery"/"kanban"/"calendar", options?, fields?, sorts?, filters?, row_coloring? }` |
| **Change** | v3 unifies creation + allows setting filters/sorts/fields at creation time | Medium — simpler but different |

#### B6. View Config — Merged Into View CRUD

| | v2 | v3 |
|---|---|---|
| **v2** | Separate endpoints: `GET/PATCH /forms/{id}`, `/galleries/{id}`, `/kanbans/{id}`, `/grids/{id}` | No separate config endpoints — `options` is inline in view GET/PATCH |
| **Impact** | `getFormView()`, `updateFormView()`, etc. have no v3 equivalent — use `getView()` / `updateView()` with `options` field | Medium |

#### B7. Data Records — Envelope Format

| | v2 | v3 |
|---|---|---|
| **List** | `GET /api/v2/tables/{tableId}/records` → `{ list: [{ field1: val, ... }], pageInfo }` | `GET /api/v3/data/{baseId}/{tableId}/records` → `{ records: [{ id, fields: { field1: val } }], next: url }` |
| **Create** | `POST .../records` body: `[{ field1: val }]` → response: `[{ Id: 1 }]` | `POST .../records` body: `[{ fields: { field1: val } }]` → response: `{ records: [{ id, fields }] }` |
| **Update** | `PATCH .../records` body: `[{ Id: 1, field1: val }]` | `PATCH .../records` body: `[{ id: 1, fields: { field1: val } }]` |
| **Delete** | `DELETE .../records` body: `[{ Id: 1 }]` | `DELETE .../records` body: `[{ id: 1 }]` → response: `{ records: [{ id, deleted: true }] }` |
| **Read** | `GET .../records/{recordId}` → `{ field1: val, ... }` | `GET .../records/{recordId}` → `{ id, fields: { field1: val } }` |
| **Count** | `GET .../records/count` | `GET .../count` (separate path) |
| **Pagination** | `offset` + `limit` + `pageInfo.totalRows` | `page` + `pageSize` + `next` URL (cursor-style) |
| **Sort param** | `sort=-field1,field2` (string) | `sort=[{"field":"field1","direction":"desc"}]` (structured JSON) |
| **Impact** | **Very High** — every row command needs transformation | All RowService, data-io, rows commands affected |

#### B8. Links — Path Restructured

| | v2 | v3 |
|---|---|---|
| **List** | `GET /api/v2/tables/{tableId}/links/{linkFieldId}/records/{recordId}` | `GET /api/v3/data/{baseId}/{tableId}/links/{linkFieldId}/{recordId}` |
| **Link** | `POST .../records/{recordId}` body: `[{ Id: 1 }]` | `POST .../links/{linkFieldId}/{recordId}` body: `[{ id: "1" }]` |
| **Unlink** | `DELETE .../records/{recordId}` body: `[{ Id: 1 }]` | `DELETE .../links/{linkFieldId}/{recordId}` body: `[{ id: "1" }]` |
| **Changes** | Path adds `baseId`; `Id` → `id`; response uses v3 record envelope | Medium |

#### B9. Workspace Members — Include Pattern

| | v2 | v3 |
|---|---|---|
| **v2** | `GET /workspaces/{id}/users` | `GET /workspaces/{id}?include[]=members` (returns workspace + members) |
| **Invite** | `POST /workspaces/{id}/invitations` | `POST /workspaces/{id}/members` (batch array) |
| **Update** | `PATCH /workspaces/{id}/users/{userId}` | `PATCH /workspaces/{id}/members` (batch array with `user_id`) |
| **Delete** | `DELETE /workspaces/{id}/users/{userId}` | `DELETE /workspaces/{id}/members` (batch array with `user_id`) |
| **Changes** | Batch operations; members embedded in workspace response | High |

#### B10. Base Users → Base Members

| | v2 | v3 |
|---|---|---|
| **List** | `GET /bases/{baseId}/users` | `GET /bases/{baseId}?include[]=members` |
| **Invite** | `POST /bases/{baseId}/users` | `POST /bases/{base_id}/members` (batch array) |
| **Update** | `PATCH /bases/{baseId}/users/{userId}` | `PATCH /bases/{base_id}/members` (batch array) |
| **Delete** | `DELETE /bases/{baseId}/users/{userId}` | `DELETE /bases/{base_id}/members` (batch array) |
| **Changes** | Batch operations; uses `base_role` not `roles` | High |

#### B11. API Tokens — No Longer Base-Scoped

| | v2 | v3 |
|---|---|---|
| **List** | `GET /bases/{baseId}/api-tokens` | `GET /api/v3/meta/tokens` (org-level) |
| **Create** | `POST /bases/{baseId}/api-tokens` | `POST /api/v3/meta/tokens` |
| **Delete** | `DELETE /bases/{baseId}/api-tokens/{tokenId}` | `DELETE /api/v3/meta/tokens/{tokenId}` |
| **Changes** | No longer scoped to a base; org-level tokens | Medium |

### Category C: Completely New in v3 (No v2 Equivalent)

| Feature | Endpoints | Description |
|---------|-----------|-------------|
| **Scripts** | CRUD on `/bases/{base_id}/scripts[/{script_id}]` | Enterprise-only scripting engine — list, create, get, update, delete scripts |
| **Teams** | CRUD on `/workspaces/{workspaceId}/teams[/{teamId}]` + `/teams/{teamId}/members` | Team management with member add/remove/update roles |
| **Button Actions** | `POST /api/v3/data/{baseId}/{tableId}/actions/{columnId}` | Trigger button field actions (formula, webhook, AI, script) on up to 25 rows |
| **Attachment Upload (Cell-level)** | `POST /api/v3/data/{baseId}/{modelId}/records/{recordId}/fields/{fieldId}/upload` | Upload base64 attachment directly to a cell |
| **Filter Replace** | `PUT /api/v3/meta/bases/{baseId}/views/{viewId}/filters` | Overwrite all filters at once (atomic replace) |
| **Calendar Views** | View type `"calendar"` with `ViewOptionsCalendar` | New view type with `date_ranges` config |
| **Row Coloring** | `row_coloring` in view create/update | Conditional or select-based row coloring |
| **View Fields (inline)** | `fields[]` in view create/update/read | Field visibility, width, aggregation — inline, not separate endpoint |
| **Nested Page** | `nestedPage` query param on record list | Pagination for nested/linked records within a response |

### Category D: v2-Only (Removed/Absent from v3)

These v2 endpoints have **no equivalent in the v3 spec**:

| v2 Feature | v2 Endpoints | Status in v3 |
|------------|-------------|--------------|
| **Hooks (Webhooks)** | CRUD on `/tables/{id}/hooks`, `/hooks/{id}`, test, hook filters | **Gone** — no webhook management in v3 spec |
| **Comments** | CRUD on `/comments`, `/comment/{id}` | **Gone** |
| **Shared Views** | CRUD on `/tables/{id}/share`, `/views/{id}/share` | **Gone** |
| **Shared Base** | CRUD on `/bases/{id}/shared` | **Gone** |
| **Sources (Data Sources)** | CRUD on `/bases/{id}/sources[/{sourceId}]` | **Gone** as separate CRUD — sources appear as read-only array in base GET response |
| **Visibility Rules** | GET/POST on `/bases/{id}/visibility-rules` | **Gone** |
| **Duplicate Operations** | POST on `/duplicate/{baseId}[/...]` | **Gone** |
| **App Info** | GET `/nocodb/info` | **Gone** |
| **Base Info** | GET `/bases/{id}/info` | **Gone** (merged into base GET) |
| **Swagger/OpenAPI** | GET `/bases/{id}/swagger.json` | **Gone** |
| **Storage Upload** | POST `/storage/upload` | Replaced by cell-level attachment upload |
| **Set Primary Column** | POST `/columns/{id}/primary` | **Gone** — use `display_field_id` in table update |
| **Filter Children** | GET `/filters/{id}/children` | **Gone** — filters are now nested tree in response |
| **Get Sort/Filter by ID** | GET `/sorts/{id}`, GET `/filters/{id}` | **Gone** — sorts/filters come inline with view |
| **List Columns** | GET `/tables/{id}/columns` | **Gone** — fields come inline with table GET |
| **View Columns** | GET `/views/{id}/columns` | **Gone** — field visibility is inline in view |
| **View-type Config** | GET/PATCH `/forms/{id}`, `/galleries/{id}`, etc. | **Gone** — merged into view `options` |
| **`me` (Auth)** | GET `/auth/user/me` | Not in v3 spec |

---

## Schema/Type Changes Summary

### Record Format
```
v2: { Title: "foo", Status: "active", Id: 1 }
v3: { id: 1, fields: { Title: "foo", Status: "active" } }
```

### Column → Field Mapping
```
v2 Column: { id, title, column_name, uidt: "SingleLineText", colOptions: {...} }
v3 Field:  { id, title, type: "SingleLineText", options: {...}, default_value, unique, description }
```

### Filter Schema
```
v2: { id, fk_column_id, comparison_op: "eq", value, is_group, logical_op: "and" }
v3: { id, field_id, operator: "eq", value }  — groups use { id, group_operator: "AND", filters: [...] }
```

### Sort Schema
```
v2: { id, fk_column_id, direction: "asc" }
v3: { id, field_id, order: "asc" }
```

### Pagination
```
v2: { list: [...], pageInfo: { totalRows, page, pageSize, isFirstPage, isLastPage } }
v3: { records: [...], next: "https://...?page=2" }  (or { list: [...] } for meta endpoints)
```

### View Schema
```
v2: { id, title, type: 1|2|3|4|5, fk_model_id, ... }
v3: { id, title, type: "grid"|"gallery"|"kanban"|"calendar"|"form", table_id, lock_type, fields: [...], options: {...}, sorts: [...], filters: {...}, ... }
```

---

## Architecture: Side-by-Side v2/v3

### Option 1: Version-Aware SDK Classes (Recommended)

```
packages/sdk/src/
  index.ts          ← existing v2 (NocoClient, MetaApi, DataApi)
  v3/
    meta-api.ts     ← MetaApiV3 class (v3 endpoints)
    data-api.ts     ← DataApiV3 class (v3 data endpoints)
    types.ts        ← v3-specific types (V3Record, V3Field, V3View, etc.)
    adapters.ts     ← transform v3 responses to v2 shapes (optional compatibility layer)
```

- `MetaApiV3` mirrors `MetaApi` method names where possible but with v3 paths/schemas
- Methods that need extra params (e.g. `baseId` for table/view/field ops) get them
- New v3-only methods added (scripts, teams, button actions, etc.)

### Option 2: Unified Client with Version Flag

```typescript
const client = new NocoClient({ baseUrl, headers, apiVersion: 'v3' });
const meta = new MetaApi(client); // internally routes to v3 paths
```

- Pros: Single API surface, easy switching
- Cons: Leaky abstraction — v3 needs different params (workspaceId for base listing), different response shapes

### Recommendation: **Option 1** — separate classes, explicit version choice.

### CLI Integration

```
packages/cli/src/
  services/
    meta-service.ts       ← existing v2 service
    meta-service-v3.ts    ← v3 service (or extend with version switch)
    row-service-v3.ts     ← v3 record format handling
  commands/
    (existing commands stay as-is for v2)
```

**Global `--api-version v2|v3` flag** (or per-workspace setting):
- Default: `v2` (backward compatible)
- When `v3`: commands use v3 service layer, v3 types, v3 paths
- Some commands only available in v3 (scripts, teams, button actions)
- Some commands only available in v2 (hooks, comments, shared views, etc.)

---

## Implementation Phases

### Phase 0: Foundation (Estimated: 1 session)
- [ ] Create `packages/sdk/src/v3/` directory structure
- [ ] Define v3 types: `V3Record`, `V3Field`, `V3View`, `V3Filter`, `V3Sort`, `V3Base`, `V3Table`, `V3Workspace`, `V3Script`, `V3Team`, `V3ApiToken`
- [ ] Create `MetaApiV3` class with workspace CRUD (5 methods)
- [ ] Create `DataApiV3` class stub
- [ ] Add `--api-version` global CLI flag
- [ ] Add `apiVersion` to workspace config

### Phase 1: Core Meta CRUD (Estimated: 2 sessions)
- [ ] `MetaApiV3`: Base CRUD (workspace-scoped list/create + baseId get/update/delete) — 5 methods
- [ ] `MetaApiV3`: Table CRUD (now needs baseId for get/update/delete) — 5 methods
- [ ] `MetaApiV3`: Field CRUD (replaces column CRUD, new paths + schema) — 4 methods (no list — embedded in table)
- [ ] `MetaApiV3`: View CRUD (unified create, baseId required) — 5 methods
- [ ] `MetaApiV3`: Filter CRUD (baseId required, tree structure, replace endpoint) — 5 methods
- [ ] `MetaApiV3`: Sort CRUD (baseId required) — 4 methods
- [ ] CLI v3 wiring for: bases, tables, fields, views, filters, sorts
- [ ] Tests for all v3 meta methods

### Phase 2: Data Operations (Estimated: 2 sessions)
- [ ] `DataApiV3`: Record list (new envelope format, cursor pagination)
- [ ] `DataApiV3`: Record read (single record)
- [ ] `DataApiV3`: Record create (fields envelope)
- [ ] `DataApiV3`: Record update (id + fields envelope)
- [ ] `DataApiV3`: Record delete (id-based)
- [ ] `DataApiV3`: Record count
- [ ] `DataApiV3`: Link list/link/unlink (new paths)
- [ ] `RowServiceV3` — transform layer for v3 record format
- [ ] CLI v3 wiring for: rows, links, data export/import
- [ ] Pagination adapter (cursor-based `next` URL → fetchAllPages)
- [ ] Tests for all v3 data methods

### Phase 3: Collaboration (Estimated: 1 session)
- [ ] `MetaApiV3`: Workspace members (include pattern + batch CRUD) — 4 methods
- [ ] `MetaApiV3`: Base members (include pattern + batch CRUD) — 4 methods
- [ ] `MetaApiV3`: API tokens (org-level) — 3 methods
- [ ] CLI v3 wiring for: users, tokens, workspace members
- [ ] Tests

### Phase 4: v3-Only Features (Estimated: 2 sessions)
- [ ] `MetaApiV3`: Scripts CRUD — 5 methods
- [ ] `MetaApiV3`: Teams CRUD + member management — 8 methods
- [ ] `DataApiV3`: Button action trigger — 1 method
- [ ] `DataApiV3`: Cell-level attachment upload — 1 method
- [ ] `MetaApiV3`: Filter replace (PUT) — 1 method
- [ ] Calendar view support in view create/update
- [ ] Row coloring support in view create/update
- [ ] CLI commands: `scripts list/get/create/update/delete`
- [ ] CLI commands: `teams list/get/create/update/delete/members-add/members-update/members-remove`
- [ ] CLI commands: `actions trigger <baseId> <tableId> <columnId> --rows 1,2,3`
- [ ] Tests

### Phase 5: Polish & Migration Helpers (Estimated: 1 session)
- [ ] Adapter functions: v2 response → v3 shape, v3 → v2 (for gradual migration)
- [ ] `nocodb migrate-config` command to update workspace settings for v3
- [ ] Documentation: update README with v3 usage examples
- [ ] Update TODO.md with v3 status
- [ ] Deprecation warnings on v2-only commands when `--api-version v3`

---

## Key Decisions Needed

1. **Default API version** — Should new workspaces default to v3 or v2?
2. **v2 deprecation timeline** — When (if ever) to remove v2 support?
3. **Column→Field naming** — Should CLI v3 use `fields` commands or keep `columns` as alias?
4. **Workspace requirement** — v3 bases list requires workspaceId. Should CLI auto-discover workspace or require explicit `--workspace` flag?
5. **Missing v3 endpoints** — Hooks, comments, shared views are gone from v3 spec. Are they truly removed or just not yet documented? Need to verify with NocoDB team.
6. **Record format** — Should CLI v3 output flatten `{ id, fields }` back to flat format for user convenience, or expose the envelope?

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| v3 spec is incomplete/beta — endpoints may change | High | Keep v2 as default, v3 as opt-in |
| Missing endpoints (hooks, comments, etc.) break existing workflows | High | Keep v2 available; warn users |
| Record format change breaks all data scripts/pipelines | High | Provide `--flatten` flag or adapter |
| Workspace-scoped bases requires config changes | Medium | Auto-detect workspace from base ID if possible |
| Column→Field rename causes confusion | Low | Support both terms in CLI help text |
| Pagination model change (offset → cursor) | Medium | Abstract behind `fetchAllPages()` |

---

## Quick Reference: Method Count

| Area | v2 Methods | v3 Methods | Net Change |
|------|-----------|-----------|------------|
| Workspaces | 12 (cloud) | 5 + 4 members | Simplified |
| Bases | 7 | 5 + 4 members | Similar |
| Tables | 5 | 5 | Same |
| Fields/Columns | 6 | 4 (no list) | -2 |
| Views | 12 (incl type-specific) | 5 (unified) | -7 (simplified) |
| Filters | 6 | 5 + replace | Similar |
| Sorts | 5 | 4 | -1 |
| Records | 6 (via NocoClient) | 6 | Same |
| Links | 3 | 3 | Same |
| Scripts | 0 | 5 | **+5 NEW** |
| Teams | 0 | 8 | **+8 NEW** |
| Button Actions | 0 | 1 | **+1 NEW** |
| Cell Attachment | 0 | 1 | **+1 NEW** |
| Hooks | 7 | 0 | **-7 REMOVED** |
| Comments | 4 | 0 | **-4 REMOVED** |
| Shared Views | 4 | 0 | **-4 REMOVED** |
| Shared Base | 4 | 0 | **-4 REMOVED** |
| Sources | 5 | 0 (read-only in base) | **-5 REMOVED** |
| Tokens | 3 | 3 | Same (restructured) |
| Other (dup, vis, info) | 8 | 0 | **-8 REMOVED** |
| **Total** | **~97** | **~68 + 15 new** | Net smaller API surface |
