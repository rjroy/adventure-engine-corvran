import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { ThemeMood } from "../types/protocol";
import type { ThemeDefinition, ThemesConfig } from "../types/theme";
import { CSS_VARIABLE_MAP } from "../types/theme";
import themesData from "../themes.json";

/**
 * Theme state managed by ThemeContext.
 * Tracks current mood, transition status, and background image.
 */
interface ThemeState {
  /** Current active theme mood */
  currentMood: ThemeMood;
  /** Theme mood pending application (during debounce period) */
  pendingMood: ThemeMood | null;
  /** URL to current background image, or null if none */
  backgroundUrl: string | null;
  /** Whether a theme transition is in progress */
  isTransitioning: boolean;
  /** Duration of current transition in milliseconds */
  transitionDuration: number;
  /** Timestamp of last theme change (for debouncing) */
  lastChangeTime: number;
}

/**
 * Options for applying a theme change.
 */
interface ApplyThemeOptions {
  /** Target mood to switch to */
  mood: ThemeMood;
  /** Background image URL (optional) */
  backgroundUrl?: string | null;
  /** Override default transition duration (optional) */
  transitionDuration?: number;
}

/**
 * Context value exposed via useTheme() hook.
 */
interface ThemeContextValue {
  /** Current active theme mood */
  currentMood: ThemeMood;
  /** Whether a theme transition is in progress */
  isTransitioning: boolean;
  /** URL to current background image, or null if none */
  backgroundUrl: string | null;
  /** Apply a new theme (with debouncing) */
  applyTheme: (options: ApplyThemeOptions) => void;
  /** Reset to default theme (for reconnection) */
  resetToDefault: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Default theme configuration.
 */
const DEFAULT_MOOD: ThemeMood = "calm";
const DEFAULT_TRANSITION_DURATION = 1500; // ms
const DEBOUNCE_DURATION = 1000; // ms (REQ-F-23)

/**
 * Loads themes from themes.json and indexes by mood.
 */
function loadThemes(): Map<ThemeMood, ThemeDefinition> {
  const config = themesData as ThemesConfig;
  const themeMap = new Map<ThemeMood, ThemeDefinition>();

  for (const theme of config.themes) {
    themeMap.set(theme.mood, theme);
  }

  return themeMap;
}

/**
 * Applies CSS variables to :root for a given theme definition.
 * Updates colors, fonts, and accent styles synchronously.
 */
function applyCSSVariables(theme: ThemeDefinition): void {
  const root = document.documentElement;

  // Apply color variables
  for (const [colorKey, cssVar] of Object.entries(CSS_VARIABLE_MAP)) {
    const colorValue = theme.colors[colorKey as keyof typeof theme.colors];
    root.style.setProperty(cssVar, colorValue);
  }

  // Apply font family
  root.style.setProperty("--font-family", theme.fonts.family);

  // Apply accent styles
  root.style.setProperty("--accent-border-style", theme.accents.borderStyle);

  // Apply shadow as box-shadow value
  const shadowValue = `0 2px ${theme.accents.shadowBlur} ${theme.accents.shadowColor}`;
  root.style.setProperty("--accent-shadow", shadowValue);
}

/**
 * ThemeProvider component that wraps the app and manages theme state.
 * Initializes with "calm" theme synchronously to prevent flash.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const themesRef = useRef<Map<ThemeMood, ThemeDefinition>>(loadThemes());
  const debounceTimerRef = useRef<number | null>(null);
  const lastChangeTimeRef = useRef<number>(0); // Track last change time in ref to avoid callback recreation

  const [state, setState] = useState<ThemeState>(() => {
    // Initialize with "calm" theme synchronously
    const calmTheme = themesRef.current.get(DEFAULT_MOOD);
    if (calmTheme) {
      applyCSSVariables(calmTheme);
    }

    return {
      currentMood: DEFAULT_MOOD,
      pendingMood: null,
      backgroundUrl: null,
      isTransitioning: false,
      transitionDuration: DEFAULT_TRANSITION_DURATION,
      lastChangeTime: Date.now(),
    };
  });

  /**
   * Internal function to apply a theme immediately (bypassing debounce).
   */
  const applyThemeImmediate = useCallback(
    (
      mood: ThemeMood,
      backgroundUrl: string | null = null,
      transitionDuration: number = DEFAULT_TRANSITION_DURATION
    ) => {
      const theme = themesRef.current.get(mood);
      if (!theme) {
        console.warn(`Theme not found for mood: ${mood}`);
        return;
      }

      // Apply CSS variables immediately
      console.log("[ThemeContext] Applying CSS variables for mood:", mood);
      applyCSSVariables(theme);

      // Update last change time ref (avoids callback recreation)
      const now = Date.now();
      lastChangeTimeRef.current = now;

      // Update state
      setState({
        currentMood: mood,
        pendingMood: null,
        backgroundUrl,
        isTransitioning: true,
        transitionDuration,
        lastChangeTime: now,
      });

      // Clear transitioning flag after duration
      setTimeout(() => {
        setState((prev) => ({ ...prev, isTransitioning: false }));
      }, transitionDuration);
    },
    []
  );

  /**
   * Public API: Apply a theme with debouncing.
   * Rapid changes within DEBOUNCE_DURATION are coalesced.
   */
  const applyTheme = useCallback(
    (options: ApplyThemeOptions) => {
      const { mood, backgroundUrl = null, transitionDuration } = options;
      const now = Date.now();

      // Clear any pending debounce timer
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }

      // Check if we need to debounce (read from ref to avoid callback recreation)
      const timeSinceLastChange = now - lastChangeTimeRef.current;
      if (timeSinceLastChange < DEBOUNCE_DURATION) {
        // Debounce: set pending mood and schedule application
        setState((prev) => ({ ...prev, pendingMood: mood }));

        debounceTimerRef.current = window.setTimeout(() => {
          applyThemeImmediate(mood, backgroundUrl, transitionDuration);
        }, DEBOUNCE_DURATION - timeSinceLastChange);
      } else {
        // Apply immediately
        applyThemeImmediate(mood, backgroundUrl, transitionDuration);
      }
    },
    [applyThemeImmediate] // Stable: no state.lastChangeTime dependency
  );

  /**
   * Public API: Reset to default theme (used on reconnection).
   */
  const resetToDefault = useCallback(() => {
    // Clear any pending debounce
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Apply default theme immediately
    applyThemeImmediate(DEFAULT_MOOD, null, DEFAULT_TRANSITION_DURATION);
  }, [applyThemeImmediate]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const value: ThemeContextValue = {
    currentMood: state.currentMood,
    isTransitioning: state.isTransitioning,
    backgroundUrl: state.backgroundUrl,
    applyTheme,
    resetToDefault,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context.
 * Must be used within a ThemeProvider.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
