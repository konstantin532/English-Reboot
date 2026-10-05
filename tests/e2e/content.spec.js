import { test, expect } from '@playwright/test';

/* Этап 7: правки контента по аудиту — что видит ученик и что происходит с прогрессом при обновлении. */

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

test('карточка показывает американскую транскрипцию: water /ˈwɔtɚ/, а не /ˈwɔːtə/', async ({ page }) => {
  await onboard(page);
  await page.evaluate(() => ER.openCardAnywhere('conversation', 'cv_042'));
  const examples = page.locator('.example-text').first();
  await expect(examples).toContainText('ˈwɔtɚ');
  await expect(examples).not.toContainText('ː');
});

test('обновление у того, кто уже учится: дубль объединён с переносом прогресса, заменённая карточка — с чистого листа', async ({ page }) => {
  await onboard(page);
  // Состояние «до этапа 7»: в базе есть дубль cv_029 с прогрессом и прогресс по старому sl_058 (innit)
  await page.evaluate(async () => {
    const keep = (await DB.getByKey('conversation', 'cv_144')).data;
    await DB.saveCard('conversation', { ...keep, id: 'cv_029' });
    await DB.saveCard('progress', { cardId: 'cv_029', storeName: 'conversation', status: 'learning', stability: 6, difficulty: 5,
      ease: 2.3, lapseCount: 0, reps: 5, lastReview: '2026-01-01', nextReview: '2026-01-05', ladder: { step: 4, best: 4, hist: {} } });
    await DB.saveCard('progress', { cardId: 'sl_058', storeName: 'slang', status: 'learning', stability: 3, difficulty: 5,
      ease: 2.3, lapseCount: 0, reps: 3, lastReview: '2026-01-01', nextReview: '2026-01-03' });
    await DB.deleteCard('content_meta', ContentMigrate.KEY);
  });
  await page.reload();
  await expect(page.locator('#today-start')).toBeVisible({ timeout: 20000 });
  await expect.poll(() => page.evaluate(() => DB.getByKey('content_meta', ContentMigrate.KEY).then((r) => !!r.data))).toBe(true);
  const st = await page.evaluate(async () => ({
    moved: (await DB.getByKey('progress', 'cv_144')).data,
    oldProgress: (await DB.getByKey('progress', 'cv_029')).data,
    oldCard: (await DB.getByKey('conversation', 'cv_029')).data,
    reset: (await DB.getByKey('progress', 'sl_058')).data,
    newFront: (await DB.getByKey('slang', 'sl_058')).data.payload.front,
  }));
  expect(st.moved.reps).toBe(5);
  expect(st.moved.ladder.step).toBe(4);
  expect(st.oldProgress == null).toBe(true);
  expect(st.oldCard == null).toBe(true);
  expect(st.reset == null).toBe(true);
  expect(st.newFront).toBe('didja');
});
