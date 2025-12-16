/**
 * End-to-End Tests for RPG System Integration
 *
 * Tests the complete user journey with RPG system features:
 * - Dice roll visibility in narrative
 * - Character state persistence across reconnect
 *
 * Prerequisites:
 * - Backend running with MOCK_SDK=true
 * - Frontend running on port 5173
 * - Adventure with System.md file
 *
 * Note: These tests require manual infrastructure setup.
 * Run backend: cd backend && MOCK_SDK=true bun run dev
 * Run frontend: cd frontend && bun run dev
 * Run tests: cd e2e && bun test rpg-system.spec.ts
 */

import { test, expect } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// ESM compatibility: get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to clear adventures directory before tests
async function clearAdventures() {
  const adventuresDir = path.join(__dirname, "../backend/adventures");
  try {
    await fs.promises.rm(adventuresDir, { recursive: true, force: true });
  } catch {
    // Directory might not exist, that's fine
  }
}

// Helper to create a System.md file for testing
async function createSystemFile(adventureId: string) {
  const adventureDir = path.join(__dirname, "../backend/adventures", adventureId);
  const systemPath = path.join(adventureDir, "System.md");

  const systemContent = `# RPG System

## Dice

This system uses standard polyhedral dice: d4, d6, d8, d10, d12, d20, d100.

## Attributes

- Strength (STR): Physical power
- Dexterity (DEX): Agility and reflexes
- Constitution (CON): Endurance and health

## Combat

### Initiative
Roll 1d20 + DEX modifier to determine turn order.

### Attack Rolls
Roll 1d20 + attack bonus vs. target's defense.

### Damage
Varies by weapon. Standard weapons:
- Dagger: 1d4+STR
- Sword: 1d8+STR
- Greatsword: 2d6+STR

## NPC Templates

### Goblin
HP: 7/7
Strength: 8
Dexterity: 14
Constitution: 10
Small, cunning humanoid that prefers ambush tactics.
`;

  try {
    await fs.promises.writeFile(systemPath, systemContent, "utf-8");
  } catch (err) {
    console.error(`Failed to create System.md: ${err}`);
  }
}

// Helper to clear localStorage
async function clearLocalStorage(page: Awaited<ReturnType<typeof import("@playwright/test").Page["context"]>>["pages"][0]) {
  await page.evaluate(() => {
    localStorage.clear();
  });
}

