// Panel Manager Service Tests
// Unit tests for panel validation and state management

import { describe, test, expect, beforeEach } from "bun:test";
import {
  PanelManager,
  PanelErrors,
  MAX_PANELS,
  MAX_CONTENT_BYTES,
  MAX_ID_LENGTH,
  type CreatePanelInput,
} from "../../src/services/panel-manager";

describe("PanelManager", () => {
  let manager: PanelManager;

  beforeEach(() => {
    manager = new PanelManager();
  });

  describe("create()", () => {
    test("creates panel with valid input", () => {
      const input: CreatePanelInput = {
        id: "weather",
        title: "Weather",
        content: "Sunny, 72F",
        position: "sidebar",
        persistent: true,
      };

      const result = manager.create(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("weather");
        expect(result.data.title).toBe("Weather");
        expect(result.data.content).toBe("Sunny, 72F");
        expect(result.data.position).toBe("sidebar");
        expect(result.data.persistent).toBe(true);
        expect(result.data.createdAt).toBeDefined();
      }
    });

    test("creates panel with overlay coordinates", () => {
      const input: CreatePanelInput = {
        id: "alert",
        title: "Alert",
        content: "Danger!",
        position: "overlay",
        persistent: false,
        x: 50,
        y: 25,
      };

      const result = manager.create(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.x).toBe(50);
        expect(result.data.y).toBe(25);
      }
    });

    test("creates panel without optional coordinates", () => {
      const input: CreatePanelInput = {
        id: "status",
        title: "Status",
        content: "OK",
        position: "header",
        persistent: false,
      };

      const result = manager.create(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.x).toBeUndefined();
        expect(result.data.y).toBeUndefined();
      }
    });

    test("sets createdAt timestamp for ordering (REQ-F-22)", () => {
      const before = new Date().toISOString();

      const result = manager.create({
        id: "test",
        title: "Test",
        content: "content",
        position: "sidebar",
        persistent: false,
      });

      const after = new Date().toISOString();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.createdAt >= before).toBe(true);
        expect(result.data.createdAt <= after).toBe(true);
      }
    });

    describe("ID validation", () => {
      test("rejects empty ID", () => {
        const result = manager.create({
          id: "",
          title: "Test",
          content: "content",
          position: "sidebar",
          persistent: false,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe(PanelErrors.INVALID_ID_FORMAT);
        }
      });

      test("rejects ID longer than 32 characters", () => {
        const longId = "a".repeat(MAX_ID_LENGTH + 1);
        const result = manager.create({
          id: longId,
          title: "Test",
          content: "content",
          position: "sidebar",
          persistent: false,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe(PanelErrors.INVALID_ID_FORMAT);
        }
      });

      test("accepts ID at exactly 32 characters", () => {
        const maxId = "a".repeat(MAX_ID_LENGTH);
        const result = manager.create({
          id: maxId,
          title: "Test",
          content: "content",
          position: "sidebar",
          persistent: false,
        });

        expect(result.success).toBe(true);
      });

      test("rejects ID with special characters", () => {
        const invalidIds = [
          "panel_1",
          "panel.1",
          "panel 1",
          "panel@1",
          "panel!1",
          "panel#1",
          "panel$1",
        ];

        for (const id of invalidIds) {
          const result = manager.create({
            id,
            title: "Test",
            content: "content",
            position: "sidebar",
            persistent: false,
          });

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error).toBe(PanelErrors.INVALID_ID_FORMAT);
          }
        }
      });

      test("accepts valid ID formats", () => {
        const validIds = [
          "weather",
          "WEATHER",
          "Weather",
          "panel-1",
          "panel-one-two",
          "123",
          "a-1-b-2",
          "A-B-C",
        ];

        for (const id of validIds) {
          // Use fresh manager for each to avoid duplicate errors
          const testManager = new PanelManager();
          const result = testManager.create({
            id,
            title: "Test",
            content: "content",
            position: "sidebar",
            persistent: false,
          });

          expect(result.success).toBe(true);
        }
      });
    });

    describe("duplicate ID validation (REQ-F-15)", () => {
      test("rejects duplicate panel ID", () => {
        // Create first panel
        manager.create({
          id: "weather",
          title: "Weather",
          content: "Sunny",
          position: "sidebar",
          persistent: false,
        });

        // Attempt to create panel with same ID
        const result = manager.create({
          id: "weather",
          title: "Different Title",
          content: "Different content",
          position: "header",
          persistent: true,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe(PanelErrors.DUPLICATE_ID);
        }
      });

      test("allows different IDs", () => {
        manager.create({
          id: "weather-1",
          title: "Weather",
          content: "Sunny",
          position: "sidebar",
          persistent: false,
        });

        const result = manager.create({
          id: "weather-2",
          title: "Weather",
          content: "Rainy",
          position: "sidebar",
          persistent: false,
        });

        expect(result.success).toBe(true);
      });
    });

    describe("panel limit validation (REQ-F-14)", () => {
      test("rejects creation when at maximum panels", () => {
        // Create maximum panels
        for (let i = 0; i < MAX_PANELS; i++) {
          const result = manager.create({
            id: `panel-${i}`,
            title: `Panel ${i}`,
            content: "content",
            position: "sidebar",
            persistent: false,
          });
          expect(result.success).toBe(true);
        }

        // Attempt to create one more
        const result = manager.create({
          id: "panel-overflow",
          title: "Overflow",
          content: "content",
          position: "sidebar",
          persistent: false,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe(PanelErrors.LIMIT_EXCEEDED);
        }
      });

      test("allows creation after dismissing a panel", () => {
        // Create maximum panels
        for (let i = 0; i < MAX_PANELS; i++) {
          manager.create({
            id: `panel-${i}`,
            title: `Panel ${i}`,
            content: "content",
            position: "sidebar",
            persistent: false,
          });
        }

        // Dismiss one
        manager.dismiss("panel-0");

        // Should now allow creation
        const result = manager.create({
          id: "panel-new",
          title: "New Panel",
          content: "content",
          position: "sidebar",
          persistent: false,
        });

        expect(result.success).toBe(true);
      });

      test("maximum is exactly 5 panels", () => {
        expect(MAX_PANELS).toBe(5);
      });
    });

    describe("content size validation (REQ-F-21)", () => {
      test("rejects content exceeding 2KB", () => {
        // Create content larger than 2KB (2048 bytes)
        const largeContent = "a".repeat(MAX_CONTENT_BYTES + 1);

        const result = manager.create({
          id: "large-panel",
          title: "Large",
          content: largeContent,
          position: "sidebar",
          persistent: false,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe(PanelErrors.CONTENT_TOO_LARGE);
        }
      });

      test("accepts content at exactly 2KB", () => {
        const maxContent = "a".repeat(MAX_CONTENT_BYTES);

        const result = manager.create({
          id: "max-panel",
          title: "Max",
          content: maxContent,
          position: "sidebar",
          persistent: false,
        });

        expect(result.success).toBe(true);
      });

      test("uses byte length not string length for UTF-8", () => {
        // Each emoji is 4 bytes in UTF-8
        // 512 emojis = 2048 bytes = exactly 2KB
        const emojiContent = "\u{1F600}".repeat(512);
        expect(Buffer.byteLength(emojiContent, "utf8")).toBe(2048);

        const resultExact = manager.create({
          id: "emoji-exact",
          title: "Emoji",
          content: emojiContent,
          position: "sidebar",
          persistent: false,
        });
        expect(resultExact.success).toBe(true);

        // 513 emojis = 2052 bytes > 2KB
        const overContent = "\u{1F600}".repeat(513);
        expect(Buffer.byteLength(overContent, "utf8")).toBe(2052);

        const testManager = new PanelManager();
        const resultOver = testManager.create({
          id: "emoji-over",
          title: "Emoji",
          content: overContent,
          position: "sidebar",
          persistent: false,
        });
        expect(resultOver.success).toBe(false);
      });

      test("accepts empty content", () => {
        const result = manager.create({
          id: "empty-panel",
          title: "Empty",
          content: "",
          position: "sidebar",
          persistent: false,
        });

        expect(result.success).toBe(true);
      });

      test("maximum is exactly 2048 bytes", () => {
        expect(MAX_CONTENT_BYTES).toBe(2048);
      });
    });

    describe("position validation", () => {
      test("accepts valid positions", () => {
        const positions = ["sidebar", "header", "overlay"] as const;

        for (const position of positions) {
          const testManager = new PanelManager();
          const result = testManager.create({
            id: "test-panel",
            title: "Test",
            content: "content",
            position,
            persistent: false,
          });

          expect(result.success).toBe(true);
        }
      });

      test("rejects invalid position", () => {
        const result = manager.create({
          id: "test-panel",
          title: "Test",
          content: "content",
          position: "footer" as "sidebar",
          persistent: false,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe(PanelErrors.INVALID_POSITION);
        }
      });
    });
  });

  describe("update()", () => {
    test("updates panel content", () => {
      manager.create({
        id: "weather",
        title: "Weather",
        content: "Sunny, 72F",
        position: "sidebar",
        persistent: true,
      });

      const result = manager.update({
        id: "weather",
        content: "Rainy, 55F",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe("Rainy, 55F");
        // Other fields should be unchanged
        expect(result.data.title).toBe("Weather");
        expect(result.data.position).toBe("sidebar");
        expect(result.data.persistent).toBe(true);
      }
    });

    test("preserves createdAt timestamp on update", () => {
      manager.create({
        id: "weather",
        title: "Weather",
        content: "Sunny",
        position: "sidebar",
        persistent: false,
      });

      const originalPanel = manager.get("weather");
      const originalCreatedAt = originalPanel?.createdAt;

      // Wait a tiny bit to ensure time difference
      const result = manager.update({
        id: "weather",
        content: "Rainy",
      });

      expect(result.success).toBe(true);
      if (result.success && originalCreatedAt) {
        expect(result.data.createdAt).toBe(originalCreatedAt);
      }
    });

    test("returns error for non-existent panel (REQ-F-20)", () => {
      const result = manager.update({
        id: "nonexistent",
        content: "new content",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(PanelErrors.PANEL_NOT_FOUND);
      }
    });

    test("validates content size on update (REQ-F-21)", () => {
      manager.create({
        id: "weather",
        title: "Weather",
        content: "Sunny",
        position: "sidebar",
        persistent: false,
      });

      const largeContent = "a".repeat(MAX_CONTENT_BYTES + 1);
      const result = manager.update({
        id: "weather",
        content: largeContent,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(PanelErrors.CONTENT_TOO_LARGE);
      }
    });

    test("validates ID format on update", () => {
      const result = manager.update({
        id: "invalid_id",
        content: "content",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(PanelErrors.INVALID_ID_FORMAT);
      }
    });
  });

  describe("dismiss()", () => {
    test("removes panel by ID", () => {
      manager.create({
        id: "weather",
        title: "Weather",
        content: "Sunny",
        position: "sidebar",
        persistent: false,
      });

      const result = manager.dismiss("weather");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("weather");
      }

      // Verify panel is removed
      expect(manager.get("weather")).toBeUndefined();
      expect(manager.count()).toBe(0);
    });

    test("returns error for non-existent panel (REQ-F-20)", () => {
      const result = manager.dismiss("nonexistent");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(PanelErrors.PANEL_NOT_FOUND);
      }
    });

    test("validates ID format on dismiss", () => {
      const result = manager.dismiss("invalid_id");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(PanelErrors.INVALID_ID_FORMAT);
      }
    });

    test("allows dismissing any of multiple panels", () => {
      manager.create({
        id: "panel-1",
        title: "Panel 1",
        content: "content",
        position: "sidebar",
        persistent: false,
      });
      manager.create({
        id: "panel-2",
        title: "Panel 2",
        content: "content",
        position: "sidebar",
        persistent: false,
      });
      manager.create({
        id: "panel-3",
        title: "Panel 3",
        content: "content",
        position: "sidebar",
        persistent: false,
      });

      // Dismiss middle panel
      const result = manager.dismiss("panel-2");

      expect(result.success).toBe(true);
      expect(manager.count()).toBe(2);
      expect(manager.get("panel-1")).toBeDefined();
      expect(manager.get("panel-2")).toBeUndefined();
      expect(manager.get("panel-3")).toBeDefined();
    });
  });

  describe("list()", () => {
    test("returns empty array when no panels", () => {
      const panels = manager.list();
      expect(panels).toEqual([]);
    });

    test("returns all panels", () => {
      manager.create({
        id: "panel-1",
        title: "Panel 1",
        content: "content",
        position: "sidebar",
        persistent: false,
      });
      manager.create({
        id: "panel-2",
        title: "Panel 2",
        content: "content",
        position: "header",
        persistent: true,
      });

      const panels = manager.list();

      expect(panels.length).toBe(2);
      expect(panels.map((p) => p.id)).toContain("panel-1");
      expect(panels.map((p) => p.id)).toContain("panel-2");
    });

    test("returns panels sorted by createdAt (oldest first) (REQ-F-22)", async () => {
      // Create panels with small delays to ensure different timestamps
      manager.create({
        id: "first",
        title: "First",
        content: "content",
        position: "sidebar",
        persistent: false,
      });

      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      manager.create({
        id: "second",
        title: "Second",
        content: "content",
        position: "sidebar",
        persistent: false,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      manager.create({
        id: "third",
        title: "Third",
        content: "content",
        position: "sidebar",
        persistent: false,
      });

      const panels = manager.list();

      expect(panels[0].id).toBe("first");
      expect(panels[1].id).toBe("second");
      expect(panels[2].id).toBe("third");
    });
  });

  describe("getAll()", () => {
    test("returns empty Map when no panels", () => {
      const panels = manager.getAll();
      expect(panels.size).toBe(0);
    });

    test("returns Map of all panels", () => {
      manager.create({
        id: "panel-1",
        title: "Panel 1",
        content: "content",
        position: "sidebar",
        persistent: false,
      });
      manager.create({
        id: "panel-2",
        title: "Panel 2",
        content: "content",
        position: "header",
        persistent: true,
      });

      const panels = manager.getAll();

      expect(panels.size).toBe(2);
      expect(panels.has("panel-1")).toBe(true);
      expect(panels.has("panel-2")).toBe(true);
    });

    test("returns a copy, not the internal Map", () => {
      manager.create({
        id: "panel-1",
        title: "Panel 1",
        content: "content",
        position: "sidebar",
        persistent: false,
      });

      const panels = manager.getAll();
      panels.delete("panel-1");

      // Original should be unchanged
      expect(manager.get("panel-1")).toBeDefined();
    });
  });

  describe("get()", () => {
    test("returns panel by ID", () => {
      manager.create({
        id: "weather",
        title: "Weather",
        content: "Sunny",
        position: "sidebar",
        persistent: true,
      });

      const panel = manager.get("weather");

      expect(panel).toBeDefined();
      expect(panel?.id).toBe("weather");
      expect(panel?.title).toBe("Weather");
    });

    test("returns undefined for non-existent ID", () => {
      const panel = manager.get("nonexistent");
      expect(panel).toBeUndefined();
    });
  });

  describe("count()", () => {
    test("returns 0 when empty", () => {
      expect(manager.count()).toBe(0);
    });

    test("returns correct count", () => {
      manager.create({
        id: "panel-1",
        title: "Panel 1",
        content: "content",
        position: "sidebar",
        persistent: false,
      });
      expect(manager.count()).toBe(1);

      manager.create({
        id: "panel-2",
        title: "Panel 2",
        content: "content",
        position: "header",
        persistent: false,
      });
      expect(manager.count()).toBe(2);

      manager.dismiss("panel-1");
      expect(manager.count()).toBe(1);
    });
  });

  describe("clear()", () => {
    test("removes all panels", () => {
      manager.create({
        id: "panel-1",
        title: "Panel 1",
        content: "content",
        position: "sidebar",
        persistent: false,
      });
      manager.create({
        id: "panel-2",
        title: "Panel 2",
        content: "content",
        position: "header",
        persistent: true,
      });

      expect(manager.count()).toBe(2);

      manager.clear();

      expect(manager.count()).toBe(0);
      expect(manager.list()).toEqual([]);
    });
  });

  describe("getPersistent()", () => {
    test("returns empty array when no persistent panels", () => {
      manager.create({
        id: "panel-1",
        title: "Panel 1",
        content: "content",
        position: "sidebar",
        persistent: false,
      });

      const persistent = manager.getPersistent();
      expect(persistent).toEqual([]);
    });

    test("returns only persistent panels (REQ-F-11, REQ-F-12)", () => {
      manager.create({
        id: "persistent-1",
        title: "Persistent 1",
        content: "content",
        position: "sidebar",
        persistent: true,
      });
      manager.create({
        id: "non-persistent",
        title: "Non-Persistent",
        content: "content",
        position: "header",
        persistent: false,
      });
      manager.create({
        id: "persistent-2",
        title: "Persistent 2",
        content: "content",
        position: "overlay",
        persistent: true,
      });

      const persistent = manager.getPersistent();

      expect(persistent.length).toBe(2);
      expect(persistent.map((p) => p.id)).toContain("persistent-1");
      expect(persistent.map((p) => p.id)).toContain("persistent-2");
      expect(persistent.map((p) => p.id)).not.toContain("non-persistent");
    });

    test("maintains creation order in persistent panels", async () => {
      manager.create({
        id: "persistent-1",
        title: "Persistent 1",
        content: "content",
        position: "sidebar",
        persistent: true,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      manager.create({
        id: "non-persistent",
        title: "Non-Persistent",
        content: "content",
        position: "header",
        persistent: false,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      manager.create({
        id: "persistent-2",
        title: "Persistent 2",
        content: "content",
        position: "overlay",
        persistent: true,
      });

      const persistent = manager.getPersistent();

      expect(persistent[0].id).toBe("persistent-1");
      expect(persistent[1].id).toBe("persistent-2");
    });
  });

  describe("restore()", () => {
    test("restores panels from saved state", () => {
      const savedPanels = [
        {
          id: "weather",
          title: "Weather",
          content: "Sunny",
          position: "sidebar" as const,
          persistent: true,
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "ticker",
          title: "News",
          content: "Breaking news",
          position: "header" as const,
          persistent: true,
          createdAt: "2024-01-01T00:01:00.000Z",
        },
      ];

      const restored = manager.restore(savedPanels);

      expect(restored).toBe(2);
      expect(manager.count()).toBe(2);
      expect(manager.get("weather")).toBeDefined();
      expect(manager.get("ticker")).toBeDefined();
    });

    test("skips panels with invalid IDs", () => {
      const savedPanels = [
        {
          id: "valid-panel",
          title: "Valid",
          content: "content",
          position: "sidebar" as const,
          persistent: true,
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "invalid_panel",
          title: "Invalid",
          content: "content",
          position: "sidebar" as const,
          persistent: true,
          createdAt: "2024-01-01T00:01:00.000Z",
        },
      ];

      const restored = manager.restore(savedPanels);

      expect(restored).toBe(1);
      expect(manager.get("valid-panel")).toBeDefined();
      expect(manager.get("invalid_panel")).toBeUndefined();
    });

    test("skips panels with content too large", () => {
      const savedPanels = [
        {
          id: "valid-panel",
          title: "Valid",
          content: "content",
          position: "sidebar" as const,
          persistent: true,
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "large-panel",
          title: "Large",
          content: "a".repeat(MAX_CONTENT_BYTES + 1),
          position: "sidebar" as const,
          persistent: true,
          createdAt: "2024-01-01T00:01:00.000Z",
        },
      ];

      const restored = manager.restore(savedPanels);

      expect(restored).toBe(1);
      expect(manager.get("valid-panel")).toBeDefined();
      expect(manager.get("large-panel")).toBeUndefined();
    });

    test("skips duplicate IDs", () => {
      // Pre-existing panel
      manager.create({
        id: "existing",
        title: "Existing",
        content: "original",
        position: "sidebar",
        persistent: true,
      });

      const savedPanels = [
        {
          id: "existing",
          title: "Duplicate",
          content: "new content",
          position: "header" as const,
          persistent: true,
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "new-panel",
          title: "New",
          content: "content",
          position: "sidebar" as const,
          persistent: true,
          createdAt: "2024-01-01T00:01:00.000Z",
        },
      ];

      const restored = manager.restore(savedPanels);

      expect(restored).toBe(1);
      // Original should be unchanged
      expect(manager.get("existing")?.content).toBe("original");
      // New panel should be added
      expect(manager.get("new-panel")).toBeDefined();
    });

    test("enforces limit during restore", () => {
      // Pre-existing panels (4 of them)
      for (let i = 0; i < 4; i++) {
        manager.create({
          id: `existing-${i}`,
          title: `Existing ${i}`,
          content: "content",
          position: "sidebar",
          persistent: true,
        });
      }

      // Try to restore 3 more (only 1 should fit)
      const savedPanels = [
        {
          id: "restore-1",
          title: "Restore 1",
          content: "content",
          position: "sidebar" as const,
          persistent: true,
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "restore-2",
          title: "Restore 2",
          content: "content",
          position: "sidebar" as const,
          persistent: true,
          createdAt: "2024-01-01T00:01:00.000Z",
        },
        {
          id: "restore-3",
          title: "Restore 3",
          content: "content",
          position: "sidebar" as const,
          persistent: true,
          createdAt: "2024-01-01T00:02:00.000Z",
        },
      ];

      const restored = manager.restore(savedPanels);

      expect(restored).toBe(1);
      expect(manager.count()).toBe(5);
      expect(manager.get("restore-1")).toBeDefined();
      expect(manager.get("restore-2")).toBeUndefined();
      expect(manager.get("restore-3")).toBeUndefined();
    });

    test("returns 0 when restoring empty array", () => {
      const restored = manager.restore([]);
      expect(restored).toBe(0);
      expect(manager.count()).toBe(0);
    });
  });

  describe("error messages", () => {
    test("duplicate ID error message is descriptive", () => {
      expect(PanelErrors.DUPLICATE_ID).toBe(
        "Panel with ID exists, use update_panel to modify"
      );
    });

    test("limit exceeded error message is descriptive", () => {
      expect(PanelErrors.LIMIT_EXCEEDED).toBe("Maximum 5 panels active");
    });

    test("content too large error message is descriptive", () => {
      expect(PanelErrors.CONTENT_TOO_LARGE).toBe("Content exceeds 2KB limit");
    });

    test("panel not found error message is descriptive", () => {
      expect(PanelErrors.PANEL_NOT_FOUND).toBe("Panel ID not found");
    });

    test("invalid ID format error message is descriptive", () => {
      expect(PanelErrors.INVALID_ID_FORMAT).toBe(
        "Panel ID must be alphanumeric with hyphens only (max 32 chars)"
      );
    });
  });
});
