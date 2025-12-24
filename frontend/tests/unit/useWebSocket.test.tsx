import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWebSocket } from "../../src/hooks/useWebSocket";
import type { ServerMessage, Panel } from "../../../shared/protocol";
import { ThemeProvider } from "../../src/contexts/ThemeContext";
import { PanelProvider, usePanels } from "../../src/contexts/PanelContext";
import type { ReactNode } from "react";

// Get access to MockWebSocket instances
let mockWebSocketInstance: MockWebSocket | null = null;

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  sendMock = vi.fn();
  closeMock = vi.fn();

  constructor(url: string) {
    this.url = url;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    mockWebSocketInstance = this;
  }

  send(data: string): void {
    this.sendMock(data);
  }

  close(code?: number, reason?: string): void {
    this.closeMock(code, reason);
    this.readyState = MockWebSocket.CLOSED;
  }

  // Test helpers
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event("open"));
  }

  // Accept unknown to allow testing invalid messages (simulates raw wire data)
  simulateMessage(data: unknown): void {
    this.onmessage?.(new MessageEvent("message", { data: JSON.stringify(data) }));
  }

  simulateClose(code = 1000, reason = ""): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent("close", { code, reason }));
  }

  simulateError(): void {
    this.onerror?.(new Event("error"));
  }
}

// Replace global WebSocket
// @ts-expect-error - replacing for testing
globalThis.WebSocket = MockWebSocket;

// Helper to create wrapper with ThemeProvider and PanelProvider
function createWrapper() {
  return ({ children }: { children: ReactNode }) => (
    <ThemeProvider>
      <PanelProvider>{children}</PanelProvider>
    </ThemeProvider>
  );
}

