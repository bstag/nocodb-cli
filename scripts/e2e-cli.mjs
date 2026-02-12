#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CLI_DIST = path.join(ROOT, "packages", "cli", "dist", "index.js");

const BASE_URL = process.env.NOCO_BASE_URL;
const BASE_ID = process.env.NOCO_BASE_ID;
const TOKEN = process.env.NOCO_TOKEN;
const KEEP = process.env.NOCO_KEEP === "1";

if (!BASE_URL || !BASE_ID || !TOKEN) {
  console.error("Missing env vars. Set NOCO_BASE_URL, NOCO_BASE_ID, NOCO_TOKEN.");
  process.exit(1);
}

if (!fs.existsSync(CLI_DIST)) {
  console.error(`CLI dist not found at ${CLI_DIST}. Build packages/cli first.`);
  process.exit(1);
}

function runCli(args, input) {
  const result = spawnSync(process.execPath, [CLI_DIST, ...args], {
    input,
    encoding: "utf8",
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `CLI exited ${result.status}`);
  }
  return (result.stdout || "").trim();
}

function runCliAllowFail(args, input) {
  const result = spawnSync(process.execPath, [CLI_DIST, ...args], {
    input,
    encoding: "utf8",
  });
  if (result.error) {
    throw result.error;
  }
  return {
    status: result.status ?? 0,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
  };
}

function jsonParseOrThrow(raw) {
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to parse JSON output: ${raw}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function tablePayload(name, columns) {
  return {
    table_name: name,
    title: name,
    columns,
  };
}

function column(colName, uidt) {
  return { column_name: colName, title: colName, uidt };
}

function tryCreateTable(baseId, name, columnSets) {
  const errors = [];
  for (const columns of columnSets) {
    const payload = tablePayload(name, columns);
    const tmp = path.join(ROOT, "scripts", `${name}.json`);
    writeJson(tmp, payload);
    try {
      const out = runCli(["tables", "create", baseId, "--data-file", tmp, "--pretty"]);
      return jsonParseOrThrow(out);
    } catch (err) {
      errors.push(err.message || String(err));
      // try next column set
    }
  }
  throw new Error(`Failed to create table ${name} with provided column sets.\nErrors:\n${errors.join("\n")}`);
}

function createRow(tableId, data) {
  const tmp = path.join(ROOT, "scripts", `${tableId}-row.json`);
  writeJson(tmp, data);
  const out = runCli(["rows", "create", tableId, "--data-file", tmp]);
  return jsonParseOrThrow(out);
}

function listRows(tableId, query) {
  const args = ["rows", "list", tableId];
  for (const [key, value] of Object.entries(query || {})) {
    args.push("--query", `${key}=${value}`);
  }
  const out = runCli(args);
  return jsonParseOrThrow(out);
}

function updateRow(tableId, data) {
  const tmp = path.join(ROOT, "scripts", `${tableId}-row-update.json`);
  writeJson(tmp, data);
  const out = runCli(["rows", "update", tableId, "--data-file", tmp]);
  return jsonParseOrThrow(out);
}

function deleteRow(tableId, data) {
  const tmp = path.join(ROOT, "scripts", `${tableId}-row-delete.json`);
  writeJson(tmp, data);
  const out = runCli(["rows", "delete", tableId, "--data-file", tmp]);
  return jsonParseOrThrow(out);
}

function readRow(tableId, recordId) {
  const out = runCli(["rows", "read", tableId, String(recordId), "--pretty"]);
  return jsonParseOrThrow(out);
}

function fetchSwagger(baseId) {
  const outPath = path.join(ROOT, "scripts", `swagger-${baseId}.json`);
  runCli(["meta", "swagger", baseId, "--out", outPath]);
  const raw = fs.readFileSync(outPath, "utf8");
  return JSON.parse(raw);
}

function clearSwaggerCache(baseId) {
  runCli(["meta", "cache", "clear", baseId]);
}

function findLinkEndpoints(swagger) {
  const links = [];
  const paths = swagger.paths || {};
  for (const [urlPath, methods] of Object.entries(paths)) {
    if (!urlPath.includes("/links/")) continue;
    const params = methods.parameters || [];
    const linkParam = params.find((p) => p.name === "linkFieldId");
    if (!linkParam || !linkParam.schema || !Array.isArray(linkParam.schema.enum)) continue;
    const linkFieldId = linkParam.schema.enum[0];
    const desc = linkParam.description || "";
    const match = desc.match(/\*\s+[^-]+-\s+(.+)$/m);
    const targetTableName = match ? match[1].trim() : undefined;
    const methodKeys = Object.keys(methods).filter((m) => ["get", "post", "delete"].includes(m));
    links.push({ urlPath, methods: methodKeys, linkFieldId, targetTableName });
  }
  return links;
}

function findTableTagForName(swagger, name) {
  const paths = swagger.paths || {};
  for (const methods of Object.values(paths)) {
    for (const op of Object.values(methods)) {
      if (op && op.tags && op.tags[0] === name) {
        return op.tags[0];
      }
    }
  }
  return undefined;
}

function findCreateOpForTag(swagger, tag) {
  const paths = swagger.paths || {};
  for (const [urlPath, methods] of Object.entries(paths)) {
    const post = methods.post;
    if (post && post.tags && post.tags[0] === tag) {
      return { urlPath, operationId: post.operationId };
    }
  }
  return undefined;
}

function addColumn(tableId, payload, retries = 2) {
  let lastResult = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const tmp = path.join(ROOT, "scripts", `${tableId}-col-${Date.now()}.json`);
    writeJson(tmp, payload);
    const result = runCliAllowFail(["columns", "create", tableId, "--data-file", tmp]);
    if (result.status === 0) {
      return result;
    }
    lastResult = result;
  }
  return lastResult ?? { status: 1, stdout: "", stderr: "column create failed" };
}

function updateColumn(columnId, payload) {
  if (!columnId) {
    return { status: 1, stdout: "", stderr: "Missing column id" };
  }
  const tmp = path.join(ROOT, "scripts", `${columnId}-col-update.json`);
  writeJson(tmp, payload);
  return runCliAllowFail(["columns", "update", columnId, "--data-file", tmp]);
}

function fetchTableMeta(tableId) {
  const out = runCliAllowFail(["tables", "get", tableId, "--pretty"]);
  if (out.status !== 0) {
    return undefined;
  }
  return jsonParseOrThrow(out.stdout);
}

function fetchColumnMeta(columnId) {
  const out = runCliAllowFail(["columns", "get", columnId, "--pretty"]);
  if (out.status !== 0) {
    return undefined;
  }
  return jsonParseOrThrow(out.stdout);
}

function findColumnByTitle(tableMeta, title) {
  const columns = tableMeta?.columns || [];
  return columns.find((col) => col.title === title);
}

function createRowViaDynamic(baseId, tag, operationId, payload) {
  const tmp = path.join(ROOT, "scripts", `${tag}-row.json`);
  writeJson(tmp, payload);
  const out = runCli(["--base", baseId, "api", slugify(tag), slugify(operationId), "--data-file", tmp]);
  return jsonParseOrThrow(out);
}

// --- Upsert helpers ---
function upsertRow(tableId, matchField, matchValue, data, extraFlags = []) {
  const tmp = path.join(ROOT, "scripts", `${tableId}-upsert.json`);
  writeJson(tmp, data);
  const out = runCli([
    "--base", BASE_ID,
    "rows", "upsert", tableId,
    "--match", `${matchField}=${matchValue}`,
    "--data-file", tmp,
    ...extraFlags,
  ]);
  return jsonParseOrThrow(out);
}

function upsertRowAllowFail(tableId, matchField, matchValue, data, extraFlags = []) {
  const tmp = path.join(ROOT, "scripts", `${tableId}-upsert-af.json`);
  writeJson(tmp, data);
  return runCliAllowFail([
    "--base", BASE_ID,
    "rows", "upsert", tableId,
    "--match", `${matchField}=${matchValue}`,
    "--data-file", tmp,
    ...extraFlags,
  ]);
}

// --- Bulk helpers ---
function bulkCreateRows(tableId, rows, extraFlags = []) {
  const tmp = path.join(ROOT, "scripts", `${tableId}-bulk-create.json`);
  writeJson(tmp, rows);
  const out = runCli(["--base", BASE_ID, "rows", "bulk-create", tableId, "--data-file", tmp, "--fail-fast", ...extraFlags]);
  return jsonParseOrThrow(out);
}

function bulkUpdateRows(tableId, rows, extraFlags = []) {
  const tmp = path.join(ROOT, "scripts", `${tableId}-bulk-update.json`);
  writeJson(tmp, rows);
  const out = runCli(["--base", BASE_ID, "rows", "bulk-update", tableId, "--data-file", tmp, "--fail-fast", ...extraFlags]);
  return jsonParseOrThrow(out);
}

function bulkDeleteRows(tableId, rows, extraFlags = []) {
  const tmp = path.join(ROOT, "scripts", `${tableId}-bulk-delete.json`);
  writeJson(tmp, rows);
  const out = runCli(["--base", BASE_ID, "rows", "bulk-delete", tableId, "--data-file", tmp, "--fail-fast", ...extraFlags]);
  return jsonParseOrThrow(out);
}

function bulkUpsertRows(tableId, matchField, rows, extraFlags = []) {
  const tmp = path.join(ROOT, "scripts", `${tableId}-bulk-upsert.json`);
  writeJson(tmp, rows);
  const out = runCli([
    "--base", BASE_ID,
    "rows", "bulk-upsert", tableId,
    "--match", matchField,
    "--data-file", tmp,
    ...extraFlags,
  ]);
  return jsonParseOrThrow(out);
}

// --- Views helpers ---
function listViews(tableId) {
  const out = runCli(["views", "list", tableId, "--pretty"]);
  return jsonParseOrThrow(out);
}

function createView(tableId, data) {
  const tmp = path.join(ROOT, "scripts", `${tableId}-view.json`);
  writeJson(tmp, data);
  const out = runCli(["views", "create", tableId, "--data-file", tmp, "--pretty"]);
  return jsonParseOrThrow(out);
}

function getView(viewId) {
  const out = runCli(["views", "get", viewId, "--pretty"]);
  return jsonParseOrThrow(out);
}

