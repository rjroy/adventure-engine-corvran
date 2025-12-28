/**
 * Test utilities for integration tests.
 * Provides helpers to render GameView with providers and control MockWebSocket.
 */

import { render, screen, type RenderResult, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, type MockInstance } from "vitest";
import type { ReactNode } from "react";
import { ThemeProvider } from "../../../src/contexts/ThemeContext";
import { PanelProvider } from "../../../src/contexts/PanelContext";
import { WebSocketProvider } from "../../../src/contexts/WebSocketContext";
import { GameView, type AdventureSession } from "../../../src/App";
import type {
  ServerMessage,
  ClientMessage,
  NarrativeEntry,
  ThemeMood,
  ErrorCode,
  HistorySummary,
} from "../../../../shared/protocol";

// Re-export screen and waitFor for convenience
export { screen, waitFor };

// Re-export userEvent for convenience
export { userEvent };

// Track the current MockWebSocket instance globally
let currentMockWebSocket: EnhancedMockWebSocket | null = null;
const sentMessagesStore: ClientMessage[] = [];

// Interface for MockWebSocket with test helpers - defined early for use in TrackedMockWebSocket
interface EnhancedMockWebSocket {
  url: string;
  readyState: number;
  send: (data: string) => void;
  close: (code?: number, reason?: string) => void;
  simulateOpen: () => void;
  simulateMessage: (data: unknown) => void;
  simulateClose: (code?: number, reason?: string) => void;
  simulateError: () => void;
}

class TrackedMockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = TrackedMockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    currentMockWebSocket = this as unknown as EnhancedMockWebSocket;
    // Clear sent messages on new connection
    sentMessagesStore.length = 0;
  }

  send(data: string): void {
    try {
      const parsed = JSON.parse(data) as ClientMessage;
      sentMessagesStore.push(parsed);
    } catch {
      // Ignore parse errors
    }
  }

  close(): void {
    this.readyState = TrackedMockWebSocket.CLOSED;
  }

  // Test helpers
  simulateOpen(): void {
    this.readyState = TrackedMockWebSocket.OPEN;
    this.onopen?.(new Event("open"));
  }

  simulateMessage(data: unknown): void {
    this.onmessage?.(new MessageEvent("message", { data: JSON.stringify(data) }));
  }

  simulateClose(code = 1000, reason = ""): void {
    this.readyState = TrackedMockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent("close", { code, reason }));
  }

  simulateError(): void {
    this.onerror?.(new Event("error"));
  }
}

// Replace global WebSocket
// @ts-expect-error - replacing for testing
globalThis.WebSocket = TrackedMockWebSocket;

// Mock Element.scrollTo (not available in jsdom)
Element.prototype.scrollTo = vi.fn();

/**
 * Enhanced MockWebSocket controller that provides helpers.
 */
export class MockWebSocketController {
  constructor() {
    // Reset state
    currentMockWebSocket = null;
    sentMessagesStore.length = 0;
  }

  private get instance(): EnhancedMockWebSocket | null {
    return currentMockWebSocket;
  }

  private get sentMessages(): ClientMessage[] {
    return sentMessagesStore;
  }

  /**
   * Get the current MockWebSocket instance.
   */
  getInstance(): EnhancedMockWebSocket | null {
    return this.instance;
  }

  /**
   * Simulate WebSocket connection opening.
   */
  open(): void {
    if (!this.instance) {
      throw new Error("WebSocket not created yet");
    }
    this.instance.simulateOpen();
  }

  /**
   * Simulate receiving a server message.
   */
  receiveMessage(message: ServerMessage): void {
    if (!this.instance) {
      throw new Error("WebSocket not created yet");
    }
    this.instance.simulateMessage(message);
  }

  /**
   * Simulate WebSocket close event.
   */
  close(code = 1000, reason = ""): void {
    if (!this.instance) {
      throw new Error("WebSocket not created yet");
    }
    this.instance.simulateClose(code, reason);
  }

  /**
   * Simulate WebSocket error event.
   */
  error(): void {
    if (!this.instance) {
      throw new Error("WebSocket not created yet");
    }
    this.instance.simulateError();
  }

  /**
   * Get all messages sent by the client.
   */
  getSentMessages(): ClientMessage[] {
    return [...this.sentMessages];
  }

  /**
   * Get the last message sent by the client.
   */
  getLastSentMessage(): ClientMessage | undefined {
    return this.sentMessages[this.sentMessages.length - 1];
  }

  /**
   * Clear sent message history.
   */
  clearSentMessages(): void {
    sentMessagesStore.length = 0;
  }

  /**
   * Simulate full authentication flow: open → adventure_loaded.
   */
  simulateAuthentication(options: {
    adventureId?: string;
    history?: NarrativeEntry[];
    summary?: HistorySummary | null;
  } = {}): void {
    const {
      adventureId = "test-adventure-id",
      history = [],
      summary = null,
    } = options;

    this.open();
    this.receiveMessage({
      type: "adventure_loaded",
      payload: {
        adventureId,
        history,
        summary,
      },
    });
  }

