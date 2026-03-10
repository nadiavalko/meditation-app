import { test, expect } from '@playwright/test';

/**
 * Unit tests for localStorage helpers (loadFromStorage, saveToStorage, getStats).
 * We run these via page.evaluate() so the app's script is available.
 */

test.describe('Storage utilities', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      HTMLMediaElement.prototype.play = () => Promise.resolve();
      HTMLMediaElement.prototype.pause = () => {};
    });
    await page.goto('/journey/');
  });

  test('loadFromStorage returns fallback for missing key', async ({ page }) => {
    const result = await page.evaluate(() => {
      localStorage.removeItem('__test_key__');
      return loadFromStorage('__test_key__', { defaultValue: true });
    });
    expect(result).toEqual({ defaultValue: true });
  });

  test('loadFromStorage returns parsed value for existing key', async ({ page }) => {
    const result = await page.evaluate(() => {
      localStorage.setItem('__test_key__', JSON.stringify({ hello: 'world' }));
      return loadFromStorage('__test_key__', null);
    });
    expect(result).toEqual({ hello: 'world' });
  });

  test('saveToStorage persists a value', async ({ page }) => {
    const result = await page.evaluate(() => {
      saveToStorage('__test_save__', { saved: 42 });
      return JSON.parse(localStorage.getItem('__test_save__'));
    });
    expect(result).toEqual({ saved: 42 });
  });

  test('loadFromStorage returns fallback on malformed JSON', async ({ page }) => {
    const result = await page.evaluate(() => {
      localStorage.setItem('__test_bad__', 'not-json{{{');
      return loadFromStorage('__test_bad__', 'fallback');
    });
    expect(result).toBe('fallback');
  });

  test('getStats returns object with expected keys', async ({ page }) => {
    const stats = await page.evaluate(() => {
      localStorage.removeItem('stillwave_stats');
      return getStats();
    });
    expect(stats).toHaveProperty('totalMinutes');
    expect(stats).toHaveProperty('streakDays');
    expect(stats).toHaveProperty('breathsCompleted');
    expect(stats).toHaveProperty('calmScore');
  });
});
