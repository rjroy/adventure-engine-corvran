// Hono Server with WebSocket Support for Adventure Engine
// Implements REST endpoints for adventure management and WebSocket upgrade

import { Hono } from "hono";
import { logger, createRequestLogger } from "./logger";
import { env } from "./env";
import { createBunWebSocket } from "hono/bun";
import { serveStatic } from "hono/bun";
import type { WSContext } from "hono/ws";
import { AdventureStateManager } from "./adventure-state";
import { GameSession } from "./game-session";
import type { ClientMessage, ServerMessage } from "./types/protocol";
import { parseClientMessage, formatValidationError } from "./types/protocol";
import {
  mapStateError,
  logError,
  createErrorPayload,
} from "./error-handler";
import { BackgroundImageService } from "./services/background-image";
import { ImageCatalogService } from "./services/image-catalog";
import { ImageGeneratorService } from "./services/image-generator";
import {
  validateAdventureId,
  safeResolvePath,
  MAX_INPUT_LENGTH,
} from "./validation";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

// WebSocket connection tracking
interface WSConnection {
  ws: WSContext;
  adventureId: string;
  sessionToken: string | null; // null until authenticated
  authenticated: boolean;
  lastPing: number;
  gameSession: GameSession | null;
}

// Use connection ID - generated on connect, tracks pending connections
const connections = new Map<string, WSConnection>();

// Generate unique connection ID
let connectionCounter = 0;
function generateConnectionId(): string {
  return `conn_${++connectionCounter}_${Date.now()}`;
}

// Create Bun WebSocket adapter
const { upgradeWebSocket, websocket } = createBunWebSocket();

// Initialize Hono app
const app = new Hono();

// Adventures directory - uses validated env config
const ADVENTURES_DIR = env.adventuresDir;

// Allowed origins for WebSocket CSRF protection
// Configurable via comma-separated ALLOWED_ORIGINS env var
const DEFAULT_ORIGINS = ["http://localhost:5173", "http://localhost:3000"];
const ALLOWED_ORIGINS: Set<string> = new Set(
  process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : DEFAULT_ORIGINS
);

// Maximum concurrent WebSocket connections
// Prevents resource exhaustion from runaway clients or malicious actors
const DEFAULT_MAX_CONNECTIONS = 100;
const parsedMaxConnections = process.env.MAX_CONNECTIONS
  ? parseInt(process.env.MAX_CONNECTIONS, 10)
  : DEFAULT_MAX_CONNECTIONS;
const MAX_CONNECTIONS: number =
  !isNaN(parsedMaxConnections) && parsedMaxConnections > 0
    ? parsedMaxConnections
    : DEFAULT_MAX_CONNECTIONS;

/**
 * Validate Origin header for WebSocket CSRF protection
 * Returns true if origin is allowed, false otherwise
 */
function isAllowedOrigin(origin: string | undefined): boolean {
  // Origin header is required for browser WebSocket connections
  // Non-browser clients (curl, etc.) may not send Origin - reject them
  if (!origin) {
    return false;
  }
  return ALLOWED_ORIGINS.has(origin);
}

// Shared AdventureStateManager instance
// In production, this could be dependency-injected for better testability
const stateManager = new AdventureStateManager(ADVENTURES_DIR);

// Background image services - catalog-first strategy for image retrieval
const imageCatalogService = new ImageCatalogService();
const imageGeneratorService = new ImageGeneratorService();
const backgroundImageService = new BackgroundImageService(
  imageCatalogService,
  imageGeneratorService,
  {
    baseUrl: "/backgrounds",
    verbose: true,
  }
);

// Initialize image generator service
try {
  imageGeneratorService.initialize();
} catch (err) {
  logger.warn({ err }, "Image generator initialization failed");
  logger.warn("Image generation will be unavailable, catalog/fallback only");
}

// Health check (used by launch script to verify server is ready)
app.get("/api/health", (c) => c.text("Adventure Engine Backend"));

/**
 * GET /api/adventures
 * List all available adventures with metadata for selection UI
 * Returns array of adventure summaries (no authentication required)
 */
