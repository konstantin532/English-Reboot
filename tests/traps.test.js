import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

/* Этап 1b: каталог ловушек русского акцента и разметка фраз.
   Грузим контент в том же порядке, что index.html: IPA берётся из разметки
   примеров (lex_us.js дозаполняет пропуски), как в приложении. */
const ORDER = ['content_grammar', 'content_vocab', 'content_extra', 'content_pro', 'content_us', 'lex_us', 'traps_us'];
const ctx = { console: { log() {}, warn() {}, error() {} } };
ctx.window = ctx;
vm.createContext(ctx);
const src = ORDER.map((f) => fs.readFileSync(path.resolve(process.cwd(), 'js', f + '.js'), 'utf8')).join('\n;\n');
vm.runInContext(src + ';this.__C = CONVERSATION_CARDS; this.__T = AccentTraps; this.__L = LEX_US;', ctx);

const T = ctx.__T;
const US = ctx.__C.filter((c) => (c.tags || []).includes('США'));
const look = T.makeLookup(ctx.__C, ctx.__L);
const ids = (text) => T.trapIdsOf(text, look);
const wordsWith = (text, trap) => T.findTrapsInPhrase(text, look).filter((h) => h.trap === trap).map((h) => h.word.replace(/[^A-Za-z']/g, ''));

describe('Каталог ловушек', () => {
  it('10 ловушек из плана, id уникальны', () => {
    expect(T.TRAPS.map((t) => t.id)).toEqual(['ae', 'aspiration', 'th', 'r', 'w', 'final-voiced', 'reduction', 'flap', 'stress', 'dark-l']);
  });
  it('у каждой ловушки ≥10 минимальных пар, без повторов и пустых слов', () => {
    T.TRAPS.forEach((t) => {
      expect(t.pairs.length).toBeGreaterThanOrEqual(10);
      const keys = t.pairs.map(([a, b]) => (a + '|' + b).toLowerCase());
      expect(new Set(keys).size).toBe(keys.length);
      t.pairs.forEach(([a, b]) => {
        expect(a.trim().length).toBeGreaterThan(0);
        expect(b.trim().length).toBeGreaterThan(0);
        expect(a.toLowerCase()).not.toBe(b.toLowerCase());
      });
    });
  });
  it('объяснение — от русского, 1–2 предложения; есть заголовок и короткая подпись', () => {
    T.TRAPS.forEach((t) => {
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.short.length).toBeGreaterThan(0);
      expect(/[а-яё]/i.test(t.ru)).toBe(true);
      const sentences = t.ru.split(/(?<=[.!?])\s+(?=[А-ЯA-Z«])/).filter(Boolean);
      expect(sentences.length).toBeGreaterThanOrEqual(1);
      expect(sentences.length).toBeLessThanOrEqual(3);
      expect(['choose', 'same', 'contrast']).toContain(t.drill);
    });
  });
});

describe('Разметка: ловушки находятся в IPA реальных слов', () => {
  it('[æ]: bad, can, pass — да; bed — нет', () => {
    expect(wordsWith('I had a bad day', 'ae')).toContain('bad');
    expect(ids('Can you pass the salt?')).toContain('ae');
    expect(wordsWith('Go to bed', 'ae')).toEqual([]);
  });
  it('th: think, the, three — по [θ ð]', () => {
    expect(wordsWith('I think so', 'th')).toEqual(['think']);
    expect(wordsWith('Pass the salt', 'th')).toEqual(['the']);
  });
  it('придыхание: p/t/k в начале ударного слога, не в служебных словах', () => {
    expect(wordsWith('We had a party', 'aspiration')).toContain('party');
    expect(wordsWith('The hotel is nice', 'aspiration')).toContain('hotel'); // ho-ˈtel: t в начале ударного слога
    expect(wordsWith('I want to go', 'aspiration')).not.toContain('to');
  });
  it('американское r: по написанию, даже если IPA британский (water /ˈwɔːtə/)', () => {
    expect(wordsWith('Do you want water?', 'r')).toContain('water');
    expect(wordsWith('It was hard work', 'r')).toEqual(['hard', 'work']);
  });
  it('w: want, water, one — по [w]; who, two — нет', () => {
    expect(wordsWith('Do you want water?', 'w')).toEqual(['want', 'water']);
    expect(wordsWith('Have a good one', 'w')).toEqual(['one']);
    expect(wordsWith('Who are you two?', 'w')).toEqual([]);
  });
  it('звонкие на конце: bag, good, eyes — да (в т.ч. IPA-символ ɡ); служебные — нет', () => {
    expect(wordsWith('Bring your bag', 'final-voiced')).toContain('bag');
    expect(wordsWith('Have a good one', 'final-voiced')).toContain('good');
    expect(wordsWith('It is his', 'final-voiced')).toEqual([]);
  });
  it('редукция: gonna, want to, going to', () => {
    expect(wordsWith('Gonna grab a bite', 'reduction')).toEqual(['Gonna']);
    expect(wordsWith('I want to go', 'reduction')).toEqual(['want', 'to']);
    expect(wordsWith("We're going to the party", 'reduction')).toEqual(['going', 'to']);
  });
  it('flap t: water, better, little, city, computer и на стыке слов (let it)', () => {
    expect(wordsWith('Do you want water?', 'flap')).toEqual(['water']);
    expect(wordsWith('I feel a little better', 'flap')).toEqual(['little', 'better']);
    expect(ids('What a nice city')).toContain('flap');
    expect(ids('My computer is slow')).toContain('flap');
    expect(wordsWith('Let it go', 'flap')).toEqual(['Let']);
  });
  it('flap t: ложных срабатываний нет — hotel, important, button, stop, ten', () => {
    ['The hotel is nice', "It's important", 'Press the button', 'Stop it.', 'Ten dollars'].forEach((t) => {
      const hits = wordsWith(t, 'flap').filter((w) => !/^(it|It)$/.test(w));
      expect(hits).toEqual([]);
    });
  });
  it('ударение: hotel, comfortable — из списка трудных слов; односложные — нет', () => {
    expect(wordsWith('The hotel is comfortable', 'stress')).toEqual(['hotel', 'comfortable']);
    expect(wordsWith('I think so', 'stress')).toEqual([]);
  });
  it('тёмное l: feel, little, milk — да; light, love (l в начале) — нет', () => {
    expect(wordsWith('I feel a little better', 'dark-l')).toEqual(['feel', 'little']);
    expect(wordsWith('Got milk?', 'dark-l')).toEqual(['milk']);
    expect(wordsWith('I love the light', 'dark-l')).toEqual([]);
  });
  it('пустая строка и знаки без слов — без ловушек', () => {
    expect(T.findTrapsInPhrase('', look)).toEqual([]);
    expect(T.findTrapsInPhrase('— …', look)).toEqual([]);
  });
});

describe('Разметка: весь корпус американских фраз', () => {
  it('у каждого слова во фразах есть IPA (разметка примеров + LEX_US)', () => {
    const missing = new Set();
    US.forEach((c) => c.payload.front.split(/\s+/).forEach((w) => {
      const b = w.toLowerCase().replace(/[^a-z']/g, '').replace(/^'+|'+$/g, '');
      if (b && !look(b)) missing.add(b);
    }));
    expect([...missing]).toEqual([]);
  });
  it('каждая ловушка встречается минимум в 30 фразах — есть на чём тренировать', () => {
    const count = {};
    US.forEach((c) => ids(c.payload.front).forEach((t) => { count[t] = (count[t] || 0) + 1; }));
    T.TRAPS.forEach((t) => expect(count[t.id] || 0).toBeGreaterThanOrEqual(30));
  });
  it('у большинства фраз (≥85%) есть хотя бы одна ловушка', () => {
    const withTraps = US.filter((c) => ids(c.payload.front).length > 0).length;
    expect(withTraps / US.length).toBeGreaterThanOrEqual(0.85);
  });
  it('индексы попаданий указывают на настоящие слова фразы', () => {
    US.slice(0, 200).forEach((c) => {
      const tokens = c.payload.front.split(/\s+/).filter(Boolean);
      T.findTrapsInPhrase(c.payload.front, look).forEach((h) => {
        expect(tokens[h.index]).toBe(h.word);
        expect(T.byId.has(h.trap)).toBe(true);
      });
    });
  });
});

function rngFrom(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

describe('Мини-тренажёр пар', () => {
  it('5 раундов, пары не повторяются, верный ответ среди двух разных вариантов', () => {
    T.TRAPS.forEach((t, k) => {
      const rounds = T.buildDrill(t.id, { rng: rngFrom(k + 1) });
      expect(rounds.length).toBe(5);
      expect(new Set(rounds.map((r) => r.pair.join('|'))).size).toBe(5);
      rounds.forEach((r) => {
        expect(r.options.length).toBe(2);
        expect(r.options[0]).not.toBe(r.options[1]);
        expect(r.correct === 0 || r.correct === 1).toBe(true);
      });
    });
  });
  it('«какое слово прозвучало»: звучит одно слово пары, верный вариант — оно же', () => {
    for (let k = 0; k < 20; k++) {
      T.buildDrill('ae', { rng: rngFrom(k) }).forEach((r) => {
        expect(r.pair).toContain(r.play);
        expect(r.options.slice().sort()).toEqual(r.pair.slice().sort());
        expect(r.options[r.correct]).toBe(r.play);
      });
    }
  });
  it('редукция: звучит «gonna», выбираешь полную форму; почти-омофоны flap не ставятся друг против друга', () => {
    for (let k = 0; k < 20; k++) {
      T.buildDrill('reduction', { rng: rngFrom(k) }).forEach((r) => {
        expect(r.play).toBe(r.pair[1]);
        expect(r.options[r.correct]).toBe(r.pair[0]);
      });
      T.buildDrill('flap', { rng: rngFrom(k) }).forEach((r) => {
        expect(r.options[r.correct]).toBe(r.play);
        const other = r.options[1 - r.correct];
        expect(r.pair).not.toContain(other); // writer против rider — нечестно, их не различить
      });
    }
  });
  it('неизвестная ловушка — пустой тренажёр', () => {
    expect(T.buildDrill('nope')).toEqual([]);
  });
});

describe('Паспорт акцента', () => {
  const run = (answers, trap = 'th') => answers.reduce((p, ok) => T.recordResult(p, trap, ok, '2026-10-05'), null);
  it('новая ловушка — «ещё не встречалась»', () => {
    expect(T.statusOf(T.normalizePassport(null).th)).toBe('new');
  });
  it('«побеждена»: минимум 5 попыток и ≥80% из последних 10', () => {
    expect(T.statusOf(run([true, true, true, true]).th)).toBe('progress'); // мало попыток
    expect(T.statusOf(run([true, true, true, true, true]).th)).toBe('won');
    expect(T.statusOf(run([true, false, true, false, true]).th)).toBe('progress'); // 60%
    expect(T.statusOf(run([false, false, false, true, true, true, true, true, true, true, true, true]).th)).toBe('won'); // в окне 10: 9/10
  });
  it('хранит только последние 10 попыток, общий счёт растёт; JSON-безопасен', () => {
    const p = run(Array(15).fill(true));
    expect(p.th.hist.length).toBe(10);
    expect(p.th.total).toBe(15);
    expect(T.normalizePassport(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });
  it('у каждой ловушки есть запись; мусор и неизвестные id отбрасываются', () => {
    const p = T.recordResult({ th: { hist: 'bad' }, zzz: { hist: [true] } }, 'zzz', true);
    expect(Object.keys(p)).toEqual(T.TRAPS.map((t) => t.id));
    expect(p.th.hist).toEqual([]);
  });
});

describe('Приоритет фраз со слабыми ловушками', () => {
  const weakTh = ['', '', ''].reduce((p) => T.recordResult(p, 'th', false), null); // th «в работе»
  const phrases = ['Go to bed', 'I think so', 'Not bad', 'Thank you for the ride'];

  it('без паспорта порядок не меняется', () => {
    expect(T.orderByWeakTraps(phrases, (x) => x, null, look)).toEqual(phrases);
  });
  it('слабая ловушка th: фразы с th идут первыми, остальные — в прежнем порядке', () => {
    const out = T.orderByWeakTraps(phrases, (x) => x, weakTh, look);
    expect(out.slice(0, 2)).toEqual(['I think so', 'Thank you for the ride']); // считаются разные слабые ловушки, не слова
    expect(out.slice(2)).toEqual(['Go to bed', 'Not bad']);
  });
  it('больше разных слабых ловушек — выше', () => {
    const weak2 = [false, false].reduce((p, ok) => T.recordResult(T.recordResult(p, 'th', ok), 'ae', ok), null);
    const out = T.orderByWeakTraps(['I think so', 'Thank you, that was bad'], (x) => x, weak2, look);
    expect(out[0]).toBe('Thank you, that was bad'); // th + [æ]
  });
  it('побеждённая ловушка не считается слабой', () => {
    const won = Array(5).fill(true).reduce((p, ok) => T.recordResult(p, 'th', ok), null);
    expect([...T.weakTraps(won)]).toEqual([]);
    expect(T.orderByWeakTraps(phrases, (x) => x, won, look)).toEqual(phrases);
  });
  it('группа важнее ловушек: «забытые» по FSRS остаются первыми', () => {
    const due = [{ t: 'Go to bed', lapsed: true }, { t: 'I think so', lapsed: false }];
    const out = T.orderByWeakTraps(due, (x) => x.t, weakTh, look, (x) => (x.lapsed ? 0 : 1));
    expect(out.map((x) => x.t)).toEqual(['Go to bed', 'I think so']);
  });
});
