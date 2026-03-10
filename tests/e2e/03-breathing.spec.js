import { test, expect } from '@playwright/test';

const AUDIO_MOCK = () => {
  HTMLMediaElement.prototype.play = () => Promise.resolve();
  HTMLMediaElement.prototype.pause = () => {};
};

/**
 * Navigate to journey, type burn text, force-click burn button (bypasses CSS
 * animation visibility check), then fast-forward past all intro timers so the
 * breathing stage becomes active.
 */
async function reachBreathing(page) {
  await page.clock.install();
  await page.goto('/journey/');
  await page.locator('[data-burn-input]').fill('test worry');
  // force: true bypasses CSS opacity animation — button event fires immediately
  await page.locator('[data-burn-button]').click({ force: true });
  // Skip all intro timers up to and including breathing stage reveal (~15s)
  await page.clock.fastForward(15000);
}

test.describe('Breathing sequence', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(AUDIO_MOCK);
  });

  test('breathing stage is shown after burn sequence', async ({ page }) => {
    await reachBreathing(page);
    const stage = page.locator('[data-journey-breathing-stage]');
    await expect(stage).not.toHaveClass(/is-hidden/);
  });

  test('breathing canvas exists within stage', async ({ page }) => {
    await reachBreathing(page);
    const canvas = page.locator('[data-breathing-canvas]');
    await expect(canvas).toBeAttached();
  });

  test('breathing completes after 3 rounds via __onBreathingComplete hook', async ({ page }) => {
    await reachBreathing(page);

    // Spy on completion callback
    await page.evaluate(() => {
      const canvas = document.querySelector('[data-breathing-canvas]');
      if (canvas) {
        window.__breathingDone = false;
        const orig = canvas.__onBreathingComplete;
        canvas.__onBreathingComplete = () => {
          window.__breathingDone = true;
          if (typeof orig === 'function') orig();
        };
      }
    });

    // 3 rounds × 10s = 30s, plus buffer for breathing startTime offset
    await page.clock.fastForward(35000);

    const done = await page.evaluate(() => window.__breathingDone);
    expect(done).toBe(true);
  });

  test('__startBreathingSequence hook is exposed on canvas', async ({ page }) => {
    await reachBreathing(page);
    const hasHook = await page.evaluate(() => {
      const canvas = document.querySelector('[data-breathing-canvas]');
      return canvas ? typeof canvas.__startBreathingSequence === 'function' : false;
    });
    expect(hasHook).toBe(true);
  });

  test('breathing canvas renders non-blank frame after start', async ({ page }) => {
    await reachBreathing(page);

    await page.evaluate(() => {
      const canvas = document.querySelector('[data-breathing-canvas]');
      if (canvas && typeof canvas.__startBreathingSequence === 'function') {
        canvas.__startBreathingSequence();
      }
    });

    await page.clock.fastForward(500);

    const isDrawn = await page.evaluate(() => {
      const canvas = document.querySelector('[data-breathing-canvas]');
      if (!canvas) return false;
      const ctx = canvas.getContext('2d');
      const data = ctx.getImageData(
        Math.floor(canvas.width / 2),
        Math.floor(canvas.height / 2),
        1,
        1
      ).data;
      return data[3] > 0;
    });
    expect(isDrawn).toBe(true);
  });
});
