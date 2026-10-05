/* ==========================================================================
   English Reboot — PRO: SRS-движок
   Файл: srs.js — ease-фактор, таймер ответа, lapse-система, fuzzing,
   streak-заморозка, прогноз освоения, heatmap, Spaced Dictation очередь.
   Совместимо со старыми записями (ease/lapse дозаполняются лениво).

   Этап 3 (рефакторинг, поведение не изменено): извлечена чистая функция
   computeNextState() — весь расчёт состояния карточки без доступа к БД.
   saveProgress() теперь только читает/пишет БД. Юнит-тесты — на чистую
   функцию: tests/srs.test.js.
   v2: алгоритм заменён на FSRS-4.5 (stability/difficulty), интерфейс прежний.
   ========================================================================== */
const SRS = (() => {
  'use strict';

  const SRS_CONFIG = {
    stages: [1, 3, 7, 14, 30, 90],
    maxStage: 6,
    sessionSize: 15,
    easeMin: 1.3,
    easeMax: 3.0,
    easeDefault: 2.5,
    easeStep: 0.1,
    easePenalty: 0.2,
    lapseReviewsNeeded: 2,
    fuzzRange: 0.15,
    streakFreezeMax: 1,
    streakFreezeCost: 500,
  };

  /* ---------- Даты (локальные) ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

  function todayStr() { return fmt(new Date()); }

  function addDays(dateStr, days) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    return fmt(dt);
  }

  function tomorrowStr() { return addDays(todayStr(), 1); }

  function getNextInterval(stage) {
    return SRS_CONFIG.stages[Math.min(Math.max(stage, 1), SRS_CONFIG.maxStage) - 1];
  }

  // nextReview бывает "YYYY-MM-DD" и ISO (lapse): приводим к дате
  const dayOf = (s) => String(s || '').slice(0, 10);

  function storeForCard(cardId) {
    if (/^g\d+$/.test(cardId)) return 'grammar_cards';
    const map = { pv_: 'phrasal_verbs', cl_: 'collocations', col_: 'collocations', id_: 'idioms',
      cv_: 'conversation', sl_: 'slang', mp_: 'minimal_pairs', rd_: 'readings', pd_: 'personal_deck' };
    for (const p of Object.keys(map)) if (cardId.startsWith(p)) return map[p];
    return null;
  }

  /* ---------- Миграция: дозаполнить новые поля старым записям ---------- */
  // Разговорные фразы получают состояние лестницы упражнений (ladder.js), старые — ступень 1
  const defaultLadder = () => (typeof Ladder !== 'undefined' ? Ladder.normalize(null)
    : { step: 1, best: 1, hist: {}, done: false, updated: null });
  const needsLadder = (rec) => (rec.storeName || storeForCard(rec.cardId)) === 'conversation' && !rec.ladder;

  // Чистая функция: дозаполненная копия записи или null, если менять нечего
  function migrateRecord(rec) {
    if (rec.ease !== undefined && rec.lapseCount !== undefined && !needsLadder(rec)) return null;
    const out = {
      ...rec,
      ease: rec.ease !== undefined ? rec.ease : SRS_CONFIG.easeDefault,
      lapseCount: rec.lapseCount || 0,
      lapseReviews: rec.lapseReviews || 0,
      lastAnswerTime: rec.lastAnswerTime || null,
      storeName: rec.storeName || storeForCard(rec.cardId),
    };
    if (needsLadder(rec)) out.ladder = defaultLadder();
    return out;
  }

  async function migrateProgress() {
    const all = await DB.getAllProgress();
    if (!all.success || !all.data.length) return { migrated: 0 };
    let n = 0;
    for (const rec of all.data) {
      const next = migrateRecord(rec);
      if (!next) continue;
      await DB.saveCard('progress', next);
      n++;
    }
    return { migrated: n };
  }

  /* ---------- FSRS-4.5: модель памяти (как в Anki 23.10+) ----------
     Для каждой карточки хранятся stability (S, дни: за сколько вероятность
     вспомнить падает до 90%) и difficulty (D, 1..10). Интервал = S при
     целевой вероятности 90%. Параметры — открытые значения по умолчанию
     FSRS-4.5 (github.com/open-spaced-repetition). */
  const FSRS = {
    w: [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474,
      0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755],
    retention: 0.9,
    maxInterval: 1825,      // 5 лет
    masteredAt: 90,         // S ≥ 90 дней — «Изучено» (как прежний верхний этап)
    DECAY: -0.5,
    FACTOR: 19 / 81,
  };
  const W = FSRS.w;
  const clampD = (d) => Math.min(10, Math.max(1, d));
  const initS = (g) => Math.max(0.1, W[g - 1]);
  const initD = (g) => clampD(W[4] - (g - 3) * W[5]);
  const nextD = (d, g) => clampD(W[7] * initD(3) + (1 - W[7]) * (d - W[6] * (g - 3)));
  function retrievabilityAfter(t, s) { return Math.pow(1 + FSRS.FACTOR * Math.max(0, t) / s, FSRS.DECAY); }
  function stabilityAfterRecall(d, s, r, g) {
    const hard = g === 2 ? W[15] : 1, easy = g === 4 ? W[16] : 1;
    return s * (Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * hard * easy + 1);
  }
  function stabilityAfterForget(d, s, r) {
    return Math.min(s, W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r)));
  }
  function intervalFor(s) {
    const i = (s / FSRS.FACTOR) * (Math.pow(FSRS.retention, 1 / FSRS.DECAY) - 1);
    return Math.min(FSRS.maxInterval, Math.max(1, Math.round(i)));
  }
  // Этап 1..6 для старого интерфейса (бейджи, статистика) — по стабильности
  const stageFromS = (s) => 1 + [3, 7, 14, 30, 90].filter((x) => s >= x).length;
  // Совместимость: ease как раньше (1.3..3.0) — выводится из сложности
  const easeFromD = (d) => Math.round((3.0 - ((d - 1) / 9) * 1.7) * 100) / 100;

  function daysBetween(a, b) {
    if (!a || !b) return 0;
    const [y1, m1, d1] = dayOf(a).split('-').map(Number);
    const [y2, m2, d2] = dayOf(b).split('-').map(Number);
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
  }

  // Оценка ответа по шкале FSRS: 1 Again, 2 Hard, 3 Good, 4 Easy (быстрый «Знаю»)
  function gradeOf(action, answerTime) {
    if (action === 'know') return (answerTime !== undefined && answerTime !== null && answerTime < 3) ? 4 : 3;
    if (action === 'hard') return 2;
    return 1; // 'dontknow' и всё неизвестное — провал
  }

  // Старые записи (лестница этапов) → стабильность/сложность FSRS
  function memoryOf(prev) {
    if (prev.stability > 0 && prev.difficulty > 0) return { s: prev.stability, d: prev.difficulty };
    const span = daysBetween(prev.lastReview, prev.nextReview);
    const s = Math.max(span > 0 ? span : 0, SRS_CONFIG.stages[Math.min(Math.max(prev.stage || 1, 1), 6) - 1], 0.5);
    const ease = prev.ease !== undefined ? prev.ease : SRS_CONFIG.easeDefault;
    return { s, d: clampD(1 + ((3.0 - ease) / 1.7) * 9) };
  }

  /* ---------- Чистый переход: следующее состояние карточки (без БД) ---------- */
  /**
   * Считает SRS-запись после ответа по FSRS. Не трогает БД.
   * @param {object|null} prev — предыдущая запись прогресса или null (новая карточка)
   * @param {'know'|'hard'|'dontknow'} action — «Знаю» за < 3 с считается Easy
   * @param {object} [opts] — { today, answerTime, cardId, storeName, rand }
   * @returns {{ rec: object, isNew: boolean, logError: boolean }}
   */
  function computeNextState(prev, action, opts) {
    const o = opts || {};
    const today = o.today || todayStr();
    const rand = typeof o.rand === 'function' ? o.rand : Math.random;
    const g = gradeOf(action, o.answerTime);
    const fuzz = (days) => {
      if (days < 3) return days;
      const f = 1 + (rand() * 2 - 1) * SRS_CONFIG.fuzzRange;
      return Math.min(FSRS.maxInterval, Math.max(2, Math.round(days * f)));
    };

    if (!prev) {
      const failed = g === 1;
      const s = initS(g), d = initD(g);
      // Новая карточка: «Знаю»/«Сложно» — шаг обучения 1 день; Easy — сразу интервал FSRS
      const interval = g === 4 ? intervalFor(s) : 1;
      const rec = {
        cardId: o.cardId,
        storeName: o.storeName || storeForCard(o.cardId),
        status: failed ? 'lapsed' : 'learning', stage: stageFromS(s),
        stability: s, difficulty: d, reps: 1, ease: easeFromD(d),
        errorCount: failed ? 1 : 0, knownCount: g >= 3 ? 1 : 0,
        lapseCount: failed ? 1 : 0, lapseReviews: 0,
        lastAnswerTime: o.answerTime || null,
        lastReview: today, nextReview: failed ? today : addDays(today, interval),
        createdAt: today, mark: action,
      };
      return { rec, isNew: true, logError: failed };
    }

    const mem = memoryOf(prev);
    const elapsed = daysBetween(prev.lastReview, today);
    const r = retrievabilityAfter(elapsed, mem.s);
    const rec = {
      ...prev,
      lapseCount: prev.lapseCount || 0,
      lapseReviews: prev.lapseReviews || 0,
      storeName: prev.storeName || o.storeName || storeForCard(prev.cardId),
      reps: (prev.reps || 0) + 1,
      lastReview: today, mark: action, lastAnswerTime: o.answerTime || null,
    };
    const wasLapsed = prev.status === 'lapsed' || prev.status === 'relearning';
    let s = mem.s, d = nextD(mem.d, g), logError = false;

    if (g === 1) {
      // Провал: стабильность падает (если не провалена уже сегодня), карточка снова сегодня
      if (!(wasLapsed && elapsed === 0)) s = stabilityAfterForget(mem.d, mem.s, r);
      rec.status = 'lapsed';
      rec.lapseCount = wasLapsed && elapsed === 0 ? rec.lapseCount : rec.lapseCount + 1;
      rec.lapseReviews = 0;
      rec.errorCount = (prev.errorCount || 0) + 1;
      rec.knownCount = 0;
      rec.nextReview = today;
      logError = true;
    } else if (wasLapsed) {
      // Переобучение: 2 успеха подряд (или Easy) → обратно в learning
      if (elapsed > 0) s = stabilityAfterRecall(mem.d, mem.s, r, g);
      rec.lapseReviews += 1;
      if (rec.lapseReviews >= SRS_CONFIG.lapseReviewsNeeded || g === 4) {
        rec.status = 'learning';
        rec.lapseReviews = 0;
        rec.nextReview = addDays(today, Math.max(1, Math.min(intervalFor(s), 3)));
      } else {
        rec.nextReview = today; // ещё один повтор сегодня
      }
      rec.knownCount = g >= 3 ? (prev.knownCount || 0) + 1 : 0;
    } else {
      // Успех: стабильность растёт тем сильнее, чем ближе было к забыванию
      s = elapsed > 0 ? stabilityAfterRecall(mem.d, mem.s, r, g) : mem.s;
      const interval = fuzz(intervalFor(s));
      rec.nextReview = addDays(today, interval);
      rec.status = s >= FSRS.masteredAt ? 'mastered' : (g === 2 ? 'learning' : 'reviewing');
      rec.knownCount = g >= 3 ? (prev.knownCount || 0) + 1 : 0;
      if (g >= 3) rec.errorCount = 0;
    }
    rec.stability = Math.round(s * 1000) / 1000;
    rec.difficulty = Math.round(d * 1000) / 1000;
    rec.stage = stageFromS(s);
    rec.ease = easeFromD(d);
    return { rec, isNew: false, logError };
  }

  /* Вероятность вспомнить карточку сегодня (0..1) — для прогресса и очереди */
  function retrievability(rec, today) {
    if (!rec) return 0;
    const m = memoryOf(rec);
    return retrievabilityAfter(daysBetween(rec.lastReview, today || todayStr()), m.s);
  }

  /* ---------- Ядро: оценка карточки ---------- */
  /* action: 'know' | 'hard' | 'dontknow'; answerTime — секунды (опц.) */
  async function saveProgress(cardId, storeName, action, answerTime) {
    try {
      const today = todayStr();
      const prevRes = await DB.getProgressByCardId(cardId);
      const prev = prevRes.success ? prevRes.data : null;
      const plan = computeNextState(prev, action, { today, cardId, storeName, answerTime });
      if (plan.logError) await DB.saveError(cardId, plan.rec.storeName, plan.rec.errorCount);
      const res = await DB.saveCard('progress', plan.rec);
      return { success: res.success, error: res.error, data: plan.rec, isNew: plan.isNew };
    } catch (e) {
      return { success: false, error: (e && e.message) || String(e) };
    }
  }

  /* ---------- Очередь ---------- */
  async function getDueCards(today) {
    const all = await DB.getAllProgress();
    if (!all.success) return [];
    const t = today || todayStr();
    // mastered тоже возвращаются на контрольный повтор (интервал ~3–8 мес.), иначе забываются
    const due = all.data.filter((r) => r.nextReview && dayOf(r.nextReview) <= t);
    due.sort((a, b) => {
      const ra = (a.status === 'relearning' || a.status === 'lapsed') ? 0 : 1;
      const rb = (b.status === 'relearning' || b.status === 'lapsed') ? 0 : 1;
      if (ra !== rb) return ra - rb;
      if (dayOf(a.nextReview) !== dayOf(b.nextReview)) return dayOf(a.nextReview) < dayOf(b.nextReview) ? -1 : 1;
      return 0;
    });
    return due.map((r) => ({
      cardId: r.cardId,
      storeName: r.storeName || storeForCard(r.cardId),
      status: r.status, stage: r.stage || 1, errorCount: r.errorCount || 0,
    }));
  }

  async function startSession(today, maxSize) {
    const due = await getDueCards(today);
    return due.slice(0, maxSize || SRS_CONFIG.sessionSize).map((c, i) => ({ ...c, index: i }));
  }

  /* ---------- Spaced Dictation: очередь словных карточек ---------- */
  const DICT_STORES = ['phrasal_verbs', 'collocations', 'idioms', 'slang'];
  async function getSpacedDictationQueue(today) {
    const due = await getDueCards(today);
    return due.filter((c) => DICT_STORES.includes(c.storeName))
      .map((c) => ({ cardId: c.cardId, storeName: c.storeName }));
  }

  /* ---------- Статистика ---------- */
  async function getStats(today) {
    const empty = { mastered: 0, learning: 0, relearning: 0, toReview: 0, total: 0, retention: null };
    const all = await DB.getAllProgress();
    if (!all.success) return empty;
    const t = today || todayStr();
    const s = { ...empty, total: all.data.length, retention: null };
    let rSum = 0, rN = 0;
    for (const r of all.data) {
      if (r.lastReview && r.status !== 'lapsed') { rSum += retrievability(r, t); rN++; }
      if (r.status === 'mastered') s.mastered++;
      else if (r.status === 'relearning' || r.status === 'lapsed') s.relearning++;
      else s.learning++;
      if (r.nextReview && dayOf(r.nextReview) <= t) s.toReview++;
    }
    if (rN) s.retention = Math.round((rSum / rN) * 100);
    return s;
  }

  async function getErrorCards() {
    const res = await DB.getErrorsLog();
    if (!res.success) return [];
    return res.data.slice(0, 20);
  }

  /* ---------- Прогноз даты освоения уровня ---------- */
  async function getForecast(today) {
    const levelRes = await DB.getSetting('currentLevel');
    const level = (levelRes.success && levelRes.data) || 'A2';
    const t = today || todayStr();

    const logRes = await DB.getStudyLogRange(addDays(t, -13), t);
    const logs = (logRes.success && logRes.data) || [];
    const total14 = logs.reduce((s, l) => s + (l.cardsStudied || 0), 0);
    const avgPerDay = Math.max(1, Math.round(total14 / 14));

    const stores = ['grammar_cards', 'phrasal_verbs', 'collocations', 'idioms',
      'conversation', 'slang', 'minimal_pairs', 'readings'];
    let totalCards = 0, masteredCards = 0;
    const prog = await DB.getAllProgress();
    const masteredSet = new Set(((prog.success && prog.data) || [])
      .filter((r) => r.status === 'mastered').map((r) => r.cardId));
    for (const st of stores) {
      const r = await DB.getAll(st);
      ((r.success && r.data) || []).forEach((c) => {
        if (c.level === level) { totalCards++; if (masteredSet.has(c.id)) masteredCards++; }
      });
    }
    const remaining = Math.max(0, totalCards - masteredCards);
    const daysToComplete = Math.ceil(remaining / avgPerDay);
    return { level, remaining, avgPerDay, daysToComplete, estimatedDate: addDays(t, daysToComplete) };
  }

  /* ---------- Heatmap по разделам ---------- */
  async function getHeatmap() {
    const names = {
      grammar_cards: 'Грамматика', phrasal_verbs: 'Фразовые', collocations: 'Коллокации',
      idioms: 'Идиомы', conversation: 'Разговорные', slang: 'Сленг',
      minimal_pairs: 'Minimal Pairs', readings: 'Чтение',
    };
    const prog = await DB.getAllProgress();
    const recs = (prog.success && prog.data) || [];
    const out = [];
    for (const [store, name] of Object.entries(names)) {
      const r = await DB.getAll(store);
      const total = ((r.success && r.data) || []).length;
      const mastered = recs.filter((x) => (x.storeName || storeForCard(x.cardId)) === store && x.status === 'mastered').length;
      const percent = total ? Math.round((mastered / total) * 100) : 0;
      out.push({
        name, store, total, mastered, percent,
        color: percent >= 80 ? 'green' : percent >= 40 ? 'yellow' : 'red',
      });
    }
    return out;
  }

  /* ---------- Streak с заморозкой ---------- */
  async function updateStreak() {
    const today = todayStr();
    const yesterday = addDays(today, -1);
    const lastRes = await DB.getSetting('last_study_date');
    const last = lastRes.success ? lastRes.data : undefined;
    if (last === today) {
      const cur = await DB.getSetting('streak');
      return cur.success && cur.data ? Number(cur.data) : 1;
    }
    const streakRes = await DB.getSetting('streak');
    let streak = streakRes.success && streakRes.data ? Number(streakRes.data) : 0;
    const frRes = await DB.getSetting('streak_freeze');
    let freeze = frRes.success && frRes.data ? Number(frRes.data) : 0;

    if (last === yesterday) {
      streak++;
    } else if (last && freeze > 0 && last === addDays(today, -2)) {
      freeze--;  // заморозка закрывает ОДИН пропущенный день,
      streak++;  // а сегодняшнее занятие продолжает серию
    } else {
      streak = 1; // первое занятие или пропуск больше дня
    }
    await DB.saveSetting('streak', streak);
    await DB.saveSetting('streak_freeze', freeze);
    await DB.saveSetting('last_study_date', today);
    return streak;
  }

  return {
    SRS_CONFIG, todayStr, tomorrowStr, addDays, getNextInterval,
    storeForCard, migrateProgress, migrateRecord, saveProgress, computeNextState, retrievability, FSRS, gradeOf,
    getDueCards, startSession, getSpacedDictationQueue,
    getStats, getErrorCards, getForecast, getHeatmap, updateStreak,
  };
})();

// Экспорт для юнит-тестов (vitest): файл — классический скрипт, не ES-модуль.
// В браузере ничего не меняет, в тестах делает движок доступным через globalThis.
if (typeof globalThis !== 'undefined') globalThis.SRS = SRS;