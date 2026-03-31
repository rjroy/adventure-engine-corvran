import type { AdventureListItem, AdventureDetail, HistoryResponse, MoodState } from "@corvran/shared";
import type { FileOps } from "../types";
import { parseAdventureConfig, type AdventureConfig } from "./adventure-config";
import { slugify } from "./slugify";

export class DuplicateAdventureError extends Error {
  constructor() {
    super("An adventure with this name already exists.");
    this.name = "DuplicateAdventureError";
  }
}

export interface AdventureService {
  listAdventures(): Promise<AdventureListItem[]>;
  getAdventure(id: string): Promise<AdventureDetail | null>;
  getHistory(id: string): Promise<HistoryResponse>;
  getAdventurePath(id: string): string;
  isValidAdventureId(id: string): boolean;
  createAdventure(params: {
    name: string;
    system: string | null;
    concept: string | null;
  }): Promise<AdventureListItem>;
  setMood(id: string, mood: MoodState): Promise<void>;
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

  async function extractCharacterName(characterPath: string): Promise<string | null> {
    try {
      const content = await fileOps.readFile(characterPath);
      const lines = content.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const match = trimmed.match(/^# (.+)$/);
        return match ? match[1] : null;
      }
    } catch {
      // File doesn't exist or can't be read
    }
    return null;
  }

  async function getLastPlayed(historyPath: string): Promise<string | null> {
    const result = await fileOps.stat(historyPath);
    return result ? result.mtime.toISOString() : null;
  }

  async function readAdventureConfig(adventurePath: string, label: string): Promise<AdventureConfig | null> {
    const configPath = fileOps.resolvePath(adventurePath, "adventure.md");
    if (!(await fileOps.fileExists(configPath))) return null;
    const content = await fileOps.readFile(configPath);
    const config = parseAdventureConfig(content);
    if (config.warning) {
      console.warn(`[adventure-service] ${label}: ${config.warning}`);
    }
    return config;
  }

  async function listAdventures(): Promise<AdventureListItem[]> {
    const entries = await fileOps.readDir(adventuresPath);
    const adventures: AdventureListItem[] = [];

    for (const entry of entries) {
      if (!isValidAdventureId(entry)) continue;

      const adventurePath = fileOps.resolvePath(adventuresPath, entry);
      const characterPath = fileOps.resolvePath(adventurePath, "character.md");
      const historyPath = fileOps.resolvePath(adventurePath, "history.md");

      const characterExists = await fileOps.fileExists(characterPath);
      const hasHistory = await fileOps.fileExists(historyPath);

      const config = await readAdventureConfig(adventurePath, entry);

      const characterName = characterExists ? await extractCharacterName(characterPath) : null;
      const lastPlayed = hasHistory ? await getLastPlayed(historyPath) : null;

      adventures.push({
        id: entry,
        name: config?.name || entry,
        hasHistory,
        system: config?.system ?? null,
        concept: config?.concept ?? null,
        characterName,
        lastPlayed,
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

    const config = await readAdventureConfig(adventurePath, id);

    return {
      id,
      name: config?.name || id,
      character, world, hasHistory,
      system: config?.system ?? null,
      concept: config?.concept ?? null,
      currentMood: config?.mood
        ? { hue: config.mood.hue, description: config.mood.description, imagePath: config.mood.imagePath ?? undefined }
        : null,
    };
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

  async function createAdventure(params: {
    name: string;
    system: string | null;
    concept: string | null;
  }): Promise<AdventureListItem> {
    const slug = slugify(params.name);
    const adventurePath = fileOps.resolvePath(adventuresPath, slug);

    if (await fileOps.fileExists(adventurePath)) {
      throw new DuplicateAdventureError();
    }

    // Build adventure.md content
    let content = "---\n";
    content += `name: ${params.name}\n`;
    if (params.system !== null) {
      content += `system: ${params.system}\n`;
    }
    content += "---\n";
    if (params.concept !== null) {
      content += `\n${params.concept}\n`;
    }

    const configPath = fileOps.resolvePath(adventurePath, "adventure.md");
    await fileOps.writeFile(configPath, content);

    return {
      id: slug,
      name: params.name,
      hasHistory: false,
      system: params.system,
      concept: params.concept,
      characterName: null,
      lastPlayed: null,
    };
  }

  async function setMood(id: string, mood: MoodState): Promise<void> {
    const adventurePath = fileOps.resolvePath(adventuresPath, id);
    const configPath = fileOps.resolvePath(adventurePath, "adventure.md");

    let content: string;
    try {
      content = await fileOps.readFile(configPath);
    } catch {
      // No adventure.md yet; create one with frontmatter
      content = "---\n---\n";
    }

    // Locate frontmatter block
    if (!content.startsWith("---")) {
      // Wrap existing content as body under new frontmatter
      content = "---\n---\n" + content;
    }

    const afterOpening = content.indexOf("\n");
    const rest = content.slice(afterOpening + 1);
    const closingIndex = rest.indexOf("\n---");
    if (closingIndex === -1) {
      // Malformed frontmatter (opening --- but no closing ---).
      // Strip the opening --- line and wrap in a clean frontmatter block with
      // empty frontmatter section so re-parse can find the \n--- closing marker.
      const bodyAfterBroken = content.slice(afterOpening + 1);
      content = "---\n\n---\n" + bodyAfterBroken;
    }

    // Re-parse after possible fixup
    const openEnd = content.indexOf("\n");
    const remainder = content.slice(openEnd + 1);
    const closeIdx = remainder.indexOf("\n---");
    if (closeIdx === -1) return; // should not happen after fixup

    let frontmatter = remainder.slice(0, closeIdx);
    const afterFrontmatter = remainder.slice(closeIdx); // includes \n---

    // Update or insert mood_hue
    if (/^mood_hue:/m.test(frontmatter)) {
      frontmatter = frontmatter.replace(/^mood_hue:.*$/m, `mood_hue: ${mood.hue}`);
    } else {
      frontmatter += `\nmood_hue: ${mood.hue}`;
    }

    // Update or insert mood_description (escape inner double quotes for YAML safety)
    const escapedDescription = mood.description.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    if (/^mood_description:/m.test(frontmatter)) {
      frontmatter = frontmatter.replace(/^mood_description:.*$/m, `mood_description: "${escapedDescription}"`);
    } else {
      frontmatter += `\nmood_description: "${escapedDescription}"`;
    }

    // Update, insert, or remove mood_image
    if (mood.imagePath) {
      if (/^mood_image:/m.test(frontmatter)) {
        frontmatter = frontmatter.replace(/^mood_image:.*$/m, `mood_image: ${mood.imagePath}`);
      } else {
        frontmatter += `\nmood_image: ${mood.imagePath}`;
      }
    } else {
      // Remove mood_image line if present
      frontmatter = frontmatter.replace(/^mood_image:.*\n?/m, "");
    }

    const newContent = content.slice(0, openEnd + 1) + frontmatter + afterFrontmatter;
    await fileOps.writeFile(configPath, newContent);
  }

  return {
    listAdventures, getAdventure, getHistory, getAdventurePath,
    isValidAdventureId, createAdventure, setMood,
  };
}
