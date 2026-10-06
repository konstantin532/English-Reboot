/**
 * scripts/content_stats.mjs — табло объёма контента и плана «+4000» (dev-инструментарий).
 * Запуск: node scripts/content_stats.mjs          — таблица в консоль
 *         node scripts/content_stats.mjs --json   — то же в JSON (для «Карты контента»)
 * Считает уникальные карточки по разделам и уровням, разные английские слова в примерах,
 * импровизацию. План «+4000»: всё, что добавлено пакетами по подуровням, несёт поле sublevel
 * (карточки) или level (ситуации импровизации) — по нему и считаем готовое.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Цели плана «+4000» (docs: план от 6 октября 2026) — по подуровням и по типам
export const PLAN = {
  total: 4000,
  sublevels: { 'A1': 650, 'A1+': 600, 'A2': 550, 'A2+': 500, 'B1': 450, 'B1+': 450, 'B2': 400, 'B2+': 400 },
  types: { words: 1600, phrases: 1400, vocab: 500, improv: 300, live: 200 },
};
export const TYPE_LABEL = {
  words: 'Слова', phrases: 'Фразы', vocab: 'Фразовые глаголы, идиомы, коллокации',
  improv: 'Импровизация', live: 'Живая речь и сленг',
};
const SECTION_LABEL = {
  words: 'Слова', grammar: 'Грамматика', phrasal: 'Фразовые глаголы', collocations: 'Коллокации',
  idioms: 'Идиомы', conversation: 'Разговорные фразы', slang: 'Сленг', minimal: 'Minimal Pairs', readings: 'Чтение',
};
const TYPE_OF_SECTION = { words: 'words', conversation: 'phrases', phrasal: 'vocab', collocations: 'vocab', idioms: 'vocab', slang: 'live' };
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

/** Загрузить контент так же, как index.html: классические скрипты в одном контексте. */
export function loadContent(root = ROOT) {
  const read = (f) => fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8');
  const ctx = { console: { log() {}, warn() {}, error() {} } };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(['content_grammar', 'content_vocab', 'content_extra', 'content_pro', 'content_us', 'content_words',
    'improv_us'].map(read).join('\n;\n') + `
;this.__S = { words: typeof WORD_CARDS !== 'undefined' ? WORD_CARDS : [], grammar: GRAMMAR_CARDS, phrasal: PHRASAL_CARDS,
  collocations: COLLOCATION_CARDS, idioms: IDIOM_CARDS, conversation: CONVERSATION_CARDS, slang: SLANG_CARDS,
  minimal: MINIMAL_PAIR_CARDS, readings: READING_CARDS };
this.__PRO = PRO_CONTENT; this.__IMP = IMPROV_CARDS; this.__YA = YES_AND_STORIES;`, ctx);
  // PRO-карточки сидируются в те же разделы (gamify.js → seedPro)
  const PRO_TO = { grammar: 'grammar', phrasal: 'phrasal', colloc: 'collocations', idioms: 'idioms', minimal: 'minimal', readings: 'readings' };
  const sections = {};
  for (const [k, arr] of Object.entries(ctx.__S)) sections[k] = [...(arr || [])];
  for (const [k, arr] of Object.entries(ctx.__PRO || {})) if (PRO_TO[k] && Array.isArray(arr)) sections[PRO_TO[k]].push(...arr);
  return { sections, improv: ctx.__IMP || [], stories: ctx.__YA || [] };
}

function walkParts(o, fn, depth = 0) {
  if (!o || typeof o !== 'object' || depth > 7) return;
  if (Array.isArray(o.parts)) o.parts.forEach(fn);
  for (const v of Object.values(o)) if (v && typeof v === 'object') walkParts(v, fn, depth + 1);
}

/** Чистая функция: { sections: {раздел: [карточки]}, improv: [...], stories: [...] } → цифры. */
export function computeStats(content) {
  const seen = new Set();
  const bySection = {}, byLevel = Object.fromEntries(LEVELS.map((l) => [l, 0]));
  const words = new Set();
  const plan = {
    done: 0,
    sublevels: Object.fromEntries(Object.keys(PLAN.sublevels).map((s) => [s, 0])),
    types: Object.fromEntries(Object.keys(PLAN.types).map((t) => [t, 0])),
  };
  for (const [section, arr] of Object.entries(content.sections || {})) {
    bySection[section] = 0;
    for (const c of arr || []) {
      if (!c || !c.id || seen.has(c.id)) continue; // PRO-карточки могут повторяться в массивах
      seen.add(c.id);
      bySection[section]++;
      if (byLevel[c.level] !== undefined) byLevel[c.level]++;
      walkParts(c.payload, (p) => {
        const w = String((p && p.word) || '').toLowerCase().replace(/[^a-z']/g, '').replace(/^'+|'+$/g, '');
        if (w) words.add(w);
      });
      if (c.sublevel && plan.sublevels[c.sublevel] !== undefined) {
        plan.done++;
        plan.sublevels[c.sublevel]++;
        const t = TYPE_OF_SECTION[section];
        if (t) plan.types[t]++;
      }
    }
  }
  const improv = content.improv || [];
  for (const c of improv) {
    if (c && c.level && plan.sublevels[c.level] !== undefined) {
      plan.done++;
      plan.sublevels[c.level]++;
      plan.types.improv++;
    }
  }
  return {
    total: seen.size,
    bySection, byLevel,
    words: words.size,
    improv: improv.length,
    stories: (content.stories || []).length,
    plan: { ...plan, target: PLAN.total, percent: Math.round((plan.done / PLAN.total) * 1000) / 10 },
  };
}

const bar = (n, of, width = 20) => {
  const k = of ? Math.min(width, Math.round((n / of) * width)) : 0;
  return '█'.repeat(k) + '░'.repeat(width - k);
};
const pct = (n, of) => (of ? Math.round((n / of) * 100) : 0) + '%';

export function formatStats(s) {
  const out = [];
  out.push('English Reboot — объём контента');
  out.push('');
  out.push(`Карточек: ${s.total} · разных английских слов в примерах: ${s.words} · импровизация: ${s.improv} ситуаций + ${s.stories} историй`);
  out.push('По разделам: ' + Object.entries(s.bySection).map(([k, n]) => `${SECTION_LABEL[k] || k} ${n}`).join(' · '));
  out.push('По уровням:  ' + Object.entries(s.byLevel).map(([k, n]) => `${k} ${n}`).join(' · '));
  out.push('');
  out.push(`План «+4000»: ${s.plan.done} из ${s.plan.target} (${s.plan.percent}%)  ${bar(s.plan.done, s.plan.target, 30)}`);
  out.push('');
  out.push('Подуровень  Готово / Цель');
  for (const [sub, goal] of Object.entries(PLAN.sublevels)) {
    const n = s.plan.sublevels[sub];
    out.push(`  ${sub.padEnd(9)} ${String(n).padStart(4)} / ${String(goal).padEnd(4)} ${bar(n, goal)} ${pct(n, goal)}`);
  }
  out.push('');
  out.push('Тип карточек                              Готово / Цель');
  for (const [t, goal] of Object.entries(PLAN.types)) {
    const n = s.plan.types[t];
    out.push(`  ${TYPE_LABEL[t].padEnd(39)} ${String(n).padStart(4)} / ${goal}`);
  }
  return out.join('\n');
}

// Запуск из командной строки (при импорте в тестах — ничего не печатает)
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const s = computeStats(loadContent());
  console.log(process.argv.includes('--json') ? JSON.stringify(s, null, 1) : formatStats(s));
}
