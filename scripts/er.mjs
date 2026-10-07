#!/usr/bin/env node
/**
 * scripts/er.mjs — одна точка входа для механики итерации (скилл english-reboot-evolve).
 * Каждая команда печатает итог в несколько строк; полные логи — в /tmp/er/, их читают только при красном.
 *
 *   node scripts/er.mjs start           шаги 1–2: выжимка проекта сейчас + в фоне здоровье «до» и скриншоты «до»
 *   node scripts/er.mjs test [файлы…]   юнит-тесты тихо: одна строка или упавшие тесты с сообщением
 *   node scripts/er.mjs e2e [спеки…]    E2E тихо, только указанные спеки (подстрока имени файла: words, today)
 *   node scripts/er.mjs finish          шаг 7: в фоне здоровье «после», скриншоты «после», сторож, пакет ревизорам
 *   node scripts/er.mjs wait            дождаться фоновой задачи (до ~9 мин; код 3 — ещё идёт, вызвать снова)
 *   node scripts/er.mjs review          пакет ревизорам (er-review.mjs)
 *   node scripts/er.mjs brief|guard|ci|health|shots …   — scripts/er-<имя> с теми же аргументами
 *
 * Код выхода: 0 — зелёное, 1 — красное (упали тесты, нарушения сторожа), 2 — не запустилось, 3 — ещё идёт.
 * ER_ROOT=<папка> — работать с другой рабочей копией (git worktree) этими же скриптами.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { summarizeVitest, summarizePlaywright } from './er-health.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.ER_ROOT ? path.resolve(process.env.ER_ROOT) : path.resolve(HERE, '..');
const TMP = process.env.ER_TMP || '/tmp/er';
const JOBS = path.join(TMP, 'jobs');
const env = { ...process.env, ER_ROOT: ROOT };
const sec = (ms) => (ms / 1000).toFixed(ms < 10000 ? 1 : 0).replace('.', ',') + ' с';

function runTo(cmd, args, log, extraEnv = {}) {
  fs.mkdirSync(path.dirname(log), { recursive: true });
  const fd = fs.openSync(log, 'w');
  const t0 = Date.now();
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: ['ignore', fd, fd], env: { ...env, ...extraEnv }, timeout: 20 * 60 * 1000 });
  fs.closeSync(fd);
  return { status: r.status, ms: Date.now() - t0 };
}
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const tail = (f, n = 12) => { try { return fs.readFileSync(f, 'utf8').trimEnd().split('\n').slice(-n).join('\n'); } catch { return ''; } };
// Упавший тест → вероятный модуль приложения (tests/today.test.js → js/today.js): на один поиск меньше
const moduleOf = (name) => { const m = String(name).match(/([\w-]+)\.(test|spec)\.js/); if (!m) return ''; const f = path.join(ROOT, 'js', m[1] + '.js'); return fs.existsSync(f) ? ` [js/${m[1]}.js]` : ''; };

function ensureEnv() {
  if (fs.existsSync(path.join(ROOT, 'node_modules', 'vitest')) && fs.existsSync(path.join(ROOT, 'node_modules', '@playwright', 'test'))) return true;
  const r = spawnSync('bash', [path.join(HERE, 'er-test-env.sh')], { cwd: ROOT, encoding: 'utf8', env });
  if (r.status !== 0) { console.log('er: тестовое окружение не собралось — ' + String(r.stderr || r.stdout).trim().split('\n').pop()); return false; }
  return true;
}

/* ---------- Тихие тесты ---------- */
export function formatUnit(s, ms, log) {
  if (!s) return `юнит: отчёт не получен — смотреть ${log}`;
  if (!s.failed) return `юнит ${s.passed}/${s.total} ✓${s.skipped ? `, пропущено ${s.skipped}` : ''} (${sec(ms)})`;
  const L = [`юнит: упало ${s.failed} из ${s.total} (${sec(ms)})`];
  for (const f of s.failures.slice(0, 10)) L.push(`  ✗ ${f.name}${moduleOf(f.name)} — ${f.message}`);
  if (s.failures.length > 10) L.push(`  …ещё ${s.failures.length - 10}`);
  L.push(`  лог: ${log}`);
  return L.join('\n');
}
export function formatE2e(s, ms, log) {
  if (!s) return `E2E: отчёт не получен — хвост лога:\n${tail(log, 8)}`;
  const flaky = s.flaky ? ` · flaky ${s.flaky}: ${s.flakyNames.join('; ')}` : '';
  if (!s.failed) return `E2E ${s.passed + s.flaky}/${s.total} ✓${flaky} (${sec(ms)})`;
  const L = [`E2E: упало ${s.failed} из ${s.total}${flaky} (${sec(ms)})`];
  for (const f of s.failures.slice(0, 8)) L.push(`  ✗ ${f.name}${moduleOf(f.name)} — ${f.message}`);
  L.push(`  лог и trace: ${log}, test-results/`);
  return L.join('\n');
}

function unit(files) {
  if (!ensureEnv()) return 2;
  const out = path.join(TMP, 'test', 'unit.json'), log = path.join(TMP, 'test', 'unit.log');
  fs.rmSync(out, { force: true });
  const r = runTo('npm', ['test', '--', ...files, '--reporter=json', '--outputFile=' + out], log);
  const j = readJson(out);
  const s = j ? summarizeVitest(j) : null;
  console.log(formatUnit(s, r.ms, log));
  return s && !s.failed ? 0 : 1;
}

