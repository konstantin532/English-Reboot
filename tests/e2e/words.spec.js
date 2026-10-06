import { test, expect } from '@playwright/test';

/* Пакет A1, часть 1: раздел «Слова» и обновление базы со старой версии (у тех, кто уже учится). */

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

test('раздел «Слова»: 400 слов A1, перевод примеров под строкой, 5 вопросов в карточке', async ({ page }) => {
  await onboard(page);
  await page.locator('.nav-link[data-tab="words"]').click();
  await expect(page.locator('.list-summary')).toContainText('из 400');
  const first = page.locator('.vocab-tile').first();
  await expect(first).toContainText('water');
  await expect(first).toContainText('A1');
  await first.click();
  await expect(page.locator('.detail-title')).toContainText('water');
  await expect(page.locator('.category-badge')).toHaveText('сущ. · Еда и напитки');
  await expect(page.locator('.example-ru').first()).toHaveText('Можно мне воды?');
  await expect(page.locator('.example-text').first()).toContainText('ˈwɔtɚ'); // американская IPA
  await expect(page.locator('#test-progress')).toHaveText('Отвечено 0/5');
});

test('обновление базы v1 → v2: прогресс на месте, раздел «Слова» загрузился', async ({ page }) => {
  // Состояние «до обновления»: база версии 1 со старыми 18 хранилищами и прогрессом по фразе
  await page.goto('/manifest.json');
  await page.evaluate(() => new Promise((resolve, reject) => {
    const OLD = ['grammar_cards', 'phrasal_verbs', 'collocations', 'idioms', 'conversation', 'slang', 'minimal_pairs',
      'readings', 'culture_notes', 'personal_deck', 'progress', 'settings', 'achievements', 'errors_log', 'word_bank',
      'study_log', 'backups', 'content_meta'];
    const KEY = { progress: 'cardId', settings: 'key', errors_log: 'cardId', word_bank: 'word', study_log: 'date', backups: 'date', content_meta: 'key' };
    const req = indexedDB.open('english_reboot', 1);
    req.onupgradeneeded = () => OLD.forEach((n) => req.result.createObjectStore(n, { keyPath: KEY[n] || 'id', autoIncrement: n === 'personal_deck' }));
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(['progress', 'settings'], 'readwrite');
      tx.objectStore('progress').put({ cardId: 'cv_1001', storeName: 'conversation', status: 'learning', stability: 4, difficulty: 5,
        ease: 2.3, lapseCount: 0, reps: 3, lastReview: '2026-01-01', nextReview: '2026-01-05', ladder: { step: 3, best: 3, hist: {} } });
      tx.objectStore('settings').put({ key: 'onboarding_complete', value: true }); // ученик уже прошёл знакомство
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  }));
  await onboard(page);
  const st = await page.evaluate(async () => ({
    words: (await DB.getAll('words')).data.length,
    kept: (await DB.getByKey('progress', 'cv_1001')).data,
    version: (await DB.getByKey('content_meta', 'words_version')).data.value,
  }));
  expect(st.words).toBe(400);
  expect(st.kept.reps).toBe(3);
  expect(st.kept.ladder.step).toBe(3);
  expect(st.version).toBe('1.1.0');
});

test('«Сегодня» → слова урока: неверный ответ показывает правильный, урок можно прервать и продолжить со слов', async ({ page }) => {
  await onboard(page);
  // Все фразы уже в работе — в уроке слова, затем сцена и импровизация
  await page.evaluate(async () => {
    const cards = (await DB.getAll('conversation')).data.filter((c) => (c.tags || []).includes('США'));
    const later = SRS.addDays(SRS.todayStr(), 30);
    await DB.bulkPut('progress', cards.map((c) => ({ cardId: c.id, storeName: 'conversation', status: 'review', stability: 30, difficulty: 5,
      ease: 2.3, lapseCount: 0, reps: 3, lastReview: SRS.todayStr(), nextReview: later, ladder: { step: 2, best: 2, hist: {} } })));
    await ER.switchTab('today');
  });
  await expect(page.locator('.today-plan')).toContainText('Слова — 5 слов');
  await page.locator('#today-start').click();
  await expect(page.locator('#words-root .session-counter')).toContainText('Слово 1 из 5 · Новое слово');
  await expect(page.locator('.words-word')).toHaveText('water');
  await expect(page.locator('.words-ipa')).toContainText('/ˈwɔtɚ/');

  // неверный вариант: подсветка, правильный ответ и пример с переводом; FSRS — «не знаю»
  const t = await page.evaluate(async () => (await DB.getByKey('words', 'wd_0001')).data.payload.test[0]);
  await page.locator('.words-opt').nth((t.correct + 1) % 4).click();
  await expect(page.locator('.words-opt.is-wrong')).toHaveCount(1);
  await expect(page.locator('.words-opt.is-correct')).toHaveText('вода');
  await expect(page.locator('#words-feedback')).toContainText('Правильно: water — вода');
  await expect(page.locator('#words-feedback')).toContainText('Можно мне воды?');
  await expect.poll(() => page.evaluate(async () => ((await DB.getByKey('progress', 'wd_0001')).data || {}).reps)).toBe(1);

  // прервать: на главной — «Остались слова: 4 из 5», после перезагрузки — дальше со второго слова
  await page.locator('#words-quit').click();
  await expect(page.locator('.today-sub')).toContainText('Остались слова: 4 из 5');
  await page.reload();
  await expect(page.locator('#today-continue')).toBeVisible({ timeout: 20000 });
  await page.locator('#today-continue').click();
  await expect(page.locator('#words-root .session-counter')).toContainText('Слово 2 из 5');
  await expect(page.locator('.words-word')).toHaveText('coffee');
});
