import { Command } from "commander";
import { DataApi, NocoClient } from "@nocodb/sdk";
import { resolveNamespacedAlias, type MultiConfig } from "../aliases.js";
import { addJsonInputOptions, addOutputOptions, withErrorHandler } from "./helpers.js";

type PrintOptions = { pretty?: boolean; format?: string };

export interface RegisterLinksCommandsDeps {
  program: Command;
  collect: (value: string, previous: string[]) => string[];
  parseQuery: (items: string[]) => Record<string, string>;
  readJsonInput: (data?: string, dataFile?: string) => Promise<unknown>;
  printResult: (result: unknown, options?: PrintOptions | boolean) => void;
  handleError: (err: unknown) => void;
  clientOptionsFromSettings: () => {
    timeoutMs: number;
    retry: {
      retry: number | false;
      retryDelay: number;
      retryStatusCodes: number[];
    };
  };
  getBaseUrl: () => string;
  getHeadersConfig: () => Record<string, string>;
  getActiveWorkspaceName: () => string | undefined;
  getMultiConfig: () => MultiConfig;
}

export function registerLinksCommands({
  program,
  collect,
  parseQuery,
  readJsonInput,
  printResult,
  handleError,
  clientOptionsFromSettings,
  getBaseUrl,
  getHeadersConfig,
  getActiveWorkspaceName,
  getMultiConfig,
}: RegisterLinksCommandsDeps): void {
  const linksCmd = program.command("links").description("Manage linked records");

  addOutputOptions(
    linksCmd
      .command("list")
      .argument("tableId", "Table id")
      .argument("linkFieldId", "Link field id")
      .argument("recordId", "Record id")
      .option("-q, --query <key=value>", "Query string parameter", collect, []),
  ).action(withErrorHandler(handleError, async (
    tableId: string,
    linkFieldId: string,
    recordId: string,
    options: { query: string[]; pretty?: boolean; format?: string },
  ) => {
    const resolved = resolveNamespacedAlias(tableId, getMultiConfig(), getActiveWorkspaceName());
    const resolvedTableId = resolved.id;
    const client = new NocoClient({
      baseUrl: resolved.workspace?.baseUrl ?? getBaseUrl(),
      headers: resolved.workspace?.headers ?? getHeadersConfig(),
      ...clientOptionsFromSettings(),
    });
    const data = new DataApi(client);
    const query = parseQuery(options.query ?? []);
    const result = await data.listLinks(resolvedTableId, linkFieldId, recordId, query);
    printResult(result, options);
  }));

  addOutputOptions(addJsonInputOptions(
    linksCmd
      .command("create")
      .argument("tableId", "Table id")
      .argument("linkFieldId", "Link field id")
      .argument("recordId", "Record id"),
    "Request JSON body (array of {Id: ...})",
  )).action(withErrorHandler(handleError, async (
    tableId: string,
    linkFieldId: string,
    recordId: string,
    options: { data?: string; dataFile?: string; pretty?: boolean; format?: string },
  ) => {
    const resolved = resolveNamespacedAlias(tableId, getMultiConfig(), getActiveWorkspaceName());
    const resolvedTableId = resolved.id;
    const client = new NocoClient({
      baseUrl: resolved.workspace?.baseUrl ?? getBaseUrl(),
      headers: resolved.workspace?.headers ?? getHeadersConfig(),
      ...clientOptionsFromSettings(),
    });
    const data = new DataApi(client);
    const body = await readJsonInput(options.data, options.dataFile);
    const result = await data.linkRecords(resolvedTableId, linkFieldId, recordId, body);
    printResult(result, options);
  }));

  addOutputOptions(addJsonInputOptions(
    linksCmd
      .command("delete")
      .argument("tableId", "Table id")
      .argument("linkFieldId", "Link field id")
      .argument("recordId", "Record id"),
    "Request JSON body (array of {Id: ...})",
  )).action(withErrorHandler(handleError, async (
    tableId: string,
    linkFieldId: string,
    recordId: string,
    options: { data?: string; dataFile?: string; pretty?: boolean; format?: string },
  ) => {
    const resolved = resolveNamespacedAlias(tableId, getMultiConfig(), getActiveWorkspaceName());
    const resolvedTableId = resolved.id;
    const client = new NocoClient({
      baseUrl: resolved.workspace?.baseUrl ?? getBaseUrl(),
      headers: resolved.workspace?.headers ?? getHeadersConfig(),
      ...clientOptionsFromSettings(),
    });
    const data = new DataApi(client);
    const body = await readJsonInput(options.data, options.dataFile);
    const result = await data.unlinkRecords(resolvedTableId, linkFieldId, recordId, body);
    printResult(result, options);
  }));
}
