#!/usr/bin/env node
/**
 * scripts/er.mjs — одна точка входа для механики итерации (скилл english-reboot-evolve).
 * Каждая команда печатает итог в несколько строк; полные логи — в /tmp/er/, их читают только при красном.
 *
 *   node scripts/er.mjs start           шаги 1–2: выжимка проекта сейчас + в фоне здоровье «до» и скриншоты «до»
 *   node scripts/er.mjs test [файлы…]   юнит-тесты тихо: одна строка или упавшие тесты с сообщением
 *   node scripts/er.mjs e2e [спеки…]    E2E тихо, только указанные спеки (подстрока имени файла: words, today)
 *   node scripts/er.mjs finish          шаг 7: в фоне здоровье «после», скриншоты «после», сторож, пакет ревизорам
 *   node scripts/er.mjs wait            дождаться фоновой задачи (до ~9 мин за вызов; код 3 — ещё идёт, вызвать снова;
 *                                       код 4 — идёт дольше предела от эталона, зависла; код 2 — прервалась без итога)
 *   node scripts/er.mjs review          пакет ревизорам (er-review.mjs)
 *   node scripts/er.mjs archive [--keep 30] [--dry]   старые записи журнала EVOLUTION.md — в docs/evolution/archive-<год>.md
 *   node scripts/er.mjs usage [--all|--journal|--record "<итерация>"]   токены итерации и что их съело (er-usage.mjs)
 *   node scripts/er.mjs lessons [add <ключ> "<текст>"]   уроки агента в EVOLUTION.md (er-lessons.mjs)
 *   node scripts/er.mjs brief|guard|ci|health|shots …   — scripts/er-<имя> с теми же аргументами
 *
 * Код выхода: 0 — зелёное, 1 — красное (упали тесты, нарушения сторожа), 2 — не запустилось или прервалось,
 * 3 — ещё идёт, 4 — не ответило за предел (CI или фоновая задача): не красное и не зелёное, ждать дальше бесполезно.
 * ER_ROOT=<папка> — работать с другой рабочей копией (git worktree) этими же скриптами.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { summarizeVitest, summarizePlaywright, parseBaseline } from './er-health.mjs';

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
  // Полный прогон — запомнить число тестов коммита: er ci сверит его с CI (шим, запускающий не всё, виден сразу)
  if (s && !files.length) {
    const sha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
    const dirty = !!spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
    if (!dirty) fs.writeFileSync(path.join(TMP, 'test', 'last-full.json'), JSON.stringify({ sha, total: s.total, at: Date.now() }));
  }
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
  fs.writeFileSync(path.join(JOBS, name + '.start.json'), JSON.stringify({ at: Date.now(), pid: child.pid }));
  fs.writeFileSync(path.join(JOBS, 'current'), name);
}

/** Предел фоновой задачи, минут: вдвое больше эталонной (E2E по эталону + ~2,5 мин юнит, аудит и скриншоты), не меньше 12 */
export function jobLimitMin(base) {
  if (!base || !base.e2eMin) return 25;
  return Math.max(12, Math.ceil(2 * (base.e2eMin + 2.5)));
}

/** Состояние фоновой задачи: итог записан — done; процесса нет, итога нет — dead; дольше предела и лог
 *  молчит 5+ минут — stuck (на медленной машине задача идёт дольше, но пишет лог — это не зависание) */
export function jobStatus({ done, start, alive, now, limitMin, logIdleMin = null }) {
  if (done) return 'done';
  if (alive === false) return 'dead';
  const over = start && start.at != null && (now - start.at) / 60000 > limitMin;
  if (over && (logIdleMin == null || logIdleMin >= 5)) return 'stuck';
  return 'running';
}

