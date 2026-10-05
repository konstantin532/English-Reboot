import { test, expect } from '@playwright/test';

/* Этап 3: сцены с выбором и открытыми репликами. */
test.use({
  permissions: ['microphone'],
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
});

// Блок импровизации в конце урока: N спинов с ускоренным таймером
async function doImprovSpins(page, n) {
  for (let i = 1; i <= n; i++) {
    await expect(page.locator('.session-counter')).toContainText(`Спин ${i} из ${n}`);
    // ускоренный таймер: «подумать» и «говорить» истекают сами — ждём фазу ответа
    await expect(page.locator('#imp-round')).toHaveAttribute('data-phase', 'review', { timeout: 10000 });
    await page.locator('#imp-reveal').click();
    await page.locator('.imp-self[data-ok="1"]').click();
  }
}

async function onboard(page) {
  await page.goto('/');
  const skip = page.locator('#ob-skip');
  if (await skip.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) {
    await skip.click();
    await page.locator('.ob-level').first().click();
    await page.locator('.ob-goal').first().click();
    await page.locator('#ob-finish').click();
  }
  await expect(page.locator('#onboarding-container .onboarding-overlay')).toBeHidden({ timeout: 5000 });
  await expect(page.locator('#seed-progress')).toBeHidden({ timeout: 20000 });
}

const opt = (page, text) => page.locator('.scene-opt').filter({ hasText: text });
const next = (page) => page.locator('#scene-next').click();

test('сцена: выбор ветвит сюжет, открытая реплика проверяется честно, эпизод открывает следующий', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await onboard(page);
  await page.evaluate(() => ER.openPractice('scenes'));

  // Эпизоды открываются по порядку
  await expect(page.locator('.scene-row')).toHaveCount(12);
  await expect(page.locator('.scene-play').nth(1)).toBeDisabled();
  await page.locator('.scene-play').first().click();
  await expect(page.locator('.scene-title')).toHaveText('Аэропорт JFK');

  // Грубый выбор: персонаж реагирует иначе, тренер подсказывает естественный вариант, сюжет уходит в ветку
  await opt(page, 'Can we hurry up?').click();
  await expect(page.locator('.scene-msg.is-them').last()).toContainText('Slow down');
  await expect(page.locator('.scene-tone.is-rude')).toBeVisible();
  await expect(page.locator('.scene-better')).toContainText("I'm here for business");
  await next(page);
  await expect(page.locator('.scene-msg.is-them').last()).toContainText("Let's try again"); // ветка n1b
  await opt(page, 'Sorry, long flight').click();
  await next(page);

  // Открытая реплика: смысл найден → засчитано + варианты носителя + реакция по смыслу
  await page.locator('#scene-answer').fill("I'm moving here for a year");
  await page.locator('#scene-check').click();
  await expect(page.locator('.scene-note.is-ok')).toContainText('Засчитано');
  await expect(page.locator('.scene-note.is-ok .ladder-samples li')).toHaveCount(4);
  await expect(page.locator('.scene-msg.is-them').last()).toContainText("You're gonna love it");
  await next(page);

  // Официальный тон: правильно, но персонаж смеётся — и это объясняется
  await opt(page, 'hereby declare').click();
  await expect(page.locator('.scene-tone.is-formal')).toBeVisible();
  await next(page);
  await next(page); // «Welcome to New York» → Мэгги

  // Ответ не по теме — никаких похвал: образцы и самооценка
  await page.locator('#scene-answer').fill('The weather is nice');
  await page.locator('#scene-check').click();
  await expect(page.locator('.scene-note.is-unknown')).toContainText('Автоматически проверить не получилось');
  await expect(page.locator('.scene-note.is-ok')).toHaveCount(1); // засчитана только первая реплика
  await page.locator('.scene-self[data-ok="1"]').click();

  // Конец эпизода: честная сводка, прогресс сохранён, следующий эпизод открыт
  await expect(page.locator('#scene-end')).toContainText('Естественных ответов: 1 из 3');
  await expect(page.locator('#scene-end')).toContainText('засчитано автоматически: 1 из 2');
  const p = await page.evaluate(() => DB.getSetting('scenes').then((r) => r.data['ep1-airport']));
  expect(p.done).toBe(true);
  await page.locator('#scene-list').click();
  await expect(page.locator('.scene-play').nth(1)).toBeEnabled();
  expect(errors).toEqual([]);
});

test('сцена: ответ голосом засчитывается во «фразы вслух», но не выдаётся за проверенный', async ({ page }) => {
  await onboard(page);
  await expect(page.locator('#today-start')).toBeVisible(); // стартовый экран дорисован — дальше content не перезапишется
  await page.evaluate(() => ScenesUI.play('ep2-taxi', {}));
  await opt(page, 'Brooklyn, please').click();
  await next(page);
  await page.locator('#scene-rec').click();
  await page.waitForTimeout(1200);
  await page.locator('#scene-rec-stop').click();
  await expect(page.locator('#scene-rec-status')).toContainText('Записано');
  await page.locator('#scene-check').click();
  await expect(page.locator('.scene-note.is-unknown')).toContainText('автоматически не проверить');
  await expect(page.locator('.scene-self')).toHaveCount(2);
  await expect.poll(() => page.evaluate(() => DB.getStudyLog(SRS.todayStr()).then((r) => r.data.spoken))).toBe(1);
});

