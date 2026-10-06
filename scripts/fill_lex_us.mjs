/**
 * scripts/fill_lex_us.mjs — дописать в js/lex_us.js слова из примеров, у которых нет IPA (этап 7).
 * Dev-инструментарий. Запуск: node scripts/fill_lex_us.mjs путь/к/cmudict.dict
 * Источник — CMU (BSD-2-Clause), перевод в IPA — scripts/cmu_ipa.mjs (совпадает с lex_us.js).
 * Номер ударного слога (для подсветки в написании) пишется, только если число слогов в написании
 * (annotate.js → splitSyllables) совпадает с числом гласных в CMU — иначе подсветки не будет.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { loadCmu } from './cmu_ipa.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (f) => fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8');
const cmuFile = process.argv[2];
if (!cmuFile) { console.error('Укажи путь к cmudict.dict'); process.exit(1); }

const raw = new Map();
for (const line of fs.readFileSync(cmuFile, 'utf8').split('\n')) {
  const m = line.match(/^([^\s(]+)\s+([^#]+)/); // только основной вариант
  if (m && !raw.has(m[1].toLowerCase())) raw.set(m[1].toLowerCase(), m[2].trim());
}
const cmu = loadCmu(cmuFile);

const ctx = { console: { log() {}, warn() {}, error() {} } };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(['content_grammar', 'content_vocab', 'content_extra', 'content_pro', 'content_us', 'content_words', 'lex_us']
  .map(read).join('\n;\n') + ';this.__G = GRAMMAR_CARDS;', ctx);
const actx = { console, window: {} };
vm.createContext(actx);
vm.runInContext(read('annotate') + ';this.__A = Annotate;', actx);

const missing = new Set();
const walk = (o, d) => {
  if (!o || typeof o !== 'object' || d > 7) return;
  if (Array.isArray(o.parts)) o.parts.forEach((p) => { if (p && !p.ipa && /[a-z]/i.test(p.word)) missing.add(String(p.word).toLowerCase().replace(/[^a-z']/g, '').replace(/'s$/, '').replace(/^'+|'+$/g, '')); });
  for (const v of Object.values(o)) if (v && typeof v === 'object') walk(v, d + 1);
};
[ctx.__G, ctx.WORD_CARDS, ctx.PHRASAL_CARDS, ctx.COLLOCATION_CARDS, ctx.IDIOM_CARDS, ctx.CONVERSATION_CARDS, ctx.SLANG_CARDS,
  ctx.MINIMAL_PAIR_CARDS, ctx.READING_CARDS, ctx.PRO_READINGS, ...Object.values(ctx.PRO_CONTENT || {})]
  .forEach((a) => (a || []).forEach((c) => walk(c && c.payload, 0)));

const add = {}, notFound = [];
for (const w of [...missing].filter(Boolean).sort()) {
  const ipa = cmu.get(w) && cmu.get(w)[0];
  if (!ipa) { notFound.push(w); continue; }
  const vowels = raw.get(w).split(/\s+/).filter((x) => /\d$/.test(x));
  const syl = actx.__A.splitSyllables(w);
  const si = vowels.findIndex((x) => x.endsWith('1'));
  add[w] = syl && syl.length === vowels.length && vowels.length > 1 && si >= 0 ? `${ipa}|${si}` : ipa;
}

let src = read('lex_us');
const entries = Object.entries(add).map(([w, v]) => `${JSON.stringify(w)}:${JSON.stringify(v)}`).join(',');
if (entries) {
  src = src.replace(/(const LEX_US = \{)/, `$1${entries},`);
  fs.writeFileSync(path.join(ROOT, 'js', 'lex_us.js'), src);
}
console.log('Добавлено в lex_us.js:', Object.keys(add).length, add);
if (notFound.length) console.log('Нет в CMU (нужно вручную):', notFound);
