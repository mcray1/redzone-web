import { test, expect } from '@playwright/test';

// Real-browser smoke: log in and land in the owner area. The API is fully mocked
// via page.route, so nothing hits a real backend (and no real payment is ever
// recorded). This complements the deterministic RTL tests with a true
// browser+router pass of the entry flow.
test('login lands an OWNER in the owner area', async ({ page }) => {
  // Match ONLY real backend calls (pathname starts with /api/), NOT Vite's
  // dev-served source modules under /src/api/*, which a broad '**/api/**' glob
  // would wrongly intercept and break the app's module loading.
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const url = route.request().url();
    if (url.includes('/auth/login')) {
      return route.fulfill({
        json: {
          accessToken: 'test-access',
          refreshToken: 'test-refresh',
          user: { id: 'u1', name: 'Owner', email: 'owner@redzone.com.ph', role: 'OWNER', memberships: [] },
        },
      });
    }
    // Everything the owner landing may fetch: harmless empty payload.
    return route.fulfill({ json: [] });
  });

  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  const email = page.getByPlaceholder('you@redzone.com.ph');
  await email.waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {
    throw new Error(`login form never rendered. page errors:\n${errors.join('\n') || '(none)'}`);
  });
  await email.fill('owner@redzone.com.ph');
  await page.getByPlaceholder('••••••••').fill('Passw0rd!');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Navigation to the owner area is the smoke assertion (data fetches are mocked
  // empty; the route change proves auth + routing work end-to-end in a browser).
  await expect(page).toHaveURL(/\/owner/, { timeout: 15_000 });
});
