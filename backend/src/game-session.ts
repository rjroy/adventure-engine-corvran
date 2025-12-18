// Game Session Management
// Manages the interaction between WebSocket connections and the Claude Agent SDK
// Implements input queuing to prevent race conditions (REQ-F-18)

import type { WSContext } from "hono/ws";
import { logger, type Logger } from "./logger";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { SDKAssistantMessageError } from "@anthropic-ai/claude-agent-sdk";
import { AdventureStateManager } from "./adventure-state";
import type { AdventureState } from "./types/state";
import type { ServerMessage, NarrativeEntry, ThemeMood, Genre, Region, XpStyle } from "./types/protocol";
import { buildGMSystemPrompt, createGMMcpServerWithCallbacks, type GMMcpCallbacks } from "./gm-prompt";
import { PlayerManager } from "./player-manager";
import { WorldManager } from "./world-manager";
import {
  mapSDKError,
  mapGenericError,
  mapProcessingTimeoutError,
  createErrorPayload,
  ProcessingTimeoutError,
  type ErrorDetails,
} from "./error-handler";
import { env } from "./env";
import { mockQuery } from "./mock-sdk";
import type { BackgroundImageService } from "./services/background-image";
import { sanitizePlayerInput } from "./validation";

// Check if we're in mock mode (for E2E testing)
// Use function instead of const to check at runtime, avoiding module cache issues
function useMockSDK(): boolean {
  return process.env.MOCK_SDK === "true";
}

/**
 * Wrap a promise with a timeout.
 * Throws ProcessingTimeoutError if the promise doesn't resolve within the timeout.
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new ProcessingTimeoutError(timeoutMs));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * Region detection keyword mappings.
 * Order matters: first match wins when multiple keywords could match.
 */
const REGION_KEYWORDS: [Region, string[]][] = [
  ["city", ["city", "town"]],
  ["village", ["village", "hamlet"]],
  ["forest", ["forest", "woods"]],
  ["desert", ["desert", "sand"]],
  ["mountain", ["mountain", "peak"]],
  ["ocean", ["ocean", "sea"]],
  ["underground", ["underground", "cave", "dungeon"]],
  ["castle", ["castle", "palace"]],
  ["ruins", ["ruins", "ancient"]],
];

const DEFAULT_REGION: Region = "forest";

/**
 * Map internal tool names to vague, user-friendly descriptions.
 * Descriptions are intentionally generic to avoid exposing GM thinking.
 */
function getToolDescription(toolName: string): string {
  // MCP tools
  if (toolName === "mcp__adventure-gm__set_theme") return "Setting the scene...";
  if (toolName === "mcp__adventure-gm__set_xp_style") return "Adjusting preferences...";
  if (toolName === "mcp__adventure-gm__set_character") return "Selecting character...";
  if (toolName === "mcp__adventure-gm__set_world") return "Selecting world...";
  if (toolName === "mcp__adventure-gm__list_characters") return "Checking characters...";
  if (toolName === "mcp__adventure-gm__list_worlds") return "Checking worlds...";

  // File operations (state management)
  if (toolName === "Read") return "Consulting records...";
  if (toolName === "Write" || toolName === "Edit") return "Updating world state...";
  if (toolName === "Glob" || toolName === "Grep") return "Searching records...";

  // Bash (typically dice rolling via skill)
  if (toolName === "Bash") return "Consulting the dice...";

  // Skill invocation
  if (toolName === "Skill") return "Consulting the dice...";

  // Unknown tools - generic description
  return "Thinking...";
}

/**
 * Custom error class for Claude Agent SDK errors
 */
class AgentSDKError extends Error {
  constructor(public code: SDKAssistantMessageError) {
    super(`Agent SDK error: ${code}`);
    this.name = "AgentSDKError";
  }
}

/**
 * Queued input item with optional request logger for correlation
 */
interface QueuedInput {
  text: string;
  logger?: Logger;
}