app.get("/api/adventures", async (c) => {
  try {
    // List all directories in adventures folder
    const entries = await readdir(ADVENTURES_DIR, { withFileTypes: true });
    const adventureDirs = entries.filter((e) => e.isDirectory());

    // Load state.json from each adventure directory
    const adventures = await Promise.all(
      adventureDirs.map(async (dir) => {
        // Validate directory name to prevent path traversal (defense-in-depth)
        const validation = validateAdventureId(dir.name);
        if (!validation.valid) {
          return null;
        }

        const safePath = safeResolvePath(ADVENTURES_DIR, dir.name);
        if (safePath === null) {
          return null;
        }

        const statePath = join(safePath, "state.json");
        try {
          const stateContent = await readFile(statePath, "utf-8");
          const state = JSON.parse(stateContent) as {
            id: string;
            sessionToken: string;
            createdAt: string;
            lastActiveAt: string;
            currentScene: { description: string; location: string };
            currentTheme?: { backgroundUrl: string | null };
          };

          return {
            id: state.id,
            sessionToken: state.sessionToken,
            createdAt: state.createdAt,
            lastActiveAt: state.lastActiveAt,
            currentScene: state.currentScene,
            backgroundUrl: state.currentTheme?.backgroundUrl ?? null,
          };
        } catch {
          // Skip adventures with invalid/missing state
          return null;
        }
      })
    );

    // Filter out failed loads and sort by lastActiveAt (most recent first)
    const validAdventures = adventures
      .filter((a): a is NonNullable<typeof a> => a !== null)
      .sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime());

    return c.json({ adventures: validAdventures });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      // Adventures directory doesn't exist yet
      return c.json({ adventures: [] });
    }

    logger.error({ err: error }, "Failed to list adventures");
    return c.json(
      {
        error: "Failed to list adventures",
        message: (error as Error).message,
      },
      500
    );
  }
});

// REST Endpoints

/**
 * POST /adventure/new
 * Create a new adventure and return its ID and session token
 */