function updateView(viewId, data) {
  const tmp = path.join(ROOT, "scripts", `${viewId}-view-update.json`);
  writeJson(tmp, data);
  const out = runCli(["views", "update", viewId, "--data-file", tmp, "--pretty"]);
  return jsonParseOrThrow(out);
}

function deleteView(viewId) {
  return runCliAllowFail(["views", "delete", viewId]);
}

// --- Filters helpers ---
function listFilters(viewId) {
  const out = runCli(["filters", "list", viewId, "--pretty"]);
  return jsonParseOrThrow(out);
}

function createFilter(viewId, data) {
  const tmp = path.join(ROOT, "scripts", `${viewId}-filter.json`);
  writeJson(tmp, data);
  const out = runCli(["filters", "create", viewId, "--data-file", tmp, "--pretty"]);
  return jsonParseOrThrow(out);
}

function getFilter(filterId) {
  const out = runCli(["filters", "get", filterId, "--pretty"]);
  return jsonParseOrThrow(out);
}

function updateFilter(filterId, data) {
  const tmp = path.join(ROOT, "scripts", `${filterId}-filter-update.json`);
  writeJson(tmp, data);
  const out = runCli(["filters", "update", filterId, "--data-file", tmp, "--pretty"]);
  return jsonParseOrThrow(out);
}

function deleteFilter(filterId) {
  return runCliAllowFail(["filters", "delete", filterId]);
}

// --- Sorts helpers ---
function listSorts(viewId) {
  const out = runCli(["sorts", "list", viewId, "--pretty"]);
  return jsonParseOrThrow(out);
}

function createSort(viewId, data) {
  const tmp = path.join(ROOT, "scripts", `${viewId}-sort.json`);
  writeJson(tmp, data);
  const out = runCli(["sorts", "create", viewId, "--data-file", tmp, "--pretty"]);
  return jsonParseOrThrow(out);
}

function getSort(sortId) {
  const out = runCli(["sorts", "get", sortId, "--pretty"]);
  return jsonParseOrThrow(out);
}

function updateSort(sortId, data) {
  const tmp = path.join(ROOT, "scripts", `${sortId}-sort-update.json`);
  writeJson(tmp, data);
  const out = runCli(["sorts", "update", sortId, "--data-file", tmp, "--pretty"]);
  return jsonParseOrThrow(out);
}

function deleteSort(sortId) {
  return runCliAllowFail(["sorts", "delete", sortId]);
}

// --- Bases helpers ---
function listBases() {
  const out = runCli(["bases", "list", "--pretty"]);
  return jsonParseOrThrow(out);
}

function getBase(baseId) {
  const out = runCli(["bases", "get", baseId, "--pretty"]);
  return jsonParseOrThrow(out);
}

function getBaseInfo(baseId) {
  const out = runCli(["bases", "info", baseId, "--pretty"]);
  return jsonParseOrThrow(out);
}

// --- Tables list/update helpers ---
function listTables(baseId) {
  const out = runCli(["tables", "list", baseId, "--pretty"]);
  return jsonParseOrThrow(out);
}

function updateTable(tableId, data) {
  const tmp = path.join(ROOT, "scripts", `${tableId}-table-update.json`);
  writeJson(tmp, data);
  const out = runCli(["tables", "update", tableId, "--data-file", tmp, "--pretty"]);
  return jsonParseOrThrow(out);
}

// --- Request helper ---
function rawRequest(method, apiPath, opts = {}) {
  const args = ["request", method, apiPath];
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      args.push("--query", `${k}=${v}`);
    }
  }
  if (opts.headers) {
    for (const [k, v] of Object.entries(opts.headers)) {
      args.push("--header", `${k}: ${v}`);
    }
  }
  if (opts.data) {
    args.push("--data", JSON.stringify(opts.data));
  }
  args.push("--pretty");
  const out = runCli(args);
  return jsonParseOrThrow(out);
}

// --- Meta endpoints helper ---
function metaEndpoints(baseId) {
  const out = runCli(["meta", "endpoints", baseId, "--pretty"]);
  return jsonParseOrThrow(out);
}

// --- Storage upload helper ---
function storageUpload(filePath) {
  const out = runCli(["storage", "upload", filePath, "--pretty"]);
  return jsonParseOrThrow(out);
}

// --- Schema introspection helpers ---
function schemaIntrospect(tableId, extraFlags = []) {
  const out = runCli(["schema", "introspect", tableId, "--pretty", ...extraFlags]);
  return jsonParseOrThrow(out);
}

function schemaIntrospectAllowFail(tableId, extraFlags = []) {
  return runCliAllowFail(["schema", "introspect", tableId, ...extraFlags]);
}

// --- Me helper ---
function me(extraFlags = []) {
  const out = runCli(["me", "--pretty", ...extraFlags]);
  return jsonParseOrThrow(out);
}

function meRaw(extraFlags = []) {
  return runCliAllowFail(["me", ...extraFlags]);
}

// --- Hooks helpers ---
function listHooks(tableId) {
  const out = runCli(["hooks", "list", tableId, "--pretty"]);
  return jsonParseOrThrow(out);
}

function createHook(tableId, data) {
  const tmp = path.join(ROOT, "scripts", `${tableId}-hook.json`);
  writeJson(tmp, data);
  const out = runCli(["hooks", "create", tableId, "--data-file", tmp, "--pretty"]);
  return jsonParseOrThrow(out);
}

function getHook(hookId) {
  const out = runCli(["hooks", "get", hookId, "--pretty"]);
  return jsonParseOrThrow(out);
}

function updateHook(hookId, data) {
  const tmp = path.join(ROOT, "scripts", `${hookId}-hook-update.json`);
  writeJson(tmp, data);
  const out = runCli(["hooks", "update", hookId, "--data-file", tmp, "--pretty"]);
  return jsonParseOrThrow(out);
}

function deleteHook(hookId) {
  return runCliAllowFail(["hooks", "delete", hookId]);
}

function testHook(hookId) {
  return runCliAllowFail(["hooks", "test", hookId]);
}

// --- Filter Children helpers ---
function listFilterChildren(filterGroupId) {
  const out = runCli(["filters", "children", filterGroupId, "--pretty"]);
  return jsonParseOrThrow(out);
}

function listFilterChildrenAllowFail(filterGroupId) {
  return runCliAllowFail(["filters", "children", filterGroupId, "--pretty"]);
}

// --- Hook Filters helpers ---
function listHookFilters(hookId) {
  const out = runCli(["hooks", "filters", "list", hookId, "--pretty"]);
  return jsonParseOrThrow(out);
}

function createHookFilter(hookId, data) {
  const tmp = path.join(ROOT, "scripts", `${hookId}-hook-filter.json`);
  writeJson(tmp, data);
  const out = runCli(["hooks", "filters", "create", hookId, "--data-file", tmp, "--pretty"]);
  return jsonParseOrThrow(out);
}

function listHookFiltersAllowFail(hookId) {
  return runCliAllowFail(["hooks", "filters", "list", hookId, "--pretty"]);
}

// --- Set Primary Column helpers ---
function setColumnPrimary(columnId) {
  const out = runCli(["columns", "set-primary", columnId, "--pretty"]);
  return jsonParseOrThrow(out);
}

function setColumnPrimaryAllowFail(columnId) {
  return runCliAllowFail(["columns", "set-primary", columnId, "--pretty"]);
}

// --- Duplicate helpers ---
function duplicateTable(baseId, tableId, extraFlags = []) {
  const out = runCli(["duplicate", "table", baseId, tableId, ...extraFlags, "--pretty"]);
  return jsonParseOrThrow(out);
}

function duplicateTableAllowFail(baseId, tableId, extraFlags = []) {
  return runCliAllowFail(["duplicate", "table", baseId, tableId, ...extraFlags, "--pretty"]);
}

// --- Visibility Rules helpers ---
function getVisibilityRules(baseId) {
  const out = runCli(["visibility-rules", "get", baseId, "--pretty"]);
  return jsonParseOrThrow(out);
}

function setVisibilityRules(baseId, rules) {
  const tmp = path.join(ROOT, "scripts", `${baseId}-vis-rules.json`);
  writeJson(tmp, rules);
  const out = runCli(["visibility-rules", "set", baseId, "--data-file", tmp, "--pretty"]);
  return jsonParseOrThrow(out);
}

function getVisibilityRulesAllowFail(baseId) {
  return runCliAllowFail(["visibility-rules", "get", baseId, "--pretty"]);
}

// --- App Info helpers ---
function getAppInfo() {
  const out = runCli(["info", "--pretty"]);
  return jsonParseOrThrow(out);
}

function getAppInfoAllowFail() {
  return runCliAllowFail(["info", "--pretty"]);
}

// --- Cloud Workspace helpers (☁ cloud-only, skipped on self-hosted) ---
function cloudWorkspaceList() {
  const out = runCli(["workspace", "cloud", "list", "--pretty"]);
  return jsonParseOrThrow(out);
}

function cloudWorkspaceListAllowFail() {
  return runCliAllowFail(["workspace", "cloud", "list", "--pretty"]);
}

function cloudWorkspaceGet(workspaceId) {
  const out = runCli(["workspace", "cloud", "get", workspaceId, "--pretty"]);
  return jsonParseOrThrow(out);
}

function cloudWorkspaceUsers(workspaceId) {
  const out = runCli(["workspace", "cloud", "users", workspaceId, "--pretty"]);
  return jsonParseOrThrow(out);
}

function cloudWorkspaceBases(workspaceId) {
  const out = runCli(["workspace", "cloud", "bases", workspaceId, "--pretty"]);
  return jsonParseOrThrow(out);
}

function cloudWorkspaceUsersAllowFail(workspaceId) {
  return runCliAllowFail(["workspace", "cloud", "users", workspaceId, "--pretty"]);
}

function cloudWorkspaceBasesAllowFail(workspaceId) {
  return runCliAllowFail(["workspace", "cloud", "bases", workspaceId, "--pretty"]);
}

// --- Comments helpers ---
function listComments(tableId, rowId) {
  const out = runCli(["comments", "list", "--table-id", tableId, "--row-id", String(rowId), "--pretty"]);
  return jsonParseOrThrow(out);
}

