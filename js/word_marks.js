/* ==========================================================================
   English Reboot — разметка слов в примерах: часть речи, ударный слог, немые буквы
   Файл: word_marks.js — дописывает в parts то, что раньше писали руками:
     pos      — часть речи (цвет подчёркивания); ручная разметка не трогается;
     stressAt — [с, по) буквы ударного слога, по ударению ˈ в американской IPA;
     silent   — немые буквы: буквы, которым в IPA не соответствует ни один звук.
   Ударение и немые буквы — следствие произношения, поэтому считаются для всех слов
   по IPA, которую показывает карточка (lex_us.js и лексиконы content_*.js), и не могут
   с ней разойтись. Конечная «немая e» (make, here, makes) не помечается: правило известно
   с A1, а пометка в каждом четвёртом слове заглушила бы настоящие сюрпризы (know, walk,
   listen, night, Wednesday, chocolate, liked).
   Часть речи: закрытые классы — таблица ниже (условности автора курса: притяжательные —
   pron, частицы up/out/back — adv, междометия — adv), остальное — pos_us.js и поле pos
   карточки «Слов» для её целевого слова; выбор между вариантами — по соседним словам.
   Загружается ПОСЛЕ lex_us.js и pos_us.js, ДО app.js. Размечает курс WordMarks.markCourse() — app.js и gamify.js
   вызывают его перед сидированием в IndexedDB (только при смене версии раздела, не при каждом запуске).
   ========================================================================== */
