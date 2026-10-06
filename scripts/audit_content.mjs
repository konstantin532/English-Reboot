/**
 * scripts/audit_content.mjs — проверка «живости» контента (этап 7).
 * Запуск: node scripts/audit_content.mjs [--cmu путь/к/cmudict.dict] [--out папка]  →  docs/content-audit.md (+ .json)
 *   cmudict.dict: git clone https://github.com/cmusphinx/cmudict (BSD-2-Clause). Без него
 *   американский вариант берётся только из js/lex_us.js (там лишь часть слов).
 * Это dev-инструментарий: приложение этот файл не использует. Скрипт НИЧЕГО не меняет в
 * контенте — только собирает отчёт, решения по каждой строке принимает автор курса.
 *
 * Что ищем:
 *   1. Британская транскрипция, которую реально видит ученик (IPA из встроенных словарей
 *      content_*.js; lex_us.js с американским CMU дозаполняет только пустые места).
 *   2. Британские слова и написание в английских текстах карточек.
 *   3. Книжные / устаревшие для разговорного курса выражения.
 *   4. Дубли карточек (одинаковая фраза в нескольких разделах).
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { loadCmu } from './cmu_ipa.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (f) => fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8');
const FILES = ['content_grammar', 'content_vocab', 'content_extra', 'content_pro', 'content_us', 'content_words'];

/* ---------- загрузка: без lex_us (что дали сами файлы) и словарь CMU отдельно ---------- */
function load(withLexUs) {
  const ctx = { console: { log() {}, warn() {}, error() {} } };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(FILES.map(read).join('\n;\n') + (withLexUs ? '\n;\n' + read('lex_us') : '') +
    ';this.__G = typeof GRAMMAR_CARDS !== "undefined" ? GRAMMAR_CARDS : [];', ctx);
  return ctx;
}
const ctx = load(false);
const US = load(true).LEX_US;
const cmuArg = process.argv.indexOf('--cmu');
const CMU = cmuArg > 0 ? loadCmu(process.argv[cmuArg + 1]) : null;

// Русская транскрипция — тем же кодом, что в приложении (annotate.js)
const actx = { console, window: {}, document: undefined };
vm.createContext(actx);
vm.runInContext(read('annotate') + ';this.__A = Annotate;', actx);
const ru = (ipa, word) => actx.__A.ruWord('/' + ipa + '/', word);

