#!/usr/bin/env node
/**
 * scripts/er-usage.mjs — сколько токенов съела итерация и на чём (dev-инструмент скиллов .claude/skills/er-*).
 *
 * Читает транскрипт сессии Claude Code (~/.claude/projects/<папка>/<сессия>.jsonl и транскрипты субагентов
 * в <сессия>/subagents/) и печатает несколько строк: ходы, прочитанный контекст, вывод, доля кэша,
 * субагенты и самые крупные результаты инструментов — то, что раздувает контекст на все следующие ходы.
 *
 *   node scripts/er.mjs usage                 # с начала итерации (метка er start) или всей сессии
 *   node scripts/er.mjs usage --all           # вся сессия
 *   node scripts/er.mjs usage --journal       # одна строка «Токены: …» для записи журнала
 *   node scripts/er.mjs usage --record "<итерация>"   # дописать итог в docs/evolution/agent-usage.jsonl
 *   ER_TRANSCRIPT=<файл.jsonl>                # явный транскрипт (иначе — самый свежий)
 *
 * Только числа и имена инструментов: текст транскрипта (данные автора) никуда не пишется.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = process.env.ER_ROOT ? path.resolve(process.env.ER_ROOT) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TMP = process.env.ER_TMP || '/tmp/er';
export const HISTORY = 'docs/evolution/agent-usage.jsonl';
/** Результат инструмента крупнее этого (символов) — кандидат в урок: его можно было получить тише */
export const BIG = 12000;

export function parseLines(text) {
  return String(text || '').split('\n').map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

const textOf = (c) => (typeof c === 'string' ? c : Array.isArray(c) ? c.map((x) => (x.type === 'text' ? x.text : x.type === 'image' ? '[картинка]' : '')).join('') : '');
const kTok = (n) => (n >= 1e6 ? (n / 1e6).toFixed(2).replace('.', ',') + ' млн' : n >= 1000 ? Math.round(n / 1000) + 'k' : String(n));

/** Короткое имя вызова: Bash — первая строка команды, Read — файл, остальные — имя инструмента */
export function callLabel(u) {
  const i = u.input || {};
  if (u.name === 'Bash') return 'Bash: ' + String(i.command || '').split('\n')[0].replace(/^cd \S+ && /, '').slice(0, 70);
  if (u.name === 'Read') return 'Read: ' + String(i.file_path || '').replace(/^.*english-reboot\//, '') + (i.limit ? ` (${i.offset || 0}+${i.limit})` : ' (целиком)');
  if (u.name === 'Grep') return `Grep: ${String(i.pattern || '').slice(0, 40)}`;
  if (u.name === 'Agent') return 'Agent: ' + String(i.description || '').slice(0, 50);
  return u.name;
}

/**
 * Итог по записям транскрипта. sinceMs — учитывать только ходы не раньше этой метки.
 * Ходы модели при потоковой записи дробятся на несколько строк с одним message.id — считаются один раз.
 */
export function usageOf(entries, sinceMs = 0) {
  const R = { turns: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0, maxContext: 0, calls: {}, big: [], violations: [] };
  const seen = new Set();
  const uses = new Map();
  for (const o of entries) {
    const t = o.timestamp ? Date.parse(o.timestamp) : 0;
    if (sinceMs && t && t < sinceMs) continue;
    const m = o.message;
    if (o.type === 'assistant' && m) {
      for (const c of Array.isArray(m.content) ? m.content : []) if (c.type === 'tool_use') {
        uses.set(c.id, c);
        R.calls[c.name] = (R.calls[c.name] || 0) + 1;
        if (c.name === 'Bash' && /\bnpm (run )?test(:e2e)?\b(?![^\n]*--reporter=(dot|line))/.test(String(c.input?.command || ''))) R.violations.push('прямой npm test: ' + callLabel(c));
      }
      const u = m.usage;
      if (!u || (m.id && seen.has(m.id))) continue;
      if (m.id) seen.add(m.id);
      R.turns++;
      R.input += u.input_tokens || 0;
      R.cacheRead += u.cache_read_input_tokens || 0;
      R.cacheWrite += u.cache_creation_input_tokens || 0;
      R.output += u.output_tokens || 0;
      R.maxContext = Math.max(R.maxContext, (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0));
    }
    if (o.type === 'user' && m && Array.isArray(m.content)) {
      for (const c of m.content) if (c.type === 'tool_result') {
        const size = textOf(c.content).length;
        const u = uses.get(c.tool_use_id);
        // инструкции скилла читаются целиком по правилу — это не урок
        if (size >= BIG && !(u && u.name === 'Read' && /SKILL\.md$/.test(String(u.input?.file_path || '')))) R.big.push({ label: u ? callLabel(u) : 'инструмент', size });
      }
    }
  }
  R.big.sort((a, b) => b.size - a.size);
  R.context = R.input + R.cacheRead + R.cacheWrite;
  return R;
}

export function formatUsage(main, subs = [], scope = '') {
  const all = [main, ...subs];
  const sum = (k) => all.reduce((s, r) => s + r[k], 0);
  const ctx = sum('context'), cache = ctx ? Math.round((100 * sum('cacheRead')) / ctx) : 0;
  const L = [`ТОКЕНЫ${scope ? ` (${scope})` : ''}: ходов ${sum('turns')}, прочитано контекста ${kTok(ctx)} (из кэша ${cache}%), вывод ${kTok(sum('output'))}, ` +
    `пик контекста ${kTok(main.maxContext)}${subs.length ? `; субагентов ${subs.length} — ${kTok(subs.reduce((s, r) => s + r.context, 0))} из них` : ''}`];
  const calls = Object.entries(main.calls).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n, c]) => `${n} ${c}`).join(', ');
  if (calls) L.push(`  вызовы: ${calls}`);
  const big = all.flatMap((r) => r.big).sort((a, b) => b.size - a.size);
  for (const b of big.slice(0, 5)) L.push(`  крупный вывод ~${kTok(Math.round(b.size / 4))}: ${b.label} — урок: получить тише (er …, grep, offset/limit)`);
  for (const v of all.flatMap((r) => r.violations).slice(0, 3)) L.push(`  ✗ ${v} — только er test / er e2e`);
  return L.join('\n');
}

