import { useState, useCallback, useEffect } from "react";
import "./AdventureMenu.css";

export interface AdventureMenuProps {
  onAdventureStart: (adventureId: string, sessionToken: string) => void;
}

interface AdventureData {
  adventureId: string;
  sessionToken: string;
}

interface AdventureSummary {
  id: string;
  sessionToken: string;
  createdAt: string;
  lastActiveAt: string;
  currentScene: { description: string; location: string };
  backgroundUrl: string | null;
}

const STORAGE_KEYS = {
  ADVENTURE_ID: "adventure_id",
  SESSION_TOKEN: "session_token",
  ADVENTURE_TOKENS: "adventure_tokens",
} as const;

export function AdventureMenu({ onAdventureStart }: AdventureMenuProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdventureList, setShowAdventureList] = useState(false);
  const [adventures, setAdventures] = useState<AdventureSummary[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Check if there's a saved adventure (most recent)
  const savedAdventureId = localStorage.getItem(STORAGE_KEYS.ADVENTURE_ID);
  const savedSessionToken = localStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
  const hasSavedAdventure = Boolean(savedAdventureId && savedSessionToken);

  // Get all stored tokens (adventure_id -> session_token map)
  const getStoredTokens = useCallback((): Record<string, string> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ADVENTURE_TOKENS);
      if (stored) {
        return JSON.parse(stored) as Record<string, string>;
      }
    } catch {
      // Invalid JSON, ignore
    }
    return {};
  }, []);

  const saveToken = useCallback(
    ({ adventureId, sessionToken }: AdventureData) => {
      // Save as most recent
      localStorage.setItem(STORAGE_KEYS.ADVENTURE_ID, adventureId);
      localStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, sessionToken);

      // Also store in tokens map for future loading
      const tokens = getStoredTokens();
      tokens[adventureId] = sessionToken;
      localStorage.setItem(STORAGE_KEYS.ADVENTURE_TOKENS, JSON.stringify(tokens));
    },
    [getStoredTokens]
  );

  const clearLocalStorage = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.ADVENTURE_ID);
    localStorage.removeItem(STORAGE_KEYS.SESSION_TOKEN);
  }, []);

  const loadAdventureList = useCallback(async () => {
    setLoadingList(true);
    setError(null);

    try {
      const response = await fetch("/api/adventures");

      if (!response.ok) {
        throw new Error(`Failed to load adventures: ${response.status}`);
      }

      const data: unknown = await response.json();

      if (
        typeof data !== "object" ||
        data === null ||
        !("adventures" in data) ||
        !Array.isArray(data.adventures)
      ) {
        throw new Error("Invalid response from server");
      }

      setAdventures(data.adventures as AdventureSummary[]);
      setShowAdventureList(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load adventures");
    } finally {
      setLoadingList(false);
    }
  }, []);

  const handleSelectAdventure = useCallback(
    (adventure: AdventureSummary) => {
      // Save token and start adventure
      saveToken({ adventureId: adventure.id, sessionToken: adventure.sessionToken });
      onAdventureStart(adventure.id, adventure.sessionToken);
    },
    [saveToken, onAdventureStart]
  );

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
      saveToken({
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
  }, [saveToken, onAdventureStart]);

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

  // Migrate existing saved adventure to tokens map on mount
  useEffect(() => {
    if (savedAdventureId && savedSessionToken) {
      const tokens = getStoredTokens();
      if (!tokens[savedAdventureId]) {
        tokens[savedAdventureId] = savedSessionToken;
        localStorage.setItem(STORAGE_KEYS.ADVENTURE_TOKENS, JSON.stringify(tokens));
      }
    }
  }, [savedAdventureId, savedSessionToken, getStoredTokens]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Truncate description
  const truncateDescription = (text: string, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + "...";
  };

  if (showAdventureList) {
    return (
      <div className="adventure-menu">
        <h1 className="adventure-menu__title">Load Adventure</h1>

        <div className="adventure-list">
          {adventures.length === 0 ? (
            <p className="adventure-list__empty">
              No saved adventures found. Start a new adventure to begin.
            </p>
          ) : (
            adventures.map((adventure) => (
              <button
                key={adventure.id}
                className="adventure-card"
                onClick={() => handleSelectAdventure(adventure)}
              >
                <div
                  className="adventure-card__image"
                  style={{
                    backgroundImage: adventure.backgroundUrl
                      ? `url(${adventure.backgroundUrl})`
                      : undefined,
                  }}
                >
                  {!adventure.backgroundUrl && (
                    <span className="adventure-card__no-image">No Image</span>
                  )}
                </div>
                <div className="adventure-card__content">
                  <p className="adventure-card__description">
                    {truncateDescription(adventure.currentScene.description)}
                  </p>
                  <p className="adventure-card__meta">
                    {adventure.currentScene.location} &bull;{" "}
                    {formatDate(adventure.lastActiveAt)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        <button
          onClick={() => setShowAdventureList(false)}
          className="adventure-menu__button adventure-menu__button--back"
        >
          Back
        </button>
      </div>
    );
  }

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
            loadAdventureList().catch((err: unknown) => {
              setError(
                err instanceof Error ? err.message : "An unexpected error occurred"
              );
            });
          }}
          disabled={isLoading || loadingList}
          className="adventure-menu__button adventure-menu__button--load"
        >
          {loadingList ? "Loading..." : "Load Adventure"}
        </button>

        <button
          onClick={() => {
            handleNewAdventure().catch((err: unknown) => {
              setError(
                err instanceof Error ? err.message : "An unexpected error occurred"
              );
            });
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
