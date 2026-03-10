import { test, expect } from '@playwright/test';

test.describe('Audio utilities', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      HTMLMediaElement.prototype.play = () => Promise.resolve();
      HTMLMediaElement.prototype.pause = () => {};
    });
    await page.goto('/journey/');
  });

  test('audio toggle button is present', async ({ page }) => {
    // audio.js renders a toggle button when data-audio-ui is true on body
    const toggle = page.locator('.audio-toggle');
    await expect(toggle).toBeAttached();
  });

  test('audio volume is within [0, 1] on init', async ({ page }) => {
    const volume = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio ? audio.volume : -1;
    });
    // If audio element exists its volume should be in valid range
    if (volume !== -1) {
      expect(volume).toBeGreaterThanOrEqual(0);
      expect(volume).toBeLessThanOrEqual(1);
    }
  });

  test('localStorage audio key stores valid preference', async ({ page }) => {
    // audio.js uses 'meditation_audio_enabled' as the storage key
    const val = await page.evaluate(() => localStorage.getItem('meditation_audio_enabled'));
    expect(['true', 'false', null]).toContain(val);
  });

  test('toggling audio button changes its sound-on class', async ({ page }) => {
    const toggle = page.locator('.audio-toggle');
    const isSoundOnBefore = await toggle.evaluate(el => el.classList.contains('is-sound-on'));
    await toggle.click();
    // Give the fade animation a moment to settle
    await page.waitForTimeout(100);
    const isSoundOnAfter = await toggle.evaluate(el => el.classList.contains('is-sound-on'));
    expect(isSoundOnBefore).not.toBe(isSoundOnAfter);
  });
});
