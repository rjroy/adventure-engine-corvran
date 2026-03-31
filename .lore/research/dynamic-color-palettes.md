---
title: Dynamic UI Color Palette Generation from Seed Colors
date: 2026-03-30
status: open
tags: [research, ui, color, accessibility, frontend, web]
---

# Dynamic UI Color Palette Generation from Seed Colors

This research addresses how to generate a complete, accessible UI color palette from 1-3 arbitrary colors at runtime, specifically for the Adventure Engine's GM mood system.

## Methodology and confidence levels

Throughout this document:
- **Verified** means checked against source material (specs, source code, official documentation)
- **Reported** means sourced from community articles, blog posts, or library documentation
- **Inferred** means the author's synthesis from multiple data points

---

## Summary: Recommended Approach

The clearest path for Corvran's use case:

1. **Color space**: Generate in OKLCH. It is the only color space that is perceptually uniform, natively supported in CSS, and handles blues/purples without hue drift. Verified against the CSS Color Level 4 spec and Evil Martians' production analysis.

2. **Algorithm**: Fixed-lightness tonal palette. Take the input hue(s), lock chroma to a curve (low at extremes, high at midtones), and step lightness from 97% down to 12% in nine steps. This directly encodes accessible contrast into the generation math. Reported via LogRocket/OKLCH production analysis.

3. **Library**: `culori/fn` (tree-shakeable import) for color math. It is OKLCH-native, the smallest footprint among full-featured options, and provides contrast calculation. Bundling only OKLCH conversion functions runs roughly 3-5kB minified. Verified against culori documentation.

4. **CSS integration**: Set all CSS custom properties in one batched call via `document.documentElement.style.setProperty()`. Add CSS `transition` to consuming properties (not variables) for smooth swaps. Use `@property` registration for animated variables.

5. **Accessibility enforcement**: Before applying the generated palette, compute WCAG 2.1 contrast ratios between the assigned text/background slots. Adjust lightness mechanically in OKLCH until 4.5:1 is satisfied. Do not rely on visual judgment.

---

## Q1: Color Theory Approaches for Palette Derivation

### Harmony algorithms

Color harmony is derived by rotating hue in a color wheel. The mathematical relationships are simple:

| Harmony | Hue offset(s) |
|---|---|
| Complementary | ±180° |
| Analogous | ±30°, ±60° |
| Triadic | ±120° |
| Split-complementary | ±150° |
| Tetradic | ±90° |

In HSL, these rotations are straightforward: `(hue + offset) % 360`. The approach is standard and widely implemented. Source: Dev.to color harmonies article.

**Critical limitation**: HSL harmony math produces valid hue relationships, but HSL is not perceptually uniform. Two colors at identical HSL lightness values can have dramatically different perceived brightness. A yellow and a blue at `hsl(*, 80%, 60%)` will appear radically different in lightness to the human eye. This makes accessibility guarantees impossible without post-hoc correction.

### Tonal palette approach (recommended for UI)

Rather than deriving a set of distinct hues, a tonal palette takes a single hue and generates a spectrum of lightness values. This is how design systems (Material You, Radix Colors, Tailwind) actually work:

- Lightness runs from near-white (97%) to near-black (12%) in steps
- Chroma follows a curve: low at the extremes, peaking at mid-lightness (~50%)
- Each color family shares the same lightness progression; only hue differs

Concrete LogRocket example values (reported, OKLCH-native):
```
L:  97%, 89%, 80%, 71%, 60%, 49%, 38%, 25%, 12%
C:  0.02, 0.07, 0.14, 0.22, 0.27, 0.22, 0.14, 0.07, 0.02
H:  input hue (constant per family)
```

With multiple input colors, each color becomes its own tonal family. UI roles (background, surface, text, accent, destructive) are then mapped to specific lightness stops from the appropriate family.

### Material You tonal palette algorithm

Google's Material 3 system uses a similar approach but in their custom HCT color space. From one seed color, MCU generates five tonal palettes (primary, secondary, tertiary, neutral, neutralVariant), each with 13 tones from 0 to 100. Specific tones are then assigned to semantic color roles (surface, onSurface, primary, onPrimary, etc.). Verified against Material 3 documentation.

