/* ==========================================================================
   English Reboot — PRO: SRS-движок
   Файл: srs.js — ease-фактор, таймер ответа, lapse-система, fuzzing,
   streak-заморозка, прогноз освоения, heatmap, Spaced Dictation очередь.
   Совместимо со старыми записями (ease/lapse дозаполняются лениво).

   Этап 3 (рефакторинг, поведение не изменено): извлечена чистая функция
   computeNextState() — весь расчёт состояния карточки без доступа к БД.
   saveProgress() теперь только читает/пишет БД. Юнит-тесты — на чистую
   функцию: tests/srs.test.js.
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

  // speedMultiplier по времени ответа (сек)
  function speedMultiplier(answerTime) {
    if (answerTime === undefined || answerTime === null) return 1.0;
    if (answerTime < 3) return 1.2;
    if (answerTime <= 10) return 1.0;
    return 0.8;
  }

  /* ---------- Миграция: дозаполнить новые поля старым записям ---------- */
  async function migrateProgress() {
    const all = await DB.getAllProgress();
    if (!all.success || !all.data.length) return { migrated: 0 };
    let n = 0;
    for (const rec of all.data) {
      if (rec.ease !== undefined && rec.lapseCount !== undefined) continue;
      await DB.saveCard('progress', {
        ...rec,
        ease: rec.ease !== undefined ? rec.ease : SRS_CONFIG.easeDefault,
        lapseCount: rec.lapseCount || 0,
        lapseReviews: rec.lapseReviews || 0,
        lastAnswerTime: rec.lastAnswerTime || null,
        storeName: rec.storeName || storeForCard(rec.cardId),
      });
      n++;
    }
    return { migrated: n };
  }

  /* ---------- Чистый переход: следующее состояние карточки (без БД) ---------- */
  /**
   * Считает SRS-запись после ответа. Не трогает БД.
   * @param {object|null} prev — предыдущая запись прогресса или null (новая карточка)
   * @param {'know'|'hard'|'dontknow'} action
   * @param {object} [opts] — { today, answerTime, cardId, storeName, rand }
   *        rand — генератор случайных чисел (инжектится тестами; по умолчанию Math.random)
   * @returns {{ rec: object, isNew: boolean, logError: boolean }}
   */
  function computeNextState(prev, action, opts) {
    const o = opts || {};
    const today = o.today || todayStr();
    const sm = speedMultiplier(o.answerTime);
    const rand = typeof o.rand === 'function' ? o.rand : Math.random;

    if (!prev) {
      const failed = action === 'dontknow';
      const rec = {
        cardId: o.cardId,
        storeName: o.storeName || storeForCard(o.cardId),
        status: failed ? 'lapsed' : 'learning', stage: 1,
        ease: failed ? SRS_CONFIG.easeDefault - SRS_CONFIG.easePenalty : SRS_CONFIG.easeDefault,
        errorCount: failed ? 1 : 0, knownCount: 0,
        lapseCount: failed ? 1 : 0, lapseReviews: 0,
        lastAnswerTime: o.answerTime || null,
        lastReview: today, nextReview: failed ? today : addDays(today, 1),
        createdAt: today, mark: action,
      };
      return { rec, isNew: true, logError: failed };
    }

    const rec = {
      ...prev,
      ease: prev.ease !== undefined ? prev.ease : SRS_CONFIG.easeDefault,
      lapseCount: prev.lapseCount || 0,
      lapseReviews: prev.lapseReviews || 0,
      storeName: prev.storeName || o.storeName || storeForCard(prev.cardId),
      lastReview: today, mark: action, lastAnswerTime: o.answerTime || null,
    };
    const wasLapsed = prev.status === 'lapsed';

    if (action === 'know') {
      rec.ease = Math.min(rec.ease + SRS_CONFIG.easeStep, SRS_CONFIG.easeMax);
      rec.stage = Math.min((prev.stage || 1) + 1, SRS_CONFIG.maxStage);
      rec.errorCount = 0;
      rec.knownCount = (prev.knownCount || 0) + 1;

      if (wasLapsed) {
        // Выход из lapse: 2 успеха подряд → обратно в learning
        rec.lapseReviews++;
        if (rec.lapseReviews >= SRS_CONFIG.lapseReviewsNeeded) {
          rec.status = 'learning';
          rec.lapseReviews = 0;
          rec.nextReview = addDays(today, 1);
        } else {
          // Повтор в тот же день (датная гранулярность: due до конца дня)
          rec.nextReview = today;
        }
      } else {
        let interval = getNextInterval(rec.stage) * rec.ease * sm;
        const fuzz = 1 + (rand() * 2 - 1) * SRS_CONFIG.fuzzRange;
        interval = Math.max(1, Math.round(interval * fuzz));
        rec.nextReview = addDays(today, interval);
        rec.status = rec.stage >= SRS_CONFIG.maxStage ? 'mastered' : 'reviewing';
      }
    } else if (action === 'hard') {
      rec.ease = Math.max(rec.ease - SRS_CONFIG.easePenalty, SRS_CONFIG.easeMin);
      rec.stage = Math.max(prev.stage || 1, 1);
      rec.knownCount = 0;
      rec.nextReview = addDays(today, Math.max(1, Math.round(getNextInterval(rec.stage) * 0.5)));
      rec.status = 'learning';
    } else { // dontknow
      rec.ease = Math.max(rec.ease - SRS_CONFIG.easePenalty, SRS_CONFIG.easeMin);
      rec.status = 'lapsed';
      rec.stage = 1;
      rec.lapseCount = rec.lapseCount + 1;
      rec.lapseReviews = 0;
      rec.errorCount = (prev.errorCount || 0) + 1;
      rec.knownCount = 0;
      rec.nextReview = today; // lapse-шаг: снова должна сегодня
      return { rec, isNew: false, logError: true };
    }
    return { rec, isNew: false, logError: false };
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
    const empty = { mastered: 0, learning: 0, relearning: 0, toReview: 0, total: 0 };
    const all = await DB.getAllProgress();
    if (!all.success) return empty;
    const t = today || todayStr();
    const s = { ...empty, total: all.data.length };
    for (const r of all.data) {
      if (r.status === 'mastered') s.mastered++;
      else if (r.status === 'relearning' || r.status === 'lapsed') s.relearning++;
      else s.learning++;
      if (r.nextReview && dayOf(r.nextReview) <= t) s.toReview++;
    }
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
    storeForCard, migrateProgress, saveProgress, computeNextState,
    getDueCards, startSession, getSpacedDictationQueue,
    getStats, getErrorCards, getForecast, getHeatmap, updateStreak,
  };
})();

// Экспорт для юнит-тестов (vitest): файл — классический скрипт, не ES-модуль.
// В браузере ничего не меняет, в тестах делает движок доступным через globalThis.
if (typeof globalThis !== 'undefined') globalThis.SRS = SRS;