/**
 * Schema command handlers for table introspection.
 * 
 * Provides commands for discovering and displaying table structures.
 * 
 * @module commands/schema
 */

import { Command } from "commander";
import type { Container } from "../container.js";
import type { ConfigManager } from "../config/manager.js";
import type { SchemaService } from "../services/schema-service.js";
import type { NocoClient } from "@nocodb/sdk";
import { addOutputOptions } from "./helpers.js";
import {
  printResult, handleError,
  type OutputOptions,
} from "../utils/command-utils.js";

/**
 * Registers schema commands with the CLI program
 * @param program - Commander program instance
 * @param container - Dependency injection container
 */
export function registerSchemaCommands(program: Command, container: Container): void {
  const schemaCmd = program.command("schema").description("Introspect table structures")
    .addHelpText("after", `
Examples:
  $ nocodb schema introspect tbl_xyz
  $ nocodb schema introspect tbl_xyz --pretty
`);

  // Introspect table command
  addOutputOptions(
    schemaCmd
      .command("introspect")
      .argument("tableId", "Table id or alias")
      .description("Discover table columns and relations")
  ).action(async (tableId: string, options: OutputOptions) => {
    try {
      const configManager = container.get<ConfigManager>("configManager");
      const createClient = container.get<Function>("createClient");
      const schemaServiceFactory = container.get<Function>("schemaService");

      // Resolve alias and get workspace context
      const { id: resolvedTableId, workspace } = configManager.resolveAlias(tableId);
      
      // Get effective config
      const { workspace: effectiveWorkspace, settings } = configManager.getEffectiveConfig({});
      const ws = workspace || effectiveWorkspace;

      // Create client and service
      const client = createClient(ws, settings) as NocoClient;
      const schemaService = schemaServiceFactory(client) as SchemaService;

      // Call service
      const result = await schemaService.introspectTable(resolvedTableId);

      // Format output
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });
}
