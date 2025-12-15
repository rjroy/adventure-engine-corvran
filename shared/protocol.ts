// WebSocket Protocol Types for Adventure Engine
// Shared between frontend and backend to ensure type consistency
// Uses Zod for runtime validation at message boundaries

import { z } from "zod";

// ========================
// Error Codes
// ========================

export const ErrorCodeSchema = z.enum([
  "INVALID_TOKEN",
  "ADVENTURE_NOT_FOUND",
  "RATE_LIMIT",
  "GM_ERROR",
  "STATE_CORRUPTED",
  "PROCESSING_TIMEOUT",
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

// ========================
// Narrative Entry
// ========================

export const NarrativeEntrySchema = z.object({
  id: z.string(), // UUID
  timestamp: z.string(), // ISO 8601
  type: z.enum(["player_input", "gm_response"]),
  content: z.string(),
});

export type NarrativeEntry = z.infer<typeof NarrativeEntrySchema>;

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
export const ThemeMoodSchema = z.enum([
  "calm",
  "tense",
  "ominous",
  "triumphant",
  "mysterious",
]);

export type ThemeMood = z.infer<typeof ThemeMoodSchema>;

/**
 * Genre classifications for background image selection and generation.
 * Affects art style, technology level, and atmospheric elements.
 */
export const GenreSchema = z.enum([
  "sci-fi",
  "steampunk",
  "low-fantasy",
  "high-fantasy",
  "horror",
  "modern",
  "historical",
]);

export type Genre = z.infer<typeof GenreSchema>;

/**
 * Region/location types for background image selection and generation.
 * Defines the physical environment and setting of the scene.
 */
export const RegionSchema = z.enum([
  "city",
  "village",
  "forest",
  "desert",
  "mountain",
  "ocean",
  "underground",
  "castle",
  "ruins",
]);

export type Region = z.infer<typeof RegionSchema>;

/**
 * Payload for theme_change server messages.
 * Triggers visual theme transitions including colors, fonts, and background imagery.
 *
 * The backend uses a catalog-first approach: searches for existing images
 * matching mood+genre+region before generating new ones via art-gen-mcp.
 */
export const ThemeChangePayloadSchema = z.object({
  /** Target mood state determining color palette and visual atmosphere */
  mood: ThemeMoodSchema,

  /** Genre classification for background image selection/generation */
  genre: GenreSchema,

  /** Region/location type for background image selection/generation */
  region: RegionSchema,

  /**
   * URL to background image, or null to use fallback/generate.
   * - If provided: frontend loads this specific image
   * - If null: backend determines image from catalog or generates new one
   */
  backgroundUrl: z.string().nullable(),

  /**
   * Override default transition duration (1500ms).
   * Allows faster transitions for rapid mood shifts or slower for dramatic reveals.
   */
  transitionDuration: z.number().optional(),
});

export type ThemeChangePayload = z.infer<typeof ThemeChangePayloadSchema>;

// ========================
// Client → Server Messages
// ========================

export const AuthenticateMessageSchema = z.object({
  type: z.literal("authenticate"),
  payload: z.object({
    token: z.string(),
  }),
});

export const PlayerInputMessageSchema = z.object({
  type: z.literal("player_input"),
  payload: z.object({
    text: z.string(),
  }),
});

export const StartAdventureMessageSchema = z.object({
  type: z.literal("start_adventure"),
  payload: z.object({
    adventureId: z.string().optional(),
  }),
});

export const PingMessageSchema = z.object({
  type: z.literal("ping"),
});

export const ClientMessageSchema = z.discriminatedUnion("type", [
  AuthenticateMessageSchema,
  PlayerInputMessageSchema,
  StartAdventureMessageSchema,
  PingMessageSchema,
]);

export type ClientMessage = z.infer<typeof ClientMessageSchema>;

// ========================
// Server → Client Messages
// ========================

export const GMResponseStartMessageSchema = z.object({
  type: z.literal("gm_response_start"),
  payload: z.object({
    messageId: z.string(),
  }),
});

export const GMResponseChunkMessageSchema = z.object({
  type: z.literal("gm_response_chunk"),
  payload: z.object({
    messageId: z.string(),
    text: z.string(),
  }),
});

export const GMResponseEndMessageSchema = z.object({
  type: z.literal("gm_response_end"),
  payload: z.object({
    messageId: z.string(),
  }),
});

export const AdventureLoadedMessageSchema = z.object({
  type: z.literal("adventure_loaded"),
  payload: z.object({
    adventureId: z.string(),
    history: z.array(NarrativeEntrySchema),
  }),
});

export const ErrorMessageSchema = z.object({
  type: z.literal("error"),
  payload: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    retryable: z.boolean(),
  }),
});

export const PongMessageSchema = z.object({
  type: z.literal("pong"),
});

export const ThemeChangeMessageSchema = z.object({
  type: z.literal("theme_change"),
  payload: ThemeChangePayloadSchema,
});

export const ServerMessageSchema = z.discriminatedUnion("type", [
  GMResponseStartMessageSchema,
  GMResponseChunkMessageSchema,
  GMResponseEndMessageSchema,
  AdventureLoadedMessageSchema,
  ErrorMessageSchema,
  PongMessageSchema,
  ThemeChangeMessageSchema,
]);

export type ServerMessage = z.infer<typeof ServerMessageSchema>;

// ========================
// Validation Helpers
// ========================

/**
 * Parse and validate a client message from raw JSON.
 * Returns the validated message or an error.
 */
export function parseClientMessage(data: unknown): {
  success: true;
  data: ClientMessage;
} | {
  success: false;
  error: z.ZodError;
} {
  const result = ClientMessageSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Parse and validate a server message from raw JSON.
 * Returns the validated message or an error.
 */
export function parseServerMessage(data: unknown): {
  success: true;
  data: ServerMessage;
} | {
  success: false;
  error: z.ZodError;
} {
  const result = ServerMessageSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Format Zod validation errors into a human-readable string.
 */
export function formatValidationError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
}
