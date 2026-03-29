// Panel Files Integration Tests
// Tests for PostToolUse hook panel file detection and WebSocket emission

import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { WSContext } from "hono/ws";
import type { ServerMessage } from "../../src/types/protocol";
import { logger } from "../../src/logger";

// Simplified hook types for testing - actual SDK types have more fields
// but handlePostToolUse only uses these
interface TestHookInput {
  hook_event_name: "PostToolUse";
  tool_name: string;
  tool_input: Record<string, unknown>;
}

interface TestHookOutput {
  continue: boolean;
}

// Use absolute paths to avoid path doubling issues
const TEST_ADVENTURES_DIR = resolve("./test-panel-files-adventures");
const TEST_PROJECT_DIR = resolve("./test-panel-files-project");

// Set environment variables before importing modules that use them
process.env.ADVENTURES_DIR = TEST_ADVENTURES_DIR;
process.env.PROJECT_DIR = TEST_PROJECT_DIR;
process.env.MOCK_SDK = "true";

// Import after setting env var
import type { GameSession as GameSessionType } from "../../src/game-session";
import type { AdventureStateManager as AdventureStateManagerType } from "../../src/adventure-state";

const { GameSession } = (await import("../../src/game-session")) as {
  GameSession: typeof GameSessionType;
};
const { AdventureStateManager } = (await import("../../src/adventure-state")) as {
  AdventureStateManager: typeof AdventureStateManagerType;
};

// Mock WebSocket context for testing
function createMockWS(): {
  ws: WSContext;
  messages: ServerMessage[];
} {
  const messages: ServerMessage[] = [];

  const ws = {
    send: mock((data: string) => {
      const message = JSON.parse(data) as ServerMessage;
      messages.push(message);
    }),
    close: mock(() => {}),
    readyState: 1, // OPEN
  } as unknown as WSContext;

  return { ws, messages };
}

