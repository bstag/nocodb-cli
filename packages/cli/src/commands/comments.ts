/**
 * Comments command handlers for row comment management.
 * 
 * @module commands/comments
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
 * Registers comments commands with the CLI program
 * @param program - Commander program instance
 * @param container - Dependency injection container
 */
export function registerCommentsCommands(program: Command, container: Container): void {
  const commentsCmd = program.command("comments").description("Manage row comments")
    .addHelpText("after", `
Examples:
  $ nocodb comments list --table-id tbl_xyz --row-id 1
  $ nocodb comments create -d '{"fk_model_id":"tbl_xyz","row_id":"1","comment":"Looks good!"}'
  $ nocodb comments update cmt_abc123 -d '{"comment":"Updated comment"}'
  $ nocodb comments delete cmt_abc123
`);

  // List comments command
  addOutputOptions(
    commentsCmd
      .command("list")
      .requiredOption("--table-id <tableId>", "Table id")
      .requiredOption("--row-id <rowId>", "Row id")
  ).action(async (options: OutputOptions & { tableId: string; rowId: string }) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const result = await metaService.listComments(options.tableId, options.rowId);
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });

  // Create comment command
  addOutputOptions(
    addJsonInputOptions(
      commentsCmd.command("create"),
      "Comment JSON body (e.g. {\"fk_model_id\":\"tbl_xyz\",\"row_id\":\"1\",\"comment\":\"Hello\"})"
    )
  ).action(async (options: JsonInputOptions & OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const body = await parseJsonInput(options.data, options.dataFile);
      const result = await metaService.createComment(body as any);
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });

  // Update comment command
  addOutputOptions(
    addJsonInputOptions(
      commentsCmd
        .command("update")
        .argument("commentId", "Comment id"),
      "Comment JSON body (e.g. {\"comment\":\"Updated text\"})"
    )
  ).action(async (commentId: string, options: JsonInputOptions & OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const body = await parseJsonInput(options.data, options.dataFile);
      const result = await metaService.updateComment(commentId, body as any);
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });

  // Delete comment command
  addOutputOptions(
    commentsCmd
      .command("delete")
      .argument("commentId", "Comment id")
  ).action(async (commentId: string, options: OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const result = await metaService.deleteComment(commentId);
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });
}
