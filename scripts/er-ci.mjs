#!/usr/bin/env node
/**
 * scripts/er-ci.mjs — дождаться CI на GitHub и вернуть одну строку (dev-инструмент скилла english-reboot-evolve).
 *
 * Вместо `gh pr checks --watch` / `gh run watch` (шумят; GraphQL в облачной сессии закрыт) —
 * REST: check-runs коммита. Ждёт до ~9 минут за вызов; не дождался — код 3, вызвать ещё раз.
 * Предел ожидания (ER_CI_MAX_MIN, по умолчанию 30 минут) считается по времени старта проверок на GitHub,
 * поэтому действует и между сессиями: следующий запуск по расписанию не ждёт зависший CI заново.
 * Зелёный CI — ещё и число тестов vitest (аннотация vitest-total из шага CI; лог задания из облачной сессии
 * не скачать) со сверкой с последним полным локальным прогоном этого коммита (er test без файлов или
 * здоровье «после»): шим, который запускает не все тесты, виден сразу. Упал CI — хвост лога, а если лог
 * недоступен — аннотации с ошибками.
 *
 *   node scripts/er-ci.mjs                 # коммит HEAD (должен быть запушен)
 *   node scripts/er-ci.mjs main            # последний коммит ветки на GitHub (после слияния: CI + Pages)
 *   node scripts/er-ci.mjs <sha> --no-wait # текущее состояние без ожидания
 *
 * Код выхода: 0 — всё зелёное, 1 — что-то упало (печатает хвост лога упавшего шага), 3 — ещё идёт,
 * 4 — CI не ответил за предел: не красное и не зелёное, ждать дальше бесполезно — не сливать, сказать автору.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const TMP = process.env.ER_TMP || '/tmp/er';
const HEALTH = process.env.ER_OUT || path.join(TMP, 'health');
const sh = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return r.status === 0 ? r.stdout.trim() : null;
};
const api = (p) => { const out = sh('gh', ['api', p]); try { return out == null ? null : JSON.parse(out); } catch { return null; } };
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };

export function slugFromUrl(url) {
  const m = String(url || '').match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/i);
  return m ? `${m[1]}/${m[2]}` : null;
}

/** check-runs → { state: 'success'|'failure'|'pending'|'none', line, failed: [...] } */
export function summarizeRuns(runs) {
  if (!runs || !runs.length) return { state: 'none', line: 'CI: проверок для коммита пока нет', failed: [] };
  const mins = (r) => (r.started_at && r.completed_at ? Math.round((new Date(r.completed_at) - new Date(r.started_at)) / 6000) / 10 : null);
  const ok = new Set(['success', 'skipped', 'neutral']);
  const pending = runs.filter((r) => r.status !== 'completed');
  const failed = runs.filter((r) => r.status === 'completed' && !ok.has(r.conclusion));
  const parts = runs.map((r) => {
    if (r.status !== 'completed') return `… ${r.name} (${r.status})`;
    const icon = ok.has(r.conclusion) ? (r.conclusion === 'success' ? '✓' : '–') : '✗';
    const t = mins(r);
    return `${icon} ${r.name} (${r.conclusion}${t != null ? `, ${String(t).replace('.', ',')} мин` : ''})`;
  });
  const state = failed.length ? 'failure' : pending.length ? 'pending' : 'success';
  return { state, line: `CI: ${parts.join(' · ')}`, failed };
}

/** Состояние с пределом ожидания: проверки идут дольше maxMin по времени GitHub (или их нет дольше
 *  maxMin с первого вызова er ci для коммита) — 'stuck', «не ответил». Зелёное и красное не меняются. */
