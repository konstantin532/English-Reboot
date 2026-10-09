#!/usr/bin/env node
/**
 * scripts/check-live.mjs — сторож релиза «после» (dev-инструмент, на Pages не попадает): задание Deploy Pages / live.
 *
 * Зелёный deploy значит только «GitHub принял архив». Ученик же получает сайт через CDN и Service Worker,
 * и тихо сломаться может то, чего не видит ни один тест на localhost. После каждой публикации скрипт
 * открывает НАСТОЯЩИЙ сайт и проверяет:
 *   1. версия — sw.js на сайте с тем же CACHE_VERSION, что в выпущенном коммите (ждёт CDN до ~5 минут);
 *   2. файлы — всё из списка кэша sw.js отдаётся с кодом 200 и совпадает с файлом коммита байт в байт;
 *   3. браузер — страница открывается без ошибок в консоли, Service Worker кладёт в кэш ВСЕ файлы
 *      (установка идёт через allSettled — пропажа одного файла молчит, а офлайн у ученика ломается);
 *   4. офлайн — после перезагрузки без сети приложение открывается.
 *
 *   node scripts/check-live.mjs --url https://konstantin532.github.io/English-Reboot/
 *   node scripts/check-live.mjs --url http://localhost:8123/ --wait 0     # проверить локальный сервер
 *
 * Итог — в консоль и в сводку задания ($GITHUB_STEP_SUMMARY). Код выхода: 0 — сайт цел, 1 — нет.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { swAssets } from './er-guard.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

/** Адрес сайта всегда со слешем в конце: относительные пути ASSETS считаются от него */
export const siteRoot = (url) => (String(url).endsWith('/') ? String(url) : String(url) + '/');
/** Файл из ASSETS ('' — корень сайта) → локальный путь в репозитории */
export const localFile = (asset) => (asset === '' ? 'index.html' : asset);
/** URL файла на сайте с меткой против кэша CDN */
export const liveUrl = (root, asset, tag) => new URL(asset, siteRoot(root)).href + `?live-check=${encodeURIComponent(tag)}`;
export const cacheVersionOf = (sw) => { const m = String(sw || '').match(/CACHE_VERSION\s*=\s*'([^']+)'/); return m ? m[1] : null; };

/** Итог проверки: problems — список строк по-русски; пустой — сайт цел */
export function verdict({ expected, live, files = [], missingInCache = [], errors = [], offline = true, fatal = null }) {
  const P = [];
  if (fatal) P.push(`сайт не открылся в браузере: ${fatal}`);
  if (live !== expected) P.push(`версия на сайте ${live || 'не найдена'}, а выпущена ${expected}`);
  for (const f of files) {
    if (f.status !== 200) P.push(`${f.asset || '/'}: код ${f.status}`);
    else if (!f.same) P.push(`${f.asset || '/'}: на сайте не тот файл, что в коммите`);
  }
  if (missingInCache.length) {
    const names = missingInCache.map((a) => a || '/');
    P.push(`Service Worker не положил в кэш ${names.length}: ${names.slice(0, 5).join(', ')}${names.length > 5 ? '…' : ''}`);
  }
  for (const e of errors) P.push(`ошибка в консоли: ${String(e).slice(0, 200)}`);
  if (!offline) P.push('без сети приложение не открылось');
  return P;
}

async function fetchLive(url) {
  try {
    const r = await fetch(url, { cache: 'no-store', redirect: 'follow' });
    return { status: r.status, body: Buffer.from(await r.arrayBuffer()) };
  } catch (e) { return { status: 0, body: Buffer.alloc(0), error: e.message }; }
}

/** 1. Ждём, пока CDN отдаст sw.js нужной версии */
async function waitVersion(root, expected, waitSec) {
  const until = Date.now() + waitSec * 1000;
  let live = null;
  for (let n = 0; ; n++) {
    const r = await fetchLive(liveUrl(root, 'sw.js', `v${Date.now()}`));
    live = r.status === 200 ? cacheVersionOf(r.body.toString('utf8')) : null;
    if (live === expected || Date.now() > until) return live;
    if (n % 3 === 0) console.log(`  жду CDN: на сайте ${live || `код ${r.status}`}, нужна ${expected}…`);
    await sleep(10000);
  }
}

