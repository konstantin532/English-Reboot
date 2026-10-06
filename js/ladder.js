/* ==========================================================================
   English Reboot — Этап 1: лестница упражнений (логика, без DOM)
   Файл: ladder.js — 8 ступеней на каждую американскую фразу (content_us.js):
     1 Узнай на слух → 2 Выбери уместное → 3 Собери из слов → 4 Впиши по памяти
     → 5 Смени тон → 6 Скажи вслух → 7 Ответь своими словами → 8 Импровизация.
   Правила:
     • ступень открывается при ≥80% верных из последних 5 попыток (минимум 3);
     • ошибка возвращает на ступень ниже (не ниже 1-й);
     • ступень 5 есть только у фраз с вариантами тона (tone_us.js), иначе пропуск;
     • КАКИЕ фразы повторять — решает FSRS (srs.js), лестница решает только КАК.
   Состояние хранится в записи progress рядом с FSRS: rec.ladder = { step, best, hist }.
   Имя поля «step», а не «stage»: rec.stage уже занят этапом FSRS.
   ========================================================================== */

const Ladder = (() => {
  'use strict';

  const STEPS = [
    { n: 1, key: 'listen',   title: 'Узнай на слух' },
    { n: 2, key: 'choose',   title: 'Выбери уместное' },
    { n: 3, key: 'assemble', title: 'Собери из слов' },
    { n: 4, key: 'type',     title: 'Впиши по памяти' },
    { n: 5, key: 'tone',     title: 'Смени тон' },
    { n: 6, key: 'say',      title: 'Скажи вслух' },
    { n: 7, key: 'own',      title: 'Ответь своими словами' },
    { n: 8, key: 'improv',   title: 'Импровизация' },
  ];
  const MAX_STEP = 8;
  const TONE_STEP = 5;
  const RULES = { window: 5, minAttempts: 3, pass: 0.8 };

  /* ---------- Состояние ступени ---------- */

  // Нормализация (и миграция): старая запись без ladder → ступень 1, пустая история
  function normalize(l) {
    const src = l && typeof l === 'object' ? l : {};
    const step = Math.min(MAX_STEP, Math.max(1, Math.round(Number(src.step) || 1)));
    const hist = {};
    if (src.hist && typeof src.hist === 'object') {
      for (const [k, arr] of Object.entries(src.hist)) {
        const n = Number(k);
        if (n >= 1 && n <= MAX_STEP && Array.isArray(arr)) hist[n] = arr.slice(-RULES.window).map(Boolean);
      }
    }
    const best = Math.min(MAX_STEP, Math.max(step, Math.round(Number(src.best) || 1)));
    return { step, best, hist, done: !!src.done, updated: src.updated || null };
  }

  function canAdvance(attempts) {
    const last = (attempts || []).slice(-RULES.window);
    if (last.length < RULES.minAttempts) return false;
    return last.filter(Boolean).length / last.length >= RULES.pass;
  }

  function nextStep(step, hasTone) {
    let s = Math.min(MAX_STEP, step + 1);
    if (s === TONE_STEP && !hasTone) s++;
    return s;
  }
  function prevStep(step, hasTone) {
    let s = Math.max(1, step - 1);
    if (s === TONE_STEP && !hasTone) s--;
    return s;
  }

  // Применить ответ на ТЕКУЩЕЙ ступени. Возвращает новое состояние и событие:
  // 'up' — открыта следующая, 'down' — откат, 'top' — пройдена 8-я, 'stay' — без изменений.
  function applyAnswer(ladder, correct, opts) {
    const o = opts || {};
    const l = normalize(ladder);
    const hasTone = !!o.hasTone;
    // Фраза без тона, застрявшая на 5-й (например, вариант удалили) — переносим на 6-ю
    if (l.step === TONE_STEP && !hasTone) l.step = TONE_STEP + 1;
    const from = l.step;
    const h = (l.hist[from] || []).concat(!!correct).slice(-RULES.window);
    l.hist[from] = h;
    l.updated = o.today || l.updated;
    let event = 'stay';
    if (correct) {
      if (canAdvance(h)) {
        if (from < MAX_STEP) { l.step = nextStep(from, hasTone); event = 'up'; } else if (!l.done) { l.done = true; event = 'top'; }
      }
    } else if (from > 1) {
      l.step = prevStep(from, hasTone);
      event = 'down';
    }
    l.best = Math.max(l.best, l.step);
    return { ladder: l, event, from, to: l.step };
  }

  /* ---------- Данные фразы ---------- */

  const stripDash = (s) => String(s || '').replace(/^\s*[—–-]\s*/, '').trim();

  // Карточка content_us.js → плоская фраза { id, front, ru, theme, a, b, ex, level }
  function itemFromCard(card) {
    const p = (card && card.payload) || {};
    const d = p.dialog || [];
    return {
      id: card.id, level: card.level, sublevel: card.sublevel || null, front: p.front, ru: p.translation, theme: p.category,
      a: stripDash(d[0]), b: stripDash(d[1]),
      ex: (p.examples && p.examples[0] && p.examples[0].text) || '',
    };
  }
  const isUsCard = (card) => !!card && card.type === 'conversation' && (card.tags || []).includes('США');

  /* ---------- Тон (ступень 5) ---------- */

  const TONE_LABELS = {
    polite: 'вежливее — незнакомцу, начальнику, в сервисе',
    neutral: 'нейтрально — коллеге, знакомому',
    friend: 'как другу — легко и по-свойски',
  };
  const TONE_KEYS = Object.keys(TONE_LABELS);
  function toneTable() { return (typeof globalThis !== 'undefined' && globalThis.TONE_VARIANTS) || {}; }
  function toneOf(front, table) {
    const t = (table || toneTable())[front];
    return t && TONE_KEYS.every((k) => typeof t[k] === 'string' && t[k].trim()) ? t : null;
  }
  const hasTone = (front, table) => !!toneOf(front, table);

  /* ---------- Похожие фразы: защита от «двух верных ответов» ---------- */

  const STOP_EN = new Set(('i you me my your it its a an the to of in on at for is are am be been do does did so and or but ' +
    'that this what how just up out with we they he she him her us them our their not no yes oh hey hi all can will ' +
    "i'm it's that's what's don't let's i'll you're we're there's here's how's was were has have had " +
    'about from by as if then than too very really well okay ok one some any get got go going').split(/\s+/));
  const STOP_RU = new Set(('это что как тебе тебя меня мне ты я он она мы вы они так уже ещё еще очень просто есть был ' +
    'была было быть все всё для без про при над под его её ее их вот тут там да нет ну же ли бы ни не на по за из ' +
    'от до или когда где кто чем мой моя моё твой твоя свой себе себя давай').split(/\s+/));

  const enWords = (s) => String(s || '').toLowerCase().replace(/[’‘`]/g, "'").replace(/[^a-z0-9' ]+/g, ' ')
    .split(/\s+/).filter((w) => w.length >= 3 && !STOP_EN.has(w));
  const ruStems = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^а-я ]+/g, ' ')
    .split(/\s+/).filter((w) => w.length >= 4 && !STOP_RU.has(w)).map((w) => w.slice(0, 4));
  const overlap = (a, b) => { const s = new Set(a); return b.some((x) => s.has(x)); };

  // Ручной список групп заведомо взаимозаменяемых фраз (пополняется по спорам учеников)
  const SIMILAR_GROUPS = [
    ["What's up?", "What's new?", "How's it going?", "How have you been?"],
    ['Not much', 'Same old, same old'],
    ['No worries', 'No problem', "Don't worry about it"],
    ['Sounds good', 'Sounds like a plan', "I'm down"],
    ['My bad', "I'm sorry"],
    ['Thanks a lot', 'Thank you so much', 'I appreciate it'],
  ];
  const groupOf = new Map();
  SIMILAR_GROUPS.forEach((g, i) => g.forEach((f) => groupOf.set(f.toLowerCase(), i)));

  // true — фразы слишком близки по смыслу/словам, вместе в одном вопросе их показывать нельзя
  function similar(x, y) {
    if (!x || !y) return false;
    if (String(x.front).toLowerCase() === String(y.front).toLowerCase()) return true;
    const gx = groupOf.get(String(x.front).toLowerCase());
    if (gx !== undefined && gx === groupOf.get(String(y.front).toLowerCase())) return true;
    if (overlap(enWords(x.front), enWords(y.front))) return true;
    if (overlap(ruStems(x.ru), ruStems(y.ru))) return true;
    return false;
  }

  // Настроение собеседника для импровизации: та же реплика звучит по-разному
  const MOODS = [
    { key: 'rush', ru: 'Собеседник торопится — ответь коротко' },
    { key: 'happy', ru: 'Собеседник в отличном настроении — подхвати его' },
    { key: 'grumpy', ru: 'Собеседник не в духе — ответь спокойно и дружелюбно' },
    { key: 'boss', ru: 'Это твой начальник — чуть вежливее обычного' },
    { key: 'friend', ru: 'Это твой близкий друг — можно совсем просто' },
  ];

  /* ---------- Случайность (подменяется в тестах) ---------- */

  function shuffle(arr, rng) {
    const r = rng || Math.random;
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const pick = (arr, rng) => arr[Math.floor((rng || Math.random)() * arr.length)];

  // Дистракторы ТОЙ ЖЕ темы. strict — дополнительно отсекаем близкие по смыслу и
  // фразы с похожей репликой собеседника (их ответ тоже мог бы подойти).
  // exclude — Set пар «idA|idB», оспоренных учеником («мой вариант тоже подходит»)
  const pairKey = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
  function sameTopicPool(me, items, strict, exclude) {
    return items.filter((x) => {
      if (exclude && exclude.has(pairKey(me.id, x.id))) return false;
      if (x.id === me.id || x.theme !== me.theme) return false;
      if (String(x.front).toLowerCase() === String(me.front).toLowerCase()) return false;
      if (!strict) return true;
      if (similar(me, x)) return false;
      if (overlap(enWords(me.a), enWords(x.a))) return false;
      if (String(x.b).toLowerCase() === String(me.b).toLowerCase()) return false;
      return true;
    });
  }

  function choice(prompt, correct, distractors, rng, extra) {
    const opts = shuffle([correct, ...distractors], rng);
    return { kind: 'choice', prompt, options: opts, correct: opts.indexOf(correct), ...(extra || {}) };
  }

  /* ---------- Слова для «Собери из слов» ---------- */

  const tokens = (s) => String(s || '').trim().split(/\s+/).map((w) => w.replace(/^[^\w']+|[^\w']+$/g, '')).filter(Boolean);

  // «Смысл» для ступеней 7–8: в ответе есть сама фраза или один из её вариантов тона
  // (без «...» и финальной пунктуации). Проверяет Scenes.matchMeaning — с отрицаниями и опечатками.
  function phraseMeanings(me, table) {
    const t = toneOf(me.front, table);
    // без «...», финальной пунктуации и вводных междометий («Hey, gimme a hand?» → «gimme a hand»)
    const clean = (s) => String(s || '').replace(/\.\.\./g, ' ').replace(/[?!.,]+\s*$/, '').trim()
      .replace(/^((hey|oh|so|well|okay|ok|um|uh|ha|wait|yeah|honestly)[,!]?\s+)+/i, '').trim();
    const keys = [me.front, ...(t ? [t.polite, t.neutral, t.friend] : [])].map(clean).filter(Boolean)
      .filter((k, i, arr) => arr.findIndex((x) => normText(x) === normText(k)) === i);
    return [{ id: 'phrase', label: 'в ответе есть «' + clean(me.front) + '»', keys }];
  }

  /* ---------- Генераторы упражнений ---------- */

  function buildExercise(step, me, items, opts) {
    const o = opts || {};
    const rng = o.rng || Math.random;
    const table = o.tones || toneTable();
    switch (step) {
      case 1: {
        const pool = shuffle(sameTopicPool(me, items, false), rng).slice(0, 3);
        return choice('Послушай и выбери, что прозвучало', me.front, pool.map((x) => x.front), rng,
          { step, audio: me.front });
      }
      case 2: {
        const pool = shuffle(sameTopicPool(me, items, true, o.exclude), rng).slice(0, 3);
        return choice('Что уместнее всего ответить?', me.b, pool.map((x) => x.b), rng,
          { step, cue: me.a, theme: me.theme, disputable: true, distractorIds: pool.map((x) => x.id) });
      }
      case 3: {
        const mine = tokens(me.front);
        const own = new Set(mine.map((w) => w.toLowerCase()));
        const trapsAll = [];
        shuffle(sameTopicPool(me, items, false), rng).forEach((x) => tokens(x.front).forEach((w) => {
          const lw = w.toLowerCase();
          if (!own.has(lw) && !trapsAll.some((t) => t.toLowerCase() === lw)) trapsAll.push(w);
        }));
        const traps = trapsAll.slice(0, mine.length <= 3 ? 2 : 3);
        return { kind: 'assemble', step, prompt: 'Собери фразу: «' + me.ru + '»', cue: me.a,
          answer: mine, bank: shuffle(mine.concat(traps), rng), traps };
      }
      case 4:
        return { kind: 'type', step, prompt: 'Напиши по-английски: «' + me.ru + '»', cue: me.a, answer: me.front };
      case 5: {
        const t = toneOf(me.front, table);
        if (!t) return null;
        const target = pick(TONE_KEYS, rng);
        const opts2 = shuffle(TONE_KEYS.map((k) => t[k]), rng);
        return { kind: 'choice', step, prompt: 'Скажи «' + me.ru + '» — ' + TONE_LABELS[target],
          tone: target, options: opts2, correct: opts2.indexOf(t[target]), toneVariants: t };
      }
      case 6:
        // TODO(этап 5): заменить самооценку проверкой через SpeechRecognition
        return { kind: 'say', step, prompt: 'Ответь собеседнику вслух — с американским произношением', cue: me.a, text: me.b, phrase: me.front };
      case 7: {
        // Проверка по смыслам (scenes.js): засчитано, если в ответе есть фраза или её вариант тона
        const t = toneOf(me.front, table);
        const norm = (x) => normText(x);
        const samples = [me.b, me.ex, t && t.neutral, t && t.friend, t && t.polite, me.front]
          .filter((x, i, arr) => x && arr.findIndex((y) => y && norm(y) === norm(x)) === i).slice(0, 3);
        return { kind: 'own', step, prompt: 'Ответь своими словами, используя «' + me.front + '»',
          cue: me.a, phrase: me.front, samples, meanings: phraseMeanings(me, table) };
      }
      case 8: {
        // TODO(этап 4): полноценная импров-рулетка (карточки ситуаций, таймер 20–30 с)
        const mood = pick(MOODS, rng);
        return { kind: 'improv', step, prompt: 'Без подготовки: ответь так, чтобы прозвучало «' + me.front + '»',
          cue: me.a, mood, theme: me.theme, phrase: me.front, samples: [me.b, me.ex].filter(Boolean), meanings: phraseMeanings(me, table) };
      }
      default:
        return null;
    }
  }

  /* ---------- Проверка ответов ---------- */

  const CONTRACTIONS = {
    "i'm": 'i am', "you're": 'you are', "we're": 'we are', "they're": 'they are', "he's": 'he is', "she's": 'she is',
    "it's": 'it is', "that's": 'that is', "what's": 'what is', "there's": 'there is', "here's": 'here is',
    "how's": 'how is', "who's": 'who is', "where's": 'where is', "let's": 'let us',
    "don't": 'do not', "doesn't": 'does not', "didn't": 'did not', "can't": 'cannot', "won't": 'will not',
    "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not', "weren't": 'were not',
    "haven't": 'have not', "hasn't": 'has not', "couldn't": 'could not', "shouldn't": 'should not', "wouldn't": 'would not',
    "i've": 'i have', "you've": 'you have', "we've": 'we have', "they've": 'they have',
    "i'll": 'i will', "you'll": 'you will', "we'll": 'we will', "it'll": 'it will', "that'll": 'that will',
    "i'd": 'i would', "you'd": 'you would', "y'all": 'you all',
  };

  function normText(s) {
    let t = String(s || '').toLowerCase().replace(/[’‘`ʼ]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
    t = t.split(' ').map((w) => CONTRACTIONS[w] || w).join(' ');
    return t.replace(/\bcan not\b/g, 'cannot');
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  // Сколько опечаток простительно в слове: короткие слова (is/it/to) — только точно
  const typoAllowance = (w) => (w.length <= 3 ? 0 : w.length <= 7 ? 1 : 2);

  // Ступень 4: { ok, exact, typos: [{ got, want }] }
  function checkTyped(input, answer) {
    const got = normText(input).split(' ').filter(Boolean);
    const want = normText(answer).split(' ').filter(Boolean);
    if (!got.length || got.length !== want.length) return { ok: false, exact: false, typos: [] };
    const typos = [];
    for (let i = 0; i < want.length; i++) {
      if (got[i] === want[i]) continue;
      if (levenshtein(got[i], want[i]) <= typoAllowance(want[i])) typos.push({ got: got[i], want: want[i] });
      else return { ok: false, exact: false, typos: [] };
    }
    return { ok: true, exact: typos.length === 0, typos };
  }

  // Ступень 3: собранная последовательность слов совпадает с фразой
  function checkAssembled(picked, answer) {
    return normText((picked || []).join(' ')) === normText((answer || []).join(' '));
  }

  // Ступени 7–8: ученик использовал саму фразу (с допуском опечаток) — это проверяемый факт
  function usesPhrase(text, phrase) {
    const t = normText(text).split(' ').filter(Boolean);
    const p = normText(String(phrase).replace(/\.\.\./g, ' ')).split(' ').filter(Boolean);
    if (!p.length || t.length < p.length) return false;
    for (let i = 0; i + p.length <= t.length; i++) {
      if (p.every((w, j) => t[i + j] === w || levenshtein(t[i + j], w) <= typoAllowance(w))) return true;
    }
    return false;
  }

  /* ---------- Хранение (IndexedDB через DB/SRS; вызывается только из интерфейса) ---------- */

  async function loadState(cardId) {
    const r = await DB.getProgressByCardId(cardId);
    const rec = r.success ? r.data : null;
    return { rec, ladder: normalize(rec && rec.ladder) };
  }

  // Сохранить ступень. FSRS получает оценку только за ПЕРВУЮ попытку фразы за день —
  // повторные попытки в тот же день двигают ступень, но не искажают интервалы.
  async function saveResult(cardId, ladderState, fsrsAction, answerTime) {
    try {
      const today = SRS.todayStr();
      const r = await DB.getProgressByCardId(cardId);
      let rec = r.success ? r.data : null;
      let fsrsUpdated = false;
      if (fsrsAction && (!rec || String(rec.lastReview || '').slice(0, 10) !== today)) {
        const res = await SRS.saveProgress(cardId, 'conversation', fsrsAction, answerTime);
        if (!res.success) return res;
        rec = res.data;
        fsrsUpdated = true;
      }
      if (!rec) return { success: false, error: 'Нет записи прогресса для ' + cardId };
      rec = { ...rec, ladder: normalize({ ...ladderState, updated: today }) };
      const saved = await DB.saveCard('progress', rec);
      if (!saved.success) return saved;
      return { success: true, data: rec, fsrsUpdated };
    } catch (e) {
      return { success: false, error: (e && e.message) || String(e) };
    }
  }

  return {
    loadState, saveResult,
    STEPS, MAX_STEP, TONE_STEP, RULES, TONE_LABELS, MOODS,
    normalize, canAdvance, nextStep, prevStep, applyAnswer,
    itemFromCard, isUsCard, toneOf, hasTone,
    similar, sameTopicPool, pairKey, buildExercise, shuffle,
    normText, levenshtein, checkTyped, checkAssembled, usesPhrase, tokens,
  };
})();

// Экспорт для юнит-тестов (vitest): классический скрипт, в браузере ничего не меняет.
if (typeof globalThis !== 'undefined') globalThis.Ladder = Ladder;