const isAlive = (pid) => { if (!pid) return null; try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
// Лог шага, который пишется сейчас: самый свежий в папке задачи
const liveLog = (job) => {
  const dir = path.join(JOBS, job);
  try { return fs.readdirSync(dir).map((f) => path.join(dir, f)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || path.join(JOBS, job + '.log'); }
  catch { return path.join(JOBS, job + '.log'); }
};

async function wait(name) {
  const job = name || (() => { try { return fs.readFileSync(path.join(JOBS, 'current'), 'utf8').trim(); } catch { return ''; } })();
  if (!job) { console.log('er: фоновых задач нет'); return 2; }
  const done = path.join(JOBS, job + '.done.json');
  const start = readJson(path.join(JOBS, job + '.start.json'));
  const limitMin = Number(process.env.ER_WAIT_MAX_MIN) || jobLimitMin(parseBaseline(fs.existsSync(path.join(ROOT, 'docs', 'EVOLUTION.md')) ? fs.readFileSync(path.join(ROOT, 'docs', 'EVOLUTION.md'), 'utf8') : ''));
  const mins = () => (start ? Math.round((Date.now() - start.at) / 60000) : null);
  const until = Date.now() + 9 * 60 * 1000 - 20000;
  for (;;) {
    let d = readJson(done);
    const log = liveLog(job);
    const logIdleMin = (() => { try { return (Date.now() - fs.statSync(log).mtimeMs) / 60000; } catch { return null; } })();
    let st = jobStatus({ done: d, start, alive: d ? null : isAlive(start && start.pid), now: Date.now(), limitMin, logIdleMin });
    // Задача могла дописать итог и выйти между чтением итога и проверкой процесса — перечитать
    if (st === 'dead' && (d = readJson(done))) st = 'done';
    if (st === 'done') {
      const took = d.at && start ? ` (${Math.round((d.at - start.at) / 60000)} мин)` : '';
      console.log(`${job.toUpperCase()}: ${d.status === 0 ? 'готово' : d.status === 1 ? 'ЕСТЬ КРАСНОЕ' : 'не всё запустилось'}${took}\n${d.summary}`);
      return d.status;
    }
    if (st === 'dead') {
      console.log(`er: «${job}» прервалась, не записав итог (процесса ${start.pid} нет — перезапуск контейнера?). Хвост лога:\n${tail(liveLog(job), 8)}\nПерезапустить: node scripts/er.mjs ${job}`);
      return 2;
    }
    if (st === 'stuck') {
      console.log(`er: «${job}» идёт ${mins()} мин при пределе ${limitMin} (вдвое больше эталона), лог молчит ${Math.round(logIdleMin ?? 0)} мин — похоже, зависла. Хвост ${log}:\n${tail(log, 8)}\n` +
        `Сначала остановить: kill -- -${start.pid} (иначе ручной прогон столкнётся с ней на порту E2E и в /tmp/er/test); ` +
        'затем прогнать вручную (er test / er e2e) — с пометкой в отчёте, что фоновая задача не дошла');
      return 4;
    }
    if (Date.now() >= until) break;
    await new Promise((r) => setTimeout(r, 5000));
  }
  console.log(`er: «${job}» ещё идёт${mins() != null ? ` (${mins()} мин из ${limitMin})` : ''} — вызвать «node scripts/er.mjs wait» снова`);
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
      // метка начала итерации: er usage считает токены с неё
      fs.mkdirSync(TMP, { recursive: true });
      fs.writeFileSync(path.join(TMP, 'iter.json'), JSON.stringify({ at: Date.now() }));
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
    case 'archive': return passthrough('er-brief.mjs', ['--archive', ...args]);
    case 'usage': return passthrough('er-usage.mjs', args);
    case 'lessons': return passthrough('er-lessons.mjs', args);
    case 'brief': case 'guard': case 'ci': case 'health': return passthrough(`er-${cmd}.mjs`, args);
    case 'shots': return passthrough('er-shots.sh', args);
    default:
      console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n\/\*\*\n?/, ''));
      return cmd ? 2 : 0;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main().then((c) => process.exit(c));
