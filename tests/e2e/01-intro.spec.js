import { test, expect } from '@playwright/test';

test.describe('Intro page', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      HTMLMediaElement.prototype.play = () => Promise.resolve();
      HTMLMediaElement.prototype.pause = () => {};
    });
    await page.goto('/');
  });

  test('page title is correct', async ({ page }) => {
    await expect(page).toHaveTitle('Door to Self');
  });

  test('.intro-copy text is visible', async ({ page }) => {
    await expect(page.locator('.intro-copy')).toBeVisible();
    await expect(page.locator('.intro-line-1')).toContainText('Hello, stranger.');
  });

  test('.intro-button links to /journey/', async ({ page }) => {
    const link = page.locator('.intro-button');
    await expect(link).toHaveAttribute('href', '/journey/');
  });

  test('clicking intro-button navigates to /journey/', async ({ page }) => {
    // The anchor (.intro-button) is positioned over the image — click it directly
    await page.locator('.intro-button').click();
    await expect(page).toHaveURL(/\/journey\//);
  });

  test('intro page screenshot', async ({ page }) => {
    await expect(page).toHaveScreenshot('intro-page.png', { fullPage: true });
  });
});