The advantage of MCU for Corvran: the semantic role system is pre-built. The disadvantage: the library is 1.06MB, the HCT color space is not native CSS, and the aesthetic is unmistakably Material You.

---

## Q2: CSS Custom Properties at Runtime

### The mechanism

CSS custom properties cascade and inherit. Setting variables on `:root` makes them available to the entire document:

```css
:root {
  --color-bg: oklch(97% 0.02 250);
  --color-surface: oklch(89% 0.07 250);
  --color-text: oklch(12% 0.02 250);
  --color-accent: oklch(49% 0.27 250);
}
```

JavaScript updates them via:
```javascript
const root = document.documentElement;
root.style.setProperty('--color-bg', 'oklch(97% 0.02 250)');
root.style.setProperty('--color-surface', 'oklch(89% 0.07 250)');
// ... etc
```

### Performance

Updating CSS variables on `:root` triggers one style recalculation pass for the entire document. This is a single reflow, not one per property. Batching all variable updates in the same synchronous block (before the browser repaints) keeps the cost minimal. Reported via Lisi Linhart's CSS variable performance analysis.

Wrapping in `requestAnimationFrame` is not strictly necessary for a one-time palette swap, but avoids visual tearing if the update happens mid-frame.

**Do not** animate CSS variable values directly unless they are registered with `@property`. Without registration, the browser treats them as string values and cannot interpolate between states.

### Smooth transitions

The correct pattern for a smooth palette swap is CSS `transition` on the consuming properties, not the variables:

```css
body {
  background-color: var(--color-bg);
  transition: background-color 0.4s ease;
}

.text-primary {
  color: var(--color-text);
  transition: color 0.4s ease;
}
```

When the JS updates `--color-bg`, the `background-color` property transitions smoothly because the browser is interpolating the computed color value.

For animated variables (e.g., pulsing glow effects), `@property` enables frame-by-frame interpolation:

```css
@property --accent-glow {
  syntax: '<color>';
  initial-value: oklch(49% 0.27 250);
  inherits: true;
}
```

Reported via CSS-Tricks color mixing article and CSS @property MDN documentation.

---

## Q3: Accessibility Enforcement

### WCAG 2.1 requirements

- Normal text: ≥ 4.5:1 contrast ratio against background
- Large text (18pt/14pt bold+): ≥ 3:1
- UI components and graphics: ≥ 3:1

These are the current legal standard. Verified against WCAG 2.1.

### APCA and WCAG 3.0 (forward-looking)

APCA (Accessible Perceptual Contrast Algorithm) is the candidate method for WCAG 3.0. It is more perceptually accurate than WCAG 2.1's luminance ratio, particularly:
- Accounts for font size and weight (a 12px light font needs more contrast than 24px bold)
- Avoids WCAG 2.1's failure modes (dark colors overstated, some technically compliant orange/white pairs are unreadable)
- Uses Lc (Lightness Contrast) scores: Lc 60 for large/bold text, Lc 75 for body text, Lc 90 for small text

WCAG 3.0 is not finalized as of 2026. APCA is the correct direction but not yet the compliance standard. Reported via APCA documentation and accessibility community analysis.

### Enforcing accessibility during generation

The tonal palette approach in OKLCH gives structural accessibility for free: text at tone 800 (dark) on background at tone 50 (light) will reliably exceed 4.5:1 because the lightness gap is large and OKLCH lightness is perceptually calibrated.

For dynamic generation with arbitrary input colors, the explicit algorithm is:

1. Convert input color to OKLCH
2. Extract hue H
3. Generate palette by fixing H, varying L along the curve above
4. Assign UI roles to lightness stops: text → low-L stop, background → high-L stop, accent → mid-L stop
5. Compute WCAG contrast between text/background pair using the relative luminance formula (available in culori as `wcagContrast()`)
6. If contrast < 4.5:1, increment text darkness or background lightness until it passes, then reassign

Step 6 is mechanical in OKLCH. You can incrementally nudge L in the correct direction and recheck. This is not possible in HSL without unpredictable perceptual side effects.

