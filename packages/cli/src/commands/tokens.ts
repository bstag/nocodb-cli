/**
 * Tokens command handlers for API token management.
 * 
 * @module commands/tokens
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
 * Registers tokens commands with the CLI program
 * @param program - Commander program instance
 * @param container - Dependency injection container
 */
export function registerTokensCommands(program: Command, container: Container): void {
  const tokensCmd = program.command("tokens").description("Manage API tokens")
    .addHelpText("after", `
Examples:
  $ nocodb tokens list
  $ nocodb tokens create -d '{"description":"CI/CD token"}'
  $ nocodb tokens delete xc-auth-token-string
`);

  // List tokens command
  addOutputOptions(
    tokensCmd.command("list")
  ).action(async (options: OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const result = await metaService.listTokens();
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });

  // Create token command
  addOutputOptions(
    addJsonInputOptions(
      tokensCmd.command("create"),
      "Token JSON body (e.g. {\"description\":\"my token\"})"
    )
  ).action(async (options: JsonInputOptions & OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const body = await parseJsonInput(options.data, options.dataFile);
      const result = await metaService.createToken(body as any);
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });

  // Delete token command
  addOutputOptions(
    tokensCmd
      .command("delete")
      .argument("token", "API token string to delete")
  ).action(async (token: string, options: OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const result = await metaService.deleteToken(token);
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });
}
