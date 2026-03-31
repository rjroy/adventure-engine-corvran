"use client";

import { useState, useCallback, useRef } from "react";
import type { ToolUseEvent } from "@corvran/shared";

interface StreamMessage {
  role: "gm";
  text: string;
  toolEvents: ToolUseEvent[];
}

interface UseAdventureStreamReturn {
  isStreaming: boolean;
  streamingMessage: StreamMessage | null;
  error: string | null;
  sendMessage: (message: string) => void;
  stop: () => void;
}

export function useAdventureStream(
  adventureId: string,
  onComplete?: (text: string) => void,
): UseAdventureStreamReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] =
    useState<StreamMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(
    (message: string) => {
      setError(null);
      setIsStreaming(true);
      setStreamingMessage({ role: "gm", text: "", toolEvents: [] });

      const controller = new AbortController();
      abortControllerRef.current = controller;

      let accumulatedText = "";
      const toolEvents: ToolUseEvent[] = [];

      function processLine(line: string, eventType: string): string {
        if (line.startsWith("event: ")) {
          return line.slice(7);
        }
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data) as Record<string, unknown>;
            if (
              eventType === "text" &&
              typeof parsed.text === "string"
            ) {
              accumulatedText += parsed.text;
              setStreamingMessage({
                role: "gm",
                text: accumulatedText,
                toolEvents: [...toolEvents],
              });
            } else if (eventType === "tool_use") {
              toolEvents.push(parsed as unknown as ToolUseEvent);
              setStreamingMessage({
                role: "gm",
                text: accumulatedText,
                toolEvents: [...toolEvents],
              });
            } else if (eventType === "done") {
              const fullResponse =
                typeof parsed.fullResponse === "string"
                  ? parsed.fullResponse
                  : accumulatedText;
              setStreamingMessage(null);
              setIsStreaming(false);
              abortControllerRef.current = null;
              onComplete?.(fullResponse);
            } else if (
              eventType === "error" &&
              typeof parsed.error === "string"
            ) {
              setError(parsed.error);
              setIsStreaming(false);
              abortControllerRef.current = null;
            }
          } catch {
            // Ignore malformed JSON lines
          }
          return "";
        }
        return eventType;
      }

      fetch(`/api/daemon/adventures/${adventureId}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ message }),
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            const data = await response.json().catch(() => null);
            throw new Error(
              data?.error ?? `Request failed with status ${response.status}`
            );
          }

          const reader = response.body?.getReader();
          if (!reader) throw new Error("No response body");

          const decoder = new TextDecoder();
          let buffer = "";
          let currentEventType = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              currentEventType = processLine(line, currentEventType);
            }
          }

          // Process any remaining data left in the buffer after the stream ends.
          // This handles the case where the final chunk doesn't end with '\n'.
          if (buffer.trim()) {
            for (const line of buffer.split("\n")) {
              currentEventType = processLine(line, currentEventType);
            }
          }
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === "AbortError") {
            setIsStreaming(false);
            return;
          }
          setError(
            err instanceof Error ? err.message : "An unexpected error occurred"
          );
          setIsStreaming(false);
          abortControllerRef.current = null;
        });
    },
    [adventureId, onComplete]
  );

  return { isStreaming, streamingMessage, error, sendMessage, stop };
}
