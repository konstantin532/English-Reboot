import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

/* Этап 4: импровизация — рулетка, таймер, условие, данные карточек и историй. */
const ORDER = ['content_us', 'tone_us', 'ladder', 'scenes', 'improv', 'improv_us'];
const ctx = { console: { log() {}, warn() {}, error() {} }, CONVERSATION_CARDS: [] };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(ORDER.map((f) => fs.readFileSync(path.resolve(process.cwd(), 'js', f + '.js'), 'utf8')).join('\n;\n'), ctx);

const { Improv: I, IMPROV_CARDS: CARDS, YES_AND_STORIES: STORIES, TONE_VARIANTS: TONES } = ctx;
const PHRASES = new Set(ctx.CONVERSATION_CARDS.map((c) => c.payload.front));
function rngFrom(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

describe('Данные импровизации', () => {
  it('165 карточек ситуаций (50 — A1, 50 — A1+, 25 — A2) и 15 историй «Yes, and…», id уникальны', () => {
    expect(CARDS.length).toBe(165);
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(165);
    expect(CARDS.filter((c) => c.level === 'A1').length).toBe(50);
    expect(CARDS.filter((c) => c.level === 'A1+').length).toBe(50);
    expect(CARDS.filter((c) => c.level === 'A2').length).toBe(25);
    expect(STORIES.length).toBe(15);
    expect(new Set(STORIES.map((s) => s.id)).size).toBe(15);
  });
  it('каждая фраза-условие есть в content_us.js и звучит хотя бы в одном образце (с учётом отрицаний)', () => {
    CARDS.forEach((c) => expect(I.validateCard(c, PHRASES)).toEqual([]));
  });
  it('истории: 3–4 хода, у каждого хода реплика и ≥2 образца продолжения', () => {
    STORIES.forEach((s) => expect(I.validateStory(s)).toEqual([]));
  });
  it('валидатор ловит поломки: фразы нет в курсе, условие не звучит в образцах', () => {
    const bad = { ...CARDS[0], phrases: ['Totally made up phrase', CARDS[0].phrases[0]], samples: ['Hello there.', 'Hi.', 'Hey.'] };
    const errs = I.validateCard(bad, PHRASES).join('\n');
    expect(errs).toMatch(/нет в content_us/);
    expect(errs).toMatch(/ни один образец/);
  });
});

describe('Рулетка', () => {
  it('спин: карточка + настроение + условие из фраз этой карточки', () => {
    const r = I.spin({ cards: CARDS, rng: rngFrom(1) });
    expect(CARDS).toContain(r.card);
    expect(I.MOODS).toContain(r.mood);
    expect(r.card.phrases).toContain(r.condition);
  });
  it('карточка не повторяется в пределах 5 спинов', () => {
    let recent = [];
    for (let i = 0; i < 60; i++) {
      const r = I.spin({ cards: CARDS, recent, rng: rngFrom(i) });
      expect(recent.slice(-5)).not.toContain(r.card.id);
      recent = I.pushRecent(recent, r.card.id);
      expect(recent.length).toBeLessThanOrEqual(5);
    }
  });
  it('знакомые фразы (ступень ≥4) в приоритете — и как карточка, и как условие', () => {
    const known = new Set(["I'm stuck in traffic"]);
    for (let i = 0; i < 20; i++) {
      const r = I.spin({ cards: CARDS, known, rng: rngFrom(i) });
      expect(r.card.id).toBe('late-meeting');
      expect(r.condition).toBe("I'm stuck in traffic");
    }
  });
  it('приоритет по score (слабые ловушки): выбираются карточки с максимальным баллом', () => {
    const score = (c) => (c.place === 'Созвон' ? 2 : 0);
    for (let i = 0; i < 20; i++) expect(I.spin({ cards: CARDS, score, rng: rngFrom(i) }).card.place).toBe('Созвон');
  });
  it('все карточки недавно были — рулетка всё равно работает', () => {
    const few = CARDS.slice(0, 2);
    expect(I.spin({ cards: few, recent: few.map((c) => c.id) })).not.toBe(null);
    expect(I.spin({ cards: [] })).toBe(null);
  });
});

describe('Таймер и условие', () => {
  it('20 секунд для A1–A2 и без уровня, 30 — для B1+', () => {
    expect(I.timerFor('A1')).toBe(20);
    expect(I.timerFor('A2')).toBe(20);
    expect(I.timerFor(null)).toBe(20);
    expect(I.timerFor('B1')).toBe(30);
    expect(I.timerFor('B2')).toBe(30);
  });
  it('обратный отсчёт, «+10 с» и потолок 60 с', () => {
    const t = I.createTimer(20, 1000);
    expect(I.remaining(t, 1000)).toBe(20);
    expect(I.remaining(t, 6500)).toBe(15);
    expect(I.isOver(t, 21000)).toBe(true);
    const t2 = I.addTime(t);
    expect(I.remaining(t2, 21000)).toBe(10);
    expect(I.addTime(I.addTime(I.addTime(I.addTime(I.addTime(t2))))).total).toBe(60);
  });
  it('условие проверяется честно: есть фраза — true, нет — false, только голос — null', () => {
    expect(I.conditionMet("Ugh, I'm stuck in traffic!", "I'm stuck in traffic")).toBe(true);
    expect(I.conditionMet('I will be late', "I'm stuck in traffic")).toBe(false);
    expect(I.conditionMet("I'm not stuck in traffic", "I'm stuck in traffic")).toBe(false);
    expect(I.conditionMet('', "I'm stuck in traffic")).toBe(null);
  });
  it('вариант тона засчитывается и подсказывается под настроение', () => {
    expect(I.conditionMet('Thanks, man!', 'Thanks a lot', TONES)).toBe(true);
    const boss = I.moodById.get('boss');
    expect(I.toneHint('Thanks a lot', boss, TONES)).toBe(TONES['Thanks a lot'].polite);
    expect(I.toneHint('Congrats!', boss, TONES)).toBe(null);
  });
});

describe('Статистика settings.improv', () => {
  it('спины, записи, проверенные условия и самооценка считаются раздельно', () => {
    let s = I.recordRound(null, { cardId: 'bus', recorded: true, condition: true, selfOk: true });
    s = I.recordRound(s, { cardId: 'exam', recorded: false, condition: null, selfOk: false });
    s = I.recordRound(s, { yesAnd: true, recorded: true });
    expect(s).toEqual({ spins: 2, recorded: 2, condOk: 1, condChecked: 1, selfOk: 1, yesAnd: 1, recent: ['bus', 'exam'] });
    expect(I.normalizeStats(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
});