  /**
   * Simulate a complete GM response (start → chunks → end).
   */
  simulatePlayerResponse(messageId: string, chunks: string[]): void {
    // Start
    this.receiveMessage({
      type: "gm_response_start",
      payload: { messageId },
    });

    // Chunks
    for (const text of chunks) {
      this.receiveMessage({
        type: "gm_response_chunk",
        payload: { messageId, text },
      });
    }

    // End
    this.receiveMessage({
      type: "gm_response_end",
      payload: { messageId },
    });
  }

  /**
   * Simulate a theme change message.
   */
  simulateThemeChange(
    mood: ThemeMood,
    options: {
      genre?: "sci-fi" | "steampunk" | "low-fantasy" | "high-fantasy" | "horror" | "modern" | "historical";
      region?: "city" | "village" | "forest" | "desert" | "mountain" | "ocean" | "underground" | "castle" | "ruins";
      backgroundUrl?: string | null;
      transitionDuration?: number;
    } = {}
  ): void {
    const {
      genre = "low-fantasy",
      region = "forest",
      backgroundUrl = null,
      transitionDuration,
    } = options;

    this.receiveMessage({
      type: "theme_change",
      payload: {
        mood,
        genre,
        region,
        backgroundUrl,
        ...(transitionDuration !== undefined && { transitionDuration }),
      },
    });
  }

  /**
   * Simulate an error message.
   */
  simulateError(code: ErrorCode, message: string, retryable: boolean): void {
    this.receiveMessage({
      type: "error",
      payload: { code, message, retryable },
    });
  }

  /**
   * Simulate a pong response.
   */
  simulatePong(): void {
    this.receiveMessage({ type: "pong" });
  }
}

/**
 * Create a mock NarrativeEntry for testing.
 */
export function createMockEntry(
  type: "player_input" | "gm_response",
  content: string,
  options: { id?: string; timestamp?: string } = {}
): NarrativeEntry {
  return {
    id: options.id ?? `entry-${Math.random().toString(36).slice(2)}`,
    timestamp: options.timestamp ?? new Date().toISOString(),
    type,
    content,
  };
}

/**
 * Create a mock history with alternating player/GM entries.
 */
export function createMockHistory(count: number): NarrativeEntry[] {
  const entries: NarrativeEntry[] = [];
  for (let i = 0; i < count; i++) {
    const type = i % 2 === 0 ? "player_input" : "gm_response";
    entries.push(
      createMockEntry(type, `${type === "player_input" ? "Player" : "GM"} message ${i + 1}`)
    );
  }
  return entries;
}

/**
 * Create a mock HistorySummary for testing.
 */
export function createMockSummary(text: string): HistorySummary {
  return {
    generatedAt: new Date().toISOString(),
    model: "claude-3-5-haiku-20241022",
    entriesArchived: 50,
    dateRange: {
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      to: new Date().toISOString(),
    },
    text,
  };
}

/**
 * Wrapper component with all necessary providers.
 */
function TestProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <PanelProvider>{children}</PanelProvider>
    </ThemeProvider>
  );
}

/**
 * Render options for renderWithProviders.
 */
interface RenderWithProvidersOptions {
  wsController?: MockWebSocketController;
}

/**
 * Render a component with all necessary providers.
 * Returns render result plus WebSocket controller.
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options: RenderWithProvidersOptions = {}
): RenderResult & { wsController: MockWebSocketController } {
  const wsController = options.wsController ?? new MockWebSocketController();

  const result = render(ui, {
    wrapper: TestProviders,
  });

  return {
    ...result,
    wsController,
  };
}

/**
 * Generate a random UUID for message IDs.
 */
export function generateMessageId(): string {
  return `msg-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

type ConsoleSpy = MockInstance<typeof console.error>;

/**
 * Suppress console.error for expected errors.
 * Call mockRestore() when done.
 */
export function suppressConsoleError(): ConsoleSpy {
  return vi.spyOn(console, "error").mockImplementation(() => {});
}

/**
 * Suppress console.warn for expected warnings.
 * Call mockRestore() when done.
 */
export function suppressConsoleWarn(): MockInstance<typeof console.warn> {
  return vi.spyOn(console, "warn").mockImplementation(() => {});
}

// Export the type for use in test files
export type { ConsoleSpy };

/**
 * Options for renderGameView.
 */
interface RenderGameViewOptions {
  adventureId?: string;
  sessionToken?: string;
  onQuit?: () => void;
}

/**
 * Result from renderGameView.
 */
interface RenderGameViewResult extends RenderResult {
  wsController: MockWebSocketController;
  user: ReturnType<typeof userEvent.setup>;
  session: AdventureSession;
}

/**
 * Render GameView with all providers and return controller for testing.
 */
export function renderGameView(
  options: RenderGameViewOptions = {}
): RenderGameViewResult {
  const {
    adventureId = "test-adventure-id",
    sessionToken = "test-session-token",
    onQuit = vi.fn(),
  } = options;

  const session: AdventureSession = { adventureId, sessionToken };
  const wsController = new MockWebSocketController();
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

  const result = render(
    <ThemeProvider>
      <PanelProvider>
        <WebSocketProvider>
          <GameView session={session} onQuit={onQuit} />
        </WebSocketProvider>
      </PanelProvider>
    </ThemeProvider>
  );

  return {
    ...result,
    wsController,
    user,
    session,
  };
}
