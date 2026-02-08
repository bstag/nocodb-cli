/**
 * Hooks command handlers for webhook management.
 * 
 * @module commands/hooks
 */

import { Command } from "commander";
import type { Container } from "../container.js";
import type { MetaService } from "../services/meta-service.js";
import { parseJsonInput } from "../utils/parsing.js";
import { addOutputOptions, addJsonInputOptions } from "./helpers.js";
import {
  printResult, handleError, resolveServices,
  type OutputOptions, type JsonInputOptions,
} from "../utils/command-utils.js";

/**
 * Registers hooks commands with the CLI program
 * @param program - Commander program instance
 * @param container - Dependency injection container
 */
export function registerHooksCommands(program: Command, container: Container): void {
  const hooksCmd = program.command("hooks").description("Manage table webhooks")
    .addHelpText("after", `
Examples:
  $ nocodb hooks list tbl_xyz
  $ nocodb hooks get hk_abc123
  $ nocodb hooks create tbl_xyz -d '{"title":"On Insert","event":"after","operation":"insert","notification":{"type":"URL","payload":{"url":"https://example.com/hook"}}}'
  $ nocodb hooks update hk_abc123 -d '{"active":false}'
  $ nocodb hooks delete hk_abc123
  $ nocodb hooks test hk_abc123
`);

  // List hooks command
  addOutputOptions(
    hooksCmd
      .command("list")
      .argument("tableId", "Table id or alias")
  ).action(async (tableId: string, options: OutputOptions) => {
    try {
      const { client, resolvedId } = resolveServices(container, tableId);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const result = await metaService.listHooks(resolvedId!);
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });

  // Get hook command
  addOutputOptions(
    hooksCmd
      .command("get")
      .argument("hookId", "Hook id")
  ).action(async (hookId: string, options: OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const result = await metaService.getHook(hookId);
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });

  // Create hook command
  addOutputOptions(
    addJsonInputOptions(
      hooksCmd
        .command("create")
        .argument("tableId", "Table id or alias")
    )
  ).action(async (tableId: string, options: JsonInputOptions & OutputOptions) => {
    try {
      const { client, resolvedId } = resolveServices(container, tableId);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const body = await parseJsonInput(options.data, options.dataFile);
      const result = await metaService.createHook(resolvedId!, body as any);
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });

  // Update hook command
  addOutputOptions(
    addJsonInputOptions(
      hooksCmd
        .command("update")
        .argument("hookId", "Hook id")
    )
  ).action(async (hookId: string, options: JsonInputOptions & OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const body = await parseJsonInput(options.data, options.dataFile);
      const result = await metaService.updateHook(hookId, body as any);
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });

  // Delete hook command
  addOutputOptions(
    hooksCmd
      .command("delete")
      .argument("hookId", "Hook id")
  ).action(async (hookId: string, options: OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const result = await metaService.deleteHook(hookId);
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });

  // Test hook command
  addOutputOptions(
    addJsonInputOptions(
      hooksCmd
        .command("test")
        .argument("hookId", "Hook id"),
      "Optional test payload JSON"
    )
  ).action(async (hookId: string, options: JsonInputOptions & OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      let body: Record<string, unknown> | undefined;
      if (options.data || options.dataFile) {
        body = await parseJsonInput(options.data, options.dataFile) as Record<string, unknown>;
      }
      const result = await metaService.testHook(hookId, body);
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });
}