app.post("/adventure/new", async (c) => {
  try {
    const state = await stateManager.create();

    return c.json({
      adventureId: state.id,
      sessionToken: state.sessionToken,
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to create adventure");
    return c.json(
      {
        error: "Failed to create adventure",
        message: (error as Error).message,
      },
      500
    );
  }
});

/**
 * GET /adventure/:id
 * Get adventure metadata (does NOT require authentication)
 * Reads state file directly to avoid token validation
 */
app.get("/adventure/:id", async (c) => {
  const id = c.req.param("id");

  // Validate adventure ID to prevent path traversal
  const validation = validateAdventureId(id);
  if (!validation.valid) {
    return c.json(
      {
        error: "Invalid adventure ID",
        message: validation.error,
      },
      400
    );
  }

  // Defense-in-depth: verify path stays within adventures directory
  const safePath = safeResolvePath(ADVENTURES_DIR, id);
  if (safePath === null) {
    return c.json(
      {
        error: "Invalid adventure ID",
        message: "Path traversal detected",
      },
      400
    );
  }

  const statePath = join(safePath, "state.json");

  try {
    const stateContent = await readFile(statePath, "utf-8");
    const state = JSON.parse(stateContent) as {
      id: string;
      createdAt: string;
      lastActiveAt: string;
      currentScene: { description: string };
    };

    return c.json({
      id: state.id,
      createdAt: state.createdAt,
      lastActiveAt: state.lastActiveAt,
      currentScene: state.currentScene,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return c.json(
        {
          error: "Adventure not found",
          adventureId: id,
        },
        404
      );
    }

    return c.json(
      {
        error: "Failed to load adventure",
        message: (error as Error).message,
      },
      500
    );
  }
});

/**
 * GET /ws
 * WebSocket upgrade endpoint with adventureId in query
 * Token is sent via 'authenticate' message after connection (not in URL for security)
 * Query params: adventureId
 *
 * CSRF Protection: Validates Origin header before upgrade to prevent
 * cross-site WebSocket hijacking attacks.
 */
app.get(
  "/ws",
  // CSRF protection middleware - validates Origin before WebSocket upgrade
  async (c, next) => {
    const origin = c.req.header("origin");
    if (!isAllowedOrigin(origin)) {
      logger.warn({ origin }, "WebSocket upgrade rejected - invalid origin");
      return c.text("Forbidden - invalid origin", 403);
    }
    return next();
  },
  upgradeWebSocket((c) => {
    // adventureId in query string (not sensitive), token sent via message
    const adventureId = c.req.query("adventureId");
    // Generate unique connection ID for this connection
    const connId = generateConnectionId();

    // Validate required params
    if (!adventureId) {
      logger.warn("WebSocket upgrade missing adventureId");
    }

    return {
      onOpen(_event, ws) {
        logger.info({ adventureId, connId }, "WebSocket opened");

        // Check connection limit before accepting
        if (connections.size >= MAX_CONNECTIONS) {
          logger.warn(
            { adventureId, connId, currentConnections: connections.size, maxConnections: MAX_CONNECTIONS },
            "Connection rejected - max connections reached"
          );
          const errorMsg: ServerMessage = {
            type: "error",
            payload: {
              code: "GM_ERROR",
              message: "Server at capacity. Please try again later.",
              retryable: true,
            },
          };
          ws.send(JSON.stringify(errorMsg));
          ws.close(1013, "Server at capacity");
          return;
        }

        // Validate adventureId (token comes via message)
        if (!adventureId) {
          const errorMsg: ServerMessage = {
            type: "error",
            payload: {
              code: "INVALID_TOKEN",
              message: "Missing adventureId",
              retryable: false,
            },
          };
          ws.send(JSON.stringify(errorMsg));
          ws.close(1008, "Missing adventureId parameter");
          return;
        }

        // Validate adventure ID format to prevent path traversal
        const validation = validateAdventureId(adventureId);
        if (!validation.valid) {
          const errorMsg: ServerMessage = {
            type: "error",
            payload: {
              code: "INVALID_TOKEN",
              message: validation.error || "Invalid adventure ID",
              retryable: false,
            },
          };
          ws.send(JSON.stringify(errorMsg));
          ws.close(1008, "Invalid adventureId parameter");
          return;
        }

        // Store connection in pending state (not authenticated yet)
        connections.set(connId, {
          ws,
          adventureId,
          sessionToken: null,
          authenticated: false,
          lastPing: Date.now(),
          gameSession: null,
        });
      },

      onMessage(event, ws) {
        // Look up connection using captured connId from closure
        const conn = connections.get(connId);

        if (!conn) {
          logger.warn({ connId }, "Message from untracked connection");
          ws.close(1008, "Connection not found");
          return;
        }

        // Parse and validate message
        let message: ClientMessage;
        try {
          // Handle different data types from WebSocket
          let dataString: string;
          if (typeof event.data === "string") {
            dataString = event.data;
          } else if (event.data instanceof Blob) {
            // For Blob, we'd need to await text(), but that's async
            // For now, reject Blob messages
            throw new Error("Blob messages not supported");
          } else if (event.data instanceof ArrayBuffer) {
            dataString = new TextDecoder().decode(event.data);
          } else {
            throw new Error("Unsupported message type");
          }

          // Parse JSON and validate against schema
          const parsed: unknown = JSON.parse(dataString);
          const result = parseClientMessage(parsed);

          if (!result.success) {
            logger.warn(
              { connId, error: formatValidationError(result.error) },
              "Invalid client message schema"
            );
            const errorMsg: ServerMessage = {
              type: "error",
              payload: {
                code: "GM_ERROR",
                message: "Invalid message format",
                retryable: false,
              },
            };
            ws.send(JSON.stringify(errorMsg));
            return;
          }

          message = result.data;
        } catch (error) {
          logger.error({ err: error, connId }, "Failed to parse client message");
          const errorMsg: ServerMessage = {
            type: "error",
            payload: {
              code: "GM_ERROR",
              message: "Invalid message format",
              retryable: false,
            },
          };
          ws.send(JSON.stringify(errorMsg));
          return;
        }

        // Handle message types
        switch (message.type) {
          case "authenticate": {
            // Handle authentication (token sent via message, not URL)
            if (conn.authenticated) {
              logger.debug({ connId }, "Already authenticated, ignoring duplicate authenticate message");
              break;
            }

            const token = message.payload.token;
            if (!token) {
              const errorMsg: ServerMessage = {
                type: "error",
                payload: {
                  code: "INVALID_TOKEN",
                  message: "Missing token in authenticate message",
                  retryable: false,
                },
              };
              ws.send(JSON.stringify(errorMsg));
              ws.close(1008, "Missing token");
              connections.delete(connId);
              return;
            }

            // Store token and validate asynchronously
            conn.sessionToken = token;
            connections.set(connId, conn);

            // Validate adventure and token, initialize GameSession
            void validateAndLoadAdventure(ws, conn.adventureId, token, connId);
            break;
          }

          case "ping": {
            conn.lastPing = Date.now();
            connections.set(connId, conn);
            const pong: ServerMessage = { type: "pong" };
            ws.send(JSON.stringify(pong));
            break;
          }

          case "player_input": {
            // Early length check for defense-in-depth (fail fast)
            if (message.payload.text.length > MAX_INPUT_LENGTH) {
              const errorMsg: ServerMessage = {
                type: "error",
                payload: {
                  code: "GM_ERROR",
                  message: `Input too long. Please keep under ${MAX_INPUT_LENGTH} characters.`,
                  retryable: true,
                },
              };
              ws.send(JSON.stringify(errorMsg));
              break;
            }

            // Require authentication for player input
            if (!conn.authenticated) {
              logger.warn({ connId }, "Player input received before authentication");
              const errorMsg: ServerMessage = {
                type: "error",
                payload: {
                  code: "INVALID_TOKEN",
                  message: "Not authenticated. Send authenticate message first.",
                  retryable: true,
                },
              };
              ws.send(JSON.stringify(errorMsg));
              break;
            }

            // Handle player input through GameSession
            if (!conn.gameSession) {
              logger.warn({ connId, adventureId: conn.adventureId }, "Player input received before GameSession initialized");
              const errorMsg: ServerMessage = {
                type: "error",
                payload: {
                  code: "GM_ERROR",
                  message: "Session not ready. Please wait a moment and try again.",
                  retryable: true,
                },
              };
              ws.send(JSON.stringify(errorMsg));
              break;
            }

            // Create request-scoped logger for correlation across all logs from this input
            const { logger: reqLogger } = createRequestLogger(connId, conn.adventureId);
            reqLogger.info({ inputLength: message.payload.text.length }, "Processing player input");

            // Process input through game session (async, don't await)
            void conn.gameSession.handleInput(message.payload.text, reqLogger);
            break;
          }

          case "start_adventure":
            // Adventure is loaded via authenticate message flow
            // This message type can be used for restarting or other future functionality
            if (conn.authenticated) {
              logger.debug({ connId, adventureId: conn.adventureId }, "Received start_adventure (adventure already loaded)");
            }
            break;

          default:
            logger.warn({ connId, messageType: (message as { type: string }).type }, "Unknown message type");
        }
      },

      onClose(event, _ws) {
        // Remove connection using captured connId
        const conn = connections.get(connId);
        if (conn) {
          logger.info(
            { adventureId: conn.adventureId, connId, code: event.code, reason: event.reason },
            "WebSocket closed"
          );
          connections.delete(connId);
        }
      },

      onError(event, _ws) {
        logger.error({ adventureId, connId, error: event }, "WebSocket error");
      },
    };
  })
);

/**
 * Validate adventure and token, load state, and send confirmation to client
 * Called when client sends authenticate message
 */
async function validateAndLoadAdventure(
  ws: WSContext,
  adventureId: string,
  token: string,
  connId: string
): Promise<void> {
  const result = await stateManager.load(adventureId, token);

  if (!result.success) {
    // Map state error to error details
    const errorDetails = mapStateError(
      result.error.type,
      result.error.message,
      result.error.type === "CORRUPTED" ? result.error.path : undefined
    );

    // Log error with context (REQ-F-28)
    logError("validateAndLoadAdventure", errorDetails, {
      adventureId,
      hasToken: !!token,
    });

    // Create error payload for client
    const errorPayload = createErrorPayload(errorDetails);

    const errorMsg: ServerMessage = {
      type: "error",
      payload: errorPayload,
    };

    ws.send(JSON.stringify(errorMsg));
    ws.close(1008, "Authentication failed");
    connections.delete(connId);
    return;
  }

  // Mark connection as authenticated and initialize GameSession
  const conn = connections.get(connId);
  if (conn) {
    conn.authenticated = true;
    const gameSession = new GameSession(ws, stateManager, backgroundImageService);
    const initResult = await gameSession.initialize(adventureId, token);
    if (initResult.success) {
      conn.gameSession = gameSession;
      // Update connection in map with authenticated status and gameSession
      connections.set(connId, conn);
      logger.info({ adventureId, connId }, "GameSession initialized");
    } else {
      logger.error({ adventureId, connId, error: initResult.error }, "Failed to initialize GameSession");

      // Send error to client
      const errorMsg: ServerMessage = {
        type: "error",
        payload: {
          code: "GM_ERROR",
          message: `Failed to initialize game session: ${initResult.error}`,
          retryable: false,
        },
      };
      ws.send(JSON.stringify(errorMsg));
      ws.close(1011, "GameSession initialization failed");
      connections.delete(connId);
      return;
    }
  }

  // Send adventure loaded confirmation with history and optional summary
  const loadedMsg: ServerMessage = {
    type: "adventure_loaded",
    payload: {
      adventureId: result.state.id,
      history: result.history.entries,
      summary: result.history.summary ?? null,
    },
  };

  ws.send(JSON.stringify(loadedMsg));

  // Send authenticated confirmation
  const authenticatedMsg: ServerMessage = {
    type: "authenticated",
    payload: { adventureId: result.state.id },
  };
  ws.send(JSON.stringify(authenticatedMsg));
  logger.debug({ adventureId, connId }, "Sent authenticated confirmation");

  // Send stored theme from state (or defaults for migrated adventures)
  const theme = result.state.currentTheme;
  const initialTheme: ServerMessage = {
    type: "theme_change",
    payload: {
      mood: theme.mood,
      genre: theme.genre,
      region: theme.region,
      backgroundUrl: theme.backgroundUrl,
    },
  };
  ws.send(JSON.stringify(initialTheme));
  logger.debug({ adventureId, mood: theme.mood }, "Sent stored theme");

  // For new adventures (empty history), trigger initial GM response
  if (result.history.entries.length === 0) {
    logger.info({ adventureId }, "New adventure detected, triggering initial GM response");
    const conn = connections.get(connId);
    if (conn?.gameSession) {
      // Create request-scoped logger for the initial input
      const { logger: reqLogger } = createRequestLogger(connId, adventureId);
      // Trigger initial GM response with character/world setup prompt
      void conn.gameSession.handleInput("help me with my character and world", reqLogger);
    }
  }
}

// Serve static frontend files - uses validated env config
const STATIC_ROOT = env.staticRoot;

// Serve background images at /backgrounds/*
// This must come before SPA fallback to avoid conflicts
app.use("/backgrounds/*", serveStatic({ root: env.backgroundsDir, rewriteRequestPath: (path) => path.replace(/^\/backgrounds/, "") }));

// Serve static assets (JS, CSS, images, etc.)
app.use("/assets/*", serveStatic({ root: STATIC_ROOT }));

// Serve index.html for all other routes (SPA fallback)
app.get("*", serveStatic({ root: STATIC_ROOT, path: "index.html" }));

// Heartbeat monitoring
// Check for stale connections every 30 seconds
const HEARTBEAT_INTERVAL = 30_000;
const HEARTBEAT_TIMEOUT = 60_000;

const heartbeatInterval = setInterval(() => {
  const now = Date.now();
  for (const [connId, conn] of connections.entries()) {
    if (now - conn.lastPing > HEARTBEAT_TIMEOUT) {
      logger.info({ adventureId: conn.adventureId, connId }, "Closing stale connection");
      conn.ws.close(1000, "Heartbeat timeout");
      connections.delete(connId);
    }
  }
}, HEARTBEAT_INTERVAL);

// Export for Bun server
export default {
  fetch: app.fetch,
  websocket,
};

/**
 * Get current connection count (for monitoring and testing)
 */
function getConnectionCount(): number {
  return connections.size;
}

/**
 * Drain all WebSocket connections during graceful shutdown.
 * Sends shutdown message to clients before closing.
 * @param reason Close reason string
 */
function drainConnections(reason: string): void {
  for (const [connId, conn] of connections.entries()) {
    logger.debug({ connId, adventureId: conn.adventureId }, "Draining connection");
    try {
      const shutdownMsg: ServerMessage = {
        type: "error",
        payload: {
          code: "SERVER_SHUTDOWN",
          message: "Server is shutting down. Please reconnect.",
          retryable: true,
        },
      };
      conn.ws.send(JSON.stringify(shutdownMsg));
      conn.ws.close(1012, reason); // 1012 = Service Restart
    } catch {
      // Ignore errors during shutdown - connection may already be closed
    }
    connections.delete(connId);
  }
}

// Export for testing and shutdown
export {
  app,
  connections,
  isAllowedOrigin,
  ALLOWED_ORIGINS,
  MAX_CONNECTIONS,
  getConnectionCount,
  heartbeatInterval,
  imageGeneratorService,
  drainConnections,
};
