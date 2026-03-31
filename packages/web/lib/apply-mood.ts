/**
 * Applies a mood hue to the page by updating CSS custom properties on :root
 * and optionally setting the mood background image.
 *
 * Pure DOM operations, no React dependency.
 */
export function applyMood(hue: number, imageSrc?: string): void {
  const H = hue;
  const textHue = (H + 175) % 360;
  const accentHue = (H + 168) % 360;
  const gmHue = (H + 328) % 360;

  const root = document.documentElement.style;

  root.setProperty("--bg-base", `oklch(20% 0.045 ${H})`);
  root.setProperty("--bg-surface", `oklch(25% 0.045 ${H})`);
  root.setProperty("--bg-elevated", `oklch(30% 0.045 ${H})`);
  root.setProperty("--text-primary", `oklch(90% 0.024 ${textHue})`);
  root.setProperty("--text-secondary", `oklch(65% 0.024 ${textHue})`);
  root.setProperty("--text-tertiary", `oklch(45% 0.024 ${textHue})`);
  root.setProperty("--accent", `oklch(65% 0.135 ${accentHue})`);
  root.setProperty("--accent-hover", `oklch(85% 0.135 ${accentHue})`);
  root.setProperty("--gm-accent", `oklch(70% 0.075 ${gmHue})`);

  const bgLayer = document.getElementById("mood-bg-layer");
  if (bgLayer) {
    bgLayer.style.backgroundImage = imageSrc ? `url("${imageSrc}")` : "";
  }
}
