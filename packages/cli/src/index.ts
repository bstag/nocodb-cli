#!/usr/bin/env node
import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MetaApi, NocoClient } from "@nocodb/sdk";
import {
  formatCsv,
  formatTable,
  getBaseIdFromArgv as parseBaseIdArgv,
  handleError,
  isHttpMethod,
  isSwaggerDoc,
  parseKeyValue,
  type SwaggerDoc,
} from "./lib.js";
import { createConfig, deleteHeader, getHeaders, setHeader } from "./config.js";
import { loadSettings, saveSettings, resetSettings, getSettingsPath, DEFAULT_SETTINGS, type Settings } from "./settings.js";
import { loadMultiConfig, resolveNamespacedAlias, type MultiConfig, type WorkspaceConfig } from "./aliases.js";
import { registerRowsCommands } from "./commands/rows.js";
import { registerMetaCommands } from "./commands/meta.js";
import { registerLinksCommands } from "./commands/links.js";
import { createApiCommand, registerDynamicApiCommands } from "./commands/api.js";
import { registerStorageCommands } from "./commands/storage.js";
import { registerWorkspaceAliasCommands } from "./commands/workspace-alias.js";
import { registerRequestCommand } from "./commands/request.js";
import { registerMetaCrudCommands } from "./commands/meta-crud.js";

const config = createConfig();
const settings = loadSettings();
let multiConfig = loadMultiConfig();

function getActiveWorkspaceName(): string | undefined {
  return config.get("activeWorkspace") as string | undefined;
}

function getActiveWorkspace(): WorkspaceConfig | undefined {
  const name = getActiveWorkspaceName();
  return name ? multiConfig[name] : undefined;
}

function getBaseUrl(): string {
  const ws = getActiveWorkspace();
  if (ws?.baseUrl) return ws.baseUrl;

  const baseUrl = config.get("baseUrl");
  if (!baseUrl) {
    throw new Error(
      "Base URL is not set. Run either: nocodb workspace add <name> <url> <token> or: nocodb config set baseUrl <url>",
    );
  }
  return baseUrl;
}

function getBaseId(fallback?: string): string {
  const ws = getActiveWorkspace();
  const baseId = fallback ?? ws?.baseId ?? config.get("baseId");

  if (!baseId) {
    throw new Error("Base id is not set. Use --base <id> or: nocodb config set baseId <id>");
  }
  return resolveNamespacedAlias(baseId, multiConfig, getActiveWorkspaceName()).id;
}

function getHeadersConfig(): Record<string, string> {
  const ws = getActiveWorkspace();
  const wsHeaders = ws?.headers ?? {};
  return { ...getHeaders(config), ...wsHeaders };
}

async function readJsonFile(path: string): Promise<unknown> {
  const raw = await fs.promises.readFile(path, "utf8");
  return JSON.parse(raw);
}

function getCacheDir(): string {
  const configPath = config.path;
  const dir = path.dirname(configPath);
  return path.join(dir, "cache");
}

async function writeJsonFile(filePath: string, data: unknown, pretty?: boolean): Promise<void> {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  const raw = JSON.stringify(data, null, pretty ? 2 : 0);
  await fs.promises.writeFile(filePath, raw, "utf8");
}

async function readJsonInput(data?: string, dataFile?: string): Promise<unknown> {
  if (dataFile) {
    return readJsonFile(dataFile);
  }
  if (data) {
    return JSON.parse(data);
  }
  throw new Error("Provide --data or --data-file");
}

function printResult(result: unknown, options?: { pretty?: boolean; format?: string } | boolean): void {
  if (process.env.NOCO_QUIET === "1") {
    return;
  }
  if (typeof result === "string") {
    console.log(result);
    return;
  }
  const pretty = typeof options === "boolean" ? options : options?.pretty;
  const format = typeof options === "boolean" ? "json" : (options?.format ?? "json");
  if (format === "csv") {
    console.log(formatCsv(result));
    return;
  }
  if (format === "table") {
    console.log(formatTable(result));
    return;
  }
  console.log(JSON.stringify(result, null, pretty ? 2 : 0));
}

function clientOptionsFromSettings() {
  const opts = program.opts();
  const timeoutMs = opts.timeout ? Number(opts.timeout) : settings.timeoutMs;
  const retryCount = opts.retries != null ? Number(opts.retries) : settings.retryCount;
  return {
    timeoutMs,
    retry: {
      retry: retryCount === 0 ? (false as const) : retryCount,
      retryDelay: settings.retryDelay,
      retryStatusCodes: settings.retryStatusCodes,
    },
  };
}

