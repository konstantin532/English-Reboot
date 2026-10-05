import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

/* Этап 2: план урока «Сегодня». Реальные фразы и ловушки — в том же порядке загрузки, что index.html. */
const ORDER = ['content_grammar', 'content_vocab', 'content_extra', 'content_pro', 'content_us', 'lex_us', 'traps_us', 'ladder', 'today'];
const ctx = { console: { log() {}, warn() {}, error() {} } };
ctx.window = ctx;
vm.createContext(ctx);
const src = ORDER.map((f) => fs.readFileSync(path.resolve(process.cwd(), 'js', f + '.js'), 'utf8')).join('\n;\n');
vm.runInContext(src + ';this.__C = CONVERSATION_CARDS; this.__L = LEX_US;', ctx);

const { Today, Ladder, AccentTraps: T } = ctx;
const ITEMS = ctx.__C.filter(Ladder.isUsCard).map(Ladder.itemFromCard);
const look = T.makeLookup(ctx.__C, ctx.__L);
const byId = new Map(ITEMS.map((x) => [x.id, x]));
const due = (ids, status = 'learning') => ids.map((cardId) => ({ cardId, status }));
const count = (tasks, type) => tasks.filter((t) => t.type === type).length;

describe('Урок «Сегодня»: новичок', () => {
  const lesson = Today.buildLesson({ items: ITEMS, due: [], started: new Set() });

  it('без повторов разминки нет, 3 новые фразы одной темы', () => {
    expect(lesson.warmup).toEqual([]);
    expect(lesson.fresh.length).toBe(3);
    expect(new Set(lesson.fresh.map((id) => byId.get(id).theme)).size).toBe(1);
    expect(lesson.theme).toBe(byId.get(lesson.fresh[0]).theme);
  });
  it('первое задание — знакомство с фразой «повтори вслух», затем 3 круга лестницы', () => {
    expect(lesson.tasks[0].type).toBe('intro');
    expect(count(lesson.tasks, 'intro')).toBe(3);
    expect(count(lesson.tasks, 'ex')).toBe(9);
    expect(lesson.tasks.slice(3).map((t) => t.id)).toEqual([...lesson.fresh, ...lesson.fresh, ...lesson.fresh]);
  });
  it('новичок начинает с самой первой темы курса', () => {
    expect(lesson.theme).toBe(ITEMS[0].theme);
  });
});

describe('Урок «Сегодня»: разминка по FSRS', () => {
  const started = new Set(ITEMS.slice(0, 20).map((x) => x.id));
  const queue = due(ITEMS.slice(0, 8).map((x) => x.id));

  it('не больше 5 фраз разминки, по одному упражнению', () => {
    const l = Today.buildLesson({ items: ITEMS, due: queue, started });
    expect(l.warmup.length).toBe(5);
    expect(l.tasks.slice(0, 5).every((t) => t.type === 'ex' && t.label === 'Разминка')).toBe(true);
  });
  it('новые фразы — без прогресса и не из разминки, без дублей в уроке', () => {
    const l = Today.buildLesson({ items: ITEMS, due: queue, started });
    l.fresh.forEach((id) => { expect(started.has(id)).toBe(false); expect(l.warmup).not.toContain(id); });
    expect(new Set([...l.warmup, ...l.fresh]).size).toBe(l.warmup.length + l.fresh.length);
  });
  it('карточки не из американских фраз (грамматика, идиомы) в разминку не попадают', () => {
    const l = Today.buildLesson({ items: ITEMS, due: [{ cardId: 'g12' }, { cardId: 'id_5' }, ...queue], started });
    expect(l.warmup).not.toContain('g12');
    expect(l.warmup).not.toContain('id_5');
  });
  it('забытые (lapsed) идут первыми', () => {
    const q = [...due(ITEMS.slice(0, 6).map((x) => x.id)), { cardId: ITEMS[7].id, status: 'lapsed' }];
    expect(Today.buildLesson({ items: ITEMS, due: q, started }).warmup[0]).toBe(ITEMS[7].id);
  });
  it('слабая ловушка th поднимает фразы с th — и в разминке, и в новых', () => {
    const passport = [false, false, true].reduce((p, ok) => T.recordResult(p, 'th', ok), null);
    const hasTh = (id) => T.trapIdsOf(byId.get(id).front, look).includes('th');
    const pool = ITEMS.slice(0, 40);
    const l = Today.buildLesson({ items: ITEMS, due: due(pool.map((x) => x.id)), started: new Set(pool.map((x) => x.id)), passport, lookup: look });
    const thInPool = pool.filter((x) => hasTh(x.id)).length;
    expect(l.warmup.slice(0, Math.min(5, thInPool)).every(hasTh)).toBe(true);
    const plain = Today.buildLesson({ items: ITEMS, due: [], started: new Set(), passport, lookup: look });
    expect(hasTh(plain.fresh[0])).toBe(true);
  });
});

