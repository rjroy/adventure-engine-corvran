/**
 * Unit tests for request logger functionality
 * Tests createRequestLogger for request ID generation and correlation
 */

import { describe, expect, test, beforeEach } from "bun:test";
import { createRequestLogger, _resetRequestCounter } from "../../src/logger";

describe("createRequestLogger", () => {
  beforeEach(() => {
    // Reset counter between tests for predictable IDs
    _resetRequestCounter();
  });

  test("generates unique request IDs", () => {
    const { reqId: reqId1 } = createRequestLogger("conn_1_123");
    const { reqId: reqId2 } = createRequestLogger("conn_1_123");

    expect(reqId1).not.toBe(reqId2);
  });

  test("request ID includes connId", () => {
    const connId = "conn_42_1734567890123";
    const { reqId } = createRequestLogger(connId);

    expect(reqId).toContain(connId);
  });

  test("request ID follows expected format", () => {
    const connId = "conn_1_123";
    const { reqId } = createRequestLogger(connId);

    // Format: req_{connId}_{counter}_{timestamp}
    const pattern = /^req_conn_1_123_\d+_\d+$/;
    expect(reqId).toMatch(pattern);
  });

  test("counter increments sequentially", () => {
    const { reqId: reqId1 } = createRequestLogger("conn_1_123");
    const { reqId: reqId2 } = createRequestLogger("conn_1_123");
    const { reqId: reqId3 } = createRequestLogger("conn_1_123");

    // Extract counter values (4th segment after splitting by _)
    const parts1 = reqId1.split("_");
    const parts2 = reqId2.split("_");
    const parts3 = reqId3.split("_");

    // Counter is the 4th segment (index 3) when connId is "conn_1_123"
    // Full format: req_conn_1_123_counter_timestamp
    // Parts: [req, conn, 1, 123, counter, timestamp]
    const counter1 = parseInt(parts1[4], 10);
    const counter2 = parseInt(parts2[4], 10);
    const counter3 = parseInt(parts3[4], 10);

    expect(counter2).toBe(counter1 + 1);
    expect(counter3).toBe(counter2 + 1);
  });

  test("child logger includes reqId in context", () => {
    const { logger: reqLogger, reqId } = createRequestLogger("conn_1_123");

    // Access the bindings to verify context is set
    const bindings = reqLogger.bindings();
    expect(bindings.reqId).toBe(reqId);
  });

  test("child logger includes connId in context", () => {
    const connId = "conn_42_999";
    const { logger: reqLogger } = createRequestLogger(connId);

    const bindings = reqLogger.bindings();
    expect(bindings.connId).toBe(connId);
  });

  test("child logger includes adventureId when provided", () => {
    const connId = "conn_1_123";
    const adventureId = "abc-123-def-456";
    const { logger: reqLogger } = createRequestLogger(connId, adventureId);

    const bindings = reqLogger.bindings();
    expect(bindings.adventureId).toBe(adventureId);
  });

  test("child logger omits adventureId when not provided", () => {
    const { logger: reqLogger } = createRequestLogger("conn_1_123");

    const bindings = reqLogger.bindings();
    expect(bindings.adventureId).toBeUndefined();
  });

  test("multiple loggers can be created independently", () => {
    const { logger: logger1, reqId: reqId1 } = createRequestLogger(
      "conn_1_100",
      "adventure-1"
    );
    const { logger: logger2, reqId: reqId2 } = createRequestLogger(
      "conn_2_200",
      "adventure-2"
    );

    // Each logger has its own context
    const bindings1 = logger1.bindings();
    const bindings2 = logger2.bindings();

    expect(bindings1.connId).toBe("conn_1_100");
    expect(bindings1.adventureId).toBe("adventure-1");
    expect(bindings1.reqId).toBe(reqId1);

    expect(bindings2.connId).toBe("conn_2_200");
    expect(bindings2.adventureId).toBe("adventure-2");
    expect(bindings2.reqId).toBe(reqId2);
  });

  test("request ID timestamp is recent", () => {
    const before = Date.now();
    const { reqId } = createRequestLogger("conn_1_123");
    const after = Date.now();

    // Extract timestamp (last segment)
    const parts = reqId.split("_");
    const timestamp = parseInt(parts[parts.length - 1], 10);

    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });
});
