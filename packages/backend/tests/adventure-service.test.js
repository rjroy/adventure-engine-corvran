import { describe, test, expect } from "bun:test";
import { createAdventureService } from "../src/services/adventure-service.js";
import { createMockFileOps } from "./helpers/mock-file-ops.js";
const ADVENTURES_ROOT = "/test/adventures";
describe("adventureExists", () => {
    test("rejects IDs with /", () => {
        const service = createAdventureService({
            fileOps: createMockFileOps(),
            adventuresPath: ADVENTURES_ROOT,
        });
        expect(service.adventureExists("../etc/passwd")).toBe(false);
    });
    test("rejects IDs with ..", () => {
        const service = createAdventureService({
            fileOps: createMockFileOps(),
            adventuresPath: ADVENTURES_ROOT,
        });
        expect(service.adventureExists("foo/../../bar")).toBe(false);
    });
    test("accepts valid IDs", () => {
        const service = createAdventureService({
            fileOps: createMockFileOps(),
            adventuresPath: ADVENTURES_ROOT,
        });
        expect(service.adventureExists("lost-mines")).toBe(true);
    });
});
describe("listAdventures", () => {
    test("returns empty array when no adventures exist", async () => {
        const service = createAdventureService({
            fileOps: createMockFileOps(),
            adventuresPath: ADVENTURES_ROOT,
        });
        const result = await service.listAdventures();
        expect(result).toEqual([]);
    });
    test("discovers adventures with various file combinations", async () => {
        const files = {
            // full-adventure has all three files
            [`${ADVENTURES_ROOT}/full-adventure/character.md`]: "# Character",
            [`${ADVENTURES_ROOT}/full-adventure/world.md`]: "# World",
            [`${ADVENTURES_ROOT}/full-adventure/history.md`]: "# History",
            // new-adventure has character and world, no history
            [`${ADVENTURES_ROOT}/new-adventure/character.md`]: "# Char",
            [`${ADVENTURES_ROOT}/new-adventure/world.md`]: "# World",
            // bare-adventure has nothing (just needs a marker file for directory detection)
            [`${ADVENTURES_ROOT}/bare-adventure/.keep`]: "",
        };
        const service = createAdventureService({
            fileOps: createMockFileOps(files),
            adventuresPath: ADVENTURES_ROOT,
        });
        const result = await service.listAdventures();
        expect(result).toHaveLength(3);
        const full = result.find((a) => a.id === "full-adventure");
        expect(full).toEqual({
            id: "full-adventure",
            name: "full-adventure",
            hasCharacter: true,
            hasWorld: true,
            hasHistory: true,
        });
        const newAdv = result.find((a) => a.id === "new-adventure");
        expect(newAdv).toEqual({
            id: "new-adventure",
            name: "new-adventure",
            hasCharacter: true,
            hasWorld: true,
            hasHistory: false,
        });
        const bare = result.find((a) => a.id === "bare-adventure");
        expect(bare).toEqual({
            id: "bare-adventure",
            name: "bare-adventure",
            hasCharacter: false,
            hasWorld: false,
            hasHistory: false,
        });
    });
});
describe("getAdventure", () => {
    test("returns detail with file contents", async () => {
        const files = {
            [`${ADVENTURES_ROOT}/my-quest/character.md`]: "Brave hero",
            [`${ADVENTURES_ROOT}/my-quest/world.md`]: "Dark forest",
        };
        const service = createAdventureService({
            fileOps: createMockFileOps(files),
            adventuresPath: ADVENTURES_ROOT,
        });
        const result = await service.getAdventure("my-quest");
        expect(result).toEqual({
            id: "my-quest",
            name: "my-quest",
            character: "Brave hero",
            world: "Dark forest",
            hasHistory: false,
        });
    });
    test("returns nulls for missing files", async () => {
        const files = {
            [`${ADVENTURES_ROOT}/empty-quest/.keep`]: "",
        };
        const service = createAdventureService({
            fileOps: createMockFileOps(files),
            adventuresPath: ADVENTURES_ROOT,
        });
        const result = await service.getAdventure("empty-quest");
        expect(result).toEqual({
            id: "empty-quest",
            name: "empty-quest",
            character: null,
            world: null,
            hasHistory: false,
        });
    });
    test("returns null for nonexistent adventure", async () => {
        const service = createAdventureService({
            fileOps: createMockFileOps(),
            adventuresPath: ADVENTURES_ROOT,
        });
        const result = await service.getAdventure("does-not-exist");
        expect(result).toBeNull();
    });
    test("returns null for traversal attempt", async () => {
        const service = createAdventureService({
            fileOps: createMockFileOps(),
            adventuresPath: ADVENTURES_ROOT,
        });
        const result = await service.getAdventure("../etc/passwd");
        expect(result).toBeNull();
    });
});
describe("getHistory", () => {
    test("returns content when history exists", async () => {
        const files = {
            [`${ADVENTURES_ROOT}/quest/history.md`]: "**Player:** Hello\n\n**GM:** Welcome",
        };
        const service = createAdventureService({
            fileOps: createMockFileOps(files),
            adventuresPath: ADVENTURES_ROOT,
        });
        const result = await service.getHistory("quest");
        expect(result).toEqual({
            exists: true,
            history: "**Player:** Hello\n\n**GM:** Welcome",
        });
    });
    test("returns exists:false when no history", async () => {
        const files = {
            [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero",
        };
        const service = createAdventureService({
            fileOps: createMockFileOps(files),
            adventuresPath: ADVENTURES_ROOT,
        });
        const result = await service.getHistory("quest");
        expect(result).toEqual({ exists: false, history: null });
    });
    test("returns exists:false for invalid ID", async () => {
        const service = createAdventureService({
            fileOps: createMockFileOps(),
            adventuresPath: ADVENTURES_ROOT,
        });
        const result = await service.getHistory("../etc/passwd");
        expect(result).toEqual({ exists: false, history: null });
    });
});
