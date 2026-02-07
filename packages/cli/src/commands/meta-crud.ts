import { registerBasesCommands } from "./meta-crud/bases.js";
import { registerTablesCommands } from "./meta-crud/tables.js";
import { registerViewsCommands } from "./meta-crud/views.js";
import { registerFiltersCommands } from "./meta-crud/filters.js";
import { registerSortsCommands } from "./meta-crud/sorts.js";
import { registerColumnsCommands } from "./meta-crud/columns.js";
import type { MetaCrudDeps } from "./meta-crud/types.js";

export type { MetaCrudDeps as RegisterMetaCrudCommandsDeps } from "./meta-crud/types.js";

export function registerMetaCrudCommands(deps: MetaCrudDeps): void {
  registerBasesCommands(deps);
  registerTablesCommands(deps);
  registerViewsCommands(deps);
  registerFiltersCommands(deps);
  registerSortsCommands(deps);
  registerColumnsCommands(deps);
}
