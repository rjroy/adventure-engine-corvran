import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import {
  DefaultResourceLoader,
  SessionManager,
  createAgentSession,
  formatSkillsForPrompt,
  getAgentDir,
  loadSkillsFromDir,
  type AgentSessionEvent,
  type Skill,
  type ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import type { ImageContent, TextContent } from "@earendil-works/pi-ai";
import type { MoodState } from "@corvran/shared";
import { createDiceToolDef } from "./dice-tool";
import { createMoodToolDef, type MoodEventPayload } from "./mood-tool";
import { createCompactToolDef } from "./compact-tool";
import type { CompactionService, CompactionResult } from "./compaction-service";
import type { FileOps } from "../types";
import { generateMoodImage } from "./image-gen";
import { extractDominantHue } from "./color-extract";

/** Built-in pi tools the GM agent is allowed to call. */
const ALLOWED_BUILTIN_TOOLS = ["bash", "read", "write", "edit", "grep", "find", "ls"];

/**
 * Parse a "provider/modelId" string. Exported because the compaction wiring in
 * app.ts needs the same parsing logic for its bound-session summarize fn.
 */
export function parseModelString(s: string | undefined): { provider: string; modelId: string } | null {
  if (!s) return null;
  const slash = s.indexOf("/");
  if (slash === -1) return null;
  return { provider: s.slice(0, slash), modelId: s.slice(slash + 1) };
}

export interface SessionRunnerConfig {
  /** Optional "provider/modelId" string. When omitted, the session uses pi's settings default. */
  model?: string;
}

export interface RunQueryCallbacks {
  /** Streaming text from the assistant. */
  onTextDelta: (text: string) => Promise<void> | void;
  /** A tool call has completed; emit name + result for client display. */
  onToolUse: (event: { name: string; result: string }) => Promise<void> | void;
  /** Agent loop finished successfully. */
  onDone: (fullResponse: string) => Promise<void> | void;
  /** Agent loop failed (error or context overflow). */
  onError: (errorMessage: string) => Promise<void> | void;
}

export interface RunQueryParams extends RunQueryCallbacks {
  systemPrompt: string;
  playerMessage: string;
  adventureId: string;
  adventurePath: string;
  artStyle: string | null;
  pluginPaths: string[];
  abortController: AbortController;
  setMood: (mood: MoodState) => Promise<void>;
  emitMoodEvent: (payload: MoodEventPayload) => Promise<void>;
  emitCompactedEvent: (result: CompactionResult) => Promise<void>;
}

async function downloadImage(url: string, destPath: string): Promise<void> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Failed to download image: ${response.status}`);
  const buffer = await response.arrayBuffer();
  await Bun.write(destPath, buffer);
}

function isContextOverflowError(error: string): boolean {
  const lower = error.toLowerCase();
  return lower.includes("context") || lower.includes("token") || lower.includes("too long");
}

/** Surface context-overflow errors as a user-actionable message; pass others through. */
function toFriendlyError(message: string): string {
  return isContextOverflowError(message)
    ? "Adventure history is too long. Edit history.md to shorten it."
    : message;
}

/**
 * Format a tool execution result for client SSE display.
 *
 * pi emits `tool_execution_end.result` as the unknown `AgentToolResult.details`
 * union or a raw string for built-in tools. We try to surface the textual
 * content (matching what the LLM sees) and fall back to JSON for non-text
 * shapes so the client always gets a printable string.
 */
function formatToolResultForClient(result: unknown): string {
  if (typeof result === "string") return result;
  if (result && typeof result === "object" && "content" in result) {
    const content = (result as { content: unknown }).content;
    if (Array.isArray(content)) {
      return content
        .map((c) => {
          if (c && typeof c === "object" && "type" in c) {
            const block = c as Partial<TextContent | ImageContent>;
            if (block.type === "text" && typeof block.text === "string") return block.text;
          }
          return JSON.stringify(c);
        })
        .join("");
    }
  }
  return JSON.stringify(result);
}

/** Discover SKILL.md skills under each plugin's `skills/` directory. */
function discoverSkillsForPlugins(pluginPaths: string[]): Skill[] {
  const skills: Skill[] = [];
  for (const pluginPath of pluginPaths) {
    const skillsDir = resolve(pluginPath, "skills");
    if (!existsSync(skillsDir)) continue;
    const result = loadSkillsFromDir({
      dir: skillsDir,
      source: `plugin:${basename(pluginPath)}`,
    });
    skills.push(...result.skills);
  }
  return skills;
}

export function createSessionRunner(deps: {
  config: SessionRunnerConfig;
  fileOps?: FileOps;
  compactionService?: CompactionService;
}) {
  const { config, fileOps, compactionService } = deps;

  async function runQuery(params: RunQueryParams): Promise<void> {
    const { systemPrompt, playerMessage, adventurePath, abortController } = params;

    const customTools: ToolDefinition[] = [
      createDiceToolDef(),
      createMoodToolDef({
        adventureId: params.adventureId,
        adventurePath,
        artStyle: params.artStyle,
        generateImage: generateMoodImage,
        extractHue: extractDominantHue,
        saveImage: downloadImage,
        setMood: params.setMood,
        emitMoodEvent: params.emitMoodEvent,
      }),
    ];

    if (compactionService && fileOps) {
      customTools.push(
        createCompactToolDef({
          compactionService,
          adventurePath,
          getAdventureContext: async () => {
            const characterPath = fileOps.resolvePath(adventurePath, "character.md");
            const worldPath = fileOps.resolvePath(adventurePath, "world.md");
            let character: string | undefined;
            let world: string | undefined;
            try { character = await fileOps.readFile(characterPath); } catch { /* missing file */ }
            try { world = await fileOps.readFile(worldPath); } catch { /* missing file */ }
            return { character, world };
          },
          emitCompactedEvent: params.emitCompactedEvent,
        }),
      );
    }

    // Skills declared by each plugin's `skills/` subdirectory are XML-formatted
    // into the system prompt so the agent knows what reference material is
    // available. (In Claude Code these were discovered lazily via the Skill
    // tool; pi inlines the catalog and lets the agent read full SKILL.md via
    // the read tool when needed.)
    const skills = discoverSkillsForPlugins(params.pluginPaths);
    const skillsBlock = formatSkillsForPrompt(skills);
    const fullSystemPrompt = skillsBlock ? `${systemPrompt}\n\n${skillsBlock}` : systemPrompt;

    const loader = new DefaultResourceLoader({
      cwd: adventurePath,
      agentDir: getAgentDir(),
      systemPrompt: fullSystemPrompt,
      noExtensions: false,
      noSkills: true,
      noPromptTemplates: true,
      noThemes: true,
      noContextFiles: true,
    });
    await loader.reload();

    const manager = SessionManager.inMemory(adventurePath);
    const { session } = await createAgentSession({
      cwd: adventurePath,
      resourceLoader: loader,
      sessionManager: manager,
      tools: ALLOWED_BUILTIN_TOOLS,
      customTools,
    });

    // bindExtensions runs queued extension hooks so extension-registered
    // providers/models become visible on session.modelRegistry. Model selection
    // must happen after this; with no model configured, the session falls back
    // to pi's settings default (defaultProvider/defaultModel).
    await session.bindExtensions({});

    const parsed = parseModelString(config.model);
    if (parsed) {
      const model = session.modelRegistry.find(parsed.provider, parsed.modelId);
      if (model) {
        await session.setModel(model);
      } else {
        console.warn(
          `[session-runner] model "${config.model}" not found in registry, using session default`,
        );
      }
    } else if (config.model) {
      console.warn(
        `[session-runner] model "${config.model}" is malformed (expected "provider/modelId"), using session default`,
      );
    }

    let accumulatedText = "";
    let aborted = false;
    let errorMessage: string | undefined;

    const onAbort = () => {
      aborted = true;
      void session.abort();
    };
    abortController.signal.addEventListener("abort", onAbort);

    const unsubscribe = session.subscribe((event: AgentSessionEvent) => {
      switch (event.type) {
        case "message_update": {
          const sub = event.assistantMessageEvent;
          if (sub.type === "text_delta") {
            const text = sub.delta;
            accumulatedText += text;
            void Promise.resolve(params.onTextDelta(text));
          }
          break;
        }
        case "tool_execution_end": {
          // set_mood and compact_history have dedicated event channels (mood, compacted)
          // and would be duplicate noise on the tool_use channel.
          if (event.toolName === "set_mood" || event.toolName === "compact_history") break;
          const text = formatToolResultForClient(event.result);
          void Promise.resolve(params.onToolUse({ name: event.toolName, result: text }));
          break;
        }
        case "agent_end": {
          // Capture any error surfaced via the agent state for post-loop reporting.
          const stateError = session.agent.state.errorMessage;
          if (stateError) errorMessage = stateError;
          break;
        }
      }
    });

    try {
      await session.prompt(playerMessage);

      if (aborted) {
        // Client disconnect: do not emit done/error. Caller will log partial response.
        return;
      }

      if (errorMessage) {
        await params.onError(toFriendlyError(errorMessage));
        return;
      }

      await params.onDone(accumulatedText);
    } catch (err: unknown) {
      if (aborted) return;
      const message = err instanceof Error ? err.message : String(err);
      await params.onError(toFriendlyError(message));
    } finally {
      unsubscribe();
      abortController.signal.removeEventListener("abort", onAbort);
      session.dispose();
    }
  }

  return { runQuery };
}

export type SessionRunner = ReturnType<typeof createSessionRunner>;
