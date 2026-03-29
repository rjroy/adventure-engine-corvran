import type { SDKMessage, SDKResultMessage, SDKPartialAssistantMessage, SDKAssistantMessage, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import type { QueryFn } from "../../src/services/session-runner.js";
/** Creates a text delta stream event */
export declare function textDelta(text: string): SDKPartialAssistantMessage;
/** Creates a success result message */
export declare function successResult(resultText: string): SDKResultMessage;
/** Creates an error result message */
export declare function errorResult(errors: string[]): SDKResultMessage;
/** Creates an assistant message with tool_use blocks */
export declare function assistantWithToolUse(tools: Array<{
    id: string;
    name: string;
    input: Record<string, unknown>;
}>): SDKAssistantMessage;
/** Creates a user message with tool_result blocks */
export declare function userWithToolResult(results: Array<{
    tool_use_id: string;
    content: string;
}>): SDKUserMessage;
/** Creates a mock queryFn that returns the given messages */
export declare function createMockQueryFn(messages: SDKMessage[]): QueryFn;
/**
 * Creates a mock queryFn that throws an error during iteration.
 * Yields the given messages first, then throws the error.
 */
export declare function createThrowingQueryFn(messagesBeforeError: SDKMessage[], error: Error): QueryFn;
//# sourceMappingURL=mock-query.d.ts.map