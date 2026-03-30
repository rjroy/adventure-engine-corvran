import { z } from "zod";

// Adventure list item returned by GET /adventures
export const AdventureListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  system: z.string().nullable(),
  concept: z.string().nullable(),
  characterName: z.string().nullable(),
  hasHistory: z.boolean(),
  lastPlayed: z.string().nullable(),
});

// Response from GET /adventures
export const AdventureListResponseSchema = z.object({
  adventures: z.array(AdventureListItemSchema),
});

// Response from GET /adventures/:id
export const AdventureDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  character: z.string().nullable(),
  world: z.string().nullable(),
  hasHistory: z.boolean(),
  system: z.string().nullable(),
  concept: z.string().nullable(),
});

// Request body for POST /adventures/:id/message
export const MessageRequestSchema = z.object({
  message: z.string().min(1),
});

// Response from GET /adventures/:id/history
export const HistoryResponseSchema = z.object({
  history: z.string().nullable(),
  exists: z.boolean(),
});

// Response from GET /health
export const HealthResponseSchema = z.object({
  status: z.string(),
  version: z.string(),
});

// SSE event types for POST /adventures/:id/message stream
export const TextEventSchema = z.object({
  text: z.string(),
});

export const ToolUseEventSchema = z.object({
  name: z.string(),
  result: z.string(),
});

export const DoneEventSchema = z.object({
  fullResponse: z.string(),
});

export const ErrorEventSchema = z.object({
  error: z.string(),
});

// System info for GET /systems (Phase 3)
export const SystemInfoSchema = z.object({
  alias: z.string(),
  description: z.string(),
});

export const SystemsResponseSchema = z.object({
  systems: z.array(SystemInfoSchema),
});

// Adventure creation (Phase 3)
export const CreateAdventureRequestSchema = z.object({
  name: z.string().min(1).max(100),
  system: z.string().nullable(),
  concept: z.string().max(1000).nullable(),
});

export const CreateAdventureResponseSchema = z.object({
  adventure: AdventureListItemSchema,
});
