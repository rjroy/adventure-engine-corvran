import { useState, useCallback } from "react";
import "./AdventureMenu.css";

export interface AdventureMenuProps {
  onAdventureStart: (adventureId: string, sessionToken: string) => void;
}

interface AdventureData {
  adventureId: string;
  sessionToken: string;
}

const STORAGE_KEYS = {
  ADVENTURE_ID: "adventure_id",
  SESSION_TOKEN: "session_token",
} as const;

export function AdventureMenu({ onAdventureStart }: AdventureMenuProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if there's a saved adventure
  const savedAdventureId = localStorage.getItem(STORAGE_KEYS.ADVENTURE_ID);
  const savedSessionToken = localStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
  const hasSavedAdventure = Boolean(savedAdventureId && savedSessionToken);

  const saveToLocalStorage = useCallback(
    ({ adventureId, sessionToken }: AdventureData) => {
      localStorage.setItem(STORAGE_KEYS.ADVENTURE_ID, adventureId);
      localStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, sessionToken);
    },
    []
  );

  const clearLocalStorage = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.ADVENTURE_ID);
    localStorage.removeItem(STORAGE_KEYS.SESSION_TOKEN);
  }, []);

  const handleNewAdventure = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/adventure/new", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData: unknown = await response.json().catch(() => ({}));
        const errorMessage =
          typeof errorData === "object" &&
          errorData !== null &&
          "message" in errorData &&
          typeof errorData.message === "string"
            ? errorData.message
            : `Server error: ${response.status}`;
        throw new Error(errorMessage);
      }

      const data: unknown = await response.json();

      if (
        typeof data !== "object" ||
        data === null ||
        !("adventureId" in data) ||
        !("sessionToken" in data) ||
        typeof data.adventureId !== "string" ||
        typeof data.sessionToken !== "string"
      ) {
        throw new Error("Invalid response from server");
      }

      // Save to localStorage
      saveToLocalStorage({
        adventureId: data.adventureId,
        sessionToken: data.sessionToken,
      });

      // Notify parent
      onAdventureStart(data.adventureId, data.sessionToken);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create adventure"
      );
    } finally {
      setIsLoading(false);
    }
  }, [saveToLocalStorage, onAdventureStart]);

  const handleResumeAdventure = useCallback(() => {
    if (savedAdventureId && savedSessionToken) {
      onAdventureStart(savedAdventureId, savedSessionToken);
    }
  }, [savedAdventureId, savedSessionToken, onAdventureStart]);

  const handleStartFresh = useCallback(() => {
    clearLocalStorage();
    setError(null);
    window.location.reload();
  }, [clearLocalStorage]);

  return (
    <div className="adventure-menu">
      <h1 className="adventure-menu__title">Adventure Engine of Corvran</h1>

      <div className="adventure-menu__actions">
        {error && (
          <div className="adventure-menu__error">
            <strong>Error:</strong> {error}
            <button onClick={handleStartFresh} className="btn btn--error">
              Start Fresh
            </button>
          </div>
        )}

        {hasSavedAdventure && !error && (
          <>
            <button
              onClick={handleResumeAdventure}
              disabled={isLoading}
              className="adventure-menu__button adventure-menu__button--resume"
            >
              Resume Adventure
            </button>
            <p className="adventure-menu__saved-info">
              Adventure ID: {savedAdventureId?.slice(0, 8)}...
            </p>
          </>
        )}

        <button
          onClick={() => {
            void handleNewAdventure();
          }}
          disabled={isLoading}
          className="adventure-menu__button adventure-menu__button--new"
        >
          {isLoading ? "Creating..." : "New Adventure"}
        </button>
      </div>
    </div>
  );
}
