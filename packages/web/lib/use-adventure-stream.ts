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
  adventureId: string
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

      fetch(`/api/daemon/adventures/${adventureId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            // Keep the last potentially incomplete line in the buffer
            buffer = lines.pop() ?? "";

            let currentEventType = "";
            for (const line of lines) {
              if (line.startsWith("event: ")) {
                currentEventType = line.slice(7);
              } else if (line.startsWith("data: ")) {
                const data = line.slice(6);
                try {
                  const parsed = JSON.parse(data) as Record<string, unknown>;
                  if (
                    currentEventType === "text" &&
                    typeof parsed.text === "string"
                  ) {
                    accumulatedText += parsed.text;
                    setStreamingMessage({
                      role: "gm",
                      text: accumulatedText,
                      toolEvents: [...toolEvents],
                    });
                  } else if (currentEventType === "tool_use") {
                    toolEvents.push(parsed as unknown as ToolUseEvent);
                    setStreamingMessage({
                      role: "gm",
                      text: accumulatedText,
                      toolEvents: [...toolEvents],
                    });
                  } else if (currentEventType === "done") {
                    const fullResponse =
                      typeof parsed.fullResponse === "string"
                        ? parsed.fullResponse
                        : accumulatedText;
                    setStreamingMessage({
                      role: "gm",
                      text: fullResponse,
                      toolEvents: [...toolEvents],
                    });
                    setIsStreaming(false);
                    abortControllerRef.current = null;
                  } else if (
                    currentEventType === "error" &&
                    typeof parsed.error === "string"
                  ) {
                    setError(parsed.error);
                    setIsStreaming(false);
                    abortControllerRef.current = null;
                  }
                } catch {
                  // Ignore malformed JSON lines
                }
                currentEventType = "";
              }
            }
          }
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === "AbortError") {
            // Intentional stop, keep partial text visible
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
    [adventureId]
  );

  return { isStreaming, streamingMessage, error, sendMessage, stop };
}
