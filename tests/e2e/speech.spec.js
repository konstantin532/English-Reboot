import { test, expect } from '@playwright/test';

/* Этап 5: проверка голоса. SpeechRecognition подменён: «распознаёт» то, что тест положил
   в window.__srNext (массив альтернатив); пустой массив — ошибка no-speech. */
const FAKE_SR = () => {
  class FakeSR {
    constructor() { this.continuous = false; this.lang = ''; this.maxAlternatives = 1; }
    start() {
      const alts = window.__srNext || [];
      const emit = () => {
        if (!alts.length) { if (this.onerror) this.onerror({ error: 'no-speech' }); return; }
        const r = alts.map((t) => ({ transcript: t, confidence: 0.9 }));
        r.isFinal = true;
        if (this.onresult) this.onresult({ results: [r], resultIndex: 0 });
      };
      if (this.continuous) { this._t = setTimeout(emit, 30); return; }
      setTimeout(() => { emit(); if (this.onend) this.onend(); }, 60);
    }
    stop() { if (this.continuous) setTimeout(() => { if (this.onend) this.onend(); }, 10); }
    abort() { if (this.onend) this.onend(); }
  }
  window.SpeechRecognition = FakeSR;
  window.webkitSpeechRecognition = FakeSR;
};
const NO_SR = () => { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; };

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
}

async function openStep(page, front, step) {
  await page.evaluate(async ({ front, step }) => {
    const card = (await DB.getAll('conversation')).data.find((c) => c.payload.front === front);
    await DB.saveCard('progress', { cardId: card.id, storeName: 'conversation', status: 'learning', stability: 3, difficulty: 5,
      ease: 2.3, lapseCount: 0, reps: 1, lastReview: '2020-01-01', nextReview: SRS.todayStr(), ladder: { step, best: step, hist: {} } });
    await LadderUI.startSingle(card.id);
  }, { front, step });
  await expect(page.locator('#ladder-root')).toHaveAttribute('data-step', String(step));
}

