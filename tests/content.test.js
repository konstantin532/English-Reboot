import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

/* Целостность контента: файлы content_*.js — классические скрипты с общим
   глобальным пространством, поэтому грузим их в одном vm-контексте в том же
   порядке, что и index.html, вместе с lex_us.js (дозаполнение IPA). */
const ORDER = ['content_grammar', 'content_vocab', 'content_extra', 'content_pro', 'content_us', 'lex_us'];
const ctx = { console: { log() {}, warn() {}, error() {} } };
ctx.window = ctx;
vm.createContext(ctx);
const src = ORDER.map((f) => fs.readFileSync(path.resolve(process.cwd(), 'js', f + '.js'), 'utf8')).join('\n;\n');
vm.runInContext(src + `
;this.__C = { grammar: GRAMMAR_CARDS, phrasal: PHRASAL_CARDS, collocations: COLLOCATION_CARDS, idioms: IDIOM_CARDS,
  conversation: CONVERSATION_CARDS, slang: SLANG_CARDS, minimal: MINIMAL_PAIR_CARDS, readings: READING_CARDS,
  pro: Object.values(PRO_CONTENT).flat() };`, ctx);
const C = ctx.__C;
const ALL = Object.values(C).flat();

function walk(o, fn, depth = 0) {
  if (!o || typeof o !== 'object' || depth > 8) return;
  fn(o);
  for (const v of Object.values(o)) if (v && typeof v === 'object') walk(v, fn, depth + 1);
}

describe('Контент: объём', () => {
  it('в разделе разговорных фраз 1100+ карточек, из них 1000+ американских', () => {
    expect(C.conversation.length).toBeGreaterThan(1100);
    expect(C.conversation.filter((c) => (c.tags || []).includes('США')).length).toBeGreaterThan(1000);
  });
  it('всего карточек больше 1800', () => {
    expect(new Set(ALL.map((c) => c.id)).size).toBeGreaterThan(1800);
  });
});

describe('Контент: структура', () => {
  it('id карточек уникальны внутри каждого раздела', () => {
    for (const [name, list] of Object.entries(C)) {
      if (name === 'pro') continue; // PRO-карточки дополняют разделы, их id проверяются вместе с ними
      const ids = list.map((c) => c.id);
      expect(new Set(ids).size, name).toBe(ids.length);
    }
  });

  it('у каждой карточки есть уровень A1–C1 и payload', () => {
    for (const c of ALL) {
      expect(['A1', 'A2', 'B1', 'B2', 'C1']).toContain(c.level);
      expect(c.payload).toBeDefined();
    }
  });
});

describe('Контент: тесты к карточкам', () => {
  it('правильный ответ всегда среди вариантов, варианты не повторяются', () => {
    let checked = 0;
    for (const c of ALL) {
      walk(c.payload, (o) => {
        if (!Array.isArray(o.options)) return;
        const a = o.correct ?? o.answer ?? o.correctIndex;
        if (a === undefined) return;
        checked++;
        if (typeof a === 'number') {
          expect(a >= 0 && a < o.options.length, `${c.id}: ${JSON.stringify(o).slice(0, 120)}`).toBe(true);
        } else {
          expect(o.options, c.id).toContain(a);
        }
        expect(new Set(o.options).size, `${c.id}: повтор варианта`).toBe(o.options.length);
      });
    }
    expect(checked).toBeGreaterThan(5000);
  });
});

describe('Контент: американские фразы', () => {
  const us = C.conversation.filter((c) => (c.tags || []).includes('США') && /^cv_\d{4}$/.test(c.id));
  it('фраза есть в ответе диалога и в примере', () => {
    const core = (s) => s.replace(/(\.\.\.|[?!.])+$/, '').trim().toLowerCase();
    for (const c of us) {
      const p = c.payload;
      expect(p.dialog[1].toLowerCase(), c.id).toContain(core(p.front));
      expect(p.examples[0].text.toLowerCase(), c.id).toContain(core(p.front));
    }
  });
  it('реплика собеседника не содержит саму фразу (иначе первый вопрос отвечает сам на себя)', () => {
    for (const c of us) {
      const core = c.payload.front.replace(/(\.\.\.|[?!.])+$/, '').trim().toLowerCase();
      expect(c.payload.dialog[0].toLowerCase().includes(core), c.id).toBe(false);
    }
  });
  it('у каждой американской карточки 5 тестов', () => {
    for (const c of us) expect(c.payload.test.length, c.id).toBe(5);
  });
});

describe('Контент: транскрипция', () => {
  it('у 100% слов в примерах есть IPA (lex_us.js)', () => {
    let words = 0, missing = [];
    for (const c of ALL) {
      walk(c.payload, (o) => {
        if (!Array.isArray(o.parts)) return;
        for (const p of o.parts) {
          if (!/[a-z]/i.test(String(p.word))) continue;
          words++;
          if (!p.ipa) missing.push(c.id + ':' + p.word);
        }
      });
    }
    expect(words).toBeGreaterThan(20000);
    expect(missing.slice(0, 10)).toEqual([]);
  });
});
