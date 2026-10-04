import { test, expect } from '@playwright/test';

/* ── Селекторы по реальному коду (js/onboarding.js, js/app.js) ──
   Онбординг: приветствие → #ob-skip («Я определю сам») → ручной выбор:
   .ob-level (уровень) + .ob-goal (цель) → #ob-finish («Поехали!»),
   активна только после ОБОИХ выборов. finish() пишет настройки в
   IndexedDB и очищает #onboarding-container.
   Видимость проверяем по .onboarding-overlay (обёртка без собственного бокса). */
const ONBOARDING_OVERLAY = '#onboarding-container .onboarding-overlay';
const NAV_SELECTOR       = '#main-nav a, #main-nav button'; // пункты разделов; кнопки шапки (поиск/словарик) открывают модалки — это не навигация
const ANSWER_BUTTON      = 'button[data-mark="know"]';      // «Знаю» в тренировке

const KNOWN_NOISE = []; // безобидные ошибки консоли, если появятся — добавить кусок текста сюда

function trackErrors(page) {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}

function expectNoConsoleErrors(errors) {
  const real = errors.filter((e) => !KNOWN_NOISE.some((n) => e.includes(n)));
  if (real.length) console.log('Ошибки консоли:\n' + real.join('\n'));
  expect(real).toEqual([]);
}

/* Детерминированное завершение онбординга по реальному сценарию onboarding.js */
async function completeOnboarding(page) {
  const overlay = page.locator(ONBOARDING_OVERLAY).first();
  if (!(await overlay.isVisible().catch(() => false))) return;

  const skip = page.locator('#ob-skip');
  if (await skip.isVisible().catch(() => false)) {
    await skip.click(); // → экран ручного выбора
  }

  await page.locator('.ob-level').first().click(); // выбор уровня
  await page.locator('.ob-goal').first().click();  // выбор цели → разблокирует «Поехали!»
  await page.locator('#ob-finish').click();        // сохранить и закрыть

  await expect(overlay).toBeHidden({ timeout: 5000 });
  await page.waitForTimeout(300); // даём applyOnboarding дорисовать навигацию
}

test('главная загружается без ошибок консоли', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle').catch(() => {});
  expectNoConsoleErrors(errors);
});

test('онбординг открывается и завершается', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  const overlay = page.locator(ONBOARDING_OVERLAY).first();
  await expect(overlay).toBeVisible({ timeout: 5000 }); // свежий профиль → онбординг
  await completeOnboarding(page);
  await expect(overlay).toBeHidden({ timeout: 5000 });
  expectNoConsoleErrors(errors);
});

test('клик по каждому пункту навигации не роняет приложение', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await completeOnboarding(page);

  const items = page.locator(NAV_SELECTOR);
  const total = await items.count();
  if (total === 0) throw new Error('Навигация не найдена — поправь NAV_SELECTOR');

  for (let i = 0; i < total; i++) {
    const item = items.nth(i);
    if (!(await item.isVisible().catch(() => false))) continue;
    await item.click({ timeout: 3000 }); // без catch: перехваченный клик = честное быстрое падение
    await page.waitForTimeout(200);
    await expect(page.locator('body')).toBeVisible();
  }
  expectNoConsoleErrors(errors);
});

test('прогресс переживает перезагрузку', async ({ page }) => {
  await page.goto('/');
  await completeOnboarding(page);

  // 1) отметить ответ: UI-путь (кнопка «Знаю»), запасной — собственный API приложения
  const answer = page.locator(ANSWER_BUTTON).first();
  let marked = false;

  if (await answer.isVisible().catch(() => false)) {
    await answer.click({ timeout: 2000 }).catch(() => {});
    marked = true;
  }
  if (!marked) {
    const nav = page.locator(NAV_SELECTOR);
    const total = Math.min(await nav.count(), 8);
    for (let i = 0; i < total && !marked; i++) {
      const item = nav.nth(i);
      if (!(await item.isVisible().catch(() => false))) continue;
      await item.click({ timeout: 1500 }).catch(() => {});
      await page.waitForTimeout(250);
      if (await answer.isVisible().catch(() => false)) {
        await answer.click({ timeout: 2000 }).catch(() => {});
        marked = true;
      }
    }
  }
  if (!marked) {
    await page.evaluate(() => SRS.saveProgress('g1', null, 'know', 5));
  }

  // снимок прогресса (IndexedDB): только стабильные поля
  const snapshot = () => page.evaluate(async () => {
    const r = await DB.getAllProgress();
    return (r.success ? r.data : [])
      .map((x) => ({
        cardId: x.cardId,
        stage: x.stage,
        status: x.status,
        nextReview: String(x.nextReview || '').slice(0, 10),
      }))
      .sort((a, b) => String(a.cardId).localeCompare(String(b.cardId)));
  });

  const before = await snapshot();
  expect(before.length).toBeGreaterThan(0);

  // 2) перезагрузка
  await page.reload();
  await page.waitForLoadState('networkidle').catch(() => {});

  // 3) онбординг не показался заново + прогресс на месте
  await expect(page.locator(ONBOARDING_OVERLAY).first()).toBeHidden({ timeout: 3000 });
  await expect.poll(snapshot, { timeout: 5000 }).toEqual(before);
});