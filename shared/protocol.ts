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
  "AUTH_ERROR",
  "GM_ERROR",
  "STATE_CORRUPTED",
  "PROCESSING_TIMEOUT",
  "SERVER_SHUTDOWN",
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
// History Compaction Types
// ========================

/**
 * Summary of compacted history for context continuity.
 * Generated when history.json exceeds the compaction threshold.
 * Provides narrative recap for returning players.
 */
export const HistorySummarySchema = z.object({
  /** When the summary was generated */
  generatedAt: z.string(), // ISO 8601
  /** Model used for summarization */
  model: z.string(),
  /** Number of entries that were archived */
  entriesArchived: z.number(),
  /** Date range covered by archived entries */
  dateRange: z.object({
    from: z.string(), // ISO 8601
    to: z.string(), // ISO 8601
  }),
  /** The narrative summary text */
  text: z.string(),
});

export type HistorySummary = z.infer<typeof HistorySummarySchema>;

/**
 * Narrative history with optional summary from compaction.
 * The summary provides context for archived entries.
 */
export const NarrativeHistorySchema = z.object({
  entries: z.array(NarrativeEntrySchema),
  /** Summary of previously compacted entries (null if never compacted) */
  summary: HistorySummarySchema.nullable().optional(),
});

export type NarrativeHistory = z.infer<typeof NarrativeHistorySchema>;

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
// Panel System Types
// ========================

/**
 * Panel position options for info panels.
 * - sidebar: Right side of screen, vertical stack for persistent status
 * - header: Top of screen, horizontal flow for tickers/alerts
 * - overlay: Floating panel with percentage-based positioning
 */
export const PanelPositionSchema = z.enum(["sidebar", "header", "overlay"]);

export type PanelPosition = z.infer<typeof PanelPositionSchema>;

/**
 * Info panel for displaying contextual information (weather, tickers, alerts).
 * GM can create, update, and dismiss panels via MCP tools.
 *
 * Constraints:
 * - ID: alphanumeric + hyphens, max 32 chars
 * - Title: max 64 chars
 * - Content: markdown text, max 64KB (65536 bytes)
 * - x/y: percentage-based positioning (0-100), overlay only
 * - Maximum 5 concurrent panels enforced by backend
 */
export const PanelSchema = z.object({
  /** Unique identifier (alphanumeric + hyphens, max 32 chars) */
  id: z
    .string()
    .min(1)
    .max(32)
    .regex(
      /^[a-zA-Z0-9-]+$/,
      "Panel ID must be alphanumeric with hyphens only"
    ),

  /** Display header text (max 64 chars) */
  title: z.string().min(1).max(64),

  /** Markdown content (max 64KB / 65536 bytes) */
  content: z.string().max(65536),

  /** Panel display position */
  position: PanelPositionSchema,

  /** If true, panel survives session reload */
  persistent: z.boolean(),

  /** Overlay X position as percentage from left (0-100), overlay only */
  x: z.number().min(0).max(100).optional(),

  /** Overlay Y position as percentage from top (0-100), overlay only */
  y: z.number().min(0).max(100).optional(),

  /** ISO 8601 timestamp for creation ordering (REQ-F-22) */
  createdAt: z.string(),
});

export type Panel = z.infer<typeof PanelSchema>;

// ========================
// Client → Server Messages
// ========================

export const AuthenticateMessageSchema = z.object({
  type: z.literal("authenticate"),
  payload: z.object({
    token: z.string(),
    adventureId: z.string().optional(), // Optional for backward compat, but preferred over URL param
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

export const AbortMessageSchema = z.object({
  type: z.literal("abort"),
});

export const RecapMessageSchema = z.object({
  type: z.literal("recap"),
});

export const ClientMessageSchema = z.discriminatedUnion("type", [
  AuthenticateMessageSchema,
  PlayerInputMessageSchema,
  StartAdventureMessageSchema,
  PingMessageSchema,
  AbortMessageSchema,
  RecapMessageSchema,
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
    /** Summary of previously compacted history (null if never compacted) */
    summary: HistorySummarySchema.nullable().optional(),
  }),
});

export const ErrorMessageSchema = z.object({
  type: z.literal("error"),
  payload: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    retryable: z.boolean(),
    technicalDetails: z.string().optional(),
  }),
});

export const PongMessageSchema = z.object({
  type: z.literal("pong"),
});

export const ThemeChangeMessageSchema = z.object({
  type: z.literal("theme_change"),
  payload: ThemeChangePayloadSchema,
});