const WordMarks = (() => {
  'use strict';

  /* ---------- Звуки IPA ---------- */
  const MULTI = ['tʃ', 'dʒ', 'eɪ', 'aɪ', 'ɔɪ', 'aʊ', 'oʊ', 'əʊ', 'ɪə', 'eə', 'ɛə', 'ʊə'];
  const NORM = { 'ɹ': 'r', 'g': 'ɡ', 'ɒ': 'ɑ', 'əʊ': 'oʊ', 'ɜ': 'ɝ', 'e': 'ɛ', 'ɐ': 'ə', 'a': 'æ', 'eə': 'ɛə',
    'ɾ': 't', 'ʔ': 't', 'x': 'k', 'ɫ': 'l', 'ʎ': 'l', 'ɨ': 'ɪ', 'ᵻ': 'ɪ', 'o': 'oʊ', 'ɚ': 'ɚ' };
  const VOWELS = new Set(['i', 'ɪ', 'eɪ', 'ɛ', 'æ', 'ɑ', 'ɔ', 'oʊ', 'ʊ', 'u', 'ʌ', 'ə', 'ɚ', 'ɝ', 'aɪ', 'aʊ', 'ɔɪ', 'ɪə', 'ɛə', 'ʊə']);
  const OBSTRUENT = new Set(['p', 'b', 't', 'd', 'k', 'ɡ', 'f', 'v', 'θ', 'ð', 's', 'z', 'ʃ', 'ʒ', 'tʃ', 'dʒ']);

  // IPA слова → [{p: звук, v: гласный (ядро слога), s: ударный}]
  function phonemes(ipa) {
    const src = String(ipa || '').replace(/[/[\]()\s‿.-]/g, '').replace(/[ːˑ̩̯̃]/g, '');
    const out = [];
    let stressNext = false;
    for (let i = 0; i < src.length;) {
      const ch = src[i];
      if (ch === 'ˈ') { stressNext = true; i++; continue; }
      if (ch === 'ˌ' || ch === "'") { i++; continue; }
      const m = MULTI.find((x) => src.startsWith(x, i)) || ch;
      i += m.length;
      const p = NORM[m] || m;
      out.push({ p, v: VOWELS.has(p), s: false, stressMark: stressNext });
      if (VOWELS.has(p)) stressNext = false;
    }
    // Слоговые l/n/m после шумного согласного (little /ˈlɪtl/, seven /ˈsɛvn/, isn't) — тоже ядра слога
    out.forEach((t, k) => {
      if (!t.v && /^[lnm]$/.test(t.p) && k > 0 && OBSTRUENT.has(out[k - 1].p) && (k === out.length - 1 || !out[k + 1].v)) t.v = true;
    });
    // Ударение: первая гласная после ˈ
    let pending = false;
    out.forEach((t) => { if (t.stressMark) pending = true; if (pending && t.v) { t.s = true; pending = false; } });
    // ɚ/ɝ перед гласной: в CMU r «съедена» гласной (correct /kɚˈɛkt/, worry /ˈwɝi/), а на письме и в слогах она
    // есть (cor·rect, wor·ry). Добавляем необязательный звук r: буква r найдётся — встанет на него, нет — пропуск даром.
    for (let k = out.length - 2; k >= 0; k--) {
      if ((out[k].p === 'ɚ' || out[k].p === 'ɝ') && out[k + 1].v) out.splice(k + 1, 0, { p: 'r', v: false, s: false, opt: true });
    }
    return out;
  }

  /* ---------- Буквы ↔ звуки ---------- */
  // Графема → варианты прочтения «звук звук:цена». Цена 0 — обычное прочтение; немых букв здесь нет:
  // kn, wr, gh, mb, lk… разбираются как «немая буква + графема», чтобы немую букву было видно.
  const G = new Map();
  function g(letters, alts) {
    G.set(letters, alts.split(',').map((a) => {
      const [ph, c] = a.trim().split(':');
      return { ph: ph.trim().split(/\s+/), cost: c === undefined ? 0 : Number(c) };
    }));
  }
  // Согласные
  g('b', 'b'); g('bb', 'b'); g('c', 'k, s, ʃ:1, tʃ:1.5'); g('cc', 'k, k s:0.3, tʃ:1.5'); g('ch', 'tʃ, k:0.3, ʃ:0.5, dʒ:1.5');
  g('ck', 'k'); g('ci', 'ʃ:0.5'); g('ce', 'ʃ:0.8'); g('cq', 'k:0.5'); g('d', 'd, t:0.3, dʒ:0.6'); g('dd', 'd, t:0.5');
  g('dg', 'dʒ'); g('dj', 'dʒ'); g('di', 'dʒ:1'); g('f', 'f, v:0.5'); g('ff', 'f'); g('g', 'ɡ, dʒ:0.2, ʒ:0.8'); g('gg', 'ɡ, dʒ:0.5, ɡ dʒ:1');
  g('gh', 'f:0.3, ɡ:0.3'); g('h', 'h'); g('j', 'dʒ, j:1, h:1, ʒ:1'); g('k', 'k'); g('kk', 'k'); g('l', 'l, ə l:0.8'); g('ll', 'l');
  g('le', 'ə l:0.2, l:0.2'); g('el', 'ə l:0.3, l:0.3'); g('al', 'ə l:0.3, l:0.3'); g('il', 'ə l:0.4, l:0.4'); g('ol', 'ə l:0.4');
  g('ul', 'ə l:0.4'); g('m', 'm, ə m:0.8'); g('mm', 'm'); g('n', 'n, ŋ:0.3, ə n:0.8'); g('nn', 'n'); g('ng', 'ŋ, ŋ ɡ:0.3, n dʒ:0.3');
  g('en', 'ə n:0.3, n:0.3'); g('on', 'ə n:0.3, n:0.3'); g('an', 'ə n:0.3, n:0.4');
  g('em', 'ə m:0.4, m:0.4'); g('om', 'ə m:0.4, m:0.4'); g('um', 'ə m:0.4, m:0.4'); g('p', 'p'); g('pp', 'p');
  g('ph', 'f, v:1'); g('q', 'k'); g('qu', 'k w, k:0.3'); g('r', 'r, ɚ:0.8'); g('rr', 'r'); g('rh', 'r'); g('re', 'ɚ:0.3');
  g('s', 's, z:0.1, ʃ:0.5, ʒ:0.5'); g('ss', 's, z:0.5, ʃ:0.5'); g('sh', 'ʃ'); g('si', 'ʒ:0.3, ʃ:0.4');
  g('t', 't, tʃ:0.3, d:0.3, ʃ:0.8, θ:1'); g('tt', 't, d:0.3'); g('th', 'θ, ð, t:0.5'); g('ti', 'ʃ:0.2, tʃ:0.3');
  g('tch', 'tʃ'); g('ure', 'ɚ:0.2, ʊ r:0.3, j ɚ:0.6, j ʊ r:0.6, ə:0.4'); g('v', 'v'); g('w', 'w'); g('x', 'k s, ɡ z:0.3, z:0.8, k ʃ:0.8, ɡ ʒ:1, k:0.5, ɡ:0.8');
  g('z', 'z, s:0.5, ʒ:1'); g('zz', 'z, t s:0.5');
  // Гласные и сочетания
  g('a', 'æ, eɪ, ɑ, ɔ:0.2, ə, ɪ:0.5, ɛ:0.5, ɚ:1, ʌ:0.6'); g('ar', 'ɚ:0.3, ə:0.4'); g('ai', 'eɪ, ɛ:0.4, ə:0.5, aɪ:0.8, æ:1');
  g('ay', 'eɪ, ɛ:0.6, i:0.4, aɪ:1'); g('arr', 'ɚ:0.3, ə r:0.3'); g('au', 'ɔ, ɑ, æ:0.5, oʊ:1, aʊ:1'); g('aw', 'ɔ, ɑ');
  g('e', 'ɛ, i:0.1, ə:0.1, ɪ:0.1, eɪ:0.8'); g('ea', 'i, ɛ:0.1, eɪ:0.4, ɪ:0.6, ə:0.6, ɑ:1');
  g('ee', 'i, ɪ:0.4'); g('ei', 'eɪ, i:0.2, aɪ:0.3, ɛ:0.8, ɪ:0.6, ə:0.8'); g('ey', 'eɪ, i:0.2, aɪ:0.5, ɪ:0.5'); g('eah', 'æ:0.3, ɛ:0.3, ɛə:0.5');
  g('eo', 'i:0.4, ɛ:0.6, ə:0.6'); g('eu', 'u:0.3, j u:0.3'); g('ew', 'u, j u:0.2, oʊ:1'); g('er', 'ɚ, ɝ:0.1, ə:0.4'); g('err', 'ɝ:0.3');
  g('i', 'ɪ, aɪ, i:0.1, ə:0.3, j:0.6'); g('ie', 'i, aɪ, ɛ:0.5, ɪ:0.5'); g('ir', 'ɝ, ɚ:0.3, ə:0.4'); g('irr', 'ɝ:0.3');
  g('o', 'ɑ, oʊ, ʌ, ə, ɔ, u:0.3, ʊ:0.4, ɪ:0.8, w ʌ:0.5, ɚ:1'); g('oa', 'oʊ, ɔ:0.6'); g('oar', 'ɚ:0.5'); g('oe', 'oʊ, u:0.3, ʌ:0.2');
  g('oi', 'ɔɪ, w ɑ:1'); g('oo', 'u, ʊ, ʌ:0.5, ɔ:0.5, oʊ:1'); g('or', 'ɝ:0.2, ɚ:0.2, ə:0.4'); g('orr', 'ɝ:0.3'); g('eau', 'j u:0.2, oʊ:0.3');
  g('ou', 'aʊ, u:0.2, ʌ:0.2, oʊ:0.3, ɔ:0.3, ʊ:0.3, ə:0.3, ɑ:0.6'); g('our', 'ɝ:0.4, ɚ:0.4'); g('ow', 'aʊ, oʊ, ɑ:1'); g('oy', 'ɔɪ');
  g('u', 'ʌ, u, j u:0.1, ʊ:0.2, ə:0.2, ɪ:0.6, ɛ:0.8, w:0.3, j ʊ:0.5, j ə:0.5'); g('ue', 'u, j u:0.1');
  g('ui', 'u:0.3'); g('ur', 'ɝ, ɚ:0.2, ə:0.4'); g('urr', 'ɝ:0.3'); g('uy', 'aɪ:0.3'); g('y', 'i, ɪ, aɪ, j, ə:0.6'); g('ye', 'aɪ:0.5');
  g('eye', 'aɪ:0.3'); g('yr', 'ɝ:1');
  // Британская IPA без r (на всякий случай: в курсе её нет, но немой r из-за неё не появится)
  g('are', 'ɛə:0.3'); g('air', 'ɛə:0.3'); g('ear', 'ɝ:0.2, ɪə:0.3, ɛə:0.5'); g('eer', 'ɪə:0.3'); g('ere', 'ɪə:0.3, ɛə:0.3');
  g('ore', 'ɔ:0.5'); g('oor', 'ɔ:0.5, ʊə:0.5'); g('ure', 'ɚ:0.2, ʊ r:0.3, j ɚ:0.6, j ʊ r:0.6, ʊə:0.5');
  const MAXG = 3;

  // Цена «немой буквы» в контексте: дёшево там, где буква действительно не читается по правилу
  function silentCost(w, i) {
    const c = w[i], prev = w[i - 1] || '', next = w[i + 1] || '', rest = w.slice(i + 1), L = w.length;
    if (c === "'") return 0;
    if (c === 'e') {
      if (i === L - 1) return 0.15;                                      // make, here
      if (i === L - 2 && (next === 's' || next === 'd')) return 0.35;     // makes, liked
      if (/^(ly|ment|ful|ness|less|s|d|r|ry|ing)$/.test(rest)) return 0.6; // lately, movement
      return 1.5;                                                         // выпавший слог: every, different
    }
    if (c === 'u' && /[gb]/.test(prev) && /[aeiouy]/.test(next)) return 0.5;  // guess, guide, build, buy
    if ('aiou'.includes(c)) return 1.6;                                   // chocolate, business, restaurant
    if (c === 'y') return 2.5;
    if (c === 'h') { if (/[wgrkx]/.test(prev)) return 0.4; if (i === 0) return 1.0; return 1.8; }  // what, ghost, rhythm, hour
    if (c === 'g') { if (next === 'h') return 0.4; if (next === 'n') return 0.5; return 2.5; }        // night, sign
    if (c === 'k') return i === 0 && next === 'n' ? 0.3 : 2.5;           // know
    if (c === 'w') { if (next === 'r') return 0.3; if (next === 'h') return 0.6; if (prev === 's' || prev === 't') return 0.8; return 2.5; } // write, who, answer, two
    if (c === 'b') { if (prev === 'm' && (i === L - 1 || /^(s|ed|ing|er|ers)$/.test(rest))) return 0.4; if (next === 't') return 0.5; return 2.5; } // climb, doubt
    if (c === 'l') { if (prev === 'a' && /[kfm]/.test(next)) return 0.4; if (prev === 'u' && w[i - 2] === 'o' && next === 'd') return 0.4; if (prev === 'o' && next === 'k') return 0.5; return 2.5; } // walk, half, calm, could, folk
    if (c === 't') { if (prev === 's' && /^(en|le|ener|ening|ens|les|ly|m)/.test(rest)) return 0.5; if (prev === 'f' && rest.startsWith('en')) return 0.6; return 2.5; } // listen, castle, Christmas, often
    if (c === 'n') return prev === 'm' && (i === L - 1 || next === 's') ? 0.4 : 2.5;   // autumn
    if (c === 'p') return (i === 0 && /[sn]/.test(next)) || next === 't' || next === 'b' ? 0.5 : 2.5; // psychology, receipt, cupboard
    if (c === 's') return next === 'l' ? 0.6 : 2.5;                       // island, aisle
    if (c === 'c') return prev === 's' && /[eiyl]/.test(next) ? 0.5 : 2.5; // science, scene, muscle
    if (c === 'd') return (prev === 'n' && /[sw]/.test(next)) || next === 'n' ? 0.6 : 2.5; // handsome, sandwich, Wednesday
    if (c === 'r') return 1.2;
    return 2.5;
  }

  // Выравнивание букв слова и звуков IPA (динамическое программирование).
  // → { cost, letter: [индекс звука или -1 для немой буквы], nuclei: [{from, to, s}] } или null
  const memo = new Map();
  function align(word, ipa) {
    const w = String(word || '').toLowerCase();
    const key = w + ' ' + ipa;
    if (memo.has(key)) return memo.get(key);
    const res = alignRaw(w, phonemes(ipa));
    memo.set(key, res);
    return res;
  }
  function alignRaw(w, ph) {
    const L = w.length, P = ph.length;
    if (!L || !P || !/[a-z]/.test(w)) return null;
    const INF = 1e9;
    const dp = Array.from({ length: L + 1 }, () => new Float64Array(P + 1).fill(INF));
    const from = Array.from({ length: L + 1 }, () => new Array(P + 1).fill(null));
    dp[0][0] = 0;
    for (let i = 0; i <= L; i++) {
      for (let j = 0; j <= P; j++) {
        const cur = dp[i][j];
        if (cur >= INF) continue;
        if (i < L) {                                   // немая буква
          const c = cur + silentCost(w, i);
          if (c < dp[i + 1][j]) { dp[i + 1][j] = c; from[i + 1][j] = [i, j, 'silent']; }
        }
        if (j < P) {                                   // звук без буквы (вставная ə)
          const c = cur + (ph[j].opt ? 0 : ph[j].p === 'ə' ? 2 : 3.5);
          if (c < dp[i][j + 1]) { dp[i][j + 1] = c; from[i][j + 1] = [i, j, 'epenthesis']; }
        }
        for (let k = 1; k <= MAXG && i + k <= L; k++) {
          const alts = G.get(w.slice(i, i + k));
          if (!alts) continue;
          // «гласная + l/n/m» одним согласным звуком — только слоговой согласный (lis·ten, gar·den) — не перед гласной:
          // в evening /ˈivnɪŋ/ e просто выпадает (немая)
          const sylOnly = k === 2 && /^[aeiou][lnm]$/.test(w.slice(i, i + k)) && /[aeiouy]/.test(w[i + k] || '');
          for (const a of alts) {
            const m = a.ph.length;
            if (sylOnly && m === 1) continue;
            if (j + m > P) continue;
            let ok = true;
            for (let t = 0; t < m; t++) if (ph[j + t].p !== a.ph[t]) { ok = false; break; }
            if (!ok) continue;
            const c = cur + a.cost;
            if (c < dp[i + k][j + m]) { dp[i + k][j + m] = c; from[i + k][j + m] = [i, j, 'g']; }
          }
        }
      }
    }
    const total = dp[L][P];
    if (total >= INF || total > 3 + 0.35 * L) return null;
    const letter = new Array(L).fill(-1);
    const phLetters = Array.from({ length: P }, () => []);
    for (let i = L, j = P; i > 0 || j > 0;) {
      const [pi, pj, kind] = from[i][j];
      if (kind === 'g') for (let x = pi; x < i; x++) { letter[x] = pj; for (let y = pj; y < j; y++) phLetters[y].push(x); }
      i = pi; j = pj;
    }
    const nuclei = [];
    ph.forEach((t, k) => {
      if (!t.v || !phLetters[k].length) return;
      nuclei.push({ k, p: t.p, from: Math.min(...phLetters[k]), to: Math.max(...phLetters[k]) + 1, s: t.s });
    });
    return { cost: total, letter, nuclei, ph, phLetters };
  }

  /* ---------- Немые буквы и ударный слог (индексы — в «голом» слове) ---------- */
  const isConsonantLetter = (c) => /[bcdfghjklmnpqrstvwxz]/.test(c || '');
  function silentOf(word, a) {
    const w = String(word).toLowerCase(), L = w.length, out = [];
    a.letter.forEach((ph, i) => {
      if (ph !== -1 || w[i] === "'") return;
      // Конечная немая e после согласной (make, here, makes) — правило A1, не помечаем
      if (w[i] === 'e' && isConsonantLetter(w[i - 1]) && (i === L - 1 || (i === L - 2 && w[L - 1] === 's'))) return;
      out.push(i);
    });
    return out;
  }
  // Граница слогов между ядрами k и k+1 (индекс буквы). Правила словарей (Merriam-Webster):
  // согласные уходят в начало следующего слога, сколько допускает английское начало слога
  // (ho·tel, ba·na·na, ques·tion); удвоенная буква делится (hap·py, cof·fee, to·mor·row);
  // ударный краткий гласный (ɪ ɛ æ ʌ ʊ) слог не заканчивает — забирает согласный (lis·ten, sev·en, ba·nan·a).
  const ONSETS = new Set(['pl', 'pr', 'pj', 'bl', 'br', 'bj', 'tr', 'tw', 'dr', 'dw', 'kl', 'kr', 'kw', 'kj', 'ɡl', 'ɡr', 'ɡw', 'ɡj',
    'fl', 'fr', 'fj', 'θr', 'θw', 'ʃr', 'sl', 'sw', 'sp', 'st', 'sk', 'sm', 'sn', 'mj', 'nj', 'hj', 'vj', 'spl', 'spr', 'str', 'skr', 'skw', 'spj', 'skj']);
  const LAX = new Set(['ɪ', 'ɛ', 'æ', 'ʌ', 'ʊ']);
  const legalOnset = (seq) => seq.length === 0 || (seq.length === 1 ? seq[0] !== 'ŋ' : ONSETS.has(seq.join('')));
  function boundary(w, a, k) {
    const A = a.nuclei[k], B = a.nuclei[k + 1];
    if (B.from <= A.to) return Math.max(A.to, B.from);
    // Согласные звуки между ядрами по порядку: звук → первая/последняя его буква
    const cons = [];
    for (let j = A.k + 1; j < B.k; j++) {
      const ls = a.phLetters[j];
      if (!ls.length || a.ph[j].v) continue;
      cons.push({ p: a.ph[j].p, first: Math.min(...ls), last: Math.max(...ls) });
    }
    if (!cons.length) return B.from;
    let on = cons.length;
    while (on > 0 && legalOnset(cons.slice(on - 1).map((c) => c.p))) on--;
    const dbl = (c) => c.last > c.first && w[c.first] === w[c.last];
    // ɑ/ɔ на месте буквы o — тоже краткие (hon·est, of·ten, prob·lem); на месте a — нет (wa·ter, fa·ther)
    const lax = LAX.has(A.p) || ((A.p === 'ɑ' || A.p === 'ɔ') && w.slice(A.from, A.to) === 'o');
    // …но не буквосочетанием с гласной: vi·sion, de·li·cious, spe·cial (si, ci, ti — начало слога)
    const withVowel = /[aeiouy]/.test(w.slice(cons[0].first, cons[0].last + 1));
    if (A.s && lax && on === 0 && !withVowel) {             // краткий ударный гласный закрывает слог
      if (dbl(cons[0])) return cons[0].first + 1;            // hap·py, lit·tle
      on = 1;
    }
    const first = cons[on];
    if (!first) return cons[cons.length - 1].last + 1;       // lis·ten, weath·er, cit·y
    if (dbl(first)) return first.first + 1;                  // cof·fee, to·mor·row
    if (on > 0 && cons[on - 1].last >= first.first) return first.first + 1; // одна буква на два звука: lan·guage (ng), tax·i (x)
    return first.first;                                      // ho·tel, an·swer, Christ·mas
  }
  function stressSpanOf(word, a) {
    const n = a.nuclei;
    // Слог «на письме» — ядро с гласной буквой: у our /ˈaʊɚ/, hour второе ядро — одна r, выделять нечего
    const w0 = String(word).toLowerCase();
    if (n.length < 2 || n.filter((x) => /[aeiouy]/.test(w0.slice(x.from, x.to))).length < 2) return null;
    const s = n.findIndex((x) => x.s);
    if (s < 0) return null;
    const w = String(word).toLowerCase();
    const start = s === 0 ? 0 : boundary(w, a, s - 1);
    const end = s === n.length - 1 ? w.length : boundary(w, a, s);
    return end > start ? [start, end] : null;
  }

  /* ---------- Части речи ---------- */
  // Условности автора курса (по ручной разметке грамматики): притяжательные — pron; up/out/back/down/off — adv;
  // междометия (hi, okay, yeah) — adv; to перед глаголом — part; be — verb, aux только в страдательном залоге
  // (is spoken, was built); will/won't — aux; can/could/should/must — modal; have got — verb.
  const CLOSED = Object.create(null);
  const T = (tag, words) => words.trim().split(/\s+/).forEach((w) => { CLOSED[w] = tag; });
  T('art', 'a an the');
  T('pron', "i you he she it we they me him her us them my your his its our their mine yours hers ours theirs " +
    'myself yourself himself herself itself ourselves yourselves themselves who whom whose what which ' +
    'someone somebody something anyone anybody anything everyone everybody everything nobody nothing none others ' +
    "ya 'em y'all yall i'm i've i'll i'd you're you've you'll you'd he's he'll he'd she's she'll she'd it's it'll it'd " +
    "we're we've we'll we'd they're they've they'll they'd that's that'll what's who's who'll whatcha whaddaya whaddya " +
    'whoever whatever');
  T('det', 'some any every each another all both either neither many few several such');
  T('prep', 'in on for of at with from by about into onto between under during across through without within behind ' +
    'beside besides near toward towards against along among above below beneath inside outside upon via per except till until ' +
    'beyond despite unlike throughout amid underneath alongside aboard versus vs plus minus thru outta');
  T('conj', "and but or nor if than because while although though unless whether 'cause cuz whenever wherever");
  T('aux', "don't doesn't didn't haven't hasn't hadn't ain't didja doncha dontcha arencha will won't");
  T('modal', "can could would shall should might must ought cannot can't couldn't wouldn't shouldn't mustn't " +
    'coulda woulda shoulda musta mighta oughta couldja wouldja');
  T('num', 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen ' +
    'eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand million billion first second ' +
    'third fourth fifth sixth seventh eighth ninth tenth eleventh twelfth twentieth hundredth');
  T('adv', "not n't never always often usually sometimes rarely seldom ever already just still also too very really so quite " +
    'rather almost nearly here there now then today tonight tomorrow yesterday soon later again ago maybe perhaps please ' +
    "hello hi hey bye goodbye yeah yes yep yup nope kay 'kay wow oh ah uh um hmm oops ouch huh how why where together " +
    'else even only twice anyway anymore instead forward lotsa lotta kinda sorta up out down off away back more ' +
    'most less least enough ahh aw aww ugh yay yikes whoa nah meh ew phew shh mhm mm ooh hooray congrats anytime however ' +
    "prolly lol gosh wassup howya whereya whencha whycha how've there's here's where's how's when's lot");
  T('verb', "let's gonna wanna gotta hafta lemme gimme dunno c'mon c'mere betcha gotcha tryna useta supposta needa s'pose");
  // Слова, часть речи которых решает контекст (resolveCtx)
  const CTX = Object.create(null);
  'am is are was were be being isn\'t aren\'t wasn\'t weren\'t'.split(' ').forEach((w) => { CTX[w] = 'BE'; });
  Object.assign(CTX, { been: 'BEEN', do: 'DO', does: 'DO', did: 'DO', have: 'HAVE', has: 'HAVE', had: 'HAVE', to: 'TO',
    that: 'THAT', this: 'DEM', these: 'DEM', those: 'DEM', no: 'NO', much: 'MUCH', like: 'LIKE', since: 'SINCE', as: 'AS',
    when: 'WHEN', over: 'OVER', around: 'OVER', outside: 'OVER', inside: 'OVER', behind: 'OVER', above: 'OVER', below: 'OVER',
    across: 'OVER', through: 'OVER', along: 'OVER', near: 'OVER', underneath: 'OVER', one: 'ONE', after: 'AFTER', before: 'AFTER', right: 'RIGHT', past: 'PAST',
    okay: 'OKAY', ok: 'OKAY', may: 'MAY', well: 'WELL', other: 'OTHER', second: 'ORD', first: 'ORD' });

  const SUBJ = new Set(['i', 'you', 'we', 'they', 'he', 'she', 'it', 'who', 'people', 'everyone', 'everybody', 'nobody',
    'someone', 'somebody', 'kids', 'ya']);
  const POSS = new Set(['my', 'your', 'his', 'her', 'its', 'our', 'their', 'whose']);
  const OBJ = new Set(['me', 'him', 'her', 'us', 'them']);
  const BE_FORMS = new Set(['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', "i'm", "you're", "we're", "they're",
    "he's", "she's", "it's", "that's", "isn't", "aren't", "wasn't", "weren't", "what's", "who's", "there's", "here's"]);
  const LINKING = new Set(['feel', 'feels', 'felt', 'feeling', 'look', 'looks', 'looked', 'seem', 'seems', 'seemed',
    'get', 'gets', 'got', 'getting', 'become', 'becomes', 'became', 'stay', 'stays', 'stayed', 'sound', 'sounds', 'sounded',
    'smell', 'smells', 'taste', 'tastes', 'keep', 'keeps', 'turn', 'turned', 'grow', 'grew', 'gets', 'make', 'makes', 'made',
    'feelin', 'lookin', 'gettin', 'soundin', 'seemin']);
  const DEGREE = new Set(['so', 'too', 'very', 'really', 'pretty', 'quite', 'more', 'most', 'less', 'least', 'super', 'kinda',
    'much', 'even', 'far', 'slightly', 'way',
    'sorta', 'totally', 'extremely', 'how', 'as', 'incredibly', 'surprisingly', 'absolutely', 'completely']);
  const VERB_AFTER = new Set(["let's", 'gonna', 'wanna', 'gotta', 'hafta', 'tryna', 'useta', "'ll", "'d", 'i', 'you', 'we',
    'they', 'he', 'she', 'it', 'who', 'please', 'lemme', 'cannot', 'kids', 'people', 'everyone', 'nobody', 'someone']);
  const ADVERB_SKIP = new Set(['not', "n't", 'never', 'always', 'usually', 'often', 'sometimes', 'just', 'really', 'also',
    'still', 'even', 'already', 'finally', 'rarely', 'actually', 'probably', 'definitely', 'only', 'ever', 'all', 'both',
    'totally', 'seriously', 'honestly', 'literally', 'barely', 'hardly', 'almost', 'suddenly', 'immediately', 'sometimes']);
  // После этих слов «to + существительное» — предлог: go to work, the way to school, thanks to you
  const MOTION = new Set(['go', 'goes', 'went', 'gone', 'come', 'comes', 'came', 'coming', 'get', 'gets', 'got', 'getting',
    'back', 'walk', 'walks', 'walked', 'walking', 'drive', 'drives', 'drove', 'driving', 'ride', 'rode', 'run', 'ran', 'fly',
    'flew', 'move', 'moved', 'travel', 'travels', 'traveled', 'return', 'returns', 'way', 'next', 'close', 'welcome', 'thanks',
    'due', 'forward', 'reply', 'invitation', 'trip', 'ticket', 'key', 'road', 'door', 'visit', 'answer', 'access', 'attention',
    'belong', 'belongs']);
  // -ing после be — продолженное время (is working), кроме прилагательных-оценок (is boring)
  const ING_ADJ = new Set(['boring', 'interesting', 'exciting', 'amazing', 'surprising', 'tiring', 'relaxing', 'annoying',
    'confusing', 'disappointing', 'embarrassing', 'frightening', 'shocking', 'terrifying', 'satisfying', 'charming',
    'stunning', 'encouraging', 'fascinating', 'depressing', 'worrying', 'missing', 'outstanding', 'refreshing', 'exhausting',
    'inspiring', 'overwhelming', 'challenging', 'rewarding', 'convincing', 'promising', 'touching', 'entertaining', 'disgusting',
    'appealing', 'loving', 'caring', 'willing', 'calming', 'soothing', 'thrilling', 'demanding', 'pleasing', 'striking',
    'upcoming', 'ongoing', 'existing', 'following', 'remaining', 'leading', 'growing', 'increasing', 'cunning', 'lacking',
    'freezing', 'boiling', 'interesting', 'humiliating', 'irritating', 'puzzling', 'alarming', 'compelling', 'intimidating']);
  const LIKE_PREP = new Set(['look', 'looks', 'looked', 'looking', 'sound', 'sounds', 'sounded', 'feel', 'feels', 'felt',
    'seem', 'seems', 'smell', 'smells', 'taste', 'tastes', 'something', 'anything', 'nothing', 'exactly', 'more', 'much',
    'kinda', 'sorta', 'nobody', 'people', 'things', 'stuff', 'just']);
  const THINK = new Set(['think', 'thinks', 'thought', 'know', 'knows', 'knew', 'say', 'says', 'said', 'hope', 'hopes', 'sure',
    'believe', 'mean', 'means', 'meant', 'guess', 'realize', 'realized', 'glad', 'afraid', 'sorry', 'tell', 'told', 'feel',
    'show', 'shows', 'remember', 'forget', 'promise', 'promised', 'notice', 'noticed', 'heard', 'hear', 'see', 'saw', 'happy',
    'proud', 'agree', 'admit', 'explain', 'explained', 'decide', 'decided', 'understand', 'worried', 'imagine']);
  // the idea that…, the fact that… — после этих существительных that — союз, а не относительное местоимение
  const THAT_NOUN = new Set(['idea', 'fact', 'news', 'feeling', 'hope', 'chance', 'sign', 'proof', 'rumor', 'belief', 'truth',
    'possibility', 'impression', 'sense', 'point', 'thought', 'promise', 'risk', 'evidence', 'message', 'claim']);
  const IRREG_PP = new Set(['done', 'gone', 'seen', 'eaten', 'taken', 'given', 'written', 'spoken', 'broken', 'chosen',
    'driven', 'forgotten', 'gotten', 'known', 'shown', 'thrown', 'grown', 'flown', 'drawn', 'worn', 'born', 'fallen',
    'stolen', 'woken', 'hidden', 'ridden', 'risen', 'begun', 'drunk', 'sung', 'swum', 'become', 'made', 'had',
    'heard', 'left', 'lost', 'met', 'paid', 'put', 'read', 'said', 'sent', 'sold', 'told', 'thought', 'bought', 'brought',
    'caught', 'taught', 'found', 'kept', 'slept', 'felt', 'built', 'spent', 'understood', 'stood', 'won', 'set', 'cut', 'hit',
    'hurt', 'let', 'shut', 'quit', 'cost', 'held', 'led', 'fed', 'fled', 'meant', 'dealt', 'come', 'run', 'got', 'torn',
    'sworn', 'beaten', 'bitten', 'frozen', 'shaken', 'forgiven', 'proven', 'blown', 'sunk', 'struck', 'hung', 'shot',
    'fought', 'sought', 'stuck', 'spun', 'sewn', 'mistaken', 'overtaken', 'withdrawn', 'undertaken', 'awoken']);
  // Прошедшее время неправильных глаголов → начальная форма (для фразовых глаголов: took over → take over)
  const IRREG_PAST = { took: 'take', taken: 'take', came: 'come', went: 'go', gone: 'go', got: 'get', gotten: 'get',
    gave: 'give', given: 'give', ran: 'run', brought: 'bring', made: 'make', broke: 'break', broken: 'break', fell: 'fall',
    fallen: 'fall', held: 'hold', kept: 'keep', left: 'leave', stood: 'stand', threw: 'throw', thrown: 'throw', wore: 'wear',
    worn: 'wear', woke: 'wake', woken: 'wake', wrote: 'write', rode: 'ride', drove: 'drive', ate: 'eat', saw: 'see',
    seen: 'see', told: 'tell', sold: 'sell', sent: 'send', spent: 'spend', found: 'find', thought: 'think', caught: 'catch',
    bought: 'buy', paid: 'pay', said: 'say', shook: 'shake', tore: 'tear', torn: 'tear', grew: 'grow', grown: 'grow',
    blew: 'blow', drew: 'draw', did: 'do', done: 'do', had: 'have', has: 'have', was: 'be', were: 'be', hung: 'hang',
    shot: 'shoot', fought: 'fight', stood: 'stand', drank: 'drink', drunk: 'drink', stuck: 'stick', dug: 'dig', hid: 'hide', hidden: 'hide', lit: 'light', sat: 'sit',
    sang: 'sing', swam: 'swim', began: 'begin', begun: 'begin', set: 'set', put: 'put', cut: 'cut', let: 'let',
    shut: 'shut', hit: 'hit', led: 'lead', met: 'meet', heard: 'hear', felt: 'feel', meant: 'mean', dealt: 'deal',
    lost: 'lose', won: 'win', understood: 'understand', flew: 'fly', flown: 'fly', chose: 'choose', chosen: 'choose',
    froze: 'freeze', frozen: 'freeze', spoke: 'speak', spoken: 'speak', stole: 'steal', stolen: 'steal', bit: 'bite',
    bitten: 'bite', slept: 'sleep', built: 'build', taught: 'teach', fed: 'feed', fled: 'flee', sank: 'sink', sunk: 'sink',
    struck: 'strike', wound: 'wind', swept: 'sweep', crept: 'creep', laid: 'lay', lay: 'lie', bent: 'bend', lent: 'lend' };
  // Частицы фразовых глаголов: в take over the project, came across a photo, turn the light on — наречие (условность
  // курса, как up/out/back), если пара «глагол + частица» есть среди карточек фразовых глаголов
  const PARTICLES = new Set(['on', 'off', 'in', 'over', 'around', 'across', 'through', 'down', 'up', 'out', 'back', 'away',
    'along', 'about', 'by', 'after', 'ahead', 'apart', 'aside', 'behind', 'forward', 'together', 'into', 'round']);
  const PHRASAL = new Map();   // глагол → частицы (из карточек «Фразовые глаголы»)
  // Причастия, которые после be — прилагательные (I'm tired), а не страдательный залог (it was built)
  const ADJ_PP = new Set(['tired', 'bored', 'excited', 'interested', 'worried', 'scared', 'surprised', 'married', 'closed',
    'confused', 'amazed', 'pleased', 'satisfied', 'disappointed', 'embarrassed', 'relaxed', 'stressed', 'exhausted', 'annoyed',
    'frightened', 'shocked', 'delighted', 'crowded', 'done', 'finished', 'lost', 'broken', 'gone', 'used', 'supposed',
    'located', 'allowed', 'stuck', 'busy', 'obsessed', 'addicted', 'involved', 'prepared', 'dressed', 'engaged', 'tied',
    'fed', 'impressed', 'stressed', 'grounded', 'jetlagged', 'packed', 'booked', 'sold', 'canceled', 'cancelled', 'delayed',
    'hooked', 'blessed', 'convinced', 'determined', 'motivated', 'overwhelmed', 'upset', 'hurt', 'injured', 'sunburned']);

  const CODE = { n: 'noun', v: 'verb', a: 'adj', d: 'adv', p: 'prep', r: 'pron', c: 'conj', t: 'det', u: 'num', x: 'aux',
    m: 'modal', q: 'part', l: 'art' };
  const RU_POS = { 'сущ.': 'noun', 'глаг.': 'verb', 'прил.': 'adj', 'нареч.': 'adv', 'предл.': 'prep', 'местоим.': 'pron',
    'союз': 'conj', 'числ.': 'num', 'частица': 'part', 'межд.': 'adv', 'фраз. глаг.': 'verb', 'мод.': 'modal', 'артикль': 'art' };

  const bareOf = (w) => String(w || '').toLowerCase().replace(/[^a-z']/g, '').replace(/^'+(?!(em|cause|kay)$)|'+$/g, '');
  const lex = () => (typeof window !== 'undefined' && window.POS_US) || (typeof globalThis !== 'undefined' && globalThis.POS_US) || {};
  const extraLex = new Map();   // целевые слова карточек «Слов» с их частью речи (для словоформ в других примерах)

  // Кандидаты из словаря: точная форма → лемма (works → work, studied → study, bigger → big)
  function lexTags(b) {
    const L = lex();
    const direct = L[b] || extraLex.get(b);
    if (direct) return direct.split('').map((c) => CODE[c]).filter(Boolean);
    const tries = [];
    if (/ies$/.test(b)) tries.push([b.slice(0, -3) + 'y', 'nv']);
    if (/es$/.test(b)) tries.push([b.slice(0, -2), 'nv']);
    if (/[^s]s$/.test(b)) tries.push([b.slice(0, -1), 'nv']);
    if (/ied$/.test(b)) tries.push([b.slice(0, -3) + 'y', 'v']);
    if (/ed$/.test(b)) { tries.push([b.slice(0, -2), 'v'], [b.slice(0, -1), 'v']); if (/(.)\1ed$/.test(b)) tries.push([b.slice(0, -3), 'v']); }
    if (/ing$/.test(b)) { tries.push([b.slice(0, -3), 'v'], [b.slice(0, -3) + 'e', 'v']); if (/(.)\1ing$/.test(b)) tries.push([b.slice(0, -4), 'v']); }
    if (/(er|est)$/.test(b)) { const base = b.replace(/(er|est)$/, ''); tries.push([base, 'a'], [base + 'e', 'a']); if (/(.)\1$/.test(base)) tries.push([base.slice(0, -1), 'a']); }
    if (/ly$/.test(b)) tries.push([b.slice(0, -2), 'd']);
    for (const [lemma, allowed] of tries) {
      const rec = L[lemma] || extraLex.get(lemma);
      if (!rec) continue;
      if (allowed === 'd') return ['adv'];
      const tags = rec.split('').filter((c) => allowed.includes(c)).map((c) => CODE[c]);
      if (tags.length) return [...new Set(tags)];
    }
    return null;
  }
  // Последняя надежда — по окончанию
  function guessTags(b, word) {
    if (/^[0-9]/.test(word)) return ['num'];
    if (/[a-z]-[a-z]/i.test(word)) return ['adj', 'noun'];          // two-bedroom, well-known — чаще определение
    if (/ly$/.test(b)) return ['adv', 'adj'];
    if (/ing$/.test(b)) return ['verb', 'noun'];
    if (/ed$/.test(b)) return ['verb', 'adj'];
    if (/(tion|sion|ment|ness|ity|ance|ence|ship|hood|ism|ist|ery|age|dom)s?$/.test(b)) return ['noun'];
    if (/(ous|ful|ive|able|ible|ical|less|ish|ent|ant)$/.test(b)) return ['adj'];
    if (/(ize|ise|ify|ate)$/.test(b)) return ['verb', 'noun'];
    return ['noun'];
  }

  // Предложение (массив parts) → части речи. Ручная разметка (p.pos) не меняется и служит контекстом соседям;
  // p.posHint — варианты от карточки «Слов» для её целевого слова; p.posSoft — тег словаря LEX файла контента:
  // он не знает контекста (have — всегда aux), поэтому только первый кандидат, а решают правила.
  function tagParts(parts) {
    const n = parts.length;
    const raw = (i) => String(parts[i] && parts[i].word || '');
    const tok = parts.map((p, i) => {
      const word = raw(i);
      const b = bareOf(word);
      const prevRaw = i > 0 ? raw(i - 1) : '';
      const start = i === 0 || /[.!?:;»"”)]$|[—–-]$/.test(prevRaw) || /^[«"“(]/.test(word);
      const t = { word, b, start, i, cap: /^[«"“(]?[A-Z]/.test(word), fixed: p && p.pos ? p.pos : null, cand: null, ctx: null, tag: null,
        poss: false };
      // Притяжательное: Maggie's bag, the kids' room (но не let's, it's, that's — это сокращения)
      t.poss = /[a-z]('s|s')$/i.test(word.replace(/[^A-Za-z']+$/, '')) && !CLOSED[b] && !CTX[b] && !/^(let|it|he|she|that|what|who|where|how|there|here|when)'s$/.test(b);
      if (!b || !/[a-z]/.test(b) || /^[^A-Za-z0-9]*[0-9]/.test(word)) { t.fixed = t.fixed || (/[0-9]/.test(word) ? 'num' : null); t.skip = !t.fixed; return t; }   // 21A, 10:00, 5th
      if (t.fixed) return t;
      if (p.posHint) {
        t.cand = String(p.posHint).split(',').filter(Boolean);
        if (t.cand.length === 1) t.fixed = t.cand[0];
        return t;
      }
      if (CTX[b]) { t.ctx = CTX[b]; return t; }
      if (CLOSED[b]) { t.cand = [CLOSED[b]]; return t; }
      if (/'s$/.test(b) && CLOSED[b.slice(0, -2)] === 'pron') { t.poss = false; t.beContr = true; t.cand = ['pron']; return t; }   // Everything's, nobody's (но today's — притяжательное)
      const soft = p.posSoft || null;
      const done = (cand) => { t.lex0 = cand[0]; t.cand = soft ? [soft, ...cand.filter((x) => x !== soft)] : cand; return t; };
      const lx = lexTags(b) || (t.poss ? lexTags(b.replace(/'s$|'$/, '')) : null);
      if (!lx && /in'$/i.test(word.replace(/[^A-Za-z']+$/, ''))) return done(['verb']);   // comin', doin'
      // Имена, названия, дни и месяцы посреди предложения: Maggie, Brooklyn, Monday; English/Japanese — прил. или сущ.
      if (t.cap && !t.start) return done(lx && lx.includes('adj') ? ['noun', 'adj'] : ['noun']);
      const cand = lx || (t.cap ? ['noun'] : guessTags(b, word));
      return done(/:$/.test(word) && cand.includes('noun') ? ['noun'] : cand);   // Email: …, Note: …
    });
    const sentEnd = new Array(n).fill('');
    // Знак конца предложения для каждого слова; на границе (в т. ч. после тире) — сброс: Do it now — are you ready?
    for (let i = n - 1, end = ''; i >= 0; i--) { const m = raw(i).match(/[.!?]+["”»)]*$/); if (m) end = m[0][0]; sentEnd[i] = end; if (tok[i].start) end = ''; }

    const tagOf = (t) => t && (t.fixed || t.tag);
    const has = (t, tag) => !!t && (tagOf(t) ? tagOf(t) === tag : !!(t.cand && t.cand.includes(tag)) || (t.ctx === 'BE' && tag === 'verb'));
    const only = (t, tag) => !!t && (tagOf(t) ? tagOf(t) === tag : !!(t.cand && t.cand.length === 1 && t.cand[0] === tag));
    const at = (k) => (k >= 0 && k < n && !tok[k].skip ? tok[k] : null);
    const next = (i) => { for (let k = i + 1; k < n; k++) if (!tok[k].skip) return tok[k]; return null; };
    const prev = (i) => { for (let k = i - 1; k >= 0; k--) if (!tok[k].skip) return tok[k]; return null; };
    const prevA = (i) => { for (let k = i - 1; k >= 0; k--) { const t = tok[k]; if (t.skip) continue; if (ADVERB_SKIP.has(t.b) && !t.start) continue; return t; } return null; };
    const nextA = (i) => { for (let k = i + 1; k < n; k++) { const t = tok[k]; if (t.skip) continue; if (ADVERB_SKIP.has(t.b)) continue; return t; } return null; };
    const isDetLike = (t) => !!t && (only(t, 'art') || only(t, 'det') || POSS.has(t.b) || t.ctx === 'DEM' || t.ctx === 'THAT' || t.ctx === 'NO');
    const startsNP = (t) => !!t && !t.start && (isDetLike(t) || ((has(t, 'noun') || has(t, 'adj') || has(t, 'num')) && !only(t, 'verb') && !t.ctx && !has(t, 'aux') && !has(t, 'modal') && !SUBJ.has(t.b)));
    // -ing — окончание, только если до него есть гласная: going, doing; ring, bring, thing — начальная форма
    const isIng = (b) => /ing$/.test(b) && /[aeiouy]/.test(b.slice(0, -3));
    const isBase = (t) => !!t && !/(ed|[^s]s)$/.test(t.b) && !isIng(t.b);
    const isParticiple = (t) => !!t && (IRREG_PP.has(t.b) || (/ed$/.test(t.b) && has(t, 'verb')));
    // Имя персонажа или место (нет в словаре, с заглавной) — даже в начале предложения: Jess drinks…, Maggie works…
    const isName = (t) => !!t && t.cap && tagOf(t) === 'noun' && !t.poss && (!t.start || !lexTags(t.b));
    const subjectBefore = (t) => !!t && (SUBJ.has(t.b) || isName(t));
    // Связка перед словом: is/feel/look… или вопрос с инверсией (Are you okay? Is Maggie ready?)
    const afterBe = (pa) => !!pa && (BE_FORMS.has(pa.b) || pa.beContr || LINKING.has(pa.b) ||
      ((SUBJ.has(pa.b) || /^(that|this|everything|everyone)$/.test(pa.b) || (pa.cap && !pa.start)) && (() => {
        const q = prev(pa.i);
        if (!q || !BE_FORMS.has(q.b)) return false;
        const qq = prev(q.i);
        return q.start || (!!qq && /^(what|where|when|why|how|who|which)$/.test(qq.b));
      })()));
    const passive = (pa) => !!pa && BE_FORMS.has(pa.b) && tagOf(pa) === 'aux';
    // Dinner's ready, Tony's late, Mom's cooking, Dad's in the kitchen: 's после существительного — is, а не притяжательное
    tok.forEach((t) => {
      if (!t.poss || !/'s$/.test(t.b)) return;
      const nx = next(t.i);
      if (!nx || nx.start) return;
      const nn = next(nx.i);
      const c0 = nx.fixed || (nx.cand && nx.cand[0]);
      const closed = CLOSED[nx.b];
      const be = nx.ctx === 'BE' || nx.ctx === 'BEEN' || closed === 'art' || (closed === 'prep' && nx.b !== 'of') ||
        (closed === 'adv' && !['up', 'out', 'down', 'off', 'back', 'away', 'more', 'most', 'less', 'least'].includes(nx.b)) ||
        (/ing$/.test(nx.b) && has(nx, 'verb')) ||
        ((c0 === 'adj' || c0 === 'adv') && (!nn || nn.start || /[.!?,;:]$/.test(nx.word) || !has(nn, 'noun')));
      if (be) { t.poss = false; t.beContr = true; }
    });
    const isBeLike = (x) => !!x && (BE_FORMS.has(x.b) || !!x.beContr);
    // Причастие-прилагательное после be (I'm tired, it's closed); used — только в be used to (иначе страдательный)
    const adjPP = (x) => !!x && ADJ_PP.has(x.b) && !(x.b === 'used' && (!next(x.i) || next(x.i).b !== 'to'));
    // Подлежащее после вспомогательного: What does this word mean? Can your brother swim? Does Maggie like jazz?
    const NPISH = new Set(['noun', 'pron', 'det', 'art', 'adj', 'num']);
    function auxSubjBefore(i) {
      let seen = 0;
      for (let k = i - 1; k >= 0; k--) {
        const q = tok[k];
        if (q.skip) continue;
        if (ADVERB_SKIP.has(q.b) && seen === 0) continue;
        const tg = tagOf(q);
        if (seen > 0 && (q.ctx === 'DO' || tg === 'modal' || (tg === 'aux' && !BE_FORMS.has(q.b)))) return tg === 'aux' || tg === 'modal';
        if (!NPISH.has(tg) || OBJ.has(q.b) || q.start && seen > 0) return false;
        seen++;
        if (q.start) return false;
      }
      return false;
    }
    // Начало именной группы перед словом: let [the dog] sleep, heard [the phone] ring
    function beforeNP(i) {
      for (let k = i - 1; k >= 0; k--) {
        const q = tok[k];
        if (q.skip) continue;
        if (!NPISH.has(tagOf(q)) || q.start || (k < i - 1 && /[,;:]$/.test(q.word))) return NPISH.has(tagOf(q)) && !/[,;:]$/.test(q.word) ? null : q;
      }
      return null;
    }
    // Существительное перед словом — подлежащее (не дополнение глагола и не после предлога): Kids love it; не run test cases
    const subjectNP = (i) => { const q = beforeNP(i); return !q || !(tagOf(q) === 'verb' || tagOf(q) === 'prep' || q.ctx === 'TO' || tagOf(q) === 'part'); };
    const CAUSATIVE = new Set(['let', 'make', 'help', 'have', 'watch', 'see', 'hear', 'feel', 'notice', 'bid']);
    const lemmaOf = (b) => {
      if (IRREG_PAST[b]) return [IRREG_PAST[b]];
      const out = [b];
      if (/ies$/.test(b)) out.push(b.slice(0, -3) + 'y');
      if (/ied$/.test(b)) out.push(b.slice(0, -3) + 'y');
      if (/es$/.test(b)) out.push(b.slice(0, -2));
      if (/s$/.test(b)) out.push(b.slice(0, -1));
      if (/ed$/.test(b)) out.push(b.slice(0, -2), b.slice(0, -1), b.slice(0, -3));
      if (/ing$/.test(b)) out.push(b.slice(0, -3), b.slice(0, -3) + 'e', b.slice(0, -4));
      if (/in$/.test(b)) out.push(b.slice(0, -2), b.slice(0, -2) + 'e', b.slice(0, -3));   // goin', comin'
      return out;
    };
    const phrasalPair = (verb, prt) => lemmaOf(verb).some((l) => PHRASAL.has(l) && PHRASAL.get(l).has(prt));
    // Частица фразового глагола — наречие: went on talking, Come in!, take over the project, turn the light on.
    // on/in перед существительным остаются предлогами (go on a trip, come in the house) — как в словарях курса.
    const ADVERBIAL = new Set(['off', 'over', 'around', 'across', 'through', 'down', 'up', 'out', 'back', 'away', 'along',
      'ahead', 'apart', 'aside', 'behind', 'forward', 'together', 'round']);
    // Переходные с on/in: частица и перед дополнением (turn on the light, try on the jacket, fill in the form)
    const SEP_ON_IN = new Set(['turn on', 'put on', 'try on', 'switch on', 'hand in', 'let in', 'fill in', 'take in', 'pass on',
      'plug in', 'bring in', 'turn in', 'throw on', 'pull on', 'check in']);
    function particle(t, i) {
      if (!PARTICLES.has(t.b) || t.start) return false;
      const p = prev(i), nx = next(i);
      if (!p) return false;
      // В примерах карточки фразового глагола его частица — всегда наречие (stand by my friends, come across a photo)
      if (focus && t.b === focus.prt) {
        for (let k = p.i, steps = 0; k >= 0 && steps < 4; k--) {
          const q = tok[k];
          if (q.skip) continue;
          steps++;
          if (lemmaOf(q.b).includes(focus.verb)) return true;
          if (q.start || /[,;:.!?]$/.test(q.word) && k !== p.i) break;
        }
      }
      if (!PHRASAL.size) return false;
      const endish = !nx || nx.start || /[.!?,;:—–]$/.test(t.word) || (/ing$/.test(nx.b) && has(nx, 'verb')) ||
        only(nx, 'adv') || only(nx, 'conj') || nx.ctx === 'TO' || PARTICLES.has(nx.b) && !isDetLike(next(nx.i));
      if (tagOf(p) === 'verb' && phrasalPair(p.b, t.b)) return endish || ADVERBIAL.has(t.b) || lemmaOf(p.b).some((l) => SEP_ON_IN.has(l + ' ' + t.b));
      if (!endish) return false;
      for (let k = p.i, steps = 0; k >= 0 && steps < 4; k--) {   // глагол + дополнение + частица: turn the light on
        const q = tok[k];
        if (q.skip) continue;
        steps++;
        if (tagOf(q) === 'verb') return steps > 1 && phrasalPair(q.b, t.b);
        if (!(OBJ.has(q.b) || isDetLike(q) || ['noun', 'adj', 'num'].includes(tagOf(q)) || (tagOf(q) === 'pron' && /^(it|this|that|them|him|her|me|us|you|everything|something|anything)$/.test(q.b))) || q.start) return false;
      }
      return false;
    }

    for (let i = 0; i < n; i++) {
      const t = tok[i];
      if (t.skip || t.fixed) continue;
      if (particle(t, i)) { t.tag = 'adv'; continue; }
      const pv = prev(i), nv = next(i);
      // What time…? Which way? — определитель, как this/that перед существительным
      if (/^(what|which)$/.test(t.b) && nv && !nv.start && !nv.ctx && !SUBJ.has(nv.b) && (nv.lex0 === 'noun' || only(nv, 'noun'))) { t.tag = 'det'; continue; }
      // go/stay/get home — наречие
      if (t.b === 'home' && pv && !t.start && (MOTION.has(pv.b) || isBeLike(pv) || /^(stay|stays|stayed|staying|head|heads|headed|heading|work|works|worked|working)$/.test(pv.b))) { t.tag = 'adv'; continue; }
      // Sorry, … / Welcome, … в начале реплики — междометие (наречие по условности курса)
      if (t.start && /,$/.test(t.word) && /^(sorry|welcome)$/.test(t.b)) { t.tag = 'adv'; continue; }
      if (t.b === 'used' && next(i) && next(i).b === 'to') {   // used to + глагол — привычка в прошлом; be/get used to — прил.
        const pa = prevA(i);
        t.tag = pa && (isBeLike(pa) || /^(get|gets|got|getting|gotten)$/.test(pa.b)) ? 'adj' : 'verb';
        continue;
      }
      if (t.ctx) { t.tag = resolveCtx(t, i); continue; }
      if (adjPP(t) && isBeLike(prevA(i)) && tagOf(prevA(i)) !== 'aux') { t.tag = 'adj'; continue; }   // was canceled, I'm fed up
      t.tag = t.cand.length === 1 ? t.cand[0] : chooseOpen(t, i);
    }
    return tok.map((t) => (t.skip ? null : tagOf(t)));

    function resolveCtx(t, i) {
      const p = prev(i), nx = next(i), pa = prevA(i), na = nextA(i);
      switch (t.ctx) {
        case 'BE': {    // страдательный залог (is spoken, was built) — aux; иначе — глагол-связка (author)
          const nb = na && next(na.i);
          if (na && nb && nb.b === 'by' && (isParticiple(na) || IRREG_PP.has(na.b)) && !adjPP(na)) return 'aux';   // was torn apart by
          return na && isParticiple(na) && !adjPP(na) && !(has(na, 'adj') && !/ed$/.test(na.b) && !IRREG_PP.has(na.b)) ? 'aux' : 'verb';
        }
        case 'BEEN':    // have you been vaccinated — страдательный (aux), have been working / been late — глагол
          return na && isParticiple(na) && !adjPP(na) && !(has(na, 'adj') && !/ed$/.test(na.b) && !IRREG_PP.has(na.b)) ? 'aux' : 'verb';
        case 'DO':
          if (!nx) return 'verb';
          if (nx.b === 'not' || nx.b === "n't") return 'aux';
          // После модального, to, let's, вспомогательного и подлежащего — смысловой глагол: let's do this, can do it,
          // Did you do it?, I do my homework
          if (pa && !t.start && (["let's", 'to', 'gonna', 'wanna', 'gotta', 'please'].includes(pa.b) || /'ll$/.test(pa.b) ||
            tagOf(pa) === 'modal' || (tagOf(pa) === 'aux' && !BE_FORMS.has(pa.b)))) return 'verb';
          if (pa && /^(who|what|where|when|why|how|which)$/.test(pa.b) && nx && SUBJ.has(nx.b)) return 'aux';   // Who do you look up to?
          if (pa && !t.start && subjectBefore(pa)) return na && has(na, 'verb') && isBase(na) && !has(na, 'noun') && !OBJ.has(na.b) && !SUBJ.has(na.b) ? 'aux' : 'verb';
          if (t.start && sentEnd[i] === '?') return 'aux';                                             // Does 1987 ring a bell?
          // Повелительное: Do your homework! Just do it. (Do you…/Did they… без «?» — всё равно вопрос)
          if (t.b === 'do' && (t.start || (pa && ADVERB_SKIP.has(pa.b) && pa.start)) && !(SUBJ.has(nx.b) && nx.b !== 'it') && !(nx.cap && !nx.start)) return 'verb';
          if (SUBJ.has(nx.b) || (nx.cap && !nx.start && !has(nx, 'verb'))) return 'aux';            // Do you…? Does Maggie…?
          if (isDetLike(nx)) return subjectBefore(pa) ? 'verb' : 'aux';                              // I do my homework / Does your…?
          if (na && has(na, 'verb') && isBase(na) && !has(na, 'noun') && subjectBefore(pa)) return 'aux'; // I do like it
          return 'verb';
        case 'HAVE': {
          if (nx && (nx.b === 'to' || nx.b === 'got' || nx.b === 'gotten')) return 'verb';                // have to, have got
          if (na && (isParticiple(na) || na.b === 'been') && na.b !== 'had') return 'aux';                 // have finished
          const nn = nx && SUBJ.has(nx.b) ? nextA(nx.i) : null;                                           // Have you seen…?
          return nn && (isParticiple(nn) || nn.b === 'been') ? 'aux' : 'verb';
        }
        case 'TO': {
          const v = na && (((has(na, 'verb') && isBase(na)) || ['be', 'do', 'have', 'get', 'go'].includes(na.b) || CLOSED[na.b] === 'verb'));
          if (!v || isDetLike(na) || SUBJ.has(na.b) || OBJ.has(na.b)) return 'prep';
          if (p && MOTION.has(p.b) && has(na, 'noun')) return 'prep';                                    // go to work, listen to music
          return 'part';
        }
        case 'THAT': {
          // that + подлежащее + сказуемое: союз (She pointed out that we were late), после существительного —
          // относительное местоимение (any diet that you abandon), кроме the idea / the fact that…
          const n2 = nx && next(nx.i);
          if (nx && SUBJ.has(nx.b) && !OBJ.has(nx.b) && n2 && (n2.ctx === 'BE' || n2.ctx === 'HAVE' || n2.ctx === 'DO' ||
            has(n2, 'verb') || has(n2, 'modal') || has(n2, 'aux') || isBeLike(n2))) {
            return p && tagOf(p) === 'noun' && !THAT_NOUN.has(p.b) ? 'pron' : 'conj';
          }
          if (p && THINK.has(p.b) && nx && (SUBJ.has(nx.b) || isDetLike(nx) || (nx.cap && !nx.start))) return 'conj';
          // существительное + that + сказуемое — относительное: a team that reviews your work, the skills that matter most
          if (p && tagOf(p) === 'noun' && nx && has(nx, 'verb') && !SUBJ.has(nx.b) && !isDetLike(nx) && (/[^s]s$|ed$/.test(nx.b) ||
            (() => { const n2 = next(nx.i); return !n2 || n2.start || POSS.has(n2.b) || OBJ.has(n2.b) || only(n2, 'art') || only(n2, 'adv'); })())) return 'pron';
          // …что + подлежащее + сказуемое: It's clear that we…, The point is that Maggie…
          const nn = nx && next(nx.i);
          if (p && (tagOf(p) === 'verb' || tagOf(p) === 'adj' || tagOf(p) === 'noun') && nx && SUBJ.has(nx.b) && !OBJ.has(nx.b) && nn && (nn.ctx === 'BE' || nn.ctx === 'HAVE' || nn.ctx === 'DO' || has(nn, 'verb') || has(nn, 'modal') || has(nn, 'aux'))) return 'conj';
          if (nx && startsNP(nx) && !isDetLike(nx) && !SUBJ.has(nx.b)) return 'det';
          return 'pron';
        }
        case 'OTHER':
          return nx && !nx.start && (has(nx, 'noun') || has(nx, 'adj')) && !nx.ctx ? 'adj' : 'pron';
        case 'DEM':
          return nx && startsNP(nx) && !isDetLike(nx) && !SUBJ.has(nx.b) && !nx.start ? 'det' : 'pron';
        case 'NO':
          return nx && !nx.start && (has(nx, 'noun') || has(nx, 'adj') || has(nx, 'num') || nx.ctx === 'ONE') && !only(nx, 'adv') ? 'det' : 'adv';
        case 'MUCH':
          return nx && has(nx, 'noun') && !only(nx, 'adv') && !only(nx, 'adj') && !/er$/.test(nx.b) ? 'det' : 'adv';
        case 'LIKE': {
          if (/,$/.test(t.word) && (t.start || (p && /,$/.test(p.word)))) return 'adv';   // It was, like, two hours — слово-паразит
          if (auxSubjBefore(i)) return 'verb';                                              // Does your brother like jazz?
          if (!pa) return 'verb';
          if (BE_FORMS.has(pa.b) || LIKE_PREP.has(pa.b)) return 'prep';
          if (SUBJ.has(pa.b) || pa.b === 'to' || ['would', "'d", 'do', 'does', 'did', "don't", "doesn't", "didn't", 'really'].includes(pa.b) || tagOf(pa) === 'modal' || tagOf(pa) === 'aux' || (pa.cap && !pa.start && tagOf(pa) === 'noun') || /s$/.test(pa.b) && tagOf(pa) === 'noun') return 'verb';
          return tagOf(pa) === 'verb' || tagOf(pa) === 'noun' || tagOf(pa) === 'adj' ? 'prep' : 'verb';
        }
        case 'SINCE':
          return nx && (SUBJ.has(nx.b) || (nx.cap && !nx.start)) ? 'conj' : 'prep';
        case 'AS':
          return nx && (only(nx, 'art') || POSS.has(nx.b) || only(nx, 'noun')) ? 'prep' : 'conj';
        case 'WHEN': {
          const n2 = nx && next(nx.i);   // when are you off?, when can you pay — вопросительное наречие
          if (nx && (nx.ctx === 'BE' || nx.ctx === 'DO' || nx.ctx === 'HAVE' || only(nx, 'modal') || only(nx, 'aux')) &&
            (sentEnd[i] === '?' || (n2 && SUBJ.has(n2.b)))) return 'adv';
          return t.start ? (sentEnd[i] === '?' ? 'adv' : 'conj') : (p && /^(know|ask|asked|tell|wonder|sure|idea|remember|decide)$/.test(p.b) ? 'adv' : 'conj');
        }
        case 'OVER':
          return nx && !nx.start && (isDetLike(nx) || only(nx, 'noun') || OBJ.has(nx.b) || has(nx, 'num')) ? 'prep' : 'adv';
        case 'ONE':
          return p && (['this', 'that', 'the', 'which', 'every', 'each', 'another', 'no', 'any', 'other', 'last', 'next', 'only'].includes(p.b) || tagOf(p) === 'adj') ? 'pron' : 'num';
        case 'AFTER': {
          if (!nx || /[.!?,]$/.test(t.word)) return 'adv';
          const nn = next(nx.i);
          return (SUBJ.has(nx.b) || (nx.cap && !nx.start && tagOf(nx) !== 'verb')) && nn && (has(nn, 'verb') || nn.ctx) ? 'conj' : 'prep';
        }
        case 'RIGHT':
          if (nx && /^(now|here|there|away|back|after|before|next|behind|in|on|at|into|outside|over)$/.test(nx.b)) return 'adv';
          if (p && (BE_FORMS.has(p.b) || p.b === "you're" || p.b === "that's")) return 'adj';
          if (p && isDetLike(p)) return nx && has(nx, 'noun') ? 'adj' : 'noun';
          if (p && tagOf(p) === 'verb') return 'adv';
          return 'adj';
        case 'PAST':
          return nx && (isDetLike(nx) || has(nx, 'num') || /^\d/.test(nx.word)) ? 'prep' : (p && (isDetLike(p) || tagOf(p) === 'adj') ? 'noun' : 'adj');
        case 'OKAY':
          return pa && (afterBe(pa) || pa.b === "you're" || pa.b === "i'm") ? 'adj' : 'adv';
        case 'MAY':
          return t.cap && !t.start ? 'noun' : 'modal';
        case 'ORD':     // wait a second, for a second — сущ.; the second day, a second brain — числ.; see the room first — нар.
          if (t.b === 'first' && !(p && (isDetLike(p) || POSS.has(p.b))) && (!nx || nx.start || /[.!?,;:]$/.test(t.word))) return 'adv';
          return p && (p.b === 'a' || p.b === 'one') && (!nx || nx.start || /[.!?,;:]$/.test(t.word) || has(nx, 'prep') || has(nx, 'conj')) ? 'noun' : 'num';
        case 'WELL':
          return pa && (BE_FORMS.has(pa.b) || LINKING.has(pa.b)) && !/,$/.test(t.word) ? 'adj' : 'adv';
        default:
          return 'noun';
      }
    }

    function chooseOpen(t, i) {
      const c = t.cand;
      const pick = (...order) => order.find((x) => c.includes(x)) || c[0];
      // Предыдущее предложение не в счёт: It's late — go to bed!
      const p = t.start ? null : prev(i), nx = next(i), pa = t.start ? null : prevA(i);
      const pt = tagOf(p);
      const ing = isIng(t.b), ed = /(ed|en)$/.test(t.b) || IRREG_PP.has(t.b);
      // Следующее слово — сказуемое с дополнением (The bright light hurt my eyes): тогда текущее — подлежащее, не определение
      const verbish = (x) => has(x, 'verb') && (/ed$/.test(x.b) || IRREG_PAST[x.b] || IRREG_PP.has(x.b)) && !/[,;:.!?]$/.test(x.word) &&
        (() => { const nn = next(x.i); return !!nn && !nn.start && (POSS.has(nn.b) || OBJ.has(nn.b) || only(nn, 'art')); })();
      // one / past в конце группы — существительное: the black one, a dark past
      const headish = (x) => (x.ctx === 'ONE' || x.ctx === 'PAST') && (() => { const nn = next(x.i); return !nn || nn.start || /[.!?,;:]$/.test(x.word) || has(nn, 'prep') || has(nn, 'adv') || has(nn, 'conj'); })();
      const nounNext = nx && !nx.start && ((has(nx, 'noun') && !nx.ctx && !has(nx, 'aux') && !has(nx, 'modal') && !SUBJ.has(nx.b) && !isDetLike(nx) && !verbish(nx)) || headish(nx));
      // Начало предложения после наречий: Always warm up…, Just call me
      const lead = !t.start && (() => {
        for (let k = i - 1; k >= 0; k--) {
          const q = tok[k];
          if (q.skip) continue;
          if (!(ADVERB_SKIP.has(q.b) || q.b === 'please')) return false;
          if (q.start) return true;
        }
        return false;
      })();
      const adjNext = nx && !nx.start && has(nx, 'adj') && !nx.ctx && (() => { const nn = next(nx.i); return !!nn && has(nn, 'noun'); })();
      // 0. Перфект и страдательный залог: had finished, will have cooked, was built, is spoken
      if (pa && c.includes('verb') && (ed || ing) && ((tagOf(pa) === 'aux' && !BE_FORMS.has(pa.b) && /^(have|has|had|'ve|'d|i've|you've|we've|they've)$/.test(pa.b)) || passive(pa))) return 'verb';
      // 0b. Вопрос: вспомогательный + подлежащее + глагол (Does 1987 ring a bell? What does this word mean?)
      if (p && (pt === 'noun' || pt === 'num' || pt === 'pron') && c.includes('verb') && isBase(t) && auxSubjBefore(i)) return 'verb';
      // 1. После артикля, определителя, притяжательного, числа, прилагательного: прил. перед существительным, иначе сущ.
      // (кроме «плавающих» all/both после подлежащего: Let's all chip in, We both know)
      const floating = p && /^(all|both|each)$/.test(p.b) && (() => { const q = prev(p.i); return !!q && !p.start && (SUBJ.has(q.b) || VERB_AFTER.has(q.b) || /'(ll|d|re|ve|s)$/.test(q.b)); })();
      if (p && !floating && (pt === 'art' || pt === 'det' || pt === 'num' || POSS.has(p.b) || (p.poss && !ing) || (pt === 'adj' && !BE_FORMS.has(p.b)))) {
        if (c.includes('adj') && (nounNext || adjNext)) return 'adj';
        return pick('noun', 'adj', 'verb');
      }
      // 2. После связки (is, feel, look, Are you…) и слов степени (so, very): прилагательное; -ing после be — глагол
      if (pa && (afterBe(pa) || (DEGREE.has(p && p.b) && (c.includes('adj') || c.includes('adv'))))) {
        if (DEGREE.has(p && p.b) && c.includes('adv')) {
          let before = prev(p.i);
          while (before && tagOf(before) === 'adv' && PARTICLES.has(before.b)) before = prev(before.i);   // stand up too fast
          if (before && tagOf(before) === 'verb' && !BE_FORMS.has(before.b) && !LINKING.has(before.b)) return 'adv';   // drives too fast
        }
        if (ing) return ING_ADJ.has(t.b) && c.includes('adj') ? 'adj' : (c.includes('verb') ? 'verb' : pick('adj', 'noun'));
        if (c.includes('adj') && !(t.b === 'used' && !adjPP(t) && c.includes('verb')) || adjPP(t)) return 'adj';   // I'm fed up; are to be used — глаг.
        if (ed && c.includes('verb')) return 'verb';
        if (nounNext) return pick('adj', 'noun');
        return pick('noun', 'adv', 'verb');
      }
      // 3. Прилагательное перед существительным (Cold weather, last year, a really good idea)
      if (c.includes('adj') && (nounNext || adjNext) && !(pa && (SUBJ.has(pa.b) || tagOf(pa) === 'modal' || tagOf(pa) === 'part'))) return 'adj';
      // 4. После подлежащего, модального, do/don't, to, let's — глагол (-ing после имени — не сказуемое)
      if (pa && c.includes('verb') && (VERB_AFTER.has(pa.b) || /'(ll|d|ve)$/.test(pa.b) || tagOf(pa) === 'modal' || tagOf(pa) === 'part'
        || (/^(that|who|which)$/.test(pa.b) && tagOf(pa) === 'pron' && p === pa && !t.start)
        || (tagOf(pa) === 'aux' && !BE_FORMS.has(pa.b)) || (isName(pa) && !ing && !(p && p.poss)))) {
        if (OBJ.has(pa.b)) return pick('noun', 'adj', 'verb');
        if (pa.b === 'please' && !pa.start) return pick('noun', 'verb');
        return 'verb';
      }
      if (pa && tagOf(pa) === 'aux' && c.includes('verb') && (ing || ed)) return 'verb';             // is working, has finished
      // 4b. Вопрос: вспомогательный + подлежащее + глагол (What does this word mean? Can your brother swim?)
      if (c.includes('verb') && isBase(t) && auxSubjBefore(i)) return 'verb';
      // 5. После предлога — существительное (герундий -ing — глагол)
      if (p && pt === 'prep') {
        if (ing && c.includes('verb')) return 'verb';
        if (c.includes('adj') && nounNext) return 'adj';
        return pick('noun', 'adj', 'verb');
      }
      // 6. Начало предложения: повелительное наклонение (Call me, Wait here) — только начальная форма и если дальше
      //    не сказуемое (Water boils…, Work is…)
      if (t.start || (lead && isBase(t))) {
        // Предложение из одного слова: Ready? Stop! Thanks. Rent. — прил., иначе первое прочтение словаря
        if (/[.!?]["”»)]*$/.test(t.word) && t.start) return /[^s]s$/.test(t.b) || t.lex0 === 'noun' || /^[A-Z]{2,}\W*$/.test(t.word) ? pick('adj', 'noun', 'verb', 'adv') : pick('adj', 'verb', 'noun', 'adv');   // RENT. — заголовок
        if (nx && nx.b === 'to' && t.b === 'time') return 'noun';                                      // Time to go
        if (/,$/.test(t.word) && t.start && c.includes('adj')) return 'adj';                            // Perfect, thank you.
        if (nx && /^\d/.test(nx.word) && c.includes('noun') && (!next(nx.i) || /[,.;:!?]$/.test(nx.word))) return 'noun';   // Seat 21A, …
        const predicateNext = nx && (nx.ctx === 'BE' || nx.ctx === 'HAVE' || has(nx, 'aux') || has(nx, 'modal') || (only(nx, 'verb') && !/ing$/.test(nx.b))
          || (has(nx, 'verb') && (/[^s]s$/.test(nx.b) || /ed$/.test(nx.b)) && !isDetLike(nx)));
        const ofNext = nx && nx.b === 'of';                                                             // Rent of 850 EUR…
        if (c.includes('verb') && isBase(t) && !predicateNext && !ofNext) return 'verb';
        if (ing && c.includes('verb') && !predicateNext && !ofNext) return 'verb';                      // Speaking of…, Paying by card?
        return pick('noun', 'adj', 'verb');
      }
      // 7. После существительного-подлежащего: Kids love it, Maggie works, the bus stops here
      // Каузатив: had my hair cut, let the dog sleep, heard the phone ring
      if (p && pt === 'noun' && c.includes('verb') && !p.poss && !subjectNP(i)) {
        const q = beforeNP(i);
        if (q && lemmaOf(q.b).some((l) => CAUSATIVE.has(l)) && (isBase(t) || IRREG_PP.has(t.b) || /ed$/.test(t.b))) return 'verb';
      }
      if (p && pt === 'noun' && c.includes('verb') && !p.poss && subjectNP(i)) {
        const singularPrev = !/s$/.test(p.b) || /ss$/.test(p.b);
        const agree = (p.cap && !p.start) || (singularPrev ? /(s|ed)$/.test(t.b) || IRREG_PP.has(t.b) : !/[^s]s$/.test(t.b));
        if (agree && !ing && (!nx || /[.!?,]$/.test(t.word) || isDetLike(nx) || OBJ.has(nx.b) || has(nx, 'prep') || has(nx, 'adv') || has(nx, 'num') || (isName(p) && startsNP(nx)))) return 'verb';
      }
      // 7b. Второе существительное группы в её конце: a wool vest, the group chat at night (но let the dog sleep — глагол)
      if (p && pt === 'noun' && !p.poss && c.includes('noun') && !c.includes('adj') && !ing && (!nx || nx.start || /[.!?,;:]$/.test(t.word) || (has(nx, 'prep') && !has(nx, 'noun')) || only(nx, 'conj'))) {
        const q = beforeNP(i);
        if (q && c.includes('verb') && isBase(t) && lemmaOf(q.b).some((l) => CAUSATIVE.has(l))) return 'verb';
        if (!/^(i|you|we|they|he|she|it)$/.test(p.b)) return 'noun';
      }
      // 8. Перед артиклем, притяжательным, объектным местоимением — глагол (open the door, tell me)
      if (c.includes('verb') && nx && (only(nx, 'art') || POSS.has(nx.b) || OBJ.has(nx.b)) && pt !== 'prep' && isBase(t)) return 'verb';
      // 8a. Однородные сказуемые: falls down and laughs, wakes up and goes — глагол той же формы, что до союза
      if (p && pt === 'conj' && c.includes('verb') && /^(and|or|but|then)$/.test(p.b)) {
        for (let k = p.i - 1; k >= 0; k--) {
          const q = tok[k];
          if (q.skip) continue;
          if (/[.!?;:]$/.test(q.word)) break;
          if (tagOf(q) === 'verb') { if (/[^s]s$/.test(q.b) === /[^s]s$/.test(t.b) && /ed$/.test(q.b) === /ed$/.test(t.b)) return 'verb'; break; }
          if (tagOf(q) === 'noun' || tagOf(q) === 'adj' || tagOf(q) === 'pron' && !OBJ.has(q.b)) break;
        }
      }
      // 8a'. Однородные существительные: into photography and travel
      if (p && pt === 'conj' && /^(and|or)$/.test(p.b) && c.includes('noun') && (!nx || nx.start || /[.!?,;:]$/.test(t.word) || (has(nx, 'prep') && !has(nx, 'noun')))) {
        const q = prev(p.i);
        if (q && tagOf(q) === 'noun' && !isName(q)) return 'noun';
      }
      // 8a''. После частицы фразового глагола: checked in late, came back early — наречие
      if (p && pt === 'adv' && PARTICLES.has(p.b) && c.includes('adv') && !nounNext) return 'adv';
      // 8b'. Признак дополнения: knock 'em dead, drive me crazy, keep it clean — прилагательное
      if (p && (OBJ.has(p.b) || /^('em|it|ya)$/.test(p.b)) && c.includes('adj') && t.lex0 === 'adj' && !/ly$/.test(t.b) &&
        !/^(late|early|fast|hard|later|earlier|right|straight|long|high|low|deep|wide|close|free)$/.test(t.b)) return 'adj';
      // 8b. Последнее слово после сказуемого с дополнением: I missed your call earlier, she sings well — наречие
      if (c.includes('adv') && c.includes('adj') && /[.!?]["”»)]*$/.test(t.word) && p && pt !== 'art' && pt !== 'det' && !afterBe(pa)) return 'adv';
      // 8c. Перед наречием: Let's do this again sometime soon, come early tomorrow — наречие
      if (c.includes('adv') && nx && !nx.start && only(nx, 'adv') && !afterBe(pa) && !nounNext && !/[,;:]$/.test(t.word)) return 'adv';
      // 8d. go/come + глагол: Go knock 'em dead, come see us — глагол
      if (p && /^(go|come)$/.test(p.b) && tagOf(p) === 'verb' && c.includes('verb') && isBase(t) && nx && !nx.start &&
        (OBJ.has(nx.b) || /^('em|it|you|us)$/.test(nx.b) || isDetLike(nx))) return 'verb';
      // 9. После глагола: герундий (enjoy reading) — глагол, дополнение — существительное, иначе наречие
      if (p && pt === 'verb') {
        if (ing && c.includes('verb')) return 'verb';
        if (c.includes('noun')) return 'noun';
        if (c.includes('adv')) return 'adv';
      }
      if (ing && c.includes('verb') && t.lex0 === 'verb') return 'verb';   // причастие без подсказки контекста
      return c[0];
    }
  }

  /* ---------- Разметка parts ---------- */
  // Индексы «голого» слова → индексы в токене (у токена бывают кавычки, скобки, дефис, точка)
  function bareMap(word) {
    const map = [];
    const low = String(word).toLowerCase();
    let started = false;
    for (let k = 0; k < low.length; k++) {
      const ch = low[k];
      if (/[a-zà-öø-ÿ]/.test(ch) || (ch === "'" && started)) { map.push(k); started = true; }
    }
    // Хвостовые апострофы в «голое» слово не входят
    while (map.length && low[map[map.length - 1]] === "'") map.pop();
    return map;
  }
  const stats = { words: 0, aligned: 0, failed: 0, silent: 0, stress: 0, stressFrom: { ipa: 0, lexUs: 0, index: 0 }, pos: 0, softChanged: 0,
    guessed: 0, failedWords: new Map(), guessedWords: new Map() };

  // У ручной IPA лексиконов content_*.js нет знака ударения — номер ударного слога там отдельным полем (p.stress).
  // Тогда ударный слог — из словаря lex_us.js, если у слова те же согласные и столько же слогов (today /tədeɪ/ →
  // /təˈdeɪ/, advice /ədvaɪs/ → /ædˈvaɪs/), иначе — по номеру слога. Немые буквы — по IPA, которую видит ученик.
  const lexUs = () => (typeof window !== 'undefined' && window.LEX_US) || (typeof globalThis !== 'undefined' && globalThis.LEX_US) || {};
  function withStress(w, a, p) {
    if (a.nuclei.some((x) => x.s)) { stats.stressFrom.ipa++; return a; }
    const vowelAt = a.ph.map((t, j) => (t.v ? j : -1)).filter((j) => j >= 0);   // номер слога → звук
    const mark = (k) => {
      const nu = a.nuclei.find((x) => x.k === vowelAt[k]);
      return nu ? { ...a, nuclei: a.nuclei.map((x) => ({ ...x, s: x === nu })) } : null;
    };
    const rec = lexUs()[w];
    const alt = rec ? String(rec).split('|')[0] : '';
    if (alt.includes('ˈ')) {
      const A = phonemes(alt);
      const cons = (x) => x.filter((t) => !t.v && !t.opt).map((t) => t.p).join('');
      const vs = A.filter((t) => t.v);
      if (cons(A) === cons(a.ph) && vs.length === vowelAt.length) {
        const b = mark(vs.findIndex((t) => t.s));
        if (b) { stats.stressFrom.lexUs++; return b; }
      }
    }
    const k = Number(p.stress);
    if (p.stress !== undefined && p.stress !== null && Number.isInteger(k) && k >= 0 && k < vowelAt.length) {
      const b = mark(k);
      if (b) { stats.stressFrom.index++; return b; }
    }
    return a;
  }

  function markWord(p) {
    if (!p || !p.word || !p.ipa) return;
    const map = bareMap(p.word);
    if (!map.length) return;
    // café → cafe: буквы с диакритикой выравниваются как обычные (длина слова не меняется)
    const full = map.map((k) => String(p.word)[k].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')[0] || "'").join('');
    // Сокращения: IPA бывает у основы (where's → where), тогда хвост после апострофа не размечаем
    const cands = [full];
    const ap = full.indexOf("'");
    if (ap > 0) cands.push(full.slice(0, ap));
    let best = null, bestLen = 0;
    for (const w of cands) {
      const a = align(w, p.ipa);
      if (a && (!best || a.cost < best.cost - 0.01)) { best = a; bestLen = w.length; }
    }
    stats.words++;
    if (!best) {
      stats.failed++;
      stats.failedWords.set(full + ' ' + p.ipa, (stats.failedWords.get(full + ' ' + p.ipa) || 0) + 1);
      return;
    }
    stats.aligned++;
    const w = full.slice(0, bestLen);
    best = withStress(w, best, p);
    const sil = silentOf(w, best).map((k) => map[k]);
    p.silent = sil;
    if (sil.length) stats.silent++;
    const span = stressSpanOf(w, best);
    if (span) {
      p.stressAt = [map[span[0]], map[span[1] - 1] + 1];
      stats.stress++;
    }
  }

  // soft — часть речи в parts из словаря LEX (одна на слово, без контекста): решают правила, она — первый кандидат.
  // Без soft (грамматика: автор размечал каждое слово в предложении) ручная часть речи не меняется.
  const marked = new WeakSet();   // у чтений payload.parts и lines[].parts — одни и те же объекты: размечать один раз
  function markParts(parts, soft) {
    if (!Array.isArray(parts) || !parts.length) return parts;
    if (parts.every((p) => p && typeof p === 'object' && marked.has(p))) return parts;
    parts.forEach((p) => { if (p && typeof p === 'object') marked.add(p); });
    if (soft) parts.forEach((p) => { if (p && p.pos) { p.posSoft = p.pos; delete p.pos; } });
    const tags = tagParts(parts);
    parts.forEach((p, i) => {
      if (!p) return;
      if (!p.pos && tags[i]) { p.pos = tags[i]; stats.pos++; if (p.posSoft && p.posSoft !== tags[i]) stats.softChanged++; }
      if (!p.pos && p.posSoft) p.pos = p.posSoft;
      delete p.posSoft;
      if (p.posHint !== undefined) delete p.posHint;
      markWord(p);
    });
    return parts;
  }

  // Часть речи целевых слов карточек «Слов» — словарь для их словоформ в других примерах;
  // у фразовых глаголов (take over, put off) — пары «глагол + частица»
  function learnWordCards(cards) {
    (cards || []).forEach((c) => {
      const pl = c && c.payload;
      const fr = pl && pl.front ? String(pl.front).toLowerCase().trim() : '';
      const two = fr.match(/^([a-z]+)\s+(?:(?:sb|sth|someone|something|smb|smth)\s+)?([a-z]+)\b/);
      if (two && PARTICLES.has(two[2])) {
        if (!PHRASAL.has(two[1])) PHRASAL.set(two[1], new Set());
        PHRASAL.get(two[1]).add(two[2]);
      }
      if (!pl || !pl.front || !pl.pos) return;
      const f = String(pl.front).toLowerCase();
      if (/\s/.test(f)) return;
      const codes = String(pl.pos).split(/,\s*/).map((x) => RU_POS[x.trim()]).filter(Boolean)
        .map((t) => Object.keys(CODE).find((k) => CODE[k] === t)).join('');
      if (codes && !lex()[f] && !extraLex.has(f)) extraLex.set(f, codes);
    });
  }

  let focus = null;   // фразовый глагол карточки, которую размечаем: { verb, prt }
  function walk(o, depth, soft) {
    if (!o || typeof o !== 'object' || depth > 6) return;
    if (Array.isArray(o.parts)) markParts(o.parts, soft);
    for (const v of Object.values(o)) if (v && typeof v === 'object') walk(v, depth + 1, soft);
  }
  // hard — списки с пословной ручной разметкой (грамматика): их часть речи не трогаем
  function markAll(lists, { hard = [] } = {}) {
    const t0 = Date.now();
    const keep = new Set(hard);
    new Set(lists).forEach((arr) => (arr || []).forEach((card) => {
      const fr = card && card.payload && card.payload.front ? String(card.payload.front).toLowerCase() : '';
      const m = fr.match(/^([a-z]+)\s+([a-z]+)$/);
      focus = m && PARTICLES.has(m[2]) && /phrasal|^pv_/.test(String(card.type || card.id || '')) ? { verb: m[1], prt: m[2] } : null;
      walk(card && card.payload, 0, !keep.has(arr));
      focus = null;
    }));
    stats.ms = Date.now() - t0;
    return stats;
  }

  // Весь курс — один раз и только перед записью карточек в IndexedDB: app.js и gamify.js зовут markCourse(), когда
  // версия раздела изменилась. При обычном запуске карточки читаются из базы уже размеченными, и ~0,5 с работы
  // (замер на сервере; на телефоне — в разы дольше) при каждом открытии приложения не тратятся.
  let courseMarked = false;
  function markCourse() {
    if (courseMarked || typeof window === 'undefined') return stats;
    courseMarked = true;
    try { return markCourseLists(); } finally { memo.clear(); }   // кэш выравниваний (~8 МБ) после сидирования не нужен
  }
  function markCourseLists() {
    const lists = [];
    /* global GRAMMAR_CARDS */
    const grammar = typeof GRAMMAR_CARDS !== 'undefined' ? GRAMMAR_CARDS : null;
    if (grammar) lists.push(grammar);
    ['WORD_CARDS', 'PHRASAL_CARDS', 'COLLOCATION_CARDS', 'IDIOM_CARDS', 'CONVERSATION_CARDS', 'SLANG_CARDS',
      'MINIMAL_PAIR_CARDS', 'READING_CARDS', 'PRO_READINGS']
      .forEach((n) => { if (Array.isArray(window[n])) lists.push(window[n]); });
    if (window.PRO_CONTENT) Object.values(window.PRO_CONTENT).forEach((a) => { if (Array.isArray(a)) lists.push(a); });
    window.WORD_MARKS_STATS = markAll(lists, { hard: grammar ? [grammar] : [] });
    return stats;
  }

  return { phonemes, align, silentOf, stressSpanOf, tagParts, markParts, markWord, markAll, markCourse, learnWordCards, bareOf,
    stats, RU_POS, CLOSED, CTX_WORDS: Object.keys(CTX) };
})();

// Экспорт для юнит-тестов (vitest): в браузере ничего не меняет.
if (typeof globalThis !== 'undefined') globalThis.WordMarks = WordMarks;

// При загрузке — только словари из карточек (части речи «Слов», пары фразовых глаголов): они нужны и лестнице
// (ladder_ui.js размечает фразы на лету). Сама разметка курса — WordMarks.markCourse() перед сидированием.
(() => {
  if (typeof window === 'undefined') return;
  WordMarks.learnWordCards(window.WORD_CARDS);
  WordMarks.learnWordCards(window.PHRASAL_CARDS);
  if (window.PRO_CONTENT) Object.values(window.PRO_CONTENT).forEach((a) => WordMarks.learnWordCards(a));   // фразовые PRO
})();
