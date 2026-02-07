import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { listEndpoints, type SwaggerDoc } from "../lib.js";
import { addOutputOptions, withErrorHandler } from "./helpers.js";

type PrintOptions = { pretty?: boolean; format?: string };

export interface RegisterMetaCommandsDeps {
  program: Command;
  loadSwagger: (baseId: string, useCache: boolean) => Promise<SwaggerDoc>;
  writeJsonFile: (filePath: string, data: unknown, pretty?: boolean) => Promise<void>;
  getCacheDir: () => string;
  printResult: (result: unknown, options?: PrintOptions | boolean) => void;
  handleError: (err: unknown) => void;
}

export function registerMetaCommands({
  program,
  loadSwagger,
  writeJsonFile,
  getCacheDir,
  printResult,
  handleError,
}: RegisterMetaCommandsDeps): void {
  const metaCmd = program.command("meta").description("Meta utilities");

  addOutputOptions(
    metaCmd
      .command("swagger")
      .argument("baseId", "Base id")
      .option("--out <path>", "Write swagger JSON to a file")
      .option("--no-cache", "Do not use cached swagger"),
  ).action(withErrorHandler(handleError, async (baseId: string, options: { pretty?: boolean; format?: string; out?: string; cache?: boolean }) => {
    const doc = await loadSwagger(baseId, options.cache !== false);

    if (options.out) {
      await writeJsonFile(options.out, doc, options.pretty);
      console.log(options.out);
      return;
    }

    printResult(doc, options);
  }));

  addOutputOptions(
    metaCmd
      .command("endpoints")
      .argument("baseId", "Base id")
      .option("--tag <name>", "Filter by tag")
      .option("--no-cache", "Do not use cached swagger"),
  ).action(withErrorHandler(handleError, async (baseId: string, options: { tag?: string; pretty?: boolean; format?: string; cache?: boolean }) => {
    const doc = await loadSwagger(baseId, options.cache !== false);
    const endpoints = listEndpoints(doc, options.tag);
    if (options.format === "csv" || options.format === "table") {
      printResult(endpoints.map((e) => ({ endpoint: e })), options);
    } else if (options.pretty) {
      console.log(JSON.stringify(endpoints, null, 2));
    } else {
      for (const line of endpoints) {
        console.log(line);
      }
    }
  }));

  metaCmd
    .command("cache")
    .description("Manage cached swagger docs")
    .command("clear")
    .argument("[baseId]", "Base id (omit to clear all)")
    .option("--all", "Clear all cached swagger docs")
    .action(withErrorHandler(handleError, async (baseId: string | undefined, options: { all?: boolean }) => {
      const cacheDir = getCacheDir();
      if (options.all || !baseId) {
        if (fs.existsSync(cacheDir)) {
          const entries = await fs.promises.readdir(cacheDir);
          for (const entry of entries) {
            if (entry.startsWith("swagger-") && entry.endsWith(".json")) {
              await fs.promises.unlink(path.join(cacheDir, entry));
            }
          }
        }
        if (process.env.NOCO_QUIET !== "1") {
          console.log("swagger cache cleared");
        }
        return;
      }
      const cacheFile = path.join(cacheDir, `swagger-${baseId}.json`);
      if (fs.existsSync(cacheFile)) {
        await fs.promises.unlink(cacheFile);
      }
      if (process.env.NOCO_QUIET !== "1") {
        console.log(`swagger cache cleared for ${baseId}`);
      }
    }));
}
