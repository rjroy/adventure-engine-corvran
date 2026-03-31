import { describe, expect, it, afterEach } from "bun:test";
import { PNG } from "pngjs";
import { extractDominantHue } from "../../src/services/color-extract";
import { join } from "node:path";
import { unlinkSync } from "node:fs";

const TMPDIR = process.env.TMPDIR || "/tmp/claude-1000";

function createSolidPng(r: number, g: number, b: number, size = 16): Buffer {
  const png = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

const tempFiles: string[] = [];

async function writeTempPng(name: string, buf: Buffer): Promise<string> {
  const path = join(TMPDIR, `test-${name}-${Date.now()}.png`);
  await Bun.write(path, buf);
  tempFiles.push(path);
  return path;
}

afterEach(() => {
  for (const f of tempFiles) {
    try { unlinkSync(f); } catch { /* ignore */ }
  }
  tempFiles.length = 0;
});

describe("extractDominantHue", () => {
  it("returns hue in [0, 360) for a red image", async () => {
    const path = await writeTempPng("red", createSolidPng(255, 0, 0));
    const hue = await extractDominantHue(path);
    expect(hue).toBeGreaterThanOrEqual(0);
    expect(hue).toBeLessThan(360);
    // Red in OKLCH is roughly hue 20-30
    expect(hue).toBeGreaterThanOrEqual(15);
    expect(hue).toBeLessThanOrEqual(35);
  });

  it("returns 270 for an achromatic (gray) image", async () => {
    const path = await writeTempPng("gray", createSolidPng(128, 128, 128));
    const hue = await extractDominantHue(path);
    expect(hue).toBe(270);
  });

  it("returns hue near 140 for a green image", async () => {
    const path = await writeTempPng("green", createSolidPng(0, 200, 0));
    const hue = await extractDominantHue(path);
    expect(hue).toBeGreaterThanOrEqual(130);
    expect(hue).toBeLessThanOrEqual(155);
  });

  it("returns hue near 260 for a blue image", async () => {
    const path = await writeTempPng("blue", createSolidPng(0, 0, 255));
    const hue = await extractDominantHue(path);
    expect(hue).toBeGreaterThanOrEqual(250);
    expect(hue).toBeLessThanOrEqual(275);
  });

  it("throws on a non-PNG file (WebP saved as .png)", async () => {
    const fixturePath = join(__dirname, "../fixtures/webp-as-png.png");
    await expect(extractDominantHue(fixturePath)).rejects.toThrow();
  });
});
