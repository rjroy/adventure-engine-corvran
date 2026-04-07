import type { z } from "zod";
import type {
  AdventureListItemSchema,
  AdventureListResponseSchema,
  AdventureDetailSchema,
  MessageRequestSchema,
  HistoryResponseSchema,
  HealthResponseSchema,
  TextEventSchema,
  ToolUseEventSchema,
  DoneEventSchema,
  ErrorEventSchema,
  SystemInfoSchema,
  SystemsResponseSchema,
  CreateAdventureRequestSchema,
  CreateAdventureResponseSchema,
  MoodStateSchema,
  MoodEventSchema,
  CompactResponseSchema,
  CompactErrorSchema,
  FileTreeResponseSchema,
  FileContentResponseSchema,
} from "./schemas/adventures";

export type AdventureListItem = z.infer<typeof AdventureListItemSchema>;
export type AdventureListResponse = z.infer<typeof AdventureListResponseSchema>;
export type AdventureDetail = z.infer<typeof AdventureDetailSchema>;
export type MessageRequest = z.infer<typeof MessageRequestSchema>;
export type HistoryResponse = z.infer<typeof HistoryResponseSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type TextEvent = z.infer<typeof TextEventSchema>;
export type ToolUseEvent = z.infer<typeof ToolUseEventSchema>;
export type DoneEvent = z.infer<typeof DoneEventSchema>;
export type ErrorEvent = z.infer<typeof ErrorEventSchema>;
export type SystemInfo = z.infer<typeof SystemInfoSchema>;
export type SystemsResponse = z.infer<typeof SystemsResponseSchema>;
export type CreateAdventureRequest = z.infer<typeof CreateAdventureRequestSchema>;
export type CreateAdventureResponse = z.infer<typeof CreateAdventureResponseSchema>;
export type MoodState = z.infer<typeof MoodStateSchema>;
export type MoodEvent = z.infer<typeof MoodEventSchema>;
export type CompactResponse = z.infer<typeof CompactResponseSchema>;
export type CompactError = z.infer<typeof CompactErrorSchema>;
export type FileTreeResponse = z.infer<typeof FileTreeResponseSchema>;
export type FileContentResponse = z.infer<typeof FileContentResponseSchema>;
