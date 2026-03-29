import type { FileOps } from "../types.js";

export interface HistoryService {
  appendPlayerMessage(adventurePath: string, message: string): Promise<void>;
  appendGMResponse(adventurePath: string, response: string): Promise<void>;
  readHistory(adventurePath: string): Promise<string | null>;
}

export function createHistoryService(deps: { fileOps: FileOps }): HistoryService {
  const { fileOps } = deps;

  function historyPath(adventurePath: string): string {
    return fileOps.resolvePath(adventurePath, "history.md");
  }

  async function appendPlayerMessage(adventurePath: string, message: string): Promise<void> {
    const path = historyPath(adventurePath);
    await fileOps.appendFile(path, `**Player:** ${message}\n\n`);
  }

  async function appendGMResponse(adventurePath: string, response: string): Promise<void> {
    const path = historyPath(adventurePath);
    await fileOps.appendFile(path, `**GM:** ${response}\n\n`);
  }

  async function readHistory(adventurePath: string): Promise<string | null> {
    const path = historyPath(adventurePath);
    if (await fileOps.fileExists(path)) {
      return fileOps.readFile(path);
    }
    return null;
  }

  return { appendPlayerMessage, appendGMResponse, readHistory };
}
