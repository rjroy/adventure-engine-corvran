// Mock Claude Agent SDK for E2E Testing
// Provides deterministic responses without hitting the real API

import type { ThemeMood, Genre, Region } from "./types/protocol";

/**
 * Tool use callback for simulating MCP tool invocations
 * @param toolName - Name of the tool being invoked (e.g., "set_theme")
 * @param input - Tool input parameters
 */
export type OnToolUseCallback = (
  toolName: string,
  input: Record<string, unknown>
) => Promise<void>;

/**
 * Options for mock query
 */
export interface MockQueryOptions {
  prompt: string;
  options?: {
    resume?: string;
    systemPrompt?: string;
    /** Callback invoked when a tool_use would be triggered */
    onToolUse?: OnToolUseCallback;
  };
}

/**
 * Theme tool call detected from input
 */
interface ThemeToolCall {
  name: "set_theme";
  input: {
    mood: ThemeMood;
    genre: Genre;
    region: Region;
  };
}

/**
 * Dice roll tool call detected from input
 */
interface DiceToolCall {
  name: "roll_dice";
  input: {
    expression: string;
    context?: string;
    visible?: boolean;
  };
}

/**
 * Union type for all tool calls (for future use)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ToolCall = ThemeToolCall | DiceToolCall;

/**
 * Theme trigger rules - maps keywords to theme parameters
 */
const THEME_TRIGGERS: Array<{
  keywords: string[];
  mood: ThemeMood;
  genre: Genre;
  region: Region;
}> = [
  // Ominous/danger triggers
  {
    keywords: ["dark forest", "ominous", "danger", "threatening", "menacing"],
    mood: "ominous",
    genre: "high-fantasy",
    region: "forest",
  },
  // Calm/peaceful triggers
  {
    keywords: ["village", "tavern", "rest", "inn", "peaceful", "safe"],
    mood: "calm",
    genre: "high-fantasy",
    region: "village",
  },
  // Tense/combat triggers
  {
    keywords: ["battle", "combat", "fight", "attack", "enemy", "sword"],
    mood: "tense",
    genre: "high-fantasy",
    region: "forest",
  },
  // Mysterious/exploration triggers
  {
    keywords: ["ruins", "ancient", "mystery", "discover", "explore", "hidden"],
    mood: "mysterious",
    genre: "high-fantasy",
    region: "ruins",
  },
  // Triumphant/victory triggers
  {
    keywords: ["victory", "win", "triumph", "celebrate", "success"],
    mood: "triumphant",
    genre: "high-fantasy",
    region: "castle",
  },
];

/**
 * Detect if input should trigger a theme tool call
 * @param prompt - Player input (lowercase)
 * @returns Theme tool call or null
 */
export function detectThemeTool(prompt: string): ThemeToolCall | null {
  for (const trigger of THEME_TRIGGERS) {
    if (trigger.keywords.some((keyword) => prompt.includes(keyword))) {
      return {
        name: "set_theme",
        input: {
          mood: trigger.mood,
          genre: trigger.genre,
          region: trigger.region,
        },
      };
    }
  }
  return null;
}

/**
 * Detect if input should trigger a dice roll tool call
 * @param prompt - Player input (lowercase)
 * @returns Dice tool call or null
 */
export function detectDiceTool(prompt: string): DiceToolCall | null {
  // Detect common dice roll patterns
  const shouldRoll =
    prompt.includes("roll") ||
    prompt.includes("attack") ||
    prompt.includes("check") ||
    prompt.includes("stealth") ||
    prompt.includes("sneak") ||
    prompt.includes("damage") ||
    prompt.includes("initiative") ||
    prompt.includes("strike");

  if (!shouldRoll) {
    return null;
  }

  // Determine expression based on context
  let expression = "1d20";
  let context = "Skill check";

  if (prompt.includes("attack") || prompt.includes("strike")) {
    expression = "1d20+3";
    context = "Attack roll";
  } else if (prompt.includes("damage")) {
    expression = "2d6+2";
    context = "Damage roll";
  } else if (prompt.includes("initiative")) {
    expression = "1d20+2";
    context = "Initiative roll";
  } else if (prompt.includes("stealth") || prompt.includes("sneak")) {
    expression = "1d20+5";
    context = "Stealth check";
  }

  return {
    name: "roll_dice",
    input: {
      expression,
      context,
      visible: true,
    },
  };
}

/**
 * Mock query function that simulates Claude Agent SDK responses
 * Used when MOCK_SDK=true environment variable is set
 *
 * Now supports onToolUse callback for simulating MCP tool invocations
 */
