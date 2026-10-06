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

test('Minimal Pairs: тренажёр на слух — раунд, ответ, а смена вкладки (в ядре) сбрасывает раунд (в модуле)', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await onboard(page);
  await page.evaluate(() => ER.openCardAnywhere('minimal_pairs', 'mp_002'));
  const fb = page.locator('#pair-feedback');
  await page.locator('.pair-option').first().click();
  await expect(fb).toContainText('Сначала нажмите');
  await page.locator('.play-random').click();
  await expect(fb).toContainText('прослушивание 1 из 3');
  await page.locator('.pair-option').nth(0).click();
  if (!(await fb.innerText()).includes('Верно!')) await page.locator('.pair-option').nth(1).click();
  await expect(fb).toContainText('✓ Верно!');
  await page.locator('.pair-option').first().click();
  await expect(fb).toContainText('Раунд завершён');

  // switchTab в ядре обнуляет pairRound — модуль библиотеки должен увидеть это через контекст
  await page.evaluate(() => ER.switchTab('today'));
  await page.evaluate(() => ER.openCardAnywhere('minimal_pairs', 'mp_002'));
  await page.locator('.pair-option').first().click();
  await expect(page.locator('#pair-feedback')).toContainText('Сначала нажмите');
  expect(errors).toEqual([]);
});

test('Minimal Pairs: уход с вкладки сразу после неверного ответа — без ошибки и без повтора старого слова', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await onboard(page);
  // Считаем озвучки и фиксируем загаданное слово (Math.random() = 0 → word1)
  await page.evaluate(() => {
    window.__spoken = [];
    const orig = TTS.speak.bind(TTS);
    TTS.speak = (text, rate) => { window.__spoken.push(text); return orig(text, rate); };
    window.__rnd = Math.random;
    Math.random = () => 0;
  });
  const openAndMiss = async () => {
    await page.evaluate(() => ER.openCardAnywhere('minimal_pairs', 'mp_002'));
    await page.locator('.play-random').click();
    await expect(page.locator('#pair-feedback')).toContainText('прослушивание 1 из 3');
    await page.locator('.pair-option').nth(1).click(); // word2 — неверно
    await expect(page.locator('#pair-feedback')).toContainText('Неверно');
  };

  // 1) Смена вкладки до повтора: раньше — TypeError в setTimeout
  await openAndMiss();
  await page.evaluate(() => ER.switchTab('today'));
  const n1 = await page.evaluate(() => window.__spoken.length);
  await page.waitForTimeout(900);
  expect(await page.evaluate(() => window.__spoken.length)).toBe(n1);

  // 2) Остался на карточке — повтор звучит (поведение сохранено)
  await openAndMiss();
  const n2 = await page.evaluate(() => window.__spoken.length);
  await expect.poll(() => page.evaluate(() => window.__spoken.length)).toBe(n2 + 1);

  // 3) Переоткрыл ту же пару до повтора — старый раунд не озвучивается
  await openAndMiss();
  await page.evaluate(() => ER.openCardAnywhere('minimal_pairs', 'mp_002'));
  const n3 = await page.evaluate(() => window.__spoken.length);
  await page.waitForTimeout(900);
  expect(await page.evaluate(() => window.__spoken.length)).toBe(n3);

  await page.evaluate(() => { Math.random = window.__rnd; });
  expect(errors).toEqual([]);
});

test('Чтение: слово открывается во всплывающем окне, уходит в словарик, Escape закрывает окно', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await onboard(page);
  await page.evaluate(() => ER.openCardAnywhere('readings', 'rd_003'));
  const word = page.locator('.reading-text span.rw').first();
  const w = (await word.innerText()).trim();
  await word.click();
  await expect(page.locator('#word-popup')).toBeVisible();
  await page.locator('#word-popup .add-to-wordbank').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#word-popup')).toHaveCount(0);
  await page.locator('.open-wordbank-btn').click();
  await expect(page.locator('body')).toContainText(w.replace(/[^A-Za-z'-]/g, ''));
  expect(errors).toEqual([]);
});
