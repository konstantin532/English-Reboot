import { test, expect } from '@playwright/test';

/* Неправильные глаголы (A2): фильтр во вкладке «Фразовые глаголы», формы на плитке, метка в примерах, легенда цветов. */

async function onboard(page) {
  await page.goto('/');
  const skip = page.locator('#ob-skip');
  if (await skip.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) {
    await skip.click();
    await page.locator('.ob-level').first().click();
    await page.locator('.ob-goal').first().click();
    await page.locator('#ob-finish').click();
  }
  await expect(page.locator('#seed-progress')).toBeHidden({ timeout: 20000 });
  await expect(page.locator('#today-start')).toBeVisible();
}

const shownOf = async (page) => Number((await page.locator('.list-summary').innerText()).match(/из (\d+)\s*$/)[1]);

test('«Фразовые глаголы»: фильтр неправильные / правильные, формы на плитке', async ({ page }) => {
  await onboard(page);
  await page.locator('.nav-link[data-tab="phrasal"]').click();
  const all = await shownOf(page);

  await page.locator('.verb-filter-btn[data-verbs="irr"]').click();
  await expect(page.locator('.verb-filter-btn[data-verbs="irr"]')).toHaveAttribute('aria-pressed', 'true');
  const irr = await shownOf(page);
  const tiles = page.locator('.vocab-tile');
  const n = await tiles.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) await expect(tiles.nth(i).locator('.tile-forms')).toHaveText(/^\w+ · [\w/]+ · \w+$/);
  const comeIn = page.locator('.vocab-tile', { hasText: 'come in' }).first();
  await expect(comeIn.locator('.tile-forms')).toHaveText('come · came · come');

  await page.locator('.verb-filter-btn[data-verbs="reg"]').click();
  const reg = await shownOf(page);
  await expect(page.locator('.vocab-tile .tile-forms')).toHaveCount(0);
  await expect(page.locator('.vocab-tile', { hasText: 'hurry up' }).first()).toBeVisible();
  expect(irr + reg).toBe(all);

  await page.locator('.verb-filter-btn[data-verbs="all"]').click();
  expect(await shownOf(page)).toBe(all);
});

test('в примерах неправильный глагол помечен (came — pos-irr), правильный — нет; легенда в настройках', async ({ page }) => {
  await onboard(page);
  await page.locator('.nav-link[data-tab="phrasal"]').click();
  await page.locator('.vocab-tile', { hasText: 'come in' }).first().click();
  await expect(page.locator('.word-token[data-w="came"] .word-text.pos-verb.pos-irr')).toBeVisible();
  await expect(page.locator('.word-token[data-w="in"] .word-text.pos-irr')).toHaveCount(0);

  await page.locator('.nav-link[data-tab="settings"]').click();
  await expect(page.locator('.pos-legend li')).toHaveCount(10);
  await expect(page.locator('.pos-legend')).toContainText('неправильный глагол');
});
