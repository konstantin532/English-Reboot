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
   Загружается ПОСЛЕ lex_us.js и pos_us.js, ДО app.js (до сидирования в IndexedDB).
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
          const c = cur + (ph[j].p === 'ə' ? 2 : 3.5);
          if (c < dp[i][j + 1]) { dp[i][j + 1] = c; from[i][j + 1] = [i, j, 'epenthesis']; }
        }
        for (let k = 1; k <= MAXG && i + k <= L; k++) {
          const alts = G.get(w.slice(i, i + k));
          if (!alts) continue;
          for (const a of alts) {
            const m = a.ph.length;
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
  const ONSETS = new Set(['pl', 'pr', 'pj', 'bl', 'br', 'bj', 'tr', 'tw', 'dr', 'dw', 'kl', 'kr', 'kw', 'kj', 'ɡl', 'ɡr', 'ɡw',
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
    okay: 'OKAY', ok: 'OKAY', may: 'MAY', well: 'WELL', other: 'OTHER' });

  const SUBJ = new Set(['i', 'you', 'we', 'they', 'he', 'she', 'it', 'who', 'people', 'everyone', 'everybody', 'nobody',
    'someone', 'somebody', 'kids', 'ya']);
  const POSS = new Set(['my', 'your', 'his', 'her', 'its', 'our', 'their', 'whose']);
  const OBJ = new Set(['me', 'him', 'her', 'us', 'them']);
  const BE_FORMS = new Set(['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', "i'm", "you're", "we're", "they're",
    "he's", "she's", "it's", "that's", "isn't", "aren't", "wasn't", "weren't", "what's", "who's", "there's", "here's"]);
  const LINKING = new Set(['feel', 'feels', 'felt', 'feeling', 'look', 'looks', 'looked', 'seem', 'seems', 'seemed',
    'get', 'gets', 'got', 'getting', 'become', 'becomes', 'became', 'stay', 'stays', 'stayed', 'sound', 'sounds', 'sounded',
    'smell', 'smells', 'taste', 'tastes', 'keep', 'keeps', 'turn', 'turned', 'grow', 'grew', 'gets', 'make', 'makes', 'made']);
  const DEGREE = new Set(['so', 'too', 'very', 'really', 'pretty', 'quite', 'more', 'most', 'less', 'least', 'super', 'kinda',
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
  const IRREG_PP = new Set(['done', 'gone', 'seen', 'eaten', 'taken', 'given', 'written', 'spoken', 'broken', 'chosen',
    'driven', 'forgotten', 'gotten', 'known', 'shown', 'thrown', 'grown', 'flown', 'drawn', 'worn', 'born', 'fallen',
    'stolen', 'woken', 'hidden', 'ridden', 'risen', 'begun', 'drunk', 'sung', 'swum', 'become', 'made', 'had',
    'heard', 'left', 'lost', 'met', 'paid', 'put', 'read', 'said', 'sent', 'sold', 'told', 'thought', 'bought', 'brought',
    'caught', 'taught', 'found', 'kept', 'slept', 'felt', 'built', 'spent', 'understood', 'stood', 'won', 'set', 'cut', 'hit',
    'hurt', 'let', 'shut', 'quit', 'cost', 'held', 'led', 'fed', 'fled', 'meant', 'dealt', 'come', 'run', 'got']);
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
  // p.posHint — варианты от карточки «Слов» для её целевого слова.
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
      if (!b || !/[a-z]/.test(b)) { t.fixed = t.fixed || (/[0-9]/.test(word) ? 'num' : null); t.skip = !t.fixed; return t; }
      if (t.fixed) return t;
      if (p.posHint) {
        t.cand = String(p.posHint).split(',').filter(Boolean);
        if (t.cand.length === 1) t.fixed = t.cand[0];
        return t;
      }
      if (CTX[b]) { t.ctx = CTX[b]; return t; }
      if (CLOSED[b]) { t.cand = [CLOSED[b]]; return t; }
      const lx = lexTags(b) || (t.poss ? lexTags(b.replace(/'s$|'$/, '')) : null);
      if (!lx && /in'$/i.test(word.replace(/[^A-Za-z']+$/, ''))) { t.cand = ['verb']; return t; }   // comin', doin'
      // Имена, названия, дни и месяцы посреди предложения: Maggie, Brooklyn, Monday; English/Japanese — прил. или сущ.
      if (t.cap && !t.start) { t.cand = lx && lx.includes('adj') ? ['noun', 'adj'] : ['noun']; return t; }
      t.cand = lx || (t.cap ? ['noun'] : guessTags(b, word));
      if (/:$/.test(word) && t.cand.includes('noun')) t.cand = ['noun'];   // Email: …, Note: …
      return t;
    });
    const sentEnd = new Array(n).fill('');
    for (let i = n - 1, end = ''; i >= 0; i--) { const m = raw(i).match(/[.!?]+["”»)]*$/); if (m) end = m[0][0]; sentEnd[i] = end; if (i > 0 && tok[i].start && i > 0) end = sentEnd[i]; }

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
    const isBase = (t) => !!t && !/(ing|ed|[^s]s)$/.test(t.b);
    const isParticiple = (t) => !!t && (IRREG_PP.has(t.b) || (/ed$/.test(t.b) && has(t, 'verb')));
    // Имя персонажа или место (нет в словаре, с заглавной) — даже в начале предложения: Jess drinks…, Maggie works…
    const isName = (t) => !!t && t.cap && tagOf(t) === 'noun' && !t.poss && (!t.start || !lexTags(t.b));
    const subjectBefore = (t) => !!t && (SUBJ.has(t.b) || isName(t));
    // Связка перед словом: is/feel/look… или вопрос с инверсией (Are you okay? Is Maggie ready?)
    const afterBe = (pa) => !!pa && (BE_FORMS.has(pa.b) || LINKING.has(pa.b) ||
      ((SUBJ.has(pa.b) || (pa.cap && !pa.start)) && (() => {
        const q = prev(pa.i);
        if (!q || !BE_FORMS.has(q.b)) return false;
        const qq = prev(q.i);
        return q.start || (!!qq && /^(what|where|when|why|how|who|which)$/.test(qq.b));
      })()));
    const passive = (pa) => !!pa && BE_FORMS.has(pa.b) && tagOf(pa) === 'aux';

    for (let i = 0; i < n; i++) {
      const t = tok[i];
      if (t.skip || t.fixed) continue;
      if (t.ctx) { t.tag = resolveCtx(t, i); continue; }
      t.tag = t.cand.length === 1 ? t.cand[0] : chooseOpen(t, i);
    }
    return tok.map((t) => (t.skip ? null : tagOf(t)));

    function resolveCtx(t, i) {
      const p = prev(i), nx = next(i), pa = prevA(i), na = nextA(i);
      switch (t.ctx) {
        case 'BE':      // страдательный залог (is spoken, was built) — aux; иначе — глагол-связка (author)
          return na && isParticiple(na) && !ADJ_PP.has(na.b) && !(has(na, 'adj') && !/ed$/.test(na.b) && !IRREG_PP.has(na.b)) ? 'aux' : 'verb';
        case 'BEEN':
          return 'verb';
        case 'DO':
          if (!nx) return 'verb';
          if (nx.b === 'not' || nx.b === "n't") return 'aux';
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
          if (p && THINK.has(p.b) && nx && (SUBJ.has(nx.b) || isDetLike(nx) || (nx.cap && !nx.start))) return 'conj';
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
          return nx && !nx.start && (has(nx, 'noun') || has(nx, 'adj') || has(nx, 'num')) && !only(nx, 'adv') ? 'det' : 'adv';
        case 'MUCH':
          return nx && has(nx, 'noun') && !only(nx, 'adv') && !only(nx, 'adj') && !/er$/.test(nx.b) ? 'det' : 'adv';
        case 'LIKE': {
          if (!pa) return 'verb';
          if (BE_FORMS.has(pa.b) || LIKE_PREP.has(pa.b)) return 'prep';
          if (SUBJ.has(pa.b) || pa.b === 'to' || ['would', "'d", 'do', 'does', 'did', "don't", "doesn't", "didn't", 'really'].includes(pa.b) || tagOf(pa) === 'modal' || tagOf(pa) === 'aux' || (pa.cap && !pa.start && tagOf(pa) === 'noun') || /s$/.test(pa.b) && tagOf(pa) === 'noun') return 'verb';
          return tagOf(pa) === 'verb' || tagOf(pa) === 'noun' || tagOf(pa) === 'adj' ? 'prep' : 'verb';
        }
        case 'SINCE':
          return nx && (SUBJ.has(nx.b) || (nx.cap && !nx.start)) ? 'conj' : 'prep';
        case 'AS':
          return nx && (only(nx, 'art') || POSS.has(nx.b) || only(nx, 'noun')) ? 'prep' : 'conj';
        case 'WHEN':
          return t.start ? (sentEnd[i] === '?' ? 'adv' : 'conj') : (p && /^(know|ask|asked|tell|wonder|sure|idea|remember|decide)$/.test(p.b) ? 'adv' : 'conj');
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
          return nx && (isDetLike(nx) || has(nx, 'num') || /^\d/.test(nx.word)) ? 'prep' : (p && isDetLike(p) ? 'noun' : 'adj');
        case 'OKAY':
          return pa && (afterBe(pa) || pa.b === "you're" || pa.b === "i'm") ? 'adj' : 'adv';
        case 'MAY':
          return t.cap && !t.start ? 'noun' : 'modal';
        case 'WELL':
          return pa && (BE_FORMS.has(pa.b) || LINKING.has(pa.b)) && !/,$/.test(t.word) ? 'adj' : 'adv';
        default:
          return 'noun';
      }
    }

    function chooseOpen(t, i) {
      const c = t.cand;
      const pick = (...order) => order.find((x) => c.includes(x)) || c[0];
      const p = prev(i), nx = next(i), pa = prevA(i);
      const pt = tagOf(p);
      const ing = /ing$/.test(t.b), ed = /(ed|en)$/.test(t.b) || IRREG_PP.has(t.b);
      const nounNext = nx && !nx.start && has(nx, 'noun') && !nx.ctx && !has(nx, 'aux') && !has(nx, 'modal') && !SUBJ.has(nx.b) && !isDetLike(nx);
      const adjNext = nx && !nx.start && has(nx, 'adj') && !nx.ctx && (() => { const nn = next(nx.i); return !!nn && has(nn, 'noun'); })();
      // 0. Перфект и страдательный залог: had finished, will have cooked, was built, is spoken
      if (pa && c.includes('verb') && (ed || ing) && ((tagOf(pa) === 'aux' && !BE_FORMS.has(pa.b) && /^(have|has|had|'ve|'d|i've|you've|we've|they've)$/.test(pa.b)) || passive(pa))) return 'verb';
      // 1. После артикля, определителя, притяжательного, числа, прилагательного: прил. перед существительным, иначе сущ.
      if (p && (pt === 'art' || pt === 'det' || pt === 'num' || POSS.has(p.b) || (p.poss && !ing) || (pt === 'adj' && !BE_FORMS.has(p.b)))) {
        if (c.includes('adj') && (nounNext || adjNext)) return 'adj';
        return pick('noun', 'adj', 'verb');
      }
      // 2. После связки (is, feel, look, Are you…) и слов степени (so, very): прилагательное; -ing после be — глагол
      if (pa && (afterBe(pa) || DEGREE.has(p && p.b))) {
        if (DEGREE.has(p && p.b) && c.includes('adv')) {
          const before = prev(p.i);
          if (before && tagOf(before) === 'verb' && !BE_FORMS.has(before.b) && !LINKING.has(before.b)) return 'adv';   // drives too fast
        }
        if (ing) return ING_ADJ.has(t.b) && c.includes('adj') ? 'adj' : (c.includes('verb') ? 'verb' : pick('adj', 'noun'));
        if (c.includes('adj')) return 'adj';
        if (ed && c.includes('verb')) return 'verb';
        if (nounNext) return pick('adj', 'noun');
        return pick('noun', 'adv', 'verb');
      }
      // 3. Прилагательное перед существительным (Cold weather, last year, a really good idea)
      if (c.includes('adj') && (nounNext || adjNext) && !(pa && (SUBJ.has(pa.b) || tagOf(pa) === 'modal' || tagOf(pa) === 'part'))) return 'adj';
      // 4. После подлежащего, модального, do/don't, to, let's — глагол (-ing после имени — не сказуемое)
      if (pa && c.includes('verb') && (VERB_AFTER.has(pa.b) || tagOf(pa) === 'modal' || tagOf(pa) === 'part'
        || (tagOf(pa) === 'aux' && !BE_FORMS.has(pa.b)) || (isName(pa) && !ing && !(p && p.poss)))) {
        if (OBJ.has(pa.b)) return pick('noun', 'adj', 'verb');
        if (pa.b === 'please' && !pa.start) return pick('noun', 'verb');
        return 'verb';
      }
      if (pa && tagOf(pa) === 'aux' && c.includes('verb') && (ing || ed)) return 'verb';             // is working, has finished
      // 5. После предлога — существительное (герундий -ing — глагол)
      if (p && pt === 'prep') {
        if (ing && c.includes('verb')) return 'verb';
        if (c.includes('adj') && nounNext) return 'adj';
        return pick('noun', 'adj', 'verb');
      }
      // 6. Начало предложения: повелительное наклонение (Call me, Wait here) — только начальная форма и если дальше
      //    не сказуемое (Water boils…, Work is…)
      if (t.start) {
        const predicateNext = nx && (nx.ctx === 'BE' || nx.ctx === 'HAVE' || has(nx, 'aux') || has(nx, 'modal') || only(nx, 'verb')
          || (has(nx, 'verb') && (/[^s]s$/.test(nx.b) || /ed$/.test(nx.b)) && !isDetLike(nx)));
        if (c.includes('verb') && isBase(t) && !predicateNext) return 'verb';
        return pick('noun', 'adj', 'verb');
      }
      // 7. После существительного-подлежащего: Kids love it, Maggie works, the bus stops here
      if (p && pt === 'noun' && c.includes('verb') && !p.poss) {
        const singularPrev = !/s$/.test(p.b) || /ss$/.test(p.b);
        const agree = (p.cap && !p.start) || (singularPrev ? /(s|ed)$/.test(t.b) || IRREG_PP.has(t.b) : !/[^s]s$/.test(t.b));
        if (agree && !ing && (!nx || /[.!?,]$/.test(t.word) || isDetLike(nx) || OBJ.has(nx.b) || has(nx, 'prep') || has(nx, 'adv') || has(nx, 'num') || (isName(p) && startsNP(nx)))) return 'verb';
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
      // 9. После глагола: герундий (enjoy reading) — глагол, дополнение — существительное, иначе наречие
      if (p && pt === 'verb') {
        if (ing && c.includes('verb')) return 'verb';
        if (c.includes('noun')) return 'noun';
        if (c.includes('adv')) return 'adv';
      }
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
      if (/[a-z]/.test(ch) || (ch === "'" && started)) { map.push(k); started = true; }
    }
    // Хвостовые апострофы в «голое» слово не входят
    while (map.length && low[map[map.length - 1]] === "'") map.pop();
    return map;
  }
  const stats = { words: 0, aligned: 0, failed: 0, silent: 0, stress: 0, pos: 0, guessed: 0, failedWords: new Map(), guessedWords: new Map() };

  function markWord(p) {
    if (!p || !p.word || !p.ipa) return;
    const map = bareMap(p.word);
    if (!map.length) return;
    const full = map.map((k) => String(p.word)[k]).join('').toLowerCase();
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
    const sil = silentOf(w, best).map((k) => map[k]);
    p.silent = sil;
    if (sil.length) stats.silent++;
    const span = stressSpanOf(w, best);
    if (span) {
      p.stressAt = [map[span[0]], map[span[1] - 1] + 1];
      stats.stress++;
    }
  }

  function markParts(parts) {
    if (!Array.isArray(parts) || !parts.length) return parts;
    const tags = tagParts(parts);
    parts.forEach((p, i) => {
      if (!p) return;
      if (!p.pos && tags[i]) { p.pos = tags[i]; stats.pos++; }
      if (p.posHint !== undefined) delete p.posHint;
      markWord(p);
    });
    return parts;
  }

  // Часть речи целевых слов карточек «Слов» — словарь для их словоформ в других примерах
  function learnWordCards(cards) {
    (cards || []).forEach((c) => {
      const pl = c && c.payload;
      if (!pl || !pl.front || !pl.pos) return;
      const f = String(pl.front).toLowerCase();
      if (/\s/.test(f)) return;
      const codes = String(pl.pos).split(/,\s*/).map((x) => RU_POS[x.trim()]).filter(Boolean)
        .map((t) => Object.keys(CODE).find((k) => CODE[k] === t)).join('');
      if (codes && !lex()[f] && !extraLex.has(f)) extraLex.set(f, codes);
    });
  }

  function walk(o, depth) {
    if (!o || typeof o !== 'object' || depth > 6) return;
    if (Array.isArray(o.parts)) markParts(o.parts);
    for (const v of Object.values(o)) if (v && typeof v === 'object') walk(v, depth + 1);
  }
  function markAll(lists) {
    const t0 = Date.now();
    new Set(lists).forEach((arr) => (arr || []).forEach((card) => walk(card && card.payload, 0)));
    stats.ms = Date.now() - t0;
    return stats;
  }

  return { phonemes, align, silentOf, stressSpanOf, tagParts, markParts, markWord, markAll, learnWordCards, bareOf, stats, RU_POS, CLOSED, CTX_WORDS: Object.keys(CTX) };
})();

// Экспорт для юнит-тестов (vitest): в браузере ничего не меняет.
if (typeof globalThis !== 'undefined') globalThis.WordMarks = WordMarks;

// Разметка всего курса при загрузке — те же списки, что у lex_us.js
(() => {
  if (typeof window === 'undefined') return;
  const lists = [];
  /* global GRAMMAR_CARDS */
  if (typeof GRAMMAR_CARDS !== 'undefined') lists.push(GRAMMAR_CARDS);
  ['WORD_CARDS', 'PHRASAL_CARDS', 'COLLOCATION_CARDS', 'IDIOM_CARDS', 'CONVERSATION_CARDS', 'SLANG_CARDS',
    'MINIMAL_PAIR_CARDS', 'READING_CARDS', 'PRO_READINGS']
    .forEach((n) => { if (Array.isArray(window[n])) lists.push(window[n]); });
  if (window.PRO_CONTENT) Object.values(window.PRO_CONTENT).forEach((a) => { if (Array.isArray(a)) lists.push(a); });
  WordMarks.learnWordCards(window.WORD_CARDS);
  WordMarks.learnWordCards(window.PHRASAL_CARDS);
  window.WORD_MARKS_STATS = WordMarks.markAll(lists);
})();
