import { Command } from "commander";
import { NocoClient, parseHeader } from "@nocodb/sdk";
import { parseKeyValue } from "../lib.js";
import { addJsonInputOptions, addOutputOptions, withErrorHandler } from "./helpers.js";

type PrintOptions = { pretty?: boolean; format?: string };

export interface RegisterRequestCommandDeps {
  program: Command;
  collect: (value: string, previous: string[]) => string[];
  readJsonFile: (path: string) => Promise<unknown>;
  getBaseUrl: () => string;
  getHeadersConfig: () => Record<string, string>;
  clientOptionsFromSettings: () => {
    timeoutMs: number;
    retry: {
      retry: number | false;
      retryDelay: number;
      retryStatusCodes: number[];
    };
  };
  printResult: (result: unknown, options?: PrintOptions | boolean) => void;
  handleError: (err: unknown) => void;
}

export function registerRequestCommand({
  program,
  collect,
  readJsonFile,
  getBaseUrl,
  getHeadersConfig,
  clientOptionsFromSettings,
  printResult,
  handleError,
}: RegisterRequestCommandDeps): void {
  const requestCmd = program
    .command("request")
    .description("Make a raw API request")
    .argument("method", "HTTP method")
    .argument("path", "API path, e.g. /api/v2/meta/projects")
    .option("-q, --query <key=value>", "Query string parameter", collect, [])
    .option("-H, --header <name: value>", "Request header", collect, []);

  addOutputOptions(addJsonInputOptions(requestCmd)).action(
    withErrorHandler(handleError, async (method: string, path: string, options: {
      query: string[];
      header: string[];
      data?: string;
      dataFile?: string;
      pretty?: boolean;
      format?: string;
    }) => {
      const baseUrl = getBaseUrl();
      const headers = getHeadersConfig();
      const client = new NocoClient({ baseUrl, headers, ...clientOptionsFromSettings() });

      const query: Record<string, string> = {};
      for (const item of options.query ?? []) {
        const [key, value] = parseKeyValue(item);
        query[key] = value;
      }

      const requestHeaders: Record<string, string> = {};
      for (const item of options.header ?? []) {
        const [name, value] = parseHeader(item);
        requestHeaders[name] = value;
      }

      let body: unknown;
      if (options.dataFile) {
        body = await readJsonFile(options.dataFile);
      } else if (options.data) {
        body = JSON.parse(options.data);
      }

      const result = await client.request<unknown>(method, path, {
        query: Object.keys(query).length ? query : undefined,
        headers: Object.keys(requestHeaders).length ? requestHeaders : undefined,
        body,
      });

      printResult(result, options);
    }),
  );
}
