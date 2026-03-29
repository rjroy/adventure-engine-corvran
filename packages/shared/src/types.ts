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
} from "./schemas/adventures.js";

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
