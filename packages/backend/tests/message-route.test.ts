import { describe, test, expect } from "bun:test";
import { Hono } from "hono";
import { createAdventureService } from "../src/services/adventure-service";
import { createAdventureRoutes } from "../src/routes/adventure-routes";
import { createHistoryService } from "../src/services/history-service";
import { createMockFileOps } from "./helpers/mock-file-ops";
import { createMockSessionRunner, type ScriptedEvent } from "./helpers/mock-session-runner";
import type { PluginRegistry, PluginEntry, SystemInfo } from "../src/services/plugin-registry";

const ADVENTURES_ROOT = "/test/adventures";
const PLUGINS_ROOT = "/test/plugins";

/** Creates a mock plugin registry with corvran (core) + two system plugins */
function createMockRegistry(): PluginRegistry {
  const corvranEntry: PluginEntry = {
    manifest: { name: "corvran", type: "core", alias: "corvran" },
    path: `${PLUGINS_ROOT}/corvran`,
  };
  const daggerheartEntry: PluginEntry = {
    manifest: { name: "daggerheart-system", type: "system", alias: "daggerheart", description: "Daggerheart system", bootstrap: "bootstrap.md" },
    path: `${PLUGINS_ROOT}/daggerheart-system`,
  };
  const d20Entry: PluginEntry = {
    manifest: { name: "d20-system", type: "system", alias: "d20", description: "d20 system", bootstrap: "bootstrap.md" },
    path: `${PLUGINS_ROOT}/d20-system`,
  };

  const systemMap = new Map<string, PluginEntry>([
    ["daggerheart", daggerheartEntry],
    ["d20", d20Entry],
  ]);

  return {
    corePlugins: [corvranEntry],
    resolveSystem(alias: string): PluginEntry | null {
      return systemMap.get(alias) ?? null;
    },
    availableSystems(): SystemInfo[] {
      return [...systemMap.entries()]
        .filter(([, e]) => e.manifest.description)
        .map(([a, e]) => ({ alias: a, description: e.manifest.description! }));
    },
  };
}

