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
     2½) слова — до 5 слов раздела «Слова»: сначала те, что пора повторить по FSRS,
        потом новые своего уровня; послушать и выбрать значение (TodayUI, поле words плана);
     3) сцена — следующий непройденный эпизод истории (scenes_us.js); её
        проигрывает ScenesUI после заданий лестницы (поле scene плана);
     4) импровизация — N спинов импров-рулетки в конце (ImprovUI, поле improv плана).
   ========================================================================== */

const Today = (() => {
  'use strict';

  const DEFAULTS = { warmup: 5, fresh: 3, rounds: 3, wordCount: 5, wordDue: 3 };

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

  // Тема новых фраз: первая по порядку курса, где осталось ≥ need новых; иначе — где их больше всего.
  // level — уровень ученика (A1, A2, B1, B2): сначала темы пакетов «+4000» этого уровня (у их фраз
  // есть подуровень): новичок A1 начинает с «Первой недели», хотя её фразы дописаны в конец курса.
  function pickTheme(fresh, need, level) {
    if (level) {
      const own = fresh.filter((x) => x.sublevel && String(x.sublevel).replace('+', '') === level);
      const t = own.length ? pickTheme(own, need) : null;
      if (t !== null && own.filter((x) => x.theme === t).length >= need) return t;
    }
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
   *   level     — уровень ученика из настроек (необязательно): темы пакетов его уровня — первыми
   *   scene     — id эпизода сцены для этого урока (или null)
   *   improv    — сколько спинов импровизации в конце урока (0 — без блока)
   *   wordItems — слова раздела «Слова» в порядке курса: [{ id, level, sublevel }]
   *   warmup / fresh / rounds / wordCount / wordDue — размеры урока
   * @returns {{ warmup: string[], fresh: string[], theme: string|null, tasks: object[], scene: string|null,
   *             words: string[], wordsDue: number }}
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
    const theme = o.theme && freshAll.some((x) => x.theme === o.theme) ? o.theme : pickTheme(freshAll, o.fresh, o.level);
    const fresh = theme === null ? [] : weakFirst(freshAll.filter((x) => x.theme === theme), (x) => x.front, o.passport, o.lookup)
      .slice(0, Math.max(0, o.fresh)).map((x) => x.id);

    // 2½) Слова: сначала пора повторить (забытые первыми), потом новые. Новые — своего уровня
    // (у ученика A2 слов A1 в уроке не будет, только повторение); без уровня — по порядку курса.
    const wordItems = o.wordItems || [];
    const wordIds = new Set(wordItems.map((w) => w.id));
    const wSeen = new Set();
    const dueWords = (o.due || []).filter((c) => wordIds.has(c.cardId) && !wSeen.has(c.cardId) && wSeen.add(c.cardId))
      .map((c, i) => ({ c, i })).sort((a, b) => lapsed(a.c) - lapsed(b.c) || a.i - b.i)
      .slice(0, Math.max(0, Math.min(o.wordDue, o.wordCount))).map((x) => x.c.cardId);
    const ownLevel = (w) => !o.level || String(w.sublevel || w.level || '').replace('+', '') === o.level;
    const newWords = wordItems.filter((w) => !started.has(w.id) && !wSeen.has(w.id) && ownLevel(w))
      .slice(0, Math.max(0, o.wordCount - dueWords.length)).map((w) => w.id);
    const words = dueWords.concat(newWords);

    const tasks = [];
    warmup.forEach((id) => tasks.push({ type: 'ex', id, label: LABELS.warmup }));
    // Знакомство: послушай и повтори вслух — первая фраза вслух в первые минуты урока
    fresh.forEach((id) => tasks.push({ type: 'intro', id, label: LABELS.intro }));
    for (let r = 0; r < o.rounds; r++) fresh.forEach((id) => tasks.push({ type: 'ex', id, label: LABELS.fresh }));
    return { warmup, fresh, theme: fresh.length ? theme : null, tasks, scene: o.scene || null,
      improv: Math.max(0, Number(o.improv) || 0), words, wordsDue: dueWords.length };
  }

  /* ---------- Сохранённый урок: можно прервать и продолжить в тот же день ---------- */

  // Состояние урока в settings.today_lesson; урок другого дня не продолжаем.
  // phase: 'tasks' — задания лестницы, 'words' — остались слова, 'scene' — осталась сцена,
  // 'improv' — остались спины импровизации.
  function resumable(saved, today) {
    if (!saved || typeof saved !== 'object') return null;
    if (saved.date !== today || saved.done) return null;
    const tasks = Array.isArray(saved.tasks) ? saved.tasks : [];
    const idx = Math.max(0, Math.min(Number(saved.idx) || 0, tasks.length));
    if (idx < tasks.length) return { ...saved, tasks, idx, phase: 'tasks' };
    const words = Array.isArray(saved.words) ? saved.words : [];
    if ((Number(saved.wordsDone) || 0) < words.length) return { ...saved, tasks, idx, phase: 'words' };
    if (saved.scene && !saved.sceneDone) return { ...saved, tasks, idx, phase: 'scene' };
    if ((Number(saved.improv) || 0) > (Number(saved.improvDone) || 0)) return { ...saved, tasks, idx, phase: 'improv' };
    return null;
  }

  // В уроке есть что делать: задания, слова или сцена
  // Импровизация одна урок не составляет: она венчает задания или сцену
  const hasWork = (plan) => !!(plan && ((plan.tasks && plan.tasks.length) || (plan.words && plan.words.length) || plan.scene));

  const doneToday = (saved, today) => !!(saved && saved.date === today && saved.done);

  return { DEFAULTS, LABELS, buildLesson, pickTheme, resumable, doneToday, hasWork };
})();

if (typeof globalThis !== 'undefined') globalThis.Today = Today;
