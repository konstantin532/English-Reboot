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

test('ловушки: мини-тренажёр — 5 пар на слух, результат пишется в паспорт акцента', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await start(page);
  await openPhrase(page, 'Can you pass the salt?');
  await page.locator('.trap-chip', { hasText: 'bad ≠ bed' }).click();
  await page.locator('.trap-drill-btn').click();

  const drill = page.locator('#trap-drill');
  for (let i = 1; i <= 5; i++) {
    await expect(drill.locator('.session-counter')).toContainText(`пара ${i} из 5`);
    await expect(drill.locator('.trap-drill-opt')).toHaveCount(2);
    await drill.locator('.trap-drill-opt').first().click();
    await expect(drill.locator('.ladder-verdict')).toBeVisible();
    await expect(drill).not.toContainText('Неверно');
    await drill.locator('#trap-drill-next').click();
  }
  await expect(drill.locator('.trap-drill-score')).toContainText('из 5');

  const passport = await page.evaluate(() => DB.getSetting('accent_passport').then((r) => r.data));
  expect(passport.ae.total).toBe(5);
  expect(passport.ae.hist.length).toBe(5);
  await drill.locator('#trap-drill-close').click();
  await expect(drill).toBeHidden();
  expect(errors).toEqual([]);
});

test('паспорт акцента: 10 ловушек на «Прогрессе», тренировка из паспорта, лестница пополняет паспорт', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await start(page);

  // Лестница, ступень 1 «Узнай на слух»: верный ответ засчитывается всем ловушкам фразы
  await page.evaluate(async () => {
    const card = (await DB.getAll('conversation')).data.find((c) => c.payload.front === 'Can you pass the salt?');
    await LadderUI.startSingle(card.id);
  });
  const said = await page.locator('.ladder-play').first().getAttribute('data-say');
  await page.locator('.ladder-opt').filter({ hasText: said }).first().click();
  await page.locator('#ladder-next').click();
  await expect.poll(() => page.evaluate(() => DB.getSetting('accent_passport').then((r) => r.data && r.data.ae && r.data.ae.total)))
    .toBe(1);
  await page.locator('#ladder-quit').click();
  await page.locator('#ladder-close').click();

  // Паспорт на вкладке «Прогресс»
  await page.locator('[data-tab="progress"]').first().click();
  const passport = page.locator('#accent-passport');
  await expect(passport.locator('.passport-row')).toHaveCount(10);
  await expect(passport.locator('.passport-row.is-progress')).not.toHaveCount(0); // ловушки фразы «в работе»
  await expect(passport.locator('.passport-row.is-new')).not.toHaveCount(0);
  await expect(passport).toContainText('Побеждено ловушек: 0 из 10');

  // «Тренировать» открывает тренажёр этой ловушки, ответы обновляют паспорт на месте
  await passport.locator('.passport-row', { hasText: 'th [θ ð]' }).locator('.passport-train').click();
  const drill = page.locator('#trap-drill');
  await expect(drill).toContainText('th [θ ð]');
  await drill.locator('.trap-drill-opt').first().click();
  await expect(passport.locator('.passport-row', { hasText: 'th [θ ð]' })).toHaveClass(/is-progress/);
  expect(errors).toEqual([]);
});

test('паспорт акцента: лестница первыми берёт новые фразы со слабой ловушкой', async ({ page }) => {
  await start(page);
  const firstPhrase = async () => {
    await page.evaluate(() => ER.switchTab('practice'));
    await page.locator('.mode-btn[data-mode="ladder"]').click();
    await page.locator('#ladder-theme').selectOption('Знакомство и small talk');
    await page.locator('#ladder-start').click();
    const said = await page.locator('.ladder-play').first().getAttribute('data-say');
    const traps = await page.evaluate(async (t) => AccentTraps.trapIdsOf(t, await TrapsUI.ensureLookup()), said);
    await page.evaluate(() => ER.switchTab('practice')); // выйти без сохранения ответов
    return { said, traps };
  };

  const before = await firstPhrase();
  expect(before.traps).not.toContain('th'); // по порядку темы первой идёт фраза без th

  // th «в работе» (встречалась, не побеждена)
  await page.evaluate(async () => {
    let p = null;
    [false, false, true].forEach((ok) => { p = AccentTraps.recordResult(p, 'th', ok); });
    await DB.saveSetting('accent_passport', p);
  });
  const after = await firstPhrase();
  expect(after.traps).toContain('th');
  expect(after.said).not.toBe(before.said);
});
