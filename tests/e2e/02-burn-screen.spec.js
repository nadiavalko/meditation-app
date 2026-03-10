import { test, expect } from '@playwright/test';

test.describe('Burn screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      HTMLMediaElement.prototype.play = () => Promise.resolve();
      HTMLMediaElement.prototype.pause = () => {};
    });
    await page.goto('/journey/');
  });

  test('burn input is visible and accepts text', async ({ page }) => {
    const input = page.locator('[data-burn-input]');
    await expect(input).toBeVisible();
    await input.fill('my worries');
    await expect(input).toHaveValue('my worries');
  });

  test('burn button is present in the DOM', async ({ page }) => {
    // The button reveals via CSS burn-seq-3 animation on page load
    const button = page.locator('[data-burn-button]');
    await expect(button).toBeAttached();
  });

  test('burn button becomes visible after page load animation', async ({ page }) => {
    // burn-seq-3 has a 3.2s delay before fading in; wait past that
    const button = page.locator('[data-burn-button]');
    await expect(button).toBeVisible({ timeout: 5000 });
  });

  test('clicking burn button starts the burn sequence', async ({ page }) => {
    await page.clock.install();
    await page.locator('[data-burn-input]').fill('something to release');
    // force: true bypasses CSS burn-seq-3 visibility animation (3.2s real delay)
    await page.locator('[data-burn-button]').click({ force: true });
    await expect(page.locator('[data-burn-frame]')).toHaveClass(/is-burning/);
  });

  test('burn frame hidden after fire sequence completes', async ({ page }) => {
    await page.clock.install();
    await page.locator('[data-burn-input]').fill('something to release');
    await page.locator('[data-burn-button]').click({ force: true });
    // preBurnFade (1600ms) + fireVideo (4000ms) + 100ms buffer = 5700ms
    await page.clock.fastForward(6000);
    await expect(page.locator('[data-burn-frame]')).toHaveClass(/is-hidden/);
  });

  test('burn screen screenshot with text entered', async ({ page }) => {
    await page.locator('[data-burn-input]').fill('my worries');
    await expect(page.locator('[data-burn-button]')).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveScreenshot('burn-screen-with-text.png', { fullPage: true });
  });
});
