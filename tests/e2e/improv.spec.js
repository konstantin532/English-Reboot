import { test, expect } from '@playwright/test';

/* Этап 4: импровизация. Микрофон — фейковый, таймер ускорен (секунда = 40 мс). */
test.use({
  permissions: ['microphone'],
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
});

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
  await page.evaluate(() => ImprovUI.configure({ secondMs: 40 }));
}

test('рулетка: карточка → подумать → таймер с записью сам доходит до конца → образцы → самооценка', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await onboard(page);
  await page.evaluate(() => ER.openPractice('improv'));
  await page.locator('#imp-roulette').click();

  const round = page.locator('#imp-round');
  await expect(round.locator('.imp-situation')).toBeVisible();
  await expect(round.locator('.imp-mood')).toBeVisible();
  await expect(round.locator('.imp-cond')).toContainText('Вверни фразу');
  await expect(round).toHaveAttribute('data-phase', 'think');
  // 5 «секунд» подумать — и разговор начинается сам, с записью; таймер истекает сам
  await expect(round).toHaveAttribute('data-phase', 'talk');
  await expect(page.locator('.imp-clock.is-talk')).toBeVisible();
  await expect(round).toHaveAttribute('data-phase', 'review', { timeout: 10000 });

  // Ответ текстом без фразы-условия: честно «не нашлось»
  await page.locator('#imp-text').fill('I feel sick, sorry');
  await page.locator('#imp-reveal').click();
  await expect(page.locator('.ladder-fact')).toContainText('не нашлось');
  await expect(page.locator('.imp-stage .ladder-samples li')).toHaveCount(3);
  await page.locator('.imp-self[data-ok="1"]').click();

  await expect.poll(() => page.evaluate(() => DB.getSetting('improv').then((r) => r.data && r.data.spins))).toBe(1);
  const s = await page.evaluate(() => DB.getSetting('improv').then((r) => r.data));
  expect(s.condChecked).toBe(1);
  expect(s.condOk).toBe(0);
  expect(s.recent.length).toBe(1);
  await expect(page.locator('#imp-again')).toBeVisible();
  expect(errors).toEqual([]);
});

test('рулетка: «+10 с», досрочное «Готово», условие выполнено, запись идёт во «фразы вслух»', async ({ page }) => {
  await onboard(page);
  await page.evaluate(() => ImprovUI.configure({ secondMs: 200 }));
  await page.evaluate(() => ER.openPractice('improv'));
  await page.locator('#imp-roulette').click();
  await page.locator('#imp-go').click();
  const num = page.locator('#imp-num');
  await expect(page.locator('#imp-round')).toHaveAttribute('data-phase', 'talk');
  const before = Number(await num.innerText());
  await page.locator('#imp-plus').click();
  expect(Number(await num.innerText())).toBeGreaterThan(before);
  await page.waitForTimeout(1200); // запись дольше 1 «настоящей» секунды
  await page.locator('#imp-stop').click();
  const cond = (await page.locator('.imp-cond b').innerText()).replace(/[«»]/g, '');
  await page.locator('#imp-text').fill('Well... ' + cond);
  await page.locator('#imp-reveal').click();
  await expect(page.locator('.ladder-fact.is-ok')).toContainText('Условие выполнено');
  await page.locator('.imp-self[data-ok="1"]').click();
  await expect.poll(() => page.evaluate(() => DB.getStudyLog(SRS.todayStr()).then((r) => r.data && r.data.spoken))).toBe(1);
  await expect.poll(() => page.evaluate(() => DB.getSetting('improv').then((r) => r.data && r.data.spins))).toBe(1);
  const s = await page.evaluate(() => DB.getSetting('improv').then((r) => r.data));
  expect(s).toMatchObject({ spins: 1, recorded: 1, condOk: 1, condChecked: 1 });
});

test('«Yes, and…»: три хода, образцы продолжения, без автопроверки', async ({ page }) => {
  await onboard(page);
  await page.evaluate(() => ImprovUI.yesAnd({ storyId: 'pizza' }));
  await expect(page.locator('.scene-title')).toHaveText('Пицца в три ночи');
  for (let i = 1; i <= 3; i++) {
    await expect(page.locator('.scene-prompt')).toContainText(`Твой ход ${i} из 3`);
    if (i === 2) await page.locator('#ya-text').fill("Honestly? I'm okay with that.");
    await page.locator('#ya-next').click();
  }
  await expect(page.locator('.ya-review > li')).toHaveCount(3);
  await expect(page.locator('.ya-mine')).toHaveCount(1);
  await expect(page.locator('.ladder-fact')).toContainText('нет единственно верного ответа');
  await page.locator('.ya-self[data-ok="1"]').click();
  await expect.poll(() => page.evaluate(() => DB.getSetting('improv').then((r) => r.data && r.data.yesAnd))).toBe(1);
});

test('лестница, ступень 8: раунд импровизации, фраза-условие в ответе засчитывается автоматически', async ({ page }) => {
  await onboard(page);
  await page.evaluate(async () => {
    await DB.saveCard('progress', { cardId: 'cv_1001', storeName: 'conversation', status: 'learning', stability: 3, difficulty: 5,
      ease: 2.3, lapseCount: 0, reps: 1, lastReview: '2020-01-01', nextReview: SRS.todayStr(), ladder: { step: 8, best: 8, hist: {} } });
    await LadderUI.startSingle('cv_1001'); // «What's up?»
  });
  await expect(page.locator('#ladder-root')).toHaveAttribute('data-step', '8');
  await expect(page.locator('.imp-cond')).toContainText("What's up?");
  await expect(page.locator('#imp-round')).toHaveAttribute('data-phase', 'review', { timeout: 10000 });
  await page.locator('#imp-text').fill("Hey! What's up, man?");
  await page.locator('#imp-reveal').click();
  await expect(page.locator('.ladder-fact.is-ok')).toBeVisible();
  await page.locator('.imp-self').click(); // «Дальше →» — без самооценки
  await expect(page.locator('.ladder-verdict.is-ok')).toBeVisible();
  await page.locator('#ladder-next').click();
});
