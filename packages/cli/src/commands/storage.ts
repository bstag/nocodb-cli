import { Command } from "commander";
import { MetaApi } from "@nocodb/sdk";
import { addOutputOptions, withErrorHandler } from "./helpers.js";

type PrintOptions = { pretty?: boolean; format?: string };

export interface RegisterStorageCommandsDeps {
  program: Command;
  createMeta: () => MetaApi;
  printResult: (result: unknown, options?: PrintOptions | boolean) => void;
  handleError: (err: unknown) => void;
}

export function registerStorageCommands({
  program,
  createMeta,
  printResult,
  handleError,
}: RegisterStorageCommandsDeps): void {
  const storageCmd = program.command("storage").description("File storage operations");

  addOutputOptions(storageCmd.command("upload").argument("filePath", "Path to the file to upload")).action(
    withErrorHandler(handleError, async (filePath: string, options: { pretty?: boolean; format?: string }) => {
      const meta = createMeta();
      const result = await meta.uploadAttachment(filePath);
      printResult(result, options);
    }),
  );
}
