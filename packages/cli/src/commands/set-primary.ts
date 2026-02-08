/**
 * Set primary column command handler.
 * 
 * @module commands/set-primary
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
 * Registers set-primary command with the CLI program
 * @param program - Commander program instance
 * @param container - Dependency injection container
 */
export function registerSetPrimaryCommands(program: Command, container: Container): void {
  // Find the existing columns command and add a subcommand
  const columnsCmd = program.commands.find(c => c.name() === "columns");
  if (!columnsCmd) return;

  addOutputOptions(
    columnsCmd
      .command("set-primary")
      .argument("columnId", "Column id")
      .description("Set a column as the primary/display column")
  ).addHelpText("after", `
Examples:
  $ nocodb columns set-primary col_abc123
`).action(async (columnId: string, options: OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const result = await metaService.setColumnPrimary(columnId);
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });
}
