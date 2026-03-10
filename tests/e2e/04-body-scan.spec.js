import { test, expect } from '@playwright/test';

const AUDIO_MOCK = () => {
  HTMLMediaElement.prototype.play = () => Promise.resolve();
  HTMLMediaElement.prototype.pause = () => {};
};

/**
 * Fast-forward to body scan:
 * 1. 15s → breathing stage visible
 * 2. 35s → breathing completes (RAF fires __onBreathingComplete naturally)
 * 3. 15s → "Well done" / "Last stop" / body figure reveal transitions
 */
async function reachBodyScan(page) {
  await page.clock.install();
  await page.goto('/journey/');
  await page.locator('[data-burn-input]').fill('test worry');
  await page.locator('[data-burn-button]').click({ force: true });

  await page.clock.runFor(15000);  // → breathing stage
  await page.clock.runFor(35000);  // → breathing completes, body scan starts
  await page.clock.runFor(15000);  // → body figure revealed + feet prompt
}

test.describe('Body scan', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(AUDIO_MOCK);
  });

  test('body figure stage becomes visible', async ({ page }) => {
    await reachBodyScan(page);
    const stage = page.locator('[data-journey-body-figure-stage]');
    await expect(stage).not.toHaveClass(/is-hidden/);
  });

  test('body figure object element is present', async ({ page }) => {
    await reachBodyScan(page);
    const figure = page.locator('[data-journey-body-figure]');
    await expect(figure).toBeAttached();
    await expect(figure).not.toHaveClass(/is-hidden/);
  });

  test('body scan shows feet instruction first', async ({ page }) => {
    await reachBodyScan(page);
    const text = await page.locator('[data-burn-title]').textContent();
    expect(text).toMatch(/feet/i);
  });

  test('body scan text changes over time', async ({ page }) => {
    await reachBodyScan(page);
    const step1 = await page.locator('[data-burn-title]').textContent();

    // Advance one full step (shortBodyScanStepDurationMs=15000 + crossfade=1200)
    await page.clock.runFor(16500);

    const step2 = await page.locator('[data-burn-title]').textContent();
    expect(step1).not.toBe(step2);
  });
});
