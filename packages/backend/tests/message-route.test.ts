import { describe, test, expect } from "bun:test";
import { Hono } from "hono";
import { createAdventureService } from "../src/services/adventure-service.js";
import { createAdventureRoutes } from "../src/routes/adventure-routes.js";
import { createHistoryService } from "../src/services/history-service.js";
import { createSessionRunner } from "../src/services/session-runner.js";
import { createMockFileOps } from "./helpers/mock-file-ops.js";
import {
  createMockQueryFn,
  createThrowingQueryFn,
  textDelta,
  successResult,
  errorResult,
  assistantWithToolUse,
  userWithToolResult,
} from "./helpers/mock-query.js";
import type { QueryFn } from "../src/services/session-runner.js";

const ADVENTURES_ROOT = "/test/adventures";

function buildTestApp(
  files: Record<string, string>,
  queryFn: QueryFn,
) {
  const fileOps = createMockFileOps(files);
  const adventureService = createAdventureService({ fileOps, adventuresPath: ADVENTURES_ROOT });
  const historyService = createHistoryService({ fileOps });
  const sessionRunner = createSessionRunner({
    queryFn,
    config: {
      pluginPaths: ["/plugins/corvran", "/plugins/d20-system", "/plugins/daggerheart-system"],
      model: "test-model",
    },
  });

  const module = createAdventureRoutes({
    adventureService,
    historyService,
    sessionRunner,
  });

  const app = new Hono();
  app.route("/", module.routes);
  return { app, fileOps };
}

/** Parse SSE text into an array of { event, data } objects */
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

