import { useEffect, useRef, useState, useCallback } from "react";
import type { ClientMessage, ServerMessage, ThemeMood } from "../../../shared/protocol";
import { parseServerMessage, formatValidationError, ThemeMoodSchema } from "../../../shared/protocol";
import { useTheme } from "../contexts/ThemeContext";
import { usePanels } from "../contexts/PanelContext";

export type ConnectionStatus = "connected" | "disconnected" | "reconnecting";

export interface UseWebSocketOptions {
  adventureId: string;
  sessionToken: string;
  onMessage: (message: ServerMessage) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
}

export interface UseWebSocketReturn {
  status: ConnectionStatus;
  sendMessage: (message: ClientMessage) => void;
  disconnect: () => void;
}

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds
const MAX_RECONNECT_TIME = 30000; // 30 seconds total reconnection time

/**
 * Type guard to check if a value is a valid ThemeMood.
 * Uses Zod schema for validation to stay in sync with protocol definition.
 */
function isValidMood(mood: unknown): mood is ThemeMood {
  return ThemeMoodSchema.safeParse(mood).success;
}

/**
 * Custom hook to manage WebSocket connection with exponential backoff reconnection.
 * Handles connection lifecycle, heartbeat ping/pong, and message dispatching.
 */
export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const { adventureId, sessionToken, onMessage, onStatusChange } = options;

  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatTimerRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const retryDelayRef = useRef<number>(INITIAL_RETRY_DELAY);
  const reconnectStartTimeRef = useRef<number | null>(null);
  const intentionalDisconnectRef = useRef<boolean>(false);

  // Access theme context for handling theme_change messages
  const { applyTheme } = useTheme();

  // Access panel context for handling panel messages
  const { addPanel, updatePanel, removePanel } = usePanels();

  const updateStatus = useCallback(
    (newStatus: ConnectionStatus) => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    },
    [onStatusChange]
  );

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
    // Don't reconnect if we've been trying for too long
    if (reconnectStartTimeRef.current !== null) {
      const elapsedTime = Date.now() - reconnectStartTimeRef.current;
      if (elapsedTime > MAX_RECONNECT_TIME) {
        console.error(
          "Max reconnection time exceeded, giving up on reconnection"
        );
        updateStatus("disconnected");
        reconnectStartTimeRef.current = null;
        return;
      }
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Use relative URL to go through Vite proxy in dev, or construct full URL for production
    // Token is sent via authenticate message (not URL) to avoid logging/history exposure
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${wsProtocol}//${window.location.host}/ws?adventureId=${encodeURIComponent(adventureId)}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        updateStatus("connected");
        retryDelayRef.current = INITIAL_RETRY_DELAY;
        reconnectStartTimeRef.current = null;
        startHeartbeat();

        // Send authenticate message first (token not in URL for security)
        const authMessage: ClientMessage = {
          type: "authenticate",
          payload: { token: sessionToken },
        };
        ws.send(JSON.stringify(authMessage));

        // Send start_adventure message after auth to sync state
        const startMessage: ClientMessage = {
          type: "start_adventure",
          payload: { adventureId },
        };
        ws.send(JSON.stringify(startMessage));
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          // WebSocket event.data can be various types, ensure it's a string
          if (typeof event.data !== "string") {
            console.error("Received non-string WebSocket message");
            return;
          }

          // Parse JSON and validate against schema
          const parsed: unknown = JSON.parse(event.data);
          const result = parseServerMessage(parsed);

          if (!result.success) {
            console.error(
              "Invalid server message:",
              formatValidationError(result.error)
            );
            return;
          }

          const message = result.data;

          // Handle theme_change messages by applying theme
          if (message.type === "theme_change") {
            const { mood, backgroundUrl, transitionDuration } = message.payload;
            console.log("[useWebSocket] Received theme_change:", { mood, backgroundUrl, transitionDuration });

            // Validate mood before applying
            if (isValidMood(mood)) {
              console.log("[useWebSocket] Applying theme:", mood);
              applyTheme({
                mood,
                backgroundUrl: backgroundUrl ?? null,
                transitionDuration,
              });
            } else {
              console.warn(
                `Invalid theme mood received: ${String(mood)}. Ignoring theme change.`
              );
            }
          }

          // Handle panel messages by updating panel context
          if (message.type === "panel_create") {
            console.log("[useWebSocket] Received panel_create:", message.payload.id);
            addPanel(message.payload);
          } else if (message.type === "panel_update") {
            console.log("[useWebSocket] Received panel_update:", message.payload.id);
            updatePanel(message.payload.id, message.payload.content);
          } else if (message.type === "panel_dismiss") {
            console.log("[useWebSocket] Received panel_dismiss:", message.payload.id);
            removePanel(message.payload.id);
          }

          // Forward message to onMessage handler for logging/other uses
          onMessage(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        clearHeartbeat();

        // Only attempt reconnection if not intentionally disconnected
        if (!intentionalDisconnectRef.current) {
          updateStatus("reconnecting");

          // Start tracking reconnection time on first disconnect
          if (reconnectStartTimeRef.current === null) {
            reconnectStartTimeRef.current = Date.now();
          }

          // Schedule reconnection with exponential backoff
          const delay = retryDelayRef.current;
          console.log(`Reconnecting in ${delay}ms...`);

          clearReconnectTimer();
          reconnectTimerRef.current = window.setTimeout(() => {
            connect();
          }, delay);

          // Double the delay for next retry, capped at MAX_RETRY_DELAY
          retryDelayRef.current = Math.min(
            retryDelayRef.current * 2,
            MAX_RETRY_DELAY
          );
        } else {
          updateStatus("disconnected");
        }
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      updateStatus("disconnected");
    }
  }, [
    adventureId,
    sessionToken,
    onMessage,
    updateStatus,
    startHeartbeat,
    clearHeartbeat,
    clearReconnectTimer,
    applyTheme,
    addPanel,
    updatePanel,
    removePanel,
  ]);

  const disconnect = useCallback(() => {
    intentionalDisconnectRef.current = true;
    clearHeartbeat();
    clearReconnectTimer();
    reconnectStartTimeRef.current = null;
    retryDelayRef.current = INITIAL_RETRY_DELAY;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    updateStatus("disconnected");
  }, [clearHeartbeat, clearReconnectTimer, updateStatus]);

  const sendMessage = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("Cannot send message: WebSocket not connected");
    }
  }, []);

  // Initialize connection on mount
  useEffect(() => {
    intentionalDisconnectRef.current = false;
    connect();

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    status,
    sendMessage,
    disconnect,
  };
}
