#!/usr/bin/env node
/**
 * scripts/er-health.mjs — здоровье проекта одной сводкой (dev-инструмент скилла english-reboot-evolve).
 *
 * Прогоняет юнит, E2E и аудит контента, сверяет с «Эталоном» в docs/EVOLUTION.md и печатает
 * ~10 строк вместо тысяч строк логов. Полные логи — в папке отчёта, читать только при красном.
 *
 *   node scripts/er-health.mjs --label before          # до изменений (по умолчанию label = before)
 *   node scripts/er-health.mjs --label after           # после; сам сравнит с before («до → после»)
 *   node scripts/er-health.mjs --label after --bg      # в фоне (если команда может не уложиться в 10 мин)
 *   node scripts/er-health.mjs --label after --wait    # ждать фонового прогона до ~9 мин, напечатать сводку
 *   node scripts/er-health.mjs --skip-e2e              # быстро: юнит + аудит (не для итогового отчёта)
 *   node scripts/er-health.mjs --summary --label X     # повторно напечатать сводку готового прогона
 *   node scripts/er-health.mjs --baseline-update --label X [--note "после PR #6"]
 *                                                      # переписать «Эталон» в EVOLUTION.md числами прогона X
 *   --cmu путь/к/cmudict.dict — передать словарь CMU аудиту (или переменная ER_CMU)
 *
 * Код выхода: 0 — зелёное/жёлтое, 1 — красное, 2 — прогон не состоялся.
 * Папка отчёта: $ER_OUT или /tmp/er/health/<label>/ — health.json, unit.log/json, e2e.log/json, audit/.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ER_ROOT — проверить другую рабочую копию (git worktree) теми же скриптами
const ROOT = process.env.ER_ROOT ? path.resolve(process.env.ER_ROOT) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EVOLUTION = path.join(ROOT, 'docs', 'EVOLUTION.md');
const OUT_BASE = process.env.ER_OUT || '/tmp/er/health';
const BASELINE_TAG = 'er-baseline';

/* ───────────────────────── разбор отчётов (чистые функции, есть тесты) ───────────────────────── */

const stripAnsi = (s) => String(s || '').replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
const oneLine = (s, n = 160) => {
  const t = stripAnsi(s).replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};

/** JSON репортёра vitest (или шима) → { total, passed, failed, skipped, failures: [{name, message}] } */
export function summarizeVitest(j) {
  const all = (j.testResults || []).flatMap((f) => (f.assertionResults || []).map((a) => ({ ...a, file: f.name })));
  const failures = all.filter((a) => a.status === 'failed').map((a) => ({
    name: `${path.basename(a.file || '')}: ${a.fullName || a.title}`,
    message: oneLine((a.failureMessages || [])[0] || ''),
  }));
  // Файл, упавший до запуска тестов, у vitest — testResults[].status=failed без assertionResults
  for (const f of j.testResults || []) {
    if (f.status === 'failed' && !(f.assertionResults || []).length) {
      failures.push({ name: path.basename(f.name || ''), message: oneLine(f.message || 'файл не загрузился') });
    }
  }
  return {
    total: j.numTotalTests ?? all.length,
    passed: j.numPassedTests ?? all.filter((a) => a.status === 'passed').length,
    failed: Math.max(j.numFailedTests ?? 0, failures.length),
    skipped: (j.numPendingTests ?? 0) + (j.numTodoTests ?? 0),
    failures,
  };
}

