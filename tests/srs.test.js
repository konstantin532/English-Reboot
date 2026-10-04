import { describe, it, expect } from 'vitest';
import '../js/srs.js'; // выполняет файл → в globalThis появляется SRS
// Если у тебя ES-модуль — вместо этого: import { nextInterval, INTERVALS } from '../js/файл.js';

const { INTERVALS, nextInterval } = globalThis.SRS;
const days = (idx) => INTERVALS[idx];

describe('SRS: цепочка интервалов', () => {
  it('серия правильных даёт ровно 1→3→7→14→30→90', () => {
    let idx = null; // null — прогресса нет
    const sequence = [];
    for (let i = 0; i < 8; i++) {
      idx = nextInterval(idx, true);
      sequence.push(days(idx));
    }
    expect(sequence).toEqual([1, 3, 7, 14, 30, 90, 90, 90]);
  });

  it('первый правильный ответ → 1 день', () => {
    expect(days(nextInterval(null, true))).toBe(1);
  });

  it('cap: после 90 интервал не растёт', () => {
    const last = INTERVALS.length - 1;
    expect(nextInterval(last, true)).toBe(last);
  });
});

describe('SRS: провал', () => {
  it('провал возвращает карточку на начальный этап', () => {
    // ОЖИДАЕМОЕ (по описанию SRS): сброс на новую карточку.
    // ФАКТИЧЕСКОЕ: ← впиши сюда, что реально делает твой код,
    // и приведи assert к факту. Если факт расходится с описанием —
    // ЛОГИКУ НЕ ПРАВИМ, отмечаем комментарием и сообщаем.
    expect(nextInterval(3, false)).toBeNull();
  });
});

describe('SRS: граничные случаи', () => {
  it('карточка без записи прогресса трактуется как новая', () => {
    expect(days(nextInterval(null, true))).toBe(1);
    expect(days(nextInterval(undefined, true))).toBe(1);
  });

  it('null/undefined/мусор на входе не роняют код', () => {
    expect(() => nextInterval(null, true)).not.toThrow();
    expect(() => nextInterval(undefined, false)).not.toThrow();
    expect(() => nextInterval(null, null)).not.toThrow();
    expect(() => nextInterval('abc', true)).not.toThrow();
  });
});
