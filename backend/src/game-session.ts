// Game Session Management
// Manages the interaction between WebSocket connections and the Claude Agent SDK
// Implements input queuing to prevent race conditions (REQ-F-18)

import type { WSContext } from "hono/ws";
import { logger, type Logger } from "./logger";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { SDKAssistantMessageError, HookJSONOutput, HookInput } from "@anthropic-ai/claude-agent-sdk";
import { AdventureStateManager } from "./adventure-state";
import type { AdventureState } from "./types/state";
import type { ServerMessage, NarrativeEntry, ThemeMood, Genre, Region, XpStyle, HistorySummary } from "./types/protocol";
import { buildGMSystemPrompt, createGMMcpServerWithCallbacks, type GMMcpCallbacks } from "./gm-prompt";
import { PlayerManager } from "./player-manager";
import { WorldManager } from "./world-manager";
import {
  mapSDKError,
  mapGenericError,
  mapProcessingTimeoutError,
  createErrorPayload,
  ProcessingTimeoutError,
  isSessionRecoveryNeeded,
  type ErrorDetails,
} from "./error-handler";
import {
  buildRecoveryContext,
  buildRecoveryPrompt,
} from "./services/history-context";
import { HistoryCompactor } from "./services/history-compactor";
import { env } from "./env";
import { mockQuery } from "./mock-sdk";
import type { BackgroundImageService } from "./services/background-image";
import { sanitizePlayerInput } from "./validation";
import {
  parsePanelFile,
  derivePanelId,
  isPanelPath,
} from "./services/panel-file-parser";

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
  if (toolName === "mcp__adventure-gm__create_panel") return "Updating display...";
  if (toolName === "mcp__adventure-gm__update_panel") return "Updating display...";
  if (toolName === "mcp__adventure-gm__dismiss_panel") return "Updating display...";
  if (toolName === "mcp__adventure-gm__list_panels") return "Checking displays...";

  // File operations (state management)
  if (toolName === "Read") return "Consulting records...";
  if (toolName === "Write" || toolName === "Edit") return "Updating world state...";
  if (toolName === "Glob" || toolName === "Grep") return "Searching records...";

  // Bash (typically dice rolling via skill)
  if (toolName === "Bash") return "Consulting the dice...";

  // Skill invocation
  if (toolName === "Skill") return "Consulting the rules...";

  // Unknown tools - generic description
  return "Thinking...";
}

/**
 * Custom error class for Claude Agent SDK errors
 */
class AgentSDKError extends Error {
  constructor(
    public code: SDKAssistantMessageError,
    public messageContent?: string
  ) {
    super(`Agent SDK error: ${code}`);
    this.name = "AgentSDKError";
  }
}

/**
 * Queued input item with optional request logger for correlation
 */
interface QueuedInput {
  text: string;
  isSystemPrompt: boolean;
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

  /** Track recovery attempts to prevent infinite loops */
  private recoveryAttempt = 0;
  /** Maximum number of recovery attempts before giving up */
  private static readonly MAX_RECOVERY_ATTEMPTS = 1;

  /** AbortController for the current query (null when not processing) */
  private abortController: AbortController | null = null;
  /** Current message ID for abort handling (null when not processing) */
  private currentMessageId: string | null = null;

  /**
   * Panel validation errors to deliver to GM on next turn (REQ-F-26).
   * Cleared after being included in system prompt.
   */
  private panelValidationErrors: string[] = [];

