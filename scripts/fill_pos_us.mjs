#!/usr/bin/env node
/**
 * scripts/fill_pos_us.mjs — словарь частей речи слов курса → js/pos_us.js (dev-инструментарий).
 *
 *   git clone --depth 1 https://github.com/globalwordnet/english-wordnet /tmp/oewn
 *   node scripts/fill_pos_us.mjs /tmp/oewn              # пересобрать js/pos_us.js
 *   node scripts/fill_pos_us.mjs /tmp/oewn --no-author  # без ручной разметки курса — для честного замера точности
 *   node scripts/fill_pos_us.mjs /tmp/oewn --out файл   # писать в другой файл
 *
 * Для каждого слова из примеров курса — возможные части речи по убыванию веса. Источники:
 * поле pos карточек «Слов» (вес 200) > ручная разметка parts в курсе (15 за вхождение) >
 * Open English WordNet: число значений слова в каждой части речи (CC BY 4.0, на основе Princeton
 * WordNet 3.1). Словоформы (works, studied, bigger, went) — через леммы и формы WordNet.
 * Закрытые классы (артикли, местоимения, предлоги, вспомогательные…) живут в js/word_marks.js.
 * Скрипт ничего не меняет, кроме выходного файла; порядок ключей стабильный — диффы маленькие.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (root, f) => fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8');
const CONTENT = ['content_grammar', 'content_vocab', 'content_extra', 'content_pro', 'content_us', 'content_words', 'lex_us'];

/* ---------- Open English WordNet (src/yaml/entries-*.yaml) ---------- */
export function loadOewn(dir) {
  const yamlDir = fs.existsSync(path.join(dir, 'src', 'yaml')) ? path.join(dir, 'src', 'yaml') : dir;
  const lemmas = new Map();   // лемма → {n, v, a, d: число значений}
  const forms = new Map();    // словоформа → [{lemma, pos}]
  const POS = { n: 'n', v: 'v', a: 'a', s: 'a', r: 'd' };
  for (const f of fs.readdirSync(yamlDir).filter((x) => /^entries-.*\.yaml$/.test(x))) {
    let lemma = null, pos = null, block = null;
    for (const line of fs.readFileSync(path.join(yamlDir, f), 'utf8').split('\n')) {
      let m;
      if ((m = line.match(/^(\S.*):\s*$/))) {
        lemma = m[1].replace(/^['"]|['"]$/g, '').toLowerCase();
        if (/\s/.test(lemma)) lemma = null;
        pos = null; block = null; continue;
      }
      if (!lemma) continue;
      if ((m = line.match(/^ {2}([nvasr])(?:-\d+)?:\s*$/))) { pos = POS[m[1]]; block = null; continue; }   // tear: n-1 / n-2 — омографы
      if (!pos) continue;
      if ((m = line.match(/^ {4}(\w+):/))) { block = m[1]; continue; }
      if (block === 'sense' && /^ {4}- /.test(line)) {
        const rec = lemmas.get(lemma) || { n: 0, v: 0, a: 0, d: 0 };
        rec[pos]++;
        lemmas.set(lemma, rec);
      } else if (block === 'form' && (m = line.match(/^ {4}- (.+)$/))) {
        const form = m[1].replace(/^['"]|['"]$/g, '').toLowerCase();
        const arr = forms.get(form) || [];
        arr.push({ lemma, pos });
        forms.set(form, arr);
      }
    }
  }
  return { lemmas, forms };
}

/* ---------- Слова курса, ручная разметка, поля pos карточек ---------- */
export function courseData(root = ROOT) {
  const ctx = { console: { log() {}, warn() {}, error() {} } };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(CONTENT.map((f) => read(root, f)).join('\n;\n') + ';this.__G = GRAMMAR_CARDS;', ctx);
  const wm = { console };
  vm.createContext(wm);
  vm.runInContext(read(root, 'word_marks') + ';this.__WM = WordMarks;', wm);
  const WM = wm.__WM;
  const lists = [ctx.__G, ctx.WORD_CARDS, ctx.PHRASAL_CARDS, ctx.COLLOCATION_CARDS, ctx.IDIOM_CARDS, ctx.CONVERSATION_CARDS,
    ctx.SLANG_CARDS, ctx.MINIMAL_PAIR_CARDS, ctx.READING_CARDS, ctx.PRO_READINGS, ...Object.values(ctx.PRO_CONTENT || {})].filter(Array.isArray);
  const words = new Map(), author = new Map(), lower = new Set(), labels = new Map();
  const CODE = { noun: 'n', verb: 'v', adj: 'a', adv: 'd', prep: 'p', pron: 'r', conj: 'c', det: 't', num: 'u', aux: 'x', modal: 'm', part: 'q' };
  const seen = new Set();
  const walk = (o, d, fn) => { if (!o || typeof o !== 'object' || d > 7) return; if (Array.isArray(o.parts)) fn(o.parts); for (const v of Object.values(o)) if (v && typeof v === 'object') walk(v, d + 1, fn); };
  for (const arr of lists) for (const c of arr) {
    if (!c || seen.has(c.id)) continue;
    seen.add(c.id);
    walk(c.payload, 0, (parts) => parts.forEach((p, i) => {
      const b = WM.bareOf(p && p.word).replace(/'s$/, '');
      if (!b || !/[a-z]/.test(b)) return;
      words.set(b, (words.get(b) || 0) + 1);
      const first = i === 0 || /[.!?:;»"”)—]$/.test(String(parts[i - 1].word || ''));
      if (!/^[«"“(]?[A-Z]/.test(p.word) || first) lower.add(b);
      if (p.pos && CODE[p.pos]) {
        const m = author.get(b) || {};
        m[CODE[p.pos]] = (m[CODE[p.pos]] || 0) + 1;
        author.set(b, m);
      }
    }));
  }
  for (const c of ctx.WORD_CARDS || []) {
    const pl = c.payload;
    if (!pl || /\s/.test(pl.front)) continue;
    const codes = String(pl.pos).split(/,\s*/).map((x) => CODE[WM.RU_POS[x.trim()]]).filter(Boolean).join('');
    if (codes) labels.set(pl.front.toLowerCase(), codes);
  }
  return { words, author, labels, lower, closed: (b) => !!(WM.CLOSED[b] || WM.CTX_WORDS.includes(b)) };
}

/* ---------- Сборка словаря ---------- */
// Словоформа → варианты [лемма, допустимые части речи, вес]
function analyses(w, forms) {
  const out = [[w, 'nvad', 1]];
  for (const f of forms.get(w) || []) out.push([f.lemma, f.pos === 'a' ? 'a' : f.pos, 0.8]);
  const add = (lemma, allowed) => { if (lemma && lemma.length > 1) out.push([lemma, allowed, 0.6]); };
  if (/ies$/.test(w)) add(w.slice(0, -3) + 'y', 'nv');
  if (/(s|x|z|ch|sh|o)es$/.test(w)) add(w.slice(0, -2), 'nv');
  if (/[^s]s$/.test(w)) add(w.slice(0, -1), 'nv');
  if (/ied$/.test(w)) add(w.slice(0, -3) + 'y', 'v');
  if (/ed$/.test(w)) { add(w.slice(0, -2), 'v'); add(w.slice(0, -1), 'v'); if (/([^aeiou])\1ed$/.test(w)) add(w.slice(0, -3), 'v'); }
  if (/ying$/.test(w)) add(w.slice(0, -4) + 'ie', 'v');
  if (/ing$/.test(w)) { add(w.slice(0, -3), 'v'); add(w.slice(0, -3) + 'e', 'v'); if (/([^aeiou])\1ing$/.test(w)) add(w.slice(0, -4), 'v'); }
  if (/i(er|est)$/.test(w)) add(w.replace(/i(er|est)$/, 'y'), 'a');
  if (/(er|est)$/.test(w)) { const b = w.replace(/(er|est)$/, ''); add(b, 'a'); add(b + 'e', 'a'); if (/([^aeiou])\1$/.test(b)) add(b.slice(0, -1), 'a'); }
  return out;
}

export function buildLexicon({ words, author, labels, lower, closed }, oewn, opt = {}) {
  const lex = new Map(), unknown = [];
  const ORDER = 'nvadpr';
  for (const w of [...words.keys()].sort()) {
    if (closed(w) || !/^[a-z][a-z']*$/.test(w)) continue;
    const score = {};
    const bump = (t, v) => { score[t] = (score[t] || 0) + v; };
    for (const [lemma, allowed, k] of analyses(w, oewn.lemmas.size ? oewn.forms : new Map())) {
      const rec = oewn.lemmas.get(lemma);
      if (!rec) continue;
      for (const t of 'nvad') if (allowed.includes(t) && rec[t]) bump(t, k * Math.min(rec[t], 20));
    }
    // Ручная разметка курса: подтверждает часть речи, но не перевешивает WordNet (многие ручные метки — из
    // контекстно-свободных лексиконов content_*.js)
    if (!opt.noAuthor) for (const [t, cnt] of Object.entries(author.get(w) || {})) if ('nvad'.includes(t)) bump(t, Math.min(10 * cnt, 30));
    // Поле pos карточки «Слов» ставит свою часть речи первой, но не вычёркивает другие (a call — сущ.)
    const base = Math.max(0, ...Object.values(score));
    const label = [...(labels.get(w) || '')].filter((t) => 'nvad'.includes(t));
    label.forEach((t, k) => bump(t, 1000 - k));
    if (!base && !label.length) { if (lower.has(w)) unknown.push(w); continue; }
    const tags = Object.keys(score).filter((t) => label.includes(t) || score[t] >= 0.08 * base)
      .sort((a, b) => score[b] - score[a] || ORDER.indexOf(a) - ORDER.indexOf(b)).slice(0, 3).join('');
    lex.set(w, tags);
  }
  return { lex, unknown };
}

export function renderFile(lex) {
  const body = [...lex.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([w, t]) => `${JSON.stringify(w)}:${JSON.stringify(t)}`);
  const lines = [];
  for (let i = 0; i < body.length; i += 12) lines.push('    ' + body.slice(i, i + 12).join(','));
  return `/* ==========================================================================
   English Reboot — части речи слов из примеров курса (американский английский)
   Файл: pos_us.js — слово → возможные части речи по убыванию веса: n — сущ., v — глаг.,
   a — прил., d — нареч. Какую взять в предложении, решает js/word_marks.js по соседним словам;
   закрытые классы (артикли, местоимения, предлоги, вспомогательные, числительные) — там же.
   Сгенерирован scripts/fill_pos_us.mjs (${lex.size} слов) из: поля pos карточек «Слов», ручной разметки
   курса и Open English WordNet — https://github.com/globalwordnet/english-wordnet, CC BY 4.0,
   © The Open English Wordnet team; основан на Princeton WordNet: WordNet 3.1 Copyright 2011
   by Princeton University. All rights reserved. THIS SOFTWARE AND DATABASE IS PROVIDED "AS IS"
   AND PRINCETON UNIVERSITY MAKES NO REPRESENTATIONS OR WARRANTIES, EXPRESS OR IMPLIED.
   Руками не править: новые слова дописывает скрипт (или поле pos карточки «Слов»).
   ========================================================================== */
(() => {
  'use strict';
  const POS_US = {
${lines.join(',\n')},
  };
  window.POS_US = POS_US;
})();
`;
}

function main() {
  const argv = process.argv.slice(2);
  const dir = argv.find((a) => !a.startsWith('--'));
  if (!dir || !fs.existsSync(dir)) { console.error('Укажи путь к клону english-wordnet (см. шапку скрипта)'); process.exit(2); }
  const oi = argv.indexOf('--out');
  const out = oi >= 0 ? argv[oi + 1] : path.join(ROOT, 'js', 'pos_us.js');
  const oewn = loadOewn(dir);
  const data = courseData(ROOT);
  const { lex, unknown } = buildLexicon(data, oewn, { noAuthor: argv.includes('--no-author') });
  fs.writeFileSync(out, renderFile(lex));
  console.log(`pos_us: ${lex.size} слов → ${path.relative(ROOT, out)}; WordNet: ${oewn.lemmas.size} лемм; без части речи (угадает word_marks.js): ${unknown.length}${unknown.length ? ' — ' + unknown.slice(0, argv.includes('--all') ? 1e9 : 40).join(', ') : ''}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();
