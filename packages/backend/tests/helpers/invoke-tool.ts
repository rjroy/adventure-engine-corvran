import type { ToolDefinition } from "@earendil-works/pi-coding-agent";
import type { AgentToolResult } from "@earendil-works/pi-agent-core";

/**
 * Invoke a pi `ToolDefinition` for tests using the runtime signature without
 * threading a real ExtensionContext. The tools in this codebase do not consult
 * ctx, signal, or onUpdate, so they can be invoked with stubs.
 */
export async function invokeTool<TArgs extends object = Record<string, unknown>, TDetails = unknown>(
  tool: ToolDefinition,
  args: TArgs,
): Promise<AgentToolResult<TDetails>> {
  return (await tool.execute(
    "test-tool-call-id",
    args as never,
    undefined,
    undefined,
    {} as never,
  )) as AgentToolResult<TDetails>;
}

/** Extract the first text content block from a tool result, or "" if none. */
export function firstText(result: AgentToolResult<unknown>): string {
  const block = result.content[0];
  if (block && block.type === "text") return block.text;
  return "";
}