function createMeta(): MetaApi {
  const baseUrl = getBaseUrl();
  const headers = getHeadersConfig();
  const client = new NocoClient({ baseUrl, headers, ...clientOptionsFromSettings() });
  return new MetaApi(client);
}

const program = new Command();
program
  .name("nocodb")
  .description("NocoDB CLI (v2)")
  .version("0.1.0")
  .option("--base <baseId>", "Default base id for dynamic API calls")
  .option("--timeout <ms>", "Request timeout in milliseconds")
  .option("--retries <count>", "Number of retries (0 to disable)");

const configCmd = program.command("config").description("Manage CLI configuration");

configCmd
  .command("set")
  .argument("key", "Configuration key")
  .argument("value", "Configuration value")
  .action((key: string, value: string) => {
    if (key === "baseUrl") {
      config.set("baseUrl", value);
      if (process.env.NOCO_QUIET !== "1") {
        console.log("baseUrl set");
      }
      return;
    }
    if (key === "baseId") {
      config.set("baseId", value);
      if (process.env.NOCO_QUIET !== "1") {
        console.log("baseId set");
      }
      return;
    }
    console.error("Unsupported key. Supported keys: baseUrl, baseId");
    process.exitCode = 1;
  });

configCmd
  .command("get")
  .argument("key", "Configuration key")
  .action((key: string) => {
    if (key === "baseUrl") {
      const baseUrl = config.get("baseUrl");
      if (!baseUrl) {
        console.error("baseUrl is not set");
        process.exitCode = 1;
        return;
      }
      if (process.env.NOCO_QUIET !== "1") {
        console.log(baseUrl);
      }
      return;
    }
    if (key === "baseId") {
      const baseId = config.get("baseId");
      if (!baseId) {
        console.error("baseId is not set");
        process.exitCode = 1;
        return;
      }
      if (process.env.NOCO_QUIET !== "1") {
        console.log(baseId);
      }
      return;
    }
    console.error("Unsupported key. Supported keys: baseUrl, baseId");
    process.exitCode = 1;
  });

configCmd
  .command("show")
  .description("Show current configuration")
  .action(() => {
    const baseUrl = config.get("baseUrl") ?? null;
    const baseId = config.get("baseId") ?? null;
    const headers = config.get("headers") ?? {};
    if (process.env.NOCO_QUIET !== "1") {
      console.log(JSON.stringify({ baseUrl, baseId, headers }, null, 2));
    }
  });

const headerCmd = program.command("header").description("Manage default headers");

headerCmd
  .command("set")
  .argument("name", "Header name")
  .argument("value", "Header value")
  .action((name: string, value: string) => {
    setHeader(config, name, value);
    if (process.env.NOCO_QUIET !== "1") {
      console.log(`header '${name}' set`);
    }
  });

headerCmd
  .command("delete")
  .argument("name", "Header name")
  .action((name: string) => {
    deleteHeader(config, name);
    if (process.env.NOCO_QUIET !== "1") {
      console.log(`header '${name}' deleted`);
    }
  });

headerCmd
  .command("list")
  .action(() => {
    if (process.env.NOCO_QUIET !== "1") {
      console.log(JSON.stringify(getHeadersConfig(), null, 2));
    }
  });

const settingsCmd = program.command("settings").description("Manage CLI settings (timeout, retries)");

settingsCmd
  .command("show")
  .description("Show current effective settings")
  .action(() => {
    if (process.env.NOCO_QUIET !== "1") {
      console.log(JSON.stringify(settings, null, 2));
    }
  });

settingsCmd
  .command("path")
  .description("Print the settings file path")
  .action(() => {
    if (process.env.NOCO_QUIET !== "1") {
      console.log(getSettingsPath());
    }
  });

