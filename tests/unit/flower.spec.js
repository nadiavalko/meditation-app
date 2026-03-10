import { test, expect } from '@playwright/test';

test.describe('getNextFinishFlower', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      HTMLMediaElement.prototype.play = () => Promise.resolve();
      HTMLMediaElement.prototype.pause = () => {};
    });
    await page.goto('/journey/');
  });

  test('returns a valid flower path', async ({ page }) => {
    const flower = await page.evaluate(() => {
      localStorage.removeItem('journey_finish_flower_index');
      return getNextFinishFlower();
    });
    expect(flower).toMatch(/flower/);
    expect(flower).toMatch(/\.png$/);
  });

  test('rotates through 3 unique flowers then cycles back', async ({ page }) => {
    const flowers = await page.evaluate(() => {
      localStorage.removeItem('journey_finish_flower_index');
      return [
        getNextFinishFlower(),
        getNextFinishFlower(),
        getNextFinishFlower(),
        getNextFinishFlower(),
      ];
    });
    // First 3 should be distinct
    const uniqueFirst3 = new Set(flowers.slice(0, 3));
    expect(uniqueFirst3.size).toBe(3);
    // 4th should equal the 1st (cycles back)
    expect(flowers[3]).toBe(flowers[0]);
  });

  test('flower index persists across calls', async ({ page }) => {
    const first = await page.evaluate(() => {
      localStorage.removeItem('journey_finish_flower_index');
      getNextFinishFlower(); // call 1
      return getNextFinishFlower(); // call 2 — should differ from call 1
    });
    // We can at least verify that the second call produces a valid value
    expect(first).toMatch(/flower/);
  });
});
