#!/usr/bin/env node

/**
 * WCAG 2.1 AA Contrast Validator for Theme Colors
 *
 * Validates that all text/background color combinations in themes.json
 * meet WCAG 2.1 AA contrast requirements (4.5:1 for normal text, 3:1 for large text).
 *
 * This script runs during build to ensure accessibility compliance.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// WCAG 2.1 AA Requirements
const CONTRAST_NORMAL = 4.5; // Normal text minimum
const CONTRAST_LARGE = 3.0;  // Large text (18pt+ or 14pt+ bold) minimum

interface ColorPair {
  foreground: string;
  background: string;
  description: string;
  requiresLargeTextOnly?: boolean; // If true, only needs 3:1
}

interface Theme {
  mood: string;
  colors: {
    [key: string]: string;
  };
}

interface ValidationResult {
  theme: string;
  pair: ColorPair;
  ratio: number;
  required: number;
  passed: boolean;
}

/**
 * Convert hex color to RGB values (0-255)
 */
function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return [r, g, b];
}

/**
 * Convert sRGB value (0-255) to linear RGB (0-1)
 */
function toLinear(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

/**
 * Calculate relative luminance per WCAG formula
 * L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 */
function getLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const R = toLinear(r);
  const G = toLinear(g);
  const B = toLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Calculate contrast ratio between two colors
 * ratio = (L1 + 0.05) / (L2 + 0.05) where L1 is lighter
 */
function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Define all color combinations that need validation
 */
function getColorPairsToValidate(colors: Theme['colors']): ColorPair[] {
  return [
    // Primary text on backgrounds
    {
      foreground: colors.text,
      background: colors.background,
      description: 'Primary text on main background',
    },
    {
      foreground: colors.text,
      background: colors.surface,
      description: 'Primary text on surface',
    },
    {
      foreground: colors.text,
      background: colors.surfaceAlt,
      description: 'Primary text on alternate surface',
    },

    // Secondary text on backgrounds
    {
      foreground: colors.textSecondary,
      background: colors.background,
      description: 'Secondary text on main background',
    },
    {
      foreground: colors.textSecondary,
      background: colors.surface,
      description: 'Secondary text on surface',
    },

    // Muted text on backgrounds
    {
      foreground: colors.textMuted,
      background: colors.background,
      description: 'Muted text on main background',
    },
    {
      foreground: colors.textMuted,
      background: colors.surface,
      description: 'Muted text on surface',
    },

    // Error text combinations
    {
      foreground: colors.error,
      background: colors.errorBg,
      description: 'Error text on error background',
    },

    // Player message combinations
    {
      foreground: colors.text,
      background: colors.playerBg,
      description: 'Text on player message background',
    },

    // GM message combinations
    {
      foreground: colors.text,
      background: colors.gmBg,
      description: 'Text on GM message background',
    },

    // Interactive elements (borders used as accent colors)
    // These often appear as colored text or icons, so validate against backgrounds
    {
      foreground: colors.primary,
      background: colors.background,
      description: 'Primary accent on main background',
      requiresLargeTextOnly: true, // Often used for larger UI elements
    },
    {
      foreground: colors.secondary,
      background: colors.background,
      description: 'Secondary accent on main background',
      requiresLargeTextOnly: true,
    },
  ];
}

/**
 * Validate a single theme's color combinations
 */
function validateTheme(theme: Theme): ValidationResult[] {
  const pairs = getColorPairsToValidate(theme.colors);
  const results: ValidationResult[] = [];

  for (const pair of pairs) {
    const ratio = getContrastRatio(pair.foreground, pair.background);
    const required = pair.requiresLargeTextOnly ? CONTRAST_LARGE : CONTRAST_NORMAL;
    const passed = ratio >= required;

    results.push({
      theme: theme.mood,
      pair,
      ratio,
      required,
      passed,
    });
  }

  return results;
}

/**
 * Format contrast ratio for display
 */
function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}

/**
 * Main validation function
 */
function main(): void {
  console.log('=== WCAG 2.1 AA Contrast Validation ===\n');

  // Load themes
  const themesPath = resolve(__dirname, '../src/themes.json');
  let themesData: { themes: Theme[] };

  try {
    const fileContent = readFileSync(themesPath, 'utf-8');
    themesData = JSON.parse(fileContent);
  } catch (error) {
    console.error(`❌ Failed to load themes.json: ${error}`);
    process.exit(1);
  }

  // Validate all themes
  const allResults: ValidationResult[] = [];

  for (const theme of themesData.themes) {
    const results = validateTheme(theme);
    allResults.push(...results);
  }

  // Separate passes and failures
  const failures = allResults.filter(r => !r.passed);
  const passes = allResults.filter(r => r.passed);

  // Report results
  console.log(`Validated ${themesData.themes.length} themes with ${allResults.length} color combinations\n`);

  if (failures.length > 0) {
    console.log(`❌ ${failures.length} contrast violations found:\n`);

    // Group failures by theme
    const failuresByTheme = new Map<string, ValidationResult[]>();
    for (const failure of failures) {
      if (!failuresByTheme.has(failure.theme)) {
        failuresByTheme.set(failure.theme, []);
      }
      failuresByTheme.get(failure.theme)!.push(failure);
    }

    // Print each theme's failures
    for (const [themeMood, themeFailures] of failuresByTheme) {
      console.log(`  Theme: ${themeMood}`);
      for (const failure of themeFailures) {
        console.log(`    ✗ ${failure.pair.description}`);
        console.log(`      Foreground: ${failure.pair.foreground}`);
        console.log(`      Background: ${failure.pair.background}`);
        console.log(`      Ratio: ${formatRatio(failure.ratio)} (required: ${formatRatio(failure.required)})`);
        console.log();
      }
    }

    console.log(`\n✓ ${passes.length} combinations passed`);
    console.log(`✗ ${failures.length} combinations failed\n`);

    console.log('WCAG 2.1 AA Requirements:');
    console.log(`  - Normal text: ${formatRatio(CONTRAST_NORMAL)} minimum`);
    console.log(`  - Large text (18pt+ or 14pt+ bold): ${formatRatio(CONTRAST_LARGE)} minimum\n`);

    process.exit(1);
  }

  console.log(`✓ All ${allResults.length} color combinations passed!\n`);

  // Print summary by theme
  const resultsByTheme = new Map<string, ValidationResult[]>();
  for (const result of allResults) {
    if (!resultsByTheme.has(result.theme)) {
      resultsByTheme.set(result.theme, []);
    }
    resultsByTheme.get(result.theme)!.push(result);
  }

  console.log('Theme Summary:');
  for (const [themeMood, themeResults] of resultsByTheme) {
    const minRatio = Math.min(...themeResults.map(r => r.ratio));
    const avgRatio = themeResults.reduce((sum, r) => sum + r.ratio, 0) / themeResults.length;
    console.log(`  ${themeMood}: ${themeResults.length} combinations validated`);
    console.log(`    Min ratio: ${formatRatio(minRatio)}, Avg ratio: ${formatRatio(avgRatio)}`);
  }

  console.log('\n✓ Contrast validation passed!\n');
  process.exit(0);
}

main();
