import { test, expect } from '@playwright/test';

/* Этап 1: лестница упражнений. Онбординг — через «Я определю сам», как в features.spec.js. */
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

// Ступень 1 «Узнай на слух»: верный вариант — тот, что озвучивает кнопка «Прослушать»
async function answerListenCorrectly(page) {
  const root = page.locator('#ladder-root');
  await expect(root).toHaveAttribute('data-step', '1');
  const said = await page.locator('.ladder-play').first().getAttribute('data-say');
  await page.locator('.ladder-opt').filter({ hasText: new RegExp('^' + said.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }).click();
  await expect(page.locator('.ladder-verdict.is-ok')).toBeVisible();
  await page.locator('#ladder-next').click();
}

test('лестница: фраза с карточки проходит ступень 1 → 2, ступень сохраняется', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await start(page);

  // Карточка американской фразы: кнопка входа в лестницу и текущая ступень
  await page.evaluate(() => ER.openCardAnywhere('conversation', 'cv_1001'));
  await expect(page.locator('.ladder-entry-step')).toContainText('Ступень 1 из 8');
  await page.locator('.ladder-train-btn').click();

  // Три верных ответа подряд (порог: ≥80% из последних 5, минимум 3 попытки)
  for (let i = 0; i < 2; i++) await answerListenCorrectly(page);
  await expect(page.locator('#ladder-root')).toHaveAttribute('data-step', '1');
  const said = await page.locator('.ladder-play').first().getAttribute('data-say');
  await page.locator('.ladder-opt').filter({ hasText: said }).first().click();
  await expect(page.locator('.ladder-event.is-up')).toContainText('ступень 2');
  await page.locator('#ladder-next').click();

  // Итог сессии честно считает открытые ступени и верные ответы
  await expect(page.locator('.ladder-summary')).toContainText('Открыто ступеней: 1');
  await expect(page.locator('.ladder-summary')).toContainText('3 из 3');
  await page.locator('#ladder-close').click();

  // Ступень лежит в IndexedDB рядом с FSRS и переживает перезагрузку
  const rec = await page.evaluate(() => DB.getProgressByCardId('cv_1001').then((r) => r.data));
  expect(rec.ladder.step).toBe(2);
  expect(rec.stability).toBeGreaterThan(0);
  await page.reload();
  await expect(page.locator('#seed-progress')).toBeHidden({ timeout: 20000 });
  await page.evaluate(() => ER.openCardAnywhere('conversation', 'cv_1001'));
  await expect(page.locator('.ladder-entry-step')).toContainText('Ступень 2 из 8');

  // Следующая тренировка начинается со ступени 2 «Выбери уместное»
  await page.locator('.ladder-train-btn').click();
  await expect(page.locator('#ladder-root')).toHaveAttribute('data-step', '2');
  await expect(page.locator('.ladder-cue')).toBeVisible();
  expect(errors).toEqual([]);
});

test('лестница: ошибка возвращает на ступень ниже без «Неверно!»', async ({ page }) => {
  await start(page);
  await page.evaluate(async () => {
    const today = SRS.todayStr();
    await DB.saveCard('progress', { cardId: 'cv_1001', storeName: 'conversation', status: 'learning', stability: 3, difficulty: 5,
      ease: 2.3, lapseCount: 0, reps: 1, lastReview: '2020-01-01', nextReview: today, ladder: { step: 2, best: 2, hist: {} } });
  });
  await page.evaluate(() => LadderUI.startSingle('cv_1001'));
  await expect(page.locator('#ladder-root')).toHaveAttribute('data-step', '2');
  const wrong = page.locator('.ladder-opt').filter({ hasNotText: /What's up\?/ }).first();
  await wrong.click();
  await expect(page.locator('.ladder-verdict.is-miss')).toBeVisible();
  await expect(page.locator('#ladder-root')).not.toContainText('Неверно');
  await expect(page.locator('.ladder-event.is-down')).toContainText('Ступень 1');
  await page.locator('#ladder-next').click();
  await expect(page.locator('#ladder-root')).toHaveAttribute('data-step', '1');
});

test('лестница: режим в тренажёре открывается и стартует урок', async ({ page }) => {
  await start(page);
  await page.locator('[data-tab="practice"]').first().click();
  await page.locator('.mode-btn[data-mode="ladder"]').click();
  await expect(page.locator('.ladder-legend li')).toHaveCount(8);
  await page.locator('#ladder-start').click();
  await expect(page.locator('#ladder-root')).toBeVisible();
  await expect(page.locator('.session-counter')).toContainText('из 15');
});
