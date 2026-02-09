import type { Command } from "commander";
import type { MetaApi } from "@stagware/nocodb-sdk";
import type { MultiConfig } from "../../aliases.js";

export type PrintOptions = { pretty?: boolean; format?: string };

export interface MetaCrudDeps {
  program: Command;
  createMeta: () => MetaApi;
  readJsonInput: (data?: string, dataFile?: string) => Promise<unknown>;
  printResult: (result: unknown, options?: PrintOptions | boolean) => void;
  handleError: (err: unknown) => void;
  getActiveWorkspaceName: () => string | undefined;
  getMultiConfig: () => MultiConfig;
}
