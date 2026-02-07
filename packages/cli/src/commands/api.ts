import { Command } from "commander";
import { NocoClient, parseHeader } from "@nocodb/sdk";
import {
  applyPathParams,
  extractOperations,
  getPathParamNames,
  parseKeyValue,
  slugify,
  validateRequestBody,
  type Operation,
  type SwaggerDoc,
} from "../lib.js";
import { addJsonInputOptions, addOutputOptions, withErrorHandler } from "./helpers.js";

type PrintOptions = { pretty?: boolean; format?: string };

export interface RegisterApiCommandsDeps {
  program: Command;
  loadSwagger: (baseId: string, useCache: boolean) => Promise<SwaggerDoc>;
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
  readJsonFile: (path: string) => Promise<unknown>;
}

export function createApiCommand(program: Command): Command {
  return program.command("api").description("Dynamic API commands from base swagger");
}

export async function registerDynamicApiCommands(
  parent: Command,
  baseId: string,
  {
    loadSwagger,
    getBaseUrl,
    getHeadersConfig,
    clientOptionsFromSettings,
    printResult,
    handleError,
    readJsonFile,
  }: RegisterApiCommandsDeps,
): Promise<void> {
  const swagger = await loadSwagger(baseId, true);
  const operations = extractOperations(swagger);
  const tags = new Map<string, { cmd: Command; names: Set<string> }>();

  let opCounter = 0;
  for (const op of operations) {
    const tag = op.tags?.[0] ?? "default";
    const safeTag = slugify(tag);
    let tagEntry = tags.get(safeTag);
    if (!tagEntry) {
      tagEntry = { cmd: parent.command(safeTag).description(tag), names: new Set() };
      tags.set(safeTag, tagEntry);
    }

    let opName = slugify(op.operationId ?? `${op.method}-${op.path}`);
    if (!opName) {
      opCounter += 1;
      opName = `operation-${opCounter}`;
    }
    if (tagEntry.names.has(opName)) {
      opCounter += 1;
      opName = `${opName}-${opCounter}`;
    }
    tagEntry.names.add(opName);

    const pathParamNames = getPathParamNames(op.path);
    const opCmd = tagEntry.cmd.command(opName).description(`${op.method.toUpperCase()} ${op.path}`);
    for (const paramName of pathParamNames) {
      opCmd.argument(paramName, `Path param: ${paramName}`);
    }

    addOutputOptions(
      addJsonInputOptions(
        opCmd
          .option("-q, --query <key=value>", "Query string parameter", collect, [])
          .option("-H, --header <name: value>", "Request header", collect, []),
      ),
    ).action(withErrorHandler(handleError, async (...args: unknown[]) => {
      const cmd = args[args.length - 1] as Command;
      const options = cmd.opts<{
        query: string[];
        header: string[];
        data?: string;
        dataFile?: string;
        pretty?: boolean;
        format?: string;
      }>();

      const pathArgs = args.slice(0, pathParamNames.length) as string[];
      const finalPath = applyPathParams(op.path, pathParamNames, pathArgs);

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

      const body = await maybeReadBody(readJsonFile, options.data, options.dataFile);
      validateRequestBody(op, swagger, body);

      const client = new NocoClient({ baseUrl: getBaseUrl(), headers: getHeadersConfig(), ...clientOptionsFromSettings() });
      const result = await client.request(op.method.toUpperCase(), finalPath, {
        query: Object.keys(query).length ? query : undefined,
        headers: Object.keys(requestHeaders).length ? requestHeaders : undefined,
        body,
      });

      printResult(result, options);
    }));
  }
}

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

async function maybeReadBody(
  readJsonFile: (path: string) => Promise<unknown>,
  data?: string,
  dataFile?: string,
): Promise<unknown | undefined> {
  if (dataFile) return readJsonFile(dataFile);
  if (data) return JSON.parse(data);
  return undefined;
}

export type { Operation };
