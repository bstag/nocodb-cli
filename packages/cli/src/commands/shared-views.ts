/**
 * Shared Views command handlers for managing public view links.
 * 
 * @module commands/shared-views
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
 * Registers shared-views commands with the CLI program
 * @param program - Commander program instance
 * @param container - Dependency injection container
 */
export function registerSharedViewsCommands(program: Command, container: Container): void {
  const sharedViewsCmd = program.command("shared-views").description("Manage shared views (public links)")
    .addHelpText("after", `
Examples:
  $ nocodb shared-views list tbl_xyz
  $ nocodb shared-views create vw_abc123
  $ nocodb shared-views create vw_abc123 -d '{"password":"secret"}'
  $ nocodb shared-views update vw_abc123 -d '{"password":"new-secret"}'
  $ nocodb shared-views delete vw_abc123
`);

  // List shared views command
  addOutputOptions(
    sharedViewsCmd
      .command("list")
      .argument("tableId", "Table id or alias")
  ).action(async (tableId: string, options: OutputOptions) => {
    try {
      const { client, resolvedId } = resolveServices(container, tableId);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const result = await metaService.listSharedViews(resolvedId!);
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });

  // Create shared view command
  addOutputOptions(
    addJsonInputOptions(
      sharedViewsCmd
        .command("create")
        .argument("viewId", "View id"),
      "Optional shared view JSON body (e.g. {\"password\":\"secret\"})"
    )
  ).action(async (viewId: string, options: JsonInputOptions & OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      let body: any;
      if (options.data || options.dataFile) {
        body = await parseJsonInput(options.data, options.dataFile);
      }
      const result = await metaService.createSharedView(viewId, body);
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });

  // Update shared view command
  addOutputOptions(
    addJsonInputOptions(
      sharedViewsCmd
        .command("update")
        .argument("viewId", "View id"),
      "Shared view JSON body (e.g. {\"password\":\"new-secret\"})"
    )
  ).action(async (viewId: string, options: JsonInputOptions & OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const body = await parseJsonInput(options.data, options.dataFile);
      const result = await metaService.updateSharedView(viewId, body as any);
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });

  // Delete shared view command
  addOutputOptions(
    sharedViewsCmd
      .command("delete")
      .argument("viewId", "View id")
  ).action(async (viewId: string, options: OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const result = await metaService.deleteSharedView(viewId);
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });
}
