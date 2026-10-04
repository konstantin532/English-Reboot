import { describe, it, expect } from 'vitest';
import '../js/srs.js'; // побочный импорт: classic-script файл сам публикует globalThis.SRS

const { SRS_CONFIG, computeNextState, getNextInterval, storeForCard } = globalThis.SRS;

const TODAY = '2025-06-01';

// rand: () => 0.5 отключает случайный fuzz: fuzz = 1 + (0.5*2-1)*0.15 = ровно 1.0
const opts = (over = {}) => ({ today: TODAY, rand: () => 0.5, ...over });

const dayDiff = (from, to) => Math.round((new Date(to) - new Date(from)) / 86400000);

function makePrev(over = {}) {
  return {
    cardId: 'g1', storeName: 'grammar_cards', status: 'reviewing',
    stage: 1, ease: 2.5, errorCount: 0, knownCount: 0,
    lapseCount: 0, lapseReviews: 0, lastAnswerTime: null,
    lastReview: '2025-05-01', nextReview: TODAY,
    createdAt: '2025-05-01', mark: 'know',
    ...over,
  };
}

describe('SRS: новая карточка', () => {
  it("'know' → этап 1, статус learning, повтор ровно через 1 день", () => {
    const { rec, isNew, logError } = computeNextState(null, 'know', opts({ cardId: 'g1' }));
    expect(isNew).toBe(true);
    expect(logError).toBe(false);
    expect(rec.stage).toBe(1);
    expect(rec.status).toBe('learning');
    expect(rec.ease).toBe(SRS_CONFIG.easeDefault); // 2.5
    expect(dayDiff(TODAY, rec.nextReview)).toBe(1);
  });

  it("'dontknow' → lapse, повтор сегодня, ease снижен, идёт в журнал ошибок", () => {
    const { rec, logError } = computeNextState(null, 'dontknow', opts({ cardId: 'g1' }));
    expect(rec.status).toBe('lapsed');
    expect(rec.stage).toBe(1);
    expect(rec.nextReview).toBe(TODAY);
    expect(rec.ease).toBeCloseTo(SRS_CONFIG.easeDefault - SRS_CONFIG.easePenalty);
    expect(rec.errorCount).toBe(1);
    expect(logError).toBe(true);
  });
});

describe('SRS: серия правильных ответов', () => {
  it('базовая лестница этапов — ровно 1→3→7→14→30→90 (как в README)', () => {
    expect([1, 2, 3, 4, 5, 6].map(getNextInterval)).toEqual([1, 3, 7, 14, 30, 90]);
  });

  it('этап идёт 1→2→3→4→5→6 и залипает на 6 (cap по ЭТАПУ)', () => {
    let prev = null;
    const stages = [];
    for (let i = 0; i < 8; i++) {
      const plan = computeNextState(prev, 'know', opts({ cardId: 'g1' }));
      prev = plan.rec;
      stages.push(prev.stage);
    }
    expect(stages).toEqual([1, 2, 3, 4, 5, 6, 6, 6]);
    expect(prev.status).toBe('mastered');
  });

  it('ФАКТИЧЕСКОЕ ПОВЕДЕНИЕ — расходится с README: дни интервала ≠ 1→3→7→14→30→90', () => {
    // README: цепочка 1→3→7→14→30→90. В коде это БАЗА этапа, из которой
    // реальный интервал = база × ease (2.5→3.0) × скорость ответа (0.8–1.2) × fuzz (±15%).
    // Cap стоит на этапе (maxStage 6), а не на днях: на 6-м этапе дни могут быть > 90.
    // Логику НЕ меняем — фиксируем факт. Подробности — в README раздел «Тесты и CI».
    let prev = null;
    const days = [];
    for (let i = 0; i < 7; i++) {
      const plan = computeNextState(prev, 'know', opts({ cardId: 'g1' }));
      days.push(dayDiff(TODAY, plan.rec.nextReview));
      prev = plan.rec;
    }
    expect(days).toEqual([1, 8, 19, 39, 87, 270, 270]);
  });

  it('fuzz ±15%: интервал гуляет по коридору', () => {
    const prev = makePrev({ stage: 1, ease: 2.5, status: 'reviewing' });
    const hi = computeNextState(prev, 'know', opts({ rand: () => 1 }));
    const lo = computeNextState(prev, 'know', opts({ rand: () => 0 }));
    expect(dayDiff(TODAY, hi.rec.nextReview)).toBe(9);  // round(3 × 2.6 × 1.15)
    expect(dayDiff(TODAY, lo.rec.nextReview)).toBe(7);  // round(3 × 2.6 × 0.85)
  });
});

