/* ==========================================================================
   English Reboot — Этап 2: «Сегодня» — урок за 15 минут (логика, без DOM)
   Файл: today.js — buildLesson собирает план урока из очереди FSRS, новых
   фраз и паспорта акцента. План — список заданий для движка лестницы
   (LadderUI.runQueue):
     { type: 'ex',    id, label }  — одно упражнение на текущей ступени фразы;
     { type: 'intro', id, label }  — знакомство с новой фразой: послушай,
                                     повтори вслух (запись), без оценки.
   Порядок урока:
     1) разминка — до 5 фраз, которые пора повторить по FSRS (забытые первыми,
        дальше — со слабыми ловушками акцента);
     2) новое — 3 новые фразы ОДНОЙ темы: знакомство + «Повтори вслух»,
        затем 3 круга по лестнице;
     TODO(этап 3): блок сцены после новых фраз — только когда сцены готовы.
     TODO(этап 4): импровизация в конце урока — только когда она готова.
   ========================================================================== */

const Today = (() => {
  'use strict';

  const DEFAULTS = { warmup: 5, fresh: 3, rounds: 3 };

  const LABELS = { warmup: 'Разминка', intro: 'Новая фраза', fresh: 'Новые фразы' };

  // Стабильная сортировка по слабым ловушкам (если модуль ловушек и паспорт есть)
  function weakFirst(list, textOf, passport, lookup, group) {
    const A = typeof globalThis !== 'undefined' ? globalThis.AccentTraps : null;
    if (!A || !passport || !lookup) {
      if (typeof group !== 'function') return list.slice();
      return list.map((e, i) => ({ e, i, g: group(e) })).sort((a, b) => a.g - b.g || a.i - b.i).map((x) => x.e);
    }
    return A.orderByWeakTraps(list, textOf, passport, lookup, group);
  }

  // Тема новых фраз: первая по порядку курса, где осталось ≥ need новых; иначе — где их больше всего
  function pickTheme(fresh, need) {
    const count = new Map();
    const order = [];
    fresh.forEach((x) => {
      if (!count.has(x.theme)) { count.set(x.theme, 0); order.push(x.theme); }
      count.set(x.theme, count.get(x.theme) + 1);
    });
    const enough = order.find((t) => count.get(t) >= need);
    if (enough) return enough;
    return order.reduce((best, t) => (best === null || count.get(t) > count.get(best) ? t : best), null);
  }

  /**
   * @param {object} input
   *   items     — американские фразы в порядке курса: [{ id, theme, front }]
   *   due       — очередь FSRS (SRS.getDueCards): [{ cardId, status }]
   *   started   — Set id фраз, у которых уже есть прогресс (они не «новые»)
   *   passport  — settings.accent_passport (может быть null)
   *   lookup    — источник IPA для разметки ловушек (может быть null)
   *   theme     — тема новых фраз (необязательно)
   *   warmup / fresh / rounds — размеры урока
   * @returns {{ warmup: string[], fresh: string[], theme: string|null, tasks: object[] }}
   */
  function buildLesson(input) {
    const o = { ...DEFAULTS, ...(input || {}) };
    const items = o.items || [];
    const byId = new Map(items.map((x) => [x.id, x]));
    const started = o.started instanceof Set ? o.started : new Set(o.started || []);

    // 1) Разминка: только американские фразы из очереди FSRS, без дублей
    const seen = new Set();
    const dueUs = (o.due || []).filter((c) => byId.has(c.cardId) && !seen.has(c.cardId) && seen.add(c.cardId));
    const lapsed = (c) => (c.status === 'lapsed' || c.status === 'relearning' ? 0 : 1);
    const warmup = weakFirst(dueUs, (c) => byId.get(c.cardId).front, o.passport, o.lookup, lapsed)
      .slice(0, Math.max(0, o.warmup)).map((c) => c.cardId);

    // 2) Новые: фразы без прогресса, не из разминки, одной темы
    const freshAll = items.filter((x) => !started.has(x.id) && !warmup.includes(x.id));
    const theme = o.theme && freshAll.some((x) => x.theme === o.theme) ? o.theme : pickTheme(freshAll, o.fresh);
    const fresh = theme === null ? [] : weakFirst(freshAll.filter((x) => x.theme === theme), (x) => x.front, o.passport, o.lookup)
      .slice(0, Math.max(0, o.fresh)).map((x) => x.id);

    const tasks = [];
    warmup.forEach((id) => tasks.push({ type: 'ex', id, label: LABELS.warmup }));
    // Знакомство: послушай и повтори вслух — первая фраза вслух в первые минуты урока
    fresh.forEach((id) => tasks.push({ type: 'intro', id, label: LABELS.intro }));
    for (let r = 0; r < o.rounds; r++) fresh.forEach((id) => tasks.push({ type: 'ex', id, label: LABELS.fresh }));
    // TODO(этап 3): tasks.push({ type: 'scene', … }) — сцена на фразах урока
    // TODO(этап 4): tasks.push({ type: 'improv', … }) — импров-рулетка в конце

    return { warmup, fresh, theme: fresh.length ? theme : null, tasks };
  }

  /* ---------- Сохранённый урок: можно прервать и продолжить в тот же день ---------- */

  // Состояние урока в settings.today_lesson; урок другого дня не продолжаем
  function resumable(saved, today) {
    if (!saved || typeof saved !== 'object') return null;
    if (saved.date !== today || saved.done) return null;
    if (!Array.isArray(saved.tasks) || !saved.tasks.length) return null;
    const idx = Math.max(0, Math.min(Number(saved.idx) || 0, saved.tasks.length));
    if (idx >= saved.tasks.length) return null;
    return { ...saved, idx };
  }

  const doneToday = (saved, today) => !!(saved && saved.date === today && saved.done);

  return { DEFAULTS, LABELS, buildLesson, pickTheme, resumable, doneToday };
})();

if (typeof globalThis !== 'undefined') globalThis.Today = Today;
