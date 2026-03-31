import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { generateMoodImage } from "../../src/services/image-gen";

/** Wrap a simple async function as typeof fetch (Bun's fetch includes extra properties). */
function asFetch(fn: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>): typeof fetch {
  return Object.assign(fn, { preconnect: (_url: string | URL) => {} }) as typeof fetch;
}

describe("generateMoodImage", () => {
  let savedToken: string | undefined;

  beforeEach(() => {
    savedToken = process.env.REPLICATE_API_TOKEN;
    process.env.REPLICATE_API_TOKEN = "test-token";
  });

  afterEach(() => {
    if (savedToken === undefined) {
      delete process.env.REPLICATE_API_TOKEN;
    } else {
      process.env.REPLICATE_API_TOKEN = savedToken;
    }
  });

  it("returns image URL on successful prediction", async () => {
    const mockFetch = asFetch(async () =>
      new Response(
        JSON.stringify({
          status: "succeeded",
          output: ["https://replicate.delivery/image.png"],
        }),
        { status: 200 },
      ),
    );

    const result = await generateMoodImage("a dark forest", mockFetch);
    expect(result).toBe("https://replicate.delivery/image.png");
  });

  it("returns null on non-200 HTTP status", async () => {
    const mockFetch = asFetch(async () => new Response("error", { status: 500 }));
    const result = await generateMoodImage("a dark forest", mockFetch);
    expect(result).toBeNull();
  });

  it("returns null when prediction status is failed", async () => {
    const mockFetch = asFetch(async () =>
      new Response(JSON.stringify({ status: "failed" }), { status: 200 }),
    );

    const result = await generateMoodImage("a dark forest", mockFetch);
    expect(result).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    const mockFetch = asFetch(async () => {
      throw new Error("network error");
    });
    const result = await generateMoodImage("a dark forest", mockFetch);
    expect(result).toBeNull();
  });

  it("returns null when REPLICATE_API_TOKEN is absent", async () => {
    delete process.env.REPLICATE_API_TOKEN;
    const mockFetch = asFetch(async () => new Response("should not be called", { status: 200 }));
    const result = await generateMoodImage("a dark forest", mockFetch);
    expect(result).toBeNull();
  });

  it("uses Token auth header format per Replicate convention (REQ-MOOD-11)", async () => {
    let capturedHeaders: HeadersInit | undefined;
    const mockFetch = asFetch(async (_url: string | URL | Request, init?: RequestInit) => {
      capturedHeaders = init?.headers;
      return new Response(
        JSON.stringify({ status: "succeeded", output: ["https://example.com/img.png"] }),
        { status: 200 },
      );
    });

    await generateMoodImage("test prompt", mockFetch);
    expect(capturedHeaders).toBeDefined();
    const headers = capturedHeaders as Record<string, string>;
    expect(headers.Authorization).toBe("Token test-token");
  });

  it("includes the prompt in the request body", async () => {
    let capturedBody: string | undefined;
    const mockFetch = asFetch(async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = init?.body as string;
      return new Response(
        JSON.stringify({ status: "succeeded", output: ["https://example.com/img.png"] }),
        { status: 200 },
      );
    });

    await generateMoodImage("stormy battlefield", mockFetch);
    expect(capturedBody).toBeDefined();
    const parsed = JSON.parse(capturedBody!);
    expect(parsed.input.prompt).toBe("stormy battlefield");
  });
});
