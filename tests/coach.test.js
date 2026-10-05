import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

/* Этап 6: честная мотивация — реплики коуча и лига темпов. */
const ctx = { console: { log() {}, warn() {}, error() {} } };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(['coach', 'pacers'].map((f) => fs.readFileSync(path.resolve(process.cwd(), 'js', f + '.js'), 'utf8')).join('\n;\n'), ctx);
const { Coach: C, Pacers: P } = ctx;
const log = (o) => Object.entries(o).map(([date, spoken]) => ({ date, spoken }));

describe('Реплики коуча', () => {
  it('все разделы на месте, line() возвращает строку', () => {
    ['ladder', 'traps', 'today', 'scenes', 'improv', 'day', 'league'].forEach((s) => expect(typeof C.LINES[s]).toBe('object'));
    ['ok', 'typo', 'self', 'miss', 'selfMiss', 'up', 'down', 'top'].forEach((k) => expect(C.line('ladder', k).length).toBeGreaterThan(0));
    expect(C.line('today', 'resume')).toContain('паузе');
    expect(C.line('нет', 'такого')).toBe('');
  });
  it('без проверки — без похвалы: в UNCHECKED нет хвалебных слов', () => {
    const PRAISE = /(точно|есть!|отлично|молодец|супер|чисто|именно так|так держать|вот это|умни|браво|идеально|великолепн)/i;
    C.UNCHECKED.forEach(([s, k]) => {
      const v = C.LINES[s][k];
      expect(v).toBeDefined();
      (Array.isArray(v) ? v : [v]).forEach((t) => expect(PRAISE.test(t)).toBe(false));
    });
  });
  it('в репликах нет обещаний про «появится позже» — распознавание уже есть', () => {
    expect(C.line('scenes', 'voiceOnly')).not.toContain('появится');
  });
});

describe('Реплика дня — по фактам', () => {
  it('ноль, первый день, возвращение, рекорд, больше вчерашнего, ровно', () => {
    expect(C.dayKey({ today: 0 })).toBe('zero');
    expect(C.dayKey({ today: 4, hadBefore: false })).toBe('first');
    expect(C.dayKey({ today: 4, hadBefore: true, gapDays: 5, bestPrevDay: 20 })).toBe('back');
    expect(C.dayKey({ today: 21, hadBefore: true, gapDays: 1, bestPrevDay: 20, yesterday: 3 })).toBe('record');
    expect(C.dayKey({ today: 9, hadBefore: true, gapDays: 1, bestPrevDay: 20, yesterday: 3 })).toBe('more');
    expect(C.dayKey({ today: 3, hadBefore: true, gapDays: 1, bestPrevDay: 20, yesterday: 9 })).toBe('steady');
  });
  it('текст с правильными числами и падежами', () => {
    expect(C.dayLine({ today: 9, yesterday: 3, hadBefore: true, gapDays: 1, bestPrevDay: 20 }).text)
      .toBe('Сегодня 9 фраз вслух — на 6 фраз больше, чем вчера.');
    expect(C.dayLine({ today: 1, hadBefore: false }).text).toBe('Первый день: 1 фраза вслух. Отсчёт пошёл.');
    expect(C.dayLine({ today: 2, hadBefore: true, gapDays: 4, bestPrevDay: 9 }).text).toContain('перерыв 4 дня');
  });
  it('строка темпа: впереди / ровно / не хватает', () => {
    expect(C.paceLine({ name: '90 дней', diff: 3 })).toBe('Ты впереди темпа «90 дней» на 3 фразы.');
    expect(C.paceLine({ name: '90 дней', diff: 0 })).toBe('Ты идёшь ровно в темпе «90 дней».');
    expect(C.paceLine({ name: '90 дней', diff: -11 })).toBe('До темпа «90 дней» на этой неделе не хватает 11 фраз.');
  });
});

describe('Лига темпов', () => {
  it('неделя начинается с понедельника', () => {
    expect(P.weekStart('2026-10-05')).toBe('2026-10-05'); // понедельник
    expect(P.weekStart('2026-10-11')).toBe('2026-10-05'); // воскресенье
    expect(P.weekStart('2026-10-07')).toBe('2026-10-05');
  });
  it('пейсеры растут строго по расписанию, ты — по своим фразам вслух за неделю', () => {
    const logs = log({ '2026-10-04': 50, '2026-10-05': 12, '2026-10-06': 9, '2026-10-07': 14 }); // 4-е — прошлая неделя
    const t = P.table(logs, '2026-10-07');
    expect(t.days).toBe(3);
    expect(t.me).toBe(35);
    const by = Object.fromEntries(t.rows.map((r) => [r.id, r.count]));
    expect(by).toEqual({ me: 35, warmup: 15, norm: 30, goal90: 45, marathon: 75 });
    expect(t.rows.map((r) => r.id)).toEqual(['marathon', 'goal90', 'me', 'norm', 'warmup']);
    expect(t.goal).toEqual({ name: '90 дней', diff: -10 });
    expect(P.table(logs, '2026-10-07').rows).toEqual(t.rows); // без случайностей
  });
  it('при равенстве ты выше пейсера', () => {
    const t = P.table(log({ '2026-10-05': 15 }), '2026-10-05');
    const ids = t.rows.map((r) => r.id);
    expect(ids.indexOf('me')).toBeLessThan(ids.indexOf('goal90'));
  });
  it('у ботов нет человеческих имён, у каждого — открытое правило', () => {
    P.LIST.forEach((p) => { expect(p.perDay).toBeGreaterThan(0); expect(/^[A-Z][a-z]+$/.test(p.name)).toBe(false); });
    const html = P.leagueHtml(P.table([], '2026-10-05'));
    expect((html.match(/🤖 бот/g) || []).length).toBe(P.LIST.length);
    expect(html).toContain('не люди');
  });
  it('7 дней для графика и факты для реплики дня', () => {
    const logs = log({ '2026-10-01': 4, '2026-10-06': 9, '2026-10-07': 12 });
    const d = P.lastDays(logs, '2026-10-07', 7);
    expect(d.length).toBe(7);
    expect({ ...d[6] }).toEqual({ date: '2026-10-07', spoken: 12, label: 'Ср', today: true });
    expect(d[0].date).toBe('2026-10-01');
    expect(P.facts(logs, '2026-10-07')).toEqual({ today: 12, yesterday: 9, bestPrevDay: 9, hadBefore: true, gapDays: 1 });
    expect(P.facts([], '2026-10-07')).toEqual({ today: 0, yesterday: 0, bestPrevDay: 0, hadBefore: false, gapDays: null });
  });
});
