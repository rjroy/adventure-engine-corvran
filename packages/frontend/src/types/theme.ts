// Theme Definition Types for Dynamic Theming System
// Matches the structure of themes.json for type-safe theme management

import type { ThemeMood } from "./protocol";

/**
 * Color definitions for a theme.
 * All colors should meet WCAG 2.1 AA contrast requirements (4.5:1 for text).
 */
export interface ThemeColors {
  /** Accent color for interactive elements (buttons, links) */
  primary: string;
  /** Secondary accent color */
  secondary: string;
  /** Main background color */
  background: string;
  /** Card/panel background color */
  surface: string;
  /** Alternate surface color for variation */
  surfaceAlt: string;
  /** Border color for separators and outlines */
  border: string;
  /** Primary text color */
  text: string;
  /** Secondary text color for less emphasis */
  textSecondary: string;
  /** Muted text color for minimal emphasis */
  textMuted: string;
  /** Player message background */
  playerBg: string;
  /** Player message border */
  playerBorder: string;
  /** GM message background */
  gmBg: string;
  /** GM message border */
  gmBorder: string;
  /** Error text color */
  error: string;
  /** Error background color */
  errorBg: string;
  /** Inline code background */
  codeBg: string;
  /** Inline code text */
  codeText: string;
  /** Code block background */
  preBg: string;
  /** Code block text */
  preText: string;
}

/**
 * Font definitions for a theme.
 */
export interface ThemeFonts {
  /** Font family stack with web-safe fallbacks */
  family: string;
}

/**
 * Accent style definitions for decorative elements.
 */
export interface ThemeAccents {
  /** Border style for NarrativeEntry (solid, dashed, dotted) */
  borderStyle: "solid" | "dashed" | "dotted";
  /** Box shadow color (rgba format recommended) */
  shadowColor: string;
  /** Box shadow blur radius (e.g., "4px", "8px") */
  shadowBlur: string;
}

/**
 * Complete theme definition matching themes.json structure.
 * Used by ThemeContext to load and apply themes.
 */
export interface ThemeDefinition {
  /** Mood identifier matching ThemeMood type */
  mood: ThemeMood;
  /** Color palette for this mood */
  colors: ThemeColors;
  /** Font configuration for this mood */
  fonts: ThemeFonts;
  /** Accent/decoration styles for this mood */
  accents: ThemeAccents;
}

/**
 * Structure of the themes.json file.
 */
export interface ThemesConfig {
  themes: ThemeDefinition[];
}

/**
 * CSS variable name to theme color key mapping.
 * Used to translate theme colors to CSS custom properties.
 */
export const CSS_VARIABLE_MAP: Record<keyof ThemeColors, string> = {
  primary: "--color-primary",
  secondary: "--color-secondary",
  background: "--color-background",
  surface: "--color-surface",
  surfaceAlt: "--color-surface-alt",
  border: "--color-border",
  text: "--color-text",
  textSecondary: "--color-text-secondary",
  textMuted: "--color-text-muted",
  playerBg: "--color-player-bg",
  playerBorder: "--color-player-border",
  gmBg: "--color-gm-bg",
  gmBorder: "--color-gm-border",
  error: "--color-error",
  errorBg: "--color-error-bg",
  codeBg: "--color-code-bg",
  codeText: "--color-code-text",
  preBg: "--color-pre-bg",
  preText: "--color-pre-text",
};