/**
 * GameSession manages a single player's adventure session
 * Handles input queuing, GM response streaming, and state updates
 */
export class GameSession {
  private ws: WSContext;
  private stateManager: AdventureStateManager;
  private inputQueue: QueuedInput[] = [];
  private isProcessing = false;
  private projectDirectory: string | null = null;
  private backgroundImageService: BackgroundImageService | null = null;
  private lastThemeChange: { mood: ThemeMood; timestamp: number } | null = null;
  private playerManager: PlayerManager | null = null;
  private worldManager: WorldManager | null = null;

  constructor(
    ws: WSContext,
    stateManager: AdventureStateManager,
    backgroundImageService?: BackgroundImageService
  ) {
    this.ws = ws;
    this.stateManager = stateManager;
    this.backgroundImageService = backgroundImageService ?? null;
    // State will be loaded by calling initialize() with adventureId and sessionToken
  }

  /**
   * Initialize session by loading adventure state
   * Must be called before using the session
   */
  async initialize(
    adventureId: string,
    sessionToken: string
  ): Promise<{ success: boolean; error?: string }> {
    const result = await this.stateManager.load(adventureId, sessionToken);

    if (!result.success) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    // Validate PROJECT_DIR environment variable (REQ: fail fast at startup)
    const projectDir = process.env.PROJECT_DIR;
    if (!projectDir) {
      logger.error("PROJECT_DIR environment variable is not set");
      return {
        success: false,
        error: "PROJECT_DIR environment variable is required but not set",
      };
    }

    // Validate that PROJECT_DIR directory exists (REQ: fail fast at startup)
    if (!existsSync(projectDir)) {
      logger.error({ projectDir }, "PROJECT_DIR directory does not exist");
      return {
        success: false,
        error: `PROJECT_DIR directory does not exist: ${projectDir}`,
      };
    }

    // Use PROJECT_DIR for SDK sandbox - this is the adventure world directory
    // where the SDK should read/write files
    this.projectDirectory = projectDir;

    // Initialize managers for character/world operations
    this.playerManager = new PlayerManager(projectDir);
    this.worldManager = new WorldManager(projectDir);

    // Auto-create missing ref directories if refs are set but directories don't exist (TD-5)
    // Uses createAtSlug() to preserve the exact slug from the saved state
    const state = this.stateManager.getState();
    if (state) {
      // Check playerRef
      if (state.playerRef) {
        const playerSlug = state.playerRef.replace(/^players\//, "");
        if (!this.playerManager.exists(playerSlug)) {
          logger.info({ playerRef: state.playerRef, playerSlug }, "Auto-creating missing player directory from ref");
          try {
            await this.playerManager.createAtSlug(playerSlug);
          } catch (error) {
            logger.error({ err: error, playerRef: state.playerRef }, "Failed to auto-create player directory");
            // Continue anyway - GM will handle missing files
          }
        }
      }

      // Check worldRef
      if (state.worldRef) {
        const worldSlug = state.worldRef.replace(/^worlds\//, "");
        if (!(await this.worldManager.exists(worldSlug))) {
          logger.info({ worldRef: state.worldRef, worldSlug }, "Auto-creating missing world directory from ref");
          try {
            await this.worldManager.createAtSlug(worldSlug);
          } catch (error) {
            logger.error({ err: error, worldRef: state.worldRef }, "Failed to auto-create world directory");
            // Continue anyway - GM will handle missing files
          }
        }
      }
    }

    return { success: true };
  }

  /**
   * Handle player input with queueing to prevent race conditions
   * Queues input and processes if not already busy
   * Applies input sanitization for prompt injection prevention
   * @param text Player input text
   * @param requestLogger Optional request-scoped logger for log correlation
   */
  async handleInput(text: string, requestLogger?: Logger): Promise<void> {
    const log = requestLogger ?? logger;

    // Sanitize input for prompt injection prevention
    const sanitization = sanitizePlayerInput(text);

    // Block egregious attempts (role manipulation targeting AI, excessive length)
    if (sanitization.blocked) {
      this.sendMessage(
        {
          type: "error",
          payload: {
            code: "GM_ERROR",
            message: "Please describe your action in the game world.",
            retryable: true,
          },
        },
        log
      );
      log.warn({ reason: sanitization.blockReason, flags: sanitization.flags }, "Blocked input");
      return;
    }

    // Log flagged but allowed input for monitoring
    if (sanitization.flags.length > 0) {
      log.info({ flags: sanitization.flags }, "Flagged input");
    }

    // Add sanitized input to queue with its logger
    this.inputQueue.push({ text: sanitization.sanitized, logger: requestLogger });

    // If already processing, the current handler will pick up the next item
    if (this.isProcessing) {
      log.debug("Input queued, already processing");
      return;
    }

    // Start processing queue
    await this.processQueue();
  }

  /**
   * Process queued inputs sequentially
   * Continues until queue is empty
   */
  private async processQueue(): Promise<void> {
    this.isProcessing = true;

    try {
      while (this.inputQueue.length > 0) {
        // Get next input from queue
        const queuedInput = this.inputQueue.shift();
        if (!queuedInput) {
          break;
        }

        const log = queuedInput.logger ?? logger;

        try {
          // Process this input with timeout protection
          await withTimeout(
            this.processInput(queuedInput.text, queuedInput.logger),
            env.inputTimeout
          );
        } catch (error) {
          // Handle timeout errors at queue level (processInput handles other errors internally)
          if (error instanceof ProcessingTimeoutError) {
            const errorDetails = mapProcessingTimeoutError(error);
            log.error(
              {
                errorCode: errorDetails.code,
                timeoutMs: error.timeoutMs,
                adventureId: this.stateManager.getState()?.id,
              },
              "Input processing timeout"
            );

            this.sendMessage(
              {
                type: "error",
                payload: createErrorPayload(errorDetails),
              },
              log
            );
          } else {
            // Re-throw unexpected errors (processInput should handle its own errors)
            throw error;
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single input: generate response and update state
   * @param input Player input text
   * @param requestLogger Optional request-scoped logger for log correlation
   */
  private async processInput(input: string, requestLogger?: Logger): Promise<void> {
    const log = requestLogger ?? logger;
    const messageId = randomUUID();

    try {
      log.debug({ messageId }, "Starting input processing");

      // Log player input to history
      const playerEntry: NarrativeEntry = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        type: "player_input",
        content: input,
      };
      await this.stateManager.appendHistory(playerEntry);

      // Send response start
      this.sendMessage(
        {
          type: "gm_response_start",
          payload: { messageId },
        },
        log
      );

      // Generate and stream GM response using Claude Agent SDK
      let fullResponse = "";
      const responseGenerator = this.generateGMResponse(input, log);

      for await (const chunk of responseGenerator) {
        fullResponse += chunk;

        // Send chunk
        this.sendMessage(
          {
            type: "gm_response_chunk",
            payload: { messageId, text: chunk },
          },
          log
        );
      }

      // Send response end
      this.sendMessage(
        {
          type: "gm_response_end",
          payload: { messageId },
        },
        log
      );

      // Send idle tool status
      this.sendMessage(
        {
          type: "tool_status",
          payload: {
            state: "idle",
            description: "Ready",
          },
        },
        log
      );

      log.debug({ messageId, responseLength: fullResponse.length }, "Response complete");

      // Log GM response to history
      const gmEntry: NarrativeEntry = {
        id: messageId,
        timestamp: new Date().toISOString(),
        type: "gm_response",
        content: fullResponse,
      };
      await this.stateManager.appendHistory(gmEntry);

      // Update scene description (extract from full response)
      // Take first paragraph as scene description
      const sceneUpdate = fullResponse.split("\n\n")[0] || fullResponse;
      await this.stateManager.updateScene(
        sceneUpdate.substring(0, 500)
      );
    } catch (error) {
      // Map error to user-friendly details
      let errorDetails: ErrorDetails;

      if (error instanceof AgentSDKError) {
        errorDetails = mapSDKError(error.code);
        errorDetails.originalError = error;
      } else {
        errorDetails = mapGenericError(error);
      }

      // Log with context for debugging (REQ-F-28)
      // Use request logger if available for correlation
      log.error(
        {
          errorCode: errorDetails.code,
          message: errorDetails.message,
          adventureId: this.stateManager.getState()?.id,
          projectDirectory: this.projectDirectory,
        },
        "processInput error"
      );

      // Send user-friendly error to client
      this.sendMessage(
        {
          type: "error",
          payload: createErrorPayload(errorDetails),
        },
        log
      );
    }
  }

  /**
   * Generate GM response using Claude Agent SDK
   * Streams tokens as they arrive from the API
   * @param input Player input
   * @param requestLogger Optional request-scoped logger for log correlation
   */
  private async *generateGMResponse(
    input: string,
    requestLogger?: Logger
  ): AsyncGenerator<string, void, unknown> {
    const log = requestLogger ?? logger;
    const state = this.stateManager.getState();
    if (!state) {
      throw new Error("Adventure state not loaded");
    }
    if (!this.projectDirectory) {
      throw new Error("PROJECT_DIR not set - cannot run SDK without project directory");
    }

    // Build system prompt from current adventure state
    const systemPrompt = buildGMSystemPrompt(state);

    // Use mock SDK for E2E testing
    if (useMockSDK()) {
      log.debug({ input }, "Using mock query");
      const mockQueryResult = mockQuery({
        prompt: input,
        options: {
          systemPrompt,
          // Hook into tool_use simulation - invoke tool handlers when detected
          onToolUse: async (toolName, toolInput) => {
            if (toolName === "set_theme") {
              log.debug({ toolName, toolInput }, "Mock SDK tool_use triggered");
              await this.handleSetThemeTool(
                {
                  mood: toolInput.mood as ThemeMood,
                  genre: toolInput.genre as Genre,
                  region: toolInput.region as Region,
                },
                log
              );
            }
          },
        },
      });

      for await (const message of mockQueryResult) {
        if (message.type === "stream_event") {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (message.event?.delta?.text) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            yield message.event.delta.text as string;
          }
        }
      }
      return;
    }

    // Create MCP server for GM tools with all callbacks wired to managers
    const callbacks: GMMcpCallbacks = {
      // Theme change callback
      onThemeChange: async (mood, genre, region, forceGenerate, imagePrompt) => {
        log.debug({ mood, genre, region }, "set_theme MCP callback invoked");
        try {
          await this.handleSetThemeTool(
            {
              mood,
              genre: genre as Genre,
              region: region as Region,
              image_prompt: imagePrompt,
              force_generate: forceGenerate,
            },
            log
          );
          log.debug({ mood }, "set_theme MCP callback completed successfully");
        } catch (error) {
          log.error({ err: error, mood }, "set_theme MCP callback error");
          throw error;
        }
      },
      // XP style change callback
      onXpStyleChange: async (xpStyle) => {
        log.debug({ xpStyle }, "set_xp_style MCP callback invoked");
        try {
          await this.handleSetXpStyleTool(xpStyle, log);
          log.debug({ xpStyle }, "set_xp_style MCP callback completed successfully");
        } catch (error) {
          log.error({ err: error, xpStyle }, "set_xp_style MCP callback error");
          throw error;
        }
      },
      // Character selection/creation callback
      onSetCharacter: async (name, isNew) => {
        log.debug({ name, isNew }, "set_character MCP callback invoked");
        if (!this.playerManager) {
          throw new Error("PlayerManager not initialized");
        }
        try {
          let slug: string;
          if (isNew) {
            // Create new character directory
            slug = await this.playerManager.create(name);
          } else {
            // Use existing slug (name may be slug or display name)
            // Check if it's a valid slug that exists (sync check)
            if (this.playerManager.exists(name)) {
              slug = name;
            } else {
              // Try to find by display name (list is async)
              const characters = await this.playerManager.list();
              const match = characters.find(
                (c) => c.name.toLowerCase() === name.toLowerCase() || c.slug === name.toLowerCase()
              );
              if (match) {
                slug = match.slug;
              } else {
                throw new Error(`Character "${name}" not found`);
              }
            }
          }
          const ref = this.playerManager.getRef(slug);
          if (!ref) {
            throw new Error(`Failed to get ref for character slug: ${slug}`);
          }
          // Update adventure state with playerRef
          await this.stateManager.updatePlayerRef(ref);
          log.debug({ ref }, "set_character MCP callback completed successfully");
          return ref;
        } catch (error) {
          log.error({ err: error, name, isNew }, "set_character MCP callback error");
          throw error;
        }
      },
      // World selection/creation callback
      onSetWorld: async (name, isNew) => {
        log.debug({ name, isNew }, "set_world MCP callback invoked");
        if (!this.worldManager) {
          throw new Error("WorldManager not initialized");
        }
        try {
          let slug: string;
          if (isNew) {
            // Create new world directory
            slug = await this.worldManager.create(name);
          } else {
            // Use existing slug (name may be slug or display name)
            const exists = await this.worldManager.exists(name);
            if (exists) {
              slug = name;
            } else {
              // Try to find by display name
              const worlds = await this.worldManager.list();
              const match = worlds.find(
                (w) => w.name.toLowerCase() === name.toLowerCase() || w.slug === name.toLowerCase()
              );
              if (match) {
                slug = match.slug;
              } else {
                throw new Error(`World "${name}" not found`);
              }
            }
          }
          const ref = this.worldManager.getRef(slug);
          if (!ref) {
            throw new Error(`Failed to get ref for world slug: ${slug}`);
          }
          // Update adventure state with worldRef
          await this.stateManager.updateWorldRef(ref);
          log.debug({ ref }, "set_world MCP callback completed successfully");
          return ref;
        } catch (error) {
          log.error({ err: error, name, isNew }, "set_world MCP callback error");
          throw error;
        }
      },
      // List characters callback
      onListCharacters: async () => {
        log.debug("list_characters MCP callback invoked");
        if (!this.playerManager) {
          throw new Error("PlayerManager not initialized");
        }
        const characters = await this.playerManager.list();
        log.debug({ count: characters.length }, "list_characters MCP callback completed");
        return characters;
      },
      // List worlds callback
      onListWorlds: async () => {
        log.debug("list_worlds MCP callback invoked");
        if (!this.worldManager) {
          throw new Error("WorldManager not initialized");
        }
        const worlds = await this.worldManager.list();
        log.debug({ count: worlds.length }, "list_worlds MCP callback completed");
        return worlds;
      },
    };
    const gmMcpServer = createGMMcpServerWithCallbacks(callbacks);

    // Tools available to the GM:
    // - File operations (Read, Write, Glob, Grep) for state management in markdown files
    // - Bash for dice rolling (scripts/roll.sh) when System.md defines RPG rules
    // - set_theme for UI visual updates
    // - set_xp_style for saving player's XP preference
    // - Character/world management tools for multi-adventure support
    const allowedTools = [
      "Skill",
      "Read",
      "Write",
      "Glob",
      "Grep",
      "Bash",
      "mcp__adventure-gm__set_theme",
      "mcp__adventure-gm__set_xp_style",
      "mcp__adventure-gm__set_character",
      "mcp__adventure-gm__set_world",
      "mcp__adventure-gm__list_characters",
      "mcp__adventure-gm__list_worlds",
    ];

    // Query Claude Agent SDK with resume for conversation continuity
    const sdkQuery = query({
      prompt: input,
      options: {
        resume: state.agentSessionId ?? undefined, // Resume conversation if available
        systemPrompt,
        // Provide GM tools via MCP server (keyed by server name)
        mcpServers: { "adventure-gm": gmMcpServer },
        // SDK provides tools by default; allowedTools filters to what we need
        allowedTools,
        cwd: this.projectDirectory,
        settingSources: ["project"],
        includePartialMessages: true, // Enable token streaming
        permissionMode: "acceptEdits", // Auto-accept file edits within sandbox
        model: "claude-sonnet-4-5", // Use latest Sonnet for quality
        maxTurns: 20, // Allow multiple file reads/writes + response
        maxThinkingTokens: 10000, // Allow extensive reasoning
      },
    });

    // Process SDK messages and extract text content
    let assistantText = "";
    let newAgentSessionId: string | null = null;
    let hasYieldedText = false; // Track if we've yielded text from previous blocks

    for await (const message of sdkQuery) {
      // Log SDK messages for debugging
      log.debug({ messageType: message.type, preview: JSON.stringify(message).slice(0, 200) }, "SDK message");

      // Capture session ID for conversation continuity
      if (message.type === "system" && message.subtype === "init") {
        newAgentSessionId = message.session_id;
      }

      // Stream partial text content
      if (message.type === "stream_event") {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const event = message.event;

        // Detect new text content block starting - add paragraph separator between blocks
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (event.type === "content_block_start") {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (event.content_block?.type === "text" && hasYieldedText) {
            // Add paragraph separator between text blocks (required for Markdown)
            assistantText += "\n\n";
            yield "\n\n";
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (event.type === "content_block_delta") {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (event.delta?.type === "text_delta") {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const chunk = event.delta.text as string;
            assistantText += chunk;
            yield chunk;
            hasYieldedText = true;
          }
        }
      }

      // Handle complete assistant messages (fallback if streaming fails)
      if (message.type === "assistant") {
        // Check for API errors
        if (message.error) {
          throw new AgentSDKError(message.error);
        }

        // Extract text from completed message if we haven't streamed it
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const content = message.message.content;

        for (const block of content) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (block.type === "text" && !assistantText) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
            assistantText = block.text;
            yield assistantText;
          }

          // Log tool_use blocks and send status to client
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (block.type === "tool_use") {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            log.debug({ toolName: block.name, input: block.input }, "Tool use detected");

            // Send tool status for UI feedback
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const toolName = block.name as string;
            this.sendMessage(
              {
                type: "tool_status",
                payload: {
                  state: "active",
                  description: getToolDescription(toolName),
                },
              },
              log
            );
          }
        }
      }
    }

    // Store agent session ID for next query
    if (newAgentSessionId) {
      await this.stateManager.updateAgentSessionId(newAgentSessionId);
    }
  }


  /**
   * Handle set_theme tool call from GM
   * Processes theme change requests with debouncing and background image generation
   * @param input Tool input with mood, genre, region, optional image_prompt, and optional force_generate flag
   * @param requestLogger Optional request-scoped logger for log correlation
   */
  private async handleSetThemeTool(
    input: {
      mood: ThemeMood;
      genre: Genre;
      region: Region;
      image_prompt?: string;
      force_generate?: boolean;
    },
    requestLogger?: Logger
  ): Promise<void> {
    const log = requestLogger ?? logger;
    const { mood, genre, region, image_prompt, force_generate = false } = input;
    const now = Date.now();

    log.debug({ mood, genre, region, promptPreview: image_prompt?.slice(0, 50), forceGenerate: force_generate }, "handleSetThemeTool");

    // Debounce: ignore duplicate theme within 1 second (REQ-F-23)
    if (
      this.lastThemeChange &&
      this.lastThemeChange.mood === mood &&
      now - this.lastThemeChange.timestamp < 1000
    ) {
      log.debug({ mood }, "Debouncing duplicate theme change");
      return;
    }

    // Update debounce tracker
    this.lastThemeChange = { mood, timestamp: now };

    // Get background image URL using GM-provided tags for catalog lookup
    // The catalog searches by mood+genre+region first, only generating if no match
    let backgroundUrl: string | null = null;
    if (this.backgroundImageService) {
      try {
        const result = await this.backgroundImageService.getBackgroundImage(
          mood,
          genre,
          region,
          force_generate,
          image_prompt  // Used for generation if no cached image matches
        );
        backgroundUrl = result.url;
        log.debug({ source: result.source, url: backgroundUrl }, "Background image retrieved");
      } catch (error) {
        log.error({ err: error }, "Failed to get background image");
        // Continue with null backgroundUrl - frontend will handle fallback
      }
    }

    // Persist theme to adventure state
    await this.stateManager.updateTheme(mood, genre, region, backgroundUrl);

    // Emit theme_change WebSocket message
    log.debug({ mood, genre, region, backgroundUrl }, "Sending theme_change");
    this.sendMessage(
      {
        type: "theme_change",
        payload: {
          mood,
          genre,
          region,
          backgroundUrl,
        },
      },
      log
    );
  }

  /**
   * Handle set_xp_style tool call from GM
   * Persists the player's XP style preference to adventure state
   * @param xpStyle The player's chosen XP style
   * @param requestLogger Optional request-scoped logger for log correlation
   */
  private async handleSetXpStyleTool(
    xpStyle: XpStyle,
    requestLogger?: Logger
  ): Promise<void> {
    const log = requestLogger ?? logger;
    log.debug({ xpStyle }, "handleSetXpStyleTool");
    await this.stateManager.updateXpStyle(xpStyle);
    log.info({ xpStyle }, "XP style preference saved");
  }

  /**
   * Derive genre from adventure state
   * Checks worldState for genre hints, defaults to "high-fantasy"
   */
  private deriveGenre(state: AdventureState | null): Genre {
    if (!state) return "high-fantasy";

    // Check worldState for genre property
    const worldGenre = state.worldState.genre as Genre | undefined;
    if (worldGenre) return worldGenre;

    // Default to high-fantasy
    return "high-fantasy";
  }

  /**
   * Derive region from adventure state.
   * Checks currentScene.location for region hints using REGION_KEYWORDS mapping.
   */
  private deriveRegion(state: AdventureState | null): Region {
    if (!state) return DEFAULT_REGION;

    const location = state.currentScene.location.toLowerCase();

    for (const [region, keywords] of REGION_KEYWORDS) {
      if (keywords.some((keyword) => location.includes(keyword))) {
        return region;
      }
    }

    return DEFAULT_REGION;
  }

  /**
   * Send a message to the WebSocket client
   * @param message Server message to send
   * @param requestLogger Optional request-scoped logger for log correlation
   */
  private sendMessage(message: ServerMessage, requestLogger?: Logger): void {
    const log = requestLogger ?? logger;
    try {
      const json = JSON.stringify(message);
      log.debug({ messageType: message.type, preview: json.slice(0, 100) }, "WebSocket send");
      this.ws.send(json);
    } catch (error) {
      log.error({ err: error }, "Failed to send WebSocket message");
    }
  }

  /**
   * Get current adventure state
   */
  getState() {
    return this.stateManager.getState();
  }

  /**
   * Get current narrative history
   */
  getHistory() {
    return this.stateManager.getHistory();
  }

  /**
   * Get number of queued inputs
   * Useful for testing queue behavior
   */
  getQueueLength(): number {
    return this.inputQueue.length;
  }

  /**
   * Check if session is currently processing
   * Useful for testing queue behavior
   */
  getIsProcessing(): boolean {
    return this.isProcessing;
  }
}