/** JSON репортёра Playwright → { total, passed, failed, flaky, skipped, durationMs, failures, flakyNames } */
export function summarizePlaywright(j) {
  const specs = [];
  const walk = (suite, titles) => {
    for (const s of suite.suites || []) walk(s, s.title && !/\.(spec|test)\.[jt]s$/.test(s.title) ? [...titles, s.title] : titles);
    for (const sp of suite.specs || []) specs.push({ ...sp, titles });
  };
  for (const s of j.suites || []) walk(s, []);
  const tests = specs.flatMap((sp) => (sp.tests || []).map((t) => ({ sp, t })));
  const label = ({ sp }) => `${path.basename(sp.file || '')}:${sp.line} › ${[...sp.titles, sp.title].join(' › ')}`;
  const errOf = ({ t }) => {
    const r = [...(t.results || [])].reverse().find((x) => x.error || (x.errors || []).length);
    return r ? oneLine((r.error && r.error.message) || (r.errors[0] && r.errors[0].message)) : '';
  };
  const st = j.stats || {};
  const by = (status) => tests.filter((x) => x.t.status === status);
  const fileErrors = (j.errors || []).map((e) => ({ name: 'Playwright', message: oneLine(e.message) }));
  return {
    total: tests.length,
    passed: st.expected ?? by('expected').length,
    failed: (st.unexpected ?? by('unexpected').length) + fileErrors.length,
    flaky: st.flaky ?? by('flaky').length,
    skipped: st.skipped ?? by('skipped').length,
    durationMs: st.duration ?? null,
    failures: [...by('unexpected').map((x) => ({ name: label(x), message: errOf(x) })), ...fileErrors],
    flakyNames: by('flaky').map(label),
  };
}

/** Строка вывода audit_content.mjs → числа (на случай, если JSON не записался) */
export function parseAuditLine(s) {
  const n = (re) => { const m = String(s).match(re); return m ? Number(m[1]) : null; };
  return {
    cards: n(/Карточек:\s*(\d+)/), ipa: n(/\bIPA:\s*(\d+)/), looseIpa: n(/прочая IPA:\s*(\d+)/),
    words: n(/слова:\s*(\d+)/), spelling: n(/написание:\s*(\d+)/), bookish: n(/книжное:\s*(\d+)/),
    duplicates: n(/дубли:\s*(\d+)/), brSlang: null,
  };
}

/** content-audit.json → числа */
export function summarizeAudit(j) {
  const len = (k) => (Array.isArray(j[k]) ? j[k].length : null);
  return {
    ipa: len('ipa'), looseIpa: len('looseIpa'), words: len('words'), spelling: len('spelling'),
    brSlang: len('brSlang'), bookish: len('bookish'), duplicates: len('duplicates'),
  };
}

const num = (s) => (s == null ? null : Number(String(s).replace(',', '.')));