export function ciVerdict(runs, { now = Date.now(), maxMin = 30, firstSeen = null } = {}) {
  const s = summarizeRuns(runs);
  if (s.state !== 'pending' && s.state !== 'none') return s;
  const starts = (runs || []).filter((r) => r.status !== 'completed').map((r) => Date.parse(r.started_at)).filter(Number.isFinite);
  const from = starts.length ? Math.min(...starts) : firstSeen;
  if (from == null) return s;
  const ageMin = Math.round((now - from) / 60000);
  if (ageMin < maxMin) return { ...s, ageMin };
  const what = s.state === 'none' ? `проверок нет уже ${ageMin} мин — workflow не запустился?` : `проверки идут ${ageMin} мин`;
  return { ...s, state: 'stuck', ageMin, line: `${s.line} — CI не ответил: ${what} (предел ${maxMin}). Не красное и не зелёное: не сливать, в PR и отчёт — ссылка на запуск` };
}

/** Число тестов из аннотации «vitest-total» (её пишет шаг CI Publish unit test count); нет — null */
export function annotationTotal(anns) {
  const a = (Array.isArray(anns) ? anns : []).find((x) => String(x.title || '') === 'vitest-total');
  const m = a && String(a.message || '').match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

/** Итог vitest из лога задания CI (запасной путь, если лог доступен): «Tests  2 failed | 300 passed (302)» → 302 */
export function vitestTotal(log) {
  let total = null;
  for (const raw of String(log || '').replace(/\x1b\[[0-9;]*m/g, '').split('\n')) {
    const m = raw.replace(/^\S+Z\s/, '').match(/^\s*Tests\s+.*\((\d+)\)\s*$/);
    if (m) total = Number(m[1]);
  }
  return total;
}

/** Сверка числа тестов на CI с последним полным локальным прогоном того же коммита */
export function countLine(ci, local) {
  if (ci == null) return 'CI: число тестов не нашёл (нет аннотации vitest-total, лог задания недоступен) — не сверено';
  if (!local) return `CI: тестов ${ci}; полного локального прогона этого коммита нет — сравнить не с чем`;
  if (ci === local.total) return `CI: тестов ${ci} — как локально (${local.source})`;
  if (ci > local.total) {
    return `⚠ локально ${local.total} (${local.source}), на CI ${ci}: шим запускает не все тесты (обычно test.each / describe.each / вложенные describe) — ` +
      'починить шим отдельным коммитом с тестом в tests/er_tools.test.js; локальное «до → после» до починки не доказательство';
  }
  return `⚠ на CI меньше тестов, чем локально: ${ci} против ${local.total} (${local.source}) — CI запускает не всё: проверить vitest.config.js и workflow`;
}

/** Последний полный локальный прогон этого коммита: er test без файлов или здоровье «после» / «до» */
function localCount(sha) {
  const same = (s) => s && (sha.startsWith(s) || String(s).startsWith(sha));
  const found = [];
  const t = readJson(path.join(TMP, 'test', 'last-full.json'));
  if (t && same(t.sha)) found.push({ total: t.total, sha: t.sha, source: 'er test', at: t.at || 0 });
  for (const [label, name] of [['after', 'здоровье «после»'], ['before', 'здоровье «до»']]) {
    const f = path.join(HEALTH, label, 'health.json');
    const h = readJson(f);
    if (h && h.unit && !h.git.dirty && same(h.git.sha)) found.push({ total: h.unit.total, sha: h.git.sha, source: name, at: fs.statSync(f).mtimeMs });
  }
  return found.sort((a, b) => b.at - a.at)[0] || null;
}

/** Хвост лога упавшего задания: строки с ошибками, не больше n */
export function errorLines(log, n = 25) {
  const lines = String(log || '').split('\n').map((l) => l.replace(/^\S+Z\s/, '').replace(/\x1b\[[0-9;]*m/g, ''));
  const hits = lines.filter((l) => /(✘|✗|×|FAIL|failed|Error:|AssertionError|expected|##\[error\]|Process completed with exit code)/i.test(l));
  return (hits.length ? hits : lines).slice(-n).join('\n');
}

async function main() {
  const argv = process.argv.slice(2);
  const noWait = argv.includes('--no-wait');
  const ref = argv.find((a) => !a.startsWith('--')) || sh('git', ['rev-parse', 'HEAD']);
  const slug = slugFromUrl(sh('git', ['remote', 'get-url', 'origin']));
  if (!slug || !ref) { console.log('CI: не понял репозиторий или коммит'); return 1; }
  const commit = api(`repos/${slug}/commits/${encodeURIComponent(ref)}`);
  if (!commit) { console.log(`CI: коммита ${ref} нет на GitHub — запушен?`); return 1; }
  const sha = commit.sha;
  const maxMin = Number(process.env.ER_CI_MAX_MIN) || 30;
  // Первый вызов для коммита — на случай, когда проверок нет вовсе (время старта у GitHub тогда не узнать)
  const seenFile = path.join(TMP, 'ci', sha + '.json');
  let firstSeen = (readJson(seenFile) || {}).at;
  if (!firstSeen) { firstSeen = Date.now(); fs.mkdirSync(path.dirname(seenFile), { recursive: true }); fs.writeFileSync(seenFile, JSON.stringify({ at: firstSeen })); }
  const until = Date.now() + (noWait ? 0 : 9 * 60 * 1000 - 20000);
  let s, runs;
  for (;;) {
    const res = api(`repos/${slug}/commits/${sha}/check-runs?per_page=50`);
    runs = (res && res.check_runs) || [];
    s = ciVerdict(runs, { now: Date.now(), maxMin, firstSeen });
    if (s.state === 'success' || s.state === 'failure' || s.state === 'stuck' || Date.now() >= until) break;
    await new Promise((r) => setTimeout(r, 15000));
  }
  console.log(`${s.line}  [${sha.slice(0, 7)}]`);
  if (s.state === 'failure') {
    for (const r of s.failed) {
      console.log(`✗ ${r.name}: ${r.html_url}`);
      const log = sh('gh', ['api', `repos/${slug}/actions/jobs/${r.id}/logs`]);
      if (log) { console.log(errorLines(log)); continue; }
      // Лог лежит во внешнем хранилище GitHub — из облачной сессии он закрыт; аннотации с ошибками — через REST
      const anns = (api(`repos/${slug}/check-runs/${r.id}/annotations?per_page=50`) || []).filter((a) => a.annotation_level === 'failure');
      console.log(anns.length
        ? anns.slice(0, 10).map((a) => `  ${a.path && a.path !== '.github' ? `${a.path}:${a.start_line} ` : ''}${String(a.message).split('\n')[0].slice(0, 200)}`).join('\n')
        : '  лог задания отсюда не скачать (хранилище логов GitHub закрыто для сессии), аннотаций с ошибками нет — открыть ссылку выше');
    }
    return 1;
  }
  if (s.state === 'stuck') {
    const r = runs.find((x) => x.status !== 'completed');
    console.log(r ? `запуск: ${r.html_url}` : `запуски: https://github.com/${slug}/actions`);
    return 4;
  }
  if (s.state === 'success') {
    // Число тестов: задание, в котором шёл vitest (по имени test / unit) — аннотация vitest-total, иначе лог
    const job = runs.find((r) => /test|unit|vitest/i.test(r.name) && r.conclusion === 'success');
    let total = job ? annotationTotal(api(`repos/${slug}/check-runs/${job.id}/annotations?per_page=50`)) : null;
    if (total == null && job) total = vitestTotal(sh('gh', ['api', `repos/${slug}/actions/jobs/${job.id}/logs`]));
    console.log(countLine(total, localCount(sha)));
    return 0;
  }
  const left = s.ageMin != null ? `, до предела ${Math.max(0, maxMin - s.ageMin)} мин` : '';
  console.log(s.state === 'none' ? `CI ещё не стартовал${left} — вызвать ещё раз через минуту` : `CI ещё идёт${left} — вызвать ещё раз`);
  return 3;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main().then((c) => process.exit(c));