describe('SRS: провал и «сложно»', () => {
  it("'dontknow' возвращает карточку на этап 1, статус lapsed, повтор СЕГОДНЯ", () => {
    const prev = makePrev({ stage: 4, status: 'reviewing', lapseCount: 0 });
    const { rec, logError } = computeNextState(prev, 'dontknow', opts());
    expect(rec.stage).toBe(1);
    expect(rec.status).toBe('lapsed');
    expect(rec.nextReview).toBe(TODAY); // из-за провала карта назнается снова на этот же день
    expect(rec.lapseCount).toBe(1);
    expect(rec.errorCount).toBe(1);
    expect(logError).toBe(true);
  });

  it("'hard' не двигает этап и делит базовый интервал пополам", () => {
    const prev = makePrev({ stage: 3, ease: 2.5 });
    const { rec } = computeNextState(prev, 'hard', opts());
    expect(rec.stage).toBe(3);
    expect(rec.status).toBe('learning');
    expect(rec.ease).toBeCloseTo(2.3);
    expect(dayDiff(TODAY, rec.nextReview)).toBe(4); // round(7 × 0.5)
  });

  it('выход из lapse: 2 «Знаю» подряд → снова learning', () => {
    const lapsed = makePrev({ status: 'lapsed', stage: 1, lapseCount: 1, lapseReviews: 0 });
    const first = computeNextState(lapsed, 'know', opts()).rec;
    expect(first.status).toBe('lapsed');  // ещё не вышел
    expect(first.nextReview).toBe(TODAY); // повтор в тот же день
    const second = computeNextState(first, 'know', opts()).rec;
    expect(second.status).toBe('learning');
    expect(second.lapseReviews).toBe(0);
    expect(dayDiff(TODAY, second.nextReview)).toBe(1);
  });
});

describe('SRS: граничные случаи', () => {
  it('старая запись без ease/storeName — дозаполняются дефолты и хранилище', () => {
    const prev = { cardId: 'id3', stage: 2 }; // минимальная старая запись
    const { rec } = computeNextState(prev, 'know', opts());
    expect(rec.storeName).toBe(storeForCard('id3')); // 'idioms'
    expect(rec.ease).toBeCloseTo(SRS_CONFIG.easeDefault + SRS_CONFIG.easeStep); // 2.6
  });

  it('null/undefined на входе не роняют код (cardId валиден)', () => {
    expect(() => computeNextState(null, 'know', { cardId: 'g1' })).not.toThrow();
    expect(() => computeNextState(null, undefined, { cardId: 'sl1' })).not.toThrow();
    expect(() => computeNextState(makePrev(), undefined, {})).not.toThrow();
  });

  it('ФАКТИЧЕСКОЕ поведение: cardId обязателен — без него TypeError (приложение не падает: saveProgress гасит try/catch)', () => {
    // storeForCard(undefined) → undefined.startsWith → TypeError.
    // Чистая функция без try/catch по дизайну; защита от мусора живёт в saveProgress.
    expect(() => computeNextState(null, 'know', {})).toThrow(TypeError);
    expect(() => computeNextState(null, 'know', { cardId: 123 })).toThrow(TypeError);
  });

  it('неизвестное действие трактуется как провал (ветка else)', () => {
    const { rec } = computeNextState(makePrev({ stage: 2 }), 'mystery', opts());
    expect(rec.status).toBe('lapsed');
    expect(rec.stage).toBe(1);
  });
});