/** Раздел «Эталон» в EVOLUTION.md → числа. Сначала машинная строка <!-- er-baseline {...} -->, иначе текст. */
export function parseBaseline(md) {
  const sec = String(md).match(/^## Эталон\s*\n([\s\S]*?)(?=^## |(?![\s\S]))/m);
  if (!sec) return null;
  const body = sec[1];
  const tagged = body.match(new RegExp(`<!--\\s*${BASELINE_TAG}\\s*(\\{[\\s\\S]*?\\})\\s*-->`));
  if (tagged) {
    try { return { ...JSON.parse(tagged[1]), source: 'json' }; } catch { /* упадём на разбор текста */ }
  }
  const t = body.replace(/\s+/g, ' ');
  const m = (re) => { const x = t.match(re); return x ? x[1] : null; };
  const e2e = t.match(/E2E\s+(\d+)(?:\s*\(([\d.,]+)\s*мин(?:[^)]*?flaky\s+(\d+))?)?/);
  const b = {
    date: m(/(\d{4}-\d{2}-\d{2})/),
    nproc: num(m(/nproc`?\s*=\s*(\d+)/)),
    unit: num(m(/юнит\s+(\d+)/)),
    e2e: e2e ? num(e2e[1]) : null,
    e2eMin: e2e && e2e[2] ? num(e2e[2]) : null,
    flaky: e2e && e2e[3] ? num(e2e[3]) : null,
    ipa: num(m(/аудит\s*[—-]?\s*IPA\s+(\d+)/)),
    looseIpa: num(m(/британской IPA\s+(\d+)/)),
    bookish: num(m(/книжное\s+(\d+)/)),
    duplicates: num(m(/дубли\s+(\d+)/)),
    cards: num(m(/карточек\s+(\d+)/)),
    planDone: num(m(/«\+4000»\s*[—-]\s*(\d+)/)),
    source: 'text',
  };
  return Object.values(b).some((v) => typeof v === 'number') ? b : null;
}

/**
 * Решение: красное / жёлтое / зелёное по правилам скилла (шаг 2 и шаг 7).
 * h — текущий прогон, base — эталон (может быть null), before — прогон «до» (для after; может быть null).
 */
export function evaluate(h, base, before) {
  const red = [], warn = [];
  const u = h.unit, e = h.e2e, a = h.audit;
  if (!u) red.push('юнит не запустились (см. unit.log)');
  else {
    if (u.failed > 0) red.push(`юнит: упало ${u.failed}`);
    if (base && base.unit != null && u.total < base.unit) red.push(`юнит: тестов ${u.total} < эталона ${base.unit}`);
    if (before && before.unit && u.total < before.unit.total) red.push(`юнит: тестов стало меньше, чем до итерации (${before.unit.total} → ${u.total})`);
  }
  if (h.skipE2e) warn.push('E2E пропущены (--skip-e2e) — для отчёта нужен полный прогон');
  else if (!e) red.push('E2E не запустились (см. e2e.log)');
  else {
    if (e.failed > 0) red.push(`E2E: упало ${e.failed}`);
    if (base && base.e2e != null && e.total < base.e2e) red.push(`E2E: тестов ${e.total} < эталона ${base.e2e}`);
    if (before && before.e2e && e.total < before.e2e.total) red.push(`E2E: тестов стало меньше, чем до итерации (${before.e2e.total} → ${e.total})`);
    if (e.flaky > 0) warn.push(`flaky ${e.flaky} → в бэклог: ${e.flakyNames.join('; ')}`);
    if (base && base.e2eMin && e.durationMs && base.nproc === h.nproc && e.durationMs / 60000 > base.e2eMin * 1.5) {
      warn.push(`E2E медленнее эталона больше чем в 1,5 раза: ${fmtMin(e.durationMs)} против ${String(base.e2eMin).replace('.', ',')} мин — в отчёт`);
    }
  }
  if (!a) red.push('аудит не запустился (см. audit.log)');
  else {
    if (a.ipa > 0) red.push(`аудит: IPA ${a.ipa} (должно быть 0)`);
    if (a.looseIpa > 0) red.push(`аудит: британская IPA ${a.looseIpa} (должно быть 0)`);
    for (const [k, name] of [['bookish', 'книжное'], ['duplicates', 'дубли']]) {
      const ref = before && before.audit ? before.audit[k] : base ? base[k] : null;
      if (ref != null && a[k] > ref) red.push(`аудит: ${name} выросло ${ref} → ${a[k]}`);
    }
    for (const [k, name] of [['words', 'британские слова'], ['spelling', 'британское написание'], ['brSlang', 'британский сленг']]) {
      const ref = before && before.audit ? before.audit[k] : base && base[k] != null ? base[k] : 0;
      if (a[k] != null && a[k] > ref) warn.push(`аудит: ${name} ${ref} → ${a[k]} — проверить`);
    }
  }
  return { status: red.length ? 'red' : warn.length ? 'yellow' : 'green', red, warn };
}

const fmtMin = (ms) => (ms == null ? '?' : (ms / 60000).toFixed(1).replace('.', ',') + ' мин');
const arrow = (a, b) => {
  const s = (v) => (v == null ? '?' : `${v}`);
  return a == null || a === b ? s(b) : `${s(a)} → ${s(b)}`;
};

/** Сводка для модели: коротко, только то, что нужно для решения. */
export function formatSummary(h, verdict, base, before) {
  const L = [];
  const icon = { green: '🟢 зелёное', yellow: '🟡 зелёное с замечаниями', red: '🔴 КРАСНОЕ — итерация = только починка' }[verdict.status];
  L.push(`ЗДОРОВЬЕ [${h.label}]: ${icon}  (${h.git.branch}@${h.git.sha}${h.git.dirty ? ', есть незакоммиченное' : ''}; nproc ${h.nproc}; ${fmtMin(h.elapsedMs)})`);
  const u = h.unit, e = h.e2e, a = h.audit;
  const bu = base && base.unit != null ? `  | эталон ${base.unit}` : '';
  L.push(u ? `Юнит: ${u.passed}/${u.total}${u.failed ? `, упало ${u.failed}` : ' ✓'}${u.skipped ? `, пропущено ${u.skipped}` : ''}${bu}` : 'Юнит: не запустились');
  if (h.skipE2e) L.push('E2E: пропущены');
  else {
    const be = base && base.e2e != null ? `  | эталон ${base.e2e}${base.e2eMin ? `, ${String(base.e2eMin).replace('.', ',')} мин` : ''}${base.nproc ? `, nproc ${base.nproc}` : ''}` : '';
    L.push(e ? `E2E: ${e.passed + e.flaky}/${e.total}${e.failed ? `, упало ${e.failed}` : ' ✓'} · flaky ${e.flaky} · ${fmtMin(e.durationMs)}${be}` : 'E2E: не запустились');
  }
  if (a) {
    L.push(`Аудит: IPA ${a.ipa} · брит. IPA ${a.looseIpa} · брит. слова ${a.words} · написание ${a.spelling} · брит. сленг ${a.brSlang} · книжное ${a.bookish} · дубли ${a.duplicates}` +
      (base && (base.bookish != null || base.duplicates != null) ? `  | эталон: книжное ${base.bookish ?? '?'}, дубли ${base.duplicates ?? '?'}` : ''));
  }
  if (h.stats) L.push(`Карточек: ${h.stats.cards} · план «+4000»: ${h.stats.planDone}` + (base && base.cards != null ? `  | эталон ${base.cards} / ${base.planDone ?? '?'}` : ''));
  if (!base) L.push('Эталона в docs/EVOLUTION.md нет — создать: node scripts/er-health.mjs --baseline-update --label ' + h.label);
  for (const r of verdict.red) L.push('✗ ' + r);
  const fails = [...(u ? u.failures : []).map((f) => ['юнит', f]), ...(e ? e.failures : []).map((f) => ['E2E', f])];
  for (const [k, f] of fails.slice(0, 8)) L.push(`   ${k} · ${f.name}${f.message ? ' — ' + f.message : ''}`);
  if (fails.length > 8) L.push(`   …и ещё ${fails.length - 8} (см. логи)`);
  for (const w of verdict.warn) L.push('! ' + w);
  if (before) {
    const b = before;
    L.push('До → после: ' + [
      `юнит ${arrow(b.unit && b.unit.total, u && u.total)}`,
      ...(h.skipE2e || !e ? ['E2E —'] : [
        `E2E ${arrow(b.e2e && b.e2e.total, e.total)}`,
        `flaky ${arrow(b.e2e && b.e2e.flaky, e.flaky)}`,
      ]),
      `книжное ${arrow(b.audit && b.audit.bookish, a && a.bookish)}`,
      `дубли ${arrow(b.audit && b.audit.duplicates, a && a.duplicates)}`,
      `IPA ${arrow(b.audit && b.audit.ipa, a && a.ipa)}`,
      `карточек ${arrow(b.stats && b.stats.cards, h.stats && h.stats.cards)}`,
    ].join(' · '));
  }
  L.push(`Логи: ${h.out}/ (unit.log, e2e.log, audit/content-audit.md) — читать только при красном`);
  return L.join('\n');
}

/** Новый текст раздела «Эталон»: строка для автора + машинная строка для скрипта. */
export function baselineSection(h, note) {
  const b = {
    date: h.date, sha: h.git.sha, nproc: h.nproc,
    unit: h.unit && h.unit.total, e2e: h.e2e && h.e2e.total,
    e2eMin: h.e2e && h.e2e.durationMs ? Math.round(h.e2e.durationMs / 6000) / 10 : null,
    flaky: h.e2e ? h.e2e.flaky : null,
    ...(h.audit || {}), cards: h.stats && h.stats.cards, planDone: h.stats && h.stats.planDone,
  };
  const human = `На ${b.date}, main${note ? ' ' + note : ''} (${b.sha}), \`nproc\` = ${b.nproc}: юнит ${b.unit}, ` +
    `E2E ${b.e2e} (${String(b.e2eMin).replace('.', ',')} мин, flaky ${b.flaky}),\nаудит — IPA ${b.ipa}, британской IPA ${b.looseIpa}, ` +
    `книжное ${b.bookish}, дубли ${b.duplicates}; карточек ${b.cards}; план «+4000» — ${b.planDone}.`;
  return `## Эталон\n\n${human}\n<!-- ${BASELINE_TAG} ${JSON.stringify(b)} -->\n\n`;
}

/* ───────────────────────── запуск ───────────────────────── */

function runTo(cmd, args, logFile, env = {}, timeoutMs = 20 * 60 * 1000) {
  const fd = fs.openSync(logFile, 'w');
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: ['ignore', fd, fd], env: { ...process.env, ...env }, timeout: timeoutMs });
  fs.closeSync(fd);
  return r.status;
}
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const git = (...a) => { const r = spawnSync('git', a, { cwd: ROOT, encoding: 'utf8' }); return (r.stdout || '').trim(); };

function ensureEnv() {
  const shim = path.join(ROOT, 'node_modules', 'vitest', 'package.json');
  if (fs.existsSync(shim) && fs.existsSync(path.join(ROOT, 'node_modules', '@playwright', 'test'))) return;
  const r = spawnSync('bash', [path.join(path.dirname(fileURLToPath(import.meta.url)), 'er-test-env.sh')], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ER_ROOT: ROOT } });
  if (r.status !== 0) throw new Error('er-test-env.sh не отработал: ' + oneLine(r.stderr || r.stdout, 300));
}