export function journalLine(main, subs = []) {
  const all = [main, ...subs];
  const ctx = all.reduce((s, r) => s + r.context, 0);
  return `Токены: контекст ${kTok(ctx)}, вывод ${kTok(all.reduce((s, r) => s + r.output, 0))}, ходов ${all.reduce((s, r) => s + r.turns, 0)}, субагентов ${subs.length}, крупных выводов ${all.reduce((s, r) => s + r.big.length, 0)}`;
}

/** Строки истории (docs/evolution/agent-usage.jsonl) → сводка последних N итераций для er start */
export function historyLine(lines, n = 3) {
  const H = parseLines(lines).filter((h) => h.context);
  if (!H.length) return '';
  const last = H.slice(-n);
  const avg = Math.round(H.reduce((s, h) => s + h.context, 0) / H.length);
  return `ТОКЕНЫ ИТЕРАЦИЙ (среднее ${kTok(avg)} контекста по ${H.length}): ` + last.map((h) => `${h.date} ${kTok(h.context)}${h.big ? ` (крупных ${h.big})` : ''}`).join(' · ');
}

/* ───────────── поиск транскрипта ───────────── */

export function findTranscript(home = os.homedir()) {
  if (process.env.ER_TRANSCRIPT) return process.env.ER_TRANSCRIPT;
  const base = path.join(home, '.claude', 'projects');
  let best = null;
  try {
    for (const d of fs.readdirSync(base)) for (const f of fs.readdirSync(path.join(base, d))) {
      if (!f.endsWith('.jsonl')) continue;
      const p = path.join(base, d, f), mt = fs.statSync(p).mtimeMs;
      if (!best || mt > best.mt) best = { p, mt };
    }
  } catch { /* нет папки — нет транскрипта */ }
  return best && best.p;
}

const subagentFiles = (tr) => { const dir = path.join(tr.replace(/\.jsonl$/, ''), 'subagents'); try { return fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl')).map((f) => path.join(dir, f)); } catch { return []; } };
const iterStart = () => { try { return JSON.parse(fs.readFileSync(path.join(TMP, 'iter.json'), 'utf8')).at || 0; } catch { return 0; } };

function main() {
  const argv = process.argv.slice(2);
  const tr = findTranscript();
  if (!tr || !fs.existsSync(tr)) { console.log('ТОКЕНЫ: транскрипт сессии не найден (ER_TRANSCRIPT=<файл.jsonl>) — учёт пропущен'); return 0; }
  const since = argv.includes('--all') ? 0 : iterStart();
  const entries = parseLines(fs.readFileSync(tr, 'utf8'));
  const main_ = usageOf(entries.filter((o) => !o.isSidechain), since);
  const subs = subagentFiles(tr).map((f) => usageOf(parseLines(fs.readFileSync(f, 'utf8')), since)).filter((r) => r.turns);
  const side = usageOf(entries.filter((o) => o.isSidechain), since);
  if (side.turns) subs.push(side);
  const scope = since ? `с er start ${new Date(since).toISOString().slice(11, 16)} UTC` : 'вся сессия';
  if (argv.includes('--journal')) { console.log(journalLine(main_, subs)); return 0; }
  const ri = argv.indexOf('--record');
  if (ri >= 0) {
    const all = [main_, ...subs];
    const rec = { date: new Date().toISOString().slice(0, 10), iteration: String(argv[ri + 1] || '').slice(0, 120),
      context: all.reduce((s, r) => s + r.context, 0), output: all.reduce((s, r) => s + r.output, 0),
      turns: all.reduce((s, r) => s + r.turns, 0), subagents: subs.length, big: all.reduce((s, r) => s + r.big.length, 0) };
    const f = path.join(ROOT, HISTORY);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.appendFileSync(f, JSON.stringify(rec) + '\n');
    console.log(`записано в ${HISTORY}: ${journalLine(main_, subs)}`);
    return 0;
  }
  console.log(formatUsage(main_, subs, scope));
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) process.exit(main());
