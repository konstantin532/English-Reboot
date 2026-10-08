#!/usr/bin/env node
/**
 * scripts/er-review.mjs — пакет для двух ревизоров (dev-инструмент скилла english-reboot-evolve, шаг 7).
 *
 * Каждый ревизор получает только свой срез, а не весь дифф:
 *   code.diff   — ревизору кода: дифф без сгенерированных словарей (lex_us.js, pos_us.js, скриншоты, аудит)
 *                 и без хунков из одних строк данных (карточки, лексиконы) — их смотрит педагог;
 *   content.md  — педагогу: новые и изменённые карточки текстом — примеры, переводы, тесты с правильным ответом
 *                 (тесты в диффе не видны вовсе: их собирают фабрики); слова, у которых изменилась IPA;
 *                 разметка слов (часть речи, ударный слог, немые буквы) новых карточек, а если менялся
 *                 движок разметки (word_marks.js, pos_us.js, lex_us.js) — ещё и случайная выборка по курсу;
 *   guard.txt   — отчёт сторожа (механика правил уже проверена);
 *   prompt-code.md, prompt-pedagogue.md — готовые задания субагентам с путями.
 *
 *   node scripts/er-review.mjs [--base <ref>]   → /tmp/er/review/ (или $ER_OUT_REVIEW)
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadCards, cardDiff, stripParts, body } from './er-cards.mjs';
import { resolveBase } from './er-git.mjs';

const ROOT = process.env.ER_ROOT ? path.resolve(process.env.ER_ROOT) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.ER_OUT_REVIEW || '/tmp/er/review';
const git = (args) => { const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 }); return r.status === 0 ? r.stdout : ''; };

// Сгенерированные файлы ревизору не нужны: их правильность стерегут тесты и сторож
export const GENERATED = /^(js\/(lex_us|pos_us)\.js|docs\/screenshots\/|docs\/content-audit\.(md|json)$)/;
// Движок разметки слов и его словари: их изменение меняет подчёркивания во всём курсе
const ENGINE = /^js\/(word_marks|pos_us|lex_us)\.js$/;
// Сгенерированные словари {"слово":"значение",…}: в дифф ревизору не идут, поэтому он получает их числа
const DICTS = /^js\/(lex_us|pos_us)\.js$/;

/** Записи словаря-объекта до и после: всего (после), добавлено, удалено, изменено значение */
export function dictStats(before, after) {
  const entries = (t) => {
    const m = new Map();
    for (const x of String(t || '').matchAll(/"((?:[^"\\]|\\.)*)"\s*:\s*"((?:[^"\\]|\\.)*)"/g)) m.set(x[1], x[2]);
    return m;
  };
  const a = entries(before), b = entries(after);
  let added = 0, removed = 0, changed = 0;
  for (const [k, v] of b) { if (!a.has(k)) added++; else if (a.get(k) !== v) changed++; }
  for (const k of a.keys()) if (!b.has(k)) removed++;
  return { total: b.size, added, removed, changed };
}

/** Строка ревизору-код и флаг «проверь, почему»: изменилось больше 10% записей или словарь менялся без карточек */
export function dictNote(file, st, cardsChanged) {
  const n = st.added + st.removed + st.changed;
  const share = n / Math.max(st.total, 1);
  const why = share > 0.1 ? 'больше 10% записей' : (!cardsChanged && n ? 'словарь изменился, а карточки — нет' : '');
  return { flag: Boolean(why), line: `${file}: +${st.added} −${st.removed}, изменено ${st.changed} из ${st.total} (${Math.round(share * 100)}%)${why ? ' — ' + why : ''}` };
}
// Строка данных: карточка, строка словаря, элемент массива, свойство с литералом; закрывающие скобки нейтральны
const DATA = /^\s*(\[|["'`]|\{\s*(id|text|q|word|front)\b|(MP|card|ex|w|err|q|CV|PV|SL|RD)\(|[\w$'"-]+\s*:\s*["'][^"']*\||\/\/|\/\*|\*)/;
const LITERAL_PROP = /^\s*[\w$]+\s*:\s*(\[.*\]|'[^']*'|"[^"]*"|`[^`]*`|-?\d+(\.\d+)?|true|false)\s*,?\s*$/;
const NEUTRAL = /^\s*([\])}]+[,;)]*|)\s*$/;
export const isDataLine = (l) => NEUTRAL.test(l) || DATA.test(l) || LITERAL_PROP.test(l);