function buildTestApp(
  files: Record<string, string>,
  script: ScriptedEvent[] | ((call: number) => ScriptedEvent[]),
  options?: { pluginRegistry?: PluginRegistry },
) {
  const fileOps = createMockFileOps(files);
  const adventureService = createAdventureService({ fileOps, adventuresPath: ADVENTURES_ROOT });
  const historyService = createHistoryService({ fileOps });
  const sessionRunner = createMockSessionRunner(script);

  const pluginRegistry = options?.pluginRegistry ?? createMockRegistry();

  const module = createAdventureRoutes({
    adventureService,
    historyService,
    sessionRunner,
    pluginRegistry,
    fileOps,
  });

  const app = new Hono();
  app.route("/", module.routes);
  return { app, fileOps, sessionRunner };
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
    const { app } = buildTestApp(
      { [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero" },
      [{ type: "done", fullResponse: "ok" }],
    );

    const res = await app.request("/adventures/quest/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  test("returns 400 for missing message field", async () => {
    const { app } = buildTestApp(
      { [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero" },
      [{ type: "done", fullResponse: "ok" }],
    );

    const res = await app.request("/adventures/quest/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "wrong field" }),
    });
    expect(res.status).toBe(400);
  });

  test("returns 400 for empty message string", async () => {
    const { app } = buildTestApp(
      { [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero" },
      [{ type: "done", fullResponse: "ok" }],
    );

    const res = await app.request("/adventures/quest/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "" }),
    });
    expect(res.status).toBe(400);
  });

  test("returns 404 for nonexistent adventure", async () => {
    const { app } = buildTestApp({}, [{ type: "done", fullResponse: "ok" }]);

    const res = await app.request("/adventures/nope/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello" }),
    });
    expect(res.status).toBe(404);
  });

  test("streams text events as SSE", async () => {
    const { app } = buildTestApp(
      { [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero" },
      [
        { type: "text", text: "Hello " },
        { type: "text", text: "world!" },
        { type: "done", fullResponse: "Hello world!" },
      ],
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

    const textEvents = events.filter((e) => e.event === "text");
    expect(textEvents.length).toBe(2);
    expect(JSON.parse(textEvents[0].data)).toEqual({ text: "Hello " });
    expect(JSON.parse(textEvents[1].data)).toEqual({ text: "world!" });

    const doneEvents = events.filter((e) => e.event === "done");
    expect(doneEvents.length).toBe(1);
    expect(JSON.parse(doneEvents[0].data)).toEqual({ fullResponse: "Hello world!" });
  });

  test("appends player message and GM response to history", async () => {
    const { app, fileOps } = buildTestApp(
      { [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero" },
      [
        { type: "text", text: "Welcome!" },
        { type: "done", fullResponse: "Welcome!" },
      ],
    );

    const res = await app.request("/adventures/quest/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello" }),
    });
    await res.text();

    const history = fileOps.getStore().get(`${ADVENTURES_ROOT}/quest/history.md`);
    expect(history).toBe(
      "**Player:** Hello\n\n**GM:** Welcome!\n\n",
    );
  });

  test("context overflow error returns spec error message", async () => {
    const { app } = buildTestApp(
      { [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero" },
      [
        {
          type: "error",
          // Session-runner translates context-overflow phrasing into this friendly form.
          // We send it pre-translated since the route just forwards the onError value.
          error: "Adventure history is too long. Edit history.md to shorten it.",
        },
      ],
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
    const { app } = buildTestApp(
      { [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero" },
      [{ type: "error", error: "API rate limit exceeded" }],
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
    // Script: stream a partial response, then abort. The route then writes the
    // partial assistant text into history (mimicking client-disconnect behavior).
    const { app, fileOps } = buildTestApp(
      { [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero" },
      [
        { type: "text", text: "Partial response" },
        { type: "abort" },
      ],
    );

    const res = await app.request("/adventures/quest/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello" }),
    });
    await res.text();

    const history = fileOps.getStore().get(`${ADVENTURES_ROOT}/quest/history.md`);
    expect(history).toContain("**Player:** Hello");
    expect(history).toContain("**GM:** Partial response");
  });

  test("fresh file read between requests reflects edits (REQ-MVP-17)", async () => {
    const { app, fileOps, sessionRunner } = buildTestApp(
      { [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero" },
      [{ type: "done", fullResponse: "Response" }],
    );

    const res1 = await app.request("/adventures/quest/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "First" }),
    });
    await res1.text();

    fileOps.getStore().set(
      `${ADVENTURES_ROOT}/quest/history.md`,
      "**Player:** Edited history\n\n",
    );

    const res2 = await app.request("/adventures/quest/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Second" }),
    });
    await res2.text();

    expect(sessionRunner.calls.length).toBe(2);
    expect(sessionRunner.calls[1].systemPrompt).toContain("Edited history");
  });

  test("emits tool_use event with name and result", async () => {
    const { app } = buildTestApp(
      { [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero" },
      [
        { type: "tool_use", name: "bash", result: "Rolled 2d6: [4, 3] = 7" },
        { type: "text", text: "You rolled a 7!" },
        { type: "done", fullResponse: "You rolled a 7!" },
      ],
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
    expect(parsed.name).toBe("bash");
    expect(parsed.result).toBe("Rolled 2d6: [4, 3] = 7");
  });

  test("emits multiple tool_use events in order", async () => {
    const { app } = buildTestApp(
      { [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero" },
      [
        { type: "tool_use", name: "read", result: "STR: 16, DEX: 14" },
        { type: "tool_use", name: "bash", result: "Rolled 1d20: 18" },
        { type: "text", text: "Attack hits!" },
        { type: "done", fullResponse: "Attack hits!" },
      ],
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
    expect(first.name).toBe("read");
    expect(first.result).toBe("STR: 16, DEX: 14");

    const second = JSON.parse(toolEvents[1].data);
    expect(second.name).toBe("bash");
    expect(second.result).toBe("Rolled 1d20: 18");
  });

  test("works with adventure that has no character or world", async () => {
    const { app } = buildTestApp(
      { [`${ADVENTURES_ROOT}/empty/placeholder`]: "" },
      [
        { type: "text", text: "Hello!" },
        { type: "done", fullResponse: "Hello!" },
      ],
    );

    const res = await app.request("/adventures/empty/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello" }),
    });

    expect(res.status).toBe(200);
  });
});

describe("POST /adventures/:id/message - plugin resolution (REQ-SYS-19)", () => {
  test("adventure with system: daggerheart resolves corvran + daggerheart-system paths", async () => {
    const { app, sessionRunner } = buildTestApp(
      {
        [`${ADVENTURES_ROOT}/dh-quest/character.md`]: "Hero",
        [`${ADVENTURES_ROOT}/dh-quest/adventure.md`]: "---\nsystem: daggerheart\n---\n",
        [`${PLUGINS_ROOT}/daggerheart-system/bootstrap.md`]: "You are running Daggerheart.",
      },
      [{ type: "done", fullResponse: "Response" }],
    );

    const res = await app.request("/adventures/dh-quest/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello" }),
    });
    await res.text();

    expect(sessionRunner.calls.length).toBe(1);
    const paths = sessionRunner.calls[0].pluginPaths;
    expect(paths).toContain(`${PLUGINS_ROOT}/corvran`);
    expect(paths).toContain(`${PLUGINS_ROOT}/daggerheart-system`);
    expect(paths.length).toBe(2);
  });

  test("adventure with system: d20 resolves corvran + d20-system paths", async () => {
    const { app, sessionRunner } = buildTestApp(
      {
        [`${ADVENTURES_ROOT}/d20-quest/character.md`]: "Fighter",
        [`${ADVENTURES_ROOT}/d20-quest/adventure.md`]: "---\nsystem: d20\n---\n",
        [`${PLUGINS_ROOT}/d20-system/bootstrap.md`]: "You are running a d20 game.",
      },
      [{ type: "done", fullResponse: "Response" }],
    );

    const res = await app.request("/adventures/d20-quest/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello" }),
    });
    await res.text();

    expect(sessionRunner.calls.length).toBe(1);
    const paths = sessionRunner.calls[0].pluginPaths;
    expect(paths).toContain(`${PLUGINS_ROOT}/corvran`);
    expect(paths).toContain(`${PLUGINS_ROOT}/d20-system`);
    expect(paths.length).toBe(2);
  });

  test("adventure with no adventure.md resolves corvran only", async () => {
    const { app, sessionRunner } = buildTestApp(
      { [`${ADVENTURES_ROOT}/freeform/character.md`]: "Wanderer" },
      [{ type: "done", fullResponse: "Response" }],
    );

    const res = await app.request("/adventures/freeform/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello" }),
    });
    await res.text();

    expect(sessionRunner.calls.length).toBe(1);
    expect(sessionRunner.calls[0].pluginPaths).toEqual([`${PLUGINS_ROOT}/corvran`]);
  });

  test("adventure with unknown system returns HTTP 400 (REQ-SYS-4)", async () => {
    const { app } = buildTestApp(
      {
        [`${ADVENTURES_ROOT}/bad-quest/character.md`]: "Hero",
        [`${ADVENTURES_ROOT}/bad-quest/adventure.md`]: "---\nsystem: pathfinder\n---\n",
      },
      [{ type: "done", fullResponse: "ok" }],
    );

    const res = await app.request("/adventures/bad-quest/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("pathfinder");
    expect(body.error).toContain("no matching plugin is installed");
    expect(body.error).toContain("daggerheart");
    expect(body.error).toContain("d20");
  });
});