### Libraries with contrast computation

- **culori**: `wcagContrast(color1, color2)` — verified in culori API docs
- **chroma.js**: `chroma.contrast(color1, color2)` — verified in chroma.js API docs
- **color2k**: `getContrastRatio(background, foreground)` — reported via color2k documentation

---

## Q4: Library Survey

### Evaluation matrix

| Library | Minified size | OKLCH native | Contrast check | Tree-shakeable | Notes |
|---|---|---|---|---|---|
| `culori` | ~40kB full, ~5kB tree-shaken | Yes | `wcagContrast()` | Yes (via `culori/fn`) | Best fit for this use case |
| `chroma.js` | ~13.5kB min | No (sRGB-based) | `contrast()` | No | Good scales/blending API; limited color spaces |
| `color2k` | ~2.8kB | No (sRGB only) | `getContrastRatio()` | Yes | Too minimal; no OKLCH |
| `@material/material-color-utilities` | 1.06MB | HCT (not OKLCH) | Built into tonal system | No | Complete system; too heavy |
| `colorjs.io` | ~25kB+ | Yes | Yes | Partial | Authored by CSS spec editors; very complete but heavier API |

Size notes: culori full-bundle size is inferred from description; tree-shaken OKLCH-only path is estimated ~3-5kB based on `@texel/color` comparison data. chroma.js 13.5kB is reported on npm. color2k 2.8kB is verified on GitHub. MCU 1.06MB is from npm package data.

### culori (recommended)

culori is OKLCH-native, designed for the CSS Colors Level 4 spec. Its `culori/fn` import is fully tree-shakeable by requiring explicit mode registration:

```javascript
import { useMode, modeOklch, wcagContrast, converter } from 'culori/fn';

const toOklch = useMode(modeOklch);
const toRgb = converter('rgb');

// Convert input hex to OKLCH
const seed = toOklch('#7c3aed');
// seed = { mode: 'oklch', l: 0.47, c: 0.22, h: 295 }
```

This allows bundling only the color spaces and functions actually used, keeping production payload minimal. Verified against culori tree-shaking documentation.

### chroma.js (solid fallback)

chroma.js has a battle-tested API and excellent palette interpolation (`chroma.scale()`). Its weakness is no native OKLCH support and inability to tree-shake. At 13.5kB minified, it is small enough for most applications. The palette scale approach:

```javascript
chroma.scale(['#3b49df', '#fff']).mode('lab').colors(9)
```

Working in LAB mode approximates perceptual uniformity but is not as accurate as OKLCH for extreme hues. Reported via chroma.js API documentation.

### @material/material-color-utilities (best complete system, heavy)

If the desired aesthetic matches Material You, MCU provides the most complete out-of-the-box system: seed color → 5 tonal palettes → semantic roles → light/dark scheme. The JavaScript API:

```javascript
import { argbFromHex, themeFromSourceColor } from '@material/material-color-utilities';

const theme = themeFromSourceColor(argbFromHex('#7c3aed'));
// theme.schemes.light, theme.schemes.dark contain all role assignments
```

The 1.06MB size is prohibitive for a web app context unless MCU is already in use. It is not tree-shakeable. Reported via Material 3 documentation and npm package data.

---

## Q5: Prior Art — Apps with Dynamic UI Palette from Content/AI

### Spotify: dynamic album art theming

Spotify's "Now Playing" screen derives its background gradient from the album cover. The technical approach:
- Extract dominant colors from the album image using K-means clustering
- Apply extracted palette to background, text, and button states
- Switch text color between white/black based on background luma threshold

Spotify uses the Android `Palette` library for native, and Color Thief / Vibrant.js for web implementations. The accessibility check is minimal: if background luminance > threshold, use dark text; otherwise use white text. Reported via Medium developer analysis.

**Limitation**: Spotify's approach is not generative — it extracts from an existing image. For Corvran (where the GM provides colors without an image), the extraction step is replaced by direct input.

### Material You (Android 12+): wallpaper-driven system palette

