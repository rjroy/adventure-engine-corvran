// Re-export protocol types and validation from shared module
export type {
  ClientMessage,
  ServerMessage,
  ErrorCode,
  NarrativeEntry,
  ThemeMood,
  Genre,
  Region,
  ThemeChangePayload,
  DiceLogEntry,
  PlayerCharacter,
  NPC,
  CombatState,
  XpStyle,
} from "../../../shared/protocol";

export {
  parseClientMessage,
  formatValidationError,
} from "../../../shared/protocol";
