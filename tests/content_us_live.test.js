import { describe, it, expect } from 'vitest';
import { loadContent } from '../scripts/content_stats.mjs';

// Пакет A1+ «Первый месяц»: живые сокращения (kinda, lemme, 'em…) показываются вместе с полной формой
describe('Первый месяц: полная форма живых сокращений', () => {
  const cv = loadContent().sections.conversation;
  const byFront = (f) => cv.find((c) => c.payload.front === f);

  it('kinda → «Слитно: kind of → kinda»', () => {
    const c = byFront("It's kinda far");
    expect(c.sublevel).toBe('A1+');
    expect(c.payload.examples[0].connected).toBe('kind of → kinda');
  });

  it("'em и gonna распознаются с апострофом и регистром", () => {
    const withEm = cv.filter((c) => c.sublevel && /'em\b/.test(c.payload.examples[0].text));
    expect(withEm.length).toBeGreaterThan(0);
    for (const c of withEm) expect(c.payload.examples[0].connected).toContain('them → \'em');
    const gonna = byFront("I'm gonna be late");
    expect(gonna.payload.examples[0].connected).toBe('going to → gonna');
  });

  it('у каждой карточки «живой речи» с сокращением есть полная форма', () => {
    const forms = /\b(gonna|wanna|gotta|kinda|lemme|gimme|dunno|outta|lotta|c'mon|y'know)\b|'em\b|'cause\b/i;
    const live = cv.filter((c) => c.sublevel && forms.test(c.payload.examples[0].text));
    expect(live.length).toBeGreaterThan(20);
    for (const c of live) expect(c.payload.examples[0].connected, c.id).not.toBe('');
  });

  it('старые темы без подуровня не трогаем', () => {
    const old = cv.filter((c) => !c.sublevel);
    expect(old.every((c) => c.payload.examples[0].connected === '')).toBe(true);
  });

  const fill = (c) => c.payload.test.find((t) => t.q.startsWith('Вставьте слово: «'));
  const LIVE2 = ['kinda', 'lemme', 'gimme', "'em", 'dunno', "'cause", 'outta', 'lotta', "c'mon", "y'know"];

  it('пропуск на живой форме: 4 разных варианта, все — живые формы, верный один', () => {
    const cards = cv.filter((c) => c.payload.category === 'Первый месяц: живая речь' && fill(c)
      && LIVE2.includes(fill(c).options[fill(c).correct].toLowerCase()));
    expect(cards.length).toBeGreaterThan(5);
    for (const c of cards) {
      const t = fill(c);
      expect(new Set(t.options).size, c.id).toBe(4);
      for (const o of t.options) expect(LIVE2, c.id + ': ' + o).toContain(o.toLowerCase());
    }
  });

  it('can / can\'t: в пропуске варианты can, can\'t, do, don\'t', () => {
    const cards = cv.filter((c) => c.payload.category === 'Первый месяц: могу и не могу' && fill(c)
      && ['can', "can't"].includes(fill(c).options[fill(c).correct].toLowerCase()));
    expect(cards.length).toBeGreaterThan(5);
    for (const c of cards) expect(fill(c).options.map((o) => o.toLowerCase()).sort(), c.id).toEqual(["can", "can't", 'do', "don't"]);
  });

  it('варианты не теряют дефис (carry-on, а не carryon)', () => {
    const all = cv.filter((c) => c.sublevel).flatMap((c) => c.payload.test.flatMap((t) => t.options));
    expect(all.filter((o) => /^(carryon|glutenfree|checkin)$/i.test(o))).toEqual([]);
  });
});

describe('Живая речь A1+ (sl_): тесты с настоящим выбором', () => {
  const sl = loadContent().sections.slang.filter((c) => c.sublevel === 'A1+');

  it('20 карточек, в каждом тесте 4 разных варианта, нет вопроса с одним и тем же ответом у всех', () => {
    expect(sl.length).toBe(20);
    for (const c of sl) {
      for (const t of c.payload.test) {
        expect(new Set(t.options).size, c.id + ': ' + t.q).toBe(4);
        expect(t.correct).toBeGreaterThanOrEqual(0);
      }
      expect(c.payload.test.some((t) => t.q.startsWith('Где уместно')), c.id).toBe(false);
    }
  });

  it('регистр вариантов — как у ответа, и с апострофом впереди', () => {
    for (const c of sl) {
      for (const t of c.payload.test.filter((x) => x.q.includes('___'))) {
        const ans = t.options[t.correct];
        const up = (v) => /^'?[A-Z]/.test(v);
        for (const o of t.options) expect(up(o), c.id + ': ' + o + ' / ' + ans).toBe(up(ans));
      }
    }
  });
});
