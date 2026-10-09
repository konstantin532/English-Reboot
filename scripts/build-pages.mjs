#!/usr/bin/env node
/**
 * scripts/build-pages.mjs — собрать dist/ для GitHub Pages и проверить его (dev-инструмент, на Pages не попадает).
 *
 * Один и тот же скрипт работает в двух местах:
 *   - CI / pages на каждом PR и push — собрать и проверить сайт, ничего не публикуя;
 *   - Deploy Pages после зелёного CI на main — собрать, проверить и опубликовать.
 * Поэтому то, что проверено в PR, совпадает с тем, что уйдёт на сайт.
 *
 * Проверка ловит то, чего не видят юнит- и E2E-тесты (они работают с корнем репозитория, а не с dist/):
 *   - нет index.html, manifest.json, sw.js или иконок из manifest.json;
 *   - sw.js кэширует файл, которого нет в dist/ (установка SW идёт через allSettled — пропажа молчит,
 *     а офлайн у ученика ломается);
 *   - index.html подключает файл, которого нет в dist/;
 *   - в dist/ попали служебные папки (tests/, scripts/, docs/metrics/ …).
 *
 *   node scripts/build-pages.mjs            # собрать в dist/ и проверить
 *   node scripts/build-pages.mjs --out DIR  # собрать в другую папку
 *
 * Код выхода: 0 — dist/ готов, 1 — проверка не прошла (печатает список проблем).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { swAssets, indexRefs } from './er-guard.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Имена, которые не попадают на сайт ни на какой глубине (как --exclude 'name/' в rsync) */
export const EXCLUDE_NAMES = new Set([
  'node_modules', 'tests', 'scripts', '.github', '.git', '.claude', '.gitignore',
  'test-results', 'playwright-report', 'dist', 'vitest-report.json',
]);
/** Пути от корня репозитория, которые не попадают на сайт */
export const EXCLUDE_PATHS = new Set(['docs/metrics', 'docs/evolution']);

/** rel — путь от корня репозитория через «/» */
export function isExcluded(rel) {
  if (!rel) return false;
  if (EXCLUDE_PATHS.has(rel) || [...EXCLUDE_PATHS].some((p) => rel.startsWith(p + '/'))) return true;
  return rel.split('/').some((part) => EXCLUDE_NAMES.has(part));
}

export function build(root, out) {
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  for (const name of fs.readdirSync(root)) {
    const src = path.join(root, name);
    if (path.resolve(src) === path.resolve(out)) continue;
    fs.cpSync(src, path.join(out, name), {
      recursive: true,
      filter: (s) => !isExcluded(path.relative(root, s).split(path.sep).join('/')),
    });
  }
}

/** Проблемы собранного сайта; пустой массив — всё на месте. exists(rel) и read(rel) — по папке dist/. */
export function checkSite({ exists, read }) {
  const problems = [];
  for (const f of ['index.html', 'manifest.json', 'sw.js']) if (!exists(f)) problems.push(`нет ${f}`);
  if (problems.length) return problems;

  const assets = swAssets(read('sw.js'));
  if (!assets.length) problems.push('sw.js: не найден список ASSETS');
  for (const a of assets) if (!exists(a)) problems.push(`sw.js кэширует ${a}, а в dist/ его нет`);

  for (const r of indexRefs(read('index.html'))) {
    const rel = r.replace(/^\.\//, '').split(/[?#]/)[0];
    if (rel && !exists(rel)) problems.push(`index.html подключает ${rel}, а в dist/ его нет`);
  }

  let manifest = null;
  try { manifest = JSON.parse(read('manifest.json')); } catch { problems.push('manifest.json — не JSON'); }
  for (const icon of (manifest && manifest.icons) || []) {
    const src = String(icon.src || '').replace(/^\.\//, '');
    if (src && !/^(data:|https?:)/.test(src) && !exists(src)) problems.push(`manifest.json: нет иконки ${src}`);
  }

  for (const leaked of [...EXCLUDE_NAMES, ...EXCLUDE_PATHS]) {
    if (exists(leaked)) problems.push(`в dist/ попало служебное: ${leaked}`);
  }
  return problems;
}

export const dirAccess = (dir) => ({
  exists: (rel) => fs.existsSync(path.join(dir, rel)),
  read: (rel) => fs.readFileSync(path.join(dir, rel), 'utf8'),
});

function main() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--out');
  const out = path.resolve(i >= 0 && argv[i + 1] ? argv[i + 1] : path.join(ROOT, 'dist'));
  build(ROOT, out);
  const problems = checkSite(dirAccess(out));
  const files = fs.readdirSync(out, { recursive: true }).length;
  if (problems.length) {
    console.error(`dist/ собран (${files} файлов и папок), но проверка не прошла:`);
    for (const p of problems) console.error(`  ✗ ${p}`);
    return 1;
  }
  console.log(`dist/ собран и проверен: ${files} файлов и папок; ${fs.readdirSync(out).join(', ')}`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) process.exit(main());
