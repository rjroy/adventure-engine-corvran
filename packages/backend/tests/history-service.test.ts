import { describe, test, expect } from "bun:test";
import { createHistoryService } from "../src/services/history-service.js";
import { createMockFileOps } from "./helpers/mock-file-ops.js";

const ADVENTURE_PATH = "/test/adventures/quest";

describe("history-service", () => {
  test("appendPlayerMessage creates file and writes formatted entry", async () => {
    const fileOps = createMockFileOps();
    const service = createHistoryService({ fileOps });

    await service.appendPlayerMessage(ADVENTURE_PATH, "I search the room.");

    const store = fileOps.getStore();
    const content = store.get(`${ADVENTURE_PATH}/history.md`);
    expect(content).toBe("**Player:** I search the room.\n\n");
  });

  test("appendGMResponse appends formatted entry", async () => {
    const fileOps = createMockFileOps();
    const service = createHistoryService({ fileOps });

    await service.appendPlayerMessage(ADVENTURE_PATH, "Hello");
    await service.appendGMResponse(ADVENTURE_PATH, "Welcome, adventurer!");

    const store = fileOps.getStore();
    const content = store.get(`${ADVENTURE_PATH}/history.md`);
    expect(content).toBe(
      "**Player:** Hello\n\n**GM:** Welcome, adventurer!\n\n"
    );
  });

  test("two full exchanges produce correct format and ordering", async () => {
    const fileOps = createMockFileOps();
    const service = createHistoryService({ fileOps });

    await service.appendPlayerMessage(ADVENTURE_PATH, "I open the door.");
    await service.appendGMResponse(ADVENTURE_PATH, "The door creaks open.");
    await service.appendPlayerMessage(ADVENTURE_PATH, "I peek inside.");
    await service.appendGMResponse(ADVENTURE_PATH, "You see a dark room.");

    const content = fileOps.getStore().get(`${ADVENTURE_PATH}/history.md`);
    expect(content).toBe(
      "**Player:** I open the door.\n\n" +
      "**GM:** The door creaks open.\n\n" +
      "**Player:** I peek inside.\n\n" +
      "**GM:** You see a dark room.\n\n"
    );
  });

  test("readHistory returns null when no history file exists", async () => {
    const fileOps = createMockFileOps();
    const service = createHistoryService({ fileOps });

    const result = await service.readHistory(ADVENTURE_PATH);
    expect(result).toBeNull();
  });

  test("readHistory returns content when history file exists", async () => {
    const fileOps = createMockFileOps({
      [`${ADVENTURE_PATH}/history.md`]: "**Player:** Hi\n\n**GM:** Hello\n\n",
    });
    const service = createHistoryService({ fileOps });

    const result = await service.readHistory(ADVENTURE_PATH);
    expect(result).toBe("**Player:** Hi\n\n**GM:** Hello\n\n");
  });

  test("fresh file read reflects external edits (REQ-MVP-17)", async () => {
    const fileOps = createMockFileOps({
      [`${ADVENTURE_PATH}/history.md`]: "**Player:** First\n\n",
    });
    const service = createHistoryService({ fileOps });

    const first = await service.readHistory(ADVENTURE_PATH);
    expect(first).toBe("**Player:** First\n\n");

    // Simulate external edit
    fileOps.getStore().set(
      `${ADVENTURE_PATH}/history.md`,
      "**Player:** Edited\n\n"
    );

    const second = await service.readHistory(ADVENTURE_PATH);
    expect(second).toBe("**Player:** Edited\n\n");
  });
});
