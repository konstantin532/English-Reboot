import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import '../js/ladder.js'; // classic-script: публикует globalThis.Ladder

const L = globalThis.Ladder;

// Реальные фразы content_us.js — тесты дистракторов гоняем по всему корпусу
const ctx = { console: { log() {}, warn() {}, error() {} }, CONVERSATION_CARDS: [] };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.resolve(process.cwd(), 'js/content_us.js'), 'utf8'), ctx);
const ITEMS = ctx.CONVERSATION_CARDS.filter(L.isUsCard).map(L.itemFromCard);
const byId = new Map(ITEMS.map((x) => [x.id, x]));
const byB = new Map(ITEMS.map((x) => [x.b, x]));
const byFront = new Map(ITEMS.map((x) => [x.front, x]));

// Детерминированный генератор случайных чисел
function rngFrom(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

const run = (answers, opts = {}) => {
  let l = L.normalize(null);
  const events = [];
  for (const a of answers) { const r = L.applyAnswer(l, a, opts); l = r.ladder; events.push(r.event); }
  return { l, events };
};

describe('Лестница: открытие ступеней', () => {
  it('новая фраза начинается со ступени 1', () => {
    expect(L.normalize(undefined).step).toBe(1);
  });
  it('нужно минимум 3 попытки: две верные ещё не открывают ступень', () => {
    expect(run([true, true]).l.step).toBe(1);
    expect(run([true, true, true]).l.step).toBe(2);
  });
  it('порог 80% из последних 5: 3 из 4 (75%) — мало, 4 из 5 — достаточно', () => {
    expect(L.canAdvance([true, false, true, true])).toBe(false);
    expect(L.canAdvance([true, false, true, true, true])).toBe(true);
    expect(L.canAdvance([false, false, true, true, true, true, true])).toBe(true); // считаются только последние 5
  });
  it('события: up при открытии, top на последней ступени', () => {
    const { l, events } = run(Array(3 * 8).fill(true), { hasTone: true });
    expect(events.filter((e) => e === 'up').length).toBe(7);
    expect(events.at(-1)).toBe('top');
    expect(l.step).toBe(8);
    expect(l.done).toBe(true);
  });
});

describe('Лестница: откат', () => {
  it('ошибка возвращает на ступень ниже', () => {
    const { l } = run([true, true, true, true, true, true]); // → ступень 3
    expect(l.step).toBe(3);
    const r = L.applyAnswer(l, false, {});
    expect(r.event).toBe('down');
    expect(r.ladder.step).toBe(2);
    expect(r.ladder.best).toBe(3); // рекорд сохраняется
  });
  it('ниже первой ступени не падаем', () => {
    const r = L.applyAnswer(L.normalize(null), false, {});
    expect(r.ladder.step).toBe(1);
    expect(r.event).toBe('stay');
  });
  it('после отката вернуться можно, набрав порог на нижней ступени снова', () => {
    let l = run([true, true, true, true, true, true]).l; // ступень 3
    l = L.applyAnswer(l, false, {}).ladder;               // → 2 (история ступени 2: T T T)
    const r = L.applyAnswer(l, true, {});                 // T T T T — 100%
    expect(r.ladder.step).toBe(3);
  });
  it('ошибка остаётся в окне ступени: после возвращения нужно добрать до 80%', () => {
    let l = run([true, true, true, true, true, true]).l;  // 3
    l = L.applyAnswer(l, false, {}).ladder;                // 2, hist[3] = [F]
    l = L.applyAnswer(l, true, {}).ladder;                 // 3
    l = L.applyAnswer(l, true, {}).ladder;                 // hist[3] = F T
    l = L.applyAnswer(l, true, {}).ladder;                 // F T T — 67%
    expect(l.step).toBe(3);
    l = L.applyAnswer(l, true, {}).ladder;                 // F T T T — 75%
    expect(l.step).toBe(3);
    l = L.applyAnswer(l, true, {}).ladder;                 // F T T T T — 80%
    expect(l.step).toBe(4);
  });
});

describe('Лестница: ступень 5 «Смени тон»', () => {
  it('без вариантов тона 4 → 6 и 6 → 4', () => {
    expect(L.nextStep(4, false)).toBe(6);
    expect(L.prevStep(6, false)).toBe(4);
    expect(L.nextStep(4, true)).toBe(5);
    expect(L.prevStep(6, true)).toBe(5);
  });
  it('фраза без тона проходит лестницу без 5-й ступени', () => {
    const { l } = run(Array(9).fill(true) .concat(Array(3).fill(true)), { hasTone: false });
    expect(l.step).toBe(6);
    expect(l.hist[5]).toBeUndefined();
  });
  it('фразу без тона, оказавшуюся на 5-й, переносим на 6-ю', () => {
    const r = L.applyAnswer({ step: 5 }, true, { hasTone: false });
    expect(r.from).toBe(6);
  });
  it('упражнение 5 строится только при наличии всех трёх вариантов', () => {
    const me = ITEMS[0];
    expect(L.buildExercise(5, me, ITEMS, { tones: {} })).toBe(null);
    const tones = { [me.front]: { polite: 'P', neutral: 'N', friend: 'F' } };
    const ex = L.buildExercise(5, me, ITEMS, { tones, rng: rngFrom(1) });
    expect(ex.options.length).toBe(3);
    expect(ex.options[ex.correct]).toBe(tones[me.front][ex.tone]);
  });
});

describe('Лестница: миграция и хранение', () => {
  it('старая запись без ladder и мусорные поля нормализуются', () => {
    expect(L.normalize({})).toEqual({ step: 1, best: 1, hist: {}, done: false, updated: null });
    const l = L.normalize({ step: 42, hist: { 2: [1, 0, 1, 1, 1, 1, 1], 99: [true], x: 'bad' } });
    expect(l.step).toBe(8);
    expect(l.hist[2].length).toBe(5);
    expect(l.hist[99]).toBeUndefined();
  });
  it('состояние переживает JSON (экспорт/импорт, автобэкап)', () => {
    const { l } = run([true, true, true, true, false]);
    expect(L.normalize(JSON.parse(JSON.stringify(l)))).toEqual(l);
  });
});

describe('Лестница: дистракторы из той же темы', () => {
  it('в корпусе 1000+ американских фраз', () => {
    expect(ITEMS.length).toBeGreaterThan(1000);
  });
  it('ступень 1: 4 варианта, все из той же темы, без повторов', () => {
    ITEMS.forEach((me, i) => {
      const ex = L.buildExercise(1, me, ITEMS, { rng: rngFrom(i) });
      expect(ex.options.length).toBe(4);
      expect(new Set(ex.options).size).toBe(4);
      expect(ex.options[ex.correct]).toBe(me.front);
      ex.options.forEach((o) => expect(byFront.get(o).theme).toBe(me.theme));
    });
  });
  it('ступень 2: 4 варианта той же темы, ни одного близкого по смыслу к верному', () => {
    ITEMS.forEach((me, i) => {
      const ex = L.buildExercise(2, me, ITEMS, { rng: rngFrom(i) });
      expect(ex.options.length).toBe(4);
      expect(ex.options[ex.correct]).toBe(me.b);
      ex.distractorIds.forEach((id) => {
        const x = byId.get(id);
        expect(x.theme).toBe(me.theme);
        expect(L.similar(me, x)).toBe(false);
      });
      ex.options.forEach((o) => expect(byB.get(o).theme).toBe(me.theme));
    });
  });
  it('оспоренная учеником пара больше не попадает в вопрос', () => {
    const me = ITEMS[0];
    const first = L.buildExercise(2, me, ITEMS, { rng: rngFrom(3) });
    const banned = first.distractorIds[0];
    const exclude = new Set([L.pairKey(me.id, banned)]);
    for (let k = 0; k < 30; k++) {
      expect(L.buildExercise(2, me, ITEMS, { rng: rngFrom(k), exclude }).distractorIds).not.toContain(banned);
    }
  });
  it('similar: синонимы из ручного списка и общие слова считаются близкими', () => {
    expect(L.similar({ front: "What's up?", ru: 'a' }, { front: "What's new?", ru: 'b' })).toBe(true);
    expect(L.similar({ front: 'Not much', ru: 'x' }, { front: 'Nothing much', ru: 'y' })).toBe(true);
    expect(L.similar({ front: 'Check, please', ru: 'Счёт, пожалуйста' }, { front: 'To go', ru: 'С собой' })).toBe(false);
  });
  it('ступень 3: банк = слова фразы + 2–3 ловушки из той же темы', () => {
    ITEMS.forEach((me, i) => {
      const ex = L.buildExercise(3, me, ITEMS, { rng: rngFrom(i) });
      expect(ex.traps.length).toBeGreaterThanOrEqual(2);
      expect(ex.bank.length).toBe(ex.answer.length + ex.traps.length);
      const pool = L.sameTopicPool(me, ITEMS, false).flatMap((x) => L.tokens(x.front).map((w) => w.toLowerCase()));
      ex.traps.forEach((t) => expect(pool).toContain(t.toLowerCase()));
      expect(L.checkAssembled(ex.answer, ex.answer)).toBe(true);
    });
  });
});

describe('Лестница: проверка ввода (ступень 4)', () => {
  it('регистр, пунктуация и сокращения не важны', () => {
    expect(L.checkTyped("what's up", "What's up?").ok).toBe(true);
    expect(L.checkTyped('I am down', "I'm down").exact).toBe(true);
    expect(L.checkTyped('I’m down!', "I'm down").exact).toBe(true);
  });
  it('одна опечатка в длинном слове прощается и показывается', () => {
    const r = L.checkTyped('I apreciate it', 'I appreciate it');
    expect(r.ok).toBe(true);
    expect(r.exact).toBe(false);
    expect(r.typos[0].want).toBe('appreciate');
  });
  it('короткие слова должны быть точными, лишние/пропущенные слова — ошибка', () => {
    expect(L.checkTyped('is up', 'It up').ok).toBe(false);
    expect(L.checkTyped('sounds', 'Sounds good').ok).toBe(false);
    expect(L.checkTyped('', 'Sounds good').ok).toBe(false);
  });
  it('usesPhrase находит фразу внутри ответа', () => {
    expect(L.usesPhrase("Sure, I'm down for pizza", "I'm down")).toBe(true);
    expect(L.usesPhrase('Sure, sounds great', "I'm down")).toBe(false);
    expect(L.usesPhrase('Long story short, I quit', 'Long story short...')).toBe(true);
  });
});
