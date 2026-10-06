import { test, expect } from '@playwright/test';

/* Ядро после разделения app.js на модули: действия, которые меняют общее состояние ядра
   из модуля (кэш разделов, переключение вкладок), работают как раньше. */

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

test('сброс прогресса в Настройках чистит прогресс и кэш раздела — статус карточки исчезает', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await onboard(page);
  await page.evaluate(() => DB.saveCard('progress', { cardId: 'g001', storeName: 'grammar_cards', status: 'mastered', stability: 30,
    difficulty: 5, ease: 2.5, lapseCount: 0, reps: 5, lastReview: SRS.todayStr(), nextReview: '2099-01-01' }));
  // reloadContent сбрасывает кэш и асинхронно перерисовывает «Сегодня» — дожидаемся, иначе
  // запоздавшая перерисовка закроет карточку
  await page.evaluate(() => ER.reloadContent());
  await expect(page.locator('#today-start')).toBeVisible();
  await page.evaluate(() => ER.openCardAnywhere('grammar_cards', 'g001'));
  await expect(page.locator('.detail-top .status-mastered')).toBeVisible();

  await page.evaluate(() => ER.switchTab('settings'));
  await page.locator('#btn-reset-progress').click();
  await page.locator('#modal-zone [data-confirm]').click();
  // сброс чистит 4 хранилища по очереди и сбрасывает кэш в конце — ждём его завершения (тост),
  // а не первого пустого хранилища
  await expect(page.locator('#toast-zone')).toContainText('Прогресс сброшен');
  expect(await page.evaluate(() => DB.getAllProgress().then((r) => r.data.length))).toBe(0);

  await page.evaluate(() => ER.openCardAnywhere('grammar_cards', 'g001'));
  await expect(page.locator('.detail-top')).toBeVisible();
  await expect(page.locator('.status-mastered')).toHaveCount(0); // кэш раздела сброшен, а не показан старым
  expect(errors).toEqual([]);
});

test('тема переключается кнопкой в шапке и сохраняется; Escape закрывает окно подтверждения', async ({ page }) => {
  await onboard(page);
  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.locator('#theme-toggle').click();
  const after = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(after).not.toBe(before);
  await expect.poll(() => page.evaluate(() => DB.getSetting('theme').then((r) => r.data))).toBe(after);

  await page.evaluate(() => ER.switchTab('settings'));
  await page.locator('#btn-reset-progress').click();
  await expect(page.locator('#modal-zone .modal-card')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#modal-zone')).toBeHidden();
});
