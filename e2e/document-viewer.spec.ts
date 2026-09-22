/**
 * The document viewer's loading tab, driven against the real modules.
 *
 * The page under test lives in a window of its own, which is awkward to reach through the app: it
 * needs a session, an appraisal, and a document attached to it. `document-viewer.harness.html`
 * imports the same source the app imports and puts the handle on `window`, so every state —
 * progress, error, cancel, downloaded — can be driven directly and deterministically.
 *
 * Needs the dev server running (https://localhost:3000):
 *   npx playwright test --config playwright.viewer.config.ts
 */
import { test, expect, type Page } from '@playwright/test';

const HARNESS = '/e2e/document-viewer.harness.html';

/** ARM_AFTER_MS in dinoGame. */
const ARM_MS = 5_000;

const openTab = async (page: Page): Promise<Page> => {
  const [tab] = await Promise.all([
    page.context().waitForEvent('page'),
    page.getByRole('button', { name: 'open' }).click(),
  ]);
  await tab.waitForLoadState('domcontentloaded');
  return tab;
};

test.describe('loading tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(HARNESS);
  });

  test('opens with the loading page, the dino and an indeterminate bar', async ({ page }) => {
    const tab = await openTab(page);
    await expect(tab.locator('.message')).toHaveText('Opening the file…');
    await expect(tab.locator('canvas')).toBeVisible();
    await expect(tab.locator('.bar')).toHaveAttribute('data-mode', 'indeterminate');
    await expect(tab.locator('.cancel')).toBeVisible();
    await expect(tab.locator('.close')).toBeHidden();
    expect(await tab.evaluate(() => document.body.dataset.state)).toBe('loading');
  });

  test('progress switches the bar to determinate and prints percent and size', async ({ page }) => {
    const tab = await openTab(page);
    await page.evaluate(() => (window as any).__setProgress(5_300_000, 7_600_000));
    await expect(tab.locator('.bar')).toHaveAttribute('data-mode', 'determinate');
    await expect(tab.locator('.detail')).toHaveText('70% · 5.3 MB / 7.6 MB');
    await expect(tab.locator('.bar')).toHaveAttribute('aria-valuenow', '70');
  });

  test('an unknown total stays indeterminate and never claims a percentage', async ({ page }) => {
    const tab = await openTab(page);
    await page.evaluate(() => (window as any).__setProgress(2_300_000, null));
    await expect(tab.locator('.bar')).toHaveAttribute('data-mode', 'indeterminate');
    await expect(tab.locator('.detail')).toHaveText('2.3 MB');
    expect(await tab.locator('.bar').getAttribute('aria-valuenow')).toBeNull();
  });

  test('a failure keeps the tab open and offers a way out', async ({ page }) => {
    const tab = await openTab(page);
    await page.getByRole('button', { name: 'error' }).click();
    await expect(tab.locator('.message')).toHaveText('Boom');
    await expect(tab.locator('.close')).toBeVisible();
    await expect(tab.locator('.cancel')).toBeHidden();
    await expect(tab.locator('.game')).toBeHidden();
    expect(tab.isClosed()).toBe(false);
  });

  test('closing the tab reports a cancel exactly once', async ({ page }) => {
    const tab = await openTab(page);
    await tab.close();
    await expect.poll(() => page.evaluate(() => (window as any).__cancelled)).toBe(1);
    expect(await page.evaluate(() => (window as any).__isOpen())).toBe(false);
  });

  test('the Cancel button closes the tab and reports the cancel', async ({ page }) => {
    const tab = await openTab(page);
    await tab.locator('.cancel').click();
    await expect.poll(() => tab.isClosed()).toBe(true);
    await expect.poll(() => page.evaluate(() => (window as any).__cancelled)).toBe(1);
  });

  test('Space activates a focused Cancel rather than jumping', async ({ page }) => {
    const tab = await openTab(page);
    await tab.waitForTimeout(ARM_MS + 1_000);
    await expect(tab.locator('.hint')).toHaveText('Press Space to jump');

    await tab.locator('.cancel').focus();
    await tab.keyboard.press('Space');
    await expect.poll(() => tab.isClosed(), { timeout: 5_000 }).toBe(true);
    expect(await page.evaluate(() => (window as any).__cancelled)).toBe(1);
  });

  test('a file the browser downloads is reported, and its URL released on close', async ({
    context,
    page,
  }) => {
    const tab = await openTab(page);

    // octet-stream is what a .docx or a .zip looks like to the browser: it downloads rather than
    // navigating, so the tab never leaves the loading page.
    const download = tab.waitForEvent('download', { timeout: 20_000 }).catch(() => null);
    await page.evaluate(() =>
      (window as any).__navigateToBlob('application/octet-stream', [1, 2, 3, 4]),
    );
    await download;

    await expect(tab.locator('.message')).toHaveText('Opening the file…');
    await expect(tab.locator('.message')).toHaveText(
      'The file has been downloaded. You can close this tab.',
      { timeout: 20_000 },
    );
    await expect(tab.locator('.close')).toBeVisible();
    await expect(tab.locator('.game')).toBeHidden();

    // the object URL is held while the tab is up, and released when it goes
    expect(await page.evaluate(() => (window as any).__released)).toBe(0);
    await tab.close();
    await expect
      .poll(() => page.evaluate(() => (window as any).__released), { timeout: 15_000 })
      .toBe(1);
    expect(context.pages().length).toBeGreaterThan(0);
  });
});

test.describe('touch', () => {
  test.use({ hasTouch: true });

  test('tapping Cancel works once the game has armed', async ({ page }) => {
    await page.goto(HARNESS);
    const tab = await openTab(page);
    await tab.waitForTimeout(ARM_MS + 1_000);

    // The tap closes the tab, which Playwright reports as "target closed" from inside the action.
    // The effect is what matters, so that is what is asserted.
    await tab.locator('.cancel').tap({ timeout: 8_000 }).catch(() => {});

    await expect.poll(() => tab.isClosed(), { timeout: 5_000 }).toBe(true);
    expect(await page.evaluate(() => (window as any).__cancelled)).toBe(1);
  });
});

test.describe('reduced motion', () => {
  // Playwright's own reducedMotion emulation does not reach a script-opened popup here (the opener
  // reports matches=false too), so the preference is stubbed the way a browser would report it.
  // The code under test reads win.matchMedia in the tab it opens.
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      const real = window.matchMedia.bind(window);
      window.matchMedia = (q: string) =>
        q.includes('prefers-reduced-motion')
          ? ({
              matches: true,
              media: q,
              onchange: null,
              addEventListener() {},
              removeEventListener() {},
              addListener() {},
              removeListener() {},
              dispatchEvent: () => false,
            } as MediaQueryList)
          : real(q);
    });
  });

  test('hides the game instead of leaving an unsized canvas holding the layout open', async ({
    page,
  }) => {
    await page.goto(HARNESS);
    const tab = await openTab(page);

    expect(await tab.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(
      true,
    );
    await expect(tab.locator('.game')).toBeHidden();
    expect(await tab.locator('.game').boundingBox()).toBeNull();
    await expect(tab.locator('.message')).toBeVisible();
  });
});