/** 2. Все файлы кэша: код 200 и то же содержимое, что в коммите */
async function checkFiles(root, assets, tag) {
  const out = [];
  for (const asset of assets) {
    const r = await fetchLive(liveUrl(root, asset, tag));
    let same = false;
    try { same = r.status === 200 && sha256(r.body) === sha256(fs.readFileSync(path.join(ROOT, localFile(asset)))); } catch { /* файла нет локально */ }
    out.push({ asset, status: r.status, same });
  }
  return out;
}

/** 3–4. Браузер: загрузка без ошибок, полный кэш Service Worker, офлайн */
async function checkBrowser(root, assets, version) {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  // первый экран — меню разделов или онбординг нового ученика
  const ready = '#main-nav .nav-link, #onboarding-container .onboarding-overlay';
  let missingInCache = assets, offline = false;
  try {
    await page.goto(siteRoot(root), { waitUntil: 'load' });
    await page.locator(ready).first().waitFor({ state: 'visible', timeout: 20000 });
    await page.evaluate(() => navigator.serviceWorker.ready);
    // SW докачивает precache; ждём до 30 с, пока в кэше не окажется всё
    for (let i = 0; i < 15; i++) {
      missingInCache = await page.evaluate(async ({ assets, name }) => {
        const cache = await caches.open(name);
        const miss = [];
        for (const a of assets) if (!(await cache.match(new URL(a || './', location.href).href, { ignoreSearch: true }))) miss.push(a);
        return miss;
      }, { assets, name: 'english-reboot-' + version });
      if (!missingInCache.length) break;
      await sleep(2000);
    }
    const onlineErrors = errors.splice(0);   // офлайн шрифты Google честно не грузятся — эти ошибки не считаем
    await context.setOffline(true);
    await page.reload({ waitUntil: 'load' });
    offline = await page.locator(ready).first().waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
    const pageErrors = errors.filter((e) => e.startsWith('pageerror'));
    return { errors: onlineErrors.concat(pageErrors), missingInCache, offline };
  } catch (e) {
    return { errors, missingInCache, offline, fatal: e.message.split('\n')[0] };
  } finally {
    await browser.close();
  }
}

function report({ root, expected, live, files, browser, problems }) {
  const L = [`## ${problems.length ? '❌ Живой сайт: есть проблемы' : '✅ Живой сайт цел'}`, '', `Сайт: ${siteRoot(root)}`, '',
    `- версия: на сайте \`${live || '—'}\`, выпущена \`${expected}\``,
    `- файлы кэша: ${files.filter((f) => f.status === 200 && f.same).length} из ${files.length} на месте и совпадают с коммитом`,
    `- Service Worker закэшировал: ${files.length - browser.missingInCache.length} из ${files.length}`,
    `- без сети: ${browser.offline ? 'открывается' : 'НЕ открывается'}`];
  if (problems.length) L.push('', ...problems.map((p) => `- ❌ ${p}`));
  return L.join('\n') + '\n';
}

async function main() {
  const argv = process.argv.slice(2);
  const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] != null ? argv[i + 1] : d; };
  const root = arg('--url', process.env.LIVE_URL);
  if (!root) { console.error('check-live: нужен --url адрес сайта'); return 1; }
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const expected = cacheVersionOf(sw), assets = swAssets(sw).concat(['']).filter((a, i, s) => s.indexOf(a) === i);
  const tag = process.env.GITHUB_SHA || String(Date.now());

  console.log(`Проверяю ${siteRoot(root)}: ${expected}, файлов в кэше ${assets.length}`);
  const live = await waitVersion(root, expected, Number(arg('--wait', 300)));
  const files = await checkFiles(root, assets, tag);
  const browser = await checkBrowser(root, assets, live || expected);   // кэш SW назван версией, что реально на сайте
  const problems = verdict({ expected, live, files, ...browser });
  const md = report({ root, expected, live, files, browser, problems });
  console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  return problems.length ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main().then((c) => process.exit(c));
