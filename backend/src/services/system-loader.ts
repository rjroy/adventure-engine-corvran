/**
 * System Loader Service
 *
 * Loads and validates RPG system definitions from adventure directories.
 * System definitions can be stored as:
 * - Single file: `System.md` in adventure root
 * - Multiple files: `System/*.md` files (concatenated in alphabetical order)
 *
 * Required section: Dice types declaration
 * Optional sections: Attributes, Skills, Combat, NPC Templates
 *
 * Returns null if no system definition found (valid - adventure without RPG mechanics)
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { SystemDefinition } from "../../../shared/protocol";

export interface SystemLoaderResult {
  success: true;
  definition: SystemDefinition;
}

export interface SystemLoaderError {
  success: false;
  error: string;
}

export type SystemLoaderReturn = SystemLoaderResult | SystemLoaderError | null;

/**
 * Load system definition from adventure directory.
 *
 * @param adventureDir - Absolute path to adventure directory
 * @returns SystemLoaderResult with definition, error object, or null if no system found
 */
export async function loadSystemDefinition(
  adventureDir: string,
): Promise<SystemLoaderReturn> {
  const singleFilePath = path.join(adventureDir, "System.md");
  const systemDirPath = path.join(adventureDir, "System");

  try {
    // Try single file first
    try {
      const stats = await fs.stat(singleFilePath);
      if (stats.isFile()) {
        const content = await fs.readFile(singleFilePath, "utf-8");
        return parseSystemDefinition(content, singleFilePath);
      }
    } catch (err) {
      // File doesn't exist, continue to check directory
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        // Unexpected error reading file
        return {
          success: false,
          error: `Failed to read ${singleFilePath}: ${(err as Error).message}`,
        };
      }
    }

    // Try System/*.md directory
    try {
      const stats = await fs.stat(systemDirPath);
      if (stats.isDirectory()) {
        const files = await fs.readdir(systemDirPath);
        const mdFiles = files
          .filter((f) => f.endsWith(".md"))
          .sort(); // Alphabetical order

        if (mdFiles.length === 0) {
          // Empty System directory - treat as no system
          return null;
        }

        // Concatenate all markdown files
        const contents = await Promise.all(
          mdFiles.map(async (file) => {
            const filePath = path.join(systemDirPath, file);
            return fs.readFile(filePath, "utf-8");
          }),
        );

        const combinedContent = contents.join("\n\n");
        return parseSystemDefinition(
          combinedContent,
          `${systemDirPath}/*.md (${mdFiles.length} files)`,
        );
      }
    } catch (err) {
      // Directory doesn't exist, return null (no system)
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        // Unexpected error reading directory
        return {
          success: false,
          error: `Failed to read ${systemDirPath}: ${(err as Error).message}`,
        };
      }
    }

    // Neither single file nor directory found - valid case
    return null;
  } catch (err) {
    return {
      success: false,
      error: `Unexpected error loading system definition: ${(err as Error).message}`,
    };
  }
}

/**
 * Parse system definition content and extract features.
 *
 * @param content - Raw markdown content
 * @param filePath - File path for error reporting
 * @returns SystemLoaderResult or SystemLoaderError
 */
function parseSystemDefinition(
  content: string,
  filePath: string,
): SystemLoaderResult | SystemLoaderError {
  // Validate required dice section
  const hasDiceSection = /^#{1,6}\s+(dice|die)/im.test(content);
  if (!hasDiceSection) {
    return {
      success: false,
      error: `${filePath}: Missing required "Dice" section. System definitions must declare supported dice types.`,
    };
  }

  // Detect dice types
  const diceTypes = detectDiceTypes(content);
  if (diceTypes.length === 0) {
    return {
      success: false,
      error: `${filePath}: Dice section found but no dice types detected. Expected dice notation like d4, d6, d8, d10, d12, d20, d100, or dF.`,
    };
  }

  // Detect optional sections
  const hasAttributes = /^#{1,6}\s+attributes?/im.test(content);
  const hasSkills = /^#{1,6}\s+skills?/im.test(content);
  const hasCombat = /^#{1,6}\s+combat/im.test(content);
  const hasNPCTemplates =
    /^#{1,6}\s+(npc\s+templates?|monster\s+manual|creatures?|enemies)/im.test(
      content,
    );

  const definition: SystemDefinition = {
    rawContent: content,
    diceTypes,
    hasAttributes,
    hasSkills,
    hasCombat,
    hasNPCTemplates,
    filePath,
  };

  return {
    success: true,
    definition,
  };
}

/**
 * Extract dice types from content.
 * Looks for standard polyhedral dice (d4, d6, d8, d10, d12, d20, d100)
 * and Fudge dice (dF).
 *
 * @param content - Markdown content to scan
 * @returns Array of unique dice types found
 */
function detectDiceTypes(content: string): string[] {
  const dicePattern = /\b(d(?:4|6|8|10|12|20|100)|dF)\b/gi;
  const matches = content.match(dicePattern) || [];

  // Normalize to lowercase and deduplicate
  const uniqueDice = new Set(
    matches.map((d) => (d.toUpperCase() === "DF" ? "dF" : d.toLowerCase())),
  );

  return Array.from(uniqueDice).sort();
}
