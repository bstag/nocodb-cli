import { addJsonInputOptions, addOutputOptions, withErrorHandler } from "../helpers.js";
import type { MetaCrudDeps } from "./types.js";

export function registerSortsCommands({
  program,
  createMeta,
  readJsonInput,
  printResult,
  handleError,
}: MetaCrudDeps): void {
  const sortsCmd = program.command("sorts").description("Manage view sorts");

  addOutputOptions(sortsCmd.command("list").argument("viewId", "View id")).action(
    withErrorHandler(handleError, async (viewId: string, options: { pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const result = await meta.listViewSorts(viewId);
      printResult(result, options);
    }),
  );

  addOutputOptions(sortsCmd.command("get").argument("sortId", "Sort id")).action(
    withErrorHandler(handleError, async (sortId: string, options: { pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const result = await meta.getSort(sortId);
      printResult(result, options);
    }),
  );

  addOutputOptions(addJsonInputOptions(sortsCmd.command("create").argument("viewId", "View id"))).action(
    withErrorHandler(handleError, async (viewId: string, options: { data?: string; dataFile?: string; pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const body = await readJsonInput(options.data, options.dataFile);
      const result = await meta.createViewSort(viewId, body);
      printResult(result, options);
    }),
  );

  addOutputOptions(addJsonInputOptions(sortsCmd.command("update").argument("sortId", "Sort id"))).action(
    withErrorHandler(handleError, async (sortId: string, options: { data?: string; dataFile?: string; pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const body = await readJsonInput(options.data, options.dataFile);
      const result = await meta.updateSort(sortId, body);
      printResult(result, options);
    }),
  );

  addOutputOptions(sortsCmd.command("delete").argument("sortId", "Sort id")).action(
    withErrorHandler(handleError, async (sortId: string, options: { pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const result = await meta.deleteSort(sortId);
      printResult(result, options);
    }),
  );
}