/** Хунк из одних строк данных (карточки, лексиконы) — в code.diff не нужен */
export function isDataHunk(lines) {
  const ch = lines.filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l)).map((l) => l.slice(1));
  return ch.length > 0 && ch.every(isDataLine);
}

/** Хунк файла контента: подряд идущие строки данных сворачиваются в одну пометку (код остаётся целиком) */
export function collapseData(hunk) {
  const lines = hunk.split('\n');
  const out = [lines[0]];
  let run = 0, dropped = 0;
  const flush = () => { if (run) { out.push(` …${run} строк данных (карточки — в content.md)`); dropped += run; run = 0; } };
  for (const l of lines.slice(1)) {
    if (/^[ +-]/.test(l) && isDataLine(l.slice(1))) { run++; continue; }
    flush();
    out.push(l);
  }
  flush();
  return { text: out.join('\n'), dropped };
}

/** Полный дифф → код без данных: { text, skipped: {файл: строк}, generated: [файлы] } */
export function codeDiff(diff) {
  const out = [], skipped = {}, generated = [];
  const files = String(diff).split(/^(?=diff --git )/m).filter(Boolean);
  for (const f of files) {
    const m = f.match(/^diff --git a\/(\S+) b\/(\S+)/);
    const name = m ? m[2] : '?';
    if (GENERATED.test(name)) { generated.push(name); continue; }
    const parts = f.split(/^(?=@@ )/m);
    const head = parts.shift();
    const keep = [];
    const content = /^js\/(content_|improv_us|scenes_us)/.test(name);
    for (const h of parts) {
      const lines = h.split('\n');
      if (content && isDataHunk(lines)) { skipped[name] = (skipped[name] || 0) + lines.filter((l) => /^[+-]/.test(l)).length; continue; }
      if (content) { const c = collapseData(h); if (c.dropped) skipped[name] = (skipped[name] || 0) + c.dropped; keep.push(c.text); continue; }
      keep.push(h);
    }
    if (keep.length) out.push(head + keep.join(''));
  }
  return { text: out.join(''), skipped, generated };
}

// Похожесть вариантов: общие значимые слова (без местоимений и служебных) или обе — короткие реакции
// (Sure / Yeah, okay; Да, конечно / Ладно): так в тестах появляются два верных ответа
const STOP = new Set(('i you he she it we they me my your our their the a an to of in on at for do does did is are am was were be ' +
  "it's i'm you're that's what where when how who why this that there here not no and or but so with can will " +
  'я ты он она мы вы они меня тебя мне тебе мой твой это в на с у к по за из не ли а и но да где что как кто когда почему ' +
  'бы же то так там тут вот уже еще ещё').split(/\s+/));