  /**
   * Set of known panel IDs sent to frontend.
   * Used for delete detection (TASK-004).
   */
  private knownPanelIds: Set<string> = new Set();

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
   * @param options Optional settings for input handling
   * @param options.isSystemPrompt If true, skip sanitization (for internal prompts like forceSave, recap)
   */
  async handleInput(
    text: string,
    requestLogger?: Logger,
    options?: { isSystemPrompt?: boolean }
  ): Promise<void> {
    const log = requestLogger ?? logger;
    const isSystemPrompt = options?.isSystemPrompt ?? false;

    // Skip sanitization for internal system prompts (we trust our own prompts)
    let inputText = text;
    if (!isSystemPrompt) {
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

      inputText = sanitization.sanitized;
    }

    // Add input to queue with its logger
    this.inputQueue.push({ text: inputText, isSystemPrompt: isSystemPrompt, logger: requestLogger });

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
    if (this.isProcessing) {
      // NOTE: This should never happen due to checks in handleInput
      throw new Error("processQueue called while already processing");
    }
    this.isProcessing = true;

    let hasUserPrompt = false;

    try {
      while (this.inputQueue.length > 0) {
        // Get next input from queue
        const queuedInput = this.inputQueue.shift();
        if (!queuedInput) {
          break;
        }

        const log = queuedInput.logger ?? logger;

        if (!queuedInput.isSystemPrompt) {
          // Track if we've seen a user prompt in this processing session
          hasUserPrompt = true;
        }

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

      // Check for pending compaction after processing completes
      // This ensures forceSave happens between player inputs, not during
      if (hasUserPrompt && this.stateManager.isCompactionPending()) {
        logger.info("Handling pending compaction after input processing");
        await this.forceSave();
        await this.stateManager.runPendingCompaction();
      }
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

    // Set up abort handling for this query
    this.abortController = new AbortController();
    this.currentMessageId = messageId;

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
      // If session error occurs, attempt recovery with context from history
      let fullResponse = "";
      let responseGenerator: AsyncGenerator<string, void, unknown>;
      let wasAborted = false;

      try {
        responseGenerator = this.generateGMResponse(input, log);

        for await (const chunk of responseGenerator) {
          // Check for abort signal before processing each chunk
          if (this.abortController?.signal.aborted) {
            log.info({ messageId }, "Query aborted during streaming");
            wasAborted = true;
            break;
          }

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
      } catch (error) {
        // Check if aborted - don't attempt recovery for aborted queries
        if (this.abortController?.signal.aborted) {
          log.info({ messageId }, "Query aborted");
          wasAborted = true;
        } else if (this.shouldAttemptRecovery(error)) {
          // Check if this is a session error that warrants recovery
          log.warn({ err: error }, "Session error detected, attempting recovery");

          // Attempt recovery - this will stream a new response
          const recoveryGenerator = this.attemptSessionRecovery(input, log);

          for await (const chunk of recoveryGenerator) {
            // Check for abort during recovery too
            if (this.abortController?.signal.aborted) {
              log.info({ messageId }, "Query aborted during recovery");
              wasAborted = true;
              break;
            }

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
        } else {
          // Not a recoverable session error, re-throw
          throw error;
        }
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
            description: wasAborted ? "Interrupted" : "Ready",
          },
        },
        log
      );

      if (wasAborted) {
        log.info({ messageId, responseLength: fullResponse.length }, "Response aborted");
        // Still save partial response to history if there's content
        if (fullResponse.length > 0) {
          const gmEntry: NarrativeEntry = {
            id: messageId,
            timestamp: new Date().toISOString(),
            type: "gm_response",
            content: fullResponse + "\n\n*[Response interrupted]*",
          };
          await this.stateManager.appendHistory(gmEntry);
        }
      } else {
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

        // Reset recovery attempt counter on successful response
        this.recoveryAttempt = 0;
      }
    } catch (error) {
      // Map error to user-friendly details
      let errorDetails: ErrorDetails;

      if (error instanceof AgentSDKError) {
        errorDetails = mapSDKError(error.code, error.messageContent);
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
          err: error, // Log full error object for debugging
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
    } finally {
      // Clean up abort state
      this.abortController = null;
      this.currentMessageId = null;
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
    let systemPrompt = buildGMSystemPrompt(state);

    // Prepend panel validation errors if any exist (REQ-F-26)
    if (this.panelValidationErrors.length > 0) {
      const errorSection = [
        "## Panel Validation Errors",
        "",
        "The following panel file operations failed validation:",
        ...this.panelValidationErrors.map((e) => `- ${e}`),
        "",
        "Please correct these files and try again.",
        "",
        "---",
        "",
      ].join("\n");

      systemPrompt = errorSection + systemPrompt;

      // Clear errors after including them
      log.info(
        { errorCount: this.panelValidationErrors.length },
        "Including panel validation errors in system prompt"
      );
      this.panelValidationErrors = [];
    }

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
    // - Panel tools for info display windows
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
      "mcp__adventure-gm__create_panel",
      "mcp__adventure-gm__update_panel",
      "mcp__adventure-gm__dismiss_panel",
      "mcp__adventure-gm__list_panels",
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
        maxTurns: 40, // Allow extensive world creation + narrative
        maxThinkingTokens: 1024, // Allow detailed tool reasoning
        // PostToolUse hook for detecting panel file operations (REQ-F-8, REQ-F-9, REQ-F-10)
        hooks: {
          PostToolUse: [
            {
              // Match Write and Bash tools (panel file operations)
              hooks: [
                (
                  hookInput: HookInput,
                  _toolUseId: string | undefined,
                  _options: { signal: AbortSignal }
                ): Promise<HookJSONOutput> => {
                  // Synchronous handler wrapped in Promise for SDK hook interface
                  return Promise.resolve(this.handlePostToolUse(hookInput, log));
                },
              ],
              timeout: 5, // 5 second timeout for hook execution
            },
          ],
        },
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
          // Extract actual error message content from Claude if available
          let errorContent: string | undefined;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          const content = message.message?.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              if (block.type === "text" && block.text) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
                errorContent = block.text;
                break;
              }
            }
          }

          log.error(
            {
              sdkErrorCode: message.error,
              errorContent,
              fullMessage: JSON.stringify(message).slice(0, 5000),
            },
            "SDK returned error in assistant message"
          );
          throw new AgentSDKError(message.error, errorContent);
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
   * Check if an error warrants session recovery attempt.
   * @param error The error to check
   * @returns true if recovery should be attempted
   */
  private shouldAttemptRecovery(error: unknown): boolean {
    // Don't recover if we've already tried
    if (this.recoveryAttempt >= GameSession.MAX_RECOVERY_ATTEMPTS) {
      return false;
    }

    // Check for SDK errors that indicate session issues
    if (error instanceof AgentSDKError) {
      return isSessionRecoveryNeeded(error.code);
    }

    // Check error message content for session-related errors
    if (error instanceof Error) {
      return isSessionRecoveryNeeded(undefined, error.message);
    }

    return false;
  }

  /**
   * Send recovery status to user via tool_status message.
   * @param phase The current recovery phase
   * @param log Logger for correlation
   */
  private sendRecoveryStatus(
    phase: "starting" | "context_loaded" | "complete" | "failed",
    log: Logger
  ): void {
    const descriptions: Record<typeof phase, string> = {
      starting: "Reconnecting to your adventure...",
      context_loaded: "Restoring conversation context...",
      complete: "Ready",
      failed: "Recovery failed - starting fresh",
    };

    this.sendMessage(
      {
        type: "tool_status",
        payload: {
          state: phase === "complete" ? "idle" : "active",
          description: descriptions[phase],
        },
      },
      log
    );
  }

  /**
   * Attempt session recovery by retrying without resume.
   * Builds recovery context from history and prepends to the prompt.
   *
   * @param originalInput The original user input that triggered the error
   * @param log Logger for correlation
   * @returns AsyncGenerator for streaming response, or null if recovery failed
   */
  private async *attemptSessionRecovery(
    originalInput: string,
    log: Logger
  ): AsyncGenerator<string, void, unknown> {
    // Check if we've already tried recovery
    if (this.recoveryAttempt >= GameSession.MAX_RECOVERY_ATTEMPTS) {
      log.error("Max recovery attempts reached, recovery failed");
      this.sendRecoveryStatus("failed", log);
      return;
    }

    this.recoveryAttempt++;
    log.warn(
      {
        attempt: this.recoveryAttempt,
        agentSessionId: this.stateManager.getState()?.agentSessionId,
      },
      "Starting session recovery"
    );

    // Step 1: Notify user
    this.sendRecoveryStatus("starting", log);

    // Step 2: Clear the invalid session ID
    await this.stateManager.clearAgentSessionId();
    log.info("Cleared invalid session ID");

    // Step 3: Build recovery context from history
    const history = this.stateManager.getHistory();
    const recoveryContext = buildRecoveryContext(history, {
      maxEntries: 20,
      maxChars: 12000,
      includeSummary: true,
    });

    log.info(
      {
        entriesIncluded: recoveryContext.entriesIncluded,
        hasSummary: recoveryContext.hasSummary,
        contextLength: recoveryContext.contextPrompt.length,
      },
      "Recovery context built"
    );

    this.sendRecoveryStatus("context_loaded", log);

    // Step 4: Build recovery prompt with context
    const recoveryPrompt = buildRecoveryPrompt(originalInput, recoveryContext);

    // Step 5: Retry query without resume (generateGMResponse will use null agentSessionId)
    try {
      yield* this.generateGMResponse(recoveryPrompt, log);

      // Reset recovery attempt counter on success
      this.recoveryAttempt = 0;
      this.sendRecoveryStatus("complete", log);
      log.info("Session recovery completed successfully");
    } catch (recoveryError) {
      log.error({ err: recoveryError }, "Recovery attempt failed");
      this.sendRecoveryStatus("failed", log);
      throw recoveryError;
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
   * Returns genre from currentTheme, defaults to "high-fantasy"
   */
  private deriveGenre(state: AdventureState | null): Genre {
    if (!state) return "high-fantasy";
    return state.currentTheme.genre;
  }

  /**
   * Derive region from adventure state.
   * Returns region from currentTheme, defaults to forest.
   */
  private deriveRegion(state: AdventureState | null): Region {
    if (!state) return DEFAULT_REGION;
    return state.currentTheme.region;
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

  /**
   * Minimum number of history entries required for recap.
   * Prevents wasteful recaps on short histories.
   */
  private static readonly MIN_RECAP_ENTRIES = 10;

  /**
   * Handle user-initiated recap request.
   * Forces history compaction, clears session ID for fresh start,
   * and prompts the GM to provide context-specific "what next" guidance.
   *
   * @param requestLogger Optional request-scoped logger for correlation
   */
  async handleRecap(requestLogger?: Logger): Promise<void> {
    const log = requestLogger ?? logger;

    // Guard: Cannot recap while processing
    if (this.isProcessing) {
      log.debug("Recap requested but currently processing");
      this.sendMessage({
        type: "recap_error",
        payload: { reason: "Cannot recap while processing. Wait for the current response to complete." },
      }, log);
      return;
    }

    const history = this.stateManager.getHistory();
    const adventureDir = this.stateManager.getCurrentAdventureDir();

    // Guard: Check minimum history threshold
    if (history.entries.length < GameSession.MIN_RECAP_ENTRIES) {
      log.debug({ entryCount: history.entries.length }, "Not enough history entries for recap");
      this.sendMessage({
        type: "recap_error",
        payload: { reason: "Not enough history to recap. Keep adventuring!" },
      }, log);
      return;
    }

    // Guard: Check adventure directory exists
    if (!adventureDir) {
      log.error("Cannot recap: no adventure directory");
      this.sendMessage({
        type: "recap_error",
        payload: { reason: "Adventure not loaded. Please reload and try again." },
      }, log);
      return;
    }

    log.info({ entryCount: history.entries.length }, "Starting recap");

    // Send recap_started notification
    this.sendMessage({ type: "recap_started" }, log);

    try {
      // Step 0: Force GM to save all state before compaction
      // This ensures no important narrative details are lost
      await this.forceSave(log);

      // Re-fetch history after forceSave (it may have added entries)
      const updatedHistory = this.stateManager.getHistory();

      // Step 1: Force compaction with retainedCount=0 to summarize entire history
      // This clears context for a fresh start while preserving the narrative summary
      // Use useMockSDK() for runtime check instead of env.mockSdk (which is cached at load time)
      const compactor = new HistoryCompactor(adventureDir, {
        retainedCount: 0,
        targetRetainedCharCount: 0,
        model: env.compactionSummaryModel,
        mockSdk: useMockSDK(),
      });

      const compactionResult = await compactor.compact(updatedHistory);

      if (!compactionResult.success) {
        log.warn({ error: compactionResult.error }, "Compaction failed during recap");
        this.sendMessage({
          type: "recap_error",
          payload: { reason: compactionResult.error ?? "Failed to create recap summary." },
        }, log);
        this.sendMessage({
          type: "tool_status",
          payload: { state: "idle", description: "Ready" },
        }, log);
        return;
      }

      // retainedEntries is [] for full recap (retainedCount=0), which is valid
      const retainedEntries = compactionResult.retainedEntries ?? [];

      log.info(
        { entriesArchived: compactionResult.entriesArchived, hasSummary: !!compactionResult.summary },
        "Compaction completed for recap"
      );

      // Step 2: Update history with compacted version
      const newHistory = {
        entries: retainedEntries,
        summary: compactionResult.summary ?? updatedHistory.summary,
      };
      await this.stateManager.replaceHistory(newHistory);

      // Step 3: Clear agent session ID for fresh start
      await this.stateManager.clearAgentSessionId();
      log.info("Cleared agent session ID for fresh recap session");

      // Step 4: Send recap_complete with updated history/summary
      this.sendMessage({
        type: "recap_complete",
        payload: {
          history: newHistory.entries,
          summary: newHistory.summary ?? null,
        },
      }, log);

      // Step 5: Build recap prompt and process through normal flow
      const recapPrompt = this.buildRecapPrompt(newHistory.summary);
      log.debug({ promptLength: recapPrompt.length }, "Sending recap prompt to GM");

      // Process recap prompt (skip sanitization - this is an internal system prompt)
      await this.handleInput(recapPrompt, log, { isSystemPrompt: true });

    } catch (error) {
      log.error({ err: error }, "Recap failed");
      this.sendMessage({
        type: "recap_error",
        payload: { reason: "Recap failed unexpectedly. Please try again." },
      }, log);
      this.sendMessage({
        type: "tool_status",
        payload: { state: "idle", description: "Ready" },
      }, log);
    }
  }

  /**
   * Build the special recap prompt for the new session.
   * Instructs the GM to read current state files and provide
   * context-specific "what next" guidance.
   */
  private buildRecapPrompt(summary: HistorySummary | null | undefined): string {
    const summaryText = summary?.text ?? "No previous summary available.";

    return `[RECAP SESSION - Fresh conversation thread started]

## Adventure Summary
${summaryText}

---

The player has requested a recap. This is a fresh conversation thread with full access to character and world state files.

Please:
1. Read the current state from the player's sheet.md and state.md files
2. Read the world_state.md, quests.md, and locations.md files
3. Provide a brief, engaging narrative summary acknowledging where they are and what they've accomplished
4. Suggest 2-3 clear options for what they might do next
5. Set an appropriate theme for the current situation

Begin your response as if greeting a returning adventurer.`;
  }

  /**
   * Build prompt instructing GM to persist all state before compaction.
   * This ensures no important details are lost when history is archived.
   */
  private buildSaveStatePrompt(): string {
    return `[SYSTEM: STATE CHECKPOINT]

Before the adventure history is archived, please ensure all important details are saved to the appropriate state files.

Review the recent narrative and update:
1. **Player state** (sheet.md, state.md): Any changes to stats, inventory, abilities, conditions, or narrative state
2. **World state** (world_state.md): Any new facts established about the world
3. **Locations** (locations.md): Any new places discovered or changes to known locations
4. **Characters** (characters.md): Any new NPCs met or changes to existing NPCs
5. **Quests** (quests.md): Any quest progress, new objectives, or completed goals

After updating the files, respond with a brief confirmation (1-2 sentences) of what was saved. Do not provide narrative continuation - this is a system checkpoint.`;
  }

  /**
   * Force the GM to save all state to files.
   * Used before history compaction to ensure no important details are lost.
   * Blocks user input during the save operation.
   *
   * @param requestLogger Optional request-scoped logger for correlation
   * @returns Promise that resolves when save is complete
   */
  async forceSave(requestLogger?: Logger): Promise<void> {
    const log = requestLogger ?? logger;

    // Guard: Cannot force save while already processing
    if (this.isProcessing) {
      log.warn("forceSave called while already processing - skipping");
      return;
    }

    log.info("Starting forced state save before compaction");

    // Notify UI that we're saving
    this.sendMessage({
      type: "tool_status",
      payload: { state: "active", description: "Saving progress..." },
    }, log);

    try {
      // Use handleInput to send the save prompt through normal GM flow
      // This sets isProcessing=true, blocking user input
      // Skip sanitization - this is an internal system prompt
      const savePrompt = this.buildSaveStatePrompt();
      await this.handleInput(savePrompt, log, { isSystemPrompt: true });

      log.info("Forced state save completed");
    } catch (error) {
      log.error({ err: error }, "Forced state save failed");
      // Don't throw - compaction can still proceed, we just might lose some detail
    }
  }

  /**
   * Handle PostToolUse hook for panel file operations (REQ-F-8, REQ-F-9, REQ-F-10).
   *
   * Detects panel file writes and deletes via the SDK's PostToolUse hook:
   * - Write tool calls matching `{playerRef}/panels/*.md` trigger panel_create/update
   * - Bash `rm` commands targeting panel files trigger panel_dismiss
   *
   * Invalid frontmatter is logged as warning and panel is skipped (REQ-F-25).
   * Validation errors are stored for delivery to GM next turn (REQ-F-26).
   *
   * @param input - Hook input from SDK (narrowed from HookInput after event check)
   * @param log - Logger for correlation
   * @returns HookJSONOutput indicating whether to continue
   */
  private handlePostToolUse(
    input: HookInput,
    log: Logger
  ): HookJSONOutput {
    // Type guard - should always be PostToolUse due to hook registration
    if (input.hook_event_name !== "PostToolUse") {
      return { continue: true };
    }

    const state = this.stateManager.getState();
    const playerRef = state?.playerRef;

    // Skip if no player ref set (panels directory unknown)
    if (!playerRef || !this.projectDirectory) {
      return { continue: true };
    }

    const { tool_name, tool_input } = input;

    // Handle Write tool - check if writing to panel file
    if (tool_name === "Write") {
      const writeInput = tool_input as { file_path?: string; content?: string };
      const filePath = writeInput.file_path;

      if (filePath && isPanelPath(filePath, playerRef)) {
        log.debug({ filePath }, "Panel file write detected");
        this.handlePanelFileWrite(filePath, log);
      }
    }

    // Handle Bash tool - check for rm commands and verify filesystem state
    if (tool_name === "Bash") {
      const bashInput = tool_input as { command?: string };
      const command = bashInput.command;

      if (command) {
        // Match rm commands targeting panel files
        // Patterns: rm path, rm -f path, rm -rf path, etc.
        const rmMatch = command.match(/\brm\s+(?:-[rfiv]+\s+)?([^\s;|&]+)/);
        if (rmMatch) {
          const targetPath = rmMatch[1];
          // Check if it looks like a panel path
          if (targetPath && isPanelPath(targetPath, playerRef)) {
            log.debug({ targetPath, command }, "Panel file rm command detected");
            this.handlePanelFileDelete(targetPath, log);
          }
        }

        // Verify filesystem state for all known panels (TASK-004 criteria 4 & 5)
        // This handles edge cases like `rm -rf panels/`, `find ... -delete`, etc.
        if (command.includes("panels") || command.includes("rm") || command.includes("delete") || command.includes("mv")) {
          this.verifyPanelFilesystemState(playerRef, log);
        }
      }
    }

    return { continue: true };
  }

  /**
   * Verify that all known panels still exist on disk.
   * Emits panel_dismiss for any panels that have been removed (TASK-004).
   *
   * @param playerRef - Player reference path (e.g., "players/kael-thouls")
   * @param log - Logger for correlation
   */
  private verifyPanelFilesystemState(playerRef: string, log: Logger): void {
    if (!this.projectDirectory || this.knownPanelIds.size === 0) {
      return;
    }

    const panelsDir = join(this.projectDirectory, playerRef, "panels");
    const deletedPanels: string[] = [];

    for (const panelId of this.knownPanelIds) {
      const panelPath = join(panelsDir, `${panelId}.md`);
      if (!existsSync(panelPath)) {
        deletedPanels.push(panelId);
      }
    }

    // Emit panel_dismiss for deleted panels
    for (const panelId of deletedPanels) {
      log.debug({ panelId }, "Panel file no longer exists on disk");
      this.sendMessage(
        {
          type: "panel_dismiss",
          payload: { id: panelId },
        },
        log
      );
      this.knownPanelIds.delete(panelId);
    }

    if (deletedPanels.length > 0) {
      log.info(
        { deletedCount: deletedPanels.length, deletedPanels },
        "Detected deleted panels via filesystem verification"
      );
    }
  }

  /**
   * Handle a panel file write operation.
   * Reads the file, parses frontmatter, and emits panel_create or panel_update.
   *
   * @param filePath - Path to the written panel file
   * @param log - Logger for correlation
   */
  private handlePanelFileWrite(filePath: string, log: Logger): void {
    // Derive panel ID from filename
    const idResult = derivePanelId(filePath);
    if (!idResult.success) {
      log.warn({ filePath, error: idResult.error }, "Invalid panel file name");
      this.panelValidationErrors.push(
        `Panel file validation failed: ${filePath} - ${idResult.error}`
      );
      return;
    }
    const panelId = idResult.id;

    // Construct absolute path if needed
    const absolutePath = filePath.startsWith("/")
      ? filePath
      : join(this.projectDirectory!, filePath);

    // Read the file content
    let content: string;
    try {
      content = readFileSync(absolutePath, "utf-8");
    } catch (error) {
      log.warn({ filePath, err: error }, "Failed to read panel file");
      this.panelValidationErrors.push(
        `Panel file validation failed: ${filePath} - Could not read file`
      );
      return;
    }

    // Parse frontmatter
    const parseResult = parsePanelFile(content);
    if (!parseResult.success) {
      log.warn({ filePath, error: parseResult.error }, "Invalid panel frontmatter");
      this.panelValidationErrors.push(
        `Panel file validation failed: ${filePath} - ${parseResult.error}`
      );
      return;
    }

    const { frontmatter, body } = parseResult.data;

    // Get file creation time for ordering (REQ-F-14)
    let createdAt: string;
    try {
      const stats = statSync(absolutePath);
      createdAt = stats.birthtime.toISOString();
    } catch {
      createdAt = new Date().toISOString();
    }

    // Check if this is a new panel or an update
    const isNewPanel = !this.knownPanelIds.has(panelId);

    if (isNewPanel) {
      // Emit panel_create with full Panel object
      const panel = {
        id: panelId,
        title: frontmatter.title,
        content: body,
        position: frontmatter.position,
        priority: frontmatter.priority, // For frontend priority-based sorting (REQ-F-13)
        persistent: true, // All file-based panels are persistent (REQ-F-11)
        createdAt,
      };

      this.sendMessage(
        {
          type: "panel_create",
          payload: panel,
        },
        log
      );

      // Track as known panel
      this.knownPanelIds.add(panelId);
      log.debug({ panelId, position: frontmatter.position }, "Panel created from file");
    } else {
      // Emit panel_update with just id and content
      this.sendMessage(
        {
          type: "panel_update",
          payload: { id: panelId, content: body },
        },
        log
      );

      log.debug({ panelId }, "Panel updated from file");
    }
  }

  /**
   * Handle a panel file delete operation.
   * Emits panel_dismiss for the deleted panel.
   *
   * @param filePath - Path to the deleted panel file
   * @param log - Logger for correlation
   */
  private handlePanelFileDelete(filePath: string, log: Logger): void {
    // Derive panel ID from filename
    const idResult = derivePanelId(filePath);
    if (!idResult.success) {
      log.warn({ filePath, error: idResult.error }, "Invalid panel file name for delete");
      return;
    }
    const panelId = idResult.id;

    // Only emit dismiss if we know about this panel
    if (!this.knownPanelIds.has(panelId)) {
      log.debug({ panelId }, "Panel delete ignored - not in known panels");
      return;
    }

    // Emit panel_dismiss
    this.sendMessage(
      {
        type: "panel_dismiss",
        payload: { id: panelId },
      },
      log
    );

    // Remove from known panels
    this.knownPanelIds.delete(panelId);
    log.debug({ panelId }, "Panel dismissed from file delete");
  }

  /**
   * Abort the current GM response.
   * Interrupts the active query and clears the input queue.
   * @returns Result indicating success and the aborted message ID
   */
  abort(): { success: boolean; messageId: string | null } {
    // Nothing to abort if not processing
    if (!this.isProcessing) {
      logger.debug("Abort requested but not processing");
      return { success: false, messageId: null };
    }

    const messageId = this.currentMessageId;
    logger.info({ messageId }, "Aborting current query");

    // Signal abort to the query loop
    if (this.abortController) {
      this.abortController.abort();
    }

    // Clear the input queue to prevent processing queued inputs
    const queuedCount = this.inputQueue.length;
    this.inputQueue = [];
    if (queuedCount > 0) {
      logger.debug({ clearedCount: queuedCount }, "Cleared input queue on abort");
    }

    return { success: true, messageId };
  }
}
