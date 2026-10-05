import { test, expect } from '@playwright/test';

/* Этап 6: честная мотивация — лига темпов по фразам вслух, счётчик «вслух сегодня»,
   реплики коуча по фактам, без похвалы за непроверенное. */

async function onboard(page) {
  await page.addInitScript(() => { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; });
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

test('лига темпов: боты-пейсеры с открытым правилом, ты — по фразам вслух, без случайностей', async ({ page }) => {
  await onboard(page);
  await page.evaluate(() => DB.addSpoken(SRS.todayStr(), 12));
  await page.evaluate(() => ER.switchTab('progress'));
  const league = page.locator('#pacer-league');
  await expect(league).toBeVisible();
  await expect(league.locator('.league-row.is-bot')).toHaveCount(4);
  await expect(league.locator('.bot-tag')).toHaveCount(4);
  await expect(league).toContainText('не люди');
  await expect(league).not.toContainText('Maria');
  await expect(league.locator('[data-id="me"] .xp')).toHaveText('12');
  const days = await page.evaluate(() => Pacers.table([], SRS.todayStr()).days);
  await expect(league.locator('[data-id="goal90"] .xp')).toHaveText(String(15 * days));
  await expect(page.locator('#pacer-line')).toContainText('«90 дней»');
  await expect(page.locator('.spoken-col.is-today .spoken-val')).toHaveText('12');
  const first = await league.innerText();
  await page.evaluate(() => ER.switchTab('today'));
  await page.evaluate(() => ER.switchTab('progress'));
  await expect(page.locator('#pacer-league')).toHaveText(first);
});

test('боковая панель: «вслух сегодня» обновляется сразу после фразы вслух', async ({ page }) => {
  await onboard(page);
  await expect(page.locator('#spoken-today')).toHaveText('0');
  await page.evaluate(() => DB.addSpoken(SRS.todayStr(), 1));
  await expect(page.locator('#spoken-today')).toHaveText('1');
  await expect(page.locator('#ring-spoken')).toContainText('1 фраза вслух сегодня');
  await page.evaluate(() => DB.addSpoken(SRS.todayStr(), 2));
  await expect(page.locator('#ring-spoken')).toContainText('3 фразы вслух сегодня');
});

test('самооценка — без похвалы: «Звучит похоже» даёт нейтральную реплику', async ({ page }) => {
  await onboard(page);
  await page.evaluate(async () => {
    const card = (await DB.getAll('conversation')).data.find((c) => c.payload.front === 'Can you pass the salt?');
    await DB.saveCard('progress', { cardId: card.id, storeName: 'conversation', status: 'learning', stability: 3, difficulty: 5,
      ease: 2.3, lapseCount: 0, reps: 1, lastReview: '2020-01-01', nextReview: SRS.todayStr(), ladder: { step: 6, best: 6, hist: {} } });
    await LadderUI.startSingle(card.id);
  });
  await expect(page.locator('#ladder-root')).toHaveAttribute('data-step', '6');
  await page.locator('.ladder-selfbtn[data-ok="1"]').click();
  const verdict = (await page.locator('.ladder-verdict').innerText()).trim();
  const self = await page.evaluate(() => Coach.LINES.ladder.self);
  expect(self).toContain(verdict);
});

test('итог дня: реплика коуча по фактам и темп «90 дней» — без дежурной похвалы', async ({ page }) => {
  await onboard(page);
  await page.evaluate(async () => {
    const t = SRS.todayStr();
    await DB.addSpoken(SRS.addDays(t, -2), 20); // лучший день раньше — значит, сегодня не рекорд
    await DB.addSpoken(SRS.addDays(t, -1), 4);
    await DB.addSpoken(t, 7);
    await TodayUI.showSummary(null);
  });
  await expect(page.locator('#today-day-line')).toHaveText('Сегодня 7 фраз вслух — на 3 фразы больше, чем вчера.');
  await expect(page.locator('#today-pace-line')).toContainText('«90 дней»');
  await expect(page.locator('#today-summary')).not.toContainText('Вот это работа');
});
