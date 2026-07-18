import { defineConfig, devices } from '@playwright/test';

// Real-browser smoke of the critical entry flow. The API is fully mocked in the
// spec (page.route), so it never touches a real backend or records a real
// payment. Run with `npm run e2e` (needs `npx playwright install chromium` once).
export default defineConfig({
  testDir: './e2e',
  // Generous: the app eagerly imports ~40 pages, so Vite's first dev-compile of
  // the /login route can be slow on a cold start.
  timeout: 90_000,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