export const AuthenticatedMessageSchema = z.object({
  type: z.literal("authenticated"),
  payload: z.object({
    adventureId: z.string(),
  }),
});

// ========================
// Panel Messages (Server → Client)
// ========================

/**
 * Message to create a new info panel.
 * Sent when GM invokes create_panel MCP tool.
 * Frontend adds panel to PanelContext state.
 */
export const PanelCreateMessageSchema = z.object({
  type: z.literal("panel_create"),
  payload: PanelSchema,
});

export type PanelCreateMessage = z.infer<typeof PanelCreateMessageSchema>;

/**
 * Message to update an existing panel's content.
 * Only content can be updated - other fields (position, title) are immutable.
 * Sent when GM invokes update_panel MCP tool.
 */
export const PanelUpdateMessageSchema = z.object({
  type: z.literal("panel_update"),
  payload: z.object({
    /** ID of panel to update */
    id: z
      .string()
      .min(1)
      .max(32)
      .regex(
        /^[a-zA-Z0-9-]+$/,
        "Panel ID must be alphanumeric with hyphens only"
      ),
    /** New markdown content (max 64KB / 65536 bytes) */
    content: z.string().max(65536),
  }),
});

export type PanelUpdateMessage = z.infer<typeof PanelUpdateMessageSchema>;

/**
 * Message to dismiss (remove) a panel from the UI.
 * Sent when GM invokes dismiss_panel MCP tool.
 */
export const PanelDismissMessageSchema = z.object({
  type: z.literal("panel_dismiss"),
  payload: z.object({
    /** ID of panel to dismiss */
    id: z
      .string()
      .min(1)
      .max(32)
      .regex(
        /^[a-zA-Z0-9-]+$/,
        "Panel ID must be alphanumeric with hyphens only"
      ),
  }),
});

export type PanelDismissMessage = z.infer<typeof PanelDismissMessageSchema>;

// ========================
// Tool Status Types
// ========================

/**
 * Tool status states for the status bar display.
 * - active: A tool is currently being used
 * - idle: No tool activity, ready for input
 */
export const ToolStatusStateSchema = z.enum(["active", "idle"]);
export type ToolStatusState = z.infer<typeof ToolStatusStateSchema>;

/**
 * Tool status message for real-time feedback on tool activity.
 * Displays vague descriptions to inform users without exposing GM internals.
 */
export const ToolStatusMessageSchema = z.object({
  type: z.literal("tool_status"),
  payload: z.object({
    state: ToolStatusStateSchema,
    /** User-friendly description (e.g., "Setting the scene...", "Ready") */
    description: z.string(),
  }),
});

// ========================
// Recap Messages (Server → Client)
// ========================

/**
 * Sent when recap processing begins.
 * Frontend should show a "recapping" state.
 */
export const RecapStartedMessageSchema = z.object({
  type: z.literal("recap_started"),
});

export type RecapStartedMessage = z.infer<typeof RecapStartedMessageSchema>;

/**
 * Sent when recap completes successfully.
 * Contains the updated history (retained entries only) and new summary.
 * Frontend replaces current history/summary with these values.
 */
export const RecapCompleteMessageSchema = z.object({
  type: z.literal("recap_complete"),
  payload: z.object({
    /** Retained history entries after compaction */
    history: z.array(NarrativeEntrySchema),
    /** New summary from compaction (null if summarization failed) */
    summary: HistorySummarySchema.nullable(),
  }),
});

export type RecapCompleteMessage = z.infer<typeof RecapCompleteMessageSchema>;

/**
 * Sent when recap fails.
 * Contains a user-friendly error message.
 */
export const RecapErrorMessageSchema = z.object({
  type: z.literal("recap_error"),
  payload: z.object({
    /** User-friendly error description */
    reason: z.string(),
  }),
});

export type RecapErrorMessage = z.infer<typeof RecapErrorMessageSchema>;

export const ServerMessageSchema = z.discriminatedUnion("type", [
  GMResponseStartMessageSchema,
  GMResponseChunkMessageSchema,
  GMResponseEndMessageSchema,
  AdventureLoadedMessageSchema,
  AuthenticatedMessageSchema,
  ErrorMessageSchema,
  PongMessageSchema,
  ThemeChangeMessageSchema,
  ToolStatusMessageSchema,
  PanelCreateMessageSchema,
  PanelUpdateMessageSchema,
  PanelDismissMessageSchema,
  RecapStartedMessageSchema,
  RecapCompleteMessageSchema,
  RecapErrorMessageSchema,
]);

