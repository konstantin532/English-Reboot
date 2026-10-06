import { test, expect } from '@playwright/test';

/* Этап 2: «Сегодня» — урок за 15 минут. Микрофон подменён фейковым устройством Chromium. */
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
  await expect(page.locator('#onboarding-container .onboarding-overlay')).toBeHidden({ timeout: 5000 });
  await expect(page.locator('#seed-progress')).toBeHidden({ timeout: 20000 });
}

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

async function recordAloud(page) {
  await page.locator('#ladder-rec').click();
  await page.waitForTimeout(1200); // «фраза вслух» засчитывается от 1 секунды
  await page.locator('#ladder-rec-stop').click();
  await expect(page.locator('#ladder-rec-status')).toContainText('Записано');
}

// Пройти текущее задание: знакомство — записать и дальше; ступень 1 — выбрать озвученное.
// Ждём, пока отрисуется следующее задание (или итог), чтобы не читать старый экран.
async function doTask(page) {
  const counter = await page.locator('.session-counter').innerText();
  const kind = await page.locator('#ladder-root').getAttribute('data-kind');
  if (kind === 'intro') {
    await recordAloud(page);
    await page.locator('#ladder-intro-next').click();
  } else {
    const said = await page.locator('.ladder-play').first().getAttribute('data-say');
    await page.locator('.ladder-opt').filter({ hasText: said }).first().click();
    await page.locator('#ladder-next').click();
  }
  await expect.poll(async () => (await page.locator('#today-summary, #scene-root, #words-root').first().isVisible().catch(() => false))
    || (await page.locator('.session-counter').innerText().catch(() => counter)) !== counter).toBe(true);
  return kind === 'intro' ? 'intro' : 'ex';
}

// Слова урока: верный вариант берём из карточки в базе; wrong — сколько первых слов ответить неверно
async function doWords(page, n, wrong = 0) {
  for (let i = 1; i <= n; i++) {
    await expect(page.locator('#words-root .session-counter')).toContainText(`Слово ${i} из ${n}`);
    const id = await page.locator('#words-root').getAttribute('data-id');
    const t = await page.evaluate(async (cid) => (await DB.getByKey('words', cid)).data.payload.test[0], id);
    const pick = i <= wrong ? (t.correct + 1) % t.options.length : t.correct;
    await page.waitForTimeout(350); // экран слова первые 300 мс не принимает клики (защита от двойного клика)
    await page.locator('.words-opt').nth(pick).click();
    await expect(page.locator('#words-feedback')).toContainText(i <= wrong ? 'Правильно:' : 'Верно');
    await page.locator('#words-next').click();
  }
}

