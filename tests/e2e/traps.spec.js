import { test, expect } from '@playwright/test';

/* Этап 1b: подсветка ловушек русского акцента на карточке фразы. */
async function start(page) {
  await page.goto('/');
  const skip = page.locator('#ob-skip');
  if (await skip.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) {
    await skip.click();
    await page.locator('.ob-level').first().click();
    await page.locator('.ob-goal').first().click();
    await page.locator('#ob-finish').click();
  }
  await expect(page.locator('#onboarding-container .onboarding-overlay')).toBeHidden({ timeout: 5000 });
  await expect.poll(() => page.evaluate(() => DB.getAll('conversation').then((r) => r.data.length)), { timeout: 15000 })
    .toBeGreaterThan(1100);
  await expect(page.locator('#seed-progress')).toBeHidden({ timeout: 20000 });
}

async function openPhrase(page, front) {
  await page.evaluate(async (f) => {
    const card = (await DB.getAll('conversation')).data.find((c) => c.payload.front === f);
    await ER.openCardAnywhere('conversation', card.id);
  }, front);
  await expect(page.locator('.traps-block[data-ready]')).toBeVisible();
}

test('ловушки: клик по ловушке показывает объяснение «по-русски vs по-английски» и пару на слух', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await start(page);
  await openPhrase(page, 'Can you pass the salt?');

  // слова с ловушками подчёркнуты
  await expect(page.locator('.trap-word', { hasText: 'pass' })).toBeVisible();
  await expect(page.locator('.trap-word', { hasText: 'salt' })).toBeVisible();

  // клик по чипу [æ] → объяснение от русского + минимальная пара
  await page.locator('.trap-chip', { hasText: 'bad ≠ bed' }).click();
  const panel = page.locator('.trap-explain');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('[æ]');
  await expect(panel).toContainText('В русском нет звука');
  await expect(panel.locator('.trap-say-pair')).toContainText('bad → bed');
  await expect(panel.locator('.trap-say', { hasText: 'pass' })).toBeVisible();

  // «Другая пара» листает минимальные пары той же ловушки
  await panel.locator('.trap-next-pair').click();
  await expect(panel.locator('.trap-say-pair')).toContainText('man → men');

  // клик по слову salt → тёмное l
  await page.locator('.trap-word', { hasText: 'salt' }).click();
  await expect(panel).toContainText('Тёмное l');
  await expect(page.locator('.trap-chip.is-active')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('ловушки: блок есть и на ступени «Скажи вслух» лестницы', async ({ page }) => {
  await start(page);
  await page.evaluate(async () => {
    const card = (await DB.getAll('conversation')).data.find((c) => c.payload.front === 'Can you pass the salt?');
    await DB.saveCard('progress', { cardId: card.id, storeName: 'conversation', status: 'learning', stability: 3, difficulty: 5,
      ease: 2.3, lapseCount: 0, reps: 1, lastReview: '2020-01-01', nextReview: SRS.todayStr(), ladder: { step: 6, best: 6, hist: {} } });
    await LadderUI.startSingle(card.id);
  });
  await expect(page.locator('#ladder-root')).toHaveAttribute('data-step', '6');
  await page.locator('.traps-block[data-ready] .trap-chip').first().click();
  await expect(page.locator('.trap-explain')).toBeVisible();
});