describe("POST /adventures/:id/message", () => {
  test("returns 400 for empty body", async () => {
    const queryFn = createMockQueryFn([successResult("ok")]);
    const { app } = buildTestApp(
      { [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero" },
      queryFn,
    );

    const res = await app.request("/adventures/quest/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  test("returns 400 for missing message field", async () => {
    const queryFn = createMockQueryFn([successResult("ok")]);
    const { app } = buildTestApp(
      { [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero" },
      queryFn,
    );

    const res = await app.request("/adventures/quest/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "wrong field" }),
    });
    expect(res.status).toBe(400);
  });

  test("returns 400 for empty message string", async () => {
    const queryFn = createMockQueryFn([successResult("ok")]);
    const { app } = buildTestApp(
      { [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero" },
      queryFn,
    );

    const res = await app.request("/adventures/quest/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "" }),
    });
    expect(res.status).toBe(400);
  });

  test("returns 404 for nonexistent adventure", async () => {
    const queryFn = createMockQueryFn([successResult("ok")]);
    const { app } = buildTestApp({}, queryFn);

    const res = await app.request("/adventures/nope/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello" }),
    });
    expect(res.status).toBe(404);
  });

  test("streams text events as SSE", async () => {
    const queryFn = createMockQueryFn([
      textDelta("Hello "),
      textDelta("world!"),
      successResult("Hello world!"),
    ]);
    const { app } = buildTestApp(
      { [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero" },
      queryFn,
    );

    const res = await app.request("/adventures/quest/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hi" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const text = await res.text();
    const events = parseSSE(text);

    // Should have text events and a done event
    const textEvents = events.filter((e) => e.event === "text");
    expect(textEvents.length).toBe(2);
    expect(JSON.parse(textEvents[0].data)).toEqual({ text: "Hello " });
    expect(JSON.parse(textEvents[1].data)).toEqual({ text: "world!" });

    const doneEvents = events.filter((e) => e.event === "done");
    expect(doneEvents.length).toBe(1);
    expect(JSON.parse(doneEvents[0].data)).toEqual({ fullResponse: "Hello world!" });
  });

  test("appends player message and GM response to history", async () => {
    const queryFn = createMockQueryFn([
      textDelta("Welcome!"),
      successResult("Welcome!"),
    ]);
    const { app, fileOps } = buildTestApp(
      { [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero" },
      queryFn,
    );

    const res = await app.request("/adventures/quest/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello" }),
    });
    // Consume stream to ensure all writes complete before checking history
    await res.text();

    const history = fileOps.getStore().get(`${ADVENTURES_ROOT}/quest/history.md`);
    expect(history).toBe(
      "**Player:** Hello\n\n**GM:** Welcome!\n\n"
    );
  });

  test("context overflow error returns spec error message", async () => {
    const queryFn = createMockQueryFn([
      errorResult(["context window exceeded: too many tokens"]),
    ]);
    const { app } = buildTestApp(
      { [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero" },
      queryFn,
    );

    const res = await app.request("/adventures/quest/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello" }),
    });

    const text = await res.text();
    const events = parseSSE(text);
    const errorEvents = events.filter((e) => e.event === "error");
    expect(errorEvents.length).toBe(1);
    expect(JSON.parse(errorEvents[0].data)).toEqual({
      error: "Adventure history is too long. Edit history.md to shorten it.",
    });
  });

  test("non-context error returns raw error message", async () => {
    const queryFn = createMockQueryFn([
      errorResult(["API rate limit exceeded"]),
    ]);
    const { app } = buildTestApp(
      { [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero" },
      queryFn,
    );

    const res = await app.request("/adventures/quest/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello" }),
    });

    const text = await res.text();
    const events = parseSSE(text);
    const errorEvents = events.filter((e) => e.event === "error");
    expect(errorEvents.length).toBe(1);
    expect(JSON.parse(errorEvents[0].data)).toEqual({
      error: "API rate limit exceeded",
    });
  });

  test("AbortError appends partial text to history", async () => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";

    const queryFn = createThrowingQueryFn(
      [textDelta("Partial response")],
      abortError,
    );
    const { app, fileOps } = buildTestApp(
      { [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero" },
      queryFn,
    );

    const res = await app.request("/adventures/quest/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello" }),
    });
    // Consume stream to ensure abort handler completes before checking history
    await res.text();

    const history = fileOps.getStore().get(`${ADVENTURES_ROOT}/quest/history.md`);
    expect(history).toContain("**Player:** Hello");
    expect(history).toContain("**GM:** Partial response");
  });

  test("fresh file read between requests reflects edits (REQ-MVP-17)", async () => {
    // Track the systemPrompt passed to queryFn
    const capturedPrompts: string[] = [];
    const queryFn: QueryFn = (params) => {
      if (params.options?.systemPrompt && typeof params.options.systemPrompt === "string") {
        capturedPrompts.push(params.options.systemPrompt);
      }
      return createMockQueryFn([successResult("Response")])(params);
    };

    const { app, fileOps } = buildTestApp(
      { [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero" },
      queryFn,
    );

    // First request - consume stream to ensure history writes complete
    const res1 = await app.request("/adventures/quest/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "First" }),
    });
    await res1.text();

    // Simulate external edit to history
    fileOps.getStore().set(
      `${ADVENTURES_ROOT}/quest/history.md`,
      "**Player:** Edited history\n\n",
    );

    // Second request should see the edited history
    const res2 = await app.request("/adventures/quest/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Second" }),
    });
    await res2.text();

    // The second prompt should contain the edited history, not the original
    expect(capturedPrompts.length).toBe(2);
    expect(capturedPrompts[1]).toContain("Edited history");
  });

  test("emits tool_use event with result from user message, not invocation input", async () => {
    const toolId = "toolu_test_123";
    const queryFn = createMockQueryFn([
      assistantWithToolUse([{ id: toolId, name: "Bash", input: { command: "roll 2d6" } }]),
      userWithToolResult([{ tool_use_id: toolId, content: "Rolled 2d6: [4, 3] = 7" }]),
      textDelta("You rolled a 7!"),
      successResult("You rolled a 7!"),
    ]);
    const { app } = buildTestApp(
      { [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero" },
      queryFn,
    );

    const res = await app.request("/adventures/quest/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "I roll the dice" }),
    });

    const text = await res.text();
    const events = parseSSE(text);
    const toolEvents = events.filter((e) => e.event === "tool_use");
    expect(toolEvents.length).toBe(1);

    const parsed = JSON.parse(toolEvents[0].data);
    expect(parsed.name).toBe("Bash");
    expect(parsed.result).toBe("Rolled 2d6: [4, 3] = 7");
  });

  test("pairs multiple tool invocations with their results", async () => {
    const tool1Id = "toolu_1";
    const tool2Id = "toolu_2";
    const queryFn = createMockQueryFn([
      assistantWithToolUse([
        { id: tool1Id, name: "Read", input: { path: "/stats.md" } },
        { id: tool2Id, name: "Bash", input: { command: "roll 1d20" } },
      ]),
      userWithToolResult([
        { tool_use_id: tool1Id, content: "STR: 16, DEX: 14" },
        { tool_use_id: tool2Id, content: "Rolled 1d20: 18" },
      ]),
      textDelta("Attack hits!"),
      successResult("Attack hits!"),
    ]);
    const { app } = buildTestApp(
      { [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero" },
      queryFn,
    );

    const res = await app.request("/adventures/quest/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "I attack" }),
    });

    const text = await res.text();
    const events = parseSSE(text);
    const toolEvents = events.filter((e) => e.event === "tool_use");
    expect(toolEvents.length).toBe(2);

    const first = JSON.parse(toolEvents[0].data);
    expect(first.name).toBe("Read");
    expect(first.result).toBe("STR: 16, DEX: 14");

    const second = JSON.parse(toolEvents[1].data);
    expect(second.name).toBe("Bash");
    expect(second.result).toBe("Rolled 1d20: 18");
  });

  test("works with adventure that has no character or world", async () => {
    const queryFn = createMockQueryFn([
      textDelta("Hello!"),
      successResult("Hello!"),
    ]);
    // Empty adventure directory (implied by having a path that exists as a dir)
    // We need at least one file for readDir to recognize the adventure
    const { app } = buildTestApp(
      { [`${ADVENTURES_ROOT}/empty/placeholder`]: "" },
      queryFn,
    );

    // The adventure service's getAdventure will return null for character/world
    // but the directory exists because readDir found it
    const res = await app.request("/adventures/empty/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello" }),
    });

    // Should still work. The adventure exists even without character/world files.
    // getAdventure checks for directory existence. Our mock maps the directory by prefix.
    expect(res.status).toBe(200);
  });
});
