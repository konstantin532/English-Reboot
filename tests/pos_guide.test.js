import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

/* Справочник «Части речи: зачем и откуда названия» — объяснение, а не карточки:
   у каждой части речи есть «что делает», «почему так называется», «как узнать» и пример;
   отдельная глава — почему глаголы «неправильные». Работает офлайн (в index.html и кэше sw.js). */
const root = process.cwd();
const read = (f) => fs.readFileSync(path.resolve(root, f), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(read('js/pos_guide.js') + ';this.__G = PosGuide;', ctx);
const G = ctx.__G;

describe('Справочник частей речи', () => {
  it('главы: введение, 9 частей речи и неправильные глаголы', () => {
    expect(G.CHAPTERS.map((c) => c.id)).toEqual(
      ['intro', 'noun', 'verb', 'irregular', 'adj', 'adv', 'pron', 'prep', 'helpers', 'service', 'interj']);
  });

  it('у каждой части речи — что делает, почему так называется, как узнать и пример', () => {
    G.CHAPTERS.filter((c) => c.en).forEach((c) => {
      ['what', 'name', 'spot'].forEach((k) => expect(c[k], `${c.id}.${k}`).toMatch(/\S{20,}|\S+ \S+ \S+/));
      expect(c.examples.length, c.id).toBeGreaterThanOrEqual(2);
      expect(c.en).toMatch(/^[a-z]/i);
    });
  });

  it('глава «неправильные глаголы» отвечает, почему так называют, и объясняет go → went', () => {
    const irr = G.CHAPTERS.find((c) => c.id === 'irregular');
    const text = JSON.stringify(irr);
    expect(text).toMatch(/regula/);          // откуда слово «правильный»
    expect(text).toMatch(/wend/);            // went — от старого wend
    expect(text).toMatch(/gotten/);          // американская форма
    expect(irr.groups.length).toBeGreaterThanOrEqual(4);
  });

  it('html(): все главы, нужная раскрыта, кнопка закрытия; без скриптов внутри', () => {
    const h = G.html('irregular');
    G.CHAPTERS.forEach((c) => expect(h).toContain(`id="pg-${c.id}"`));
    expect(h).toMatch(/<details[^>]*id="pg-irregular"[^>]*open/);
    expect(h).not.toMatch(/<details[^>]*id="pg-noun"[^>]*open/);
    expect(h).toContain('id="pg-close"');
    expect(h).not.toMatch(/<script|on\w+=/i);
    expect(G.html('нет-такой')).toMatch(/id="pg-intro"[^>]*open/);
  });

  it('офлайн: подключён до app.js и лежит в кэше Service Worker', () => {
    const html = read('index.html');
    expect(html.indexOf('js/pos_guide.js')).toBeGreaterThan(0);
    expect(html.indexOf('js/pos_guide.js')).toBeLessThan(html.indexOf('js/app.js'));
    expect(read('sw.js')).toContain("'./js/pos_guide.js'");
  });

  it('вход есть в «Грамматике», у пометки глагола и у легенды цветов', () => {
    expect(read('js/app_library.js')).toMatch(/pos-guide-btn[^`]*data-ch="intro"/);
    expect(read('js/app_library.js')).toMatch(/pos-guide-btn[^`]*data-ch="irregular"/);
    expect(read('js/app_settings.js')).toMatch(/pos-guide-btn/);
    expect(read('js/app.js')).toMatch(/closest\('\.pos-guide-btn'\)/);
  });
});
