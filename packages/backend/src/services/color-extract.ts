import { PNG } from "pngjs";
import { useMode, modeOklch, converter } from "culori/fn";

useMode(modeOklch);
const toOklch = converter("oklch");

const BUCKET_COUNT = 36;
const BUCKET_WIDTH = 360 / BUCKET_COUNT; // 10 degrees
const CHROMA_THRESHOLD = 0.02;
const SAMPLE_STRIDE = 8;
const DEFAULT_HUE = 270;

/**
 * Extracts the dominant hue from a PNG file at the given path.
 * Returns OKLCH hue angle in [0, 360). Returns 270 for achromatic images.
 */
export async function extractDominantHue(imagePath: string): Promise<number> {
  const fileBuffer = await Bun.file(imagePath).arrayBuffer();
  const png = PNG.sync.read(Buffer.from(fileBuffer));
  const { width, height, data } = png;

  const histogram = new Uint32Array(BUCKET_COUNT);
  let chromaticCount = 0;

  for (let y = 0; y < height; y += SAMPLE_STRIDE) {
    for (let x = 0; x < width; x += SAMPLE_STRIDE) {
      const idx = (y * width + x) * 4;
      const r = data[idx] / 255;
      const g = data[idx + 1] / 255;
      const b = data[idx + 2] / 255;

      const oklch = toOklch({ mode: "rgb", r, g, b });
      if (!oklch || oklch.c === undefined || oklch.c < CHROMA_THRESHOLD) continue;
      if (oklch.h === undefined) continue;

      const bucket = Math.floor(oklch.h / BUCKET_WIDTH) % BUCKET_COUNT;
      histogram[bucket]++;
      chromaticCount++;
    }
  }

  if (chromaticCount === 0) return DEFAULT_HUE;

  let maxBucket = 0;
  for (let i = 1; i < BUCKET_COUNT; i++) {
    if (histogram[i] > histogram[maxBucket]) {
      maxBucket = i;
    }
  }

  return (maxBucket * BUCKET_WIDTH) + (BUCKET_WIDTH / 2);
}