// Слабые формы служебных слов: CMU даёт полную (for → fɔr), в речи звучит слабая — оставляем слабую,
// только с американским r (fə → fɚ)
const weakOnly = (ipa) => !/ˈ/.test(ipa) && (ipa.match(/[aeiouæɑɒɔəɜɪʊʌɛ]+/g) || []).every((v) => v === 'ə');
// Грубое приближение британское → американское (для подбора варианта CMU и как запасной вариант)
function approxUS(br, word) {
  const w = word.toLowerCase();
  let s = br.replace(/əʊ/g, 'oʊ').replace(/ɒ/g, 'ɑ').replace(/eə/g, 'ɛr').replace(/ɪə/g, 'ɪr').replace(/ʊə/g, 'ʊr')
    .replace(/e(?!ɪ)/g, 'ɛ').replace(/ɜː/g, 'ɝ').replace(/iː/g, 'i').replace(/uː/g, 'u');
  s = s.replace(/ɑː/g, /ar/.test(w) ? 'ɑr' : /a(s[kpt]|ff?|ft|th|n[tcd]|nce|nsw|lf)/.test(w) ? 'æ' : 'ɑ');
  s = s.replace(/ɔː/g, /(or|our|oar|oor|ar)/.test(w) && !/[r]/.test(s) ? 'ɔr' : 'ɔ').replace(/ː/g, '');
  if (/(r|re|er|or|our|ar)$/.test(w) && /ə$/.test(s)) s = s.replace(/ə$/, 'ɚ');
  s = s.replace(/([tdnszθl])ju/g, '$1u'); // американское «new» = /nu/, «student» = /ˈstudənt/
  return s;
}
const lev = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};
// Предложение для слова: { ipa, src: 'слабая форма' | 'CMU' | 'lex_us' | 'правило — проверить' }
function proposeUS(word, br) {
  const approx = approxUS(br, word);
  if (weakOnly(br)) return { ipa: approx, src: 'слабая форма' };
  const base = word.replace(/'s$/, '');
  const cands = (CMU && (CMU.get(word) || CMU.get(base))) || null;
  if (cands && cands.length) {
    // Основной вариант CMU (самый частый в США: new → nu). Другой — только если британская запись
    // явно про другое произношение (омографы: used /just/ «привык», read /rɛd/ в прошедшем).
    const target = approx.replace(/ˈ/g, '');
    const d = (x) => lev(x.replace(/ˈ/g, ''), target);
    let pick = cands[0];
    const alt = cands.slice(1).sort((x, y) => d(x) - d(y))[0];
    if (alt && d(alt) < d(pick) && (d(alt) === 0 || (d(pick) > 1 && d(alt) + 1 < d(pick)))) pick = alt;
    // Сильно расходится с британской записью — пусть посмотрит человек (croissant, сокращения)
    const far = d(pick) > Math.max(1, Math.round(target.length * 0.3));
    return { ipa: pick, src: far ? 'CMU — проверить' : 'CMU' };
  }
  if (US[word]) return { ipa: US[word].split('|')[0], src: 'lex_us' };
  return { ipa: approx, src: 'правило — проверить' };
}

const STORES = [
  ['words', ctx.WORD_CARDS],
  ['grammar', ctx.__G], ['phrasal', ctx.PHRASAL_CARDS], ['collocations', ctx.COLLOCATION_CARDS],
  ['idioms', ctx.IDIOM_CARDS], ['conversation', ctx.CONVERSATION_CARDS], ['slang', ctx.SLANG_CARDS],
  ['minimal', ctx.MINIMAL_PAIR_CARDS], ['reading', ctx.READING_CARDS], ['pro-reading', ctx.PRO_READINGS],
  ...Object.entries(ctx.PRO_CONTENT || {}).map(([k, v]) => ['pro-' + k, v]),
  ['pro-grammar', ctx.PRO_GRAMMAR], ['pro-phrasal', ctx.PRO_PHRASAL], ['pro-colloc', ctx.PRO_COLLOC],
].filter(([, a]) => Array.isArray(a));

// Одна карточка может лежать в нескольких массивах (PRO_CONTENT ссылается на PRO_*) — считаем по id
const cards = [];
const seen = new Set();
for (const [store, arr] of STORES) {
  for (const c of arr) {
    if (!c || !c.payload) continue;
    const key = c.id || JSON.stringify(c.payload).slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    cards.push({ store, id: c.id || '?', front: String(c.payload.front || c.payload.title || c.payload.word || '').slice(0, 80), card: c });
  }
}

/* ---------- 1. Транскрипция ---------- */
const bare = (w) => String(w || '').toLowerCase().replace(/[^a-z']/g, '').replace(/^'+|'+$/g, '');
const strip = (ipa) => String(ipa || '').replace(/^\/|\/$/g, '');

// Британские признаки в IPA (с учётом написания слова для «пропавшего r»)
function britishMarks(word, ipa) {
  const m = [];
  if (/ɒ/.test(ipa)) m.push('ɒ (в США — ɑ/ɔ)');
  if (/əʊ/.test(ipa)) m.push('əʊ (в США — oʊ)');
  if (/eə|(?<![aɔeo])ɪə|(?<![aɔeo])ʊə/.test(ipa)) m.push('eə/ɪə/ʊə (в США — ɛr/ɪr/ʊr)'); // после дифтонга (quiet, towel, loyalty) — два слога, не британское
  if (/[aeiouy]r/i.test(word) && !/[rɚɝ]/.test(ipa)) m.push('нет r (в США r слышен)');
  else if (/ː/.test(ipa)) m.push('ː (долготу в американских словарях не пишут)');
  return m;
}

const ipaUses = new Map(); // слово|ipa → { word, ipa, n, cards:Set, fields:Set }
function addIpa(word, ipa, where, field) {
  const b = bare(word);
  if (!b || !ipa) return;
  const k = b + '|' + strip(ipa);
  if (!ipaUses.has(k)) ipaUses.set(k, { word: b, ipa: strip(ipa), n: 0, cards: new Set(), fields: new Set() });
  const u = ipaUses.get(k);
  u.n++;
  u.cards.add(where);
  u.fields.add(field);
}
function walkIpa(o, where, depth) {
  if (!o || typeof o !== 'object' || depth > 7) return;
  if (Array.isArray(o.parts)) o.parts.forEach((p) => p && p.ipa && addIpa(p.word, p.ipa, where, 'разбор примера'));
  for (const v of Object.values(o)) if (v && typeof v === 'object') walkIpa(v, where, depth + 1);
}
// IPA вне разбора примеров (звуки minimal pairs и т.п.): строки «/…/» рядом со словом
function walkLooseIpa(o, where, depth) {
  if (!o || typeof o !== 'object' || depth > 7) return;
  if (typeof o.word === 'string' && typeof o.ipa === 'string' && !Array.isArray(o.parts)) addIpa(o.word, o.ipa, where, 'поле ipa');
  for (const v of Object.values(o)) if (v && typeof v === 'object') walkLooseIpa(v, where, depth + 1);
}
cards.forEach((c) => { walkIpa(c.card.payload, c.store + ':' + c.id, 0); walkLooseIpa(c.card.payload, c.store + ':' + c.id, 0); });

const ipaRows = [];
for (const u of ipaUses.values()) {
  const marks = britishMarks(u.word, u.ipa);
  if (!marks.length) continue;
  const prop = proposeUS(u.word, u.ipa);
  ipaRows.push({ ...u, cards: [...u.cards], fields: [...u.fields], marks, us: prop.ipa, src: prop.src,
    ruNow: ru(u.ipa, u.word), ruUs: ru(prop.ipa, u.word) });
}
ipaRows.sort((a, b) => b.n - a.n || a.word.localeCompare(b.word));

// Прочие строки с британской IPA (например, «/ˈwɔːtə/» в карточке звука)
const looseIpa = [];
function walkStrings(o, where, pathStr, depth) {
  if (depth > 7 || !o) return;
  if (typeof o === 'string') {
    const hits = o.match(/\/[^/\s]{1,30}\//g) || [];
    hits.filter((h) => /[ɒː]|əʊ|eə|ɪə|ʊə/.test(h)).forEach((h) => looseIpa.push({ where, path: pathStr, ipa: h, text: o.slice(0, 90) }));
    return;
  }
  if (typeof o !== 'object') return;
  if (Array.isArray(o.parts)) return; // разбор примеров уже учтён выше
  for (const [k, v] of Object.entries(o)) if (k !== 'ipa') walkStrings(v, where, pathStr ? pathStr + '.' + k : k, depth + 1);
}
cards.forEach((c) => walkStrings(c.card.payload, c.store + ':' + c.id, '', 0));

/* ---------- 2–3. Английский текст карточек ---------- */
const isEnglish = (s) => {
  const lat = (s.match(/[a-z]/gi) || []).length, cyr = (s.match(/[а-яё]/gi) || []).length;
  return lat >= 3 && lat > cyr * 4;
};
function englishStrings(o, out, pathStr, depth) {
  if (depth > 7 || !o) return out;
  if (typeof o === 'string') { if (isEnglish(o)) out.push({ path: pathStr, text: o }); return out; }
  if (typeof o !== 'object') return out;
  if (Array.isArray(o.parts)) { if (typeof o.text === 'string') out.push({ path: pathStr + '.text', text: o.text }); return out; }
  for (const [k, v] of Object.entries(o)) if (!['ipa', 'pos', 'id', 'type', 'level', 'audio'].includes(k)) englishStrings(v, out, pathStr ? pathStr + '.' + k : k, depth + 1);
  return out;
}
const texts = cards.map((c) => ({ ...c, strings: englishStrings(c.card.payload, [], '', 0) }));

// Британские слова → американский вариант. Правила с контекстом: «ring a bell», «foot the bill»,
// «lift the mood» нормальны и в США. Слова, понятные и привычные в США (film, shop, garden, ill, taxi),
// не помечаем — это шум.
const BR_RULES = [
  [/\b(a|the|my|her|his|new|their|our|your|this|that|rented|small|big) flats?\b(?! tires?)/i, 'flat', 'apartment'],
  [/\b(the|a) lifts?\b(?! the)|\bgive (me|you|him|her|us|them) a lift\b/i, 'lift', 'elevator / a ride'],
  [/\bqueue(s|d|ing)?\b|\bqueueing\b/i, 'queue', 'line / wait in line'],
  [/\brubbish\b/i, 'rubbish', 'trash / garbage'],
  [/\bpetrol\b/i, 'petrol', 'gas'],
  [/\bmotorways?\b/i, 'motorway', 'highway / freeway'],
  [/\bpavements?\b/i, 'pavement', 'sidewalk'],
  [/\bcar parks?\b/i, 'car park', 'parking lot'],
  [/\bbiscuits?\b/i, 'biscuit', 'cookie'],
  [/\bcrisps\b/i, 'crisps', 'chips'],
  [/\bsweets\b/i, 'sweets', 'candy'],
  [/\btrousers\b/i, 'trousers', 'pants'],
  [/\bjumpers?\b/i, 'jumper', 'sweater'],
  [/(?<!AI )\btrainers\b/i, 'trainers', 'sneakers'],
  [/\bcinemas?\b/i, 'cinema', 'movie theater / the movies'],
  [/\bautumn\b/i, 'autumn', 'fall'],
  [/\bfortnight\b/i, 'fortnight', 'two weeks'],
  [/\bpostcode\b/i, 'postcode', 'zip code'],
  [/\btimetables?\b/i, 'timetable', 'schedule'],
  [/\brailways?\b/i, 'railway', 'railroad'],
  [/\b(the )?underground\b(?= (station|train))|\bthe tube\b/i, 'underground / tube', 'subway'],
  [/\bchemist'?s?\b/i, 'chemist', 'pharmacy / drugstore'],
  [/\bwhere('s| is) the toilet|\bthe toilets\b|\bthe loo\b/i, 'toilet (как место)', 'restroom / bathroom'],
  [/\bcheers\b(?! to)/i, 'cheers', 'thanks (в значении «спасибо»)'],
  [/\bmates?\b/i, 'mate', 'buddy / man / dude'],
  [/\bbrilliant!|\b(that's|that is|oh,?) brilliant\b/i, 'brilliant!', 'awesome / great'],
  [/\blovely\b/i, 'lovely', 'nice / great'],
  [/\bfancy (a|going|some|it|that|this)\b|\bdo you fancy\b/i, 'fancy', 'want / feel like'],
  [/\bbloody\b/i, 'bloody', '—'],
  [/\bquid\b/i, 'quid', 'bucks'],
  [/\bfull stop\b/i, 'full stop', 'period'],
  [/\bCVs?\b/, 'CV', 'résumé'],
  [/\bmaths\b/i, 'maths', 'math'],
  [/\bmums?\b|\bmummy\b/i, 'mum', 'mom'],
  [/\brubbers?\b/i, 'rubber', 'eraser'],
  [/\btorch\b/i, 'torch', 'flashlight'],
  [/\bground floor\b/i, 'ground floor', 'first floor'],
  [/\bthe bill,? please\b|\b(get|have|bring( us)?) the bill\b|\bask for the bill\b/i, 'the bill (в ресторане)', 'the check'],
  [/\bat the weekend\b/i, 'at the weekend', 'on the weekend'],
  [/\bin hospital\b/i, 'in hospital', 'in the hospital'],
  [/\bat university\b|\buni\b/i, 'at university / uni', 'in college'],
  [/\bdifferent to\b/i, 'different to', 'different from'],
  [/\bring (me|you|him|her|them|us)\b|\bring(ing)? (you |me |him |her )?back\b|\bgive (me|you|him|her) a ring\b/i, 'ring (= звонить)', 'call'],
  [/\bring roads?\b/i, 'ring road', 'beltway / loop'],
  [/\b(cash machine|cashpoint)\b/i, 'cash machine', 'ATM'],
  [/\bwardrobes?\b/i, 'wardrobe', 'closet'],
  [/\b(the|a) taps?\b(?! (on|into|out))/i, 'tap', 'faucet'],
  [/\bwashing[- ]up\b/i, 'washing up', 'doing the dishes'],
  [/\bhoover\b/i, 'hoover', 'vacuum'],
  [/\bestate agents?\b/i, 'estate agent', 'real estate agent / realtor'],
  [/\btakeaway\b/i, 'takeaway', 'takeout'],
  [/\bholidays?\b(?= (in|to|at|for|abroad|next|this|last))|\bon holiday\b|\bgo on holiday\b/i, 'holiday (= отпуск)', 'vacation'],
  [/\bmobile( phone)?\b(?! app)/i, 'mobile', 'cell phone / phone'],
  [/\bchips\b(?= (with|and fish))|\bfish and chips\b/i, 'chips (картошка фри)', 'fries'],
  [/\brevision\b|\brevise for\b/i, 'revision', 'studying / review'],
  [/\bterm\b(?= (starts|ends|break|time|holidays))/i, 'term (в учёбе)', 'semester'],
];

// Британское написание (слово → американское)
const BR_SPELL = [
  [/\b(col|fav|behavi|neighb|hon|flav|hum|lab|harb|rum|vap|arm|endeav)our(s|ed|ing|ite|ites|hood|able)?\b/gi, (m) => m.replace(/our/i, 'or')],
  [/\b(\w+)is(e|ed|es|ing|ation|ations)\b/gi, null], // кандидаты, отфильтруем ниже по списку
  [/\b(cent|theat|met|lit|fib|calib|spect)re(s|d)?\b/gi, (m) => m.replace(/re(s|d)?$/i, 'er$1')],
  [/\b(travel|cancel|label|model|signal|fuel|counsel|jewel|quarrel|marvel)l(ed|ing|er|ers)\b/gi, (m) => m.replace(/ll/i, 'l')],
  [/\b(programme|cheque|grey|tyre|pyjamas|aluminium|defence|licence|offence|storey|kerb|cosy|jewellery|enrol|catalogue|analyse|paralyse|plough|sceptical|manoeuvre|moustache|draught|practise|practised)\b/gi, null],
];
const ISE_OK = new Set(['advertise', 'advise', 'arise', 'chastise', 'circumcise', 'comprise', 'compromise', 'concise', 'demise', 'despise', 'devise', 'disguise', 'enterprise', 'excise', 'exercise', 'expertise', 'franchise', 'improvise', 'merchandise', 'noise', 'otherwise', 'paradise', 'precise', 'premise', 'promise', 'raise', 'revise', 'rise', 'supervise', 'surmise', 'surprise', 'televise', 'wise', 'cruise', 'praise', 'poise', 'treatise', 'concise', 'likewise', 'clockwise', 'sunrise', 'bruise', 'guise', 'mise', 'tortoise', 'turquoise', 'porpoise', 'anise', 'reprise', 'appraise', 'expertise', 'premises', 'raised', 'raises', 'raising', 'rising', 'arising', 'arisen', 'promised', 'promises', 'promising', 'exercised', 'exercises', 'exercising', 'surprised', 'surprises', 'surprising', 'advised', 'advising', 'advertising', 'advertised', 'revised', 'revising', 'supervisor', 'precisely', 'wisest', 'noises', 'cruises', 'praised', 'bruised', 'despised', 'compromised', 'improvised', 'disguised', 'devised', 'comprised', 'cruising', 'raisin', 'otherwise']);
const US_SPELL = { programme: 'program', cheque: 'check', grey: 'gray', tyre: 'tire', pyjamas: 'pajamas', aluminium: 'aluminum', defence: 'defense', licence: 'license', offence: 'offense', storey: 'story', kerb: 'curb', cosy: 'cozy', jewellery: 'jewelry', enrol: 'enroll', catalogue: 'catalog', analyse: 'analyze', paralyse: 'paralyze', plough: 'plow', sceptical: 'skeptical', manoeuvre: 'maneuver', moustache: 'mustache', draught: 'draft', practise: 'practice', practised: 'practiced' };

// Книжное / устаревшее для разговорного американского курса
const BOOKISH = [
  [/\bhow do you do\b/i, '«How do you do?» — почти не говорят; живое: «Nice to meet you»'],
  [/\braining cats and dogs\b/i, 'устаревшая идиома из учебников; живое: «It\'s pouring»'],
  [/\bshall\b/i, '«shall» в США звучит формально; живое: «Should we…?», «Let\'s…», «I\'ll…»'],
  [/\bwhom\b/i, '«whom» в разговоре почти не используют; живое: «who»'],
  [/\bi beg your pardon\b/i, 'очень формально; живое: «Sorry?» / «Excuse me?»'],
  [/\bfancy a\b|\bdo you fancy\b/i, 'британское «хотеть»; живое: «Want to…?» / «Do you feel like…?»'],
  [/\bat the weekend\b/i, 'британское; в США — «on the weekend»'],
  [/\bhave (you|we|they|i) got\b|\bhas (he|she|it) got\b/i, 'британское «have got» в вопросах; в США — «Do you have…?»'],
  [/\bhaven'?t got\b|\bhasn'?t got\b/i, 'британское; в США — «don\'t have»'],
  [/\bthe weather is fine\b|\bfine weather\b/i, 'учебниковое; живое: «It\'s nice out»'],
  [/\bi am fine,? thank you\b|\bi'm fine,? thank you\b/i, 'учебниковое «I\'m fine, thank you»; живое: «Good, you?» / «Not bad»'],
  [/\bwhat is your name\b/i, 'учебниковое; живое: «What\'s your name?» / «I didn\'t catch your name»'],
  [/\bcheerio\b|\bta-ta\b|\bjolly\b|\bsplendid\b|\bsmashing\b|\bchap\b|\bblimey\b/i, 'британское / устаревшее'],
  [/\bgroovy\b|\bfar out\b|\bdude,? that'?s radical\b|\btubular\b|\bswell\b/i, 'устаревший сленг'],
  [/\bfetch\b/i, '«fetch» как сленг устарел (или это «принести» — проверить)'],
];

const wordRows = [], spellRows = [], bookRows = [];
for (const c of texts) {
  for (const s of c.strings) {
    const t = s.text;
    for (const [re, w, us] of BR_RULES) {
      const m = t.match(re);
      if (m) wordRows.push({ store: c.store, id: c.id, front: c.front, word: w, hit: m[0], us, path: s.path, text: t });
    }
    for (const [re, fix] of BR_SPELL) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(t))) {
        const word = m[0];
        const lw = word.toLowerCase();
        if (fix === null && /is(e|ed|es|ing|ation|ations)$/i.test(lw) && !US_SPELL[lw]) {
          if (ISE_OK.has(lw) || lw.length < 6) continue;
          if (!/(organ|real|recogn|apolog|critic|special|summar|emphas|memor|minim|maxim|categor|priorit|optim|util|visual|personal|custom|author|final|normal|modern|global|civil|central|standard|symbol|sympath|familiar|character|stabil|subsid|social|capital|computer|mobil|motiv|individual|general|legal|hospital|commerc|natural|special|ideal|patron|agon|theor|tranquil|vandal|fertil|steril|human|harmon|item|jeopard|liquid|local|magnet|mesmer|monopol|neutral|ostrac|paral|polar|popular|pressur|scandal|scrutin|synchron|synthes|terror|trivial|tyrann|ital|energ|famil|hypothes|sanit|colon|critic|anal|euthan|fantas|glamor|hospital|immun|jeopard|legit|marginal|material|moral|nation|penal|politic|public|rational|special|stigmat|westerni|womani)/.test(lw)) continue;
          spellRows.push({ store: c.store, id: c.id, front: c.front, word, us: lw.replace(/is(e|ed|es|ing|ation|ations)$/, 'iz$1'), text: t });
          continue;
        }
        const us = US_SPELL[lw] || (typeof fix === 'function' ? fix(word) : '—');
        spellRows.push({ store: c.store, id: c.id, front: c.front, word, us, text: t });
      }
    }
    for (const [re, note] of BOOKISH) {
      if (re.test(t)) bookRows.push({ store: c.store, id: c.id, front: c.front, note, text: t });
    }
  }
}

/* ---------- 3б. Карточки, которые сами учат британскому ---------- */
const BR_SLANG = {
  innit: 'британское «isn\'t it»; в США не говорят — замена: «right?» / «you know?»',
  cuppa: 'британское «чашка чая»; в США — «a cup of coffee», «coffee?»',
  ta: 'британское «спасибо»; в США — «thanks» / «thx»',
  loadsa: 'британское «loads of»; в США — «a lot of / lotta»',
  howzza: 'нестандартная запись, в словарях сленга не встречается — проверить или убрать',
};
const brSlang = cards.filter((c) => c.store === 'slang' && BR_SLANG[c.front.toLowerCase()]).map((c) => ({ id: c.id, front: c.front, note: BR_SLANG[c.front.toLowerCase()] }));

/* ---------- 4. Дубли ---------- */
// Цифры значимы: «Call 911» — не дубль слова «call»
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
const ruOf = (c) => String((c.card.payload && c.card.payload.translation) || '').toLowerCase().replace(/[^а-яё ]+/g, ' ').replace(/\s+/g, ' ').trim();
const byFront = new Map();
cards.forEach((c) => { const k = norm(c.front); if (k.length < 3) return; if (!byFront.has(k)) byFront.set(k, []); byFront.get(k).push(c); });
// Раздел «Слова» учит базовое значение слова: если перевод другой (like «нравиться» и
// филлер like «типа»), это омоним — отдельная карточка по смыслу, а не дубль
const homonym = (a) => a.some((c) => c.store === 'words') && new Set(a.map(ruOf)).size === a.length;
const dupRows = [...byFront.entries()].filter(([, a]) => a.length > 1 && !homonym(a)).map(([k, a]) => ({ front: k, cards: a.map((c) => c.store + ':' + c.id) }));

/* ---------- отчёт ---------- */
const dedupe = (rows, key) => { const s = new Set(); return rows.filter((r) => { const k = key(r); if (s.has(k)) return false; s.add(k); return true; }); };
const W = dedupe(wordRows, (r) => r.store + r.id + r.word);
const SP = dedupe(spellRows, (r) => r.store + r.id + r.word.toLowerCase());
const BK = dedupe(bookRows, (r) => r.store + r.id + r.note);
const cut = (s, n) => { s = String(s).replace(/\s+/g, ' ').replace(/\|/g, '\\|'); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const around = (t, w) => {
  const i = t.toLowerCase().indexOf(w.toLowerCase());
  if (i < 0) return cut(t, 90);
  const a = Math.max(0, i - 40), b = Math.min(t.length, i + w.length + 40);
  return (a > 0 ? '…' : '') + t.slice(a, b).replace(/\s+/g, ' ').replace(/\|/g, '\\|') + (b < t.length ? '…' : '');
};

const bySrc = (src) => ipaRows.filter((r) => r.src === src);
const auto = ipaRows.filter((r) => r.src === 'CMU' || r.src === 'lex_us' || r.src === 'слабая форма');
const manual = ipaRows.filter((r) => !auto.includes(r));
const lines = [];
lines.push('# Аудит контента: британское, книжное, дубли (этап 7)', '');
lines.push('_Сгенерировано скриптом `scripts/audit_content.mjs`. Ничего не изменено — это список для решения._', '');
lines.push('## Сводка', '');
lines.push(`| Что | Найдено |`, `|---|---|`);
lines.push(`| Слов с британской транскрипцией (уникальные слово+IPA) | ${ipaRows.length} (вхождений: ${ipaRows.reduce((s, r) => s + r.n, 0)}) |`);
lines.push(`| …заменить автоматически (CMU / слабая форма) | ${auto.length} |`);
lines.push(`| …нет в CMU — проверить вручную | ${manual.length} |`);
lines.push(`| …русская транскрипция изменится | ${ipaRows.filter((r) => r.ruNow !== r.ruUs).length} |`);
lines.push(`| Прочие строки с британской IPA (звуки и т.п.) | ${looseIpa.length} |`);
lines.push(`| Британские слова в текстах | ${W.length} |`);
lines.push(`| Британское написание | ${SP.length} |`);
lines.push(`| Карточки британского сленга | ${brSlang.length} |`);
lines.push(`| Книжное / устаревшее | ${BK.length} |`);
lines.push(`| Дубли карточек | ${dupRows.length} |`);
lines.push('');
lines.push('## 1. Британская транскрипция', '');
lines.push('Рекомендация: **заменить автоматически на американскую из CMU** (раздел 1а), раздел 1б — вручную.', '');
lines.push('Источник американского варианта: **CMU** (полный словарь, тот же перевод в IPA, что у `lex_us.js` — сверено на 3028 словах), **слабая форма** для служебных слов (for → /fɚ/, а не полное /fɔr/), **правило** — где слова нет в CMU (проверить вручную). Русская транскрипция пересчитана тем же кодом, что в приложении.', '');
lines.push('### 1а. Заменить автоматически', '', '| Слово | Сейчас | Станет | Источник | Рус. сейчас → станет | Признаки | Вхождений |', '|---|---|---|---|---|---|---|');
auto.forEach((r) => lines.push(`| ${r.word} | /${r.ipa}/ | /${r.us}/ | ${r.src} | ${r.ruNow}${r.ruNow === r.ruUs ? ' (без изменений)' : ' → ' + r.ruUs} | ${r.marks.join('; ')} | ${r.n} |`));
const MANUAL_ADVICE = {
  often: '/ˈɔfən/ — верно для США (вариант /ˈɑfən/ тоже)',
  croissant: '/krəˈsɑnt/ — самый частый американский вариант («крэса́нт»), CMU-вариант без r реже',
  used: '/just/ — здесь «used to» (привык), CMU дал «used» = использованный; оставить /just/',
  "what's": '/wʌts/ — верно',
  yeah: '/jæ/ — верно для США («йэ»)',
  ordering: '/ˈɔrdɚɪŋ/ — верно',
  "you'll": '/jul/ — верно',
  "you're": '/jʊr/ — верно (в беглой речи /jɚ/)',
};
lines.push('', '### 1б. Проверить вручную (CMU сильно расходится с записью или слова нет в CMU)', '', '| Слово | Сейчас | CMU | Рус. | Моя рекомендация | Где |', '|---|---|---|---|---|---|');
manual.forEach((r) => lines.push(`| ${r.word} | /${r.ipa}/ | /${r.us}/ | ${r.ruNow} → ${r.ruUs} | ${MANUAL_ADVICE[r.word] || 'проверить'} | ${cut(r.cards.slice(0, 3).join(', '), 60)} |`));
// 1в: по карточкам, а не по строкам
const looseByCard = new Map();
looseIpa.forEach((r) => {
  if (!looseByCard.has(r.where)) looseByCard.set(r.where, { where: r.where, fields: new Set(), ipas: new Set() });
  const g = looseByCard.get(r.where);
  g.fields.add(r.path.replace(/\.\d+/g, '[]'));
  g.ipas.add(r.ipa);
});
const frontOf = new Map(cards.map((c) => [c.store + ':' + c.id, c.front]));
// Пары звуков, которые в американском английском работают иначе
const MP_NOTES = {
  mp_010: 'caught / cot — у многих американцев звучат ОДИНАКОВО (слияние гласных). Предлагаю заменить пару, например на caught / coat',
  mp_026: 'bath / bass — в США bath = /bæθ/, пара получается про /θ/–/s/ (bath / bass /bæs/). Проверить смысл карточки',
  mp_033: 'saw / sow — в США /sɔ/ (у многих /sɑ/) против /soʊ/ — пара работает, обновить IPA',
  mp_034: 'law / low — работает, обновить IPA (/lɔ/ — /loʊ/)',
  mp_035: 'caught / code — работает, обновить IPA (/kɔt/ — /koʊd/)',
  mp_036: 'bought / boat — работает, обновить IPA (/bɔt/ — /boʊt/)',
  mp_029: 'fear / feel — в США /fɪr/ — /fil/: пара про r–l, обновить IPA',
  mp_020: 'very / wary — в США /ˈvɛri/ — /ˈwɛri/, обновить IPA',
};
lines.push('', '### 1в. Британская IPA в других полях (по карточкам)', '', 'Сленг (`ipa_short`/`ipa_full`) — предлагаю обновить по тем же правилам. Minimal pairs — обновить IPA; пары, которые в США работают иначе, — в разделе 1г.', '');
lines.push('| Карточка | Поля | IPA сейчас | Предлагаю |', '|---|---|---|---|');
[...looseByCard.values()].forEach((g) => {
  const ips = [...g.ipas];
  const front = frontOf.get(g.where) || '';
  const prop = g.where.startsWith('slang:') ? ips.map((x) => '/' + approxUS(x.replace(/\//g, ''), front.split(/\s|\//)[0] || '') + '/').join(' ') : 'обновить IPA (американская запись)';
  lines.push(`| ${g.where} «${cut(front, 28)}» | ${[...g.fields].join(', ')} | ${cut(ips.slice(0, 6).join(' '), 60)}${ips.length > 6 ? ' …' : ''} | ${prop} |`);
});
lines.push('', '### 1г. Minimal pairs, которые в США работают иначе', '', '| Карточка | Что не так | Рекомендация |', '|---|---|---|');
Object.entries(MP_NOTES).forEach(([id, note]) => lines.push(`| minimal:${id} «${cut(frontOf.get('minimal:' + id) || '', 24)}» | ${note.split(' — ')[0]} | ${note.split(' — ').slice(1).join(' — ')} |`));
lines.push('', '> Заметка: американское «мягкое t» между гласными (water ≈ «уодэр», better ≈ «бэдэр») в IPA словаря CMU не пишется — это отдельная ловушка произношения, а не ошибка транскрипции.');
lines.push('', '## 2. Британские слова в текстах', '', 'Рекомендация: **заменить на американское**, кроме случаев, где карточка нарочно учит британский вариант. Слова, привычные и в США (film, shop, garden, ill, taxi), не помечены. По одной строке на карточку.', '');
lines.push('| Слово | В США | Карточка | Контекст |', '|---|---|---|---|');
W.forEach((r) => lines.push(`| ${r.word} | ${r.us} | ${r.store}:${r.id} «${cut(r.front, 30)}» | ${around(r.text, r.hit)} |`));
lines.push('', '## 3. Британское написание', '', 'Рекомендация: **заменить на американское** (это не меняет смысла).', '');
lines.push('| Слово | В США | Карточка | Контекст |', '|---|---|---|---|');
SP.forEach((r) => lines.push(`| ${r.word} | ${r.us} | ${r.store}:${r.id} «${cut(r.front, 30)}» | ${around(r.text, r.word)} |`));
lines.push('', '### 3б. Карточки сленга, которые учат британскому', '', 'Рекомендация: **заменить на американский сленг** (или убрать) — на твоё решение.', '', '| Карточка | Почему |', '|---|---|');
brSlang.forEach((r) => lines.push(`| slang:${r.id} «${r.front}» | ${r.note} |`));
lines.push('', '## 4. Книжное / устаревшее для разговорного курса', '', 'Рекомендация: **на твоё решение** — иногда фраза нарочно учит именно формальный вариант.', '');
lines.push('| Почему под вопросом | Карточка | Текст |', '|---|---|---|');
BK.forEach((r) => lines.push(`| ${r.note} | ${r.store}:${r.id} «${cut(r.front, 30)}» | ${cut(r.text, 90)} |`));
lines.push('', '## 5. Дубли карточек', '');
lines.push('| Фраза | Карточки | Рекомендация |', '|---|---|---|');
dupRows.forEach((r) => {
  const stores = new Set(r.cards.map((x) => x.split(':')[0]));
  const advice = stores.size > 1 ? 'оставить: разные разделы учат разное (глагол / реплика)' : 'объединить: одна и та же карточка дважды в одном разделе';
  lines.push(`| ${r.front} | ${r.cards.join(', ')} | ${advice} |`);
});
lines.push('');

// --out папка: повторная проверка после правок, не затирая исходный отчёт в docs/
const outArg = process.argv.indexOf('--out');
const OUT = outArg > 0 ? path.resolve(process.argv[outArg + 1]) : path.join(ROOT, 'docs');
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'content-audit.md'), lines.join('\n'));
fs.writeFileSync(path.join(OUT, 'content-audit.json'), JSON.stringify({ ipa: ipaRows, looseIpa, brSlang, words: W, spelling: SP, bookish: BK, duplicates: dupRows }, null, 1));
console.log(`Карточек: ${cards.length}. IPA: ${ipaRows.length} (авто: ${auto.length}, вручную: ${manual.length}), прочая IPA: ${looseIpa.length}, слова: ${W.length}, написание: ${SP.length}, книжное: ${BK.length}, дубли: ${dupRows.length}`);
