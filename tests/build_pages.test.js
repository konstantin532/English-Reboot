import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isExcluded, checkSite, build, dirAccess } from '../scripts/build-pages.mjs';

/* scripts/build-pages.mjs собирает dist/ для GitHub Pages и в PR, и перед публикацией:
   его проверка — последний рубеж между репозиторием и сайтом ученика. */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Сайт в памяти: files — { 'путь': 'содержимое' } */
const site = (files) => ({
  exists: (rel) => Object.keys(files).some((f) => f === rel || f.startsWith(rel + '/')),
  read: (rel) => files[rel],
});
const SW = "const ASSETS = [\n  './', './index.html', './js/app.js', './icon-192.png',\n];";
const INDEX = '<link rel="stylesheet" href="css/style.css"><link rel="icon" href="data:image/svg+xml,x"><script src="js/app.js"></script>';
const MANIFEST = JSON.stringify({ icons: [{ src: 'icon-192.png' }] });
const good = () => ({
  'index.html': INDEX, 'sw.js': SW, 'manifest.json': MANIFEST,
  'js/app.js': '', 'css/style.css': '', 'icon-192.png': '',
});

describe('build-pages: что не попадает на сайт', () => {
  it('служебные папки исключаются на любой глубине, docs/ — только metrics и evolution', () => {
    for (const p of ['tests', 'tests/e2e/a.spec.js', 'scripts/er.mjs', '.github/workflows/ci.yml', 'js/node_modules/x.js',
      'docs/metrics/2026.json', 'docs/evolution', 'vitest-report.json', 'css/.gitignore']) expect(isExcluded(p), p).toBe(true);
    for (const p of ['index.html', 'js/app.js', 'docs/screenshots/today.png', 'docs/EVOLUTION.md', 'js/testsuite.js', 'docs/metricsX.md'])
      expect(isExcluded(p), p).toBe(false);
  });
});

describe('build-pages: проверка собранного сайта', () => {
  it('целый сайт — без замечаний', () => {
    expect(checkSite(site(good()))).toEqual([]);
  });

  it('файл из кэша sw.js, подключение index.html и иконка manifest.json проверяются по dist/', () => {
    const files = good();
    delete files['js/app.js'];
    delete files['icon-192.png'];
    const problems = checkSite(site(files));
    expect(problems).toContain('sw.js кэширует js/app.js, а в dist/ его нет');
    expect(problems).toContain('index.html подключает js/app.js, а в dist/ его нет');
    expect(problems).toContain('manifest.json: нет иконки icon-192.png');
    expect(problems).toContain('sw.js кэширует icon-192.png, а в dist/ его нет');
  });

  it('без index.html дальше не проверяет и не падает', () => {
    const files = good();
    delete files['index.html'];
    expect(checkSite(site(files))).toEqual(['нет index.html']);
  });

  it('sw.js без списка ASSETS и сломанный manifest.json — замечания, а не исключение', () => {
    expect(checkSite(site({ ...good(), 'sw.js': 'self.addEventListener()' }))).toContain('sw.js: не найден список ASSETS');
    expect(checkSite(site({ ...good(), 'manifest.json': '{' }))).toContain('manifest.json — не JSON');
  });

  it('служебная папка в dist/ — замечание', () => {
    expect(checkSite(site({ ...good(), 'tests/x.test.js': '' }))).toContain('в dist/ попало служебное: tests');
  });

  it('настоящий репозиторий собирается в целый сайт', () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'er-pages-'));
    try {
      build(ROOT, out);
      expect(checkSite(dirAccess(out))).toEqual([]);
      expect(fs.existsSync(path.join(out, 'scripts'))).toBe(false);
    } finally {
      fs.rmSync(out, { recursive: true, force: true });
    }
  }, 60000);
});
