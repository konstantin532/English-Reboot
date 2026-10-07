/**
 * scripts/er-cards.mjs — все карточки курса из любой рабочей копии (dev-инструмент скилла english-reboot-evolve).
 * Общий загрузчик для er-guard (какие *_VERSION поднимать) и er-review (дайджест карточек педагогу).
 * Грузит js/*.js так же, как index.html: контент → lex_us → pos_us → word_marks (что есть в этой копии).
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

// Раздел → константа версии, по которой app.js / gamify.js пересидирует карточки в IndexedDB
export const GROUP_VERSION = { grammar: 'CONTENT_VERSION', vocab: 'VOCAB_VERSION', extra: 'EXTRA_VERSION', words: 'WORDS_VERSION', pro: 'PRO_VERSION' };
const FILES = ['content_grammar', 'content_vocab', 'content_extra', 'content_pro', 'content_us', 'content_words', 'improv_us',
  'lex_us', 'pos_us', 'word_marks'];

/** root (папка с js/) или функция f → текст файла → Map id → { group, card } */
export function loadCards(source) {
  const read = typeof source === 'function' ? source
    : (f) => { try { return fs.readFileSync(path.join(source, 'js', f + '.js'), 'utf8'); } catch { return null; } };
  const code = FILES.map((f) => [f, read(f)]).filter(([, t]) => t !== null && t !== undefined);
  const ctx = { console: { log() {}, warn() {}, error() {} } };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(code.map(([, t]) => t).join('\n;\n') +
    ';this.__G = typeof GRAMMAR_CARDS !== "undefined" ? GRAMMAR_CARDS : [];' +
    'this.__IMP = typeof IMPROV_CARDS !== "undefined" ? IMPROV_CARDS : [];', ctx);
  const out = new Map();
  const put = (group, arr) => (Array.isArray(arr) ? arr : []).forEach((c) => { if (c && c.id && !out.has(c.id)) out.set(c.id, { group, card: c }); });
  // Сначала PRO: его карточки сидирует gamify.js по PRO_VERSION
  Object.values(ctx.PRO_CONTENT || {}).forEach((a) => put('pro', a));
  put('grammar', ctx.__G);
  ['PHRASAL_CARDS', 'COLLOCATION_CARDS', 'IDIOM_CARDS'].forEach((n) => put('vocab', ctx[n]));
  ['CONVERSATION_CARDS', 'SLANG_CARDS', 'MINIMAL_PAIR_CARDS', 'READING_CARDS'].forEach((n) => put('extra', ctx[n]));
  put('words', ctx.WORD_CARDS);
  put('improv', ctx.__IMP);
  return { cards: out, files: code.map(([f]) => f) };
}

/** Копия без разметки слов (parts): для педагога важен текст, а не IPA и подчёркивания */
export function stripParts(o) {
  if (Array.isArray(o)) return o.map(stripParts);
  if (!o || typeof o !== 'object') return o;
  const r = {};
  for (const [k, v] of Object.entries(o)) if (k !== 'parts') r[k] = stripParts(v);
  return r;
}

/** Содержимое карточки: payload, а у импровизаций (без payload) — сама карточка */
export const body = (card) => (card && card.payload) || card || {};

/** Карточки «до» и «после» → новые, удалённые, изменённые по тексту и изменённые только разметкой */
export function cardDiff(before, after) {
  const added = [], removed = [], changed = [], partsOnly = [];
  for (const [id, a] of after) {
    const b = before.get(id);
    if (!b) { added.push(id); continue; }
    const ja = JSON.stringify(body(a.card)), jb = JSON.stringify(body(b.card));
    if (ja === jb) continue;
    if (JSON.stringify(stripParts(body(a.card))) === JSON.stringify(stripParts(body(b.card)))) partsOnly.push(id);
    else changed.push(id);
  }
  for (const id of before.keys()) if (!after.has(id)) removed.push(id);
  return { added, removed, changed, partsOnly };
}
