/**
 * scripts/screenshots.mjs — автоскриншоты English Reboot для README (этап 2).
 * Запуск: npm i  →  npm run test:screenshots
 * Результат: 5 PNG в docs/screenshots/
 * Это dev-инструментарий: код приложения этот файл не использует.
 */

import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { chromium } from '@playwright/test';

/* ── НАСТРОЙКИ: сверь со своим кодом (шаг 2) ──────────────────────── */

const SKIP_SELECTOR = 'button:has-text("Пропустить")'; // кнопка пропуска онбординга
const THEME_KEY = 'theme';                             // ключ темы в localStorage
const THEME_DARK_VALUE = 'dark';                       // значение тёмной темы

const PORT = 8123;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = 'docs/screenshots';
const MIN_SIZE = 20 * 1024; // критерий "непустого" скриншота

/* ── статический сервер: только Node, без зависимостей ────────────── */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
};

function startStaticServer(root) {
  const server = createServer(async (req, res) => {
    try {
      let pathname = decodeURIComponent(new URL(req.url, BASE_URL).pathname);
      if (pathname.endsWith('/')) pathname += 'index.html';
      const filePath = normalize(join(root, pathname));
      if (!filePath.startsWith(normalize(root) + sep)) {
        res.writeHead(403).end('Forbidden');
        return;
      }
      const body = await readFile(filePath);
      res.writeHead(200, {
        'Content-Type': MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(body);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, () => resolve(server));
  });
}

/* ── хелперы браузера ─────────────────────────────────────────────── */

async function newContext(browser, { viewport, darkTheme = false } = {}) {
  const context = await browser.newContext({
    viewport: viewport ?? { width: 1280, height: 800 },
    deviceScaleFactor: 2, // ретина — чёткие картинки в README
    locale: 'ru-RU',
  });
  if (darkTheme) {
    // выполнится ДО скриптов страницы — тема будет выставлена заранее
    await context.addInitScript(
      ([key, value]) => localStorage.setItem(key, value),
      [THEME_KEY, THEME_DARK_VALUE],
    );
  }
  return context;
}

async function gotoSettled(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
  } catch {
    await page.waitForLoadState('load').catch(() => {}); // не падаем, если networkidle не наступил
  }
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.waitForTimeout(500); // даём доиграть CSS-анимациям
}

async function skipOnboardingIfShown(page) {
  // Онбординг появляется после загрузки контента в IndexedDB — дождаться её конца
  // (контента стало больше, и загрузка уже не укладывается в «networkidle + 0,5 с»)
  await page.locator('#seed-progress').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  await page.locator('#onboarding-container .onboarding-overlay').first().waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
  const overlay = page.locator('#onboarding-container .onboarding-overlay').first();
  if (!(await overlay.isVisible().catch(() => false))) return;

  const skip = page.locator('#ob-skip'); // «Я определю сам» → экран ручного выбора
  if (await skip.isVisible().catch(() => false)) {
    await skip.click().catch(() => {});
  }
  const level = page.locator('.ob-level').first();
  if (await level.isVisible().catch(() => false)) {
    await level.click().catch(() => {});
    await page.locator('.ob-goal').first().click().catch(() => {});
    await page.locator('#ob-finish').click().catch(() => {});
  }
  await page.waitForTimeout(500);
}

async function screenshot(page, name, results) {
  const file = join(OUT_DIR, name);
  await page.screenshot({ path: file, fullPage: false });
  const { size } = await stat(file);
  results.push({ name, size });
  console.log(`  ✅ ${name} — ${(size / 1024).toFixed(0)} KB`);
}

/* ── сценарий ─────────────────────────────────────────────────────── */

async function main() {
  await mkdir(OUT_DIR, { recursive: true }); // идемпотентность: перезапись при каждом запуске

  const server = await startStaticServer(process.cwd());
  console.log(`Static server: ${BASE_URL}`);
  const browser = await chromium.launch();
  const results = [];

  try {
    // 1) онбординг — самый первый экран
    {
      const ctx = await newContext(browser);
      const page = await ctx.newPage();
      await gotoSettled(page, BASE_URL);
      await screenshot(page, 'onboarding.png', results);
      await ctx.close();
    }

    // 2) дашборд — после пропуска онбординга
    {
      const ctx = await newContext(browser);
      const page = await ctx.newPage();
      await gotoSettled(page, BASE_URL);
      await skipOnboardingIfShown(page);
      await screenshot(page, 'dashboard.png', results);
      await ctx.close();
    }

    // 3) дашборд в тёмной теме
    {
      const ctx = await newContext(browser, { darkTheme: true });
      const page = await ctx.newPage();
      await gotoSettled(page, BASE_URL);
      await skipOnboardingIfShown(page);
            // Тема через атрибут — независимо от того, где приложение её хранит
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(300);

      // QA-самопроверка: фон реально тёмный?
      const looksDark = await page.evaluate(() => {
        for (const el of [document.body, document.documentElement]) {
          const [r = 0, g = 0, b = 0, a = 1] =
            (getComputedStyle(el).backgroundColor.match(/[\d.]+/g) || []).map(Number);
          if (a > 0) return (r + g + b) / 3 < 110;
        }
        return false;
      });
      if (!looksDark) {
        console.warn('  ⚠️  Фон выглядит светлым — проверь THEME_KEY и THEME_DARK_VALUE в начале скрипта');
      }

      await screenshot(page, 'dark-theme.png', results);
      await ctx.close();
    }

    // 4) мобильный вьюпорт
    {
      const ctx = await newContext(browser, { viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await gotoSettled(page, BASE_URL);
      await skipOnboardingIfShown(page);
      await screenshot(page, 'mobile.png', results);
      await ctx.close();
    }

    // 5) поиск по Ctrl+K
    {
      const ctx = await newContext(browser);
      const page = await ctx.newPage();
      await gotoSettled(page, BASE_URL);
      await skipOnboardingIfShown(page);
      await page.keyboard.press('Control+K');
      await page.waitForTimeout(800); // на открытие модалки поиска
      await screenshot(page, 'search.png', results);
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  // проверка критерия "не пустые"
  const bad = results.filter((r) => r.size < MIN_SIZE);
  console.log(`\nГотово: ${results.length} скриншотов в ${OUT_DIR}/`);
  if (bad.length) {
    console.error(`⚠️  Слишком маленькие (<20 KB): ${bad.map((b) => b.name).join(', ')}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('❌ Ошибка:', err.message);
  process.exit(1);
});