function collect(opts) {
  const out = path.join(OUT_BASE, opts.label);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const t0 = Date.now();
  const h = {
    label: opts.label, out, date: new Date().toISOString().slice(0, 10), nproc: os.cpus().length,
    git: { branch: git('rev-parse', '--abbrev-ref', 'HEAD'), sha: git('rev-parse', '--short', 'HEAD'), dirty: !!git('status', '--porcelain') },
    skipE2e: !!opts.skipE2e,
  };
  ensureEnv();

  runTo('npm', ['test', '--', '--reporter=json', '--outputFile=' + path.join(out, 'unit.json')], path.join(out, 'unit.log'));
  const uj = readJson(path.join(out, 'unit.json'));
  h.unit = uj ? summarizeVitest(uj) : null;

  if (!opts.skipE2e) {
    const ej = path.join(out, 'e2e.json');
    runTo('npm', ['run', 'test:e2e', '--', '--reporter=line,json'], path.join(out, 'e2e.log'),
      { PLAYWRIGHT_JSON_OUTPUT_FILE: ej, PLAYWRIGHT_JSON_OUTPUT_NAME: ej, CI: '' });
    const pj = readJson(ej);
    h.e2e = pj ? summarizePlaywright(pj) : null;
  }

  const cmu = opts.cmu || process.env.ER_CMU;
  const auditDir = path.join(out, 'audit');
  runTo('node', [path.join(ROOT, 'scripts', 'audit_content.mjs'), '--out', auditDir, ...(cmu ? ['--cmu', cmu] : [])], path.join(out, 'audit.log'));
  const aj = readJson(path.join(auditDir, 'content-audit.json'));
  if (aj) h.audit = summarizeAudit(aj);
  else if (fs.existsSync(path.join(out, 'audit.log'))) {
    const p = parseAuditLine(fs.readFileSync(path.join(out, 'audit.log'), 'utf8'));
    h.audit = p.ipa == null ? null : p;
  }

  const sr = spawnSync('node', [path.join(ROOT, 'scripts', 'content_stats.mjs'), '--json'], { cwd: ROOT, encoding: 'utf8' });
  const sj = (() => { try { return JSON.parse(sr.stdout); } catch { return null; } })();
  if (sj) h.stats = { cards: sj.total, planDone: sj.plan && sj.plan.done };

  h.elapsedMs = Date.now() - t0;
  fs.writeFileSync(path.join(out, 'health.json'), JSON.stringify(h, null, 1));
  return h;
}

