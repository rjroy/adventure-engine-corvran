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
import { getModel, type ImageContent, type Model, type TextContent } from "@earendil-works/pi-ai";

/** Any pi-ai Model — the api type parameter is irrelevant to this codebase. */
type AnyModel = Model<never>;
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

/** Map terse model aliases to pi-ai provider+modelId pairs. */
const MODEL_ALIASES: Record<string, { provider: string; modelId: string }> = {
  sonnet: { provider: "anthropic", modelId: "claude-sonnet-4-6" },
  haiku: { provider: "anthropic", modelId: "claude-haiku-4-5" },
  opus: { provider: "anthropic", modelId: "claude-opus-4-7" },
};

// getModel is generic over compile-time-known provider/model keys. We accept
// dynamic strings at runtime, so cast through these aliases at the call site.
type ProviderKey = Parameters<typeof getModel>[0];
type ModelIdKey<P extends ProviderKey> = Parameters<typeof getModel<P, never>>[1];

export function resolveModel(modelString: string): AnyModel {
  // Accept either an alias ("sonnet") or "provider/modelId" form.
  const alias = MODEL_ALIASES[modelString];
  if (alias) {
    return getModel(
      alias.provider as ProviderKey,
      alias.modelId as ModelIdKey<ProviderKey>,
    ) as AnyModel;
  }
  const slash = modelString.indexOf("/");
  if (slash === -1) {
    throw new Error(
      `Unknown model "${modelString}". Use an alias (sonnet, haiku, opus) or "provider/modelId".`,
    );
  }
  const provider = modelString.slice(0, slash);
  const modelId = modelString.slice(slash + 1);
  return getModel(
    provider as ProviderKey,
    modelId as ModelIdKey<ProviderKey>,
  ) as AnyModel;
}

export interface SessionRunnerConfig {
  /** Model alias ("sonnet"/"haiku"/"opus") or "provider/modelId". */
  model: string;
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
  /** Optional model override; primarily for tests. */
  modelOverride?: AnyModel;
}) {
  const { config, fileOps, compactionService } = deps;
  const model = deps.modelOverride ?? resolveModel(config.model);

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
      noExtensions: true,
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

    // bindExtensions runs queued extension hooks. We have no extensions of our
    // own but still call it so any contributed providers/models on the global
    // registry are wired in. See pi-agent-migration.md gotcha #4.
    await session.bindExtensions({});
    await session.setModel(model);

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
        const friendly = isContextOverflowError(errorMessage)
          ? "Adventure history is too long. Edit history.md to shorten it."
          : errorMessage;
        await params.onError(friendly);
        return;
      }

      await params.onDone(accumulatedText);
    } catch (err: unknown) {
      if (aborted) return;
      const message = err instanceof Error ? err.message : String(err);
      const friendly = isContextOverflowError(message)
        ? "Adventure history is too long. Edit history.md to shorten it."
        : message;
      await params.onError(friendly);
    } finally {
      unsubscribe();
      abortController.signal.removeEventListener("abort", onAbort);
      session.dispose();
    }
  }

  return { runQuery, model };
}

export type SessionRunner = ReturnType<typeof createSessionRunner>;
