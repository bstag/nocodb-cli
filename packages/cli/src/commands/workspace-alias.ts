import { Command } from "commander";
import { saveMultiConfig, type MultiConfig } from "../aliases.js";

export interface RegisterWorkspaceAliasCommandsDeps {
  program: Command;
  getActiveWorkspaceName: () => string | undefined;
  getMultiConfig: () => MultiConfig;
  setMultiConfig: (next: MultiConfig) => void;
  setActiveWorkspaceName: (name: string | undefined) => void;
}

export function registerWorkspaceAliasCommands({
  program,
  getActiveWorkspaceName,
  getMultiConfig,
  setMultiConfig,
  setActiveWorkspaceName,
}: RegisterWorkspaceAliasCommandsDeps): void {
  const workspaceCmd = program.command("workspace").description("Manage NocoDB workspaces (URL, Token, BaseID)");

  workspaceCmd
    .command("add")
    .argument("name", "Workspace name (alias)")
    .argument("url", "Base URL")
    .argument("token", "API Token (xc-token)")
    .option("--base <id>", "Default Base ID for this workspace")
    .action((name: string, url: string, token: string, options: { base?: string }) => {
      const current = getMultiConfig();
      const next: MultiConfig = {
        ...current,
        [name]: {
          baseUrl: url,
          headers: { "xc-token": token },
          baseId: options.base,
          aliases: {},
        },
      };
      setMultiConfig(next);
      saveMultiConfig(next);
      console.log(`Workspace '${name}' added.`);
    });

  workspaceCmd
    .command("use")
    .argument("name", "Workspace name")
    .action((name: string) => {
      const current = getMultiConfig();
      if (!current[name]) {
        console.error(`Workspace '${name}' not found.`);
        process.exit(1);
      }
      setActiveWorkspaceName(name);
      console.log(`Switched to workspace '${name}'.`);
    });

  workspaceCmd
    .command("list")
    .action(() => {
      const current = getMultiConfig();
      const active = getActiveWorkspaceName();
      for (const name of Object.keys(current)) {
        console.log(`${name === active ? "* " : "  "}${name} (${current[name].baseUrl})`);
      }
    });

  workspaceCmd
    .command("delete")
    .argument("name", "Workspace name")
    .action((name: string) => {
      const current = getMultiConfig();
      if (!current[name]) {
        console.error(`Workspace '${name}' not found.`);
        process.exit(1);
      }
      const next: MultiConfig = { ...current };
      delete next[name];
      if (getActiveWorkspaceName() === name) {
        setActiveWorkspaceName(undefined);
      }
      setMultiConfig(next);
      saveMultiConfig(next);
      console.log(`Workspace '${name}' deleted.`);
    });

  workspaceCmd
    .command("show")
    .argument("[name]", "Workspace name")
    .action((name?: string) => {
      const current = getMultiConfig();
      const target = name ?? getActiveWorkspaceName();
      if (!target || !current[target]) {
        console.error("Workspace not found.");
        process.exit(1);
      }
      console.log(JSON.stringify(current[target], null, 2));
    });

  const aliasCmd = program.command("alias").description("Manage ID aliases (Namespaced)");

  aliasCmd
    .command("set")
    .argument("name", "Alias name (can be workspace.alias or just alias)")
    .argument("id", "Original ID")
    .action((name: string, id: string) => {
      const current = getMultiConfig();
      let targetWs = getActiveWorkspaceName();
      let aliasName = name;

      const dotIndex = name.indexOf(".");
      if (dotIndex !== -1) {
        const wsPart = name.slice(0, dotIndex);
        const aliasPart = name.slice(dotIndex + 1);

        if (!wsPart || !aliasPart) {
          console.error("Invalid alias format. Use 'workspace.alias' with non-empty workspace and alias names.");
          process.exit(1);
        }

        targetWs = wsPart;
        aliasName = aliasPart;
      }

      if (!targetWs || !current[targetWs]) {
        console.error("Workspace not found. Use: nocodb workspace use <name> or specify workspace.alias");
        process.exit(1);
      }

      if (!aliasName) {
        console.error("Alias name cannot be empty.");
        process.exit(1);
      }

      current[targetWs].aliases[aliasName] = id;
      setMultiConfig(current);
      saveMultiConfig(current);
      console.log(`Alias '${targetWs}.${aliasName}' set to ${id}`);
    });

  aliasCmd
    .command("list")
    .argument("[workspace]", "Workspace name")
    .action((wsName?: string) => {
      const current = getMultiConfig();
      const target = wsName ?? getActiveWorkspaceName();
      if (!target || !current[target]) {
        console.error("Workspace not found. Use: nocodb workspace use <name> or specify a workspace name.");
        process.exit(1);
      }
      console.log(JSON.stringify(current[target].aliases, null, 2));
    });

  aliasCmd
    .command("delete")
    .argument("name", "Alias name (can be workspace.alias or just alias)")
    .action((name: string) => {
      const current = getMultiConfig();
      let targetWs = getActiveWorkspaceName();
      let aliasName = name;

      const dotIndex = name.indexOf(".");
      if (dotIndex !== -1) {
        const wsPart = name.slice(0, dotIndex);
        const aliasPart = name.slice(dotIndex + 1);

        if (!wsPart || !aliasPart) {
          console.error("Invalid alias format. Use 'workspace.alias' with non-empty workspace and alias names.");
          process.exit(1);
        }

        targetWs = wsPart;
        aliasName = aliasPart;
      }

      if (!targetWs || !current[targetWs]) {
        console.error("Workspace not found. Use: nocodb workspace use <name> or specify workspace.alias");
        process.exit(1);
      }

      delete current[targetWs].aliases[aliasName];
      setMultiConfig(current);
      saveMultiConfig(current);
      console.log(`Alias '${targetWs}.${aliasName}' deleted.`);
    });

  aliasCmd
    .command("clear")
    .argument("[workspace]", "Workspace name")
    .action((wsName?: string) => {
      const current = getMultiConfig();
      const target = wsName ?? getActiveWorkspaceName();
      if (!target || !current[target]) {
        console.error("Workspace not found.");
        process.exit(1);
      }
      current[target].aliases = {};
      setMultiConfig(current);
      saveMultiConfig(current);
      console.log(`All aliases cleared for workspace '${target}'.`);
    });
}