export type ServerMessage = z.infer<typeof ServerMessageSchema>;

// ========================
// RPG System Types
// ========================

/**
 * Inventory item for player characters and NPCs.
 * Tracks items with quantities and optional properties.
 */
export const InventoryItemSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  equipped: z.boolean().optional(),
  properties: z.record(z.unknown()).optional(),
});

export type InventoryItem = z.infer<typeof InventoryItemSchema>;

/**
 * Reward for overcoming an NPC (defeating, persuading, etc.).
 * Defines what players receive when they overcome this NPC.
 */
export const NPCRewardSchema = z.object({
  xp: z.number().optional(),
  loot: z.array(InventoryItemSchema).optional(),
  storyFlag: z.string().optional(),
});

export type NPCReward = z.infer<typeof NPCRewardSchema>;

/**
 * NPC instance - mirrors playerCharacter structure with additional fields.
 * NPCs can participate in combat and skill checks with the same mechanics as player.
 */
export const NPCSchema = z.object({
  id: z.string(),
  name: z.string(),
  templateName: z.string().optional(),
  stats: z.record(z.number()).optional(),
  skills: z.record(z.number()).optional(),
  hp: z.object({
    current: z.number(),
    max: z.number(),
  }).optional(),
  conditions: z.array(z.string()).optional(),
  inventory: z.array(InventoryItemSchema).optional(),
  reward: NPCRewardSchema.optional(),
  isHostile: z.boolean().optional(),
  notes: z.string().optional(),
});

export type NPC = z.infer<typeof NPCSchema>;

/**
 * Dice roll log entry for audit trail.
 * Tracks all dice rolls with full transparency for debugging and verification.
 */
export const DiceLogEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  expression: z.string(),
  individualRolls: z.array(z.number()),
  total: z.number(),
  context: z.string(),
  visible: z.boolean(),
  requestedBy: z.enum(["gm", "system"]),
});

export type DiceLogEntry = z.infer<typeof DiceLogEntrySchema>;

/**
 * Combat participant in initiative order.
 */
export const CombatantEntrySchema = z.object({
  name: z.string(),
  initiative: z.number(),
  isPlayer: z.boolean(),
  conditions: z.array(z.string()),
});

export type CombatantEntry = z.infer<typeof CombatantEntrySchema>;

/**
 * Combat state tracking for turn-based combat.
 * Null when not in combat, populated when combat begins.
 */
export const CombatStateSchema = z.object({
  active: z.boolean(),
  round: z.number(),
  initiativeOrder: z.array(CombatantEntrySchema),
  currentIndex: z.number(),
  structure: z.enum(["turn-based", "narrative", "hybrid"]),
});

export type CombatState = z.infer<typeof CombatStateSchema>;

/**
 * System definition metadata extracted from System.md.
 * Cached at adventure load for GM prompt and validation.
 */
export const SystemDefinitionSchema = z.object({
  rawContent: z.string(),
  diceTypes: z.array(z.string()),
  hasAttributes: z.boolean(),
  hasSkills: z.boolean(),
  hasCombat: z.boolean(),
  hasNPCTemplates: z.boolean(),
  filePath: z.string(),
});

export type SystemDefinition = z.infer<typeof SystemDefinitionSchema>;

/**
 * XP award style preference.
 * - frequent: Award XP for every notable action (combat, exploration, roleplay, clever solutions)
 * - milestone: Award XP at story beats (quest completion, major discoveries, significant encounters)
 * - combat-plus: Always award combat XP, plus occasional bonuses for exceptional creativity
 */
export const XpStyleSchema = z.enum(["frequent", "milestone", "combat-plus"]);
export type XpStyle = z.infer<typeof XpStyleSchema>;

/**
 * Extended player character type with RPG properties.
 * Backward compatible - all RPG fields are optional.
 */
export const PlayerCharacterSchema = z.object({
  name: z.string().nullable(),
  attributes: z.record(z.unknown()),
  // RPG-specific fields (all optional for backward compatibility)
  stats: z.record(z.number()).optional(),
  skills: z.record(z.number()).optional(),
  hp: z.object({
    current: z.number(),
    max: z.number(),
  }).optional(),
  conditions: z.array(z.string()).optional(),
  inventory: z.array(InventoryItemSchema).optional(),
  xp: z.number().optional(),
  level: z.number().optional(),
  xpStyle: XpStyleSchema.optional(),
});

export type PlayerCharacter = z.infer<typeof PlayerCharacterSchema>;

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
