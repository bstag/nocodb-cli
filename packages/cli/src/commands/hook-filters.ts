/**
 * Hook filters command handlers for webhook filter management.
 * 
 * @module commands/hook-filters
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
 * Registers hook filter commands with the CLI program
 * @param program - Commander program instance
 * @param container - Dependency injection container
 */
export function registerHookFiltersCommands(program: Command, container: Container): void {
  // Find the existing hooks command and add subcommands
  const hooksCmd = program.commands.find(c => c.name() === "hooks");
  if (!hooksCmd) return;

  const filtersCmd = hooksCmd.command("filters").description("Manage hook filters")
    .addHelpText("after", `
Examples:
  $ nocodb hooks filters list hk_abc123
  $ nocodb hooks filters create hk_abc123 -d '{"fk_column_id":"col_xyz","comparison_op":"eq","value":"active"}'
`);

  // List hook filters
  addOutputOptions(
    filtersCmd
      .command("list")
      .argument("hookId", "Hook id")
  ).action(async (hookId: string, options: OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const result = await metaService.listHookFilters(hookId);
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });

  // Create hook filter
  addOutputOptions(
    addJsonInputOptions(
      filtersCmd
        .command("create")
        .argument("hookId", "Hook id")
    )
  ).action(async (hookId: string, options: JsonInputOptions & OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const body = await parseJsonInput(options.data, options.dataFile);
      const result = await metaService.createHookFilter(hookId, body as any);
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });
}
