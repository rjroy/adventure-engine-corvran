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
import type { ServerMessage, NarrativeEntry, ThemeMood, Genre, Region } from "./types/protocol";
import { buildGMSystemPrompt, createThemeMcpServer } from "./gm-prompt";
import {
  mapSDKError,
  mapGenericError,
  createErrorPayload,
  type ErrorDetails,
} from "./error-handler";
import { mockQuery } from "./mock-sdk";
import type { BackgroundImageService } from "./services/background-image";
import { sanitizePlayerInput } from "./validation";

// Check if we're in mock mode (for E2E testing)
// Use function instead of const to check at runtime, avoiding module cache issues
function useMockSDK(): boolean {
  return process.env.MOCK_SDK === "true";
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

        // Process this input with its associated logger
        await this.processInput(queuedInput.text, queuedInput.logger);
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
        options: { systemPrompt },
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

    // Create MCP server for set_theme tool with callback to handle theme changes
    const themeMcpServer = createThemeMcpServer(
      async (mood, genre, region, forceGenerate, imagePrompt) => {
        log.debug({ mood, genre, region }, "MCP callback invoked");
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
          log.debug({ mood }, "MCP callback completed successfully");
        } catch (error) {
          log.error({ err: error, mood }, "MCP callback error");
          throw error;
        }
      }
    );

    // Query Claude Agent SDK with resume for conversation continuity
    const sdkQuery = query({
      prompt: input,
      options: {
        resume: state.agentSessionId ?? undefined, // Resume conversation if available
        systemPrompt,
        // Provide set_theme tool via MCP server (keyed by server name)
        mcpServers: { "adventure-theme": themeMcpServer },
        // SDK provides tools by default; allowedTools filters to what we need
        allowedTools: ["Read", "Write", "Glob", "Grep", "mcp__adventure-theme__set_theme"],
        cwd: this.projectDirectory,
        includePartialMessages: true, // Enable token streaming
        permissionMode: "acceptEdits", // Auto-accept file edits within sandbox
        model: "claude-sonnet-4-5", // Use latest Sonnet for quality
        maxTurns: 15, // Allow multiple file reads/writes + response
      },
    });

    // Process SDK messages and extract text content
    let assistantText = "";
    let newAgentSessionId: string | null = null;

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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (event.type === "content_block_delta") {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (event.delta?.type === "text_delta") {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const chunk = event.delta.text as string;
            assistantText += chunk;
            yield chunk;
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

          // Log tool_use blocks for debugging (MCP server handles set_theme automatically)
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (block.type === "tool_use") {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            log.debug({ toolName: block.name, input: block.input }, "Tool use detected");
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
   * Derive region from adventure state
   * Checks currentScene.location for region hints, defaults to "forest"
   */
  private deriveRegion(state: AdventureState | null): Region {
    if (!state) return "forest";

    const location = state.currentScene.location.toLowerCase();

    // Simple keyword matching for region detection
    if (location.includes("city") || location.includes("town")) return "city";
    if (location.includes("village") || location.includes("hamlet")) return "village";
    if (location.includes("forest") || location.includes("woods")) return "forest";
    if (location.includes("desert") || location.includes("sand")) return "desert";
    if (location.includes("mountain") || location.includes("peak")) return "mountain";
    if (location.includes("ocean") || location.includes("sea")) return "ocean";
    if (location.includes("underground") || location.includes("cave") || location.includes("dungeon")) return "underground";
    if (location.includes("castle") || location.includes("palace")) return "castle";
    if (location.includes("ruins") || location.includes("ancient")) return "ruins";

    // Default to forest
    return "forest";
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