settingsCmd
  .command("set")
  .argument("key", "Setting key (timeoutMs, retryCount, retryDelay, retryStatusCodes)")
  .argument("value", "Setting value")
  .action((key: string, value: string) => {
    const validKeys: (keyof Settings)[] = ["timeoutMs", "retryCount", "retryDelay", "retryStatusCodes"];
    if (!validKeys.includes(key as keyof Settings)) {
      console.error(`Unsupported key '${key}'. Supported keys: ${validKeys.join(", ")}`);
      process.exitCode = 1;
      return;
    }
    const current = loadSettings();
    if (key === "retryStatusCodes") {
      try {
        current.retryStatusCodes = JSON.parse(value);
      } catch {
        console.error("Value for retryStatusCodes must be a JSON array, e.g. [429,500,502]");
        process.exitCode = 1;
        return;
      }
    } else {
      (current as any)[key] = Number(value);
    }
    saveSettings(current);
    if (process.env.NOCO_QUIET !== "1") {
      console.log(`${key} set to ${JSON.stringify((current as any)[key])}`);
    }
  });

settingsCmd
  .command("reset")
  .description("Reset settings to defaults")
  .action(() => {
    resetSettings();
    if (process.env.NOCO_QUIET !== "1") {
      console.log("settings reset to defaults");
    }
  });

registerWorkspaceAliasCommands({
  program,
  getActiveWorkspaceName,
  getMultiConfig: () => multiConfig,
  setMultiConfig: (next) => {
    multiConfig = next;
  },
  setActiveWorkspaceName: (name) => {
    config.set("activeWorkspace", name);
  },
});

registerRequestCommand({
  program,
  collect,
  readJsonFile,
  getBaseUrl,
  getHeadersConfig,
  clientOptionsFromSettings,
  printResult,
  handleError,
});

registerMetaCrudCommands({
  program,
  createMeta,
  readJsonInput,
  printResult,
  handleError,
  getActiveWorkspaceName,
  getMultiConfig: () => multiConfig,
});

registerMetaCommands({
  program,
  loadSwagger,
  writeJsonFile,
  getCacheDir,
  printResult,
  handleError,
});

registerRowsCommands({
  program,
  collect,
  parseQuery,
  readJsonInput,
  printResult,
  handleError,
  loadSwagger,
  ensureSwaggerCache,
  clientOptionsFromSettings,
  getBaseId,
  getBaseIdFromArgv,
  getBaseUrl,
  getHeadersConfig,
  getActiveWorkspaceName,
  getMultiConfig: () => multiConfig,
});

registerLinksCommands({
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
  getMultiConfig: () => multiConfig,
});

registerStorageCommands({
  program,
  createMeta,
  printResult,
  handleError,
});

const apiCmd = createApiCommand(program);

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

function parseQuery(items: string[]): Record<string, string> {
  const query: Record<string, string> = {};
  for (const item of items) {
    const [key, value] = parseKeyValue(item);
    query[key] = value;
  }
  return query;
}


async function bootstrap(): Promise<void> {
  try {
    if (process.argv.includes("api")) {
      const baseId = getBaseId(getBaseIdFromArgv());
      await registerDynamicApiCommands(apiCmd, baseId, {
        program,
        loadSwagger,
        getBaseUrl,
        getHeadersConfig,
        clientOptionsFromSettings,
        printResult,
        handleError,
        readJsonFile,
      });
    }
    await program.parseAsync(process.argv);
  } catch (err) {
    handleError(err);
  }
}

function shouldAutoRun(): boolean {
  if (!process.argv[1]) {
    return false;
  }
  try {
    const entryPath = path.resolve(process.argv[1]);
    const currentPath = path.resolve(fileURLToPath(import.meta.url));
    return entryPath === currentPath;
  } catch {
    return true;
  }
}

if (shouldAutoRun()) {
  bootstrap();
}

export { bootstrap };

function getBaseIdFromArgv(): string | undefined {
  return parseBaseIdArgv(process.argv);
}

async function loadSwagger(baseId: string, useCache: boolean): Promise<SwaggerDoc> {
  const cacheFile = path.join(getCacheDir(), `swagger-${baseId}.json`);
  if (useCache) {
    try {
      const cached = (await readJsonFile(cacheFile)) as SwaggerDoc;
      if (isSwaggerDoc(cached)) {
        return cached;
      }
    } catch {
      // ignore
    }
  }
  const meta = createMeta();
  const doc = (await meta.getBaseSwagger(baseId)) as SwaggerDoc;
  await writeJsonFile(cacheFile, doc, true);
  return doc;
}

async function ensureSwaggerCache(baseId: string): Promise<void> {
  const cacheFile = path.join(getCacheDir(), `swagger-${baseId}.json`);
  if (!fs.existsSync(cacheFile)) {
    await loadSwagger(baseId, true);
  }
}
