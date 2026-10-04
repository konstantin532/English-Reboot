import { describe, it, expect } from 'vitest';
import '../js/srs.js'; // побочный импорт: classic-script файл сам публикует globalThis.SRS

const { SRS_CONFIG, FSRS, computeNextState, retrievability, gradeOf, storeForCard } = globalThis.SRS;

const TODAY = '2026-01-01';
// rand: () => 0.5 отключает случайный fuzz: 1 + (0.5*2-1)*0.15 = ровно 1.0
const opts = (over = {}) => ({ today: TODAY, rand: () => 0.5, answerTime: 6, ...over });
const dayDiff = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000);

// Прогон последовательности ответов: каждый следующий — в день, когда карточка due
function play(actions, first = TODAY) {
  let rec = null, today = first;
  const log = [];
  for (const a of actions) {
    const action = a === 'easy' ? 'know' : a;
    const res = computeNextState(rec, action, opts({ today, cardId: 'g1', answerTime: a === 'easy' ? 2 : 6 }));
    rec = res.rec;
    log.push({ interval: dayDiff(today, rec.nextReview), rec, logError: res.logError });
    today = rec.nextReview;
  }
  return log;
}

describe('FSRS: шкала оценок', () => {
  it('know/hard/dontknow → Good/Hard/Again, быстрый «Знаю» (< 3 с) → Easy', () => {
    expect(gradeOf('dontknow')).toBe(1);
    expect(gradeOf('hard')).toBe(2);
    expect(gradeOf('know', 6)).toBe(3);
    expect(gradeOf('know', 2)).toBe(4);
    expect(gradeOf('что-то странное')).toBe(1);
  });
});

describe('FSRS: новая карточка', () => {
  it("'know' → learning, шаг обучения 1 день, стабильность и сложность заданы", () => {
    const { rec, isNew, logError } = computeNextState(null, 'know', opts({ cardId: 'g1' }));
    expect(isNew).toBe(true);
    expect(logError).toBe(false);
    expect(rec.status).toBe('learning');
    expect(dayDiff(TODAY, rec.nextReview)).toBe(1);
    expect(rec.stability).toBeCloseTo(FSRS.w[2]);
    expect(rec.difficulty).toBeGreaterThanOrEqual(1);
    expect(rec.difficulty).toBeLessThanOrEqual(10);
  });

  it("'dontknow' → lapsed, повтор сегодня, идёт в журнал ошибок", () => {
    const { rec, logError } = computeNextState(null, 'dontknow', opts({ cardId: 'g1' }));
    expect(rec.status).toBe('lapsed');
    expect(rec.nextReview).toBe(TODAY);
    expect(rec.errorCount).toBe(1);
    expect(logError).toBe(true);
  });

  it('быстрый «Знаю» сразу даёт длинный интервал (Easy)', () => {
    const { rec } = computeNextState(null, 'know', opts({ cardId: 'g1', answerTime: 2 }));
    expect(dayDiff(TODAY, rec.nextReview)).toBeGreaterThan(7);
  });
});

describe('FSRS: серия правильных ответов', () => {
  it('интервалы растут монотонно и быстро (1 → неделя → месяц → квартал)', () => {
    const iv = play(['know', 'know', 'know', 'know', 'know']).map((x) => x.interval);
    for (let i = 1; i < iv.length; i++) expect(iv[i]).toBeGreaterThan(iv[i - 1]);
    expect(iv[0]).toBe(1);
    expect(iv[2]).toBeGreaterThanOrEqual(14);
    expect(iv[4]).toBeGreaterThanOrEqual(90);
  });

  it('карточка становится «Изучено», когда стабильность ≥ 90 дней', () => {
    const log = play(['know', 'know', 'know', 'know', 'know']);
    const last = log[log.length - 1].rec;
    expect(last.stability).toBeGreaterThanOrEqual(FSRS.masteredAt);
    expect(last.status).toBe('mastered');
  });

  it('интервал ограничен 5 годами', () => {
    const log = play(['easy', 'easy', 'easy', 'easy', 'easy']);
    for (const x of log) expect(x.interval).toBeLessThanOrEqual(FSRS.maxInterval);
  });

  it('fuzz ±15% только для интервалов от 3 дней', () => {
    const prev = play(['know', 'know'])[1].rec; // due через неделю
    const at = (r) => computeNextState(prev, 'know', opts({ today: prev.nextReview, rand: () => r })).rec.nextReview;
    const lo = dayDiff(prev.nextReview, at(0)), mid = dayDiff(prev.nextReview, at(0.5)), hi = dayDiff(prev.nextReview, at(0.999));
    expect(lo).toBeLessThanOrEqual(mid);
    expect(hi).toBeGreaterThanOrEqual(mid);
    expect(hi / mid).toBeLessThanOrEqual(1.16);
  });
});