test.describe('с распознаванием речи', () => {
  test.beforeEach(async ({ page }) => { await page.addInitScript(FAKE_SR); });

  test('согласие спрашивается один раз; «Не сейчас» выключает проверку, в Настройках можно включить', async ({ page }) => {
    await onboard(page);
    await openStep(page, 'Can you pass the salt?', 6);
    await page.locator('.speech-btn').click();
    await expect(page.locator('#modal-zone .modal-card')).toContainText('Проверка голоса');
    await expect(page.locator('#modal-zone .modal-card')).toContainText('сервер');
    await page.locator('#speech-no').click();
    await expect(page.locator('.speech-check')).toHaveCount(0);
    await expect(page.locator('.ladder-selfbtn')).toHaveCount(2); // самооценка осталась

    await page.evaluate(() => ER.switchTab('settings'));
    await expect(page.locator('#set-speech')).toHaveValue('off');
    await page.locator('#set-speech').selectOption('on');
    await expect.poll(() => page.evaluate(() => DB.getSetting('speech_check').then((r) => r.data))).toBe('on');
  });

  test('ступень 6: ≥80 — засчитано автоматически; ловушки идут в паспорт по словам', async ({ page }) => {
    await onboard(page);
    await page.evaluate(() => SpeechUI._setConsent('on'));
    await openStep(page, 'Can you pass the salt?', 6);
    await page.evaluate(() => { window.__srNext = ['yes can you pass the salt', 'yes can you pass the sold']; });
    await page.locator('.speech-btn').click();
    await expect(page.locator('.sp-score b')).toHaveText('100');
    await expect(page.locator('.sp-heard')).toContainText('yes can you pass the salt');
    await expect(page.locator('.ladder-verdict.is-ok')).toBeVisible();
    await expect(page.locator('.ladder-selfbtn')).toHaveCount(0);
    await page.locator('#ladder-next').click();
    await expect.poll(() => page.evaluate(() => DB.getSetting('accent_passport').then((r) => r.data && r.data.ae.hist))).toEqual([true]);
    const p = await page.evaluate(() => DB.getSetting('accent_passport').then((r) => r.data));
    expect(p.th.hist).toEqual([true]);
    await expect.poll(() => page.evaluate(() => DB.getStudyLog(SRS.todayStr()).then((r) => r.data.spoken))).toBe(1);
  });

  test('ступень 6: ошибки подсвечены, ниже 80 — самооценка, «sink» вместо «think» — минус ловушке th', async ({ page }) => {
    await onboard(page);
    await page.evaluate(() => SpeechUI._setConsent('on'));
    await openStep(page, "I'll think about it", 6);
    const text = await page.evaluate(() => document.querySelector('.ladder-phrase .example-text').innerText.replace(/\s+/g, ' '));
    expect(text.length).toBeGreaterThan(0);
    await page.evaluate(() => { window.__srNext = ['I sink'] ; }); // «think» услышано как «sink», остальное не расслышано
    await page.locator('.speech-btn').click();
    await expect(page.locator('.sp-word.is-wrong, .sp-word.is-missing').first()).toBeVisible();
    await expect(page.locator('.sp-score')).not.toHaveClass(/is-pass/);
    await expect(page.locator('.ladder-selfbtn')).toHaveCount(2);
    await page.locator('.ladder-selfbtn[data-ok="0"]').click();
    await page.locator('#ladder-next').click();
    await expect.poll(() => page.evaluate(() => DB.getSetting('accent_passport').then((r) => r.data && r.data.th.hist))).toEqual([false]);
  });

  test('сцена: ответ голосом распознаётся в текст и проходит честную проверку по смыслу', async ({ page }) => {
    await onboard(page);
    await page.evaluate(() => SpeechUI._setConsent('on'));
    await page.evaluate(() => ScenesUI.play('ep1-airport', {}));
    await page.locator('.scene-opt').filter({ hasText: "I'm here for business" }).click();
    await expect(page.locator('.speech-btn')).toBeVisible(); // проверка естественного варианта
    await page.locator('#scene-next').click();
    await page.evaluate(() => { window.__srNext = ['for about a year']; });
    await page.locator('.speech-voice').click();
    await expect(page.locator('#scene-answer')).toHaveValue('for about a year');
    await page.locator('#scene-check').click();
    await expect(page.locator('.scene-note.is-ok')).toContainText('Засчитано');
  });

  test('импровизация: ответ распознаётся фоном, условие проверяется и для голоса', async ({ page }) => {
    await onboard(page);
    await page.evaluate(() => { SpeechUI._setConsent('on'); ImprovUI.configure({ secondMs: 40 }); });
    await page.evaluate(() => ER.openPractice('improv'));
    await page.locator('#imp-roulette').click();
    const cond = (await page.locator('.imp-cond b').innerText()).replace(/[«»]/g, '');
    await page.evaluate((c) => { window.__srNext = ['well ' + c]; }, cond);
    await expect(page.locator('#imp-round')).toHaveAttribute('data-phase', 'review', { timeout: 10000 });
    await expect(page.locator('#imp-text')).not.toHaveValue('');
    await expect(page.locator('#imp-heard')).toContainText('Распознано автоматически');
    await page.locator('#imp-reveal').click();
    await expect(page.locator('.ladder-fact.is-ok')).toContainText('Условие выполнено');
  });

  test('тишина — понятное сообщение, без оценки и без зачёта', async ({ page }) => {
    await onboard(page);
    await page.evaluate(() => SpeechUI._setConsent('on'));
    await openStep(page, 'Can you pass the salt?', 6);
    await page.evaluate(() => { window.__srNext = []; });
    await page.locator('.speech-btn').click();
    await expect(page.locator('.speech-status')).toContainText('Не удалось расслышать');
    await expect(page.locator('.sp-score')).toHaveCount(0);
    await expect(page.locator('.ladder-selfbtn')).toHaveCount(2);
  });
});

test('без распознавания речи: проверки нет, всё работает по записи и самооценке', async ({ page }) => {
  await page.addInitScript(NO_SR);
  await onboard(page);
  await openStep(page, 'Can you pass the salt?', 6);
  await expect(page.locator('.speech-btn')).toHaveCount(0);
  await expect(page.locator('.ladder-selfbtn')).toHaveCount(2);
  await page.evaluate(() => ER.switchTab('settings'));
  await expect(page.locator('#speech-support')).toContainText('не умеет распознавать');
  await expect(page.locator('#set-speech')).toBeDisabled();
});