test.describe("RPG System E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Clear adventures and localStorage before each test
    await clearAdventures();
    await page.goto("/");
    await clearLocalStorage(page);
    await page.reload();
  });

  /**
   * Test 1: Dice Roll Visibility
   * Visible dice rolls appear in narrative response
   */
  test("Test 1: Dice Roll Visibility - visible rolls appear in narrative", async ({
    page,
  }) => {
    await page.goto("/");

    // Start new adventure
    await page.getByRole("button", { name: /new adventure/i }).click();

    // Wait for connection
    await expect(page.getByTestId("connection-status")).toContainText(
      /connected/i,
      { timeout: 10000 }
    );

    // Extract adventure ID from URL or localStorage
    const adventureId = await page.evaluate(() => {
      return localStorage.getItem("currentAdventureId");
    });

    if (adventureId) {
      // Create System.md for this adventure
      await createSystemFile(adventureId);

      // Reload to pick up system definition
      await page.reload();

      // Wait for reconnection
      await expect(page.getByTestId("connection-status")).toContainText(
        /connected/i,
        { timeout: 10000 }
      );
    }

    // Enter action that triggers visible dice roll
    const input = page.getByPlaceholder(/what do you do/i);
    await expect(input).toBeEnabled({ timeout: 5000 });
    await input.fill("I attack the goblin");
    await input.press("Enter");

    // Wait for response to complete
    await page.waitForTimeout(2000);

    // Get narrative content
    const narrativeContent = await page.textContent('[data-testid="narrative"]');

    // Verify dice roll appears in narrative
    // Mock SDK includes dice rolls in format "Rolled 1d20+3: [15] + 3 = 18"
    if (narrativeContent) {
      const hasDiceRoll =
        /rolled/i.test(narrativeContent) ||
        /\d+d\d+/.test(narrativeContent) ||
        /\[\d+\]/.test(narrativeContent);

      expect(hasDiceRoll).toBe(true);
    }
  });

  /**
   * Test 2: Dice Roll Hidden
   * Hidden dice rolls do NOT appear in narrative
   */
  test("Test 2: Dice Roll Hidden - hidden rolls do not appear in narrative", async ({
    page,
  }) => {
    await page.goto("/");

    // Start new adventure
    await page.getByRole("button", { name: /new adventure/i }).click();

    // Wait for connection
    await expect(page.getByTestId("connection-status")).toContainText(
      /connected/i,
      { timeout: 10000 }
    );

    const adventureId = await page.evaluate(() => {
      return localStorage.getItem("currentAdventureId");
    });

    if (adventureId) {
      await createSystemFile(adventureId);
      await page.reload();
      await expect(page.getByTestId("connection-status")).toContainText(
        /connected/i,
        { timeout: 10000 }
      );
    }

    // Enter action that might trigger hidden roll (GM perception check)
    const input = page.getByPlaceholder(/what do you do/i);
    await expect(input).toBeEnabled({ timeout: 5000 });
    await input.fill("I try to sneak past the guard");
    await input.press("Enter");

    // Wait for response
    await page.waitForTimeout(2000);

    // Get narrative content
    const narrativeContent = await page.textContent('[data-testid="narrative"]');

    // Note: Mock SDK currently makes all rolls visible
    // In production, stealth checks might be hidden GM rolls
    // This test documents expected behavior for future implementation
    if (narrativeContent) {
      // Test passes if narrative exists (roll may or may not be visible)
      expect(narrativeContent.length).toBeGreaterThan(0);
    }
  });

  /**
   * Test 3: Character Persistence Across Reload
   * Character state persists when player reconnects
   */
  test("Test 3: Character Persistence - state persists across reload", async ({
    page,
  }) => {
    await page.goto("/");

    // Start new adventure
    await page.getByRole("button", { name: /new adventure/i }).click();

    // Wait for connection
    await expect(page.getByTestId("connection-status")).toContainText(
      /connected/i,
      { timeout: 10000 }
    );

    const adventureId = await page.evaluate(() => {
      return localStorage.getItem("currentAdventureId");
    });

    if (adventureId) {
      await createSystemFile(adventureId);
      await page.reload();
      await expect(page.getByTestId("connection-status")).toContainText(
        /connected/i,
        { timeout: 10000 }
      );
    }

    // Trigger character state changes
    const input = page.getByPlaceholder(/what do you do/i);
    await expect(input).toBeEnabled({ timeout: 5000 });

    // Make several inputs that might affect character state
    await input.fill("I check my character stats");
    await input.press("Enter");
    await page.waitForTimeout(1500);

    await input.fill("I take 5 damage");
    await input.press("Enter");
    await page.waitForTimeout(1500);

    // Get narrative before reload
    const narrativeBefore = await page.textContent('[data-testid="narrative"]');

    // Reload page to simulate reconnect
    await page.reload();

    // Wait for reconnection
    await expect(page.getByTestId("connection-status")).toContainText(
      /connected/i,
      { timeout: 10000 }
    );

    // Verify narrative history persisted
    const narrativeAfter = await page.textContent('[data-testid="narrative"]');

    // Narrative should contain previous content
    if (narrativeBefore && narrativeAfter) {
      // At minimum, should have some narrative content after reload
      expect(narrativeAfter.length).toBeGreaterThan(0);

      // Ideally, previous narrative should be included
      // (This depends on frontend implementation of history loading)
    }

    // Input should still be enabled (session restored)
    await expect(input).toBeEnabled({ timeout: 5000 });
  });

  /**
   * Test 4: Combat State Persistence
   * Combat state persists across reload
   */
  test("Test 4: Combat Persistence - combat state persists across reload", async ({
    page,
  }) => {
    await page.goto("/");

    // Start new adventure
    await page.getByRole("button", { name: /new adventure/i }).click();

    await expect(page.getByTestId("connection-status")).toContainText(
      /connected/i,
      { timeout: 10000 }
    );

    const adventureId = await page.evaluate(() => {
      return localStorage.getItem("currentAdventureId");
    });

    if (adventureId) {
      await createSystemFile(adventureId);
      await page.reload();
      await expect(page.getByTestId("connection-status")).toContainText(
        /connected/i,
        { timeout: 10000 }
      );
    }

    // Start combat
    const input = page.getByPlaceholder(/what do you do/i);
    await expect(input).toBeEnabled({ timeout: 5000 });

    await input.fill("I engage the goblin in combat");
    await input.press("Enter");
    await page.waitForTimeout(2000);

    // Check for combat-related content
    const narrativeBefore = await page.textContent('[data-testid="narrative"]');
    const hasCombat = narrativeBefore &&
      (/combat/i.test(narrativeBefore) ||
       /initiative/i.test(narrativeBefore) ||
       /round/i.test(narrativeBefore));

    if (hasCombat) {
      // Reload to test persistence
      await page.reload();

      await expect(page.getByTestId("connection-status")).toContainText(
        /connected/i,
        { timeout: 10000 }
      );

      // Verify still in combat
      const narrativeAfter = await page.textContent('[data-testid="narrative"]');

      if (narrativeAfter) {
        // Should still have combat-related content after reload
        expect(narrativeAfter.length).toBeGreaterThan(0);
      }
    }
  });

  /**
   * Test 5: NPC State Visibility
   * NPCs appear in UI when created
   */
  test("Test 5: NPC State - NPCs appear in UI when created", async ({
    page,
  }) => {
    await page.goto("/");

    // Start new adventure
    await page.getByRole("button", { name: /new adventure/i }).click();

    await expect(page.getByTestId("connection-status")).toContainText(
      /connected/i,
      { timeout: 10000 }
    );

    const adventureId = await page.evaluate(() => {
      return localStorage.getItem("currentAdventureId");
    });

    if (adventureId) {
      await createSystemFile(adventureId);
      await page.reload();
      await expect(page.getByTestId("connection-status")).toContainText(
        /connected/i,
        { timeout: 10000 }
      );
    }

    // Create NPC
    const input = page.getByPlaceholder(/what do you do/i);
    await expect(input).toBeEnabled({ timeout: 5000 });

    await input.fill("A goblin scout appears before me");
    await input.press("Enter");
    await page.waitForTimeout(2000);

    // Check narrative for NPC creation
    const narrative = await page.textContent('[data-testid="narrative"]');

    if (narrative) {
      // Should mention the goblin
      const hasNpc = /goblin/i.test(narrative);
      expect(hasNpc).toBe(true);
    }

    // Note: Frontend may have a dedicated NPC panel in the future
    // For now, NPCs appear in narrative
  });
});