describe('FSRS: «Сложно» и провал', () => {
  it("'hard' растит интервал медленнее, чем 'know'", () => {
    const good = play(['know', 'know', 'know'])[2].interval;
    const hard = play(['know', 'hard', 'hard'])[2].interval;
    expect(hard).toBeLessThan(good);
    expect(hard).toBeGreaterThanOrEqual(1);
  });

  it('ошибка после хорошей серии: стабильность падает, повтор сегодня, lapse засчитан', () => {
    const before = play(['know', 'know', 'know'])[2].rec;
    const { rec, logError } = computeNextState(before, 'dontknow', opts({ today: before.nextReview }));
    expect(rec.stability).toBeLessThan(before.stability);
    expect(rec.status).toBe('lapsed');
    expect(rec.nextReview).toBe(before.nextReview);
    expect(rec.lapseCount).toBe(1);
    expect(logError).toBe(true);
  });

  it('повторная ошибка в тот же день не роняет стабильность второй раз', () => {
    const lapsed = play(['know', 'know', 'know', 'dontknow'])[3].rec;
    const again = computeNextState(lapsed, 'dontknow', opts({ today: lapsed.lastReview })).rec;
    expect(again.stability).toBe(lapsed.stability);
    expect(again.lapseCount).toBe(lapsed.lapseCount);
  });

  it('выход из lapse: 2 «Знаю» подряд → снова learning', () => {
    const log = play(['know', 'know', 'know', 'dontknow', 'know', 'know']);
    expect(log[4].rec.status).toBe('lapsed');
    expect(log[4].interval).toBe(0);
    expect(log[5].rec.status).toBe('learning');
    expect(log[5].interval).toBeGreaterThanOrEqual(1);
  });
});

describe('FSRS: вероятность вспомнить', () => {
  it('в день повтора около 90%, через двойной интервал заметно ниже', () => {
    const rec = play(['know', 'know', 'know'])[2].rec;
    const r0 = retrievability(rec, rec.nextReview);
    const later = new Date(Date.parse(rec.nextReview) + dayDiff(rec.lastReview, rec.nextReview) * 86400000).toISOString().slice(0, 10);
    expect(r0).toBeGreaterThan(0.85);
    expect(r0).toBeLessThan(0.95);
    expect(retrievability(rec, later)).toBeLessThan(r0);
  });
});

describe('FSRS: совместимость со старыми записями', () => {
  it('запись старой лестницы (этап 4, ease 2.3) получает стабильность и сложность', () => {
    const old = { cardId: 'pv_001', status: 'reviewing', stage: 4, ease: 2.3, lastReview: '2025-12-01', nextReview: '2025-12-15' };
    const { rec } = computeNextState(old, 'know', opts({ today: '2025-12-15' }));
    expect(rec.stability).toBeGreaterThan(14);
    expect(rec.difficulty).toBeGreaterThan(1);
    expect(rec.storeName).toBe('phrasal_verbs');
    expect(rec.reps).toBe(1);
  });

  it('этап 1..6 по-прежнему вычисляется для интерфейса', () => {
    for (const x of play(['know', 'know', 'know', 'know', 'know'])) {
      expect(x.rec.stage).toBeGreaterThanOrEqual(1);
      expect(x.rec.stage).toBeLessThanOrEqual(SRS_CONFIG.maxStage);
    }
  });

  it('определение хранилища по id карточки', () => {
    expect(storeForCard('g12')).toBe('grammar_cards');
    expect(storeForCard('cv_1001')).toBe('conversation');
    expect(storeForCard('id_005')).toBe('idioms');
    expect(storeForCard('xx_1')).toBe(null);
  });
});
