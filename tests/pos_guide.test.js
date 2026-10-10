import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

/* Справочник «Как устроен английский» (стиль «строго и по делу»): объяснение, а не карточки.
   У каждой главы — правило, название через английский, как узнать, примеры, американская речь,
   импровизация вслух (русская фраза → сказать по памяти → открыть образец и послушать)
   и своя фраза. Главы: части речи, неправильные глаголы, времена, порядок слов.
   Работает офлайн (в index.html и кэше sw.js). */
const root = process.cwd();
const read = (f) => fs.readFileSync(path.resolve(root, f), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(read('js/pos_guide.js') + ';this.__G = PosGuide;', ctx);
const G = ctx.__G;
const topics = G.CHAPTERS.filter((c) => c.id !== 'intro');

describe('Справочник «Как устроен английский» — строго и по делу', () => {
  it('главы: введение, 9 частей речи, неправильные глаголы, времена и порядок слов', () => {
    expect(G.CHAPTERS.map((c) => c.id)).toEqual(
      ['intro', 'noun', 'verb', 'irregular', 'adj', 'adv', 'pron', 'prep', 'helpers', 'service', 'interj', 'tenses', 'order']);
  });

  it('каждая глава — правило, название через английский, как узнать, в американской речи и ≥2 примера', () => {
    topics.forEach((c) => {
      ['rule', 'name', 'spot', 'live'].forEach((k) => expect(c[k], `${c.id}.${k}`).toMatch(/\S+ \S+ \S+ \S+ \S+/));
      expect(c.examples.length, c.id).toBeGreaterThanOrEqual(2);
      expect(c.en, c.id).toMatch(/^[a-z]/i);
    });
  });

  // Правило автора 2026-10-10: «мы русский учим не русский… нам надо выучить английский американский»;
  // стиль — «строго и по делу»: без загадок, без латыни и русской лингвистики
  it('про английский, а не про русский: нет латыни, греческого, старославянского, «русское название — перевод…», загадок', () => {
    const all = JSON.stringify(G.CHAPTERS) + G.html('intro');
    expect(all).not.toMatch(/латин|греч|старославян|древнерус|Русское «|русское «|Загадка/i);
  });

  it('импровизация: у каждой главы ≥2 фразы «скажи вслух» (русский → английский) и свободное задание', () => {
    topics.forEach((c) => {
      expect(c.say.length, c.id).toBeGreaterThanOrEqual(2);
      c.say.forEach(([ru, en]) => {
        expect(ru, c.id).toMatch(/[а-яё]/i);
        expect(en, c.id).toMatch(/^[A-Z][A-Za-z ',?!.]+$/);
      });
      expect(c.free, `${c.id}.free`).toMatch(/\S+ \S+ \S+ \S+/);
    });
  });

  it('глава «неправильные глаголы» отвечает, почему так называют, и объясняет go → went', () => {
    const text = JSON.stringify(G.CHAPTERS.find((c) => c.id === 'irregular'));
    expect(text).toMatch(/regula/);          // откуда слово «правильный»
    expect(text).toMatch(/wend/);            // went — от старого wend
    expect(text).toMatch(/gotten/);          // американская форма
    expect(G.CHAPTERS.find((c) => c.id === 'irregular').groups.length).toBeGreaterThanOrEqual(4);
  });

  it('времена — «сетка 3 × 4», а не 12 правил; порядок слов — почему нельзя как по-русски', () => {
    expect(JSON.stringify(G.CHAPTERS.find((c) => c.id === 'tenses'))).toMatch(/3 × 4/);
    expect(JSON.stringify(G.CHAPTERS.find((c) => c.id === 'order'))).toMatch(/падеж/);
  });

  it('html(): все главы, нужная раскрыта, кнопки импровизации с образцом; без скриптов внутри', () => {
    const h = G.html('irregular');
    G.CHAPTERS.forEach((c) => expect(h).toContain(`id="pg-${c.id}"`));
    expect(h).toMatch(/<details[^>]*id="pg-irregular"[^>]*open/);
    expect(h).not.toMatch(/<details[^>]*id="pg-noun"[^>]*open/);
    expect(h).toContain('id="pg-close"');
    expect(h).toContain('data-say="It&#39;s gotten cold."');
    expect((h.match(/class="pg-say-btn"/g) || []).length).toBe(topics.reduce((n, c) => n + c.say.length, 0));
    expect(h).toMatch(/class="pg-say-en" hidden/);   // образец скрыт, пока ученик не скажет сам
    expect(h).not.toMatch(/<script|on\w+=/i);
    expect(G.html('нет-такой')).toMatch(/id="pg-intro"[^>]*open/);
  });

  it('офлайн: подключён до app.js и лежит в кэше Service Worker', () => {
    const html = read('index.html');
    expect(html.indexOf('js/pos_guide.js')).toBeGreaterThan(0);
    expect(html.indexOf('js/pos_guide.js')).toBeLessThan(html.indexOf('js/app.js'));
    expect(read('sw.js')).toContain("'./js/pos_guide.js'");
  });

  it('вход есть в «Грамматике», у пометки глагола и у легенды цветов; кнопки импровизации работают', () => {
    expect(read('js/app_library.js')).toMatch(/pos-guide-btn[^`]*data-ch="intro"/);
    expect(read('js/app_library.js')).toMatch(/pos-guide-btn[^`]*data-ch="irregular"/);
    expect(read('js/app_settings.js')).toMatch(/pos-guide-btn/);
    expect(read('js/app.js')).toMatch(/closest\('\.pos-guide-btn'\)/);
    expect(read('js/app.js')).toMatch(/closest\('\.pg-say-btn'\)/);
  });
});

// Правило автора 2026-10-10 («каждая мелочь важна… супер понятно») — по всем вкладкам:
// школьные термины заменены простыми словами (начальная форма, 3-я форма, тот, кто действует)
describe('Тексты для ученика — простыми словами', () => {
  const noComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');
  ['content_grammar', 'content_pro', 'content_us', 'content_words', 'content_vocab', 'content_extra',
    'app_library', 'app_session', 'today_ui', 'ladder_ui', 'scenes_ui', 'improv_ui', 'traps_ui', 'pos_guide'].forEach((f) => {
    it(`${f}.js: нет «инфинитив», «подлежащее», «сказуемое», «причастие», «страдательный залог», «герундий»`, () => {
      const hits = noComments(read(`js/${f}.js`)).match(/инфинитив\w*|подлежащ\w*|сказуем\w*|причасти\w*|(?:страдательн|действительн)\w* залог\w*|герунди\w*/gi) || [];
      expect(hits).toEqual([]);
    });
  });
});
