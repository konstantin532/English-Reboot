/* ==========================================================================
   English Reboot — Этап 1b: «Ловушки русского акцента»
   Файл: traps_us.js — каталог ловушек (объяснение от русского + минимальные пары)
   и разметка фразы: findTrapsInPhrase(text, lookup) находит, какие ловушки
   встречаются в словах фразы. Чистые функции, без DOM — тестируются в node.

   Где искать ловушку — по IPA или по написанию:
   • IPA надёжен для [æ], [θ/ð], [w], звонких на конце, ударения;
   • в данных встречается британский IPA (water /ˈwɔːtə/, work /wɜːk/ без r),
     поэтому американское r и flap t ищем ПО НАПИСАНИЮ (американец произносит
     каждое написанное r; flap — t/tt между гласными перед безударным слогом).
   Минимальные пары написаны вручную; у каждой ловушки ≥10 пар.
   drill: 'choose' — «какое слово прозвучало?»; 'same' — пары звучат почти
   одинаково (это и есть урок); 'contrast' — один звук в разных позициях.
   ========================================================================== */

const ACCENT_TRAPS = [
  {
    id: 'ae', title: '[æ] — это не «э»', short: 'bad ≠ bed',
    ru: 'В русском нет звука [æ], и мы заменяем его на «э» — тогда bad (плохой) звучит как bed (кровать). Открой рот широко, как для «а», и скажи «э»: получится нужный звук посередине.',
    drill: 'choose',
    pairs: [['bad', 'bed'], ['man', 'men'], ['sad', 'said'], ['pan', 'pen'], ['bat', 'bet'], ['had', 'head'],
      ['dad', 'dead'], ['sand', 'send'], ['band', 'bend'], ['land', 'lend'], ['mat', 'met'], ['tan', 'ten']],
  },
  {
    id: 'aspiration', title: 'Придыхание [pʰ tʰ kʰ]', short: 'pen ≠ «пэн»',
    ru: 'Русские «п, т, к» звучат без выдоха — американцу они слышатся как b, d, g, и pin превращается в bin. В начале ударного слога выдохни после звука, как будто задуваешь свечу.',
    drill: 'choose',
    pairs: [['pin', 'bin'], ['pen', 'Ben'], ['pig', 'big'], ['pie', 'buy'], ['tie', 'die'], ['time', 'dime'],
      ['ten', 'den'], ['town', 'down'], ['cold', 'gold'], ['coat', 'goat'], ['cap', 'gap'], ['came', 'game']],
  },
  {
    id: 'th', title: 'th [θ ð] — не «с» и не «з»', short: 'think ≠ sink',
    ru: 'В русском нет межзубных звуков, и th превращается в «с», «ф» или «з» — think (думать) звучит как sink (раковина). Кончик языка — между зубами, и дуй через щель.',
    drill: 'choose',
    pairs: [['think', 'sink'], ['thick', 'sick'], ['three', 'free'], ['thank', 'tank'], ['thin', 'tin'], ['path', 'pass'],
      ['mouth', 'mouse'], ['they', 'day'], ['then', 'den'], ['though', 'dough'], ['breathe', 'breeze'], ['worth', 'worse']],
  },
  {
    id: 'r', title: 'Американское r', short: 'right ≠ «райт» с рычанием',
    ru: 'Русское «р» — дрожащий кончик языка. Американское r не дрожит: язык не касается нёба, а слегка загибается назад. И r произносится везде, где написано: car, work, better.',
    drill: 'choose',
    pairs: [['right', 'light'], ['read', 'lead'], ['rock', 'lock'], ['rice', 'lice'], ['pray', 'play'], ['grass', 'glass'],
      ['fry', 'fly'], ['crowd', 'cloud'], ['wrong', 'long'], ['arrive', 'alive'], ['correct', 'collect'], ['berry', 'belly']],
  },
  {
    id: 'w', title: 'w — не «в»', short: 'west ≠ vest',
    ru: 'Русское «в» делается зубами и губой, а w — одними губами: вытяни их трубочкой, как для «у», и быстро раскрой. Иначе west (запад) превращается в vest (жилет).',
    drill: 'choose',
    pairs: [['west', 'vest'], ['wine', 'vine'], ['wet', 'vet'], ['while', 'vile'], ['worse', 'verse'], ['wail', 'veil'],
      ['wow', 'vow'], ['wiper', 'viper'], ['went', 'vent'], ['wary', 'vary'], ['wheel', 'veal'], ['wane', 'vain']],
  },
  {
    id: 'final-voiced', title: 'Звонкие на конце не оглушаем', short: 'bag ≠ «бэк»',
    ru: 'По-русски «дуб» звучит как «дуп» — мы оглушаем конец слова. В английском так нельзя: bag (сумка) станет back (спина). Держи звонкость до конца, а гласную перед звонкой чуть растяни.',
    drill: 'choose',
    pairs: [['bag', 'back'], ['bad', 'bat'], ['dog', 'dock'], ['prize', 'price'], ['eyes', 'ice'], ['leave', 'leaf'],
      ['rib', 'rip'], ['bed', 'bet'], ['cab', 'cap'], ['peas', 'peace'], ['have', 'half'], ['said', 'set']],
  },
  {
    id: 'reduction', title: 'Редукция: gonna, wanna', short: 'want to → «уона»',
    ru: 'В живой речи американцы сливают служебные слова: going to → gonna, want to → wanna. Если говорить каждое слово отдельно и чётко, как по-русски, речь звучит как из учебника — и такую слитную речь потом трудно понимать на слух.',
    drill: 'same',
    pairs: [['going to', 'gonna'], ['want to', 'wanna'], ['got to', 'gotta'], ['kind of', 'kinda'], ['let me', 'lemme'],
      ['give me', 'gimme'], ["don't know", 'dunno'], ['sort of', 'sorta'], ['out of', 'outta'], ['a lot of', 'a lotta'],
      ['what do you', 'whaddaya'], ['did you', 'didja']],
  },
  {
    id: 'flap', title: 'Flap t: water → «уо́дэр»', short: 'water ≠ «уотер»',
    ru: 'Между гласными, перед безударным слогом, американское t превращается в быстрый мягкий удар языком — почти русское «д» или «р». Поэтому writer и rider звучат почти одинаково, а «уотер» с чётким «т» выдаёт акцент.',
    drill: 'same',
    pairs: [['writer', 'rider'], ['latter', 'ladder'], ['metal', 'medal'], ['atom', 'Adam'], ['petal', 'pedal'], ['bitter', 'bidder'],
      ['putting', 'pudding'], ['matter', 'madder'], ['kitty', 'kiddie'], ['seated', 'seeded'], ['betting', 'bedding'], ['coating', 'coding']],
  },
  {
    id: 'stress', title: 'Ударение в словах', short: 'hoTEL, не HOtel',
    ru: 'Английское ударение не подчиняется русским привычкам, а безударные гласные почти исчезают («ко́мфтабл», а не «комфо́ртабл»). У некоторых слов ударение меняет смысл: a REcord — запись, to reCORD — записывать.',
    drill: 'choose',
    pairs: [['a record', 'to record'], ['a present', 'to present'], ['an object', 'to object'], ['a contract', 'to contract'],
      ['a permit', 'to permit'], ['the conduct', 'to conduct'], ['a desert', 'to desert'], ['an insult', 'to insult'],
      ['a rebel', 'to rebel'], ['the progress', 'to progress'], ['a conflict', 'to conflict'], ['an export', 'to export']],
  },
  {
    id: 'dark-l', title: 'Тёмное l на конце', short: 'milk → «миуьк»',
    ru: 'В начале слова английское l светлое, а в конце слога и перед согласной — «тёмное»: язык оттягивается назад, звук похож на «уль». Русское мягкое «ль» в feel или milk звучит иностранно.',
    drill: 'contrast',
    pairs: [['lead', 'deal'], ['lip', 'pill'], ['late', 'tale'], ['lap', 'pal'], ['loop', 'pool'], ['led', 'dell'],
      ['light', 'tile'], ['lake', 'kale'], ['lot', 'toll'], ['leak', 'keel'], ['lame', 'male'], ['lime', 'mile']],
  },
];

