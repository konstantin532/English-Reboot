#!/usr/bin/env node
/**
 * scripts/er-brief.mjs — осмотр проекта одной выжимкой (dev-инструмент скилла english-reboot-evolve, шаг 1).
 *
 * Вместо чтения целиком README, CHANGELOG и docs/EVOLUTION.md (они растут с каждой итерацией)
 * печатает ~30 строк: git, открытые PR, версии, планы автора, эталон, бэклог, последняя итерация,
 * возраст разведки, Unreleased. Полный текст раздела — только когда он нужен:
 *
 *   node scripts/er-brief.mjs                     # выжимка
 *   node scripts/er-brief.mjs --section Бэклог    # один раздел EVOLUTION.md целиком
 *   node scripts/er-brief.mjs --last 2            # две последние записи журнала итераций целиком
 *   node scripts/er-brief.mjs --no-net            # без запросов к GitHub
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseBaseline } from './er-health.mjs';
import { loadCards } from './er-cards.mjs';

// ER_ROOT — проверить другую рабочую копию (git worktree) теми же скриптами
const ROOT = process.env.ER_ROOT ? path.resolve(process.env.ER_ROOT) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch { return ''; } };
const sh = (cmd, args) => { const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', timeout: 30000 }); return r.status === 0 ? r.stdout.trim() : null; };
const cut = (s, n = 110) => { const t = String(s).replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };

/** Разделы markdown по заголовкам уровня `level` → [{ title, body }] */
export function sections(md, level = 2) {
  const re = new RegExp(`^${'#'.repeat(level)} (.+)$`, 'gm');
  const heads = [...String(md).matchAll(re)];
  return heads.map((h, i) => {
    const start = h.index + h[0].length;
    const end = i + 1 < heads.length ? heads[i + 1].index : String(md).length;
    return { title: h[1].trim(), body: String(md).slice(start, end) };
  });
}

/** Пункты-чекбоксы (первая строка пункта) */
export function checkboxes(body) {
  return [...String(body).matchAll(/^\s*- \[( |x|X)\] (.+(?:\n {2,}(?!- ).+)*)/gm)].map((m) => ({ done: m[1] !== ' ', text: m[2] }));
}

