import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Adventure Engine E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  fullyParallel: false, // Run tests serially to avoid port conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for E2E with shared server
  reporter: [["html", { open: "never" }], ["list"]],

  // Test timeout: 60 seconds per test
  timeout: 60_000,

  // Assertion timeout: 10 seconds
  expect: {
    timeout: 10_000,
  },

  use: {
    // Base URL for all page.goto calls
    baseURL: "http://localhost:5173",

    // Collect trace on first retry
    trace: "on-first-retry",

    // Screenshot on failure
    screenshot: "only-on-failure",

    // Video on retry
    video: "on-first-retry",
  },

  // Projects for different browsers
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Can add Firefox/Safari later:
    // { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    // { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],

  // Web server configuration - starts frontend and backend
  webServer: [
    {
      // Start backend with mock mode
      command: `cd ../backend && MOCK_SDK=true bun run start`,
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      // Start frontend dev server
      command: "cd ../frontend && bun run dev -- --port 5173",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