export async function* mockQuery(
  options: MockQueryOptions
): AsyncGenerator<MockSDKMessage, void, unknown> {
  const prompt = options.prompt.toLowerCase();

  // Emit system init message
  yield {
    type: "system",
    subtype: "init",
    session_id: `mock-session-${Date.now()}`,
  };

  // Check for tool triggers and invoke callbacks if provided
  if (options.options?.onToolUse) {
    const themeCall = detectThemeTool(prompt);
    if (themeCall) {
      await options.options.onToolUse(themeCall.name, themeCall.input);
    }

    const diceCall = detectDiceTool(prompt);
    if (diceCall) {
      await options.options.onToolUse(diceCall.name, diceCall.input);
    }
  }

  // Determine response based on input
  let response: string;

  if (prompt.includes("look around") || prompt.includes("look")) {
    response = generateLookAroundResponse();
  } else if (prompt.includes("go north") || prompt.includes("north")) {
    response = "You head north along the winding path. The trees grow denser here, their ancient branches forming a natural canopy overhead.";
  } else if (prompt.includes("inventory") || prompt.includes("inv")) {
    response = "You check your belongings: a worn leather satchel, a small knife, and a crumpled map that seems mostly useless.";
  } else if (prompt.includes("help")) {
    response = "You can try commands like 'look around', 'go north', 'inventory', or simply describe what you want to do.";
  } else if (prompt.includes("long response") || prompt.includes("tell me a story")) {
    response = generateLongResponse();
  } else {
    response = generateDefaultResponse(options.prompt);
  }

  // Simulate streaming by yielding chunks
  const chunks = splitIntoChunks(response, 20); // ~20 chars per chunk

  for (const chunk of chunks) {
    // Small delay to simulate network latency
    await sleep(10);

    yield {
      type: "stream_event",
      event: {
        type: "content_block_delta",
        delta: {
          type: "text_delta",
          text: chunk,
        },
      },
    };
  }

  // Final assistant message
  yield {
    type: "assistant",
    message: {
      content: [{ type: "text", text: response }],
    },
    error: null,
  };
}

/**
 * Generate a "look around" response
 */
function generateLookAroundResponse(): string {
  return `You find yourself in a clearing surrounded by ancient oak trees. Sunlight filters through the leaves, casting dappled shadows on the mossy ground.

To the north, a narrow path disappears into the darker forest. To the east, you can hear the faint sound of running water. To the south, the trees thin out and you glimpse what might be a small village in the distance.

A weathered stone marker stands at the center of the clearing, covered in moss and lichen. Strange symbols are carved into its surface.`;
}

/**
 * Generate a long response for streaming tests (500+ words)
 */
function generateLongResponse(): string {
  return `In the ancient days, before the great kingdoms rose and fell, there existed a time when magic flowed freely through the land like rivers of golden light. The forests spoke in whispered voices, and the mountains held secrets that only the bravest adventurers dared to seek.

You have stumbled upon one such secret today. This clearing, though seemingly ordinary at first glance, is actually a nexus point—a place where the boundaries between worlds grow thin. The stone marker before you is no mere waystone; it is an anchor, placed here by the first druids to prevent the veil from tearing completely.

The symbols carved upon its surface tell a story older than written history. They speak of guardians and gate-keepers, of battles fought in realms beyond mortal comprehension, and of a promise made by beings whose names have been forgotten by all but the stones themselves.

As you study the marker more closely, you notice that the moss covering it is not moss at all, but something else entirely—a living memory, perhaps, or a manifestation of the forest's dreams. It pulses faintly with an inner light, responding to your presence in ways you cannot quite understand.

The air around you grows heavy with potential. You sense that you stand at a crossroads, not just of physical paths, but of destiny itself. Whatever choices you make here will echo through time, shaping events that have not yet come to pass.

The forest watches and waits. The stone hums with ancient power. And somewhere in the depths of your being, you feel the stirring of something that has been dormant for a very, very long time.

What will you do? The clearing offers many possibilities—you could examine the stone more closely, attempt to decipher its symbols, follow one of the paths leading away, or simply wait and see what reveals itself to you.

Remember: in places like this, actions have consequences that extend far beyond what the eye can see. Choose wisely, adventurer. The fate of more than just yourself may depend upon it.

The wind picks up slightly, carrying with it the scent of pine and something else—something older, wilder, and infinitely more mysterious. The adventure, it seems, has only just begun.`;
}

/**
 * Generate a default response for unrecognized inputs
 * Always includes the input text for testability
 */
function generateDefaultResponse(input: string): string {
  return `The GM acknowledges: "${input}". You consider this action carefully. The forest seems to shift around you in response, though nothing visible changes.`;
}

/**
 * Split text into chunks for streaming simulation
 */
function splitIntoChunks(text: string, approxChunkSize: number): string[] {
  const chunks: string[] = [];
  let currentChunk = "";

  for (const char of text) {
    currentChunk += char;
    if (currentChunk.length >= approxChunkSize && (char === " " || char === "\n")) {
      chunks.push(currentChunk);
      currentChunk = "";
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock SDK message types
 */
interface MockSDKMessage {
  type: "system" | "stream_event" | "assistant";
  subtype?: string;
  session_id?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  message?: any;
  error?: string | null;
}

/**
 * Error simulation - call this to test error handling
 */
export function* mockQueryWithError(
  errorType: "rate_limit" | "context_window" | "generic"
): Generator<MockSDKMessage, void, unknown> {
  yield {
    type: "system",
    subtype: "init",
    session_id: `mock-session-${Date.now()}`,
  };

  const errorCode = errorType === "rate_limit" ? "rate_limit_error"
    : errorType === "context_window" ? "context_window_error"
    : "generic_error";

  yield {
    type: "assistant",
    message: { content: [] },
    error: errorCode,
  };
}
