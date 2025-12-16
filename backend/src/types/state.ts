// Adventure State Types
// Data model for adventure persistence

import type {
  NarrativeEntry,
  ThemeMood,
  Genre,
  Region,
  NPC,
  DiceLogEntry,
  CombatState,
  SystemDefinition,
  PlayerCharacter,
  HistorySummary,
  NarrativeHistory,
} from "../../../shared/protocol";

// Re-export types needed by other modules
export type { SystemDefinition, HistorySummary, NarrativeHistory } from "../../../shared/protocol";

/**
 * Adventure state stored in state.json
 * Contains current world state, scene info, and player character data
 */
export interface AdventureState {
  id: string; // UUID
  sessionToken: string; // Auth token
  agentSessionId: string | null; // Claude Agent SDK session ID for resume
  createdAt: string; // ISO 8601
  lastActiveAt: string; // ISO 8601
  currentScene: {
    description: string; // Current narrative context
    location: string; // Where the player is
  };
  worldState: Record<string, unknown>; // Flexible world facts
  playerCharacter: PlayerCharacter;
  // Current visual theme (persisted for session restoration)
  currentTheme: {
    mood: ThemeMood;
    genre: Genre;
    region: Region;
    backgroundUrl: string | null;
  };
  // RPG system fields (all optional for backward compatibility)
  npcs?: NPC[];
  diceLog?: DiceLogEntry[];
  combatState?: CombatState | null;
  systemDefinition?: SystemDefinition | null;
}

// NarrativeHistory is now imported from shared/protocol.ts
// It includes optional summary field for compaction support

/**
 * Configuration for history compaction
 */
export interface CompactionConfig {
  /** Number of entries to retain after compaction */
  retainedCount: number;
  /** Model to use for summarization */
  model: string;
  /** Override for mock SDK mode (defaults to env.mockSdk) */
  mockSdk?: boolean;
}

/**
 * Result of a compaction operation
 */
export interface CompactionResult {
  success: boolean;
  /** Path to the archive file (if successful) */
  archivePath?: string;
  /** Number of entries that were archived */
  entriesArchived?: number;
  /** Entries retained after compaction */
  retainedEntries?: NarrativeEntry[];
  /** Generated summary (null if summarization failed) */
  summary?: HistorySummary | null;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Result type for state loading operations
 */
export type StateLoadResult =
  | { success: true; state: AdventureState; history: NarrativeHistory }
  | { success: false; error: StateLoadError };

/**
 * Error types for state operations
 */
export type StateLoadError =
  | { type: "NOT_FOUND"; message: string }
  | { type: "CORRUPTED"; message: string; path: string }
  | { type: "INVALID_TOKEN"; message: string };