function report(h) {
  const base = fs.existsSync(EVOLUTION) ? parseBaseline(fs.readFileSync(EVOLUTION, 'utf8')) : null;
  const before = h.label !== 'before' ? readJson(path.join(OUT_BASE, 'before', 'health.json')) : null;
  const verdict = evaluate(h, base, before);
  const text = formatSummary(h, verdict, base, before);
  fs.writeFileSync(path.join(h.out, 'summary.txt'), text + '\n');
  fs.writeFileSync(path.join(h.out, 'verdict.json'), JSON.stringify(verdict, null, 1));
  console.log(text);
  return verdict.status === 'red' ? 1 : 0;
}

function parseArgs(argv) {
  const o = { label: 'before' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--label') o.label = argv[++i];
    else if (a === '--cmu') o.cmu = argv[++i];
    else if (a === '--note') o.note = argv[++i];
    else if (a === '--skip-e2e') o.skipE2e = true;
    else if (a === '--bg') o.bg = true;
    else if (a === '--wait') o.wait = true;
    else if (a === '--summary') o.summary = true;
    else if (a === '--baseline-update') o.baselineUpdate = true;
    else if (a === '-h' || a === '--help') o.help = true;
    else { console.error('er-health: непонятный аргумент ' + a); process.exit(2); }
  }
  if (!/^[\w.-]+$/.test(o.label)) { console.error('er-health: label — латиница, цифры, - _ .'); process.exit(2); }
  return o;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.help) { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]); return 0; }
  const out = path.join(OUT_BASE, o.label);
  const done = path.join(out, 'health.json');

  if (o.baselineUpdate) {
    const h = readJson(done);
    if (!h) { console.error(`er-health: нет прогона «${o.label}» (${done})`); return 2; }
    if (!h.unit || (!h.e2e && !h.skipE2e) || h.skipE2e) { console.error('er-health: для эталона нужен полный прогон без --skip-e2e'); return 2; }
    const md = fs.readFileSync(EVOLUTION, 'utf8');
    const sec = baselineSection(h, o.note);
    const next = /^## Эталон\s*\n[\s\S]*?(?=^## |(?![\s\S]))/m.test(md)
      ? md.replace(/^## Эталон\s*\n[\s\S]*?(?=^## |(?![\s\S]))/m, sec)
      : md.replace(/^## Бэклог/m, sec + '## Бэклог');
    fs.writeFileSync(EVOLUTION, next);
    console.log('Эталон в docs/EVOLUTION.md обновлён:\n' + sec.trim());
    return 0;
  }
  if (o.summary) {
    const h = readJson(done);
    if (!h) { console.error(`er-health: нет готового прогона «${o.label}»`); return 2; }
    return report(h);
  }
  if (o.bg) {
    fs.rmSync(out, { recursive: true, force: true });
    fs.mkdirSync(out, { recursive: true });
    const args = [fileURLToPath(import.meta.url), '--label', o.label, ...(o.skipE2e ? ['--skip-e2e'] : []), ...(o.cmu ? ['--cmu', o.cmu] : [])];
    const fd = fs.openSync(path.join(OUT_BASE, `${o.label}.bg.log`), 'w');
    const child = spawn(process.execPath, args, { cwd: ROOT, detached: true, stdio: ['ignore', fd, fd] });
    child.unref();
    console.log(`er-health: прогон «${o.label}» запущен в фоне (pid ${child.pid}). Ждать: node scripts/er-health.mjs --wait --label ${o.label}`);
    return 0;
  }
  if (o.wait) {
    const until = Date.now() + 9 * 60 * 1000 - 15000;
    while (Date.now() < until) {
      if (fs.existsSync(done)) return report(readJson(done));
      await new Promise((r) => setTimeout(r, 5000));
    }
    console.log(`er-health: «${o.label}» ещё идёт — вызвать --wait ещё раз`);
    return 3;
  }
  try {
    return report(collect(o));
  } catch (err) {
    console.error('er-health: прогон не состоялся — ' + err.message);
    return 2;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().then((code) => process.exit(code));
}