test('«Сегодня»: после онбординга урок открывается одним кликом и доходит до итога дня', async ({ page }) => {
  test.setTimeout(150000); // 12 заданий, три записи голоса по 1+ с, слова и сцена
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await onboard(page);

  // Стартовый экран — «Сегодня», одна кнопка
  await expect.poll(() => page.evaluate(() => document.body.dataset.tab)).toBe('today');
  await expect(page.locator('.today-start')).toHaveCount(1);
  await expect(page.locator('.today-plan')).toContainText('3 фразы');
  await expect(page.locator('.today-plan')).toContainText('Слова — 5 слов: послушай и выбери значение');
  await expect(page.locator('.today-plan')).toContainText('Сцена — «Аэропорт JFK»');
  await expect(page.locator('.today-plan')).toContainText('Импровизация — 2 ситуации');

  await page.locator('#today-start').click();

  // Первое задание — знакомство с новой фразой и запись вслух (фраза вслух в первые минуты)
  await expect(page.locator('#ladder-root')).toHaveAttribute('data-kind', 'intro');
  await expect(page.locator('#ladder-rec')).toBeVisible();

  const done = { intro: 0, ex: 0 };
  for (let i = 0; i < 30 && !(await page.locator('#scene-root, #words-root').first().isVisible().catch(() => false)); i++) {
    done[await doTask(page)]++;
  }
  expect(done).toEqual({ intro: 3, ex: 9 });

  // Слова урока: 5 новых слов, первое — неверно; ответы записаны в FSRS
  await doWords(page, 5, 1);
  const words = await page.evaluate(async () => (await DB.getAllProgress()).data.filter((r) => /^wd_/.test(r.cardId)).length);
  expect(words).toBe(5);

  // После заданий — сцена истории: проходим «Аэропорт JFK» естественными ответами
  await expect(page.locator('.scene-title')).toHaveText('Аэропорт JFK');
  const opt = (t) => page.locator('.scene-opt').filter({ hasText: t }).click();
  const next = () => page.locator('#scene-next').click();
  await opt("I'm here for business"); await next();
  await page.locator('#scene-answer').fill('For a year'); await page.locator('#scene-check').click(); await next();
  await opt('No, nothing to declare'); await next();
  await next();
  await page.locator('#scene-answer').fill('I just landed!'); await page.locator('#scene-check').click(); await next();
  await page.locator('#scene-done').click();

  // В конце — 2 спина импровизации
  await page.evaluate(() => ImprovUI.configure({ secondMs: 40 }));
  await doImprovSpins(page, 2);

  // Итог дня: честные цифры из статистики дня
  const summary = page.locator('#today-summary');
  await expect(summary).toContainText('Сказано вслух: 3 фразы');
  await expect(summary).toContainText('Открыто ступеней: 3');
  await expect(summary).toContainText('серия 1 день');
  await expect(summary).toContainText('Сцена «Аэропорт JFK» пройдена');
  await expect(summary).toContainText('Импровизаций: 2');
  await expect(summary).toContainText('Слова: 4 из 5 — верно');

  // Главная: урок дня пройден, плитки обновились
  await page.locator('#today-home').click();
  await expect(page.locator('#today-start')).toHaveText('Ещё урок');
  await expect(page.locator('#today-spoken b')).toHaveText('3');
  await expect(page.locator('#today-steps b')).toHaveText('3');
  expect(errors).toEqual([]);
});

test('«Сегодня»: урок можно прервать и продолжить — и после перезагрузки', async ({ page }) => {
  await onboard(page);
  await page.locator('#today-start').click();
  await doTask(page); // знакомство 1
  await doTask(page); // знакомство 2
  await expect(page.locator('.session-counter')).toContainText('Задание 3 из 12');
  await page.locator('#ladder-quit').click();

  await expect(page.locator('#today-continue')).toBeVisible();
  await expect(page.locator('.today-sub')).toContainText('Задание 3 из 12');
  await page.reload();
  await expect(page.locator('#today-continue')).toBeVisible({ timeout: 20000 });

  await page.locator('#today-continue').click();
  await expect(page.locator('.session-counter')).toContainText('Задание 3 из 12');
  await expect(page.locator('#ladder-root')).toHaveAttribute('data-kind', 'intro');
  // уже записанные фразы вслух засчитаны в день
  await expect.poll(() => page.evaluate(() => DB.getStudyLog(SRS.todayStr()).then((r) => r.data.spoken))).toBe(2);
});

test('«Сегодня»: разминка — фразы, которые пора повторить по FSRS', async ({ page }) => {
  await onboard(page);
  await page.evaluate(async () => {
    const today = SRS.todayStr();
    for (const id of ['cv_1101', 'cv_1102']) {
      await DB.saveCard('progress', { cardId: id, storeName: 'conversation', status: 'review', stability: 5, difficulty: 5,
        ease: 2.3, lapseCount: 0, reps: 3, lastReview: '2020-01-01', nextReview: today, ladder: { step: 1, best: 1, hist: {} } });
    }
    await ER.switchTab('today');
  });
  await expect(page.locator('.today-plan')).toContainText('Разминка — 2 фразы на повтор');
  await page.locator('#today-start').click();
  await expect(page.locator('.session-counter')).toContainText('Задание 1 из 14 · Разминка');
  await expect(page.locator('#ladder-root')).toHaveAttribute('data-kind', 'choice');
});
