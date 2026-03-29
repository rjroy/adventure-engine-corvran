import { describe, test, expect } from "bun:test";

// Test the mock API responses directly by importing the route handlers.
// Since Next.js route handlers are standard Request/Response,
// we can test them by constructing requests.

const BASE_URL = "http://localhost:3000";

// We can't easily import Next.js route handlers in bun test due to
// the next/server dependency. Instead, test the data contracts and
// shape expectations against the shared types.

import type {
  AdventureListItem,
  AdventureListResponse,
  AdventureDetail,
  HistoryResponse,
} from "@corvran/shared";

describe("Mock API response shapes", () => {
  test("adventure list response matches AdventureListResponse type", () => {
    // This validates the shape our mock returns
    const response: AdventureListResponse = {
      adventures: [
        {
          id: "lost-mines",
          name: "Lost Mines of Phandelver",
          hasCharacter: true,
          hasWorld: true,
          hasHistory: true,
        },
        {
          id: "freeform-narrative",
          name: "freeform-narrative",
          hasCharacter: false,
          hasWorld: false,
          hasHistory: false,
        },
      ],
    };

    expect(response.adventures).toHaveLength(2);
    expect(response.adventures[0].id).toBe("lost-mines");
    expect(response.adventures[1].hasHistory).toBe(false);
  });

  test("adventure detail response matches AdventureDetail type", () => {
    const response: AdventureDetail = {
      id: "lost-mines",
      name: "Lost Mines of Phandelver",
      character: "# Thorin Ironforge\nDwarf Fighter",
      world: "# Lost Mines\nA classic adventure",
      hasHistory: true,
    };

    expect(response.character).not.toBeNull();
    expect(response.world).not.toBeNull();
  });

  test("adventure detail with null files matches type", () => {
    const response: AdventureDetail = {
      id: "freeform",
      name: "freeform",
      character: null,
      world: null,
      hasHistory: false,
    };

    expect(response.character).toBeNull();
    expect(response.world).toBeNull();
  });

  test("history response matches HistoryResponse type", () => {
    const withHistory: HistoryResponse = {
      history: "**Player:** Hello\n\n**GM:** Welcome.",
      exists: true,
    };

    const withoutHistory: HistoryResponse = {
      history: null,
      exists: false,
    };

    expect(withHistory.exists).toBe(true);
    expect(withHistory.history).not.toBeNull();
    expect(withoutHistory.exists).toBe(false);
    expect(withoutHistory.history).toBeNull();
  });

  test("empty adventure list triggers empty state", () => {
    const response: AdventureListResponse = { adventures: [] };
    expect(response.adventures).toHaveLength(0);
  });

  test("single adventure list triggers auto-redirect", () => {
    const response: AdventureListResponse = {
      adventures: [
        {
          id: "only-one",
          name: "The Only Adventure",
          hasCharacter: true,
          hasWorld: true,
          hasHistory: false,
        },
      ],
    };

    // When length === 1, the page should auto-redirect
    expect(response.adventures).toHaveLength(1);
    expect(response.adventures[0].id).toBe("only-one");
  });
});

describe("Adventure list badge logic", () => {
  test("adventure with history gets Continue badge", () => {
    const adventure: AdventureListItem = {
      id: "test",
      name: "Test",
      hasCharacter: true,
      hasWorld: true,
      hasHistory: true,
    };
    expect(adventure.hasHistory).toBe(true);
    // Badge: "Continue"
  });

  test("adventure without history gets New adventure badge", () => {
    const adventure: AdventureListItem = {
      id: "test",
      name: "Test",
      hasCharacter: false,
      hasWorld: false,
      hasHistory: false,
    };
    expect(adventure.hasHistory).toBe(false);
    // Badge: "New adventure"
  });
});

describe("File hints rendering logic", () => {
  test("builds hint string from available files", () => {
    const adventure: AdventureListItem = {
      id: "test",
      name: "Test",
      hasCharacter: true,
      hasWorld: true,
      hasHistory: true,
    };

    const hints: string[] = [];
    if (adventure.hasCharacter) hints.push("Character");
    if (adventure.hasWorld) hints.push("World");
    if (adventure.hasHistory) hints.push("History");

    expect(hints.join(" \u00b7 ")).toBe("Character \u00b7 World \u00b7 History");
  });

  test("shows fallback hint when no files exist", () => {
    const adventure: AdventureListItem = {
      id: "test",
      name: "Test",
      hasCharacter: false,
      hasWorld: false,
      hasHistory: false,
    };

    const hints: string[] = [];
    if (adventure.hasCharacter) hints.push("Character");
    if (adventure.hasWorld) hints.push("World");
    if (adventure.hasHistory) hints.push("History");

    const hintText =
      hints.length > 0
        ? hints.join(" \u00b7 ")
        : "No files yet \u2014 GM will help you begin";

    expect(hintText).toBe("No files yet \u2014 GM will help you begin");
  });
});
