import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

/* Разделение app.js на модули: связи ядра и модулей app_*.js не должны рваться молча. */
const js = (f) => fs.readFileSync(path.resolve(process.cwd(), 'js', f), 'utf8');
const app = js('app.js');
const MODS = fs.readdirSync(path.resolve(process.cwd(), 'js')).filter((f) => /^app_\w+\.js$/.test(f)).sort();
const noComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('Модули ядра app_*.js', () => {
  it('модули есть', () => { expect(MODS.length).toBeGreaterThan(0); });

  MODS.forEach((f) => {
    const src = js(f);
    const global = src.match(/^const (App\w+) = \(\(\) => \{/m)[1];
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(src + `;this.__M = ${global};`, ctx);
    const M = ctx.__M;

    it(`${f}: загружается без DOM и отдаёт bind()`, () => { expect(typeof M.bind).toBe('function'); });

    it(`${f}: всё, что ядро берёт из модуля, модуль отдаёт`, () => {
      const m = app.match(new RegExp(`const \\{ ([^}]+) \\} = ${global};`));
      expect(m, 'app.js импортирует ' + global).toBeTruthy();
      m[1].split(',').map((x) => x.trim()).forEach((n) => expect(typeof M[n], `${global}.${n}`).toBe('function'));
    });

    it(`${f}: каждое C.имя есть в контексте ядра (геттер в app.js)`, () => {
      const names = new Set([...noComments(src).matchAll(/(?<![\w$.])C\.([A-Za-z_$][\w$]*)/g)].map((x) => x[1]));
      const missing = [...names].filter((n) => !app.includes(`get ${n}() { return ${n}; }`));
      expect(missing).toEqual([]);
    });

    it(`${f}: модуль привязан к ядру, подключён до app.js и лежит в офлайн-кэше`, () => {
      expect(app).toMatch(new RegExp(`\\[[^\\]]*\\b${global}\\b[^\\]]*\\]\\.forEach\\(\\(m\\) => m\\.bind\\(core\\)\\)`));
      const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');
      expect(html.indexOf(`js/${f}`)).toBeGreaterThan(0);
      expect(html.indexOf(`js/${f}`)).toBeLessThan(html.indexOf('js/app.js'));
      expect(fs.readFileSync(path.resolve(process.cwd(), 'sw.js'), 'utf8')).toContain(`./js/${f}`);
    });
  });
});