describe("useWebSocket", () => {
  const defaultOptions = {
    adventureId: "test-adventure-id",
    sessionToken: "test-session-token",
    onMessage: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    mockWebSocketInstance = null;
    document.documentElement.removeAttribute("style");
  });

  describe("connection", () => {
    test("connects on mount and sends authenticate message with token", () => {
      renderHook(() => useWebSocket(defaultOptions), { wrapper: createWrapper() });

      expect(mockWebSocketInstance).not.toBeNull();
      expect(mockWebSocketInstance?.url).toContain("adventureId=test-adventure-id");
      // Token should NOT be in URL (security fix)
      expect(mockWebSocketInstance?.url).not.toContain("token=");

      // Simulate connection opening to trigger authenticate message
      act(() => {
        mockWebSocketInstance?.simulateOpen();
      });

      // First message sent should be authenticate with token
      const firstCall = mockWebSocketInstance?.sendMock.mock.calls[0][0] as string;
      const authMessage = JSON.parse(firstCall) as { type: string; payload: { token: string } };
      expect(authMessage.type).toBe("authenticate");
      expect(authMessage.payload.token).toBe("test-session-token");
    });

    test("status is 'disconnected' initially", () => {
      const { result } = renderHook(() => useWebSocket(defaultOptions), { wrapper: createWrapper() });

      // Before connection opens, status should be disconnected
      expect(result.current.status).toBe("disconnected");
    });

    test("status becomes 'connected' after receiving authenticated message", () => {
      const { result } = renderHook(() => useWebSocket(defaultOptions), { wrapper: createWrapper() });

      act(() => {
        mockWebSocketInstance?.simulateOpen();
      });

      // After WebSocket opens, status should still be disconnected
      expect(result.current.status).toBe("disconnected");

      // Simulate receiving authenticated message
      act(() => {
        mockWebSocketInstance?.simulateMessage({
          type: "authenticated",
          payload: { adventureId: "test-adventure" }
        });
      });

      expect(result.current.status).toBe("connected");
    });

    test("calls onStatusChange when status changes to connected", () => {
      const onStatusChange = vi.fn();
      renderHook(() =>
        useWebSocket({ ...defaultOptions, onStatusChange }),
        { wrapper: createWrapper() }
      );

      act(() => {
        mockWebSocketInstance?.simulateOpen();
      });

      // Simulate receiving authenticated message
      act(() => {
        mockWebSocketInstance?.simulateMessage({
          type: "authenticated",
          payload: { adventureId: "test-adventure" }
        });
      });

      expect(onStatusChange).toHaveBeenCalledWith("connected");
    });

    test("sends start_adventure message after authenticate on connect", () => {
      renderHook(() => useWebSocket(defaultOptions), { wrapper: createWrapper() });

      act(() => {
        mockWebSocketInstance?.simulateOpen();
      });

      // Should send two messages: authenticate first, then start_adventure
      expect(mockWebSocketInstance?.sendMock).toHaveBeenCalledTimes(2);

      // Second message should be start_adventure
      const sentMessage = JSON.parse(
        mockWebSocketInstance?.sendMock.mock.calls[1][0] as string
      ) as { type: string; payload: { adventureId: string } };
      expect(sentMessage.type).toBe("start_adventure");
      expect(sentMessage.payload.adventureId).toBe("test-adventure-id");
    });
  });

  describe("message handling", () => {
    test("calls onMessage when message is received", () => {
      const onMessage = vi.fn();
      renderHook(() => useWebSocket({ ...defaultOptions, onMessage }), { wrapper: createWrapper() });

      act(() => {
        mockWebSocketInstance?.simulateOpen();
      });

      const testMessage: ServerMessage = { type: "pong" };
      act(() => {
        mockWebSocketInstance?.simulateMessage(testMessage);
      });

      expect(onMessage).toHaveBeenCalledWith(testMessage);
    });

    test("handles adventure_loaded message", () => {
      const onMessage = vi.fn();
      renderHook(() => useWebSocket({ ...defaultOptions, onMessage }), { wrapper: createWrapper() });

      act(() => {
        mockWebSocketInstance?.simulateOpen();
      });

      const loadedMessage: ServerMessage = {
        type: "adventure_loaded",
        payload: { adventureId: "test-id", history: [] },
      };
      act(() => {
        mockWebSocketInstance?.simulateMessage(loadedMessage);
      });

      expect(onMessage).toHaveBeenCalledWith(loadedMessage);
    });

    test("adventure_loaded clears existing panels", () => {
      const onMessage = vi.fn();
      const panelContextRef: { current: ReturnType<typeof usePanels> | null } = { current: null };

      // Helper wrapper to capture panel context
      function CaptureWrapper({ children }: { children: ReactNode }) {
        return (
          <ThemeProvider>
            <PanelProvider>
              <PanelContextCapture onCapture={(ctx) => { panelContextRef.current = ctx; }} />
              {children}
            </PanelProvider>
          </ThemeProvider>
        );
      }

      // Capture component
      function PanelContextCapture({ onCapture }: { onCapture: (ctx: ReturnType<typeof usePanels>) => void }) {
        const ctx = usePanels();
        onCapture(ctx);
        return null;
      }

      renderHook(
        () => useWebSocket({ ...defaultOptions, onMessage }),
        { wrapper: CaptureWrapper }
      );

      act(() => {
        mockWebSocketInstance?.simulateOpen();
      });

      // Create some panels first
      act(() => {
        mockWebSocketInstance?.simulateMessage({
          type: "panel_create",
          payload: {
            id: "panel-1",
            title: "Panel 1",
            content: "Content 1",
            position: "sidebar",
            persistent: false,
            createdAt: new Date().toISOString(),
          },
        });
        mockWebSocketInstance?.simulateMessage({
          type: "panel_create",
          payload: {
            id: "panel-2",
            title: "Panel 2",
            content: "Content 2",
            position: "header",
            persistent: false,
            createdAt: new Date().toISOString(),
          },
        });
      });

      // Verify panels exist
      expect(panelContextRef.current!.panels).toHaveLength(2);

      // Simulate adventure_loaded - should clear panels
      act(() => {
        mockWebSocketInstance?.simulateMessage({
          type: "adventure_loaded",
          payload: { adventureId: "new-adventure", history: [] },
        });
      });

      // Panels should be cleared
      expect(panelContextRef.current!.panels).toHaveLength(0);
    });
  });

  describe("sendMessage", () => {
    test("sends JSON message when connected", () => {
      const { result } = renderHook(() => useWebSocket(defaultOptions), { wrapper: createWrapper() });

      act(() => {
        mockWebSocketInstance?.simulateOpen();
      });

      // Clear the start_adventure call
      mockWebSocketInstance?.sendMock.mockClear();

      act(() => {
        result.current.sendMessage({ type: "ping" });
      });

      expect(mockWebSocketInstance?.sendMock).toHaveBeenCalledWith(
        JSON.stringify({ type: "ping" })
      );
    });

    test("does not send when disconnected", () => {
      const { result } = renderHook(() => useWebSocket(defaultOptions), { wrapper: createWrapper() });

      // Don't open the connection
      mockWebSocketInstance?.sendMock.mockClear();

      act(() => {
        result.current.sendMessage({ type: "ping" });
      });

      expect(mockWebSocketInstance?.sendMock).not.toHaveBeenCalled();
    });
  });

  describe("disconnect", () => {
    test("closes WebSocket when disconnect is called", () => {
      const { result } = renderHook(() => useWebSocket(defaultOptions), { wrapper: createWrapper() });

      act(() => {
        mockWebSocketInstance?.simulateOpen();
      });

      act(() => {
        result.current.disconnect();
      });

      expect(mockWebSocketInstance?.closeMock).toHaveBeenCalled();
      expect(result.current.status).toBe("disconnected");
    });

    test("does not reconnect after intentional disconnect", () => {
      const { result } = renderHook(() => useWebSocket(defaultOptions), { wrapper: createWrapper() });

      act(() => {
        mockWebSocketInstance?.simulateOpen();
      });

      act(() => {
        result.current.disconnect();
      });

      // Simulate close event
      act(() => {
        mockWebSocketInstance?.simulateClose();
      });

      // Fast forward timers
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.status).toBe("disconnected");
    });
  });

  describe("heartbeat", () => {
    test("sends ping every 30 seconds", () => {
      renderHook(() => useWebSocket(defaultOptions), { wrapper: createWrapper() });

      act(() => {
        mockWebSocketInstance?.simulateOpen();
      });

      mockWebSocketInstance?.sendMock.mockClear();

      // Advance 30 seconds
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      expect(mockWebSocketInstance?.sendMock).toHaveBeenCalledWith(
        JSON.stringify({ type: "ping" })
      );
    });
  });

  describe("reconnection", () => {
    test("status becomes 'reconnecting' after unintentional close", () => {
      const { result } = renderHook(() => useWebSocket(defaultOptions), { wrapper: createWrapper() });

      act(() => {
        mockWebSocketInstance?.simulateOpen();
      });

      act(() => {
        mockWebSocketInstance?.simulateClose(1006, "Connection lost");
      });

      expect(result.current.status).toBe("reconnecting");
    });

    test("attempts reconnect with exponential backoff", () => {
      renderHook(() => useWebSocket(defaultOptions), { wrapper: createWrapper() });

      act(() => {
        mockWebSocketInstance?.simulateOpen();
      });

      const firstInstance = mockWebSocketInstance;

      // First disconnect
      act(() => {
        mockWebSocketInstance?.simulateClose(1006);
      });

      // Advance 1 second (initial retry delay)
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Should have created a new WebSocket
      expect(mockWebSocketInstance).not.toBe(firstInstance);
    });
  });

  describe("theme_change message handling", () => {
    test("applies theme when valid theme_change message is received", () => {
      const onMessage = vi.fn();

      renderHook(
        () => useWebSocket({ ...defaultOptions, onMessage }),
        { wrapper: createWrapper() }
      );

      // Advance past initial debounce period
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      act(() => {
        mockWebSocketInstance?.simulateOpen();
      });

      const themeChangeMessage: ServerMessage = {
        type: "theme_change",
        payload: {
          mood: "tense",
          genre: "sci-fi",
          region: "city",
          backgroundUrl: "https://example.com/bg.jpg",
          transitionDuration: 2000,
        },
      };

      act(() => {
        mockWebSocketInstance?.simulateMessage(themeChangeMessage);
      });

      // Should still forward message to onMessage
      expect(onMessage).toHaveBeenCalledWith(themeChangeMessage);

      // Verify theme was applied by checking CSS variables
      const root = document.documentElement;
      // "tense" theme has specific colors - check one key variable
      expect(root.style.getPropertyValue("--color-primary")).toBe("#c65900");
    });

    test("applies theme with null backgroundUrl", () => {
      const onMessage = vi.fn();

      renderHook(
        () => useWebSocket({ ...defaultOptions, onMessage }),
        { wrapper: createWrapper() }
      );

      // Advance past initial debounce period
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      act(() => {
        mockWebSocketInstance?.simulateOpen();
      });

      const themeChangeMessage: ServerMessage = {
        type: "theme_change",
        payload: {
          mood: "mysterious",
          genre: "low-fantasy",
          region: "forest",
          backgroundUrl: null,
        },
      };

      act(() => {
        mockWebSocketInstance?.simulateMessage(themeChangeMessage);
      });

      // Should forward message
      expect(onMessage).toHaveBeenCalledWith(themeChangeMessage);

      // Verify theme was applied - "mysterious" has cyan primary color
      const root = document.documentElement;
      expect(root.style.getPropertyValue("--color-primary")).toBe("#00bcd4");
    });

    test("logs warning and doesn't apply theme for invalid mood", () => {
      const onMessage = vi.fn();
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      renderHook(
        () => useWebSocket({ ...defaultOptions, onMessage }),
        { wrapper: createWrapper() }
      );

      act(() => {
        mockWebSocketInstance?.simulateOpen();
      });

      // Store current theme color
      const root = document.documentElement;
      const colorBeforeInvalid = root.style.getPropertyValue("--color-primary");

      // Create a spy for console.error (Zod validation errors go to console.error)
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Intentionally invalid message - mood is not a valid enum value
      // simulateMessage accepts unknown to allow testing invalid wire data
      const invalidThemeMessage = {
        type: "theme_change",
        payload: {
          mood: "invalid-mood",
          genre: "sci-fi",
          region: "city",
          backgroundUrl: null,
        },
      };

      act(() => {
        mockWebSocketInstance?.simulateMessage(invalidThemeMessage);
      });

      // Should log error (Zod validation rejects the entire message at boundary)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Invalid server message:",
        expect.stringContaining("mood")
      );

      // Message should NOT be forwarded to onMessage (rejected at boundary)
      expect(onMessage).not.toHaveBeenCalledWith(invalidThemeMessage);

      // Theme should not have changed
      expect(root.style.getPropertyValue("--color-primary")).toBe(colorBeforeInvalid);

      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    test("applies all valid moods correctly", () => {
      renderHook(
        () => useWebSocket(defaultOptions),
        { wrapper: createWrapper() }
      );

      // Advance past initial debounce period
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      act(() => {
        mockWebSocketInstance?.simulateOpen();
      });

      const validMoods = ["calm", "tense", "ominous", "triumphant", "mysterious"] as const;
      const expectedColors = {
        calm: "#2196f3",      // blue
        tense: "#c65900",     // dark orange (WCAG)
        ominous: "#ba68c8",   // light purple (WCAG)
        triumphant: "#b8860b", // dark gold (WCAG)
        mysterious: "#00bcd4", // cyan
      };

      validMoods.forEach((mood, index) => {
        // Advance time between theme changes to avoid debouncing
        if (index > 0) {
          act(() => {
            vi.advanceTimersByTime(1100);
          });
        }

        const themeChangeMessage: ServerMessage = {
          type: "theme_change",
          payload: {
            mood,
            genre: "sci-fi",
            region: "city",
            backgroundUrl: null,
          },
        };

        act(() => {
          mockWebSocketInstance?.simulateMessage(themeChangeMessage);
        });

        // Verify theme was applied by checking CSS variable
        const root = document.documentElement;
        expect(root.style.getPropertyValue("--color-primary")).toBe(expectedColors[mood]);
      });
    });

    test("applies theme with custom transitionDuration", () => {
      const onMessage = vi.fn();

      renderHook(
        () => useWebSocket({ ...defaultOptions, onMessage }),
        { wrapper: createWrapper() }
      );

      // Advance past initial debounce period
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      act(() => {
        mockWebSocketInstance?.simulateOpen();
      });

      const themeChangeMessage: ServerMessage = {
        type: "theme_change",
        payload: {
          mood: "ominous",
          genre: "horror",
          region: "ruins",
          backgroundUrl: null,
          transitionDuration: 3000,
        },
      };

      act(() => {
        mockWebSocketInstance?.simulateMessage(themeChangeMessage);
      });

      // Should forward message
      expect(onMessage).toHaveBeenCalledWith(themeChangeMessage);

      // Verify theme was applied
      const root = document.documentElement;
      expect(root.style.getPropertyValue("--color-primary")).toBe("#ba68c8");
    });
  });

  describe("panel message handling", () => {
    // Type for captured panel context
    type PanelContextValue = ReturnType<typeof usePanels>;

    // Helper to create test panel data
    const createTestPanel = (overrides: Partial<Panel> = {}): Panel => ({
      id: "test-panel-1",
      title: "Test Panel",
      content: "Test content",
      position: "sidebar",
      persistent: false,
      createdAt: new Date().toISOString(),
      ...overrides,
    });

    // Shared context capture component
    function PanelContextCapture({ onCapture }: { onCapture: (ctx: PanelContextValue) => void }) {
      const ctx = usePanels();
      onCapture(ctx);
      return null;
    }

    // Helper to create wrapper with context capture
    function createWrapperWithCapture(captureRef: { current: PanelContextValue | null }) {
      return ({ children }: { children: ReactNode }) => (
        <ThemeProvider>
          <PanelProvider>
            <PanelContextCapture onCapture={(ctx) => { captureRef.current = ctx; }} />
            {children}
          </PanelProvider>
        </ThemeProvider>
      );
    }

    test("panel_create message adds panel to context", () => {
      const onMessage = vi.fn();
      const panelContextRef: { current: PanelContextValue | null } = { current: null };

      renderHook(
        () => useWebSocket({ ...defaultOptions, onMessage }),
        { wrapper: createWrapperWithCapture(panelContextRef) }
      );

      act(() => {
        mockWebSocketInstance?.simulateOpen();
      });

      // Initial state - no panels
      expect(panelContextRef.current!.panels).toHaveLength(0);

      const testPanel = createTestPanel();
      const panelCreateMessage: ServerMessage = {
        type: "panel_create",
        payload: testPanel,
      };

      act(() => {
        mockWebSocketInstance?.simulateMessage(panelCreateMessage);
      });

      // Panel should be added
      expect(panelContextRef.current!.panels).toHaveLength(1);
      expect(panelContextRef.current!.panels[0].id).toBe("test-panel-1");
      expect(panelContextRef.current!.panels[0].title).toBe("Test Panel");

      // Message should be forwarded to onMessage
      expect(onMessage).toHaveBeenCalledWith(panelCreateMessage);
    });

    test("panel_update message updates panel content", () => {
      const onMessage = vi.fn();
      const panelContextRef: { current: PanelContextValue | null } = { current: null };

      renderHook(
        () => useWebSocket({ ...defaultOptions, onMessage }),
        { wrapper: createWrapperWithCapture(panelContextRef) }
      );

      act(() => {
        mockWebSocketInstance?.simulateOpen();
      });

      // First, create a panel
      const testPanel = createTestPanel({ content: "Original content" });
      act(() => {
        mockWebSocketInstance?.simulateMessage({
          type: "panel_create",
          payload: testPanel,
        });
      });

      expect(panelContextRef.current!.panels[0].content).toBe("Original content");

      // Now update it
      const panelUpdateMessage: ServerMessage = {
        type: "panel_update",
        payload: {
          id: "test-panel-1",
          content: "Updated content",
        },
      };

      act(() => {
        mockWebSocketInstance?.simulateMessage(panelUpdateMessage);
      });

      // Content should be updated
      expect(panelContextRef.current!.panels[0].content).toBe("Updated content");

      // Message should be forwarded
      expect(onMessage).toHaveBeenCalledWith(panelUpdateMessage);
    });

    test("panel_dismiss message removes panel from context", () => {
      const onMessage = vi.fn();
      const panelContextRef: { current: PanelContextValue | null } = { current: null };

      renderHook(
        () => useWebSocket({ ...defaultOptions, onMessage }),
        { wrapper: createWrapperWithCapture(panelContextRef) }
      );

      act(() => {
        mockWebSocketInstance?.simulateOpen();
      });

      // Create a panel first
      const testPanel = createTestPanel();
      act(() => {
        mockWebSocketInstance?.simulateMessage({
          type: "panel_create",
          payload: testPanel,
        });
      });

      expect(panelContextRef.current!.panels).toHaveLength(1);

      // Now dismiss it
      const panelDismissMessage: ServerMessage = {
        type: "panel_dismiss",
        payload: {
          id: "test-panel-1",
        },
      };

      act(() => {
        mockWebSocketInstance?.simulateMessage(panelDismissMessage);
      });

      // Panel should be removed
      expect(panelContextRef.current!.panels).toHaveLength(0);

      // Message should be forwarded
      expect(onMessage).toHaveBeenCalledWith(panelDismissMessage);
    });

    test("panel_update for non-existent panel logs warning", () => {
      const onMessage = vi.fn();
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      renderHook(
        () => useWebSocket({ ...defaultOptions, onMessage }),
        { wrapper: createWrapper() }
      );

      act(() => {
        mockWebSocketInstance?.simulateOpen();
      });

      // Update a panel that doesn't exist
      const panelUpdateMessage: ServerMessage = {
        type: "panel_update",
        payload: {
          id: "non-existent-panel",
          content: "New content",
        },
      };

      act(() => {
        mockWebSocketInstance?.simulateMessage(panelUpdateMessage);
      });

      // PanelContext logs warning for non-existent panel
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("non-existent-panel")
      );

      // Message should still be forwarded
      expect(onMessage).toHaveBeenCalledWith(panelUpdateMessage);

      consoleWarnSpy.mockRestore();
    });

    test("panel_dismiss for non-existent panel logs warning", () => {
      const onMessage = vi.fn();
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      renderHook(
        () => useWebSocket({ ...defaultOptions, onMessage }),
        { wrapper: createWrapper() }
      );

      act(() => {
        mockWebSocketInstance?.simulateOpen();
      });

      // Dismiss a panel that doesn't exist
      const panelDismissMessage: ServerMessage = {
        type: "panel_dismiss",
        payload: {
          id: "non-existent-panel",
        },
      };

      act(() => {
        mockWebSocketInstance?.simulateMessage(panelDismissMessage);
      });

      // PanelContext logs warning for non-existent panel
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("non-existent-panel")
      );

      // Message should still be forwarded
      expect(onMessage).toHaveBeenCalledWith(panelDismissMessage);

      consoleWarnSpy.mockRestore();
    });

    test("malformed panel_create message is rejected at boundary", () => {
      const onMessage = vi.fn();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      renderHook(
        () => useWebSocket({ ...defaultOptions, onMessage }),
        { wrapper: createWrapper() }
      );

      act(() => {
        mockWebSocketInstance?.simulateOpen();
      });

      // Send malformed panel_create (missing required fields)
      const malformedMessage = {
        type: "panel_create",
        payload: {
          id: "test-panel",
          // Missing title, content, position, persistent, createdAt
        },
      };

      act(() => {
        mockWebSocketInstance?.simulateMessage(malformedMessage);
      });

      // Should log validation error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Invalid server message:",
        expect.any(String)
      );

      // Should NOT forward to onMessage (rejected at boundary)
      expect(onMessage).not.toHaveBeenCalledWith(expect.objectContaining({
        type: "panel_create",
      }));

      consoleErrorSpy.mockRestore();
    });

    test("malformed panel_update message is rejected at boundary", () => {
      const onMessage = vi.fn();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      renderHook(
        () => useWebSocket({ ...defaultOptions, onMessage }),
        { wrapper: createWrapper() }
      );

      act(() => {
        mockWebSocketInstance?.simulateOpen();
      });

      // Send malformed panel_update (invalid id format)
      const malformedMessage = {
        type: "panel_update",
        payload: {
          id: "invalid id with spaces!!!",
          content: "New content",
        },
      };

      act(() => {
        mockWebSocketInstance?.simulateMessage(malformedMessage);
      });

      // Should log validation error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Invalid server message:",
        expect.any(String)
      );

      // Should NOT forward to onMessage
      expect(onMessage).not.toHaveBeenCalledWith(expect.objectContaining({
        type: "panel_update",
      }));

      consoleErrorSpy.mockRestore();
    });

    test("multiple panels can be created and managed", () => {
      const onMessage = vi.fn();
      const panelContextRef: { current: PanelContextValue | null } = { current: null };

      renderHook(
        () => useWebSocket({ ...defaultOptions, onMessage }),
        { wrapper: createWrapperWithCapture(panelContextRef) }
      );

      act(() => {
        mockWebSocketInstance?.simulateOpen();
      });

      // Create multiple panels
      act(() => {
        mockWebSocketInstance?.simulateMessage({
          type: "panel_create",
          payload: createTestPanel({ id: "panel-1", title: "Panel 1" }),
        });
        mockWebSocketInstance?.simulateMessage({
          type: "panel_create",
          payload: createTestPanel({ id: "panel-2", title: "Panel 2" }),
        });
        mockWebSocketInstance?.simulateMessage({
          type: "panel_create",
          payload: createTestPanel({ id: "panel-3", title: "Panel 3" }),
        });
      });

      expect(panelContextRef.current!.panels).toHaveLength(3);

      // Update one
      act(() => {
        mockWebSocketInstance?.simulateMessage({
          type: "panel_update",
          payload: { id: "panel-2", content: "Updated panel 2" },
        });
      });

      const panel2 = panelContextRef.current!.panels.find((p: Panel) => p.id === "panel-2");
      expect(panel2?.content).toBe("Updated panel 2");

      // Dismiss one
      act(() => {
        mockWebSocketInstance?.simulateMessage({
          type: "panel_dismiss",
          payload: { id: "panel-1" },
        });
      });

      expect(panelContextRef.current!.panels).toHaveLength(2);
      expect(panelContextRef.current!.panels.find((p: Panel) => p.id === "panel-1")).toBeUndefined();
    });
  });
});
