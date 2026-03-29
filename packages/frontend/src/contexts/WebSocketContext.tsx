/**
 * WebSocket Context
 *
 * Provides a shared WebSocket connection that's created on initial page load.
 * This fixes iOS Safari issues where WebSockets can't be created during
 * React component transitions.
 *
 * The WebSocket connects immediately and stays connected. When an adventure
 * is selected, the authenticate message is sent to the existing connection.
 */

import { createContext, useContext, useRef, useEffect, useState, useCallback, type ReactNode } from "react";
import type { ClientMessage, ServerMessage, ThemeMood } from "../../../shared/protocol";
import { parseServerMessage, formatValidationError, ThemeMoodSchema } from "../../../shared/protocol";
import { useTheme } from "./ThemeContext";
import { usePanels } from "./PanelContext";

export type ConnectionStatus = "connected" | "disconnected" | "reconnecting";

interface WebSocketContextValue {
  status: ConnectionStatus;
  sendMessage: (message: ClientMessage) => void;
  authenticate: (adventureId: string, sessionToken: string) => void;
  onMessage: (handler: (message: ServerMessage) => void) => () => void;
  debugInfo: string;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

const HEARTBEAT_INTERVAL = 30000;
const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;
const MAX_RECONNECT_TIME = 30000;

function isValidMood(mood: unknown): mood is ThemeMood {
  return ThemeMoodSchema.safeParse(mood).success;
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [debugInfo, setDebugInfo] = useState<string>("init");

  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatTimerRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const retryDelayRef = useRef<number>(INITIAL_RETRY_DELAY);
  const reconnectStartTimeRef = useRef<number | null>(null);
  const intentionalDisconnectRef = useRef<boolean>(false);
  const messageHandlersRef = useRef<Set<(message: ServerMessage) => void>>(new Set());
  const authDataRef = useRef<{ adventureId: string; sessionToken: string } | null>(null);

  const { applyTheme } = useTheme();
  const { addPanel, updatePanel, removePanel, clearAllPanels } = usePanels();

  const clearHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current !== null) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    clearHeartbeat();
    heartbeatTimerRef.current = window.setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const pingMessage: ClientMessage = { type: "ping" };
        wsRef.current.send(JSON.stringify(pingMessage));
      }
    }, HEARTBEAT_INTERVAL);
  }, [clearHeartbeat]);

  const connect = useCallback(() => {
    if (reconnectStartTimeRef.current !== null) {
      const elapsedTime = Date.now() - reconnectStartTimeRef.current;
      if (elapsedTime > MAX_RECONNECT_TIME) {
        console.error("Max reconnection time exceeded");
        setDebugInfo("max reconnect time exceeded");
        setStatus("disconnected");
        reconnectStartTimeRef.current = null;
        return;
      }
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const loc = globalThis.location;
    const wsProtocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${wsProtocol}//${loc.host}/ws`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      const shortUrl = url.replace(/^wss?:\/\//, '');
      setDebugInfo(`${shortUrl} state=${ws.readyState}`);

      ws.onopen = () => {
        console.log("WebSocket connected");
        setDebugInfo("connected");
        setStatus("connected");
        retryDelayRef.current = INITIAL_RETRY_DELAY;
        reconnectStartTimeRef.current = null;
        startHeartbeat();

        // If we have auth data, re-authenticate (for reconnection)
        if (authDataRef.current) {
          const authMessage: ClientMessage = {
            type: "authenticate",
            payload: {
              token: authDataRef.current.sessionToken,
              adventureId: authDataRef.current.adventureId,
            },
          };
          ws.send(JSON.stringify(authMessage));
        }
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          if (typeof event.data !== "string") {
            console.error("Received non-string WebSocket message");
            return;
          }

          const parsed: unknown = JSON.parse(event.data);
          const result = parseServerMessage(parsed);

          if (!result.success) {
            console.error("Invalid server message:", formatValidationError(result.error));
            return;
          }

          const message = result.data;

          // Handle theme_change
          if (message.type === "theme_change") {
            const { mood, backgroundUrl, transitionDuration } = message.payload;
            if (isValidMood(mood)) {
              applyTheme({ mood, backgroundUrl: backgroundUrl ?? null, transitionDuration });
            }
          }

          // Handle panel messages
          if (message.type === "panel_create") {
            addPanel(message.payload);
          } else if (message.type === "panel_update") {
            updatePanel(message.payload.id, message.payload.content);
          } else if (message.type === "panel_dismiss") {
            removePanel(message.payload.id);
          }

          // Clear panels on adventure load
          if (message.type === "adventure_loaded") {
            clearAllPanels();
          }

          // Notify all handlers
          messageHandlersRef.current.forEach(handler => handler(message));
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        const errEvent = error as ErrorEvent;
        setDebugInfo(`ERROR: ${errEvent.message || 'unknown'}`);
      };

      ws.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        setDebugInfo(`CLOSED: ${event.code}`);
        clearHeartbeat();

        if (!intentionalDisconnectRef.current) {
          setStatus("reconnecting");

          if (reconnectStartTimeRef.current === null) {
            reconnectStartTimeRef.current = Date.now();
          }

          const delay = retryDelayRef.current;
          clearReconnectTimer();
          reconnectTimerRef.current = window.setTimeout(() => connect(), delay);
          retryDelayRef.current = Math.min(retryDelayRef.current * 2, MAX_RETRY_DELAY);
        } else {
          setStatus("disconnected");
        }
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      setDebugInfo(`FAILED: ${error instanceof Error ? error.message : String(error)}`);
      setStatus("disconnected");
    }
  }, [startHeartbeat, clearHeartbeat, clearReconnectTimer, applyTheme, addPanel, updatePanel, removePanel, clearAllPanels]);

  // Connect on mount
  useEffect(() => {
    intentionalDisconnectRef.current = false;
    connect();

    return () => {
      intentionalDisconnectRef.current = true;
      clearHeartbeat();
      clearReconnectTimer();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, clearHeartbeat, clearReconnectTimer]);

  const sendMessage = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("Cannot send message: WebSocket not connected");
    }
  }, []);

  const authenticate = useCallback((adventureId: string, sessionToken: string) => {
    authDataRef.current = { adventureId, sessionToken };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const authMessage: ClientMessage = {
        type: "authenticate",
        payload: { token: sessionToken, adventureId },
      };
      wsRef.current.send(JSON.stringify(authMessage));
    }
  }, []);

  const onMessage = useCallback((handler: (message: ServerMessage) => void) => {
    messageHandlersRef.current.add(handler);
    return () => {
      messageHandlersRef.current.delete(handler);
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ status, sendMessage, authenticate, onMessage, debugInfo }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocketContext must be used within WebSocketProvider");
  }
  return context;
}