test('«Сегодня»: после заданий урока идёт сцена, итог дня её отмечает', async ({ page }) => {
  test.setTimeout(90000);
  await onboard(page);
  // Все фразы уже в работе, повторять нечего — в уроке остаётся только сцена
  await page.evaluate(async () => {
    const cards = (await DB.getAll('conversation')).data.filter((c) => (c.tags || []).includes('США'));
    const later = SRS.addDays(SRS.todayStr(), 30);
    await DB.bulkPut('progress', cards.map((c) => ({ cardId: c.id, storeName: 'conversation', status: 'review', stability: 30, difficulty: 5,
      ease: 2.3, lapseCount: 0, reps: 3, lastReview: SRS.todayStr(), nextReview: later, ladder: { step: 2, best: 2, hist: {} } })));
    await ER.switchTab('today');
  });
  await expect(page.locator('.today-plan')).toContainText('Сцена — «Аэропорт JFK»');
  await page.locator('#today-start').click();
  await expect(page.locator('.scene-title')).toHaveText('Аэропорт JFK');

  // Пауза посреди сцены — урок продолжается со сцены
  await page.locator('#scene-quit').click();
  await expect(page.locator('.today-sub')).toContainText('Осталась сцена «Аэропорт JFK»');
  await page.locator('#today-continue').click();

  await opt(page, "I'm here for business").click(); await next(page);
  await page.locator('#scene-answer').fill('About a year'); await page.locator('#scene-check').click(); await next(page);
  await opt(page, 'No, nothing to declare').click(); await next(page);
  await next(page);
  await page.locator('#scene-answer').fill('I just landed!'); await page.locator('#scene-check').click(); await next(page);
  await page.locator('#scene-done').click();

  // после сцены — импровизация, затем итог дня
  await page.evaluate(() => ImprovUI.configure({ secondMs: 40 }));
  await doImprovSpins(page, 2);
  await expect(page.locator('#today-summary')).toBeVisible();
  await expect(page.locator('#today-scene-done')).toContainText('Сцена «Аэропорт JFK» пройдена');
});

test('лестница, ступень 7: ответ с фразой засчитан автоматически, без фразы — образцы и самооценка', async ({ page }) => {
  await onboard(page);
  await expect(page.locator('#today-start')).toBeVisible();
  const setStep7 = () => page.evaluate(async () => {
    await DB.saveCard('progress', { cardId: 'cv_1001', storeName: 'conversation', status: 'learning', stability: 3, difficulty: 5,
      ease: 2.3, lapseCount: 0, reps: 1, lastReview: '2020-01-01', nextReview: SRS.todayStr(), ladder: { step: 7, best: 7, hist: {} } });
    await LadderUI.startSingle('cv_1001'); // «What's up?»
  });
  await setStep7();
  await expect(page.locator('#ladder-root')).toHaveAttribute('data-step', '7');
  await page.locator('#ladder-input').fill("Hey Jake! What's up, man?");
  await page.locator('#ladder-done').click();
  await expect(page.locator('.ladder-fact.is-ok')).toContainText('Засчитано');
  await expect(page.locator('.ladder-verdict.is-ok')).toBeVisible();
  await expect(page.locator('.ladder-selfbtn')).toHaveCount(0);

  await page.evaluate(() => ER.switchTab('today'));
  await setStep7();
  await page.locator('#ladder-input').fill('Good morning, how are you?');
  await page.locator('#ladder-done').click();
  await expect(page.locator('.ladder-fact')).toContainText('автоматически не засчитать');
  await expect(page.locator('.ladder-selfbtn')).toHaveCount(2);
});

test('партия 2: «Первый рабочий день» проходится целиком, после 11-го эпизода открывается финал', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await onboard(page);
  // Пройдены эпизоды 1–4: открыт 5-й
  await page.evaluate(async () => {
    const done = {};
    ['ep1-airport', 'ep2-taxi', 'ep3-apartment', 'ep4-coffee'].forEach((id) => { done[id] = { done: true, plays: 1 }; });
    await DB.saveSetting('scenes', done);
  });
  await page.evaluate(() => ER.openPractice('scenes'));
  await expect(page.locator('.scene-play').nth(4)).toBeEnabled();
  await expect(page.locator('.scene-play').nth(5)).toBeDisabled();
  await page.locator('.scene-play').nth(4).click();
  await expect(page.locator('.scene-title')).toHaveText('Первый рабочий день');

  await opt(page, 'The subway was packed').click();
  await next(page);
  await page.locator('#scene-answer').fill("I'm from Kazan. I worked in marketing for five years.");
  await page.locator('#scene-check').click();
  await expect(page.locator('.scene-note.is-ok')).toContainText('рассказ о себе');
  await next(page);
  await opt(page, "what's the deadline").click();
  await expect(page.locator('.scene-msg.is-them').last()).toContainText("it's due Friday");
  await next(page);
  await opt(page, 'Can you walk me through it?').click();
  await next(page);
  // «Of course not» — отказ, а не согласие
  await page.locator('#scene-answer').fill('Of course not, I have a call at three.');
  await page.locator('#scene-check').click();
  await expect(page.locator('.scene-note.is-ok').last()).toContainText('вежливый отказ');
  await next(page);
  await expect(page.locator('#scene-end')).toContainText('Естественных ответов: 3 из 3');
  await expect(page.locator('#scene-end')).toContainText('засчитано автоматически: 2 из 2');
  await page.locator('#scene-list').click();
  await expect(page.locator('.scene-play').nth(5)).toBeEnabled();

  // Пройдены 1–11: финал открыт
  await page.evaluate(async () => {
    const done = {};
    SCENE_EPISODES.slice(0, 11).forEach((ep) => { done[ep.id] = { done: true, plays: 1 }; });
    await DB.saveSetting('scenes', done);
  });
  await page.evaluate(() => ER.openPractice('scenes'));
  await expect(page.locator('.scene-play').nth(11)).toBeEnabled();
  await page.locator('.scene-play').nth(11).click();
  await expect(page.locator('.scene-title')).toHaveText('Месяц в Нью-Йорке');
  expect(errors).toEqual([]);
});
