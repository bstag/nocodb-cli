import { resolveNamespacedAlias } from "../../aliases.js";
import { addJsonInputOptions, addOutputOptions, withErrorHandler } from "../helpers.js";
import type { MetaCrudDeps } from "./types.js";

export function registerBasesCommands({
  program,
  createMeta,
  readJsonInput,
  printResult,
  handleError,
  getActiveWorkspaceName,
  getMultiConfig,
}: MetaCrudDeps): void {
  const basesCmd = program.command("bases").description("Manage bases");

  addOutputOptions(basesCmd.command("list")).action(withErrorHandler(handleError, async (options: { pretty?: boolean; format?: string }) => {
    const meta = createMeta();
    const result = await meta.listBases();
    printResult(result, options);
  }));

  addOutputOptions(basesCmd.command("get").argument("baseId", "Base id")).action(
    withErrorHandler(handleError, async (baseId: string, options: { pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const resolved = resolveNamespacedAlias(baseId, getMultiConfig(), getActiveWorkspaceName());
      const result = await meta.getBase(resolved.id);
      printResult(result, options);
    }),
  );

  addOutputOptions(basesCmd.command("info").argument("baseId", "Base id")).action(
    withErrorHandler(handleError, async (baseId: string, options: { pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const resolved = resolveNamespacedAlias(baseId, getMultiConfig(), getActiveWorkspaceName());
      const result = await meta.getBaseInfo(resolved.id);
      printResult(result, options);
    }),
  );

  addOutputOptions(addJsonInputOptions(basesCmd.command("create"))).action(
    withErrorHandler(handleError, async (options: { data?: string; dataFile?: string; pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const body = await readJsonInput(options.data, options.dataFile);
      const result = await meta.createBase(body);
      printResult(result, options);
    }),
  );

  addOutputOptions(addJsonInputOptions(basesCmd.command("update").argument("baseId", "Base id"))).action(
    withErrorHandler(handleError, async (baseId: string, options: { data?: string; dataFile?: string; pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const body = await readJsonInput(options.data, options.dataFile);
      const resolved = resolveNamespacedAlias(baseId, getMultiConfig(), getActiveWorkspaceName());
      const result = await meta.updateBase(resolved.id, body);
      printResult(result, options);
    }),
  );

  addOutputOptions(basesCmd.command("delete").argument("baseId", "Base id")).action(
    withErrorHandler(handleError, async (baseId: string, options: { pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const resolved = resolveNamespacedAlias(baseId, getMultiConfig(), getActiveWorkspaceName());
      const result = await meta.deleteBase(resolved.id);
      printResult(result, options);
    }),
  );
}
