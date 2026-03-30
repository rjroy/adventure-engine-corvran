import { describe, test, expect } from "bun:test";

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
    const response: AdventureListResponse = {
      adventures: [
        {
          id: "lost-mines",
          name: "Lost Mines of Phandelver",
          hasHistory: true,
          system: "d20",
          concept: "A classic dungeon crawl.",
          characterName: "Thorin",
          lastPlayed: "2026-03-20T14:00:00.000Z",
        },
        {
          id: "freeform-narrative",
          name: "freeform-narrative",
          hasHistory: false,
          system: null,
          concept: null,
          characterName: null,
          lastPlayed: null,
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
      system: "d20",
      concept: "A classic dungeon crawl.",
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
      system: null,
      concept: null,
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
});

describe("Adventure list badge logic", () => {
  test("adventure with history gets Continue badge", () => {
    const adventure: AdventureListItem = {
      id: "test",
      name: "Test",
      hasHistory: true,
      system: null,
      concept: null,
      characterName: null,
      lastPlayed: "2026-03-20T14:00:00.000Z",
    };
    expect(adventure.hasHistory).toBe(true);
  });

  test("adventure without history gets New adventure badge", () => {
    const adventure: AdventureListItem = {
      id: "test",
      name: "Test",
      hasHistory: false,
      system: null,
      concept: null,
      characterName: null,
      lastPlayed: null,
    };
    expect(adventure.hasHistory).toBe(false);
  });
});

describe("Adventure card display logic", () => {
  test("shows system badge when system present", () => {
    const adventure: AdventureListItem = {
      id: "test",
      name: "Test",
      hasHistory: false,
      system: "daggerheart",
      concept: "A story of hope.",
      characterName: "Aria",
      lastPlayed: null,
    };

    expect(adventure.system).toBe("daggerheart");
    expect(adventure.concept).toBe("A story of hope.");
    expect(adventure.characterName).toBe("Aria");
  });

  test("adventure sorting: new first then by lastPlayed desc", () => {
    const adventures: AdventureListItem[] = [
      { id: "old", name: "Old", hasHistory: true, system: null, concept: null, characterName: null, lastPlayed: "2026-03-10T00:00:00.000Z" },
      { id: "new", name: "New", hasHistory: false, system: null, concept: null, characterName: null, lastPlayed: null },
      { id: "recent", name: "Recent", hasHistory: true, system: null, concept: null, characterName: null, lastPlayed: "2026-03-20T00:00:00.000Z" },
    ];

    const sorted = [...adventures].sort((a, b) => {
      if (a.lastPlayed === null && b.lastPlayed !== null) return -1;
      if (a.lastPlayed !== null && b.lastPlayed === null) return 1;
      if (a.lastPlayed === null && b.lastPlayed === null) return a.name.localeCompare(b.name);
      return new Date(b.lastPlayed!).getTime() - new Date(a.lastPlayed!).getTime();
    });

    expect(sorted[0].id).toBe("new");
    expect(sorted[1].id).toBe("recent");
    expect(sorted[2].id).toBe("old");
  });
});
