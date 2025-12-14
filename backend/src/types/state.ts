// Adventure State Types
// Data model for adventure persistence

import type { NarrativeEntry, ThemeMood, Genre, Region } from "../../../shared/protocol";

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
  playerCharacter: {
    name: string | null;
    attributes: Record<string, unknown>;
  };
  // Current visual theme (persisted for session restoration)
  currentTheme: {
    mood: ThemeMood;
    genre: Genre;
    region: Region;
    backgroundUrl: string | null;
  };
}

/**
 * Narrative history stored in history.json
 * Append-only log of player inputs and GM responses
 */
export interface NarrativeHistory {
  entries: NarrativeEntry[];
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
