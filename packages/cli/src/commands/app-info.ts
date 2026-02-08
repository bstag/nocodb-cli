/**
 * App info command handler.
 * 
 * @module commands/app-info
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
 * Registers app info command with the CLI program
 * @param program - Commander program instance
 * @param container - Dependency injection container
 */
export function registerAppInfoCommand(program: Command, container: Container): void {
  addOutputOptions(
    program
      .command("info")
      .description("Show NocoDB server info (version, etc.)")
  ).addHelpText("after", `
Examples:
  $ nocodb info
  $ nocodb info --pretty
`).action(async (options: OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const result = await metaService.getAppInfo();
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });
}
