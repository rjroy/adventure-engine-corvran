import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { resolve } from "path";
import { unlinkSync, existsSync, mkdirSync, writeFileSync, rmSync } from "fs";

/**
 * Integration test: starts the real daemon on a temp socket, sends HTTP
 * requests through it, and verifies responses for the full backend chain.
 *
 * This does NOT start the Next.js proxy (that requires the full Next.js server).
 * Instead it tests the daemon directly via Unix socket fetch, which validates
 * the same code path the proxy uses.
 */

const TEST_SOCKET = `/tmp/claude-1000/integration-test-${Date.now()}.sock`;
const TEST_ADVENTURES = `/tmp/claude-1000/test-adventures-${Date.now()}`;

let daemonProcess: ReturnType<typeof Bun.spawn>;

beforeAll(async () => {
  // Create test adventure directory
  mkdirSync(`${TEST_ADVENTURES}/test-adventure`, { recursive: true });
  writeFileSync(
    `${TEST_ADVENTURES}/test-adventure/character.md`,
    "# Test Character\nA brave warrior."
  );
  writeFileSync(
    `${TEST_ADVENTURES}/test-adventure/world.md`,
    "# Test World\nA dangerous land."
  );

  // Create an empty adventure (no files)
  mkdirSync(`${TEST_ADVENTURES}/empty-adventure`, { recursive: true });

  // Start daemon
  const backendEntry = resolve(
    import.meta.dir,
    "../packages/backend/src/index.ts"
  );

  daemonProcess = Bun.spawn(["bun", "run", backendEntry], {
    env: {
      ...process.env,
      DAEMON_SOCKET: TEST_SOCKET,
      ADVENTURES_PATH: TEST_ADVENTURES,
    },
    stdout: "pipe",
    stderr: "pipe",
  });

  // Wait for socket to appear (daemon needs a moment to start)
  const maxWait = 5000;
  const start = Date.now();
  while (!existsSync(TEST_SOCKET) && Date.now() - start < maxWait) {
    await Bun.sleep(100);
  }

  if (!existsSync(TEST_SOCKET)) {
    throw new Error("Daemon did not start within timeout");
  }
});

afterAll(() => {
  if (daemonProcess) {
    daemonProcess.kill();
  }
  try {
    unlinkSync(TEST_SOCKET);
  } catch {
    // Already cleaned up
  }
  try {
    rmSync(TEST_ADVENTURES, { recursive: true, force: true });
  } catch {
    // Cleanup best-effort
  }
});

describe("Daemon integration", () => {
  test("GET /health returns ok", async () => {
    const res = await fetch("http://localhost/health", {
      unix: TEST_SOCKET,
    } as RequestInit);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
  });

  test("GET /adventures lists discovered adventures", async () => {
    const res = await fetch("http://localhost/adventures", {
      unix: TEST_SOCKET,
    } as RequestInit);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.adventures).toBeDefined();
    expect(Array.isArray(data.adventures)).toBe(true);

    const ids = data.adventures.map((a: { id: string }) => a.id);
    expect(ids).toContain("test-adventure");
    expect(ids).toContain("empty-adventure");
  });

  test("GET /adventures/:id returns adventure detail", async () => {
    const res = await fetch("http://localhost/adventures/test-adventure", {
      unix: TEST_SOCKET,
    } as RequestInit);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("test-adventure");
    expect(data.character).toContain("Test Character");
    expect(data.world).toContain("Test World");
  });

  test("GET /adventures/:id returns null files for empty adventure", async () => {
    const res = await fetch("http://localhost/adventures/empty-adventure", {
      unix: TEST_SOCKET,
    } as RequestInit);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("empty-adventure");
    expect(data.character).toBeNull();
    expect(data.world).toBeNull();
  });

  test("GET /adventures/:id returns 404 for nonexistent adventure", async () => {
    const res = await fetch("http://localhost/adventures/nonexistent", {
      unix: TEST_SOCKET,
    } as RequestInit);

    expect(res.status).toBe(404);
  });

  test("GET /adventures/:id/history returns empty for new adventure", async () => {
    const res = await fetch(
      "http://localhost/adventures/test-adventure/history",
      { unix: TEST_SOCKET } as RequestInit
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.exists).toBe(false);
    expect(data.history).toBeNull();
  });

  test("GET /help returns operations registry", async () => {
    const res = await fetch("http://localhost/help", {
      unix: TEST_SOCKET,
    } as RequestInit);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.operations).toBeDefined();
  });

  test("rejects path traversal attempts", async () => {
    // URL normalization collapses "../" before the request reaches the daemon,
    // so we use an ID containing ".." which the daemon's validation catches.
    const res = await fetch("http://localhost/adventures/..%2Fetc%2Fpasswd", {
      unix: TEST_SOCKET,
    } as RequestInit);

    // The daemon should reject this with 400 (traversal) or 404 (not found)
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
