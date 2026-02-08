/**
 * Cloud workspace command handlers for NocoDB Cloud workspace management.
 * 
 * These commands are cloud-only (☁) and will fail on self-hosted NocoDB instances.
 * They attach as a `cloud` subcommand group under the existing `workspace` command.
 * 
 * @module commands/cloud-workspace
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
 * Registers cloud workspace commands under the existing `workspace` command.
 * Must be called after registerWorkspaceAliasCommands so the `workspace` command exists.
 * 
 * @param program - Commander program instance
 * @param container - Dependency injection container
 */
export function registerCloudWorkspaceCommands(program: Command, container: Container): void {
  // Find the existing workspace command
  const workspaceCmd = program.commands.find((cmd) => cmd.name() === "workspace");
  if (!workspaceCmd) {
    return; // workspace command not registered yet
  }

  const cloudCmd = workspaceCmd.command("cloud").description("Manage NocoDB Cloud workspaces (☁ cloud-only)")
    .addHelpText("after", `
Examples:
  $ nocodb workspace cloud list
  $ nocodb workspace cloud get ws_abc123
  $ nocodb workspace cloud create -d '{"title":"My Workspace"}'
  $ nocodb workspace cloud update ws_abc123 -d '{"title":"Renamed"}'
  $ nocodb workspace cloud delete ws_abc123
  $ nocodb workspace cloud users ws_abc123
  $ nocodb workspace cloud invite ws_abc123 -d '{"email":"user@example.com","roles":"viewer"}'
  $ nocodb workspace cloud user-get ws_abc123 u_abc123
  $ nocodb workspace cloud user-update ws_abc123 u_abc123 -d '{"roles":"editor"}'
  $ nocodb workspace cloud user-remove ws_abc123 u_abc123
  $ nocodb workspace cloud bases ws_abc123
  $ nocodb workspace cloud create-base ws_abc123 -d '{"title":"New Base"}'
`);

  // List cloud workspaces
  addOutputOptions(
    cloudCmd
      .command("list")
      .description("List all NocoDB Cloud workspaces")
  ).action(async (options: OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const result = await metaService.listWorkspaces();
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });

  // Get cloud workspace
  addOutputOptions(
    cloudCmd
      .command("get")
      .argument("workspaceId", "Cloud workspace ID")
      .description("Get a NocoDB Cloud workspace by ID")
  ).action(async (workspaceId: string, options: OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const result = await metaService.getWorkspace(workspaceId);
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });

  // Create cloud workspace
  addOutputOptions(
    addJsonInputOptions(
      cloudCmd
        .command("create")
        .description("Create a NocoDB Cloud workspace"),
      "Workspace JSON body (e.g. {\"title\":\"My Workspace\"})"
    )
  ).action(async (options: JsonInputOptions & OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const body = await parseJsonInput(options.data, options.dataFile);
      const result = await metaService.createWorkspace(body as any);
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });

  // Update cloud workspace
  addOutputOptions(
    addJsonInputOptions(
      cloudCmd
        .command("update")
        .argument("workspaceId", "Cloud workspace ID")
        .description("Update a NocoDB Cloud workspace"),
      "Workspace JSON body (e.g. {\"title\":\"New Name\"})"
    )
  ).action(async (workspaceId: string, options: JsonInputOptions & OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const body = await parseJsonInput(options.data, options.dataFile);
      await metaService.updateWorkspace(workspaceId, body as any);
      printResult({ msg: "Workspace updated" }, options);
    } catch (err) {
      handleError(err);
    }
  });

  // Delete cloud workspace
  addOutputOptions(
    cloudCmd
      .command("delete")
      .argument("workspaceId", "Cloud workspace ID")
      .description("Delete a NocoDB Cloud workspace")
  ).action(async (workspaceId: string, options: OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      await metaService.deleteWorkspace(workspaceId);
      printResult({ msg: "Workspace deleted" }, options);
    } catch (err) {
      handleError(err);
    }
  });

  // List workspace users
  addOutputOptions(
    cloudCmd
      .command("users")
      .argument("workspaceId", "Cloud workspace ID")
      .description("List users in a NocoDB Cloud workspace")
  ).action(async (workspaceId: string, options: OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const result = await metaService.listWorkspaceUsers(workspaceId);
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });

  // Get workspace user
  addOutputOptions(
    cloudCmd
      .command("user-get")
      .argument("workspaceId", "Cloud workspace ID")
      .argument("userId", "User ID")
      .description("Get a user in a NocoDB Cloud workspace")
  ).action(async (workspaceId: string, userId: string, options: OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const result = await metaService.getWorkspaceUser(workspaceId, userId);
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });

  // Invite workspace user
  addOutputOptions(
    addJsonInputOptions(
      cloudCmd
        .command("invite")
        .argument("workspaceId", "Cloud workspace ID")
        .description("Invite a user to a NocoDB Cloud workspace"),
      "Invite JSON body (e.g. {\"email\":\"user@example.com\",\"roles\":\"viewer\"})"
    )
  ).action(async (workspaceId: string, options: JsonInputOptions & OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const body = await parseJsonInput(options.data, options.dataFile);
      const result = await metaService.inviteWorkspaceUser(workspaceId, body as any);
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });

  // Update workspace user
  addOutputOptions(
    addJsonInputOptions(
      cloudCmd
        .command("user-update")
        .argument("workspaceId", "Cloud workspace ID")
        .argument("userId", "User ID")
        .description("Update a user's role in a NocoDB Cloud workspace"),
      "User JSON body (e.g. {\"roles\":\"editor\"})"
    )
  ).action(async (workspaceId: string, userId: string, options: JsonInputOptions & OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const body = await parseJsonInput(options.data, options.dataFile);
      await metaService.updateWorkspaceUser(workspaceId, userId, body as any);
      printResult({ msg: "Workspace user updated" }, options);
    } catch (err) {
      handleError(err);
    }
  });

  // Remove workspace user
  addOutputOptions(
    cloudCmd
      .command("user-remove")
      .argument("workspaceId", "Cloud workspace ID")
      .argument("userId", "User ID")
      .description("Remove a user from a NocoDB Cloud workspace")
  ).action(async (workspaceId: string, userId: string, options: OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      await metaService.deleteWorkspaceUser(workspaceId, userId);
      printResult({ msg: "Workspace user removed" }, options);
    } catch (err) {
      handleError(err);
    }
  });

  // List workspace bases
  addOutputOptions(
    cloudCmd
      .command("bases")
      .argument("workspaceId", "Cloud workspace ID")
      .description("List bases in a NocoDB Cloud workspace")
  ).action(async (workspaceId: string, options: OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const result = await metaService.listWorkspaceBases(workspaceId);
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });

  // Create base in workspace
  addOutputOptions(
    addJsonInputOptions(
      cloudCmd
        .command("create-base")
        .argument("workspaceId", "Cloud workspace ID")
        .description("Create a base in a NocoDB Cloud workspace"),
      "Base JSON body (e.g. {\"title\":\"My Base\"})"
    )
  ).action(async (workspaceId: string, options: JsonInputOptions & OutputOptions) => {
    try {
      const { client } = resolveServices(container);
      const metaService = container.get<Function>("metaService")(client) as MetaService;

      const body = await parseJsonInput(options.data, options.dataFile);
      const result = await metaService.createWorkspaceBase(workspaceId, body as any);
      printResult(result, options);
    } catch (err) {
      handleError(err);
    }
  });
}
