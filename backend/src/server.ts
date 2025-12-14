// Hono Server with WebSocket Support for Adventure Engine
// Implements REST endpoints for adventure management and WebSocket upgrade

import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import { serveStatic } from "hono/bun";
import type { WSContext } from "hono/ws";
import { AdventureStateManager } from "./adventure-state";
import { GameSession } from "./game-session";
import type { ClientMessage, ServerMessage } from "./types/protocol";
import {
  mapStateError,
  logError,
  createErrorPayload,
} from "./error-handler";
import { BackgroundImageService } from "./services/background-image";
import { ImageCatalogService } from "./services/image-catalog";
import { ImageGeneratorService } from "./services/image-generator";

// WebSocket connection tracking
interface WSConnection {
  ws: WSContext;
  adventureId: string;
  sessionToken: string;
  lastPing: number;
  gameSession: GameSession | null;
}

// Use connection ID instead of ws object as key (ws reference may differ between callbacks)
const connections = new Map<string, WSConnection>();

// Generate connection ID from adventure ID and token
function getConnectionId(adventureId: string, token: string): string {
  return `${adventureId}:${token}`;
}

// Create Bun WebSocket adapter
const { upgradeWebSocket, websocket } = createBunWebSocket();

// Initialize Hono app
const app = new Hono();

// Adventures directory - configurable via environment for testing
const ADVENTURES_DIR = process.env.ADVENTURES_DIR || "./adventures";

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
    baseUrl: "http://localhost:3000/backgrounds",
    verbose: true,
  }
);

// Initialize image generator service (async)
imageGeneratorService.initialize().catch((err) => {
  console.warn("[Server] Image generator initialization failed:", err);
  console.warn("[Server] Image generation will be unavailable, catalog/fallback only");
});

