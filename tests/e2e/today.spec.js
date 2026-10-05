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
  await expect.poll(async () => (await page.locator('#today-summary').isVisible().catch(() => false))
    || (await page.locator('.session-counter').innerText().catch(() => counter)) !== counter).toBe(true);
  return kind === 'intro' ? 'intro' : 'ex';
}

test('«Сегодня»: после онбординга урок открывается одним кликом и доходит до итога дня', async ({ page }) => {
  test.setTimeout(90000); // 12 заданий, три записи голоса по 1+ с
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await onboard(page);

  // Стартовый экран — «Сегодня», одна кнопка
  await expect.poll(() => page.evaluate(() => document.body.dataset.tab)).toBe('today');
  await expect(page.locator('.today-start')).toHaveCount(1);
  await expect(page.locator('.today-plan')).toContainText('3 фразы');

  await page.locator('#today-start').click();

  // Первое задание — знакомство с новой фразой и запись вслух (фраза вслух в первые минуты)
  await expect(page.locator('#ladder-root')).toHaveAttribute('data-kind', 'intro');
  await expect(page.locator('#ladder-rec')).toBeVisible();

  const done = { intro: 0, ex: 0 };
  for (let i = 0; i < 30 && !(await page.locator('#today-summary').isVisible().catch(() => false)); i++) {
    done[await doTask(page)]++;
  }
  expect(done).toEqual({ intro: 3, ex: 9 });

  // Итог дня: честные цифры из статистики дня
  const summary = page.locator('#today-summary');
  await expect(summary).toContainText('Ты сказал вслух 3 фразы');
  await expect(summary).toContainText('открыл 3 ступени');
  await expect(summary).toContainText('серия 1 день');

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
