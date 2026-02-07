import { addJsonInputOptions, addOutputOptions, withErrorHandler } from "../helpers.js";
import type { MetaCrudDeps } from "./types.js";

export function registerColumnsCommands({
  program,
  createMeta,
  readJsonInput,
  printResult,
  handleError,
}: MetaCrudDeps): void {
  const columnsCmd = program.command("columns").description("Manage table columns");

  addOutputOptions(columnsCmd.command("list").argument("tableId", "Table id")).action(
    withErrorHandler(handleError, async (tableId: string, options: { pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const result = await meta.listColumns(tableId);
      printResult(result, options);
    }),
  );

  addOutputOptions(columnsCmd.command("get").argument("columnId", "Column id")).action(
    withErrorHandler(handleError, async (columnId: string, options: { pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const result = await meta.getColumn(columnId);
      printResult(result, options);
    }),
  );

  addOutputOptions(addJsonInputOptions(columnsCmd.command("create").argument("tableId", "Table id"))).action(
    withErrorHandler(handleError, async (tableId: string, options: { data?: string; dataFile?: string; pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const body = await readJsonInput(options.data, options.dataFile);
      const result = await meta.createColumn(tableId, body);
      printResult(result, options);
    }),
  );

  addOutputOptions(addJsonInputOptions(columnsCmd.command("update").argument("columnId", "Column id"))).action(
    withErrorHandler(handleError, async (columnId: string, options: { data?: string; dataFile?: string; pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const body = await readJsonInput(options.data, options.dataFile);
      const result = await meta.updateColumn(columnId, body);
      printResult(result, options);
    }),
  );

  addOutputOptions(columnsCmd.command("delete").argument("columnId", "Column id")).action(
    withErrorHandler(handleError, async (columnId: string, options: { pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const result = await meta.deleteColumn(columnId);
      printResult(result, options);
    }),
  );
}
