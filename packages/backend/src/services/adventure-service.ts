import type { AdventureListItem, AdventureDetail, HistoryResponse } from "@corvran/shared";
import type { FileOps } from "../types.js";

export interface AdventureService {
  listAdventures(): Promise<AdventureListItem[]>;
  getAdventure(id: string): Promise<AdventureDetail | null>;
  getHistory(id: string): Promise<HistoryResponse>;
  getAdventurePath(id: string): string;
  isValidAdventureId(id: string): boolean;
}

export function createAdventureService(deps: {
  fileOps: FileOps;
  adventuresPath: string;
}): AdventureService {
  const { fileOps, adventuresPath } = deps;

  function isValidAdventureId(id: string): boolean {
    if (id.includes("/") || id.includes("..")) return false;
    const resolved = fileOps.resolvePath(adventuresPath, id);
    const normalizedRoot = fileOps.resolvePath(adventuresPath);
    if (!resolved.startsWith(normalizedRoot + "/") && resolved !== normalizedRoot) {
      return false;
    }
    return true;
  }

  async function listAdventures(): Promise<AdventureListItem[]> {
    const entries = await fileOps.readDir(adventuresPath);
    const adventures: AdventureListItem[] = [];

    for (const entry of entries) {
      const adventurePath = fileOps.resolvePath(adventuresPath, entry);
      const hasCharacter = await fileOps.fileExists(fileOps.resolvePath(adventurePath, "character.md"));
      const hasWorld = await fileOps.fileExists(fileOps.resolvePath(adventurePath, "world.md"));
      const hasHistory = await fileOps.fileExists(fileOps.resolvePath(adventurePath, "history.md"));

      adventures.push({
        id: entry,
        name: entry,
        hasCharacter,
        hasWorld,
        hasHistory,
      });
    }

    return adventures;
  }

  async function getAdventure(id: string): Promise<AdventureDetail | null> {
    if (!isValidAdventureId(id)) return null;

    const adventurePath = fileOps.resolvePath(adventuresPath, id);
    const dirExists = await fileOps.fileExists(adventurePath);
    if (!dirExists) return null;

    const characterPath = fileOps.resolvePath(adventurePath, "character.md");
    const worldPath = fileOps.resolvePath(adventurePath, "world.md");
    const historyPath = fileOps.resolvePath(adventurePath, "history.md");

    let character: string | null = null;
    let world: string | null = null;

    if (await fileOps.fileExists(characterPath)) {
      character = await fileOps.readFile(characterPath);
    }
    if (await fileOps.fileExists(worldPath)) {
      world = await fileOps.readFile(worldPath);
    }
    const hasHistory = await fileOps.fileExists(historyPath);

    return { id, name: id, character, world, hasHistory };
  }

  async function getHistory(id: string): Promise<HistoryResponse> {
    if (!isValidAdventureId(id)) return { exists: false, history: null };

    const historyPath = fileOps.resolvePath(adventuresPath, id, "history.md");
    if (await fileOps.fileExists(historyPath)) {
      const history = await fileOps.readFile(historyPath);
      return { exists: true, history };
    }
    return { exists: false, history: null };
  }

  function getAdventurePath(id: string): string {
    return fileOps.resolvePath(adventuresPath, id);
  }

  return { listAdventures, getAdventure, getHistory, getAdventurePath, isValidAdventureId };
}
