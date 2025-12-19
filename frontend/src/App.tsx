import { useState, useCallback, useMemo } from "react";
import {
  AdventureMenu,
  NarrativeLog,
  InputField,
  ConnectionStatus,
  ToolStatusBar,
} from "./components";
import { BackgroundLayer } from "./components/BackgroundLayer";
import {
  SidebarPanelZone,
  HeaderPanelZone,
  OverlayPanelContainer,
} from "./components/PanelZones";
import { useWebSocket } from "./hooks/useWebSocket";
import type { ServerMessage, NarrativeEntry, HistorySummary } from "../../shared/protocol";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PanelProvider } from "./contexts/PanelContext";
import "./App.css";

// Fallback UUID generator for insecure contexts (non-HTTPS, non-localhost)
// crypto.randomUUID() is only available in secure contexts
function generateUUID(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback using crypto.getRandomValues() which has broader support
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // Set version 4 bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  // Set variant bits
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export interface AdventureSession {
  adventureId: string;
  sessionToken: string;
}

// Current streaming message state
interface StreamingMessage {
  messageId: string;
  content: string;
}

export interface GameViewProps {
  session: AdventureSession;
  onQuit: () => void;
}

export function GameView({
  session,
  onQuit,
}: GameViewProps) {
  const [narrativeHistory, setNarrativeHistory] = useState<NarrativeEntry[]>(
    []
  );
  const [historySummary, setHistorySummary] = useState<HistorySummary | null>(
    null
  );
  const [streamingMessage, setStreamingMessage] =
    useState<StreamingMessage | null>(null);
  const [isGMResponding, setIsGMResponding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toolStatus, setToolStatus] = useState<{
    state: "active" | "idle";
    description: string;
  }>({ state: "idle", description: "Ready" });

  const handleMessage = useCallback((message: ServerMessage) => {
    switch (message.type) {
      case "adventure_loaded":
        // Set initial history and summary from server
        setNarrativeHistory(message.payload.history);
        setHistorySummary(message.payload.summary ?? null);
        setError(null);
        break;

      case "gm_response_start":
        // Start a new streaming response
        setStreamingMessage({
          messageId: message.payload.messageId,
          content: "",
        });
        setIsGMResponding(true);
        setError(null);
        break;

      case "gm_response_chunk":
        // Append chunk to streaming response
        setStreamingMessage((prev) => {
          if (prev && prev.messageId === message.payload.messageId) {
            return {
              ...prev,
              content: prev.content + message.payload.text,
            };
          }
          return prev;
        });
        break;

      case "gm_response_end":
        // Complete the streaming response and add to history
        setStreamingMessage((prev) => {
          if (prev && prev.messageId === message.payload.messageId) {
            // Add completed response to history
            const newEntry: NarrativeEntry = {
              id: message.payload.messageId,
              timestamp: new Date().toISOString(),
              type: "gm_response",
              content: prev.content,
            };
            setNarrativeHistory((history) => [...history, newEntry]);
          }
          return null;
        });
        setIsGMResponding(false);
        break;

      case "error":
        setError(message.payload.message);
        setIsGMResponding(false);
        break;

      case "tool_status":
        setToolStatus({
          state: message.payload.state,
          description: message.payload.description,
        });
        break;

      case "pong":
        // Heartbeat response, no action needed
        break;
    }
  }, []);

  const { status, sendMessage } = useWebSocket({
    adventureId: session.adventureId,
    sessionToken: session.sessionToken,
    onMessage: handleMessage,
  });

  const handleSubmit = useCallback(
    (text: string) => {
      // Add player input to history immediately
      const playerEntry: NarrativeEntry = {
        id: generateUUID(),
        timestamp: new Date().toISOString(),
        type: "player_input",
        content: text,
      };
      setNarrativeHistory((history) => [...history, playerEntry]);

      // Send to server
      sendMessage({
        type: "player_input",
        payload: { text },
      });
    },
    [sendMessage]
  );

  // Combine history with streaming message for display
  const displayEntries = useMemo(() => {
    if (streamingMessage && streamingMessage.content) {
      const streamEntry: NarrativeEntry = {
        id: streamingMessage.messageId,
        timestamp: new Date().toISOString(),
        type: "gm_response",
        content: streamingMessage.content,
      };
      return [...narrativeHistory, streamEntry];
    }
    return narrativeHistory;
  }, [narrativeHistory, streamingMessage]);

  const isInputDisabled =
    status !== "connected" || isGMResponding;

  return (
    <div className="game-view">
      <header className="game-header">
        <div>
          <h1 className="game-header__title">Adventure Engine of Corvran</h1>
          <p className="game-header__subtitle">
            Adventure: {session.adventureId.slice(0, 8)}...
          </p>
        </div>
        <div className="game-header__actions">
          <ConnectionStatus status={status} />
          <button onClick={onQuit} className="btn btn--secondary">
            Quit
          </button>
        </div>
      </header>

      {error && (
        <div className="error-alert" role="alert" data-testid="error-message">
          {error}
        </div>
      )}

      <HeaderPanelZone />

      <main className="game-main">
        <NarrativeLog
          entries={displayEntries}
          isStreaming={streamingMessage !== null}
          summary={historySummary}
        />

        <ToolStatusBar state={toolStatus.state} description={toolStatus.description} />

        <div className="game-input-container">
          <InputField
            onSubmit={handleSubmit}
            disabled={isInputDisabled}
            placeholder={
              status !== "connected"
                ? "Reconnecting..."
                : isGMResponding
                  ? "Waiting for response..."
                  : "What do you do?"
            }
          />
        </div>
      </main>

      <SidebarPanelZone />
      <OverlayPanelContainer />
    </div>
  );
}

function App() {
  const [session, setSession] = useState<AdventureSession | null>(null);

  const handleAdventureStart = useCallback(
    (adventureId: string, sessionToken: string) => {
      setSession({ adventureId, sessionToken });
    },
    []
  );

  const handleQuit = useCallback(() => {
    setSession(null);
  }, []);

  return (
    <ThemeProvider>
      <PanelProvider>
        <BackgroundLayer />
        {!session ? (
          <AdventureMenu onAdventureStart={handleAdventureStart} />
        ) : (
          <GameView session={session} onQuit={handleQuit} />
        )}
      </PanelProvider>
    </ThemeProvider>
  );
}

export default App;