function e2e(specs) {
  if (!ensureEnv()) return 2;
  const out = path.join(TMP, 'test', 'e2e.json'), log = path.join(TMP, 'test', 'e2e.log');
  fs.rmSync(out, { force: true });
  const r = runTo('npx', ['playwright', 'test', ...specs, '--reporter=line,json'], log, { PLAYWRIGHT_JSON_OUTPUT_FILE: out, PLAYWRIGHT_JSON_OUTPUT_NAME: out, CI: '' });
  const j = readJson(out);
  const s = j ? summarizePlaywright(j) : null;
  console.log(formatE2e(s, r.ms, log));
  return s && !s.failed ? 0 : 1;
}

/* ---------- Фоновые задачи: start (здоровье и скриншоты «до»), finish (всё «после») ---------- */
const STEPS = {
  start: [['здоровье «до»', 'node', ['er-health.mjs', '--label', 'before']], ['скриншоты «до»', 'bash', ['er-shots.sh', 'before']]],
  finish: [['здоровье «после»', 'node', ['er-health.mjs', '--label', 'after']], ['скриншоты «после»', 'bash', ['er-shots.sh', 'after']],
    ['сторож', 'node', ['er-guard.mjs', '--out', path.join(TMP, 'guard.txt')]], ['ревизия', 'node', ['er-review.mjs']]],
};

function job(name) {
  const dir = path.join(JOBS, name);
  fs.mkdirSync(dir, { recursive: true });
  const parts = [];
  let worst = 0;
  for (const [title, cmd, args] of STEPS[name]) {
    const log = path.join(dir, title.replace(/[^\wа-яё]+/gi, '_') + '.log');
    const r = runTo(cmd, [path.join(HERE, args[0]), ...args.slice(1)], log);
    // Сводка шага: у здоровья — всё, кроме строки с логами; у остальных — последние строки
    const text = fs.readFileSync(log, 'utf8').trimEnd().split('\n').filter((l) => !/^Логи: /.test(l));
    parts.push(text.slice(-14).join('\n'));
    if (r.status === 1) worst = Math.max(worst, 1);
    else if (r.status !== 0 && r.status !== null) worst = Math.max(worst, 2);
  }
  fs.writeFileSync(path.join(JOBS, name + '.done.json'), JSON.stringify({ name, status: worst, at: Date.now(), summary: parts.join('\n') }));
}

function background(name) {
  fs.mkdirSync(JOBS, { recursive: true });
  fs.rmSync(path.join(JOBS, name + '.done.json'), { force: true });
  const fd = fs.openSync(path.join(JOBS, name + '.log'), 'w');
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '_job', name], { cwd: ROOT, detached: true, stdio: ['ignore', fd, fd], env });
  child.unref();
  fs.writeFileSync(path.join(JOBS, 'current'), name);
}

async function wait(name) {
  const job = name || (() => { try { return fs.readFileSync(path.join(JOBS, 'current'), 'utf8').trim(); } catch { return ''; } })();
  if (!job) { console.log('er: фоновых задач нет'); return 2; }
  const done = path.join(JOBS, job + '.done.json');
  const until = Date.now() + 9 * 60 * 1000 - 20000;
  while (Date.now() < until) {
    const d = readJson(done);
    if (d) { console.log(`${job.toUpperCase()}: ${d.status === 0 ? 'готово' : d.status === 1 ? 'ЕСТЬ КРАСНОЕ' : 'не всё запустилось'}\n${d.summary}`); return d.status; }
    await new Promise((r) => setTimeout(r, 5000));
  }
  console.log(`er: «${job}» ещё идёт — вызвать «node scripts/er.mjs wait» снова`);
  return 3;
}

function passthrough(script, args) {
  const r = spawnSync(script.endsWith('.sh') ? 'bash' : process.execPath, [path.join(HERE, script), ...args], { cwd: ROOT, stdio: 'inherit', env });
  return r.status ?? 2;
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  switch (cmd) {
    case 'test': return unit(args);
    case 'e2e': return e2e(args);
    case 'start': {
      const code = passthrough('er-brief.mjs', args);
      if (!ensureEnv()) return 2;
      background('start');
      console.log('В фоне: здоровье «до» и скриншоты «до» (~5 мин). Итог: node scripts/er.mjs wait');
      return code;
    }
    case 'finish':
      if (!ensureEnv()) return 2;
      background('finish');
      console.log('В фоне: здоровье «после», скриншоты «после», сторож, пакет ревизорам (~5 мин). Итог: node scripts/er.mjs wait');
      return 0;
    case 'wait': return wait(args[0]);
    case '_job': job(args[0]); return 0;
    case 'review': return passthrough('er-review.mjs', args);
    case 'brief': case 'guard': case 'ci': case 'health': return passthrough(`er-${cmd}.mjs`, args);
    case 'shots': return passthrough('er-shots.sh', args);
    default:
      console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n\/\*\*\n?/, ''));
      return cmd ? 2 : 0;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main().then((c) => process.exit(c));