/** Дата последней «Разведки» и сколько дней прошло */
export function scoutAge(md, today = new Date()) {
  const dates = [...String(md).matchAll(/^## Разведка (\d{4}-\d{2}-\d{2})/gm)].map((m) => m[1]).sort();
  if (!dates.length) return { date: null, days: null, due: true };
  const last = dates[dates.length - 1];
  const days = Math.floor((today - new Date(last + 'T00:00:00Z')) / 86400000);
  return { date: last, days, due: days > 30 };
}

/** Константы версий: *_VERSION в js/app.js, js/gamify.js, js/db.js и CACHE_VERSION в sw.js */
export function versions(files) {
  const out = {};
  for (const [f, src] of Object.entries(files)) {
    for (const m of String(src).matchAll(/\b([A-Z_]+_VERSION)\s*=\s*('[^']*'|"[^"]*"|\d+)/g)) out[m[1]] = { file: f, value: m[2].replace(/['"]/g, '') };
  }
  return out;
}

function repoSlug() {
  const url = sh('git', ['remote', 'get-url', 'origin']) || '';
  const m = url.match(/github\.com[/:]([^/]+)\/([^/.]+?)(?:\.git)?$/i);
  return m ? `${m[1]}/${m[2]}` : null;
}

function brief(opts) {
  const L = [];
  const evo = read('docs/EVOLUTION.md');
  const S = sections(evo, 2);
  const sec = (name) => (S.find((s) => s.title.startsWith(name)) || { body: '' }).body;

  // git
  const branch = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  const sha = sh('git', ['rev-parse', '--short', 'HEAD']);
  const dirty = (sh('git', ['status', '--porcelain']) || '').split('\n').filter(Boolean);
  L.push(`GIT: ${branch}@${sha}${dirty.length ? ` · незакоммичено ${dirty.length}: ${cut(dirty.slice(0, 4).join(', '), 80)}` : ' · чисто'}`);

  // открытые PR (REST: GraphQL в облачной сессии закрыт) и CACHE_VERSION по веткам
  const slug = repoSlug();
  const vs = versions({ 'sw.js': read('sw.js'), 'js/app.js': read('js/app.js'), 'js/gamify.js': read('js/gamify.js'), 'js/db.js': read('js/db.js') });
  const cacheNum = (v) => Number(String(v || '').replace(/\D+/g, '')) || 0;
  let maxCache = cacheNum(vs.CACHE_VERSION && vs.CACHE_VERSION.value);
  if (slug && !opts.noNet) {
    const raw = sh('gh', ['api', `repos/${slug}/pulls?state=open&per_page=50`]);
    let prs = null;
    try { prs = JSON.parse(raw); } catch { /* нет сети или gh */ }
    if (!prs) L.push('PR: не удалось получить (gh api) — проверить вручную');
    else if (!prs.length) L.push('PR: открытых нет');
    else {
      L.push(`PR открыто ${prs.length}:`);
      for (const p of prs) {
        let cv = '';
        const sw = sh('gh', ['api', `repos/${slug}/contents/sw.js?ref=${encodeURIComponent(p.head.ref)}`, '-H', 'Accept: application/vnd.github.raw']);
        const m = sw && sw.match(/CACHE_VERSION\s*=\s*'([^']+)'/);
        if (m) { cv = ` · ${m[1]}`; maxCache = Math.max(maxCache, cacheNum(m[1])); }
        L.push(`  #${p.number} ${p.head.ref} — ${cut(p.title, 70)} (${p.user && p.user.login}, ${String(p.updated_at).slice(0, 10)})${cv}`);
      }
    }
  }
  const vline = Object.entries(vs).map(([k, v]) => `${k}=${v.value}`).join(' · ');
  L.push(`ВЕРСИИ: ${vline}`);
  L.push(`  следующий CACHE_VERSION: er-v${maxCache + 1} (наибольший из main и открытых PR + 1)`);

  // планы автора
  const plans = sections(sec('Планы автора'), 3);
  if (!plans.length) L.push('ПЛАНЫ АВТОРА: раздела нет' + (/план/i.test(sec('Итерации')) ? ' (в журнале упоминаются планы — создать раздел)' : ''));
  for (const p of plans) {
    const cb = checkboxes(p.body);
    const open = cb.filter((c) => !c.done);
    // В одной строке бывает несколько шагов: «- [ ] A2 (550) · [ ] A2+ (500)»
    const marks = [...p.body.matchAll(/\[( |x|X)\]/g)];
    const left = marks.filter((m) => m[1] === ' ').length;
    L.push(`ПЛАН «${cut(p.title, 90)}»: шагов ${marks.length}, не сделано ${left}`);
    if (open[0]) L.push(`  следующий: ${cut(open[0].text, 200)}`);
  }

  // эталон
  const b = parseBaseline(evo);
  L.push(b ? `ЭТАЛОН (${b.date || '?'}, nproc ${b.nproc ?? '?'}): юнит ${b.unit ?? '?'}, E2E ${b.e2e ?? '?'} (${b.e2eMin ?? '?'} мин, flaky ${b.flaky ?? '?'}), IPA ${b.ipa ?? '?'}, брит. IPA ${b.looseIpa ?? '?'}, книжное ${b.bookish ?? '?'}, дубли ${b.duplicates ?? '?'}, карточек ${b.cards ?? '?'}`
    : 'ЭТАЛОН: нет — создаст er-health.mjs --baseline-update');

  // бэклог
  const bl = checkboxes(sec('Бэклог'));
  const open = bl.filter((c) => !c.done);
  L.push(`БЭКЛОГ: открыто ${open.length}, сделано ${bl.length - open.length}`);
  for (const c of open.slice(0, 12)) L.push(`  - ${cut(c.text, 115)}`);
  if (open.length > 12) L.push(`  …ещё ${open.length - 12} (--section Бэклог)`);

  // итерации
  const its = sections(sec('Итерации'), 3);
  L.push(`ИТЕРАЦИЙ: ${its.length}`);
  for (const it of its.slice(-2)) L.push(`  ${cut(it.title, 120)}`);
  const last = its[its.length - 1];
  if (last) {
    const mode = last.body.match(/Режим[^\n]*/);
    const next = last.body.match(/\*\*Дальше\.\*\*\s*([^\n]+(?:\n {2,}[^\n]+)*)/);
    if (mode) L.push(`  режим последней: ${cut(mode[0], 100)}`);
    if (next) L.push(`  дальше: ${cut(next[1], 200)}`);
  }

  // разведка
  const sc = scoutAge(evo);
  L.push(sc.date ? `РАЗВЕДКА: ${sc.date}, ${sc.days} дн. назад → ${sc.due ? 'НУЖНА (шаг 3)' : 'не нужна'}` : 'РАЗВЕДКА: не было → нужна (шаг 3)');

  // CHANGELOG Unreleased — только заголовки записей
  const ch = read('CHANGELOG.md');
  const un = (sections(ch, 2).find((s) => /Unreleased/i.test(s.title)) || { body: '' }).body;
  const items = [...un.matchAll(/^- \*\*(.+?)\*\*/gm)].map((m) => m[1]);
  L.push(`CHANGELOG Unreleased: ${items.length} записей, ${un.split('\n').length} строк; последние: ${items.slice(0, 3).map((t) => cut(t, 60)).join(' | ') || '—'}`);

  // Следующие свободные номера карточек — новые карточки только в конец (правило 11)
  const next = nextIds();
  if (next) L.push(`НОВЫЕ ID (в конец): ${next}`);

  // размеры того, что раньше читалось целиком
  const kb = (f) => (fs.existsSync(path.join(ROOT, f)) ? (fs.statSync(path.join(ROOT, f)).size / 1024).toFixed(0) + ' КБ' : 'нет');
  L.push(`Полные файлы (читать по необходимости): EVOLUTION.md ${kb('docs/EVOLUTION.md')}, CHANGELOG.md ${kb('CHANGELOG.md')}, README.md ${kb('README.md')}`);
  return L.join('\n');
}

/** id карточек → следующий номер для каждого префикса с номером (wd_0551, pv_239, cv_2301…) */
export function nextIdsOf(ids) {
  const max = new Map();
  for (const id of ids) {
    const m = String(id).match(/^([a-z]+_?)(\d+)$/i);
    if (!m) continue;
    const [, pre, num] = m;
    const cur = max.get(pre);
    if (!cur || Number(num) > cur.n) max.set(pre, { n: Number(num), w: num.length });
  }
  return [...max.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([pre, { n, w }]) => pre + String(n + 1).padStart(w, '0'));
}
function nextIds() {
  try { return nextIdsOf(loadCards(ROOT).cards.keys()).join(' · '); } catch { return ''; }
}

function main() {
  const argv = process.argv.slice(2);
  const opts = { noNet: argv.includes('--no-net') };
  const si = argv.indexOf('--section');
  const li = argv.indexOf('--last');
  const evo = read('docs/EVOLUTION.md');
  if (si >= 0) {
    const name = argv[si + 1] || '';
    const s = sections(evo, 2).find((x) => x.title.toLowerCase().startsWith(name.toLowerCase()));
    console.log(s ? `## ${s.title}${s.body}` : `Раздела «${name}» нет. Есть: ${sections(evo, 2).map((x) => x.title).join(', ')}`);
    return;
  }
  if (li >= 0) {
    const n = Number(argv[li + 1]) || 1;
    const its = sections((sections(evo, 2).find((s) => s.title === 'Итерации') || { body: '' }).body, 3);
    console.log(its.slice(-n).map((s) => `### ${s.title}${s.body}`).join('').trim());
    return;
  }
  console.log(brief(opts));
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();
