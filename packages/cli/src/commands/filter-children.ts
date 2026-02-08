/**
 * Filter children command handler for nested filter groups.
 * 
 * @module commands/filter-children
 */

import { Command } from "commander";
import type { Container } from "../container.js";
import type { MetaService } from "../services/meta-service.js";
import { addOutputOptions } from "./helpers.js";
import {
  printResult, handleError, resolveServices,
  type OutputOptions,
} from "../utils/command-utils.js";

/**
 * Registers filter children commands with the CLI program
 * @param program - Commander program instance
 * @param container - Dependency injection container
 */
export function registerFilterChildrenCommands(program: Command, container: Container): void {
  // Find the existing filters command and add a subcommand
  const filtersCmd = program.commands.find(c => c.name() === "filters");
  if (!filtersCmd) return;

  addOutputOptions(
    filtersCmd
      .command("children")
      .argument("filterGroupId", "Filter group id")
      .description("List child filters of a filter group")
  ).addHelpText("after", `
Examples:
  $ nocodb filters children flt_abc123
`).action(async (filterGroupId: string, options: OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const result = await metaService.listFilterChildren(filterGroupId);
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });
}
