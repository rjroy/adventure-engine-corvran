/**
 * End-to-End Tests for Message Flow Scenarios
 *
 * Tests additional message flow scenarios that require full browser interaction
 * including theme transitions, error handling, and edge cases.
 *
 * Prerequisites:
 * - Backend running with MOCK_SDK=true
 * - Frontend running on port 5173
 */

import { test, expect } from "@playwright/test";

// Helper to clear localStorage state
async function clearLocalStorage(page: Awaited<ReturnType<typeof import("@playwright/test").Page["context"]>>["pages"][0]) {
  await page.evaluate(() => {
    localStorage.clear();
  });
}

// Helper to start a new adventure and wait for connection
async function startNewAdventure(page: Awaited<ReturnType<typeof import("@playwright/test").Page["context"]>>["pages"][0]) {
  await page.goto("/");
  await clearLocalStorage(page);
  await page.reload();

  // Click "New Adventure" button
  await page.getByRole("button", { name: /new adventure/i }).click();

  // Wait for connected status
  await expect(page.getByTestId("connection-status")).toContainText(
    /connected/i,
    { timeout: 5000 }
  );

  // Wait for input to be enabled
  await expect(page.getByPlaceholder(/what do you do/i)).toBeEnabled({ timeout: 5000 });
}

test.describe("Message Flow E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await clearLocalStorage(page);
    await page.reload();
  });

  /**
   * Test 1: Error Message Display and Dismissal
   * Note: This requires the mock SDK to be configured to return errors
   * Currently skipped as mock SDK doesn't have error triggering capability
   */
  test.skip("error message displays and can be dismissed", async ({ page }) => {
    await startNewAdventure(page);

    // Type a command that would trigger an error (if mock SDK supported it)
    const input = page.getByPlaceholder(/what do you do/i);
    await input.fill("trigger_error_command");
    await input.press("Enter");

    // Error message should appear
    await expect(page.getByTestId("error-message")).toBeVisible({ timeout: 10000 });

    // After successful response, error should clear
    await input.fill("look around");
    await input.press("Enter");

    await expect(page.getByTestId("error-message")).not.toBeVisible({ timeout: 10000 });
  });

  /**
   * Test 2: Input Keyboard Interaction
   * Verifies real focus/blur behavior
   */
  test("input field keyboard interaction works correctly", async ({ page }) => {
    await startNewAdventure(page);

    const input = page.getByPlaceholder(/what do you do/i);

    // Type a command
    await input.focus();
    await expect(input).toBeFocused();

    await input.fill("look around");
    expect(await input.inputValue()).toBe("look around");

    // Press Enter to submit
    await input.press("Enter");

    // Input should be cleared after submission
    await expect(input).toHaveValue("");

    // Player input should appear in narrative
    await expect(page.getByTestId("narrative-log")).toContainText("look around", { timeout: 5000 });
  });

  /**
   * Test 3: Streaming Response Progressive Display
   * Verifies streaming appears progressively
   */
  test("streaming response appears progressively", async ({ page }) => {
    await startNewAdventure(page);

    const input = page.getByPlaceholder(/what do you do/i);
    await input.fill("tell me a story");
    await input.press("Enter");

    // Wait for streaming to start (input becomes disabled)
    await expect(input).toHaveAttribute("placeholder", /waiting for response/i, { timeout: 5000 });

    // Wait for narrative log to have content
    const narrativeLog = page.getByTestId("narrative-log");
    await expect(narrativeLog).toContainText(/./); // Any content

    // Wait for streaming to end (input becomes enabled again)
    await expect(input).toHaveAttribute("placeholder", /what do you do/i, { timeout: 30000 });

    // Narrative should contain the response
    await expect(narrativeLog).not.toBeEmpty();
  });

  /**
   * Test 4: Multiple Rapid Inputs
   * Verifies the system handles rapid input gracefully
   */
  test("handles multiple inputs in sequence", async ({ page }) => {
    await startNewAdventure(page);

    const input = page.getByPlaceholder(/what do you do/i);

    // First input
    await input.fill("first command");
    await input.press("Enter");

    // Wait for response to complete
    await expect(input).toHaveAttribute("placeholder", /what do you do/i, { timeout: 30000 });

    // Second input
    await input.fill("second command");
    await input.press("Enter");

    // Wait for response to complete
    await expect(input).toHaveAttribute("placeholder", /what do you do/i, { timeout: 30000 });

    // Both inputs should be in narrative
    const narrativeLog = page.getByTestId("narrative-log");
    await expect(narrativeLog).toContainText("first command");
    await expect(narrativeLog).toContainText("second command");
  });

  /**
   * Test 5: Connection Status Updates
   * Verifies connection status is displayed correctly
   */
  test("connection status updates correctly", async ({ page }) => {
    await startNewAdventure(page);

    // Should show connected
    await expect(page.getByTestId("connection-status")).toContainText(/connected/i);

    // The status indicator should be visible
    await expect(page.getByTestId("connection-status")).toBeVisible();
  });

  /**
   * Test 6: Quit Button Returns to Menu
   * Verifies quit functionality
   */
  test("quit button returns to adventure menu", async ({ page }) => {
    await startNewAdventure(page);

    // Click quit button
    await page.getByRole("button", { name: /quit/i }).click();

    // Should be back at adventure menu
    await expect(page.getByText("Adventure Engine of Corvran")).toBeVisible();
    await expect(page.getByRole("button", { name: /new adventure/i })).toBeVisible();
  });

  /**
   * Test 7: Page Refresh Preserves Adventure
   * Verifies localStorage persistence
   */
  test("page refresh preserves current adventure", async ({ page }) => {
    await startNewAdventure(page);

    // Type a command
    const input = page.getByPlaceholder(/what do you do/i);
    await input.fill("look around");
    await input.press("Enter");

    // Wait for response
    await expect(input).toHaveAttribute("placeholder", /what do you do/i, { timeout: 30000 });

    // Get the adventure ID from the header
    const adventureHeader = page.locator(".game-header__subtitle");
    const adventureText = await adventureHeader.textContent();

    // Refresh the page
    await page.reload();

    // Should still be in game view (localStorage has session)
    await expect(page.getByTestId("connection-status")).toBeVisible({ timeout: 5000 });

    // Adventure ID should be the same
    await expect(adventureHeader).toContainText(adventureText?.replace("Adventure: ", "") ?? "");
  });

  /**
   * Test 8: Long Response Handling
   * Verifies long responses are handled correctly
   */
  test("handles long streaming responses", async ({ page }) => {
    await startNewAdventure(page);

    const input = page.getByPlaceholder(/what do you do/i);

    // Request a longer response
    await input.fill("tell me a very long and detailed story about everything");
    await input.press("Enter");

    // Wait for streaming to start
    await expect(input).toHaveAttribute("placeholder", /waiting for response/i, { timeout: 5000 });

    // Wait for streaming to complete (may take longer)
    await expect(input).toHaveAttribute("placeholder", /what do you do/i, { timeout: 60000 });

    // Narrative should have content
    const narrativeLog = page.getByTestId("narrative-log");
    const content = await narrativeLog.textContent();
    expect(content?.length).toBeGreaterThan(100);
  });
});
