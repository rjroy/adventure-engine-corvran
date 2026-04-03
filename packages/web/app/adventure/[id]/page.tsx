"use client";

import { useEffect, useLayoutEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import type { AdventureDetail, HistoryResponse, ToolUseEvent } from "@corvran/shared";
import { useAdventureStream } from "@/lib/use-adventure-stream";
import { parseHistory, type HistoryMessage } from "@/lib/parse-history";
import { isTouchDevice, shouldSendOnEnter } from "@/lib/keyboard-handler";
import { applyMood } from "@/lib/apply-mood";
import { getMoodImageUrl } from "@/lib/mood-image-url";
import styles from "./page.module.css";

export default function AdventurePlayPage() {
  const params = useParams();
  const id = params.id as string;
  const [adventure, setAdventure] = useState<AdventureDetail | null>(null);
  const [messages, setMessages] = useState<HistoryMessage[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const conversationRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasScrolledOnLoad = useRef(false);

  const handleStreamComplete = useCallback((text: string) => {
    setMessages((prev) => [...prev, { role: "gm", body: text }]);
  }, []);

  const { isStreaming, streamingMessage, error, sendMessage, stop } =
    useAdventureStream(id, handleStreamComplete);
  const [isCompacting, setIsCompacting] = useState(false);
  const [compactError, setCompactError] = useState<string | null>(null);

  // Load adventure detail and history
  useEffect(() => {
    Promise.all([
      fetch(`/api/daemon/adventures/${id}`).then((r) => r.json()) as Promise<AdventureDetail>,
      fetch(`/api/daemon/adventures/${id}/history`).then((r) => r.json()) as Promise<HistoryResponse>,
    ])
      .then(([detail, historyRes]) => {
        setAdventure(detail);
        if (historyRes.history) {
          setMessages(parseHistory(historyRes.history));
        }
      })
      .catch(() => setLoadError("Failed to load adventure"));
  }, [id]);

  // Apply mood palette on mount to prevent flash of default colors
  useLayoutEffect(() => {
    if (adventure?.currentMood) {
      applyMood(
        adventure.currentMood.hue,
        getMoodImageUrl(id, adventure.currentMood.imagePath),
      );
    }
  }, [adventure, id]);

  // Scroll to bottom on initial history load (instant, no animation)
  useEffect(() => {
    if (messages.length > 0 && !hasScrolledOnLoad.current) {
      hasScrolledOnLoad.current = true;
      bottomRef.current?.scrollIntoView();
    }
  }, [messages]);

  // Smooth scroll to bottom when a new message is added (not during streaming)
  const prevMessageCount = useRef(0);
  useEffect(() => {
    if (messages.length > prevMessageCount.current && hasScrolledOnLoad.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCount.current = messages.length;
  }, [messages.length]);

  // Auto-scroll during streaming
  useEffect(() => {
    if (isStreaming && lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView();
    }
  }, [isStreaming, streamingMessage]);

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;

    // Add player message to local state
    setMessages((prev) => [...prev, { role: "player", body: text }]);
    setInputValue("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    sendMessage(text);
  }, [inputValue, isStreaming, sendMessage]);

  const handleCompact = useCallback(async () => {
    if (!window.confirm(
      "Archive the current history and create a recap? The full transcript will be saved in the past/ folder.",
    )) return;

    setIsCompacting(true);
    setCompactError(null);
    try {
      const res = await fetch(`/api/daemon/adventures/${id}/compact`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Compaction failed" }));
        setCompactError(body.error || "Compaction failed");
        return;
      }
      // Refresh history after successful compaction
      const historyRes = await fetch(`/api/daemon/adventures/${id}/history`);
      if (historyRes.ok) {
        const data = await historyRes.json() as { history: string | null };
        setMessages(data.history ? parseHistory(data.history) : []);
      }
    } catch {
      setCompactError("Failed to connect to server");
    } finally {
      setIsCompacting(false);
    }
  }, [id]);

  const isMobile = useMemo(() => isTouchDevice(), []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (shouldSendOnEnter({ key: e.key, shiftKey: e.shiftKey }, isMobile)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
  };

  if (loadError) {
    return (
      <div className={styles.page}>
        <PlayHeader name="Error" />
        <div className={styles.conversation}>
          <div className={styles.conversationInner}>
            <div className={styles.loading}>{loadError}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!adventure) {
    return (
      <div className={styles.page}>
        <PlayHeader name="Loading..." />
        <div className={styles.conversation}>
          <div className={styles.conversationInner}>
            <div className={styles.loading}>Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  const hasHistory = messages.length > 0;
  const isNewAdventure = !hasHistory && !isStreaming;

  const placeholder = isStreaming
    ? "Waiting for the Game Master\u2026"
    : isNewAdventure
      ? "Introduce yourself or describe what you\u2019d like to play\u2026"
      : "What do you do?";

  return (
    <div className={styles.page}>
      <div
        id="mood-bg-layer"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.1,
        }}
      />
      <PlayHeader name={adventure.name} />

      <div className={styles.conversation} ref={conversationRef}>
        <div className={styles.conversationInner}>
          {error && (
            <div className={styles.errorMessage}>
              {error.split(/(\S+\.md)\b/).map((part, i) =>
                /\S+\.md$/.test(part) ? (
                  <span key={i} className={styles.errorCode}>{part}</span>
                ) : (
                  part
                )
              )}
            </div>
          )}

          {isNewAdventure && !error && <NewAdventureState />}

          {messages.map((msg, i) => (
            <div key={i} ref={i === messages.length - 1 ? lastMessageRef : undefined}>
              {msg.role === "gm" ? (
                <GmMessage body={msg.body} />
              ) : (
                <PlayerMessage body={msg.body} />
              )}
            </div>
          ))}

          {isStreaming && streamingMessage && (
            <div ref={lastMessageRef}>
              <StreamingGmMessage
                text={streamingMessage.text}
                toolEvents={streamingMessage.toolEvents}
              />
            </div>
          )}

          {isCompacting && (
            <div className={styles.compactingStatus}>Creating recap...</div>
          )}

          {compactError && (
            <div className={styles.errorMessage}>{compactError}</div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className={styles.inputArea}>
        <div className={styles.inputAreaInner}>
          <div
            className={`${styles.inputWrapper} ${isStreaming ? styles.inputWrapperDisabled : ""}`}
          >
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              placeholder={placeholder}
              value={inputValue}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              rows={1}
            />
          </div>
          {hasHistory && (
            <button
              className={styles.btnCompact}
              onClick={handleCompact}
              disabled={isStreaming || isCompacting}
              type="button"
              title="Archive current history and create a recap"
            >
              {isCompacting ? "..." : "Compact"}
            </button>
          )}
          {isStreaming ? (
            <button className={styles.btnStop} onClick={stop} type="button">
              <div className={styles.btnStopIcon} />
              Stop
            </button>
          ) : (
            <button
              className={styles.btnSend}
              onClick={handleSend}
              disabled={!inputValue.trim()}
              type="button"
            >
              Send
            </button>
          )}
        </div>
        <div className={styles.inputHint}>
          {isStreaming
            ? "Game Master is responding\u2026"
            : isMobile
              ? "Tap Send to submit"
              : "Enter to send \u00b7 Shift+Enter for new line"}
        </div>
      </div>
    </div>
  );
}

function PlayHeader({ name }: { name: string }) {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <Image
          src="/logo.png"
          width={28}
          height={28}
          alt="Corvran"
          className={styles.logoImg}
        />
      </div>
      <Link className={styles.headerBack} href="/">
        {"\u2039"}
      </Link>
      <span className={styles.headerAdventureName}>{name}</span>
      <span className={styles.headerAppLabel}>Adventure Engine</span>
    </header>
  );
}

function GmMessage({ body }: { body: string }) {
  return (
    <div className={styles.messageGm}>
      <div className={`${styles.messageLabel} ${styles.gmLabel}`}>
        Game Master
      </div>
      <div className={`${styles.messageBody} ${styles.gmBody}`}>
        <ReactMarkdown>{body}</ReactMarkdown>
      </div>
    </div>
  );
}

function PlayerMessage({ body }: { body: string }) {
  return (
    <div className={styles.messagePlayer}>
      <div className={`${styles.messageLabel} ${styles.playerLabel}`}>You</div>
      <div className={`${styles.messageBody} ${styles.playerBody}`}>{body}</div>
    </div>
  );
}

function StreamingGmMessage({
  text,
  toolEvents,
}: {
  text: string;
  toolEvents: ToolUseEvent[];
}) {
  return (
    <div className={styles.messageGm}>
      <div className={`${styles.messageLabel} ${styles.gmLabel}`}>
        Game Master
      </div>

      {toolEvents.map((event, i) => (
        <ToolEvent key={i} result={event.result} />
      ))}

      <div className={`${styles.messageBody} ${styles.gmBody} ${styles.gmBodyStreaming}`}>
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    </div>
  );
}

function ToolEvent({ result }: { result: string }) {
  return (
    <div className={styles.toolEvent}>
      <span className={styles.toolEventIcon}>{"\u2684"}</span>
      {result}
    </div>
  );
}

function NewAdventureState() {
  return (
    <div className={styles.newAdventureState}>
      <div className={styles.newAdventureIcon}>
        <Image
          src="/logo.png"
          width={64}
          height={64}
          alt=""
          className={styles.newAdventureIconImg}
        />
      </div>
      <p className={styles.newAdventureTitle}>A new adventure awaits.</p>
      <p className={styles.newAdventureHint}>
        Introduce yourself to the Game Master and describe the kind of story you
        want to tell. They&apos;ll help you build your character and world through
        conversation.
      </p>
    </div>
  );
}