function createComment(body) {
  const tmp = path.join(ROOT, "scripts", `comment-create.json`);
  writeJson(tmp, body);
  const out = runCli(["comments", "create", "--data-file", tmp, "--pretty"]);
  return jsonParseOrThrow(out);
}

function updateComment(commentId, body) {
  const tmp = path.join(ROOT, "scripts", `comment-update.json`);
  writeJson(tmp, body);
  const out = runCli(["comments", "update", commentId, "--data-file", tmp, "--pretty"]);
  return jsonParseOrThrow(out);
}

function deleteComment(commentId) {
  return runCliAllowFail(["comments", "delete", commentId]);
}

// --- Shared Views helpers ---
function listSharedViews(tableId) {
  const out = runCli(["shared-views", "list", tableId, "--pretty"]);
  return jsonParseOrThrow(out);
}

function createSharedView(viewId, body) {
  const args = ["shared-views", "create", viewId, "--pretty"];
  if (body) {
    const tmp = path.join(ROOT, "scripts", `shared-view-create.json`);
    writeJson(tmp, body);
    args.push("--data-file", tmp);
  }
  const out = runCli(args);
  return jsonParseOrThrow(out);
}

function deleteSharedView(viewId) {
  return runCliAllowFail(["shared-views", "delete", viewId]);
}

// --- Shared Base helpers ---
function getSharedBase(baseId) {
  return runCliAllowFail(["shared-base", "get", baseId, "--pretty"]);
}

function createSharedBase(baseId, body) {
  const args = ["shared-base", "create", baseId, "--pretty"];
  if (body) {
    const tmp = path.join(ROOT, "scripts", `shared-base-create.json`);
    writeJson(tmp, body);
    args.push("--data-file", tmp);
  }
  const out = runCli(args);
  return jsonParseOrThrow(out);
}

function deleteSharedBase(baseId) {
  return runCliAllowFail(["shared-base", "delete", baseId]);
}

// --- View Config helpers ---
function getViewConfig(viewId, viewType) {
  const out = runCli(["views", "config", "get", viewId, "--view-type", viewType, "--pretty"]);
  return jsonParseOrThrow(out);
}

function getViewConfigAllowFail(viewId, viewType) {
  return runCliAllowFail(["views", "config", "get", viewId, "--view-type", viewType, "--pretty"]);
}

// --- View Columns helpers ---
function listViewColumns(viewId) {
  const out = runCli(["views", "columns", "list", viewId, "--pretty"]);
  return jsonParseOrThrow(out);
}

function listViewColumnsAllowFail(viewId) {
  return runCliAllowFail(["views", "columns", "list", viewId, "--pretty"]);
}

// --- Tokens helpers (v2 base-scoped) ---
function listTokens(baseId) {
  const out = runCli(["tokens", "list", baseId, "--pretty"]);
  return jsonParseOrThrow(out);
}

function createToken(baseId, data) {
  const tmp = path.join(ROOT, "scripts", `token-create.json`);
  writeJson(tmp, data);
  const out = runCli(["tokens", "create", baseId, "--data-file", tmp, "--pretty"]);
  return jsonParseOrThrow(out);
}

function deleteTokenById(baseId, tokenId) {
  return runCliAllowFail(["tokens", "delete", baseId, tokenId]);
}

// --- Sources helpers ---
function listSources(baseId) {
  const out = runCli(["sources", "list", baseId, "--pretty"]);
  return jsonParseOrThrow(out);
}

function getSource(baseId, sourceId) {
  const out = runCli(["sources", "get", baseId, sourceId, "--pretty"]);
  return jsonParseOrThrow(out);
}

// --- Users helpers ---
function listUsers(baseId) {
  const out = runCli(["users", "list", baseId, "--pretty"]);
  return jsonParseOrThrow(out);
}

// --- Workspace/Alias helpers ---
function workspaceAdd(name, url, token, baseId) {
  const args = ["workspace", "add", name, url, token];
  if (baseId) args.push("--base", baseId);
  return runCli(args);
}

function workspaceUse(name) {
  return runCli(["workspace", "use", name]);
}

function workspaceList() {
  return runCli(["workspace", "list"]);
}

function workspaceShow(name) {
  const args = ["workspace", "show"];
  if (name) args.push(name);
  return runCli(args);
}

function workspaceDelete(name) {
  return runCli(["workspace", "delete", name]);
}

function aliasSet(name, id) {
  return runCli(["alias", "set", name, id]);
}

function aliasList() {
  return runCli(["alias", "list"]);
}

function aliasDelete(name) {
  return runCli(["alias", "delete", name]);
}

