# @stagware/nocodb-cli

Command-line interface for NocoDB — manage bases, tables, rows, views, and more from the terminal.

## Install

```sh
npm install -g @stagware/nocodb-cli
```

## Quick Start

```sh
# Configure
nocodb workspace add myserver https://app.nocodb.com <api-token> --base <baseId>
nocodb workspace use myserver

# Or use environment variables
export NOCO_BASE_URL=https://app.nocodb.com
export NOCO_TOKEN=your-api-token
export NOCO_BASE_ID=p_abc123

# Verify auth
nocodb me

# List bases and tables
nocodb bases list
nocodb tables list <baseId>

# CRUD on rows
nocodb rows list <tableId>
nocodb rows create <tableId> --data '{"Title":"Hello"}'
nocodb rows update <tableId> --data '{"Id":1,"Title":"Updated"}'
nocodb rows delete <tableId> --data '{"Id":1}'
```

## Features

- **90+ commands** covering all NocoDB v2 API operations
- **Multi-workspace** support with per-workspace aliases
- **Data import/export** — CSV and JSON with schema validation
- **Output formats** — JSON, CSV, ASCII table, with `--select` field filtering
- **Dynamic API** — auto-generated commands from Swagger specs
- **Configurable** — retry, timeout, verbose mode
- **Environment variables** — `NOCO_TOKEN`, `NOCO_BASE_URL`, `NOCO_BASE_ID` for CI/CD

## Commands

| Category | Commands |
|----------|----------|
| **Bases** | `bases list/get/info/create/update/delete` |
| **Tables** | `tables list/get/create/update/delete` |
| **Views** | `views list/get/create/update/delete`, `views config get/update`, `views columns list` |
| **Columns** | `columns list/get/create/update/delete/set-primary` |
| **Rows** | `rows list/read/create/update/delete/upsert/bulk-create/bulk-update/bulk-upsert/bulk-delete` |
| **Filters** | `filters list/get/create/update/delete/children` |
| **Sorts** | `sorts list/get/create/update/delete` |
| **Links** | `links list/create/delete` |
| **Hooks** | `hooks list/get/create/update/delete/test`, `hooks filters list/create` |
| **Sources** | `sources list/get/create/update/delete` |
| **Tokens** | `tokens list/create/delete` |
| **Users** | `users list/invite/update/remove` |
| **Comments** | `comments list/create/update/delete` |
| **Shared Views** | `shared-views list/create/update/delete` |
| **Shared Base** | `shared-base get/create/update/delete` |
| **Data I/O** | `data export/import` (CSV/JSON) |
| **Schema** | `schema introspect` |
| **Storage** | `storage upload` |
| **Settings** | `settings show/path/set/reset` |
| **Workspaces** | `workspace add/use/list/show/delete` |
| **Cloud** | `workspace cloud list/get/create/update/delete/users/invite/bases` |
| **Aliases** | `alias set/list/delete/clear` |
| **Other** | `me`, `info`, `duplicate`, `visibility-rules`, `request`, `meta`, `api` |

## Output Formats

```sh
nocodb bases list --pretty              # indented JSON
nocodb bases list --format csv          # CSV
nocodb bases list --format table        # ASCII table
nocodb bases list --select id,title     # field filtering
```

## Documentation

See the full [README](https://github.com/stagware/nocodb-cli#readme) for detailed usage, examples, and configuration options.

## License

MIT
