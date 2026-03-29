"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import type { AdventureDetail, HistoryResponse, ToolUseEvent } from "@corvran/shared";
import { useAdventureStream } from "@/lib/use-adventure-stream";
import { parseHistory, type HistoryMessage } from "@/lib/parse-history";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { isStreaming, streamingMessage, error, sendMessage, stop } =
    useAdventureStream(id);

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

  // When streaming finishes, add GM message to history and clear streaming state.
  // useRef tracks whether we've already committed, preventing duplication
  // if React Strict Mode re-runs this effect.
  const lastCommittedText = useRef<string | null>(null);
  useEffect(() => {
    if (!isStreaming && streamingMessage && streamingMessage.text) {
      if (lastCommittedText.current !== streamingMessage.text) {
        lastCommittedText.current = streamingMessage.text;
        setMessages((prev) => [
          ...prev,
          { role: "gm", body: streamingMessage.text },
        ]);
      }
    }
    if (!isStreaming && !streamingMessage) {
      lastCommittedText.current = null;
    }
  }, [isStreaming, streamingMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
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
      <PlayHeader name={adventure.name} />

      <div className={styles.conversation} ref={conversationRef}>
        <div className={styles.conversationInner}>
          {error && (
            <div className={styles.errorMessage}>
              {error}
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
      <a className={styles.headerBack} href="/">
        {"\u2039"}
      </a>
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
