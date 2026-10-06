import { describe, it, expect } from 'vitest';
import { loadContent, computeStats, formatStats, PLAN } from '../scripts/content_stats.mjs';

/* Табло «+4000»: счётчик объёма контента (scripts/content_stats.mjs). */
describe('Счётчик контента: план «+4000»', () => {
  const s = computeStats(loadContent());

  it('цели плана складываются в 4000 и по подуровням, и по типам', () => {
    expect(Object.values(PLAN.sublevels).reduce((a, b) => a + b, 0)).toBe(PLAN.total);
    expect(Object.values(PLAN.types).reduce((a, b) => a + b, 0)).toBe(PLAN.total);
  });

  it('пакет A1 (части 1 и 2): 400 слов + 200 фраз + 50 импровизаций = 650 — цель подуровня A1', () => {
    expect(s.plan.sublevels.A1).toBe(650);
    expect(s.plan.sublevels.A1).toBe(PLAN.sublevels.A1);
  });

  it('пакет A1+, часть 1: 150 слов + 30 фразовых глаголов + 75 фраз + 25 импровизаций = 280', () => {
    expect(s.bySection.words).toBe(550);
    expect(s.plan.sublevels['A1+']).toBe(280);
    expect(s.plan.types.vocab).toBe(30);
    expect(s.plan.done).toBe(930);
  });

  it('старый контент не считается сделанным по плану, всего карточек больше 2400', () => {
    expect(s.total).toBeGreaterThan(2400);
    expect(s.total - s.plan.done + s.plan.types.improv).toBeGreaterThan(1800);
    expect(s.byLevel.A1).toBeGreaterThan(780);
  });

  it('чистая функция: дубли id не считаются дважды, без sublevel — не план', () => {
    const fake = {
      sections: {
        words: [{ id: 'wd_1', level: 'A1', sublevel: 'A1', payload: { examples: [{ parts: [{ word: 'Hi!' }, { word: 'hi' }] }] } }],
        conversation: [{ id: 'cv_1', level: 'A2', payload: {} }, { id: 'cv_2', level: 'A2', sublevel: 'A2+', payload: {} }],
        phrasal: [{ id: 'cv_1', level: 'A2', payload: {} }],
      },
      improv: [{ id: 'x' }, { id: 'y', level: 'B1' }],
      stories: [],
    };
    const f = computeStats(fake);
    expect(f.total).toBe(3);
    expect(f.words).toBe(1);
    expect(f.plan.done).toBe(3);
    expect(f.plan.sublevels['A2+']).toBe(1);
    expect(f.plan.types).toEqual({ words: 1, phrases: 1, vocab: 0, improv: 1, live: 0 });
    expect(formatStats(f)).toContain('План «+4000»: 3 из 4000');
  });
});
