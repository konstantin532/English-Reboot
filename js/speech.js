/* ==========================================================================
   English Reboot — Этап 5: голос с проверкой (логика + обёртка распознавания)
   Файл: speech.js
   • Чистые функции (тестируются в node): сравнение распознанного текста
     с эталоном по словам — оценка 0–100, разметка слов (верно / не так /
     пропущено / лишнее), лучшая из альтернатив распознавания, итог по
     ловушкам акцента для паспорта.
   • Обёртка Web Speech API (SpeechRecognition, en-US): поддержка, одна фраза
     или непрерывное распознавание. Только онлайн-бонус: без распознавания
     приложение работает как раньше (запись + самооценка).
   ЧЕСТНО: распознаватель «додумывает» слова, поэтому оценка показывает,
   ПОНЯЛИ ли тебя, а не насколько чистый акцент.
   Загружается после ladder.js (normText, levenshtein).
   ========================================================================== */

const Speech = (() => {
  'use strict';

  const PASS = 80;     // автозачёт ступени 6
  const ALMOST = 50;   // «почти»

  const L = () => (typeof globalThis !== 'undefined' && globalThis.Ladder) || null;

  // Разговорные слияния и числа: распознаватель пишет «going to», ученик видит «gonna» — это одно и то же
  const SPOKEN = {
    gonna: 'going to', wanna: 'want to', gotta: 'got to', kinda: 'kind of', sorta: 'sort of',
    gimme: 'give me', lemme: 'let me', dunno: 'do not know', ok: 'okay', 'o.k.': 'okay', ya: 'you', yeah: 'yeah',
    '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven',
    '8': 'eight', '9': 'nine', '10': 'ten', '11': 'eleven', '12': 'twelve', '15': 'fifteen', '20': 'twenty',
    '30': 'thirty', '40': 'forty', '50': 'fifty', '100': 'hundred',
  };

  function normWord(w) {
    const lib = L();
    let t = lib ? lib.normText(w) : String(w || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').trim();
    t = t.split(' ').filter(Boolean).map((x) => SPOKEN[x] || x).join(' ');
    return t.split(' ').filter(Boolean);
  }

  // Эталон: исходные слова (как их видит ученик) → нормализованные токены с обратной ссылкой
  function prepare(text) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const toks = [];
    words.forEach((w, wi) => normWord(w).forEach((t) => toks.push({ t, wi })));
    return { words, toks };
  }

  const tokensOf = (text) => String(text || '').split(/\s+/).filter(Boolean).flatMap(normWord);

  // Выравнивание (Левенштейн по токенам): совпадение / замена / пропуск / лишнее
  function align(exp, got) {
    const n = exp.length, m = got.length;
    const d = Array.from({ length: n + 1 }, (_, i) => [i, ...Array(m).fill(0)]);
    for (let j = 1; j <= m; j++) d[0][j] = j;
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (exp[i - 1] === got[j - 1] ? 0 : 1));
      }
    }
    const ops = [];
    let i = n, j = m;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (exp[i - 1] === got[j - 1] ? 0 : 1)) {
        ops.unshift(exp[i - 1] === got[j - 1] ? { op: 'ok', i: i - 1, j: j - 1 } : { op: 'wrong', i: i - 1, j: j - 1 });
        i--; j--;
      } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
        ops.unshift({ op: 'missing', i: i - 1 }); i--;
      } else {
        ops.unshift({ op: 'extra', j: j - 1 }); j--;
      }
    }
    return ops;
  }

  const RANK = { ok: 0, wrong: 2, missing: 3 };

  /**
   * Сравнить сказанное с эталоном.
   * @returns {{ score, verdict, words: [{ word, status, heard }], extra: string[], heard }}
   */
  function compare(expected, heard) {
    const { words, toks } = prepare(expected);
    const got = tokensOf(heard);
    if (!toks.length) return { score: 0, verdict: 'miss', words: [], extra: [], heard: String(heard || '') };
    const ops = align(toks.map((x) => x.t), got);
    const status = words.map(() => 'ok');
    const heardBy = words.map(() => []);
    const extra = [];
    let ok = 0;
    ops.forEach((o) => {
      if (o.op === 'extra') { extra.push(got[o.j]); return; }
      const wi = toks[o.i].wi;
      if (o.op === 'ok') ok++;
      if (RANK[o.op] > RANK[status[wi]]) status[wi] = o.op;
      if (o.op === 'wrong') heardBy[wi].push(got[o.j]);
    });
    // Лишние слова немного снижают оценку: «what is up man» вместо «What's up?» — всё равно понятно
    const score = Math.max(0, Math.min(100, Math.round(100 * (ok - 0.25 * extra.length) / toks.length)));
    return {
      score,
      verdict: score >= PASS ? 'pass' : score >= ALMOST ? 'almost' : 'miss',
      words: words.map((w, k) => ({ word: w, status: status[k], heard: heardBy[k].join(' ') })),
      extra,
      heard: String(heard || ''),
    };
  }

  // Из альтернатив распознавания берём лучшую для этого эталона
  function best(expected, alternatives) {
    const alts = (alternatives || []).filter((a) => String(a || '').trim());
    if (!alts.length) return null;
    return alts.map((a) => compare(expected, a)).reduce((b, r) => (r.score > b.score ? r : b));
  }

  // Ловушки акцента: ловушка «пройдена», если все её слова в этой фразе распознаны верно
  function trapResults(result, expected, lookup) {
    const A = typeof globalThis !== 'undefined' ? globalThis.AccentTraps : null;
    if (!A || !result) return {};
    const out = {};
    A.findTrapsInPhrase(expected, lookup).forEach((h) => {
      const w = result.words[h.index];
      const ok = !!w && w.status === 'ok';
      out[h.trap] = out[h.trap] === undefined ? ok : out[h.trap] && ok;
    });
    return out;
  }

  /* ---------- Web Speech API (в браузере) ---------- */

  const Ctor = () => (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) || null;

  // { available, local: true|false|null } — local null: неизвестно (скорее всего нужен интернет)
  async function support() {
    const SR = Ctor();
    if (!SR) return { available: false, local: false };
    try {
      if (typeof SR.available === 'function') {
        const s = await SR.available({ langs: ['en-US'], processLocally: true });
        return { available: true, local: s === 'available' };
      }
    } catch (e) { /* старый API без проверки офлайн-режима */ }
    return { available: true, local: null };
  }

  /**
   * Распознать речь. opts: { continuous, maxMs }.
   * Возвращает объект-сессию: { promise, stop() }. promise → { alternatives: [...], error? }.
   * continuous: копим финальные фрагменты, пока не вызовут stop() (импровизация).
   */
  function listen(opts) {
    const o = opts || {};
    const SR = Ctor();
    if (!SR) return { promise: Promise.resolve({ alternatives: [], error: 'unsupported' }), stop() {} };
    const rec = new SR();
    rec.lang = 'en-US';
    rec.maxAlternatives = 3;
    rec.interimResults = false;
    rec.continuous = !!o.continuous;
    let finals = [];          // continuous: финальные фрагменты по порядку
    let alts = [];            // одна фраза: альтернативы
    let error = null;
    let timer = null;
    const promise = new Promise((resolve) => {
      rec.onresult = (e) => {
        const res = e.results;
        for (let i = e.resultIndex || 0; i < res.length; i++) {
          const r = res[i];
          if (r.isFinal === false) continue;
          const variants = [];
          for (let k = 0; k < r.length; k++) if (r[k] && r[k].transcript) variants.push(r[k].transcript.trim());
          if (o.continuous) finals.push(variants[0] || '');
          else alts = variants;
        }
      };
      rec.onerror = (e) => { error = (e && e.error) || 'error'; };
      rec.onend = () => {
        clearTimeout(timer);
        const alternatives = o.continuous ? (finals.length ? [finals.join(' ').trim()] : []) : alts;
        resolve({ alternatives, error: alternatives.length ? null : error || 'no-speech' });
      };
      try { rec.start(); } catch (e) { resolve({ alternatives: [], error: 'start-failed' }); return; }
      if (o.maxMs) timer = setTimeout(() => { try { rec.stop(); } catch (e) { /* уже остановлено */ } }, o.maxMs);
    });
    return { promise, stop() { try { rec.stop(); } catch (e) { /* уже остановлено */ } } };
  }

  // Понятное объяснение ошибки распознавания
  function errorText(code) {
    return ({
      'not-allowed': 'Нет доступа к микрофону.',
      'service-not-allowed': 'Браузер не разрешил распознавание речи.',
      network: 'Для распознавания нужен интернет — а его сейчас нет. Можно продолжить по образцу и самооценке.',
      'no-speech': 'Не удалось расслышать — попробуй ещё раз чуть громче.',
      'audio-capture': 'Микрофон не найден.',
      unsupported: 'Этот браузер не умеет распознавать речь.',
    })[code] || 'Распознать не получилось — можно продолжить по образцу и самооценке.';
  }

  return { PASS, ALMOST, normWord, tokensOf, align, compare, best, trapResults, support, listen, errorText };
})();

if (typeof globalThis !== 'undefined') globalThis.Speech = Speech;
