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

test('глагол A2 в «Сегодня»: 3-я форма, вопрос с did (ловушка went), «скажи вслух» без микрофона не засчитывается', async ({ page }) => {
  await onboard(page);
  await page.evaluate(async () => {
    const later = SRS.addDays(SRS.todayStr(), 30);
    const rec = (cardId, storeName, extra) => ({ cardId, storeName, status: 'review', stability: 30, difficulty: 5, ease: 2.3, lapseCount: 0,
      reps: 3, lastReview: SRS.todayStr(), nextReview: later, ...extra });
    const us = (await DB.getAll('conversation')).data.filter((c) => (c.tags || []).includes('США'));
    await DB.bulkPut('progress', us.map((c) => rec(c.id, 'conversation', { ladder: { step: 2, best: 2, hist: {} } })));
    const words = (await DB.getAll('words')).data.filter((c) => c.id !== 'wd_0708');
    await DB.bulkPut('progress', words.map((c) => rec(c.id, 'words')));
    await DB.saveCard('progress', rec('wd_0708', 'words', { lastReview: '2026-01-01', nextReview: '2026-01-10' }));   // go – went – gone
    await ER.switchTab('today');
  });
  await page.locator('#today-start').click();

  await expect(page.locator('#words-root')).toHaveAttribute('data-kind', 'pp');
  await expect(page.locator('.words-word')).toContainText('go');
  await page.waitForTimeout(350);
  await page.locator('.words-opt', { hasText: /^gone$/ }).click();
  await expect(page.locator('#words-feedback')).toContainText('Верно');
  await page.locator('#words-next').click();

  await expect(page.locator('#words-root')).toHaveAttribute('data-kind', 'did');
  await expect(page.locator('.words-hint')).toContainText('Did Tony ___ to the gym?');
  await page.waitForTimeout(350);
  await page.locator('.words-opt', { hasText: /^went$/ }).click();                 // типичная ошибка: Did he went
  await expect(page.locator('.words-opt.is-wrong')).toHaveText('went');
  await expect(page.locator('.words-opt.is-correct')).toHaveText('go');
  await page.locator('#words-next').click();

  // В headless-браузере микрофона нет: задание пропускается, «верно» не ставится; оценка — по двум другим (1 ошибка → «сложно»)
  await expect(page.locator('#words-root')).toHaveAttribute('data-kind', 'say');
  await page.locator('#words-rec').click();
  await expect(page.locator('#words-say-status')).toContainText('не засчитывается');
  await expect(page.locator('#words-feedback')).not.toContainText('Верно');
  await page.locator('#words-next').click();
  await expect.poll(() => page.evaluate(async () => (await DB.getByKey('progress', 'wd_0708')).data.mark)).toBe('hard');
});

test('справочник «Части речи»: открывается из «Грамматики», из карточки глагола и из настроек', async ({ page }) => {
  await onboard(page);
  await page.locator('.nav-link[data-tab="grammar"]').click();
  await page.locator('.pos-guide-entry').click();
  const modal = page.locator('.modal-card.modal-card--wide .pos-guide');
  await expect(modal).toBeVisible();
  await expect(modal.locator('.pg-chapter')).toHaveCount(11);
  await expect(modal.locator('#pg-intro')).toHaveAttribute('open', '');
  await modal.locator('#pg-adv > summary').click();
  await expect(modal.locator('#pg-adv')).toContainText('ad verbum');
  await page.locator('#pg-close').click();
  await expect(page.locator('#modal-zone')).toBeHidden();

  await page.evaluate(() => ER.openCardAnywhere('words', 'wd_0708'));      // go – went – gone
  await page.locator('.verb-kind-line .pos-guide-btn').click();
  await expect(page.locator('#pg-irregular')).toHaveAttribute('open', '');
  await expect(page.locator('#pg-irregular')).toContainText('wend');
  await page.locator('#pg-close').click();
  await expect(page.locator('#modal-zone')).toBeHidden();

  await page.locator('.nav-link[data-tab="settings"]').click();
  await page.locator('.pos-legend + .pos-guide-btn').click();
  await expect(page.locator('.pos-guide')).toBeVisible();
});
