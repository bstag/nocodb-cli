import { addJsonInputOptions, addOutputOptions, withErrorHandler } from "../helpers.js";
import type { MetaCrudDeps } from "./types.js";

export function registerFiltersCommands({
  program,
  createMeta,
  readJsonInput,
  printResult,
  handleError,
}: MetaCrudDeps): void {
  const filtersCmd = program.command("filters").description("Manage view filters");

  addOutputOptions(filtersCmd.command("list").argument("viewId", "View id")).action(
    withErrorHandler(handleError, async (viewId: string, options: { pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const result = await meta.listViewFilters(viewId);
      printResult(result, options);
    }),
  );

  addOutputOptions(filtersCmd.command("get").argument("filterId", "Filter id")).action(
    withErrorHandler(handleError, async (filterId: string, options: { pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const result = await meta.getFilter(filterId);
      printResult(result, options);
    }),
  );

  addOutputOptions(addJsonInputOptions(filtersCmd.command("create").argument("viewId", "View id"))).action(
    withErrorHandler(handleError, async (viewId: string, options: { data?: string; dataFile?: string; pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const body = await readJsonInput(options.data, options.dataFile);
      const result = await meta.createViewFilter(viewId, body);
      printResult(result, options);
    }),
  );

  addOutputOptions(addJsonInputOptions(filtersCmd.command("update").argument("filterId", "Filter id"))).action(
    withErrorHandler(handleError, async (filterId: string, options: { data?: string; dataFile?: string; pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const body = await readJsonInput(options.data, options.dataFile);
      const result = await meta.updateFilter(filterId, body);
      printResult(result, options);
    }),
  );

  addOutputOptions(filtersCmd.command("delete").argument("filterId", "Filter id")).action(
    withErrorHandler(handleError, async (filterId: string, options: { pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const result = await meta.deleteFilter(filterId);
      printResult(result, options);
    }),
  );
}
