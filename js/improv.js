/* ==========================================================================
   English Reboot — Этап 4: импровизация (логика, без DOM)
   Файл: improv.js — импров-рулетка (карточка ситуации + настроение собеседника
   + условие «вверни фразу»), таймер раунда, честная проверка условия,
   статистика settings.improv, проверка данных карточек и историй «Yes, and…».
   Данные — improv_us.js; интерфейс — improv_ui.js.
   Загружается после ladder.js и scenes.js (normText, matchMeaning).
   ========================================================================== */

const Improv = (() => {
  'use strict';

  // Настроение собеседника меняет уместный тон. tone — ключ варианта из tone_us.js
  const MOODS = [
    { id: 'rush', ru: 'Собеседник торопится', hint: 'Ответь коротко — одной фразой.', tone: 'neutral', icon: '⏱' },
    { id: 'happy', ru: 'Собеседник в восторге', hint: 'Подхвати энергию: «Wow, that\'s amazing!»', tone: 'friend', icon: '🤩' },
    { id: 'grumpy', ru: 'Собеседник не в духе', hint: 'Спокойно и дружелюбно, без оправданий.', tone: 'neutral', icon: '😒' },
    { id: 'boss', ru: 'Это твой начальник', hint: 'Чуть вежливее обычного: could, would, please.', tone: 'polite', icon: '👔' },
    { id: 'friend', ru: 'Это близкий друг', hint: 'Совсем просто: yeah, gonna, wanna.', tone: 'friend', icon: '🤙' },
  ];
  const moodById = new Map(MOODS.map((m) => [m.id, m]));

  const RECENT = 5;          // карточка не повторяется чаще раза за 5 спинов
  const THINK_SEC = 5;       // подумать перед ответом
  const PLUS = 10;           // кнопка «+10 с»
  const MAX_SEC = 60;

  // Таймер ответа: 20 с для A1–A2 (и если уровень неизвестен), 30 с для B1+
  const timerFor = (level) => (/^(B1|B2|C1|C2)$/.test(String(level || '')) ? 30 : 20);

  /* ---------- Таймер раунда (чистые функции: время передаётся снаружи) ---------- */

  const createTimer = (seconds, now) => ({ total: Math.max(1, Math.round(seconds)), startedAt: now });
  const remaining = (t, now) => Math.max(0, t.total - Math.floor((now - t.startedAt) / 1000));
  const addTime = (t, sec) => ({ ...t, total: Math.min(MAX_SEC, t.total + (sec === undefined ? PLUS : sec)) });
  const isOver = (t, now) => remaining(t, now) <= 0;

  /* ---------- Рулетка ---------- */

  const pick = (arr, rng) => arr[Math.floor((rng || Math.random)() * arr.length)];

  // Условие: сначала фраза, которую ученик уже знает (ступень ≥ 4), иначе — первая фраза карточки
  function pickCondition(card, known, rng) {
    const k = (card.phrases || []).filter((f) => known && known.has(f));
    return k.length ? pick(k, rng) : card.phrases[0];
  }

  /**
   * Один спин. opts:
   *   cards   — колода; recent — id последних карточек; known — Set знакомых фраз;
   *   score(card) — необязательный приоритет (например, слабые ловушки акцента);
   *   rng — генератор случайных чисел (подменяется в тестах).
   */
  function spin(opts) {
    const o = opts || {};
    const rng = o.rng || Math.random;
    const cards = o.cards || [];
    if (!cards.length) return null;
    const recent = new Set((o.recent || []).slice(-RECENT));
    let pool = cards.filter((c) => !recent.has(c.id));
    if (!pool.length) pool = cards.slice();
    // знакомые фразы — в приоритете: импровизировать проще тем, что уже на языке
    const knownPool = o.known ? pool.filter((c) => c.phrases.some((f) => o.known.has(f))) : [];
    if (knownPool.length) pool = knownPool;
    if (typeof o.score === 'function') {
      const scored = pool.map((c) => ({ c, s: o.score(c) || 0 }));
      const max = Math.max(...scored.map((x) => x.s));
      if (max > 0) pool = scored.filter((x) => x.s === max).map((x) => x.c);
    }
    const card = pick(pool, rng);
    const mood = o.mood ? moodById.get(o.mood) || pick(MOODS, rng) : pick(MOODS, rng);
    return { card, mood, condition: pickCondition(card, o.known, rng) };
  }

  const pushRecent = (recent, id) => (recent || []).concat(id).slice(-RECENT);

  /* ---------- Условие «вверни фразу»: честная проверка письменного ответа ---------- */

  const cleanKey = (s) => String(s || '').replace(/\.\.\./g, ' ').replace(/[?!.,]+\s*$/, '').trim();

  function conditionMeanings(condition, tones) {
    const t = tones && tones[condition];
    const keys = [condition, ...(t ? [t.polite, t.neutral, t.friend] : [])].map(cleanKey)
      .map((k) => k.replace(/^((hey|oh|so|well|okay|ok|um|uh|ha|wait|yeah|honestly)[,!]?\s+)+/i, '').trim())
      .filter((k, i, arr) => k && arr.indexOf(k) === i);
    return [{ id: 'condition', label: 'прозвучало «' + cleanKey(condition) + '»', keys }];
  }

  // true / false — проверено; null — проверить нечем (ответ только голосом)
  function conditionMet(text, condition, tones) {
    if (!String(text || '').trim()) return null;
    const S = typeof globalThis !== 'undefined' ? globalThis.Scenes : null;
    if (!S) return null;
    return !!S.matchMeaning(text, conditionMeanings(condition, tones));
  }

  // Вариант фразы-условия в тоне, уместном для настроения (если для фразы есть варианты тона)
  function toneHint(condition, mood, tones) {
    const t = tones && tones[condition];
    if (!t || !mood) return null;
    return t[mood.tone] && t[mood.tone] !== condition ? t[mood.tone] : null;
  }

  /* ---------- Статистика: settings.improv ---------- */

  function normalizeStats(raw) {
    const s = raw && typeof raw === 'object' ? raw : {};
    const n = (v) => Math.max(0, Number(v) || 0);
    return { spins: n(s.spins), recorded: n(s.recorded), condOk: n(s.condOk), condChecked: n(s.condChecked),
      selfOk: n(s.selfOk), yesAnd: n(s.yesAnd), recent: Array.isArray(s.recent) ? s.recent.slice(-RECENT) : [] };
  }

  // round: { cardId, recorded, condition: true|false|null, selfOk, yesAnd }
  function recordRound(raw, round) {
    const s = normalizeStats(raw);
    const r = round || {};
    return {
      ...s,
      spins: s.spins + (r.yesAnd ? 0 : 1),
      yesAnd: s.yesAnd + (r.yesAnd ? 1 : 0),
      recorded: s.recorded + (r.recorded ? 1 : 0),
      condChecked: s.condChecked + (r.condition === true || r.condition === false ? 1 : 0),
      condOk: s.condOk + (r.condition === true ? 1 : 0),
      selfOk: s.selfOk + (r.selfOk ? 1 : 0),
      recent: r.cardId ? pushRecent(s.recent, r.cardId) : s.recent,
    };
  }

  /* ---------- Проверка данных (тест и защита интерфейса) ---------- */

  function validateCard(c, phrases) {
    const e = [];
    const at = (c && c.id ? c.id : '?') + ': ';
    if (!c || !c.id || !c.place || !c.situation || !c.who || !c.say) return [at + 'нет id/place/situation/who/say'];
    if (!(c.phrases || []).length) e.push(at + 'нет фраз-условий');
    if ((c.samples || []).length < 3) e.push(at + 'меньше 3 образцов');
    (c.phrases || []).forEach((f) => {
      if (phrases && !phrases.has(f)) e.push(at + 'фразы нет в content_us.js: ' + f);
      if (!(c.samples || []).some((s) => conditionMet(s, f, null))) e.push(at + 'ни один образец не содержит «' + f + '»');
    });
    return e;
  }

  function validateStory(st) {
    const e = [];
    const at = (st && st.id ? st.id : '?') + ': ';
    if (!st || !st.id || !st.title || !st.ru) return [at + 'нет id/title/ru'];
    const turns = st.turns || [];
    if (turns.length < 3 || turns.length > 4) e.push(at + 'ходов должно быть 3–4');
    turns.forEach((t, i) => {
      if (!t.say) e.push(at + 'ход ' + i + ': нет реплики');
      if ((t.samples || []).length < 2) e.push(at + 'ход ' + i + ': меньше 2 образцов');
    });
    return e;
  }

  return {
    MOODS, moodById, RECENT, THINK_SEC, PLUS, MAX_SEC,
    timerFor, createTimer, remaining, addTime, isOver,
    spin, pickCondition, pushRecent, conditionMeanings, conditionMet, toneHint,
    normalizeStats, recordRound, validateCard, validateStory,
  };
})();

if (typeof globalThis !== 'undefined') globalThis.Improv = Improv;
