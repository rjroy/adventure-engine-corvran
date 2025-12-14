// WebSocket Protocol Types for Adventure Engine
// Shared between frontend and backend to ensure type consistency

// Client → Server Messages
export type ClientMessage =
  | { type: "authenticate"; payload: { token: string } }
  | { type: "player_input"; payload: { text: string } }
  | { type: "start_adventure"; payload: { adventureId?: string } }
  | { type: "ping" };

// Server → Client Messages
export type ServerMessage =
  | { type: "gm_response_start"; payload: { messageId: string } }
  | { type: "gm_response_chunk"; payload: { messageId: string; text: string } }
  | { type: "gm_response_end"; payload: { messageId: string } }
  | {
      type: "adventure_loaded";
      payload: { adventureId: string; history: NarrativeEntry[] };
    }
  | {
      type: "error";
      payload: { code: ErrorCode; message: string; retryable: boolean };
    }
  | { type: "pong" }
  | { type: "theme_change"; payload: ThemeChangePayload };

// Error codes for error messages
export type ErrorCode =
  | "INVALID_TOKEN"
  | "ADVENTURE_NOT_FOUND"
  | "RATE_LIMIT"
  | "GM_ERROR"
  | "STATE_CORRUPTED";

// Narrative entry for history
export interface NarrativeEntry {
  id: string; // UUID
  timestamp: string; // ISO 8601
  type: "player_input" | "gm_response";
  content: string;
}

// ========================
// Dynamic Theming System Types
// ========================

/**
 * Theme mood states representing the emotional atmosphere of the adventure.
 * Used to trigger visual theme changes in response to narrative events.
 *
 * - calm: Peaceful, safe moments
 * - tense: Conflict, danger approaching
 * - ominous: Dread, foreboding, horror
 * - triumphant: Victory, achievement, joy
 * - mysterious: Intrigue, secrets, wonder
 */
export type ThemeMood =
  | "calm"
  | "tense"
  | "ominous"
  | "triumphant"
  | "mysterious";

/**
 * Genre classifications for background image selection and generation.
 * Affects art style, technology level, and atmospheric elements.
 */
export type Genre =
  | "sci-fi"
  | "steampunk"
  | "low-fantasy"
  | "high-fantasy"
  | "horror"
  | "modern"
  | "historical";

/**
 * Region/location types for background image selection and generation.
 * Defines the physical environment and setting of the scene.
 */
export type Region =
  | "city"
  | "village"
  | "forest"
  | "desert"
  | "mountain"
  | "ocean"
  | "underground"
  | "castle"
  | "ruins";

/**
 * Payload for theme_change server messages.
 * Triggers visual theme transitions including colors, fonts, and background imagery.
 *
 * The backend uses a catalog-first approach: searches for existing images
 * matching mood+genre+region before generating new ones via art-gen-mcp.
 */
export interface ThemeChangePayload {
  /** Target mood state determining color palette and visual atmosphere */
  mood: ThemeMood;

  /** Genre classification for background image selection/generation */
  genre: Genre;

  /** Region/location type for background image selection/generation */
  region: Region;

  /**
   * URL to background image, or null to use fallback/generate.
   * - If provided: frontend loads this specific image
   * - If null: backend determines image from catalog or generates new one
   */
  backgroundUrl: string | null;

  /**
   * Override default transition duration (1500ms).
   * Allows faster transitions for rapid mood shifts or slower for dramatic reveals.
   */
  transitionDuration?: number;
}
