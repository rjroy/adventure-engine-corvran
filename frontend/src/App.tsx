import { useState, useCallback, useMemo, useEffect } from "react";
import {
  AdventureMenu,
  NarrativeLog,
  InputField,
  ConnectionStatus,
  ToolStatusBar,
} from "./components";
import { ErrorPanel } from "./components/ErrorPanel";
import { RecapConfirmDialog } from "./components/RecapConfirmDialog";
import { BackgroundLayer } from "./components/BackgroundLayer";
import {
  SidebarPanelZone,
  HeaderPanelZone,
  OverlayPanelContainer,
  MobilePanelView,
} from "./components/PanelZones";
import { MobileTabBar } from "./components/MobileTabBar";
import type { ServerMessage, NarrativeEntry, HistorySummary, ErrorCode, ThemeMood } from "../../shared/protocol";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { PanelProvider, usePanels } from "./contexts/PanelContext";
import { WebSocketProvider, useWebSocketContext } from "./contexts/WebSocketContext";
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

// Error state with full error metadata
interface ErrorState {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  technicalDetails?: string;
}

export interface GameViewProps {
  session: AdventureSession;
  onQuit: () => void;
}

export function GameView({
  session,
  onQuit,
}: GameViewProps) {
  const { currentMood, applyTheme } = useTheme();
  const { mobileTab } = usePanels();
  const { status, sendMessage, authenticate, onMessage } = useWebSocketContext();

  const [narrativeHistory, setNarrativeHistory] = useState<NarrativeEntry[]>(
    []
  );
  const [historySummary, setHistorySummary] = useState<HistorySummary | null>(
    null
  );
  const [streamingMessage, setStreamingMessage] =
    useState<StreamingMessage | null>(null);
  const [isGMResponding, setIsGMResponding] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [lastPlayerInput, setLastPlayerInput] = useState<string>("");
  const [previousMood, setPreviousMood] = useState<ThemeMood>("calm");
  const [toolStatus, setToolStatus] = useState<{
    state: "active" | "idle";
    description: string;
  }>({ state: "idle", description: "Ready" });
  const [isAborting, setIsAborting] = useState(false);
  const [isRecapping, setIsRecapping] = useState(false);
  const [showRecapConfirm, setShowRecapConfirm] = useState(false);

  // Authenticate with the adventure when component mounts
  useEffect(() => {
    authenticate(session.adventureId, session.sessionToken);
  }, [session.adventureId, session.sessionToken, authenticate]);

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

        // Restore previous theme if error mood is active
        if (currentMood === "tense" || currentMood === "ominous") {
          applyTheme({ mood: previousMood });
        }
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
        setIsAborting(false); // Reset aborting state
        break;

      case "error": {
        // Store full error state
        const errorState = {
          code: message.payload.code,
          message: message.payload.message,
          retryable: message.payload.retryable,
          technicalDetails: message.payload.technicalDetails,
        };
        setError(errorState);
        setIsGMResponding(false);

        // Log error to console for debugging
        console.error("[Adventure Engine] Error received:", {
          code: errorState.code,
          message: errorState.message,
          retryable: errorState.retryable,
          technicalDetails: errorState.technicalDetails,
        });

        // Apply theme based on error severity
        const errorMood: ThemeMood = message.payload.retryable ? "tense" : "ominous";
        setPreviousMood(currentMood); // Save current mood for restoration
        applyTheme({ mood: errorMood });
        break;
      }

      case "tool_status":
        setToolStatus({
          state: message.payload.state,
          description: message.payload.description,
        });
        break;

      case "pong":
        // Heartbeat response, no action needed
        break;

      case "recap_started":
        setIsRecapping(true);
        break;

      case "recap_complete":
        // Update history and summary with compacted versions
        setNarrativeHistory(message.payload.history);
        setHistorySummary(message.payload.summary);
        setIsRecapping(false);
        break;

      case "recap_error":
        setIsRecapping(false);
        setError({
          code: "GM_ERROR",
          message: message.payload.reason,
          retryable: true,
        });
        break;
    }
  }, [currentMood, applyTheme, previousMood]);

  // Register message handler with the WebSocket context
  useEffect(() => {
    return onMessage(handleMessage);
  }, [onMessage, handleMessage]);

  const handleSubmit = useCallback(
    (text: string) => {
      // Track for retry functionality
      setLastPlayerInput(text);

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

  const handleRetry = useCallback(() => {
    if (!lastPlayerInput || isGMResponding) return;

    setError(null); // Clear error
    applyTheme({ mood: previousMood }); // Restore previous theme
    sendMessage({ type: "player_input", payload: { text: lastPlayerInput } });
  }, [lastPlayerInput, isGMResponding, previousMood, sendMessage, applyTheme]);

  const handleDismissError = useCallback(() => {
    setError(null);
    applyTheme({ mood: previousMood }); // Restore previous theme
  }, [previousMood, applyTheme]);

  const handleAbort = useCallback(() => {
    if (!isGMResponding || isAborting) return;

    setIsAborting(true);
    sendMessage({ type: "abort" });
  }, [isGMResponding, isAborting, sendMessage]);

  const handleRecapClick = useCallback(() => {
    setShowRecapConfirm(true);
  }, []);

  const handleRecapConfirm = useCallback(() => {
    setShowRecapConfirm(false);
    setIsRecapping(true);
    sendMessage({ type: "recap" });
  }, [sendMessage]);

  const handleRecapCancel = useCallback(() => {
    setShowRecapConfirm(false);
  }, []);

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
    <div className="game-view" data-mobile-tab={mobileTab}>
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
        <ErrorPanel
          code={error.code}
          message={error.message}
          retryable={error.retryable}
          technicalDetails={error.technicalDetails}
          onRetry={handleRetry}
          onDismiss={handleDismissError}
          isRetrying={isGMResponding}
        />
      )}

      <HeaderPanelZone />

      <main className="game-main">
        <NarrativeLog
          entries={displayEntries}
          isStreaming={streamingMessage !== null}
          summary={historySummary}
        />

        <ToolStatusBar
          state={toolStatus.state}
          description={toolStatus.description}
          onRecap={handleRecapClick}
          recapDisabled={isGMResponding || status !== "connected" || isRecapping}
          isRecapping={isRecapping}
        />

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
            onAbort={isGMResponding ? handleAbort : undefined}
            isAborting={isAborting}
          />
        </div>
      </main>

      <SidebarPanelZone />
      <OverlayPanelContainer />
      <MobilePanelView />
      <MobileTabBar />

      <RecapConfirmDialog
        isOpen={showRecapConfirm}
        onConfirm={handleRecapConfirm}
        onCancel={handleRecapCancel}
      />
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
        <WebSocketProvider>
          <BackgroundLayer />
          {!session ? (
            <AdventureMenu onAdventureStart={handleAdventureStart} />
          ) : (
            <GameView session={session} onQuit={handleQuit} />
          )}
        </WebSocketProvider>
      </PanelProvider>
    </ThemeProvider>
  );
}

export default App;