const AccentTraps = (() => {
  'use strict';

  const byId = new Map(ACCENT_TRAPS.map((t) => [t.id, t]));

  // Служебные слова звучат безударно: в них не ищем придыхание, оглушение и ударение
  const FUNCTION_WORDS = new Set(('a an the to of in on at for is are am was were be been do does did has have had ' +
    'and or but as if than that this these those it its he she we they you i me my your his her our their him them us ' +
    "it's he's she's that's what's there's let's i'm you're we're they're i've i'll i'd can could will would shall should " +
    'not no so up by with from into out about').split(/\s+/));

  // Слова, где русскоговорящие чаще всего ставят ударение не туда (ударный слог — заглавными в подсказке)
  const STRESS_WORDS = {
    comfortable: 'COMfortable', vegetable: 'VEGetable', interesting: 'INteresting', hotel: 'hoTEL', event: 'eVENT',
    develop: 'deVELop', determine: 'deTERmine', recipe: 'REcipe', percent: 'perCENT', idea: 'iDEa', guitar: 'guiTAR',
    career: 'caREER', technology: 'techNOLogy', photographer: 'phoTOGrapher', chocolate: 'CHOClate', category: 'CATegory',
    character: 'CHARacter', advertisement: 'ADvertisement', canal: 'caNAL', hotels: 'hoTELS', events: 'eVENTS',
  };

  const REDUCED_WORDS = new Set(['gonna', 'wanna', 'gotta', 'kinda', 'lemme', 'gimme', 'dunno', 'sorta', 'outta', 'lotta', 'whaddaya', 'didja', "y'all", 'ya']);
  const REDUCED_PAIRS = [['going', 'to'], ['want', 'to'], ['wants', 'to'], ['got', 'to'], ['have', 'to'], ['has', 'to'],
    ['kind', 'of'], ['sort', 'of'], ['out', 'of'], ['lot', 'of'], ['let', 'me'], ['give', 'me'], ["don't", 'know'], ['did', 'you'], ['would', 'you'], ['could', 'you']];

  const VOWEL = 'aeiouæɑɒɔəɛɜɪʊʌɚɝ';
  const bare = (w) => String(w || '').toLowerCase().replace(/[’‘`]/g, "'").replace(/[^a-z']/g, '').replace(/^'+|'+$/g, '');
  const ipaCore = (ipa) => String(ipa || '').replace(/[/\[\]]/g, '').trim();
  const nuclei = (ipa) => (ipaCore(ipa).replace(/[ˈˌ]/g, '').match(new RegExp('[' + VOWEL + ']+', 'g')) || []).length;
  // Номер ударного слога по IPA: сколько гласных ядер стоит до знака ˈ
  function stressedSyllable(ipa) {
    const c = ipaCore(ipa);
    const at = c.indexOf('ˈ');
    if (at < 0) return null;
    return (c.slice(0, at).match(new RegExp('[' + VOWEL + ']+', 'g')) || []).length;
  }

  /* ---------- Правила по одному слову ---------- */

  const WORD_RULES = {
    ae: (w, ipa) => (ipa ? /æ/.test(ipa) : false),
    aspiration: (w, ipa, fn) => !fn && !!ipa && /(^|ˈ)[ptk](?!ʃ)/.test(ipaCore(ipa).replace(/^ˌ/, '')),
    th: (w, ipa) => (ipa ? /[θð]/.test(ipa) : /th/.test(w)),
    r: (w) => /r/.test(w.replace(/^wr/, 'r')),
    w: (w, ipa) => (ipa ? /w/.test(ipaCore(ipa)) : /^(wh?[aeiouy]|.*qu)/.test(w)) && !/^(who|whom|whose|whole|two|sword|answer)$/.test(w),
    'final-voiced': (w, ipa, fn) => !fn && !!ipa && /[bdgɡvzʒð]$/.test(ipaCore(ipa).replace(/[ˈˌ:ː]/g, '')),
    flap: (w, ipa) => {
      // По написанию: t/tt между гласными (или после r), дальше безударный слог — water, better, city, party, little
      if (!/[aeiouy]r?tt?(?=[aeiouy]|le$|les$|ling|led$|ly$)/.test(w)) return false;
      if (!ipa) return true;
      // По IPA: перед t гласная (не знак ударения), после — безударная гласная. hoˈtel, aˈttack → t настоящий
      // перед [ən]+согласная (important, button, mountain) у американцев не flap, а «проглоченный» t
      return new RegExp('[' + VOWEL + 'rː]t(?=[əɚɪil])(?!ən(?![' + VOWEL + ']))').test(ipaCore(ipa).replace(/ˌ/g, ''));
    },
    stress: (w, ipa, fn) => {
      if (fn) return false;
      if (STRESS_WORDS[w]) return true;
      if (!ipa) return false;
      const n = nuclei(ipa);
      const s = stressedSyllable(ipa);
      return n >= 3 || (n === 2 && s !== null && s > 0);
    },
    'dark-l': (w, ipa) => {
      if (ipa) return new RegExp('l(?![' + VOWEL + 'j])').test(ipaCore(ipa).replace(/[ˈˌː]/g, ''));
      return /l(?![aeiouy])|le$/.test(w);
    },
  };

  /* ---------- Разметка фразы ---------- */

  // lookup(word) → { ipa, stress } | null — источник IPA (разметка примеров + LEX_US)
  // Возвращает [{ trap, index, word }] — по одному попаданию на слово и ловушку, в порядке слов.
  function findTrapsInPhrase(text, lookup) {
    const tokens = String(text || '').split(/\s+/).filter(Boolean);
    const hits = [];
    const add = (trap, index) => {
      if (!hits.some((h) => h.trap === trap && h.index === index)) hits.push({ trap, index, word: tokens[index] });
    };
    const words = tokens.map(bare);
    words.forEach((w, i) => {
      if (!w || !/[a-z]/.test(w)) return;
      const rec = typeof lookup === 'function' ? lookup(w) : null;
      const ipa = rec && rec.ipa ? rec.ipa : '';
      const fn = FUNCTION_WORDS.has(w);
      for (const [trap, rule] of Object.entries(WORD_RULES)) if (rule(w, ipa, fn)) add(trap, i);
      if (REDUCED_WORDS.has(w)) add('reduction', i);
    });
    // Пары слов, которые в речи сливаются: want to → wanna
    for (let i = 0; i + 1 < words.length; i++) {
      if (REDUCED_PAIRS.some(([a, b]) => words[i] === a && words[i + 1] === b)) { add('reduction', i); add('reduction', i + 1); }
    }
    // Flap на стыке слов: get it, a lot of, what is → «гедит», «элодэв»
    for (let i = 0; i + 1 < words.length; i++) {
      if (/[aeiouy]r?t$/.test(words[i]) && !/[.,!?;:—]$/.test(tokens[i]) && /^[aeiou]/.test(words[i + 1])) add('flap', i);
    }
    return hits.sort((a, b) => a.index - b.index || ACCENT_TRAPS.findIndex((t) => t.id === a.trap) - ACCENT_TRAPS.findIndex((t) => t.id === b.trap));
  }

  // Уникальные ловушки фразы — для паспорта акцента и подбора фраз
  const trapIdsOf = (text, lookup) => [...new Set(findTrapsInPhrase(text, lookup).map((h) => h.trap))];

  // Источник IPA: разметка слов из примеров карточек (уже дозаполнена lex_us.js) + LEX_US
  function makeLookup(cards, lexUs) {
    const map = new Map();
    (cards || []).forEach((c) => ((c && c.payload && c.payload.examples) || []).forEach((ex) =>
      (ex.parts || []).forEach((p) => { const b = bare(p.word); if (b && p.ipa && !map.has(b)) map.set(b, { ipa: p.ipa, stress: p.stress }); })));
    const lex = lexUs || {};
    return (w) => {
      const b = bare(w);
      if (map.has(b)) return map.get(b);
      const rec = lex[b] || lex[b.replace(/'s$/, '')];
      if (!rec) return null;
      const [ipa, stress] = rec.split('|');
      return { ipa: '/' + ipa + '/', stress: stress === undefined ? undefined : Number(stress) };
    };
  }

  /* ---------- Мини-тренажёр пар ---------- */

  function shuffle(arr, rng) {
    const r = rng || Math.random;
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // Раунды тренажёра одной ловушки: [{ play, options: [x, y], correct, pair }]
  // choose/contrast — «какое слово прозвучало: bad или bed?»;
  // same (редукция, flap) — пары звучат почти одинаково, угадывать между ними нечестно,
  //   поэтому: редукция — звучит «gonna», выбери полную форму (going to / want to);
  //            flap — звучит слово с flap, выбери его среди слова из другой пары.
  function buildDrill(trapId, opts) {
    const o = opts || {};
    const rng = o.rng || Math.random;
    const t = byId.get(trapId);
    if (!t) return [];
    const n = Math.min(o.rounds || 5, t.pairs.length);
    const pairs = shuffle(t.pairs, rng).slice(0, n);
    return pairs.map((pair) => {
      const [a, b] = pair;
      const others = t.pairs.filter((p) => p !== pair);
      if (t.drill === 'same' && t.id === 'reduction') {
        const other = others[Math.floor(rng() * others.length)][0];
        const options = shuffle([a, other], rng);
        return { play: b, options, correct: options.indexOf(a), pair, prompt: 'Что это в полной форме?' };
      }
      if (t.drill === 'same') {
        const target = rng() < 0.5 ? a : b;
        const otherPair = others[Math.floor(rng() * others.length)];
        const other = otherPair[target === a ? 0 : 1];
        const options = shuffle([target, other], rng);
        return { play: target, options, correct: options.indexOf(target), pair, prompt: 'Какое слово прозвучало?' };
      }
      const target = rng() < 0.5 ? a : b;
      const options = shuffle([a, b], rng);
      return { play: target, options, correct: options.indexOf(target), pair, prompt: 'Какое слово прозвучало?' };
    });
  }

  /* ---------- Паспорт акцента: какие ловушки уже побеждены ---------- */

  // «Побеждена» — ≥80% верных из последних 10 попыток, не меньше 5 попыток
  const PASSPORT = { window: 10, minAttempts: 5, pass: 0.8 };

  function normalizePassport(p) {
    const out = {};
    const src = p && typeof p === 'object' ? p : {};
    for (const t of ACCENT_TRAPS) {
      const e = src[t.id];
      const hist = e && Array.isArray(e.hist) ? e.hist.slice(-PASSPORT.window).map(Boolean) : [];
      out[t.id] = { hist, total: Math.max(hist.length, Number(e && e.total) || 0), updated: (e && e.updated) || null };
    }
    return out;
  }

  // source: 'drill' | 'ladder-1' | 'ladder-6' — откуда результат (для статистики)
  function recordResult(passport, trapId, ok, today) {
    const p = normalizePassport(passport);
    if (!p[trapId]) return p;
    const e = p[trapId];
    p[trapId] = { hist: e.hist.concat(!!ok).slice(-PASSPORT.window), total: e.total + 1, updated: today || e.updated };
    return p;
  }

  function statusOf(entry) {
    const h = (entry && entry.hist) || [];
    if (!h.length) return 'new';
    if (h.length >= PASSPORT.minAttempts && h.filter(Boolean).length / h.length >= PASSPORT.pass) return 'won';
    return 'progress';
  }

  return {
    TRAPS: ACCENT_TRAPS, byId, findTrapsInPhrase, trapIdsOf, makeLookup, STRESS_WORDS,
    buildDrill, PASSPORT, normalizePassport, recordResult, statusOf,
    _rules: WORD_RULES, _nuclei: nuclei,
  };
})();

if (typeof window !== 'undefined') { window.ACCENT_TRAPS = ACCENT_TRAPS; window.AccentTraps = AccentTraps; }
if (typeof globalThis !== 'undefined') { globalThis.ACCENT_TRAPS = ACCENT_TRAPS; globalThis.AccentTraps = AccentTraps; }
