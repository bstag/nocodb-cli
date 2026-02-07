import { resolveNamespacedAlias } from "../../aliases.js";
import { addJsonInputOptions, addOutputOptions, withErrorHandler } from "../helpers.js";
import type { MetaCrudDeps } from "./types.js";

export function registerTablesCommands({
  program,
  createMeta,
  readJsonInput,
  printResult,
  handleError,
  getActiveWorkspaceName,
  getMultiConfig,
}: MetaCrudDeps): void {
  const tablesCmd = program.command("tables").description("Manage tables");

  addOutputOptions(tablesCmd.command("list").argument("baseId", "Base id")).action(
    withErrorHandler(handleError, async (baseId: string, options: { pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const resolved = resolveNamespacedAlias(baseId, getMultiConfig(), getActiveWorkspaceName());
      const result = await meta.listTables(resolved.id);
      printResult(result, options);
    }),
  );

  addOutputOptions(tablesCmd.command("get").argument("tableId", "Table id")).action(
    withErrorHandler(handleError, async (tableId: string, options: { pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const resolved = resolveNamespacedAlias(tableId, getMultiConfig(), getActiveWorkspaceName());
      const result = await meta.getTable(resolved.id);
      printResult(result, options);
    }),
  );

  addOutputOptions(addJsonInputOptions(tablesCmd.command("create").argument("baseId", "Base id"))).action(
    withErrorHandler(handleError, async (baseId: string, options: { data?: string; dataFile?: string; pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const body = await readJsonInput(options.data, options.dataFile);
      const resolved = resolveNamespacedAlias(baseId, getMultiConfig(), getActiveWorkspaceName());
      const result = await meta.createTable(resolved.id, body);
      printResult(result, options);
    }),
  );

  addOutputOptions(addJsonInputOptions(tablesCmd.command("update").argument("tableId", "Table id"))).action(
    withErrorHandler(handleError, async (tableId: string, options: { data?: string; dataFile?: string; pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const body = await readJsonInput(options.data, options.dataFile);
      const resolved = resolveNamespacedAlias(tableId, getMultiConfig(), getActiveWorkspaceName());
      const result = await meta.updateTable(resolved.id, body);
      printResult(result, options);
    }),
  );

  addOutputOptions(tablesCmd.command("delete").argument("tableId", "Table id")).action(
    withErrorHandler(handleError, async (tableId: string, options: { pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const resolved = resolveNamespacedAlias(tableId, getMultiConfig(), getActiveWorkspaceName());
      const result = await meta.deleteTable(resolved.id);
      printResult(result, options);
    }),
  );
}
