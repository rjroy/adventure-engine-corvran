const REPLICATE_URL =
  "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions";

/**
 * Generates a mood image via Replicate's flux-schnell model.
 * Returns the image URL on success, null on any failure.
 * Requires REPLICATE_API_TOKEN in the environment.
 */
export async function generateMoodImage(
  prompt: string,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<string | null> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    console.warn("[image-gen] REPLICATE_API_TOKEN not set; image generation disabled");
    return null;
  }

  try {
    const response = await fetchFn(REPLICATE_URL, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({ input: { prompt } }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      console.warn(`[image-gen] Replicate returned ${response.status}`);
      return null;
    }

    const body = (await response.json()) as {
      status?: string;
      output?: string[];
    };

    if (body.status === "succeeded" && body.output && body.output.length > 0) {
      return body.output[0];
    }

    console.warn(`[image-gen] Replicate prediction status: ${body.status}`);
    return null;
  } catch (err) {
    console.warn("[image-gen] Image generation failed:", err);
    return null;
  }
}
