// Re-export protocol types and validation from shared module
export type {
  ClientMessage,
  ServerMessage,
  ErrorCode,
  NarrativeEntry,
  HistorySummary,
  ThemeMood,
  Genre,
  Region,
  ThemeChangePayload,
  DiceLogEntry,
  PlayerCharacter,
  NPC,
  CombatState,
  XpStyle,
  Panel,
  PanelPosition,
} from "../../../shared/protocol";

export {
  parseClientMessage,
  formatValidationError,
} from "../../../shared/protocol";
