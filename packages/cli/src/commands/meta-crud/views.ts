import { addJsonInputOptions, addOutputOptions, withErrorHandler } from "../helpers.js";
import type { MetaCrudDeps } from "./types.js";

export function registerViewsCommands({
  program,
  createMeta,
  readJsonInput,
  printResult,
  handleError,
}: MetaCrudDeps): void {
  const viewsCmd = program.command("views").description("Manage views");

  addOutputOptions(viewsCmd.command("list").argument("tableId", "Table id")).action(
    withErrorHandler(handleError, async (tableId: string, options: { pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const result = await meta.listViews(tableId);
      printResult(result, options);
    }),
  );

  addOutputOptions(viewsCmd.command("get").argument("viewId", "View id")).action(
    withErrorHandler(handleError, async (viewId: string, options: { pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const result = await meta.getView(viewId);
      printResult(result, options);
    }),
  );

  addOutputOptions(addJsonInputOptions(viewsCmd.command("create").argument("tableId", "Table id"))).action(
    withErrorHandler(handleError, async (tableId: string, options: { data?: string; dataFile?: string; pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const body = await readJsonInput(options.data, options.dataFile);
      const result = await meta.createView(tableId, body);
      printResult(result, options);
    }),
  );

  addOutputOptions(addJsonInputOptions(viewsCmd.command("update").argument("viewId", "View id"))).action(
    withErrorHandler(handleError, async (viewId: string, options: { data?: string; dataFile?: string; pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const body = await readJsonInput(options.data, options.dataFile);
      const result = await meta.updateView(viewId, body);
      printResult(result, options);
    }),
  );

  addOutputOptions(viewsCmd.command("delete").argument("viewId", "View id")).action(
    withErrorHandler(handleError, async (viewId: string, options: { pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const result = await meta.deleteView(viewId);
      printResult(result, options);
    }),
  );
}