const REACT = /^(yeah|yep|yes|sure|okay|ok|nope|no|cool|fine|great|awesome|totally|right|really|maybe|alright|deal|nice|perfect|absolutely|definitely|да|нет|ок|окей|конечно|ладно|круто|отлично|хорошо|может|супер|точно|давай|договорились|неплохо)$/;
export function similarity(a, b) {
  const words = (x) => String(x || '').toLowerCase().replace(/[^a-zа-яё' ]+/g, ' ').split(/\s+/).filter(Boolean);
  const A = words(a), B = words(b);
  if (!A.length || !B.length) return 0;
  if (A.length <= 3 && B.length <= 3 && A.some((w) => REACT.test(w)) && B.some((w) => REACT.test(w))) return 0.9;
  const ca = A.filter((w) => !STOP.has(w)), cb = new Set(B.filter((w) => !STOP.has(w)));
  if (!ca.length || !cb.size) return 0;
  const shared = ca.filter((w) => cb.has(w)).length;
  return shared ? shared / Math.min(ca.length, cb.size) : 0;
}

const clip = (s, n = 160) => { const t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };

/** Карточка → компактный текст для педагога */
export function cardText(id, x, note = '') {
  const p = stripParts(body(x.card));
  const L = [];
  const lvl = [x.card.level, x.card.sublevel && x.card.sublevel !== x.card.level ? x.card.sublevel : ''].filter(Boolean).join('/');
  L.push(`### ${id} · ${x.group}${lvl ? ' · ' + lvl : ''}${note ? ' · ' + note : ''}`);
  const head = [p.front || p.title || p.situation || p.name, p.translation, p.pos, p.category].filter(Boolean).map((s) => clip(s, 120));
  if (head.length) L.push(head.join(' — '));
  for (const k of ['formula', 'explanation', 'context', 'articulation', 'full_form', 'instruction', 'prompt']) if (p[k]) L.push(`${k}: ${clip(p[k], 300)}`);
  for (const e of p.examples || []) L.push(`- ${clip(e.text, 200)}${e.ru ? ' — ' + clip(e.ru, 200) : ''}`);
  for (const l of p.lines || []) L.push(`- ${clip(l.text, 200)}`);
  if (Array.isArray(p.dialog)) L.push('диалог: ' + p.dialog.map((d) => clip(d, 120)).join(' / '));
  if (p.text && !p.lines) L.push('текст: ' + clip(p.text, 600));
  for (const e of p.errors || []) L.push(`ошибка: ${clip(e.wrong, 80)} → ${clip(e.correct, 80)}${e.note ? ' (' + clip(e.note, 100) + ')' : ''}`);
  // Тесты: с пропуском (___) — все (контекст делает правдоподобными два варианта); остальные — только если
  // неверный вариант похож на верный (similarity). Прочие — числом: их собирают фабрики из других карточек.
  let hidden = 0;
  for (const t of p.test || []) {
    const right = (t.options || [])[t.correct];
    const risky = (t.options || []).some((o, i) => i !== t.correct && similarity(right, o) >= 0.5);
    if (!/___/.test(String(t.q)) && !risky) { hidden++; continue; }
    const opts = (t.options || []).map((o, i) => (i === t.correct ? '✓' : '✗') + clip(o, 60) + (i !== t.correct && similarity(right, o) >= 0.5 ? '*' : '')).join(' · ');
    L.push(`тест: ${clip(t.q, 160)} → ${opts}`);
  }
  if (hidden) L.push(`(ещё тестов: ${hidden} — неверные варианты не похожи на верный)`);
  for (const k of ['samples', 'models', 'answers', 'hints']) if (Array.isArray(p[k])) L.push(`${k}: ${p[k].map((s) => clip(typeof s === 'string' ? s : JSON.stringify(s), 100)).join(' / ')}`);
  return L.join('\n');
}

const RU_SHORT = { noun: 'сущ', verb: 'глаг', adj: 'прил', adv: 'нар', prep: 'предл', pron: 'мест', conj: 'союз',
  art: 'арт', det: 'опр', num: 'числ', aux: 'всп', modal: 'мод', part: 'част' };

/** parts → «(k)now/глаг baNAna/сущ»: ЗАГЛАВНЫЕ — ударный слог, (буква) — немая, после / — часть речи (цвет) */
export function markedLine(parts) {
  return (parts || []).map((p) => {
    const w = String(p.word || '');
    if (!/[A-Za-z0-9]/.test(w)) return w;   // тире, многоточие — не слова, ученику не размечаются
    const silent = new Set(p.silent || []);
    const at = Array.isArray(p.stressAt) ? p.stressAt : null;
    let s = '';
    for (let i = 0; i < w.length; i++) {
      const ch = at && i >= at[0] && i < at[1] ? w[i].toUpperCase() : w[i].toLowerCase();
      s += silent.has(i) ? `(${ch})` : ch;
    }
    return `${s}/${RU_SHORT[p.pos] || p.pos || '?'}`;
  }).join(' ');
}

/** Все размеченные фразы карточки (массивы parts на любой глубине payload) */
export function partsOf(o, depth = 0, out = []) {
  if (!o || typeof o !== 'object' || depth > 6) return out;
  if (Array.isArray(o.parts) && o.parts.length && o.parts[0] && typeof o.parts[0] === 'object') out.push(o.parts);
  for (const [k, v] of Object.entries(o)) if (k !== 'parts' && v && typeof v === 'object') partsOf(v, depth + 1, out);
  return out;
}

/** Выборка разметки для педагога: сначала новые и изменённые карточки, затем (если менялся движок) — случайно по курсу */
export function marksSample(cards, ids, { random = false, seed = 20261007, max = 40 } = {}) {
  const lines = [], seen = new Set();
  const add = (id, parts) => {
    const key = parts.map((p) => p.word).join(' ');
    if (seen.has(key)) return;
    seen.add(key);
    lines.push(`${id}: ${markedLine(parts)}`);
  };
  for (const id of ids) {
    const x = cards.get(id);
    if (x) for (const parts of partsOf(body(x.card))) if (lines.length < max) add(id, parts);
  }
  if (random) {
    const all = [];
    for (const [id, x] of cards) partsOf(body(x.card)).forEach((parts) => all.push([id, parts]));
    let s = seed >>> 0;
    const rnd = () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s / 4294967296; };
    for (let k = 0, end = lines.length + max; all.length && lines.length < end && k < max * 5; k++) {
      const [id, parts] = all[Math.floor(rnd() * all.length)];
      add(id, parts);
    }
  }
  return lines;
}

/** Слова, у которых IPA в примерах стала другой: педагог видит только текст, а IPA в разметке — его зона */
export function ipaChanges(before, after) {
  // Слово → все его IPA в примерах курса (у одного слова в разных лексиконах бывает разная — progress /ˈprɑɡrɛs/ и /proʊˈɡrɛs/)
  const bare = (x) => String(x).replace(/^\/|\/$/g, '');
  const ipaOf = (cards) => {
    const m = new Map();
    for (const x of cards.values()) for (const parts of partsOf(body(x.card))) for (const p of parts) {
      const w = String(p.word || '').toLowerCase().replace(/[^a-z'-]/g, '');
      if (!w || !p.ipa) continue;
      if (!m.has(w)) m.set(w, new Set());
      m.get(w).add(bare(p.ipa));
    }
    return m;
  };
  const a = ipaOf(before), b = ipaOf(after);
  const out = [];
  const fmt = (set) => [...set].sort().map((x) => `/${x}/`).join(', ');
  for (const [w, set] of b) {
    if (!a.has(w)) continue;
    const old = a.get(w);
    if (fmt(old) === fmt(set)) continue;
    const gone = [...old].filter((x) => !set.has(x)), added = [...set].filter((x) => !old.has(x));
    out.push(`${w}: ${fmt(gone) || '—'} → ${added.length ? fmt(added) : 'везде ' + fmt(set)}`);
  }
  return out.sort();
}

// Задания ревизорам — по-английски: субагент читает их целиком, а английский текст в разы дешевле по токенам.
// Ответ ревизора тоже по-английски; автору его пересказывает по-русски основной агент.
export const codePrompt = (paths, dicts = []) => `You review code for English Reboot (offline SPA in vanilla JS: IndexedDB, Service Worker, FSRS). You did not see how the work was done.

Read only these files:
- ${paths.code} — the code diff (generated dictionaries and card data lines are left out: tests and the pedagogue check them);
- ${paths.guard} — the rule guard report: it has already checked the mechanics (CACHE_VERSION, sw.js/index.html, *_VERSION for changed cards, card ids and migration, skip/retries, innerHTML with a variable, British spelling, gender). Do not repeat it; resolve its "?" items.
Sources are in the repo ${paths.root} — open single places only when the diff is unclear without context.
${dicts.length ? `
Generated dictionaries are not in the diff — their numbers:
${dicts.map((d) => '- ' + d.line).join('\n')}
${dicts.some((d) => d.flag) ? `For the lines marked "—" find out why: did the script add entries for new cards, or were they edited by hand / replaced in bulk? Look at single places: git diff ${paths.base} -- <file>.\n` : ''}` : ''}
Check: logic and edge cases; nothing broken in offline mode, student progress, FSRS, export/import; honesty (praise only after a real check, nothing faked, a "no" never counted as "yes"); tests really check what they claim and are not weakened; foreign text only via escapeHtml/textContent; cost on a phone.

Answer only as a list: "blocker / important / minor — file:line — what is wrong — how to fix". Nothing found — one line "no issues". Do not retell the diff. Up to 300 words.`;

export const pedagoguePrompt = (paths, extra = {}) => `You are the pedagogue reviewer of English Reboot: a Russian-speaking A1–B2 learner studies spoken American English to understand films, series and songs and to speak aloud. You did not see how the work was done.

Read only ${paths.content} — new and changed cards as text: examples with translation, tasks with the right answer (✓) and wrong ones (✗). The reasons behind the checks are in ${paths.root}/docs/PEDAGOGY.md — open it only if a check is unclear.

Check: the English is natural and American (spelling, words, IPA, nothing British); the Russian translation is accurate and natural; each task has exactly one right answer and the wrong ones are really wrong (synonyms and similar reactions are a common mistake); the level fits the sublevel; the student's lines in Russian are gender-neutral; no song lyrics, film lines or subtitles (own examples are fine).
Also check: a new card has one new thing (a new word, or a new phenomenon, or a new construction); an American would really say this phrase in this situation; the Russian prompt calls up exactly this phrase and is not a calque; a contracted or spoken form (gonna, didja) also shows the full form and the register; slang, rude words or AAVE appear only for recognition, never in a phrase the student is asked to say; wrong options are typical errors of Russian speakers (vowels, final devoicing, stress, can / can't), not random words; no claims about how the speech synthesizer sounds without the author's verdict.
${extra.ipa ? '\nSection "IPA изменилась" (IPA changed) — check that the new pronunciation is American and the stress is on the right syllable.\n' : ''}${extra.marks ? `
Section "Разметка слов" (word markup) — this is how the student sees the words: after / — part of speech (underline colour), CAPITALS — stressed syllable, (letter) — silent. Check: part of speech by the role of the word in this very phrase (course conventions, as in the hand-made grammar: possessive my/your — pronoun; particles of phrasal verbs — adverb; be — verb, in the passive — auxiliary; will — auxiliary; can/could/should — modal; interjections — adverb); stressed syllable as in an American dictionary; silent letters are letters not heard in American pronunciation. A final silent e (make, here) is not marked on purpose — not an error. Write each error with the card id and the word.
` : ''}
Answer only as a list: "blocker / important / minor — card id — what is wrong — how to fix". Nothing found — one line "no issues". Up to 300 words.`;

function main() {
  const argv = process.argv.slice(2);
  const bi = argv.indexOf('--base');
  let base = bi >= 0 ? argv[bi + 1] : null;
  base = resolveBase(ROOT, base);   // PR поверх другого PR — его ветка-основа, иначе origin/main
  fs.mkdirSync(OUT, { recursive: true });
  const full = git(['diff', base]);
  const cd = codeDiff(full);
  const paths = { code: path.join(OUT, 'code.diff'), content: path.join(OUT, 'content.md'), guard: path.join(OUT, 'guard.txt'), root: ROOT, base: base.slice(0, 12) };
  const skippedNote = Object.entries(cd.skipped).map(([f, n]) => `${f}: ${n}`).join(', ');
  fs.writeFileSync(paths.code, `# Дифф кода против ${base.slice(0, 7)}. Не включены: сгенерированные ${cd.generated.join(', ') || '—'}; строки данных карточек — ${skippedNote || '—'} (они в content.md)\n` + cd.text);

  // Карточки до/после
  const show = (f) => { const t = git(['show', `${base}:js/${f}.js`]); return t || null; };
  let content = '', counts = { added: 0, changed: 0, partsOnly: 0, removed: 0 };
  const extra = { marks: 0, ipa: 0 };
  // Движок разметки или словари изменились → педагогу случайная выборка размеченных фраз по всему курсу
  const engineChanged = git(['diff', '--name-only', base]).split('\n').some((f) => ENGINE.test(f.trim()));
  try {
    const A = loadCards(show), B = loadCards(ROOT);
    const d = cardDiff(A.cards, B.cards);
    counts = { added: d.added.length, changed: d.changed.length, partsOnly: d.partsOnly.length, removed: d.removed.length };
    // Новый материал (тексты новых карточек): в старых тестах он мог стать «неверным» вариантом, который на деле верен
    const fresh = new Set();
    d.added.forEach((id) => { const p = stripParts(body(B.cards.get(id).card)); [p.front, p.translation, ...(p.examples || []).flatMap((e) => [e.text, e.ru])].filter(Boolean).forEach((t) => fresh.add(String(t).trim())); });
    const blocks = d.added.map((id) => cardText(id, B.cards.get(id), 'новая'));
    const shown = [...d.added];   // карточки, чей текст педагог увидит (без тех, где пересобраны лишь тесты)
    const testOnly = [];
    let testOnlyTotal = 0;
    for (const id of d.changed) {
      const a = stripParts(body(A.cards.get(id).card)), b = stripParts(body(B.cards.get(id).card));
      const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
      if (keys.length === 1 && keys[0] === 'test') {
        // Пересобраны только варианты тестов: педагогу — лишь вопросы, где новый материал стал неверным вариантом
        // и похож на верный ответ (общие слова или оба — короткие реакции): так появляются два верных ответа
        (b.test || []).forEach((t) => {
          const right = (t.options || [])[t.correct];
          (t.options || []).forEach((o, i) => {
            if (i === t.correct || !fresh.has(String(o).trim())) return;
            const sim = similarity(right, o);
            if (sim >= 0.5) testOnly.push({ sim, line: `${id}: ${clip(t.q, 140)} → ${(t.options || []).map((x, k) => (k === t.correct ? '✓' : '✗') + clip(x, 60) + (k === i ? '*' : '')).join(' · ')}` });
          });
        });
        testOnlyTotal++;
        continue;
      }
      blocks.push(cardText(id, B.cards.get(id), 'изменена: ' + keys.join(', ')));
      shown.push(id);
    }
    const testOnlyCards = testOnlyTotal;
    content = `# Карточки для педагога: новых ${d.added.length}, изменённых ${blocks.length - d.added.length}, удалено ${d.removed.length}` +
      (testOnlyCards ? `; ещё у ${testOnlyCards} старых карточек пересобраны варианты тестов — ниже только вопросы, где новый материал (*) похож на верный ответ: проверь, что он и правда неверен` : '') +
      (d.partsOnly.length ? `; ${d.partsOnly.length} — только разметка слов (IPA, подчёркивания), смотреть не нужно` : '') +
      (d.removed.length ? `\nУдалены: ${d.removed.slice(0, 30).join(', ')}` : '') + '\n\n' + blocks.join('\n\n') + '\n' +
      (testOnly.length ? `\n## Новый материал (*) — неверный вариант, похожий на верный ответ (${testOnly.length}${testOnly.length > 80 ? ', первые 80' : ''})\n` +
        testOnly.sort((x, y) => y.sim - x.sim).slice(0, 80).map((x) => x.line).join('\n') + '\n' : '');
    const ipa = ipaChanges(A.cards, B.cards);
    if (ipa.length) {
      extra.ipa = ipa.length;
      content += `\n## IPA изменилась (${ipa.length}${ipa.length > 60 ? ', первые 60' : ''})\n` + ipa.slice(0, 60).join('\n') + '\n';
    }
    const seed = parseInt(git(['rev-parse', 'HEAD']).trim().slice(0, 8), 16) || 20261007;
    const sample = B.files.includes('word_marks') ? marksSample(B.cards, shown, { random: engineChanged, seed }) : [];
    if (sample.length) {
      extra.marks = sample.length;
      content += `\n## Разметка слов (${sample.length} фраз: ${shown.length ? 'новые и изменённые карточки' : ''}` +
        `${engineChanged ? (shown.length ? ' + ' : '') + 'случайно по курсу — менялся движок разметки' : ''})\n` +
        'Формат: слово/часть речи; ЗАГЛАВНЫЕ — ударный слог; (буква) — немая.\n' + sample.join('\n') + '\n';
    }
  } catch (e) {
    content = `# Карточки сравнить не удалось: ${e.message}\n`;
  }
  fs.writeFileSync(paths.content, content);
  const HERE = path.dirname(fileURLToPath(import.meta.url));
  const g = spawnSync(process.execPath, [path.join(HERE, 'er-guard.mjs'), '--base', base, '--out', paths.guard], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ER_ROOT: ROOT } });
  if (!fs.existsSync(paths.guard)) fs.writeFileSync(paths.guard, g.stdout || 'сторож не отработал\n');
  // Сгенерированные словари: ревизору-код — числа записей, раз сам дифф он не видит
  const cardsChanged = counts.added + counts.changed + counts.removed > 0;
  const dicts = git(['diff', '--name-only', base]).split('\n').map((f) => f.trim()).filter((f) => DICTS.test(f)).map((f) => {
    let after = '';
    try { after = fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch { /* файл удалён */ }
    return dictNote(f, dictStats(git(['show', `${base}:${f}`]), after), cardsChanged);
  });
  fs.writeFileSync(path.join(OUT, 'prompt-code.md'), codePrompt(paths, dicts) + '\n');
  fs.writeFileSync(path.join(OUT, 'prompt-pedagogue.md'), pedagoguePrompt(paths, extra) + '\n');
  const kb = (n) => (n / 1024).toFixed(0) + ' КБ';
  const size = (f) => fs.statSync(f).size;
  const needPed = counts.added + counts.changed + counts.removed + extra.ipa > 0 || engineChanged;
  console.log(`РЕВИЗИЯ → ${OUT}/: полный дифф ${kb(full.length)}; ревизору кода ${kb(size(paths.code))} (без: ${cd.generated.join(', ') || '—'}${skippedNote ? '; строки данных ' + skippedNote : ''})` +
    `; педагогу ${kb(size(paths.content))} (карточек: новых ${counts.added}, изменённых ${counts.changed}, удалено ${counts.removed}${counts.partsOnly ? ', только разметка ' + counts.partsOnly : ''}` +
    `${extra.ipa ? `; IPA изменилась у ${extra.ipa} слов` : ''}${extra.marks ? `; разметка: ${extra.marks} фраз` : ''})`);
  if (dicts.length) console.log(`Словари (ревизору-код — числами): ${dicts.map((d) => d.line).join('; ')}`);
  console.log(`Задания: ${OUT}/prompt-code.md${needPed ? ` и ${OUT}/prompt-pedagogue.md — оба субагента одним сообщением` : ' (педагог не нужен: текст карточек и разметка не менялись)'}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();