describe("GET /adventures/:id/mood-image (REQ-MOOD-25)", () => {
  test("returns 400 for invalid adventure ID", async () => {
    const { app } = buildTestApp({}, [{ type: "done", fullResponse: "ok" }]);

    const res = await app.request("/adventures/bad..id/mood-image");
    expect(res.status).toBe(400);
  });

  test("returns 404 when no mood image exists", async () => {
    const { app } = buildTestApp(
      { [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero" },
      [{ type: "done", fullResponse: "ok" }],
    );

    const res = await app.request("/adventures/quest/mood-image");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("No mood image");
  });

  test("returns PNG bytes with correct content type when mood image exists", async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes
    const { app, fileOps } = buildTestApp(
      { [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero" },
      [{ type: "done", fullResponse: "ok" }],
    );
    fileOps.getBytesStore().set(`${ADVENTURES_ROOT}/quest/mood.png`, pngBytes);

    const res = await app.request("/adventures/quest/mood-image");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");

    const body = new Uint8Array(await res.arrayBuffer());
    expect(body).toEqual(pngBytes);
  });
});

describe("POST /adventures/:id/message - set_mood suppression (REQ-MOOD-20)", () => {
  test("set_mood is filtered upstream by the session-runner — not surfaced as tool_use SSE", async () => {
    // In pi-agent, the session-runner is responsible for suppressing the
    // set_mood and compact_history tool events (they have dedicated SSE
    // channels). The mock runner doesn't emit tool_use for them; the test
    // simply confirms that other tool_use events flow through normally.
    const { app } = buildTestApp(
      { [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero" },
      [
        { type: "tool_use", name: "bash", result: "test" },
        { type: "mood", hue: 270, description: "dark forest" },
        { type: "text", text: "The forest darkens..." },
        { type: "done", fullResponse: "The forest darkens..." },
      ],
    );

    const res = await app.request("/adventures/quest/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "I enter the forest" }),
    });

    const text = await res.text();
    const events = parseSSE(text);
    const toolEvents = events.filter((e) => e.event === "tool_use");
    const moodEvents = events.filter((e) => e.event === "mood");

    expect(toolEvents.length).toBe(1);
    const parsed = JSON.parse(toolEvents[0].data);
    expect(parsed.name).toBe("bash");
    expect(parsed.result).toBe("test");
    expect(moodEvents.length).toBe(1);
  });
});

describe("POST /adventures/:id/message - bootstrap integration (REQ-SYS-23)", () => {
  test("bootstrap content appears in system prompt when present", async () => {
    const { app, sessionRunner } = buildTestApp(
      {
        [`${ADVENTURES_ROOT}/dh-quest/character.md`]: "Hero",
        [`${ADVENTURES_ROOT}/dh-quest/adventure.md`]: "---\nsystem: daggerheart\n---\n",
        [`${PLUGINS_ROOT}/daggerheart-system/bootstrap.md`]: "You are running a Daggerheart game. Duality Dice rule everything.",
      },
      [{ type: "done", fullResponse: "Response" }],
    );

    const res = await app.request("/adventures/dh-quest/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello" }),
    });
    await res.text();

    expect(sessionRunner.calls.length).toBe(1);
    expect(sessionRunner.calls[0].systemPrompt).toContain("You are running a Daggerheart game");
    expect(sessionRunner.calls[0].systemPrompt).toContain("Duality Dice rule everything");
  });

  test("bootstrap file missing from disk: graceful skip, no error", async () => {
    const { app, sessionRunner } = buildTestApp(
      {
        [`${ADVENTURES_ROOT}/dh-quest/character.md`]: "Hero",
        [`${ADVENTURES_ROOT}/dh-quest/adventure.md`]: "---\nsystem: daggerheart\n---\n",
      },
      [{ type: "done", fullResponse: "Response" }],
    );

    const res = await app.request("/adventures/dh-quest/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello" }),
    });

    expect(res.status).toBe(200);
    await res.text();

    expect(sessionRunner.calls.length).toBe(1);
    expect(sessionRunner.calls[0].systemPrompt).toContain("Game Master");
  });

  test("no bootstrap for freeform adventures", async () => {
    const { app, sessionRunner } = buildTestApp(
      { [`${ADVENTURES_ROOT}/freeform/character.md`]: "Wanderer" },
      [{ type: "done", fullResponse: "Response" }],
    );

    const res = await app.request("/adventures/freeform/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello" }),
    });
    await res.text();

    expect(sessionRunner.calls.length).toBe(1);
    expect(sessionRunner.calls[0].systemPrompt).not.toContain("Daggerheart");
    expect(sessionRunner.calls[0].systemPrompt).not.toContain("d20 System");
  });
});
