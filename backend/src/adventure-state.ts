// Adventure State Management
// Handles loading, saving, and validating adventure state from filesystem

import { mkdir, writeFile, readFile, rename, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { NarrativeEntry, XpStyle, Panel } from "../../shared/protocol";
import type {
  AdventureState,
  NarrativeHistory,
  StateLoadResult,
} from "./types/state";
import { validateAdventureId, safeResolvePath } from "./validation";
import { HistoryCompactor } from "./services/history-compactor";
import { env } from "./env";
import { logger } from "./logger";

/**
 * Manages persistence of adventure state to filesystem
 * Each adventure has its own directory with state.json and history.json
 */
export class AdventureStateManager {
  private adventuresDir: string;
  private state: AdventureState | null = null;
  private history: NarrativeHistory = { entries: [] };

  constructor(adventuresDir?: string) {
    // Use validated env config for default path (absolute, computed at startup)
    this.adventuresDir = adventuresDir ?? env.adventuresDir;
  }

  /**
   * Create a new adventure with initialized state
   * @param id Optional adventure ID (UUID will be generated if not provided)
   * @returns Created adventure state
   * @throws Error if provided ID is invalid
   */
  async create(id?: string): Promise<AdventureState> {
    const adventureId = id ?? randomUUID();

    // Validate adventure ID to prevent path traversal
    const validation = validateAdventureId(adventureId);
    if (!validation.valid) {
      throw new Error(`Invalid adventure ID: ${validation.error}`);
    }
    const sessionToken = randomUUID();
    const now = new Date().toISOString();

    this.state = {
      id: adventureId,
      sessionToken,
      agentSessionId: null,
      createdAt: now,
      lastActiveAt: now,
      currentScene: {
        description:
          "The adventure is just beginning. The world awaits your imagination.",
      },
      currentTheme: {
        mood: "calm",
        genre: "high-fantasy",
        region: "village",
        backgroundUrl: null,
      },
      // Character/world references (null = GM will prompt for selection)
      playerRef: null,
      worldRef: null,
      // Info panels (initialized empty, populated via MCP tools)
      panels: [],
    };

    this.history = { entries: [] };

    // Create adventure directory (mode 0o700 = owner only access)
    const adventureDir = this.getAdventureDir(adventureId);
    await mkdir(adventureDir, { recursive: true, mode: 0o700 });

    // Save initial state
    await this.save();

    return this.state;
  }

  /**
   * Load existing adventure state from filesystem
   * @param id Adventure ID
   * @param sessionToken Session token for authentication
   * @returns StateLoadResult with loaded state or error details
   */
  async load(id: string, sessionToken: string): Promise<StateLoadResult> {
    // Validate adventure ID to prevent path traversal
    const validation = validateAdventureId(id);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          type: "NOT_FOUND",
          message: `Invalid adventure ID: ${validation.error}`,
        },
      };
    }

    const adventureDir = this.getAdventureDir(id);
    const statePath = join(adventureDir, "state.json");
    const historyPath = join(adventureDir, "history.json");

    // Load state.json
    try {
      const stateContent = await readFile(statePath, "utf-8");
      this.state = JSON.parse(stateContent) as AdventureState;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return {
          success: false,
          error: {
            type: "NOT_FOUND",
            message: `Adventure ${id} not found`,
          },
        };
      }

      // JSON parse error or other read error
      return {
        success: false,
        error: {
          type: "CORRUPTED",
          message: `Failed to load state: ${(error as Error).message}`,
          path: statePath,
        },
      };
    }

    // Migrate old states without currentTheme
    if (!this.state.currentTheme) {
      this.state.currentTheme = {
        mood: "calm",
        genre: "high-fantasy",
        region: "village",
        backgroundUrl: null,
      };
    }

    // Migrate old states without panels field (REQ-F-13)
    if (!this.state.panels) {
      this.state.panels = [];
    }

    // Validate session token
    if (this.state.sessionToken !== sessionToken) {
      this.state = null;
      return {
        success: false,
        error: {
          type: "INVALID_TOKEN",
          message: "Invalid session token",
        },
      };
    }

    // Load history.json
    try {
      const historyContent = await readFile(historyPath, "utf-8");
      this.history = JSON.parse(historyContent) as NarrativeHistory;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        // History file doesn't exist yet (new adventure)
        this.history = { entries: [] };
      } else {
        // Corruption in history file
        return {
          success: false,
          error: {
            type: "CORRUPTED",
            message: `Failed to load history: ${(error as Error).message}`,
            path: historyPath,
          },
        };
      }
    }

    // Update last active timestamp
    this.state.lastActiveAt = new Date().toISOString();

    // Check if existing history needs compaction (handles old large histories)
    if (this.shouldCompact()) {
      void this.compactHistoryAsync();
    }

    return {
      success: true,
      state: this.state,
      history: this.history,
    };
  }

  /**
   * Save current state to filesystem using atomic write
   * Writes to temp file first, then renames to prevent corruption
   * Filters out non-persistent panels before saving (REQ-F-12)
   */
  async save(): Promise<void> {
    if (!this.state) {
      throw new Error("No state to save - call create() or load() first");
    }

    const adventureDir = this.getAdventureDir(this.state.id);
    const statePath = join(adventureDir, "state.json");
    const historyPath = join(adventureDir, "history.json");
    const stateTempPath = join(adventureDir, ".state.json.tmp");
    const historyTempPath = join(adventureDir, ".history.json.tmp");

    // Ensure directory exists (mode 0o700 = owner only access)
    await mkdir(adventureDir, { recursive: true, mode: 0o700 });

    // Update last active timestamp
    this.state.lastActiveAt = new Date().toISOString();

    // Create state for persistence with only persistent panels (REQ-F-11, REQ-F-12)
    const stateToSave: AdventureState = {
      ...this.state,
      panels: this.state.panels?.filter((p) => p.persistent) ?? [],
    };

    try {
      // Atomic write for state.json (mode 0o600 = owner read/write only)
      await writeFile(
        stateTempPath,
        JSON.stringify(stateToSave, null, 2),
        { encoding: "utf-8", mode: 0o600 }
      );
      await rename(stateTempPath, statePath);

      // Atomic write for history.json (mode 0o600 = owner read/write only)
      await writeFile(
        historyTempPath,
        JSON.stringify(this.history, null, 2),
        { encoding: "utf-8", mode: 0o600 }
      );
      await rename(historyTempPath, historyPath);
    } catch (error) {
      // Clean up temp files on error
      try {
        await unlink(stateTempPath);
      } catch {
        /* ignore */
      }
      try {
        await unlink(historyTempPath);
      } catch {
        /* ignore */
      }
      throw error;
    }
  }

  /**
   * Append a new entry to narrative history and persist.
   * Triggers automatic compaction if history exceeds threshold.
   * @param entry Narrative entry to add
   */
  async appendHistory(entry: NarrativeEntry): Promise<void> {
    if (!this.state) {
      throw new Error(
        "No state loaded - call create() or load() first"
      );
    }

    this.history.entries.push(entry);
    await this.save();

    // Check if compaction is needed and trigger asynchronously
    if (this.shouldCompact()) {
      void this.compactHistoryAsync();
    }
  }

  /**
   * Check if history should be compacted based on character count.
   * @returns true if compaction should occur
   */
  private shouldCompact(): boolean {
    const totalChars = this.history.entries.reduce(
      (sum, e) => sum + e.content.length,
      0
    );
    return totalChars >= env.compactionCharThreshold;
  }

  /**
   * Perform history compaction asynchronously.
   * Archives older entries, generates summary, and updates history.
   */
  private async compactHistoryAsync(): Promise<void> {
    const log = logger.child({ component: "AdventureStateManager" });
    const adventureDir = this.getCurrentAdventureDir();

    if (!adventureDir) {
      log.warn("Cannot compact: no adventure directory");
      return;
    }

    const compactor = new HistoryCompactor(adventureDir, {
      retainedCount: env.retainedEntryCount,
      model: env.compactionSummaryModel,
    });

    try {
      const result = await compactor.compact(this.history);

      if (result.success && result.retainedEntries) {
        // Update history with compacted version
        this.history = {
          entries: result.retainedEntries,
          summary: result.summary ?? this.history.summary,
        };
        await this.save();

        log.info(
          {
            entriesArchived: result.entriesArchived,
            archivePath: result.archivePath,
            hasSummary: !!result.summary,
          },
          "History compaction completed"
        );
      } else if (!result.success) {
        log.warn({ error: result.error }, "History compaction skipped");
      }
    } catch (error) {
      log.error({ error }, "History compaction failed");
      // Non-fatal: don't throw, just log and continue
    }
  }

  /**
   * Get current adventure state
   * @returns Current state or null if not loaded
   */
  getState(): AdventureState | null {
    return this.state;
  }

  /**
   * Get current narrative history
   * @returns Current history
   */
  getHistory(): NarrativeHistory {
    return this.history;
  }

  /**
   * Update agent session ID for conversation continuity
   * @param sessionId Claude Agent SDK session ID
   */
  async updateAgentSessionId(sessionId: string): Promise<void> {
    if (!this.state) {
      throw new Error(
        "No state loaded - call create() or load() first"
      );
    }

    this.state.agentSessionId = sessionId;
    await this.save();
  }

  /**
   * Clear agent session ID for recovery scenarios.
   * Sets agentSessionId to null to force a new session on the next query.
   * Used when the SDK rejects an invalid or expired session ID.
   */
  async clearAgentSessionId(): Promise<void> {
    if (!this.state) {
      throw new Error(
        "No state loaded - call create() or load() first"
      );
    }

    this.state.agentSessionId = null;
    await this.save();
  }

  /**
   * Update current scene description
   * @param description New scene description
   */
  async updateScene(description: string): Promise<void> {
    if (!this.state) {
      throw new Error(
        "No state loaded - call create() or load() first"
      );
    }

    this.state.currentScene.description = description;
    await this.save();
  }

  /**
   * Update current theme
   * @param mood Theme mood
   * @param genre Theme genre
   * @param region Theme region
   * @param backgroundUrl Optional background image URL
   */
  async updateTheme(
    mood: AdventureState["currentTheme"]["mood"],
    genre: AdventureState["currentTheme"]["genre"],
    region: AdventureState["currentTheme"]["region"],
    backgroundUrl: string | null
  ): Promise<void> {
    if (!this.state) {
      throw new Error("No state loaded - call create() or load() first");
    }

    this.state.currentTheme = { mood, genre, region, backgroundUrl };
    await this.save();
  }

  /**
   * Update player's XP award style preference
   * @param xpStyle The player's chosen XP style
   */
  async updateXpStyle(xpStyle: XpStyle): Promise<void> {
    if (!this.state) {
      throw new Error("No state loaded - call create() or load() first");
    }

    this.state.xpStyle = xpStyle;
    await this.save();
  }

  /**
   * Update player character reference
   * @param ref Relative path from PROJECT_DIR (e.g., "players/kael-thouls")
   */
  async updatePlayerRef(ref: string): Promise<void> {
    if (!this.state) {
      throw new Error("No state loaded - call create() or load() first");
    }

    this.state.playerRef = ref;
    await this.save();
  }

  /**
   * Update world reference
   * @param ref Relative path from PROJECT_DIR (e.g., "worlds/eldoria")
   */
  async updateWorldRef(ref: string): Promise<void> {
    if (!this.state) {
      throw new Error("No state loaded - call create() or load() first");
    }

    this.state.worldRef = ref;
    await this.save();
  }

  /**
   * Get all active panels
   * @returns Array of active panels (may include both persistent and non-persistent)
   */
  getPanels(): Panel[] {
    return this.state?.panels ?? [];
  }

  /**
   * Set the panels array (replaces all panels)
   * Used by PanelManager for atomic updates
   * @param panels New panels array
   */
  async setPanels(panels: Panel[]): Promise<void> {
    if (!this.state) {
      throw new Error("No state loaded - call create() or load() first");
    }

    this.state.panels = panels;
    await this.save();
  }

  /**
   * Get adventure directory path for currently loaded state.
   * @returns Full path to adventure directory or null if no state loaded
   */
  getCurrentAdventureDir(): string | null {
    if (!this.state) {
      return null;
    }
    return this.getAdventureDir(this.state.id);
  }

  /**
   * Get adventure directory path with path traversal protection
   * @param id Adventure ID
   * @returns Full path to adventure directory
   * @throws Error if path would escape base directory
   */
  private getAdventureDir(id: string): string {
    // Defense-in-depth: verify path stays within adventures directory
    const safePath = safeResolvePath(this.adventuresDir, id);
    if (safePath === null) {
      throw new Error(`Invalid adventure ID: path traversal detected`);
    }
    return safePath;
  }
}