// Health check (used by launch script to verify server is ready)
app.get("/api/health", (c) => c.text("Adventure Engine Backend"));

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
    console.error("Failed to create adventure:", error);
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
  const { join } = await import("node:path");
  const { readFile } = await import("node:fs/promises");

  const statePath = join(ADVENTURES_DIR, id, "state.json");

  try {
    const stateContent = await readFile(statePath, "utf-8");
    const state = JSON.parse(stateContent) as {
      id: string;
      createdAt: string;
      lastActiveAt: string;
      currentScene: { description: string; location: string };
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
 * WebSocket upgrade endpoint with token and adventureId validation
 * Query params: token, adventureId
 */
app.get(
  "/ws",
  upgradeWebSocket((c) => {
    // Extract query params
    const token = c.req.query("token");
    const adventureId = c.req.query("adventureId");

    // Validate required params
    if (!token || !adventureId) {
      // Note: We can't send a proper error response here because
      // the upgrade has already started. The connection will be closed
      // in onOpen after validation.
      console.warn("WebSocket upgrade missing required params:", {
        token: !!token,
        adventureId: !!adventureId,
      });
    }

    return {
      onOpen(event, ws) {
        console.log("WebSocket opened:", { adventureId, hasToken: !!token });

        // Validate params (deferred from upgrade handler)
        if (!token || !adventureId) {
          const errorMsg: ServerMessage = {
            type: "error",
            payload: {
              code: "INVALID_TOKEN",
              message: "Missing token or adventureId",
              retryable: false,
            },
          };
          ws.send(JSON.stringify(errorMsg));
          ws.close(1008, "Missing authentication parameters");
          return;
        }

        // Store connection info with null game session (will be initialized after validation)
        const connId = getConnectionId(adventureId, token);
        connections.set(connId, {
          ws,
          adventureId,
          sessionToken: token,
          lastPing: Date.now(),
          gameSession: null,
        });

        // Validate adventure and token asynchronously, then initialize GameSession
        // Note: We do this in the background to avoid blocking onOpen
        void validateAndLoadAdventure(ws, adventureId, token, connId);
      },

      onMessage(event, ws) {
        // Look up connection using ID from closure (adventureId and token are captured)
        const connId = token && adventureId ? getConnectionId(adventureId, token) : null;
        const conn = connId ? connections.get(connId) : null;
        if (!conn) {
          console.warn("Message from untracked connection", { connId, hasToken: !!token, hasAdventureId: !!adventureId });
          ws.close(1008, "Connection not authenticated");
          return;
        }

        // Parse message
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
          message = JSON.parse(dataString) as ClientMessage;
        } catch (error) {
          console.error("Failed to parse client message:", error);
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
          case "ping": {
            conn.lastPing = Date.now();
            // Update in map since we modified lastPing
            if (connId) connections.set(connId, conn);
            const pong: ServerMessage = { type: "pong" };
            ws.send(JSON.stringify(pong));
            break;
          }

          case "player_input": {
            // Handle player input through GameSession
            if (!conn.gameSession) {
              console.warn("Player input received before GameSession initialized");
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

            // Process input through game session (async, don't await)
            void conn.gameSession.handleInput(message.payload.text);
            break;
          }

          case "start_adventure":
            // Adventure is already started via validateAndLoadAdventure
            // This message type can be used for restarting or other future functionality
            console.log("Received start_adventure (adventure already loaded)");
            break;

          default:
            console.warn("Unknown message type:", message);
        }
      },

      onClose(event, _ws) {
        const connId = token && adventureId ? getConnectionId(adventureId, token) : null;
        if (connId) {
          const conn = connections.get(connId);
          if (conn) {
            console.log("WebSocket closed:", {
              adventureId: conn.adventureId,
              code: event.code,
              reason: event.reason,
            });
            connections.delete(connId);
          }
        }
      },

      onError(event, _ws) {
        const connId = token && adventureId ? getConnectionId(adventureId, token) : null;
        const conn = connId ? connections.get(connId) : null;
        console.error("WebSocket error:", {
          adventureId: conn?.adventureId ?? adventureId,
          error: event,
        });
      },
    };
  })
);

/**
 * Validate adventure and token, load state, and send confirmation to client
 */
async function validateAndLoadAdventure(
  ws: WSContext,
  adventureId: string,
  token: string,
  connId: string
): Promise<void> {
  const manager = new AdventureStateManager();
  const result = await manager.load(adventureId, token);

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

  // Initialize GameSession for this connection
  const conn = connections.get(connId);
  if (conn) {
    const gameSession = new GameSession(ws, backgroundImageService);
    const initResult = await gameSession.initialize(adventureId, token);
    if (initResult.success) {
      conn.gameSession = gameSession;
      // Update connection in map with gameSession
      connections.set(connId, conn);
      console.log("GameSession initialized for adventure:", adventureId);
    } else {
      console.error("Failed to initialize GameSession:", initResult.error);
    }
  }

  // Send adventure loaded confirmation with history
  const loadedMsg: ServerMessage = {
    type: "adventure_loaded",
    payload: {
      adventureId: result.state.id,
      history: result.history.entries,
    },
  };

  ws.send(JSON.stringify(loadedMsg));

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
  console.log(`[Server] Sent stored theme: ${theme.mood}`);
}

// Serve static frontend files from ../frontend/dist
// This serves the built Vite React app
const STATIC_ROOT = process.env.STATIC_ROOT || "../frontend/dist";

// Serve background images from ./assets/backgrounds at /backgrounds/*
// This must come before SPA fallback to avoid conflicts
app.use("/backgrounds/*", serveStatic({ root: "./assets/backgrounds", rewriteRequestPath: (path) => path.replace(/^\/backgrounds/, "") }));

// Serve static assets (JS, CSS, images, etc.)
app.use("/assets/*", serveStatic({ root: STATIC_ROOT }));

// Serve index.html for all other routes (SPA fallback)
app.get("*", serveStatic({ root: STATIC_ROOT, path: "index.html" }));

// Heartbeat monitoring
// Check for stale connections every 30 seconds
const HEARTBEAT_INTERVAL = 30_000;
const HEARTBEAT_TIMEOUT = 60_000;

setInterval(() => {
  const now = Date.now();
  for (const [connId, conn] of connections.entries()) {
    if (now - conn.lastPing > HEARTBEAT_TIMEOUT) {
      console.log("Closing stale connection:", conn.adventureId);
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

// Export for testing
export { app, connections };