describe("Panel File Detection via PostToolUse", () => {
  let stateManager: InstanceType<typeof AdventureStateManager>;
  let adventureId: string;
  let sessionToken: string;
  const playerRef = "players/test-hero";

  beforeEach(async () => {
    // Clean and create test directories
    await rm(TEST_ADVENTURES_DIR, { recursive: true, force: true });
    await rm(TEST_PROJECT_DIR, { recursive: true, force: true });
    await mkdir(TEST_ADVENTURES_DIR, { recursive: true });
    await mkdir(TEST_PROJECT_DIR, { recursive: true });
    await mkdir(join(TEST_PROJECT_DIR, playerRef, "panels"), { recursive: true });

    // Create a test adventure with playerRef set
    stateManager = new AdventureStateManager(TEST_ADVENTURES_DIR);
    const state = await stateManager.create();
    adventureId = state.id;
    sessionToken = state.sessionToken;

    // Set playerRef in state
    await stateManager.updatePlayerRef(playerRef);
  });

  afterEach(async () => {
    // Clean up after each test
    await rm(TEST_ADVENTURES_DIR, { recursive: true, force: true });
    await rm(TEST_PROJECT_DIR, { recursive: true, force: true });
  });

  describe("Write tool panel detection", () => {
    test("valid panel file write emits panel_create message", async () => {
      const { ws, messages } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      const panelPath = join(TEST_PROJECT_DIR, playerRef, "panels", "weather.md");
      const panelContent = `---
title: Weather Status
position: sidebar
priority: medium
---
Clear skies, light breeze.`;

      // Write the panel file
      await writeFile(panelPath, panelContent);

      // Simulate PostToolUse hook for Write tool
      const hookInput: TestHookInput = {
        hook_event_name: "PostToolUse",
        tool_name: "Write",
        tool_input: {
          file_path: panelPath,
          content: panelContent,
        },
      };

      // Use any cast to access private handlePostToolUse method
      const result = (session as unknown as {
        handlePostToolUse(input: TestHookInput, log: typeof logger): TestHookOutput;
      }).handlePostToolUse(hookInput, logger);
      expect(result.continue).toBe(true);

      // Find panel_create message
      const panelCreateMsg = messages.find(m => m.type === "panel_create");
      expect(panelCreateMsg).toBeDefined();
      expect(panelCreateMsg?.payload?.id).toBe("weather");
      expect(panelCreateMsg?.payload?.title).toBe("Weather Status");
      expect(panelCreateMsg?.payload?.position).toBe("sidebar");
      expect(panelCreateMsg?.payload?.content).toBe("Clear skies, light breeze.");
    });

    test("overwriting panel file emits panel_update message", async () => {
      const { ws, messages } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      const panelPath = join(TEST_PROJECT_DIR, playerRef, "panels", "timer.md");

      // First create the panel
      const initialContent = `---
title: Countdown
position: header
---
5 rounds remaining`;
      await writeFile(panelPath, initialContent);

      // Use any cast to access private handlePostToolUse method
      const sessionWithHook = session as unknown as {
        handlePostToolUse(input: TestHookInput, log: typeof logger): TestHookOutput;
        panelValidationErrors: string[];
        knownPanelIds: Set<string>;
      };

      sessionWithHook.handlePostToolUse({
        hook_event_name: "PostToolUse",
        tool_name: "Write",
        tool_input: { file_path: panelPath, content: initialContent },
      } as TestHookInput, logger);

      // Clear messages
      messages.length = 0;

      // Update the panel
      const updatedContent = `---
title: Countdown
position: header
---
3 rounds remaining`;
      await writeFile(panelPath, updatedContent);

      sessionWithHook.handlePostToolUse({
        hook_event_name: "PostToolUse",
        tool_name: "Write",
        tool_input: { file_path: panelPath, content: updatedContent },
      } as TestHookInput, logger);

      // Find panel_update message
      const panelUpdateMsg = messages.find(m => m.type === "panel_update");
      expect(panelUpdateMsg).toBeDefined();
      expect(panelUpdateMsg?.payload?.id).toBe("timer");
      expect(panelUpdateMsg?.payload?.content).toBe("3 rounds remaining");
    });

    test("invalid frontmatter stores validation error and emits no message", async () => {
      const { ws, messages } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      const panelPath = join(TEST_PROJECT_DIR, playerRef, "panels", "broken.md");

      // Missing required title field
      const invalidContent = `---
position: sidebar
---
Some content`;
      await writeFile(panelPath, invalidContent);

      // Use any cast to access private properties
      const sessionWithHook = session as unknown as {
        handlePostToolUse(input: TestHookInput, log: typeof logger): TestHookOutput;
        panelValidationErrors: string[];
      };

      sessionWithHook.handlePostToolUse({
        hook_event_name: "PostToolUse",
        tool_name: "Write",
        tool_input: { file_path: panelPath, content: invalidContent },
      } as TestHookInput, logger);

      // No panel message should be sent
      const panelMsgs = messages.filter(m =>
        m.type === "panel_create" || m.type === "panel_update"
      );
      expect(panelMsgs).toHaveLength(0);

      // Validation error should be stored
      expect(sessionWithHook.panelValidationErrors.length).toBeGreaterThan(0);
      expect(sessionWithHook.panelValidationErrors[0]).toContain("broken.md");
    });
  });

  describe("Edit tool panel detection", () => {
    test("Edit tool on panel file emits panel_update message", async () => {
      const { ws, messages } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      const panelPath = join(TEST_PROJECT_DIR, playerRef, "panels", "weather.md");

      // First create the panel via Write
      const initialContent = `---
title: Weather Status
position: sidebar
priority: medium
---
Clear skies, light breeze.`;
      await writeFile(panelPath, initialContent);

      // Use any cast to access private handlePostToolUse method
      const sessionWithHook = session as unknown as {
        handlePostToolUse(input: TestHookInput, log: typeof logger): TestHookOutput;
        knownPanelIds: Set<string>;
      };

      sessionWithHook.handlePostToolUse({
        hook_event_name: "PostToolUse",
        tool_name: "Write",
        tool_input: { file_path: panelPath, content: initialContent },
      } as TestHookInput, logger);

      // Panel should now be tracked
      expect(sessionWithHook.knownPanelIds.has("weather")).toBe(true);

      // Clear messages
      messages.length = 0;

      // Now simulate Edit tool updating the panel
      const updatedContent = `---
title: Weather Status
position: sidebar
priority: medium
---
Storm approaching from the west.`;
      await writeFile(panelPath, updatedContent);

      sessionWithHook.handlePostToolUse({
        hook_event_name: "PostToolUse",
        tool_name: "Edit",
        tool_input: { file_path: panelPath },
      } as TestHookInput, logger);

      // Find panel_update message
      const panelUpdateMsg = messages.find(m => m.type === "panel_update");
      expect(panelUpdateMsg).toBeDefined();
      expect(panelUpdateMsg?.payload?.id).toBe("weather");
      expect(panelUpdateMsg?.payload?.content).toBe("Storm approaching from the west.");
    });

    test("Edit tool on new panel file emits panel_create message", async () => {
      const { ws, messages } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      const panelPath = join(TEST_PROJECT_DIR, playerRef, "panels", "timer.md");
      const panelContent = `---
title: Countdown Timer
position: header
---
5 rounds remaining`;
      await writeFile(panelPath, panelContent);

      // Simulate Edit tool (could happen if file was created via edit)
      const sessionWithHook = session as unknown as {
        handlePostToolUse(input: TestHookInput, log: typeof logger): TestHookOutput;
        knownPanelIds: Set<string>;
      };

      sessionWithHook.handlePostToolUse({
        hook_event_name: "PostToolUse",
        tool_name: "Edit",
        tool_input: { file_path: panelPath },
      } as TestHookInput, logger);

      // Find panel_create message
      const panelCreateMsg = messages.find(m => m.type === "panel_create");
      expect(panelCreateMsg).toBeDefined();
      expect(panelCreateMsg?.payload?.id).toBe("timer");
      expect(panelCreateMsg?.payload?.title).toBe("Countdown Timer");
      expect(panelCreateMsg?.payload?.content).toBe("5 rounds remaining");
    });
  });

  describe("Bash rm panel detection", () => {
    test("rm command on panel file emits panel_dismiss message", async () => {
      const { ws, messages } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      const panelPath = join(TEST_PROJECT_DIR, playerRef, "panels", "alert.md");

      // First create the panel so it's tracked
      const content = `---
title: Alert
position: overlay
---
Warning!`;
      await writeFile(panelPath, content);

      // Use any cast to access private properties
      const sessionWithHook = session as unknown as {
        handlePostToolUse(input: TestHookInput, log: typeof logger): TestHookOutput;
        panelValidationErrors: string[];
        knownPanelIds: Set<string>;
      };

      sessionWithHook.handlePostToolUse({
        hook_event_name: "PostToolUse",
        tool_name: "Write",
        tool_input: { file_path: panelPath, content },
      } as TestHookInput, logger);

      expect(sessionWithHook.knownPanelIds.has("alert")).toBe(true);

      // Clear messages
      messages.length = 0;

      // Simulate file deletion (rm happened)
      await rm(panelPath);

      // Simulate Bash rm command
      sessionWithHook.handlePostToolUse({
        hook_event_name: "PostToolUse",
        tool_name: "Bash",
        tool_input: { command: `rm ${panelPath}` },
      } as TestHookInput, logger);

      // Find panel_dismiss message
      const dismissMsg = messages.find(m => m.type === "panel_dismiss");
      expect(dismissMsg).toBeDefined();
      expect(dismissMsg?.payload?.id).toBe("alert");

      // Panel should be removed from known set
      expect(sessionWithHook.knownPanelIds.has("alert")).toBe(false);
    });

    test("rm -rf panels directory dismisses all tracked panels", async () => {
      const { ws, messages } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      const panelsDir = join(TEST_PROJECT_DIR, playerRef, "panels");

      // Create two panels
      await writeFile(join(panelsDir, "weather.md"), `---
title: Weather
position: sidebar
---
Clear`);
      await writeFile(join(panelsDir, "timer.md"), `---
title: Timer
position: header
---
5 rounds`);

      // Use any cast to access private properties
      const sessionWithHook = session as unknown as {
        handlePostToolUse(input: TestHookInput, log: typeof logger): TestHookOutput;
        knownPanelIds: Set<string>;
      };

      sessionWithHook.handlePostToolUse({
        hook_event_name: "PostToolUse",
        tool_name: "Write",
        tool_input: { file_path: join(panelsDir, "weather.md"), content: "" },
      } as TestHookInput, logger);
      sessionWithHook.handlePostToolUse({
        hook_event_name: "PostToolUse",
        tool_name: "Write",
        tool_input: { file_path: join(panelsDir, "timer.md"), content: "" },
      } as TestHookInput, logger);

      expect(sessionWithHook.knownPanelIds.size).toBe(2);

      // Clear messages
      messages.length = 0;

      // Simulate deletion of panels directory
      await rm(panelsDir, { recursive: true });
      await mkdir(panelsDir, { recursive: true }); // Recreate empty

      // Simulate rm -rf command
      sessionWithHook.handlePostToolUse({
        hook_event_name: "PostToolUse",
        tool_name: "Bash",
        tool_input: { command: `rm -rf ${panelsDir}` },
      } as TestHookInput, logger);

      // Both panels should be dismissed
      const dismissMsgs = messages.filter(m => m.type === "panel_dismiss");
      expect(dismissMsgs.length).toBe(2);

      expect(sessionWithHook.knownPanelIds.size).toBe(0);
    });
  });

  describe("Non-panel paths", () => {
    test("write to non-panel file does not emit panel message", async () => {
      const { ws, messages } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      const normalPath = join(TEST_PROJECT_DIR, playerRef, "sheet.md");

      // Use any cast to access private handlePostToolUse method
      const sessionWithHook = session as unknown as {
        handlePostToolUse(input: TestHookInput, log: typeof logger): TestHookOutput;
      };

      sessionWithHook.handlePostToolUse({
        hook_event_name: "PostToolUse",
        tool_name: "Write",
        tool_input: { file_path: normalPath, content: "# Character Sheet" },
      } as TestHookInput, logger);

      const panelMsgs = messages.filter(m =>
        m.type === "panel_create" || m.type === "panel_update" || m.type === "panel_dismiss"
      );
      expect(panelMsgs).toHaveLength(0);
    });
  });

  describe("Session initialization panel scanning", () => {
    test("existing panel files are restored on session initialize (REQ-F-16)", async () => {
      const panelsDir = join(TEST_PROJECT_DIR, playerRef, "panels");

      // Create panel file BEFORE initializing session
      await writeFile(join(panelsDir, "weather.md"), `---
title: Weather Status
position: sidebar
priority: high
---
Clear skies, light breeze.`);

      await writeFile(join(panelsDir, "timer.md"), `---
title: Countdown
position: header
---
5 rounds remaining`);

      // Now initialize session - should scan and emit panel_create
      const { ws, messages } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      // Find panel_create messages
      const panelCreateMsgs = messages.filter(m => m.type === "panel_create");
      expect(panelCreateMsgs.length).toBe(2);

      // Verify panel content
      const weatherPanel = panelCreateMsgs.find(m => m.payload?.id === "weather");
      expect(weatherPanel).toBeDefined();
      expect(weatherPanel?.payload?.title).toBe("Weather Status");
      expect(weatherPanel?.payload?.position).toBe("sidebar");

      const timerPanel = panelCreateMsgs.find(m => m.payload?.id === "timer");
      expect(timerPanel).toBeDefined();
      expect(timerPanel?.payload?.title).toBe("Countdown");
      expect(timerPanel?.payload?.position).toBe("header");
    });

    test("invalid panel files are skipped during initialization scan", async () => {
      const panelsDir = join(TEST_PROJECT_DIR, playerRef, "panels");

      // Create valid panel
      await writeFile(join(panelsDir, "valid.md"), `---
title: Valid Panel
position: sidebar
---
Content here`);

      // Create invalid panel (missing title)
      await writeFile(join(panelsDir, "invalid.md"), `---
position: sidebar
---
Content here`);

      const { ws, messages } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      // Only valid panel should be created
      const panelCreateMsgs = messages.filter(m => m.type === "panel_create");
      expect(panelCreateMsgs.length).toBe(1);
      expect(panelCreateMsgs[0]?.payload?.id).toBe("valid");
    });
  });
});