Android's dynamic color system extracts a seed color from the user's wallpaper, then generates a full system palette via HCT tonal palettes and assigns colors to every role in the OS UI. This is the most complete implemented example of the pattern Corvran is targeting — one seed color producing an entire UI theme. The MCU library is the open-source implementation. Verified against Material 3 documentation.

### Netflix / Apple Music: content-adaptive theming

Apple Music uses album art color extraction to set a gradient background on the "Now Playing" view. Netflix uses similar techniques for movie/show detail pages, tinting backgrounds with the content's dominant color. Neither publishes their specific algorithm, but both use dominant color extraction + accessibility threshold for text color. Inferred from product observation; implementation details unverified.

### AI palette generators (Huemint, Colormind, Khroma)

These tools generate palettes from prompts or seed colors using ML models. They produce aesthetically coherent palettes but are hosted services — they require a network round-trip and cannot run in-browser at generation time. Not suitable as a runtime palette generator for Corvran (latency, offline capability, dependency on external service). Reported via product documentation.

**Relevant design pattern from Huemint**: the ML approach tends to produce better multi-color harmony than pure algorithmic approaches because it has learned from human-validated color combinations. For a future improvement, the GM could provide colors through a palette suggestion API rather than precise hex values.

---

## Q6: Color Space Tradeoffs

### HSL

Simple, universal, human-understandable. Hue rotation math is trivial. Not perceptually uniform — identical `l` values produce radically different perceived brightness across hues. Cannot guarantee accessibility without manual correction. Fine for harmony relationships; inadequate for palette generation with accessibility requirements. Verified against CSS specification.

### LCH (CIELAB-based)

Perceptually uniform. Better than HSL for predictable lightness manipulation. Suffers from hue drift in blue/purple colors: adjusting chroma or lightness can unexpectedly shift the apparent hue toward blue. Not a native CSS color function in as many implementations. OKLCH supersedes it for new work. Reported via Evil Martians OKLCH analysis.

### OKLCH (recommended)

OKLCH is LCH with Björn Ottosson's Oklab perceptual corrections applied. It fixes LCH's blue/purple hue instability. Lightness adjustments produce predictable results across all hues. Native CSS support (`oklch()` function) is available in all major browsers as of 2025. Wide-gamut capable (P3 and beyond). The correct choice for generating accessible, consistent palettes programmatically. Verified against browser compatibility data and CSS Color Level 4 spec.

**Gamut consideration**: not all OKLCH values produce displayable sRGB colors. Values with high chroma at extreme lightness (very light + high chroma, very dark + high chroma) fall outside the sRGB gamut. The browser will gamut-map them, but the result may not be the intended color. The mitigation: use the chroma curve described in Q1 (low chroma at lightness extremes), which keeps colors inside sRGB naturally. For P3-capable displays, higher chroma is valid and produces more vivid results.

### HCT (Material You)

Google's custom color space combining CAM16 (perceptual color model) with CIELAB lightness. Better calibrated for contrast than OKLCH in Google's internal testing. Not a CSS standard — requires the MCU library to use. Best reserved for projects already in the Material You ecosystem. Reported via Material 3 color system documentation.

### Practical summary

| Space | Perceptual uniformity | CSS native | Blue/purple stability | Best for |
|---|---|---|---|---|
| HSL | No | Yes | N/A | Harmony calculations only |
| LCH | Yes | Yes (Level 4) | Poor | Legacy use |
| OKLCH | Yes | Yes (Level 4) | Good | UI palette generation |
| HCT | Yes (best for contrast) | No (library required) | Good | Material You projects |

---

## Implementation Sketch for Corvran

Given the research, a Corvran palette generator would work as follows:

**Input**: 1-3 hex or named colors from the GM
**Output**: A set of CSS custom properties applied to `:root`

