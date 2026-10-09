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
  it('ученик A1 начинает с темы пакета A1 («Первая неделя»), хотя её фразы в конце курса', () => {
    const l = Today.buildLesson({ items: ITEMS, due: [], started: new Set(), level: 'A1' });
    expect(l.theme).toMatch(/^Первая неделя/);
    l.fresh.forEach((id) => expect(byId.get(id).sublevel).toBe('A1'));
    // без уровня и для B1 — прежний порядок курса
    expect(Today.buildLesson({ items: ITEMS, due: [], started: new Set() }).theme).toBe(ITEMS[0].theme);
    expect(Today.buildLesson({ items: ITEMS, due: [], started: new Set(), level: 'B1' }).theme).toBe(ITEMS[0].theme);
    // пакет своего уровня пройден — обычный порядок курса
    const almost = new Set(ITEMS.filter((x) => x.sublevel).map((x) => x.id));
    expect(Today.buildLesson({ items: ITEMS, due: [], started: almost, level: 'A1' }).theme).toBe(ITEMS[0].theme);
  });
  it('слова урока: сначала повторение (забытые первыми, не больше 3), потом новые своего уровня', () => {
    const W = Array.from({ length: 12 }, (_, i) => ({ id: 'wd_' + String(i + 1).padStart(4, '0'), level: 'A1', sublevel: 'A1' }));
    const base = { items: ITEMS, started: new Set(ITEMS.map((x) => x.id)), wordItems: W };
    // новичок: 5 новых слов по порядку курса
    const fresh = Today.buildLesson({ ...base, due: [], level: 'A1' });
    expect(fresh.words).toEqual(W.slice(0, 5).map((w) => w.id));
    expect(fresh.wordsDue).toBe(0);
    expect(Today.hasWork(fresh)).toBe(true); // одних слов хватает на урок
    // пора повторить 4 слова: в урок идут 3 (забытое первым) и 2 новых
    const started = new Set([...base.started, 'wd_0001', 'wd_0002', 'wd_0003', 'wd_0004']);
    const due = [{ cardId: 'wd_0002', status: 'review' }, { cardId: 'wd_0003', status: 'lapsed' }, { cardId: 'wd_0001', status: 'review' }, { cardId: 'wd_0004', status: 'review' }];
    const mix = Today.buildLesson({ ...base, started, due, level: 'A1' });
    expect(mix.words).toEqual(['wd_0003', 'wd_0002', 'wd_0001', 'wd_0005', 'wd_0006']);
    expect(mix.wordsDue).toBe(3);
    // ученику A2 новые слова A1 не даём — только повторение
    expect(Today.buildLesson({ ...base, started, due, level: 'A2' }).words).toEqual(['wd_0003', 'wd_0002', 'wd_0001']);
    // без раздела «Слова» блока нет
    expect(Today.buildLesson({ items: ITEMS, due: [], started: new Set() }).words).toEqual([]);
  });
  it('урок со словами продолжается со слов после заданий лестницы', () => {
    const saved = { date: '2026-10-06', tasks: [{ type: 'ex', id: 'cv_1001' }], idx: 1, words: ['wd_0001', 'wd_0002'], wordsDone: 1,
      scene: 'ep2-taxi', sceneDone: false, improv: 2, improvDone: 0 };
    expect(Today.resumable(saved, '2026-10-06').phase).toBe('words');
    expect(Today.resumable({ ...saved, wordsDone: 2 }, '2026-10-06').phase).toBe('scene');
  });
  it('сложность слов по подуровню: A1 — значение; A1+ — значение и буквы, повтор — на слух и перевод с русского', () => {
    expect(Today.wordDrills('A1', false)).toEqual(['meaning']);
    expect(Today.wordDrills('A1', true)).toEqual(['meaning']);
    expect(Today.wordDrills('A1+', false)).toEqual(['meaning', 'letters']);
    expect(Today.wordDrills('A1+', true)).toEqual(['listen', 'reverse']);
    // нет озвучки — «на слух» честно заменяется на «собери из букв»
    expect(Today.wordDrills('A1+', true, false)).toEqual(['letters', 'reverse']);
    // Глаголы A2: формы (LinguaLeo) + «скажи вслух» (ELSA) на повторе; без микрофона «вслух» не засчитывается, а пропускается
    expect(Today.wordDrills('A2', false, true, 'irr')).toEqual(['meaning', 'past']);
    expect(Today.wordDrills('A2', true, true, 'irr')).toEqual(['pp', 'did', 'say']);
    expect(Today.wordDrills('A2', true, true, 'reg')).toEqual(['did', 'say']);
    expect(Today.wordDrills('A2', true, true, 'irr', false)).toEqual(['pp', 'did']);
    expect(Today.wordDrills('A2', false, true, 'reg', false)).toEqual(['meaning', 'ed']);
    // подуровни выше A1+ пока получают набор A1+ (ELSA-задания — следующий шаг), без подуровня — A1
    expect(Today.wordDrills('A2', false)).toEqual(['meaning', 'letters']);
    expect(Today.wordDrills(undefined, false)).toEqual(['meaning']);
  });
  it('оценка слова: «знаю» только без единой ошибки', () => {
    expect(Today.gradeWord(0, 2)).toBe('know');
    expect(Today.gradeWord(1, 2)).toBe('hard');
    expect(Today.gradeWord(2, 2)).toBe('dontknow');
    expect(Today.gradeWord(1, 1)).toBe('dontknow');
  });
  it('«послушай и напиши»: регистр, пробелы и знаки не важны, буквы — важны', () => {
    expect(Today.sameWord('  Get Together! ', 'get together')).toBe(true);
    expect(Today.sameWord("dont", "don't")).toBe(true);
    expect(Today.sameWord('gether', 'get together')).toBe(false);
    expect(Today.sameWord('', 'go')).toBe(false);
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
  it('после сцены — спины импровизации: продолжаем с фазы improv, пока не сделаны все', () => {
    const base = { date: '2026-10-05', tasks, idx: 2, scene: 'ep1-airport', sceneDone: true, improv: 2 };
    expect(Today.resumable({ ...base, improvDone: 1 }, '2026-10-05').phase).toBe('improv');
    expect(Today.resumable({ ...base, improvDone: 2 }, '2026-10-05')).toBe(null);
    expect(Today.resumable({ ...base, sceneDone: false, improvDone: 0 }, '2026-10-05').phase).toBe('scene');
    expect(Today.buildLesson({ items: ITEMS, due: [], started: new Set(), improv: 2 }).improv).toBe(2);
  });
  it('урок дня пройден', () => {
    expect(Today.doneToday({ date: '2026-10-05', done: true }, '2026-10-05')).toBe(true);
    expect(Today.doneToday({ date: '2026-10-04', done: true }, '2026-10-05')).toBe(false);
  });
});
