import { test, expect } from '@playwright/test';

/**
 * Full journey integration test using page.clock.fastForward to skip real-time delays.
 */
test('full journey: burn → breathing → body scan → finish', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = () => Promise.resolve();
    HTMLMediaElement.prototype.pause = () => {};
  });

  await page.clock.install();
  await page.goto('/journey/');

  // --- Burn ---
  const input = page.locator('[data-burn-input]');
  await expect(input).toBeVisible();
  await input.fill('everything weighing on me');

  // force: true bypasses CSS burn-seq-3 visibility wait (3.2s real delay)
  await page.locator('[data-burn-button]').click({ force: true });

  // Burn frame immediately has is-burning class
  await expect(page.locator('[data-burn-frame]')).toHaveClass(/is-burning/);

  // --- Breathing: skip intro timers ---
  await page.clock.runFor(15000);
  await expect(page.locator('[data-journey-breathing-stage]')).not.toHaveClass(/is-hidden/);

  // --- Let breathing complete naturally via RAF ---
  await page.clock.runFor(35000);

  // --- Body scan: skip all step timers + finish sequence ---
  await page.clock.runFor(200000);

  // --- Finish screen ---
  await expect(page.locator('[data-journey-finish]')).not.toHaveClass(/is-hidden/);
  await expect(page.locator('[data-finish-intro-line-1]')).toContainText("You've made it through.");
  await expect(page.locator('[data-finish-intro-line-2]')).toContainText('How are you feeling?');

  // Flower src set when finish sequence starts
  const flowerSrc = await page.locator('[data-finish-flower]').getAttribute('src');
  expect(flowerSrc).toMatch(/flower/);

  // Phase 2 appears after ~5800ms
  await page.clock.fastForward(6000);
  await expect(page.locator('[data-finish-phase-2]')).not.toHaveClass(/is-hidden/);
});