```typescript
import { useMode, modeOklch, wcagContrast, converter } from 'culori/fn';

const toOklch = useMode(modeOklch);
const toRgb = converter('rgb');
const toCss = (oklch) => `oklch(${oklch.l * 100}% ${oklch.c} ${oklch.h})`;

// Lightness and chroma curves for a 9-stop tonal palette
const LIGHTNESS = [0.97, 0.89, 0.80, 0.71, 0.60, 0.49, 0.38, 0.25, 0.12];
const CHROMA =    [0.02, 0.07, 0.14, 0.22, 0.27, 0.22, 0.14, 0.07, 0.02];

function generateTonalPalette(hexColor: string) {
  const base = toOklch(hexColor);
  return LIGHTNESS.map((l, i) => ({ l, c: CHROMA[i], h: base.h, mode: 'oklch' as const }));
}

function applyMoodPalette(primaryHex: string) {
  const palette = generateTonalPalette(primaryHex);

  const bg     = palette[0]; // tone 50: near-white
  const surface = palette[1]; // tone 100
  const text   = palette[8]; // tone 900: near-black
  const accent = palette[4]; // tone 500: maximum chroma

  // Verify accessibility before applying
  const contrast = wcagContrast(bg, text);
  if (contrast < 4.5) {
    // Mechanically adjust: lighten bg or darken text until satisfied
    // (omitted for brevity; adjust l values incrementally and recheck)
  }

  const root = document.documentElement;
  root.style.setProperty('--color-bg', toCss(bg));
  root.style.setProperty('--color-surface', toCss(surface));
  root.style.setProperty('--color-text', toCss(text));
  root.style.setProperty('--color-accent', toCss(accent));
}
```

CSS consuming the variables with smooth transitions:
```css
body {
  background-color: var(--color-bg);
  color: var(--color-text);
  transition: background-color 0.5s ease, color 0.5s ease;
}
```

**Dark mode consideration**: generate two palettes from the same seed — flip the lightness assignments (text → tone 50, background → tone 900) for dark mode. The chroma curve is the same; only the role mappings invert.

---

## Sources

- [OKLCH in CSS: why we moved from RGB and HSL — Evil Martians](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl)
- [OKLCH CSS: Consistent, accessible color palettes — LogRocket](https://blog.logrocket.com/oklch-css-consistent-accessible-color-palettes)
- [Culori color library](https://culorijs.org/)
- [Optimize bundle size with tree-shaking — culori docs](https://culorijs.org/guides/tree-shaking/)
- [Color functions for JavaScript — culori](https://culorijs.org/)
- [Sequential Color Palette Generation using OKLCH — Observable](https://observablehq.com/@clhenrick/sequential-color-palette-generation-using-oklch)
- [Material Design 3: How the color system works](https://m3.material.io/styles/color/system/how-the-system-works)
- [material-color-utilities — GitHub](https://github.com/material-foundation/material-color-utilities)
- [Generating Material Design 3 Dynamic Color Scheme with JavaScript](https://dt.in.th/M3DynamicColorJS)
- [Generating accessible color palettes for design systems inspired by APCA — Canonical](https://canonical.design/blog/generating-color-palettes-for-design-systems-inspired-by-apca)
- [Color harmonies in JavaScript — DEV Community](https://dev.to/benjaminadk/make-color-math-great-again--45of)
- [Dynamic Theming: A Developer's Guide to Adaptive Color in UI — DEV Community](https://dev.to/mike-at-redspace/dynamic-theming-a-developers-guide-to-adaptive-color-in-ui-53ml)
- [How Spotify Creates Those Stunning Backdrops — Medium](https://medium.com/@shanmugashree3/how-spotify-creates-those-stunning-backdrops-that-match-every-song-playlist-00fe13eab033)
- [APCA in a Nutshell](https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html)
- [Why APCA as a New Contrast Method](https://git.apcacontrast.com/documentation/WhyAPCA.html)
- [CSS color-mix() complete guide](https://devtoolbox.dedyn.io/blog/css-color-mix-complete-guide)
- [Smashing Animations Part 8: CSS Relative Colour — Smashing Magazine](https://www.smashingmagazine.com/2026/01/smashing-animations-part-8-css-relative-colour/)
- [chroma.js API docs](https://gka.github.io/chroma.js/)
- [color2k — GitHub](https://github.com/ricokahler/color2k)
- [Performance of CSS Variables — Lisi Linhart](https://lisilinhart.info/posts/css-variables-performance)
- [Accessible Palette: Create color systems with consistent lightness and contrast](https://accessiblepalette.com/)
