#!/usr/bin/env node
/**
 * scripts/er-ci.mjs — дождаться CI на GitHub и вернуть одну строку (dev-инструмент скилла english-reboot-evolve).
 *
 * Вместо `gh pr checks --watch` / `gh run watch` (шумят; GraphQL в облачной сессии закрыт) —
 * REST: check-runs коммита. Ждёт до ~9 минут за вызов; не дождался — код 3, вызвать ещё раз.
 *
 *   node scripts/er-ci.mjs                 # коммит HEAD (должен быть запушен)
 *   node scripts/er-ci.mjs main            # последний коммит ветки на GitHub (после слияния: CI + Pages)
 *   node scripts/er-ci.mjs <sha> --no-wait # текущее состояние без ожидания
 *
 * Код выхода: 0 — всё зелёное, 1 — что-то упало (печатает хвост лога упавшего шага), 3 — ещё идёт.
 */
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const sh = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return r.status === 0 ? r.stdout.trim() : null;
};
const api = (p) => { const out = sh('gh', ['api', p]); try { return out == null ? null : JSON.parse(out); } catch { return null; } };

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
  const until = Date.now() + (noWait ? 0 : 9 * 60 * 1000 - 20000);
  let s;
  for (;;) {
    const res = api(`repos/${slug}/commits/${sha}/check-runs?per_page=50`);
    s = summarizeRuns(res && res.check_runs);
    if (s.state === 'success' || s.state === 'failure' || Date.now() >= until) break;
    await new Promise((r) => setTimeout(r, 15000));
  }
  console.log(`${s.line}  [${sha.slice(0, 7)}]`);
  if (s.state === 'failure') {
    for (const r of s.failed) {
      console.log(`✗ ${r.name}: ${r.html_url}`);
      const log = sh('gh', ['api', `repos/${slug}/actions/jobs/${r.id}/logs`]);
      if (log) console.log(errorLines(log));
    }
    return 1;
  }
  if (s.state === 'success') return 0;
  console.log(s.state === 'none' ? 'CI ещё не стартовал — вызвать ещё раз через минуту' : 'CI ещё идёт — вызвать ещё раз');
  return 3;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main().then((c) => process.exit(c));