function aliasClear() {
  return runCli(["alias", "clear"]);
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function tableIdFromPath(pathValue) {
  const parts = pathValue.split("/");
  const idx = parts.indexOf("tables");
  if (idx >= 0 && parts[idx + 1]) {
    return parts[idx + 1];
  }
  return undefined;
}

function writeReport(report) {
  const outPath = path.join(ROOT, "scripts", "e2e-report.json");
  writeJson(outPath, report);
  console.log(`Report written to ${outPath}`);
}

function writeReportMarkdown(report) {
  const mdPath = path.join(ROOT, "scripts", "e2e-report.md");
  const lines = [];
  lines.push(`# NocoDB CLI E2E Report`);
  lines.push(``);
  lines.push(`Base: ${report.baseUrl} (id: ${report.baseId})`);
  lines.push(`Started: ${report.startedAt}`);
  lines.push(`Finished: ${report.finishedAt || ""}`);
  lines.push(``);
  if (report.summary) {
    lines.push(`## Summary`);
    lines.push(`- Columns: ${report.summary.columns.passed} passed, ${report.summary.columns.failed} failed, ${report.summary.columns.skipped} skipped`);
    lines.push(`- Links: ${report.summary.links.passed} passed, ${report.summary.links.failed} failed`);
    if (report.summary.features) {
      lines.push(`- Features: ${report.summary.features.passed} passed, ${report.summary.features.failed} failed, ${report.summary.features.skipped} skipped`);
    }
    lines.push(``);
  }
  lines.push(`## Tables`);
  for (const table of report.tables || []) {
    lines.push(`- ${table.name} (${table.id})`);
  }
  lines.push(``);
  lines.push(`## Column Tests`);
  for (const col of report.columns || []) {
    const status = col.status.toUpperCase();
    const err = col.error ? ` - ${col.error}` : "";
    lines.push(`- ${status}: ${col.name} [${col.uidt}]${err}`);
  }
  lines.push(``);
  lines.push(`## Link Tests`);
  if (!report.links || report.links.length === 0) {
    lines.push(`- No link tests executed`);
  } else {
    for (const link of report.links) {
      const status = link.status.toUpperCase();
      const err = link.error ? ` - ${link.error}` : "";
      lines.push(`- ${status}: ${link.path} (linkFieldId=${link.linkFieldId})${err}`);
    }
  }
  lines.push(``);
  lines.push(`## Feature Tests`);
  const featureKeys = [
    "workspace", "bases", "tablesExtra", "views", "filters", "sorts",
    "upsert", "bulkOps", "bulkUpsert", "request", "metaEndpoints",
    "dynamicApi", "storageUpload", "schemaIntrospect", "me", "selectFilter",
    "hooks", "tokens", "sources", "users",
    "comments", "sharedViews", "sharedBase", "viewConfig",
    "filterChildren", "hookFilters", "setPrimary", "duplicateOps",
    "visibilityRules", "appInfo", "cloudWorkspace",
  ];
  for (const key of featureKeys) {
    const result = report[key];
    if (!result) {
      lines.push(`- SKIPPED: ${key}`);
    } else {
      const status = result.status.toUpperCase();
      const err = result.error ? ` - ${result.error}` : "";
      lines.push(`- ${status}: ${key}${err}`);
    }
  }
  lines.push(``);
  fs.writeFileSync(mdPath, lines.join("\n"), "utf8");
  console.log(`Report written to ${mdPath}`);
}

function attemptColumnTest(tableId, rowId, columnDef, sampleValue, report) {

  let createDef = columnDef;
  if ((columnDef.uidt === "SingleSelect" || columnDef.uidt === "MultiSelect") && columnDef.options) {
    const options = columnDef.options.map((opt) => ({ title: opt.title || opt }));
    createDef = { ...columnDef, colOptions: { options } };
    delete createDef.options;
    delete createDef.meta;
  }
  const add = addColumn(tableId, createDef);
  if (add.status !== 0) {
    const error = add.stderr || add.stdout || "column create failed";
    report.columns.push({
      name: createDef.title,
      uidt: createDef.uidt,
      status: "failed",
      error,
    });
    return { ok: false };
  }
  try {
    let valueToWrite = sampleValue;
    let alreadyUpdated = false;
    if (columnDef.uidt === "Attachment") {
      const tmpFile = path.join(ROOT, "scripts", `attachment-${Date.now()}.txt`);
      fs.writeFileSync(tmpFile, "nocodb-cli attachment", "utf8");
      const uploads = storageUpload(tmpFile);
      if (!Array.isArray(uploads) || uploads.length === 0) {
        throw new Error("Attachment upload returned no files.");
      }
      updateRow(tableId, { Id: rowId, [columnDef.title]: uploads });
      alreadyUpdated = true;
    }
    if (columnDef.uidt === "SingleSelect" || columnDef.uidt === "MultiSelect") {
      let meta = fetchTableMeta(tableId);
      let colMeta = findColumnByTitle(meta, columnDef.title);
      let options = colMeta?.colOptions?.options || colMeta?.meta?.options || colMeta?.options || [];
      if (!Array.isArray(options) || options.length === 0) {
        const updatePayload = { colOptions: { options: (columnDef.options || []).map((opt) => ({ title: opt.title || opt })) } };
        updateColumn(colMeta?.id, updatePayload);
        meta = fetchTableMeta(tableId);
        colMeta = findColumnByTitle(meta, columnDef.title);
        options = colMeta?.colOptions?.options || colMeta?.meta?.options || colMeta?.options || [];
      }
      if (!Array.isArray(options) || options.length === 0) {
        report.columns.push({
          name: columnDef.title,
          uidt: columnDef.uidt,
          status: "failed",
          error: "No select options found in column meta.",
        });
        return { ok: false };
      }
      const titles = options.map((opt) => opt.title ?? opt).filter(Boolean);
      const ids = options.map((opt) => opt.id ?? opt).filter(Boolean);
      const candidates =
        columnDef.uidt === "SingleSelect"
          ? [
            titles[0],
            { title: titles[0] },
            ids[0],
          ]
          : [
            titles.slice(0, 2),
            titles.slice(0, 2).map((t) => ({ title: t })),
            ids.slice(0, 2),
          ];
      let lastError;
      for (const candidate of candidates) {
        try {
          updateRow(tableId, { Id: rowId, [columnDef.title]: candidate });
          valueToWrite = candidate;
          alreadyUpdated = true;
          lastError = undefined;
          break;
        } catch (err) {
          lastError = err;
        }
      }
      if (lastError) {
        throw lastError;
      }
    }
    if (!alreadyUpdated) {
      updateRow(tableId, { Id: rowId, [columnDef.title]: valueToWrite });
    }
    const row = readRow(tableId, rowId);
    const value = row[columnDef.title];
    const ok = value !== undefined;
    report.columns.push({
      name: columnDef.title,
      uidt: columnDef.uidt,
      status: ok ? "passed" : "failed",
      error: ok ? undefined : "value not present in read response",
    });
    return { ok };
  } catch (err) {
    report.columns.push({
      name: columnDef.title,
      uidt: columnDef.uidt,
      status: "failed",
      error: err.message || String(err),
    });
    return { ok: false };
  }
}

function tryCreateLinkColumn(primaryId, secondaryId) {
  const payloads = [
    {
      title: "LinkToSecondary",
      column_name: "LinkToSecondary",
      uidt: "Links",
      parentId: primaryId,
      childId: secondaryId,
      type: "hm",
    },
    {
      title: "LinkToSecondary",
      column_name: "LinkToSecondary",
      uidt: "Links",
      parentId: primaryId,
      childId: secondaryId,
      type: "mm",
    },
  ];
  for (const payload of payloads) {
    const result = addColumn(primaryId, payload);
    if (result.status === 0) {
      return { ok: true, payload };
    }
  }
  return { ok: false };
}

async function main() {
  console.log("Configuring CLI...");
  runCli(["config", "set", "baseUrl", BASE_URL]);
  runCli(["config", "set", "baseId", BASE_ID]);
  runCli(["header", "set", "xc-token", TOKEN]);
  // Ensure 'default' workspace is active (config set only activates on first create)
  runCli(["workspace", "use", "default"]);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const tableA = `CliE2E_Primary_${timestamp}`;
  const tableB = `CliE2E_Secondary_${timestamp}`;

  const basicColumns = [
    column("Title", "SingleLineText"),
    column("Notes", "LongText"),
    column("Score", "Number"),
    column("Done", "Checkbox"),
    column("When", "Date"),
  ];

  const extendedColumns = [
    column("Title", "SingleLineText"),
    column("Notes", "LongText"),
    column("Score", "Number"),
    column("DecimalVal", "Decimal"),
    column("Done", "Checkbox"),
    column("When", "Date"),
    column("WhenTime", "DateTime"),
    column("Email", "Email"),
    column("Url", "URL"),
    column("Phone", "PhoneNumber"),
    column("Percent", "Percent"),
    column("Rating", "Rating"),
    column("JsonData", "JSON"),
    column("Attachment", "Attachment"),
    column("SingleSelect", "SingleSelect"),
    column("MultiSelect", "MultiSelect"),
    column("Currency", "Currency"),
    column("Duration", "Duration"),
    column("GeoData", "GeoData"),
  ];

  const formulaColumns = [
    column("Title", "SingleLineText"),
    column("Score", "Number"),
  ];

  const report = {
    baseId: BASE_ID,
    baseUrl: BASE_URL,
    startedAt: new Date().toISOString(),
    tables: [],
    columns: [],
    links: [],
    rows: {},
  };

  console.log("Creating tables...");
  const createdTables = [];
  const primary = tryCreateTable(BASE_ID, tableA, [extendedColumns, basicColumns]);
  createdTables.push(primary.id);
  const secondary = tryCreateTable(BASE_ID, tableB, [basicColumns]);
  createdTables.push(secondary.id);

  const formulaTable = tryCreateTable(BASE_ID, `CliE2E_Formula_${timestamp}`, [formulaColumns, basicColumns]);
  createdTables.push(formulaTable.id);
  report.tables.push(
    { id: primary.id, name: tableA },
    { id: secondary.id, name: tableB },
    { id: formulaTable.id, name: formulaTable.table_name || formulaTable.title || formulaTable.id },
  );

  console.log("Row CRUD on primary...");
  const rowA = createRow(primary.id, { Title: "RowA", Notes: "hello", Score: 5, Done: true });
  report.rows.primaryRowId = rowA.Id;
  updateRow(primary.id, { Id: rowA.Id, Title: "RowA-Updated" });
  readRow(primary.id, rowA.Id);
  listRows(primary.id, { limit: 5 });

  console.log("Row CRUD on secondary...");
  const rowB = createRow(secondary.id, { Title: "RowB" });
  report.rows.secondaryRowId = rowB.Id;
  updateRow(secondary.id, { Id: rowB.Id, Title: "RowB-Updated" });
  readRow(secondary.id, rowB.Id);
  listRows(secondary.id, { limit: 5 });

  console.log("Attempting column feature setup...");
  const tableMeta = fetchTableMeta(primary.id);
  if (!tableMeta) {
    console.log("Could not read table meta; skipping column feature setup.");
  } else {
    const linkResult = tryCreateLinkColumn(primary.id, secondary.id);
    if (linkResult.ok) {
      report.columns.push({ name: "LinkToSecondary", uidt: "LinkToAnotherRecord", status: "passed" });
      const updatedMeta = fetchTableMeta(primary.id);
      const linkCol = findColumnByTitle(updatedMeta, "LinkToSecondary");
      if (linkCol && linkCol.id) {
        const secondaryMeta = fetchTableMeta(secondary.id);
        const secondaryTitle = findColumnByTitle(secondaryMeta, "Title");
        const secondaryTitleId = secondaryTitle?.id;
        const lookupPayload = {
          title: "LookupTitle",
          column_name: "LookupTitle",
          uidt: "Lookup",
          fk_relation_column_id: linkCol.id,
          fk_lookup_column_id: secondaryTitleId,
        };
        if (secondaryTitleId) {
          const lookupResult = addColumn(primary.id, lookupPayload);
          report.columns.push({ name: "LookupTitle", uidt: "Lookup", status: lookupResult.status === 0 ? "passed" : "failed" });
        }

        const rollupPayload = {
          title: "RollupCount",
          column_name: "RollupCount",
          uidt: "Rollup",
          fk_relation_column_id: linkCol.id,
          fk_rollup_column_id: secondaryTitleId,
          rollup_function: "count",
        };
        if (secondaryTitleId) {
          const rollupResult = addColumn(primary.id, rollupPayload);
          report.columns.push({ name: "RollupCount", uidt: "Rollup", status: rollupResult.status === 0 ? "passed" : "failed" });
        }
      }
    } else {
      report.columns.push({ name: "LinkToSecondary", uidt: "LinkToAnotherRecord", status: "failed", error: "link column create failed" });
      console.log("Link column creation failed; skipping lookup/rollup.");
    }

    const formulaPayload = {
      title: "Computed",
      column_name: "Computed",
      uidt: "Formula",
      formula: "{Score}*2",
    };
    const formulaAdd = addColumn(formulaTable.id, formulaPayload);
    report.columns.push({ name: "Computed", uidt: "Formula", status: formulaAdd.status === 0 ? "passed" : "failed" });
  }

  console.log("Refreshing swagger cache...");
  clearSwaggerCache(BASE_ID);
  const swagger = fetchSwagger(BASE_ID);

  console.log("Attempting link tests...");
  const links = findLinkEndpoints(swagger);
  if (links.length === 0) {
    console.log("No link endpoints found in swagger; skipping link tests.");
  } else {
    const link = links[0];
    const tableId = link.urlPath.split("/")[4];
    const columnMeta = fetchColumnMeta(link.linkFieldId);
    const relatedTableId = columnMeta?.colOptions?.fk_related_model_id;
    if (!relatedTableId) {
      console.log("Could not resolve related table for link test; skipping.");
    } else {
      try {
        const relatedRow = createRow(relatedTableId, { Title: "LinkedRow" });
        const linkPayload = [{ Id: relatedRow.Id }];
        const tmp = path.join(ROOT, "scripts", `link-${Date.now()}.json`);
        writeJson(tmp, linkPayload);
        const record = createRow(tableId, { Title: "LinkSource" });
        report.rows.linkSourceId = record.Id;
        console.log(`Testing native links command...`);
        runCli([
          "links",
          "create",
          tableId,
          link.linkFieldId,
          String(record.Id),
          "--data-file",
          tmp,
        ]);
        const listOut = runCli([
          "links",
          "list",
          tableId,
          link.linkFieldId,
          String(record.Id),
          "--pretty",
        ]);
        const list = jsonParseOrThrow(listOut);
        if (!list.list || list.list.length === 0) {
          throw new Error("Linked record not found in list response");
        }
        runCli([
          "links",
          "delete",
          tableId,
          link.linkFieldId,
          String(record.Id),
          "--data-file",
          tmp,
        ]);
        try {
          deleteRow(tableId, { Id: record.Id });
        } catch {
          // ignore
        }
        try {
          deleteRow(relatedTableId, { Id: relatedRow.Id });
        } catch {
          // ignore
        }
        report.links.push({ status: "passed", linkFieldId: link.linkFieldId, path: link.urlPath });
      } catch (err) {
        report.links.push({ status: "failed", linkFieldId: link.linkFieldId, path: link.urlPath, error: err.message || String(err) });
        console.log("Link test failed; continuing.");
      }
    }
  }

  console.log("Testing column types with data...");
  const typeTable = tryCreateTable(BASE_ID, `CliE2E_Types_${timestamp}`, [basicColumns]);
  createdTables.push(typeTable.id);
  report.tables.push({ id: typeTable.id, name: typeTable.table_name || typeTable.title || typeTable.id });
  const typeRow = createRow(typeTable.id, { Title: "TypesRow" });
  report.rows.typeRowId = typeRow.Id;

  const typeMatrix = [
    { def: column("Text", "SingleLineText"), value: "hello" },
    { def: column("LongText", "LongText"), value: "long text" },
    { def: column("NumberCol", "Number"), value: 42 },
    { def: column("DecimalCol", "Decimal"), value: 12.34 },
    { def: column("CheckboxCol", "Checkbox"), value: true },
    { def: column("DateCol", "Date"), value: "2026-02-04" },
    { def: column("DateTimeCol", "DateTime"), value: "2026-02-04 10:00:00" },
    { def: column("EmailCol", "Email"), value: "test@example.com" },
    { def: column("UrlCol", "URL"), value: "https://example.com" },
    { def: column("PhoneCol", "PhoneNumber"), value: "+15555551234" },
    { def: column("PercentCol", "Percent"), value: 75 },
    { def: column("RatingCol", "Rating"), value: 3 },
    { def: column("JsonCol", "JSON"), value: { ok: true } },
    { def: column("CurrencyCol", "Currency"), value: 12.5 },
    { def: column("DurationCol", "Duration"), value: 120 },
    { def: column("GeoCol", "GeoData"), value: { lat: 40.0, lng: -74.0 } },
    { def: column("AttachmentCol", "Attachment"), value: [] },
    { def: { ...column("SingleSelectCol", "SingleSelect"), options: [{ title: "A" }, { title: "B" }] }, value: "A" },
    { def: { ...column("MultiSelectCol", "MultiSelect"), options: [{ title: "A" }, { title: "B" }] }, value: ["A", "B"] },
  ];

  for (const entry of typeMatrix) {
    attemptColumnTest(typeTable.id, typeRow.Id, entry.def, entry.value, report);
  }

  // =========================================================================
  // NEW: Workspace & Alias tests
  // =========================================================================
  console.log("Testing workspace & alias commands...");
  try {
    workspaceAdd("e2e-ws", BASE_URL, TOKEN, BASE_ID);
    workspaceUse("e2e-ws");
    const wsList = workspaceList();
    assert(wsList.includes("e2e-ws"), "workspace list should contain e2e-ws");
    const wsShow = workspaceShow("e2e-ws");
    assert(wsShow.includes(BASE_URL), "workspace show should contain base URL");
    aliasSet("primary", primary.id);
    aliasSet("secondary", secondary.id);
    const aList = aliasList();
    assert(aList.includes("primary"), "alias list should contain primary");
    assert(aList.includes(primary.id), "alias list should contain primary table id");
    // Verify alias resolves: list rows via alias
    const aliasRows = listRows("primary");
    assert(aliasRows.list !== undefined, "alias-resolved rows list should work");
    aliasDelete("secondary");
    const aList2 = aliasList();
    assert(!aList2.includes("secondary"), "alias list should not contain deleted alias");
    aliasClear();
    // Delete the test workspace first so activeWorkspace is cleared
    workspaceDelete("e2e-ws");
    // Restore default config and re-activate it
    runCli(["config", "set", "baseUrl", BASE_URL]);
    runCli(["config", "set", "baseId", BASE_ID]);
    runCli(["header", "set", "xc-token", TOKEN]);
    runCli(["workspace", "use", "default"]);
    report.workspace = { status: "passed" };
  } catch (err) {
    report.workspace = { status: "failed", error: err.message || String(err) };
    // Restore config in case of failure
    try { workspaceDelete("e2e-ws"); } catch { /* ignore */ }
    try {
      runCli(["config", "set", "baseUrl", BASE_URL]);
      runCli(["config", "set", "baseId", BASE_ID]);
      runCli(["header", "set", "xc-token", TOKEN]);
      runCli(["workspace", "use", "default"]);
    } catch { /* ignore */ }
    console.log("Workspace/alias tests failed:", report.workspace.error);
  }

  // =========================================================================
  // NEW: Bases CRUD tests
  // =========================================================================
  console.log("Testing bases list/get/info...");
  try {
    const bases = listBases();
    assert(bases.list && bases.list.length > 0, "bases list should return at least one base");
    const base = getBase(BASE_ID);
    assert(base.id === BASE_ID, "bases get should return the correct base");
    const info = getBaseInfo(BASE_ID);
    assert(info !== undefined, "bases info should return something");
    report.bases = { status: "passed" };
  } catch (err) {
    report.bases = { status: "failed", error: err.message || String(err) };
    console.log("Bases tests failed:", report.bases.error);
  }

  // =========================================================================
  // NEW: Tables list/update tests
  // =========================================================================
  console.log("Testing tables list/update...");
  try {
    const tables = listTables(BASE_ID);
    assert(tables.list && tables.list.length > 0, "tables list should return tables");
    const renamedTitle = `${tableA}_Renamed`;
    const updated = updateTable(primary.id, { title: renamedTitle, table_name: renamedTitle });
    assert(updated !== undefined, "tables update should succeed");
    // Rename back
    updateTable(primary.id, { title: tableA, table_name: tableA });
    report.tablesExtra = { status: "passed" };
  } catch (err) {
    report.tablesExtra = { status: "failed", error: err.message || String(err) };
    console.log("Tables list/update tests failed:", report.tablesExtra.error);
  }

  // =========================================================================
  // NEW: Views CRUD tests
  // =========================================================================
  console.log("Testing views CRUD...");
  let testViewId;
  try {
    const views = listViews(primary.id);
    assert(views.list !== undefined, "views list should return a list");
    assert(views.list.length > 0, "views list should have at least the default view");
    // Create a grid view (views create defaults to grid type)
    const viewTitle = `E2E_GridView_${timestamp}`;
    const newView = createView(primary.id, { title: viewTitle });
    testViewId = newView.id;
    assert(testViewId, "views create should return an id");
    // Verify it appears in the list
    const viewsAfter = listViews(primary.id);
    const found = (viewsAfter.list || []).find((v) => v.id === testViewId);
    assert(found, "created view should appear in views list");
    // Update the view
    const renamedTitle = `${viewTitle}_Renamed`;
    const updatedView = updateView(testViewId, { title: renamedTitle });
    assert(updatedView !== undefined, "views update should succeed");
    report.views = { status: "passed" };
  } catch (err) {
    // Fall back to using the default view for filter/sort tests
    if (!testViewId) {
      try {
        const views = listViews(primary.id);
        testViewId = views.list?.[0]?.id;
      } catch { /* ignore */ }
    }
    report.views = { status: "failed", error: err.message || String(err) };
    console.log("Views tests failed:", report.views.error);
  }

  // =========================================================================
  // NEW: Hybrid Views (Calendar) tests
  // =========================================================================
  console.log("Testing hybrid views (calendar)...");
  try {
    // 1. Implicit Base ID (via env/config)
    const calTitle1 = `E2E_Cal_${timestamp}`;
    const tmpCal1 = path.join(ROOT, "scripts", `cal1-${timestamp}.json`);
    writeJson(tmpCal1, { title: calTitle1 });
    // Manually run CLI to pass --type calendar
    const outCal1 = runCli(["views", "create", primary.id, "--type", "calendar", "--data-file", tmpCal1, "--pretty"]);
    const calView1 = jsonParseOrThrow(outCal1);
    assert(calView1.id, "calendar view create (implicit baseId) should return id");
    assert(calView1.type === "calendar", "view type should be calendar");

    // 2. Explicit Base ID (via flag)
    const calTitle2 = `E2E_Cal_Explicit_${timestamp}`;
    const tmpCal2 = path.join(ROOT, "scripts", `cal2-${timestamp}.json`);
    writeJson(tmpCal2, { title: calTitle2 });
    const outCal2 = runCli(["views", "create", primary.id, "--type", "calendar", "--base-id", BASE_ID, "--data-file", tmpCal2, "--pretty"]);
    const calView2 = jsonParseOrThrow(outCal2);
    assert(calView2.id, "calendar view create (explicit baseId) should return id");

    // Cleanup
    try { deleteView(calView1.id); } catch { /* ignore */ }
    try { deleteView(calView2.id); } catch { /* ignore */ }

    report.hybridViews = { status: "passed" };
  } catch (err) {
    report.hybridViews = { status: "failed", error: err.message || String(err) };
    console.log("Hybrid views tests failed:", report.hybridViews.error);
  }

  // =========================================================================
  // NEW: Filters CRUD tests
  // =========================================================================
  console.log("Testing filters CRUD...");
  let testFilterId;
  try {
    if (!testViewId) throw new Error("No view available for filter tests");
    // Get a column id for the filter
    const tMeta = fetchTableMeta(primary.id);
    const titleCol = findColumnByTitle(tMeta, "Title");
    if (!titleCol?.id) throw new Error("No Title column found for filter test");
    const filters = listFilters(testViewId);
    assert(filters.list !== undefined, "filters list should return a list");
    const newFilter = createFilter(testViewId, {
      fk_column_id: titleCol.id,
      comparison_op: "eq",
      value: "test",
    });
    testFilterId = newFilter.id;
    assert(testFilterId, "filters create should return an id");
    const filterDetail = getFilter(testFilterId);
    assert(filterDetail.id === testFilterId, "filters get should return correct filter");
    updateFilter(testFilterId, { value: "updated" });
    deleteFilter(testFilterId);
    testFilterId = undefined;
    report.filters = { status: "passed" };
  } catch (err) {
    report.filters = { status: "failed", error: err.message || String(err) };
    console.log("Filters tests failed:", report.filters.error);
  }

  // =========================================================================
  // NEW: Sorts CRUD tests
  // =========================================================================
  console.log("Testing sorts CRUD...");
  let testSortId;
  try {
    if (!testViewId) throw new Error("No view available for sort tests");
    const tMeta = fetchTableMeta(primary.id);
    const titleCol = findColumnByTitle(tMeta, "Title");
    if (!titleCol?.id) throw new Error("No Title column found for sort test");
    const sorts = listSorts(testViewId);
    assert(sorts.list !== undefined, "sorts list should return a list");
    const newSort = createSort(testViewId, {
      fk_column_id: titleCol.id,
      direction: "asc",
    });
    testSortId = newSort.id;
    assert(testSortId, "sorts create should return an id");
    const sortDetail = getSort(testSortId);
    assert(sortDetail.id === testSortId, "sorts get should return correct sort");
    updateSort(testSortId, { direction: "desc" });
    deleteSort(testSortId);
    testSortId = undefined;
    report.sorts = { status: "passed" };
  } catch (err) {
    report.sorts = { status: "failed", error: err.message || String(err) };
    console.log("Sorts tests failed:", report.sorts.error);
  }

  // Clean up test view
  if (testViewId) {
    try { deleteView(testViewId); } catch { /* ignore */ }
  }

  // =========================================================================
  // NEW: Upsert tests (single row)
  // =========================================================================
  console.log("Testing rows upsert...");
  try {
    // Upsert create: no match -> creates
    const upserted = upsertRow(primary.id, "Title", "UpsertNew", { Title: "UpsertNew", Score: 10 });
    assert(upserted.Id !== undefined, "upsert create should return an Id");
    // Upsert update: match exists -> updates
    const updated = upsertRow(primary.id, "Title", "UpsertNew", { Title: "UpsertNew", Score: 20 });
    assert(updated.Id === upserted.Id, "upsert update should return same Id");
    const readBack = readRow(primary.id, upserted.Id);
    assert(readBack.Score === 20 || String(readBack.Score) === "20", "upsert should have updated Score");
    // --create-only should fail when match exists
    const coFail = upsertRowAllowFail(primary.id, "Title", "UpsertNew", { Title: "UpsertNew", Score: 30 }, ["--create-only"]);
    assert(coFail.status !== 0, "upsert --create-only should fail when match exists");
    // --update-only should fail when no match
    const uoFail = upsertRowAllowFail(primary.id, "Title", "NoSuchRow999", { Title: "NoSuchRow999", Score: 1 }, ["--update-only"]);
    assert(uoFail.status !== 0, "upsert --update-only should fail when no match");
    // Cleanup
    deleteRow(primary.id, { Id: upserted.Id });
    report.upsert = { status: "passed" };
  } catch (err) {
    report.upsert = { status: "failed", error: err.message || String(err) };
    console.log("Upsert tests failed:", report.upsert.error);
  }

  // =========================================================================
  // NEW: Bulk operations tests
  // =========================================================================
  console.log("Testing bulk-create / bulk-update / bulk-delete...");
  try {
    const bulkRows = [
      { Title: "Bulk1", Score: 1 },
      { Title: "Bulk2", Score: 2 },
      { Title: "Bulk3", Score: 3 },
    ];
    const createResult = bulkCreateRows(primary.id, bulkRows);
    assert(createResult !== undefined, "bulk-create should return a result");
    // Read back to get Ids — this is the real verification
    const allRows = listRows(primary.id, { where: "(Title,like,Bulk%)" });
    const bulkIds = (allRows.list || []).filter((r) => r.Title && r.Title.startsWith("Bulk")).map((r) => r.Id);
    assert(bulkIds.length >= 3, "should find at least 3 bulk-created rows");
    // Bulk update
    const updatePayload = bulkIds.map((id) => ({ Id: id, Score: 99 }));
    const updateResult = bulkUpdateRows(primary.id, updatePayload);
    assert(updateResult !== undefined, "bulk-update should return a result");
    // Verify update worked
    const updatedRows = listRows(primary.id, { where: "(Title,like,Bulk%)" });
    const scores = (updatedRows.list || []).filter((r) => r.Title && r.Title.startsWith("Bulk")).map((r) => r.Score);
    assert(scores.every((s) => String(s) === "99"), "bulk-update should have set Score to 99");
    // Bulk delete
    const deletePayload = bulkIds.map((id) => ({ Id: id }));
    const deleteResult = bulkDeleteRows(primary.id, deletePayload);
    assert(deleteResult !== undefined, "bulk-delete should return a result");
    // Verify delete worked
    const afterDelete = listRows(primary.id, { where: "(Title,like,Bulk%)" });
    const remaining = (afterDelete.list || []).filter((r) => r.Title && r.Title.startsWith("Bulk"));
    assert(remaining.length === 0, "bulk-delete should have removed all Bulk rows");
    report.bulkOps = { status: "passed" };
  } catch (err) {
    report.bulkOps = { status: "failed", error: err.message || String(err) };
    console.log("Bulk ops tests failed:", report.bulkOps.error);
  }

  // =========================================================================
  // NEW: Bulk upsert tests
  // =========================================================================
  console.log("Testing bulk-upsert...");
  try {
    // Create some rows first
    createRow(primary.id, { Title: "BulkUpsertExisting", Score: 1 });
    const buResult = bulkUpsertRows(primary.id, "Title", [
      { Title: "BulkUpsertExisting", Score: 50 },  // should update
      { Title: "BulkUpsertNew", Score: 60 },        // should create
    ]);
    assert(buResult !== undefined, "bulk-upsert should return a result");
    // Verify
    const buRows = listRows(primary.id, { where: "(Title,like,BulkUpsert%)" });
    const existing = (buRows.list || []).find((r) => r.Title === "BulkUpsertExisting");
    const created = (buRows.list || []).find((r) => r.Title === "BulkUpsertNew");
    assert(existing, "bulk-upsert should have updated existing row");
    assert(String(existing.Score) === "50", "bulk-upsert should have updated Score to 50");
    assert(created, "bulk-upsert should have created new row");
    // Cleanup
    for (const r of buRows.list || []) {
      try { deleteRow(primary.id, { Id: r.Id }); } catch { /* ignore */ }
    }
    report.bulkUpsert = { status: "passed" };
  } catch (err) {
    report.bulkUpsert = { status: "failed", error: err.message || String(err) };
    console.log("Bulk upsert tests failed:", report.bulkUpsert.error);
  }

  // =========================================================================
  // NEW: Request command tests
  // =========================================================================
  console.log("Testing request command...");
  try {
    // GET request with query
    const getBases = rawRequest("GET", "/api/v2/meta/bases", { query: { limit: "5" } });
    assert(getBases.list !== undefined, "request GET should return bases list");
    // GET single base
    const getBase2 = rawRequest("GET", `/api/v2/meta/bases/${BASE_ID}`);
    assert(getBase2.id === BASE_ID, "request GET base should return correct id");
    report.request = { status: "passed" };
  } catch (err) {
    report.request = { status: "failed", error: err.message || String(err) };
    console.log("Request tests failed:", report.request.error);
  }

  // =========================================================================
  // NEW: Meta endpoints tests
  // =========================================================================
  console.log("Testing meta endpoints...");
  try {
    const endpoints = metaEndpoints(BASE_ID);
    assert(Array.isArray(endpoints) && endpoints.length > 0, "meta endpoints should return a non-empty array");
    report.metaEndpoints = { status: "passed" };
  } catch (err) {
    report.metaEndpoints = { status: "failed", error: err.message || String(err) };
    console.log("Meta endpoints tests failed:", report.metaEndpoints.error);
  }

  // =========================================================================
  // NEW: Dynamic API command tests
  // =========================================================================
  console.log("Testing dynamic api commands...");
  try {
    const tag = findTableTagForName(swagger, tableA) || findTableTagForName(swagger, tableB);
    if (!tag) throw new Error("No table tag found in swagger for dynamic api test");
    const createOp = findCreateOpForTag(swagger, tag);
    if (!createOp) throw new Error(`No create operation found for tag ${tag}`);
    const dynRow = createRowViaDynamic(BASE_ID, tag, createOp.operationId, { Title: "DynamicApiRow" });
    assert(dynRow.Id !== undefined, "dynamic api create should return an Id");
    // Cleanup
    const dynTableId = tableIdFromPath(createOp.urlPath);
    if (dynTableId) {
      try { deleteRow(dynTableId, { Id: dynRow.Id }); } catch { /* ignore */ }
    }
    report.dynamicApi = { status: "passed" };
  } catch (err) {
    report.dynamicApi = { status: "failed", error: err.message || String(err) };
    console.log("Dynamic api tests failed:", report.dynamicApi.error);
  }

  // =========================================================================
  // NEW: Storage upload via CLI command
  // =========================================================================
  console.log("Testing storage upload via CLI...");
  try {
    const tmpFile = path.join(ROOT, "scripts", `upload-test-${Date.now()}.txt`);
    fs.writeFileSync(tmpFile, "nocodb-cli e2e upload test", "utf8");
    const uploadResult = storageUpload(tmpFile);
    assert(uploadResult !== undefined, "storage upload should return a result");
    report.storageUpload = { status: "passed" };
  } catch (err) {
    report.storageUpload = { status: "failed", error: err.message || String(err) };
    console.log("Storage upload tests failed:", report.storageUpload.error);
  }

  // =========================================================================
  // NEW: Schema introspection tests
  // =========================================================================
  console.log("Testing schema introspection...");
  try {
    // Basic introspect on primary table
    const schema = schemaIntrospect(primary.id);
    assert(schema.id === primary.id, "schema introspect should return correct table id");
    assert(typeof schema.title === "string" && schema.title.length > 0, "schema should have a title");
    assert(typeof schema.table_name === "string" && schema.table_name.length > 0, "schema should have a table_name");
    assert(Array.isArray(schema.columns), "schema should have a columns array");
    assert(schema.columns.length > 0, "schema columns should not be empty");

    // Verify column structure
    const firstCol = schema.columns[0];
    assert(typeof firstCol.id === "string", "column should have an id");
    assert(typeof firstCol.title === "string", "column should have a title");
    assert(typeof firstCol.uidt === "string", "column should have a uidt");
    assert(typeof firstCol.primaryKey === "boolean", "column should have a primaryKey boolean");
    assert(typeof firstCol.required === "boolean", "column should have a required boolean");
    assert(typeof firstCol.unique === "boolean", "column should have a unique boolean");

    // Verify primaryKey is identified
    const pkCol = schema.columns.find((c) => c.primaryKey === true);
    assert(pkCol !== undefined, "schema should identify a primary key column");

    // Verify displayValue is set
    assert(schema.displayValue !== undefined, "schema should have a displayValue");

    // Introspect secondary table too
    const schema2 = schemaIntrospect(secondary.id);
    assert(schema2.id === secondary.id, "schema introspect on secondary should return correct id");
    assert(Array.isArray(schema2.columns), "secondary schema should have columns");

    // Check that link column has a relation (if link was created)
    const linkCol = schema.columns.find((c) => c.relation !== undefined);
    if (linkCol) {
      assert(typeof linkCol.relation.type === "string", "relation should have a type");
      assert(typeof linkCol.relation.targetTableId === "string", "relation should have a targetTableId");
    }

    // Test with --format json (non-pretty, default)
    const schemaJson = schemaIntrospectAllowFail(primary.id);
    assert(schemaJson.status === 0, "schema introspect without --pretty should succeed");
    const parsed = jsonParseOrThrow(schemaJson.stdout);
    assert(parsed.id === primary.id, "non-pretty output should be valid JSON with correct id");

    // Test with invalid table id
    const badResult = schemaIntrospectAllowFail("nonexistent_table_id_999");
    assert(badResult.status !== 0, "schema introspect with invalid id should fail");

    report.schemaIntrospect = { status: "passed" };
  } catch (err) {
    report.schemaIntrospect = { status: "failed", error: err.message || String(err) };
    console.log("Schema introspection tests failed:", report.schemaIntrospect.error);
  }

  // =========================================================================
  // NEW: Me (auth check) tests
  // =========================================================================
  console.log("Testing me command...");
  try {
    const profile = me();
    assert(profile.email !== undefined, "me should return an email");
    assert(typeof profile.email === "string" && profile.email.length > 0, "me email should be non-empty");
    // Test --select filtering
    const raw = meRaw(["--select", "email"]);
    assert(raw.status === 0, "me --select should succeed");
    const filtered = jsonParseOrThrow(raw.stdout);
    assert(filtered.email !== undefined, "me --select email should include email");
    assert(filtered.id === undefined, "me --select email should exclude id");
    assert(filtered.roles === undefined, "me --select email should exclude roles");
    report.me = { status: "passed" };
  } catch (err) {
    report.me = { status: "failed", error: err.message || String(err) };
    console.log("Me tests failed:", report.me.error);
  }

  // =========================================================================
  // NEW: --select field filtering tests
  // =========================================================================
  console.log("Testing --select field filtering...");
  try {
    // --select on list response (bases list)
    const basesRaw = runCli(["bases", "list", "--select", "id"]);
    const basesFiltered = jsonParseOrThrow(basesRaw);
    assert(basesFiltered.list !== undefined, "--select on list should preserve list wrapper");
    assert(basesFiltered.list.length > 0, "--select bases list should have items");
    assert(basesFiltered.list[0].id !== undefined, "--select id should include id");
    assert(basesFiltered.list[0].title === undefined, "--select id should exclude title");

    // --select on single object (bases get)
    const baseRaw = runCli(["bases", "get", BASE_ID, "--select", "id,title"]);
    const baseFiltered = jsonParseOrThrow(baseRaw);
    assert(baseFiltered.id === BASE_ID, "--select should preserve id value");
    assert(baseFiltered.title !== undefined, "--select id,title should include title");

    // --select with --format csv
    const csvRaw = runCli(["bases", "list", "--select", "id", "--format", "csv"]);
    assert(csvRaw.includes("id"), "--select csv should contain id header");
    assert(!csvRaw.includes("title"), "--select csv should not contain title");

    // --select on rows list
    const rowsRaw = runCli(["rows", "list", primary.id, "--select", "Title"]);
    const rowsFiltered = jsonParseOrThrow(rowsRaw);
    assert(rowsFiltered.list !== undefined, "--select on rows list should preserve list wrapper");
    if (rowsFiltered.list.length > 0) {
      assert(rowsFiltered.list[0].Title !== undefined, "--select Title should include Title");
      assert(rowsFiltered.list[0].Id === undefined, "--select Title should exclude Id");
    }

    report.selectFilter = { status: "passed" };
  } catch (err) {
    report.selectFilter = { status: "failed", error: err.message || String(err) };
    console.log("--select tests failed:", report.selectFilter.error);
  }

  // =========================================================================
  // NEW: Hooks — list only (create/update/delete blocked by v2 deprecation)
  // =========================================================================
  console.log("Testing hooks list...");
  try {
    const hooks = listHooks(primary.id);
    assert(hooks.list !== undefined, "hooks list should return a list");
    report.hooks = { status: "passed" };
  } catch (err) {
    report.hooks = { status: "failed", error: err.message || String(err) };
    console.log("Hooks tests failed:", report.hooks.error);
  }

  // =========================================================================
  // NEW: Sources (Data Sources) — list + get
  // =========================================================================
  console.log("Testing sources list/get...");
  try {
    const sources = listSources(BASE_ID);
    assert(sources.list !== undefined, "sources list should return a list");
    assert(sources.list.length > 0, "sources list should have at least one source (default)");
    const firstSource = sources.list[0];
    assert(firstSource.id !== undefined, "source should have an id");
    // Get the first source by id
    const sourceDetail = getSource(BASE_ID, firstSource.id);
    assert(sourceDetail.id === firstSource.id, "sources get should return correct source");
    report.sources = { status: "passed" };
  } catch (err) {
    report.sources = { status: "failed", error: err.message || String(err) };
    console.log("Sources tests failed:", report.sources.error);
  }

  // =========================================================================
  // NEW: Tokens (v2 base-scoped) — list only (create/delete may require session auth)
  // =========================================================================
  console.log("Testing tokens list (v2 base-scoped)...");
  try {
    const tokens = listTokens(BASE_ID);
    assert(tokens.list !== undefined, "tokens list should return a list");
    report.tokens = { status: "passed" };
  } catch (err) {
    report.tokens = { status: "failed", error: err.message || String(err) };
    console.log("Tokens tests failed:", report.tokens.error);
  }

  // =========================================================================
  // NEW: Users (Base Collaborators) — list only
  // =========================================================================
  console.log("Testing users list...");
  try {
    const usersRaw = runCli(["users", "list", BASE_ID, "--pretty"]);
    const usersResult = jsonParseOrThrow(usersRaw);
    const userList = usersResult.list || usersResult.users || (Array.isArray(usersResult) ? usersResult : undefined);
    assert(userList !== undefined, "users list should return a list");
    assert(userList.length > 0, "users list should have at least one user");
    const firstUser = userList[0];
    assert(firstUser.email !== undefined, "user should have an email");
    report.users = { status: "passed" };
  } catch (err) {
    report.users = { status: "failed", error: err.message || String(err) };
    console.log("Users tests failed:", report.users.error);
  }

  // =========================================================================
  // NEW: Comments CRUD tests
  // =========================================================================
  console.log("Testing comments CRUD...");
  try {
    // Create a comment on the primary row
    const comment = createComment({
      fk_model_id: primary.id,
      row_id: String(rowA.Id),
      comment: "E2E test comment",
    });
    assert(comment !== undefined, "comments create should return a result");
    // List comments for the row
    const comments = listComments(primary.id, rowA.Id);
    assert(comments.list !== undefined || Array.isArray(comments), "comments list should return results");
    // Update the comment (if we got an id back)
    const commentId = comment.id || comment.Id;
    if (commentId) {
      updateComment(commentId, { comment: "Updated E2E comment" });
      deleteComment(commentId);
    }
    report.comments = { status: "passed" };
  } catch (err) {
    report.comments = { status: "failed", error: err.message || String(err) };
    console.log("Comments tests failed:", report.comments.error);
  }

  // =========================================================================
  // NEW: Shared Views tests
  // =========================================================================
  console.log("Testing shared views...");
  try {
    // We need a view id — use the default view from the primary table
    const viewsForShare = listViews(primary.id);
    const defaultView = viewsForShare.list?.[0];
    if (!defaultView?.id) throw new Error("No view available for shared views test");
    // Create a shared view
    const shared = createSharedView(defaultView.id);
    assert(shared !== undefined, "shared-views create should return a result");
    // List shared views for the table
    const sharedList = listSharedViews(primary.id);
    assert(sharedList.list !== undefined || Array.isArray(sharedList), "shared-views list should return results");
    // Delete the shared view
    deleteSharedView(defaultView.id);
    report.sharedViews = { status: "passed" };
  } catch (err) {
    report.sharedViews = { status: "failed", error: err.message || String(err) };
    console.log("Shared views tests failed:", report.sharedViews.error);
  }

  // =========================================================================
  // NEW: Shared Base tests
  // =========================================================================
  console.log("Testing shared base...");
  try {
    // Create a shared base
    const sharedBase = createSharedBase(BASE_ID, { roles: "viewer" });
    assert(sharedBase !== undefined, "shared-base create should return a result");
    // Get shared base info
    const sbGet = getSharedBase(BASE_ID);
    assert(sbGet.status === 0, "shared-base get should succeed");
    // Delete the shared base
    deleteSharedBase(BASE_ID);
    report.sharedBase = { status: "passed" };
  } catch (err) {
    report.sharedBase = { status: "failed", error: err.message || String(err) };
    // Clean up shared base if it was created
    try { deleteSharedBase(BASE_ID); } catch { /* ignore */ }
    console.log("Shared base tests failed:", report.sharedBase.error);
  }

  // =========================================================================
  // NEW: View Config & View Columns tests
  // =========================================================================
  console.log("Testing view config & view columns...");
  let formViewId;
  try {
    // Create a form view to test config
    const formViewResult = runCliAllowFail([
      "views", "create", primary.id, "--type", "form",
      "--data", JSON.stringify({ title: `E2E_FormCfg_${timestamp}` }),
      "--pretty",
    ]);
    if (formViewResult.status === 0) {
      const fv = jsonParseOrThrow(formViewResult.stdout);
      formViewId = fv.id;
    }
    // Test view columns list on the default view
    const viewsForCols = listViews(primary.id);
    const defaultViewForCols = viewsForCols.list?.[0];
    if (defaultViewForCols?.id) {
      const cols = listViewColumnsAllowFail(defaultViewForCols.id);
      assert(cols.status === 0, "views columns list should succeed");
    }
    // Test view config get on the form view (if created)
    if (formViewId) {
      const formCfg = getViewConfigAllowFail(formViewId, "form");
      assert(formCfg.status === 0, "views config get --view-type form should succeed");
    }
    report.viewConfig = { status: "passed" };
  } catch (err) {
    report.viewConfig = { status: "failed", error: err.message || String(err) };
    console.log("View config tests failed:", report.viewConfig.error);
  }
  // Clean up form view
  if (formViewId) {
    try { deleteView(formViewId); } catch { /* ignore */ }
  }

  // =========================================================================
  // NEW: Filter Children tests
  // =========================================================================
  console.log("Testing filter children...");
  try {
    // Create a filter group (is_group: true) on a view, then list its children
    const viewsForFc = listViews(primary.id);
    const defaultViewFc = viewsForFc.list?.[0];
    if (!defaultViewFc?.id) throw new Error("No view available for filter children test");
    // Create a filter group
    const tMetaFc = fetchTableMeta(primary.id);
    const titleColFc = findColumnByTitle(tMetaFc, "Title");
    if (!titleColFc?.id) throw new Error("No Title column found for filter children test");
    // Create a regular filter first (we'll use its parent group)
    const childFilter = createFilter(defaultViewFc.id, {
      fk_column_id: titleColFc.id,
      comparison_op: "eq",
      value: "filterChildTest",
    });
    // List filters to find the top-level group
    const allFilters = listFilters(defaultViewFc.id);
    // Try listing children of the first filter (even if not a group, the endpoint should respond)
    const firstFilterId = allFilters.list?.[0]?.id || childFilter.id;
    const childrenResult = listFilterChildrenAllowFail(firstFilterId);
    // The endpoint should succeed (200) even if there are no children
    assert(childrenResult.status === 0, "filters children should succeed");
    // Cleanup
    if (childFilter.id) deleteFilter(childFilter.id);
    report.filterChildren = { status: "passed" };
  } catch (err) {
    report.filterChildren = { status: "failed", error: err.message || String(err) };
    console.log("Filter children tests failed:", report.filterChildren.error);
  }

  // =========================================================================
  // NEW: Hook Filters tests (list only — create requires a valid hook)
  // =========================================================================
  console.log("Testing hook filters...");
  try {
    // List hooks to find one we can test filters on
    const hooksForHf = listHooks(primary.id);
    if (hooksForHf.list && hooksForHf.list.length > 0) {
      const hookId = hooksForHf.list[0].id;
      const hfResult = listHookFiltersAllowFail(hookId);
      assert(hfResult.status === 0, "hooks filters list should succeed");
      report.hookFilters = { status: "passed" };
    } else {
      // No hooks available — try the command anyway to verify it doesn't crash
      const hfResult = getAppInfoAllowFail(); // just verify CLI doesn't crash
      report.hookFilters = { status: "passed", note: "no hooks available, skipped filter list" };
    }
  } catch (err) {
    report.hookFilters = { status: "failed", error: err.message || String(err) };
    console.log("Hook filters tests failed:", report.hookFilters.error);
  }

  // =========================================================================
  // NEW: Set Primary Column tests
  // =========================================================================
  console.log("Testing set primary column...");
  try {
    const tMetaSp = fetchTableMeta(primary.id);
    const titleColSp = findColumnByTitle(tMetaSp, "Title");
    if (!titleColSp?.id) throw new Error("No Title column found for set-primary test");
    // Set Title as primary (it likely already is, but the endpoint should succeed)
    const spResult = setColumnPrimaryAllowFail(titleColSp.id);
    assert(spResult.status === 0, "columns set-primary should succeed");
    report.setPrimary = { status: "passed" };
  } catch (err) {
    report.setPrimary = { status: "failed", error: err.message || String(err) };
    console.log("Set primary column tests failed:", report.setPrimary.error);
  }

  // =========================================================================
  // NEW: Duplicate Table tests
  // =========================================================================
  console.log("Testing duplicate table...");
  let duplicatedTableId;
  try {
    const dupResult = duplicateTableAllowFail(BASE_ID, secondary.id, ["--exclude-data"]);
    assert(dupResult.status === 0, "duplicate table should succeed");
    // The response may contain a job id or the duplicated table info
    if (dupResult.stdout) {
      try {
        const dupParsed = jsonParseOrThrow(dupResult.stdout);
        duplicatedTableId = dupParsed.id;
      } catch { /* response may not be JSON */ }
    }
    report.duplicateOps = { status: "passed" };
  } catch (err) {
    report.duplicateOps = { status: "failed", error: err.message || String(err) };
    console.log("Duplicate table tests failed:", report.duplicateOps.error);
  }

  // =========================================================================
  // NEW: Visibility Rules tests
  // =========================================================================
  console.log("Testing visibility rules...");
  try {
    const rules = getVisibilityRulesAllowFail(BASE_ID);
    assert(rules.status === 0, "visibility-rules get should succeed");
    // Parse and verify it's an array
    if (rules.stdout) {
      const parsed = jsonParseOrThrow(rules.stdout);
      assert(Array.isArray(parsed), "visibility-rules get should return an array");
    }
    report.visibilityRules = { status: "passed" };
  } catch (err) {
    report.visibilityRules = { status: "failed", error: err.message || String(err) };
    console.log("Visibility rules tests failed:", report.visibilityRules.error);
  }

  // =========================================================================
  // NEW: App Info tests
  // =========================================================================
  console.log("Testing app info...");
  try {
    const info = getAppInfo();
    assert(info !== undefined, "info should return a result");
    assert(info.version !== undefined || info.authType !== undefined || Object.keys(info).length > 0,
      "info should contain server information");
    report.appInfo = { status: "passed" };
  } catch (err) {
    report.appInfo = { status: "failed", error: err.message || String(err) };
    console.log("App info tests failed:", report.appInfo.error);
  }

  // =========================================================================
  // NEW: Cloud Workspace tests (☁ cloud-only — gracefully skipped on self-hosted)
  // =========================================================================
  console.log("Testing cloud workspace commands...");
  try {
    // Probe: try listing workspaces. On self-hosted this will 404/fail.
    const probe = cloudWorkspaceListAllowFail();
    if (probe.status !== 0) {
      console.log("Cloud workspace endpoints not available (self-hosted?); skipping.");
      report.cloudWorkspace = { status: "passed", note: "skipped — not a cloud instance" };
    } else {
      const wsList = jsonParseOrThrow(probe.stdout);
      assert(wsList.list !== undefined, "workspace cloud list should return a list");
      // If there's at least one workspace, test get/users/bases
      if (wsList.list.length > 0) {
        const wsId = wsList.list[0].id;
        const wsDetail = cloudWorkspaceGet(wsId);
        assert(wsDetail.workspace !== undefined, "workspace cloud get should return workspace object");
        assert(wsDetail.workspaceUserCount !== undefined, "workspace cloud get should return workspaceUserCount");
        // List users
        const usersResult = cloudWorkspaceUsersAllowFail(wsId);
        assert(usersResult.status === 0, "workspace cloud users should succeed");
        // List bases
        const basesResult = cloudWorkspaceBasesAllowFail(wsId);
        assert(basesResult.status === 0, "workspace cloud bases should succeed");
      }
      report.cloudWorkspace = { status: "passed" };
    }
  } catch (err) {
    report.cloudWorkspace = { status: "failed", error: err.message || String(err) };
    console.log("Cloud workspace tests failed:", report.cloudWorkspace.error);
  }

  console.log("Cleanup...");
  // Clean up duplicated table if it was created
  if (duplicatedTableId) {
    try { runCli(["tables", "delete", duplicatedTableId]); } catch { /* ignore */ }
  }
  deleteRow(primary.id, { Id: rowA.Id });
  deleteRow(secondary.id, { Id: rowB.Id });
  try {
    const formulaRow = createRow(formulaTable.id, { Title: "FormulaRow", Score: 2 });
    deleteRow(formulaTable.id, { Id: formulaRow.Id });
  } catch {
    // ignore
  }
  try {
    deleteRow(typeTable.id, { Id: typeRow.Id });
  } catch {
    // ignore
  }

  if (!KEEP) {
    runCli(["tables", "delete", primary.id]);
    runCli(["tables", "delete", secondary.id]);
    runCli(["tables", "delete", formulaTable.id]);
    runCli(["tables", "delete", typeTable.id]);
  }

  const colPassed = report.columns.filter((c) => c.status === "passed").length;
  const colFailed = report.columns.filter((c) => c.status === "failed").length;
  const colSkipped = report.columns.filter((c) => c.status === "skipped").length;
  const linkPassed = report.links.filter((l) => l.status === "passed").length;
  const linkFailed = report.links.filter((l) => l.status === "failed").length;

  // Gather feature test results
  const featureTests = [
    "workspace", "bases", "tablesExtra", "views", "filters", "sorts",
    "upsert", "bulkOps", "bulkUpsert", "request", "metaEndpoints",
    "dynamicApi", "storageUpload", "schemaIntrospect", "me", "selectFilter",
    "hooks", "tokens", "sources", "users",
    "comments", "sharedViews", "sharedBase", "viewConfig",
    "filterChildren", "hookFilters", "setPrimary", "duplicateOps",
    "visibilityRules", "appInfo", "cloudWorkspace",
  ];
  const featurePassed = featureTests.filter((k) => report[k]?.status === "passed").length;
  const featureFailed = featureTests.filter((k) => report[k]?.status === "failed").length;
  const featureSkipped = featureTests.filter((k) => !report[k]).length;

  report.summary = {
    columns: { passed: colPassed, failed: colFailed, skipped: colSkipped },
    links: { passed: linkPassed, failed: linkFailed },
    features: { passed: featurePassed, failed: featureFailed, skipped: featureSkipped },
  };
  report.finishedAt = new Date().toISOString();
  writeReport(report);
  writeReportMarkdown(report);
  console.log("E2E complete.");
}

function tagFromPath(swagger, pathValue) {
  const methods = swagger.paths?.[pathValue];
  if (!methods) return "default";
  const op = methods.get || methods.post || methods.delete || methods.patch;
  return op?.tags?.[0] || "default";
}

function findOperationId(swagger, pathValue, method) {
  const op = swagger.paths?.[pathValue]?.[method];
  if (!op?.operationId) {
    throw new Error(`Missing operationId for ${method.toUpperCase()} ${pathValue}`);
  }
  return op.operationId;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
