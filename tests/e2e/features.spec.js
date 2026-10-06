import { test, expect } from '@playwright/test';

/* Ключевые сценарии v1.1: офлайн, FSRS, транскрипция, озвучка, навигация, IELTS.
   Онбординг проходим через «Я определю сам» (детерминированно). */
async function start(page) {
  await page.goto('/');
  const skip = page.locator('#ob-skip');
  // isVisible() не ждёт — дожидаемся появления онбординга явно
  if (await skip.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) {
    await skip.click();
    await page.locator('.ob-level').nth(1).click();
    await page.locator('.ob-goal').first().click();
    await page.locator('#ob-finish').click();
  }
  await expect(page.locator('#onboarding-container .onboarding-overlay')).toBeHidden({ timeout: 5000 });
  // контент засеян в IndexedDB
  await expect.poll(() => page.evaluate(() => DB.getAll('conversation').then((r) => r.data.length)), { timeout: 15000 })
    .toBeGreaterThan(1100);
  // первая загрузка: пока засеивается контент, экран закрыт индикатором
  await expect(page.locator('#seed-progress')).toBeHidden({ timeout: 20000 });
}

test('меню-«карта линий»: группы и значки, полоса шапки меняет цвет', async ({ page }) => {
  await start(page);
  const nav = page.locator('#main-nav');
  await expect(nav).toBeVisible();
  await expect(nav.locator('.nav-group')).toHaveCount(3); // Библиотека, Практика, Я; «Сегодня» — над группами
  await expect(nav.locator('.nav-link .line-bullet')).toHaveCount(15);
  await expect(nav.locator('.nav-link').first()).toHaveAttribute('data-tab', 'today');
  await page.locator('.nav-link[data-tab="reading"]').click();
  await expect.poll(() => page.evaluate(() => document.body.dataset.tab)).toBe('reading');
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--line').trim().toUpperCase()))
    .toBe('#00933C');
});

test('карточка: русская транскрипция под словами, клик по слову озвучивает его', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    window.__spoken = [];
    const orig = TTS.speak;
    TTS.speak = (text, rate) => { window.__spoken.push(text); return orig(text, rate); };
  });
  await page.evaluate(() => ER.openCardAnywhere('conversation', 'cv_1001'));
  const word = page.locator('.word-token[data-w]').first();
  await expect(word).toBeVisible();
  await expect(page.locator('.word-token .ru-tr').first()).toBeVisible();
  const ru = await page.locator('.word-token .ru-tr').allInnerTexts();
  expect(ru.every((t) => /[а-яё]/i.test(t))).toBe(true);
  await word.click();
  await expect.poll(() => page.evaluate(() => window.__spoken.length)).toBeGreaterThan(0);
});

test('FSRS: ответ «Знаю» сохраняет стабильность и сложность', async ({ page }) => {
  await start(page);
  await page.evaluate(() => ER.openCardAnywhere('conversation', 'cv_1002'));
  await page.locator('button[data-mark="know"]').first().click();
  await expect.poll(() => page.evaluate(() => DB.getProgressByCardId('cv_1002').then((r) => !!r.data)), { timeout: 5000 })
    .toBe(true);
  const saved = await page.evaluate(() => DB.getProgressByCardId('cv_1002').then((r) => r.data));
  expect(saved.stability).toBeGreaterThan(0);
  expect(saved.difficulty).toBeGreaterThanOrEqual(1);
  expect(saved.status).toBe('learning');
});

test('Настройки → Звук: диагностика и кнопка проверки', async ({ page }) => {
  await start(page);
  await page.locator('.nav-link[data-tab="settings"]').click();
  await expect(page.locator('#sound-card')).toBeVisible();
  await expect(page.locator('#sound-status')).toContainText('Английских голосов');
  await page.evaluate(() => { window.__tested = 0; const t = TTS.test; TTS.test = () => { window.__tested++; return t(); }; });
  await page.locator('#btn-sound-test').click();
  await expect.poll(() => page.evaluate(() => window.__tested)).toBe(1);
});

test('IELTS Writing: проверка эссе показывает анализ и советы', async ({ page }) => {
  await start(page);
  await page.locator('.nav-link[data-tab="ielts"]').click();
  await page.locator('#ielts-essay').fill(
    'I think technology is good. I think people don\'t care. However, the research indicates a significant impact. ' +
    'Moreover, governments should evaluate this approach carefully, and schools must adapt their methods quickly.');
  await page.locator('#ielts-check').click();
  await expect(page.locator('.ielts-stats')).toBeVisible();
  await expect(page.locator('.ielts-tips')).toContainText('250');
});

test('офлайн: после первого запуска приложение открывается без сети', async ({ page, context }) => {
  await start(page);
  await page.evaluate(() => navigator.serviceWorker && navigator.serviceWorker.ready);
  await page.waitForTimeout(1500); // SW докачивает precache
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#main-nav .nav-link').first()).toBeVisible({ timeout: 10000 });
  // стартовый экран — «Сегодня»: урок строится из IndexedDB, today*.js — из кэша Service Worker
  await expect(page.locator('.today-title')).toBeVisible();
  await expect(page.locator('#today-start, #today-continue').first()).toBeVisible();
  await context.setOffline(false);
});
