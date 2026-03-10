import { test, expect } from '@playwright/test';

const AUDIO_MOCK = () => {
  HTMLMediaElement.prototype.play = () => Promise.resolve();
  HTMLMediaElement.prototype.pause = () => {};
};

/**
 * Fast-forward through the entire journey:
 * 1. 15s  → breathing stage
 * 2. 35s  → breathing completes (RAF fires __onBreathingComplete naturally)
 * 3. 200s → runs all body scan step timers + startJourneyFinishSequence
 */
async function reachFinish(page) {
  await page.clock.install();
  await page.goto('/journey/');
  await page.locator('[data-burn-input]').fill('test worry');
  await page.locator('[data-burn-button]').click({ force: true });

  await page.clock.runFor(15000);   // → breathing stage
  await page.clock.runFor(35000);   // → breathing completes
  await page.clock.runFor(200000);  // → all body scan steps + finish
}

test.describe('Finish screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(AUDIO_MOCK);
  });

  test('finish screen becomes visible', async ({ page }) => {
    await reachFinish(page);
    await expect(page.locator('[data-journey-finish]')).not.toHaveClass(/is-hidden/);
  });

  test('finish phase 1 shows correct text', async ({ page }) => {
    await reachFinish(page);
    await expect(page.locator('[data-finish-intro-line-1]')).toContainText("You've made it through.");
    await expect(page.locator('[data-finish-intro-line-2]')).toContainText('How are you feeling?');
  });

  test('finish phase 2 appears after ~5800ms', async ({ page }) => {
    await reachFinish(page);
    // finishFadeOutDelayFromStart (4600ms) + finishFadeOutDuration (1200ms) = 5800ms
    await page.clock.fastForward(6000);
    await expect(page.locator('[data-finish-phase-2]')).not.toHaveClass(/is-hidden/);
  });

  test('finish flower image src is set', async ({ page }) => {
    await reachFinish(page);
    const src = await page.locator('[data-finish-flower]').getAttribute('src');
    expect(src).toMatch(/flower/);
  });

  test('door button links to homepage', async ({ page }) => {
    await reachFinish(page);
    await page.clock.fastForward(6000);
    const doorLink = page.locator('[data-finish-phase-2] .finish-action').first();
    await expect(doorLink).toHaveAttribute('href', '/');
  });

  test('coffee button links to buymeacoffee', async ({ page }) => {
    await reachFinish(page);
    await page.clock.fastForward(6000);
    const coffeeLink = page.locator('.finish-action-coffee');
    await expect(coffeeLink).toHaveAttribute('href', /buymeacoffee\.com/);
  });

  test('finish screen phase 1 screenshot', async ({ page }) => {
    await reachFinish(page);
    await expect(page).toHaveScreenshot('finish-phase-1.png', { fullPage: true });
  });

  test('finish screen phase 2 screenshot', async ({ page }) => {
    await reachFinish(page);
    await page.clock.fastForward(6000);
    await expect(page).toHaveScreenshot('finish-phase-2.png', { fullPage: true });
  });
});
