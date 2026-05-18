import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, unlinkSync } from "fs";
import { createApp } from "../packages/backend/src/app.js";
import {
  createMockSessionRunner,
  type ScriptedEvent,
} from "../packages/backend/tests/helpers/mock-session-runner.js";

/**
 * Integration test with mock SessionRunner: starts the daemon with an
 * injected runner (no real API key needed), sends POST /adventures/:id/message,
 * and verifies the full SSE chain through the Unix socket.
 */

const TEST_SOCKET = `/tmp/claude-1000/mock-sdk-integration-${Date.now()}.sock`;
const TEST_ADVENTURES = `/tmp/claude-1000/mock-sdk-adventures-${Date.now()}`;

const script: ScriptedEvent[] = [
  { type: "text", text: "Welcome, brave " },
  { type: "text", text: "adventurer!" },
  { type: "tool_use", name: "bash", result: "Rolled 2d6: [5, 3] = 8" },
  { type: "text", text: " You rolled an 8!" },
  { type: "done", fullResponse: "Welcome, brave adventurer! You rolled an 8!" },
];

const sessionRunner = createMockSessionRunner(script);

let server: ReturnType<typeof Bun.serve>;

beforeAll(() => {
  mkdirSync(`${TEST_ADVENTURES}/quest`, { recursive: true });
  writeFileSync(`${TEST_ADVENTURES}/quest/character.md`, "# Hero\nA brave warrior.");
  writeFileSync(`${TEST_ADVENTURES}/quest/world.md`, "# The Realm\nA dangerous land.");

  const app = createApp({
    adventuresPath: TEST_ADVENTURES,
    sessionRunner,
    noAi: true,
  });

  server = Bun.serve({
    fetch: app.fetch,
    unix: TEST_SOCKET,
    idleTimeout: 0 as never,
  });
});

afterAll(() => {
  if (server) server.stop(true);
  try { unlinkSync(TEST_SOCKET); } catch { /* already cleaned */ }
  try { rmSync(TEST_ADVENTURES, { recursive: true, force: true }); } catch { /* best effort */ }
});

function parseSSE(text: string): Array<{ event: string; data: string }> {
  const events: Array<{ event: string; data: string }> = [];
  const blocks = text.split("\n\n").filter(Boolean);
  for (const block of blocks) {
    const lines = block.split("\n");
    let event = "";
    let data = "";
    for (const line of lines) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) data = line.slice(5).trim();
    }
    if (event) events.push({ event, data });
  }
  return events;
}

describe("Mock SDK integration: POST /adventures/:id/message", () => {
  test("streams text, tool_use, and done events through Unix socket", async () => {
    const res = await fetch("http://localhost/adventures/quest/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "I enter the cave" }),
      unix: TEST_SOCKET,
    } as RequestInit);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const body = await res.text();
    const events = parseSSE(body);

    const textEvents = events.filter((e) => e.event === "text");
    expect(textEvents.length).toBeGreaterThanOrEqual(2);
    const firstText = JSON.parse(textEvents[0].data);
    expect(firstText.text).toBe("Welcome, brave ");

    const toolEvents = events.filter((e) => e.event === "tool_use");
    expect(toolEvents.length).toBe(1);
    const toolData = JSON.parse(toolEvents[0].data);
    expect(toolData.name).toBe("bash");
    expect(toolData.result).toBe("Rolled 2d6: [5, 3] = 8");

    const doneEvents = events.filter((e) => e.event === "done");
    expect(doneEvents.length).toBe(1);
    const doneData = JSON.parse(doneEvents[0].data);
    expect(doneData.fullResponse).toBe("Welcome, brave adventurer! You rolled an 8!");
  });

  test("persists history after message exchange", async () => {
    const res = await fetch("http://localhost/adventures/quest/history", {
      unix: TEST_SOCKET,
    } as RequestInit);

    expect(res.status).toBe(200);
    const data = await res.json() as { exists: boolean; history: string | null };
    expect(data.exists).toBe(true);
    expect(data.history).toContain("**Player:** I enter the cave");
    expect(data.history).toContain("**GM:**");
  });

  test("session runner receives the expected prompt and adventure context", () => {
    expect(sessionRunner.calls.length).toBeGreaterThanOrEqual(1);
    const call = sessionRunner.calls[0];
    expect(call.playerMessage).toBe("I enter the cave");
    expect(call.systemPrompt).toContain("Hero");
    expect(call.systemPrompt).toContain("The Realm");
  });
});