describe('Урок «Сегодня»: выбор темы и края', () => {
  it('тема с ≥3 новыми фразами; если такой нет — где новых больше всего', () => {
    const f = [{ id: 'a', theme: 'X' }, { id: 'b', theme: 'Y' }, { id: 'c', theme: 'Y' }, { id: 'd', theme: 'Y' }];
    expect(Today.pickTheme(f, 3)).toBe('Y');
    expect(Today.pickTheme(f.slice(0, 3), 3)).toBe('Y');
    expect(Today.pickTheme([], 3)).toBe(null);
  });
  it('заданная тема соблюдается', () => {
    const l = Today.buildLesson({ items: ITEMS, due: [], started: new Set(), theme: 'Отель' });
    l.fresh.forEach((id) => expect(byId.get(id).theme).toBe('Отель'));
  });
  it('всё пройдено и нечего повторять — пустой урок', () => {
    const l = Today.buildLesson({ items: ITEMS, due: [], started: new Set(ITEMS.map((x) => x.id)) });
    expect(l.tasks).toEqual([]);
    expect(l.theme).toBe(null);
  });
});

describe('Урок «Сегодня»: продолжение прерванного урока', () => {
  const tasks = [{ type: 'intro', id: 'cv_1001' }, { type: 'ex', id: 'cv_1001' }];
  it('продолжаем только урок сегодняшнего дня, не законченный', () => {
    expect(Today.resumable({ date: '2026-10-05', tasks, idx: 1 }, '2026-10-05').idx).toBe(1);
    expect(Today.resumable({ date: '2026-10-04', tasks, idx: 1 }, '2026-10-05')).toBe(null);
    expect(Today.resumable({ date: '2026-10-05', tasks, idx: 1, done: true }, '2026-10-05')).toBe(null);
    expect(Today.resumable({ date: '2026-10-05', tasks, idx: 2 }, '2026-10-05')).toBe(null);
    expect(Today.resumable(null, '2026-10-05')).toBe(null);
  });
  it('задания пройдены, но сцена — нет: продолжаем со сцены', () => {
    const r = Today.resumable({ date: '2026-10-05', tasks, idx: 2, scene: 'ep1-airport' }, '2026-10-05');
    expect(r.phase).toBe('scene');
    expect(Today.resumable({ date: '2026-10-05', tasks, idx: 2, scene: 'ep1-airport', sceneDone: true }, '2026-10-05')).toBe(null);
    expect(Today.resumable({ date: '2026-10-05', tasks: [], idx: 0, scene: 'ep1-airport' }, '2026-10-05').phase).toBe('scene');
    expect(Today.resumable({ date: '2026-10-05', tasks, idx: 0 }, '2026-10-05').phase).toBe('tasks');
  });
  it('сцена попадает в план; урок только со сценой — не пустой', () => {
    const l = Today.buildLesson({ items: ITEMS, due: [], started: new Set(ITEMS.map((x) => x.id)), scene: 'ep2-taxi' });
    expect(l.tasks).toEqual([]);
    expect(l.scene).toBe('ep2-taxi');
    expect(Today.hasWork(l)).toBe(true);
    expect(Today.hasWork({ tasks: [], scene: null })).toBe(false);
  });
  it('урок дня пройден', () => {
    expect(Today.doneToday({ date: '2026-10-05', done: true }, '2026-10-05')).toBe(true);
    expect(Today.doneToday({ date: '2026-10-04', done: true }, '2026-10-05')).toBe(false);
  });
});
