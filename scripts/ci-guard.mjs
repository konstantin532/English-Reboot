#!/usr/bin/env node
/**
 * scripts/ci-guard.mjs — сторож релиза «до» (dev-инструмент, на Pages не попадает): задание CI / guard.
 *
 * Push в main — это выпуск ученикам. Сторож правил (er-guard.mjs) и аудит контента раньше шли только
 * внутри сессий скилла english-reboot-evolve; ручная правка автора, PR от Dependabot или любой другой
 * мимо них проходили. Теперь то же самое проверяет CI на каждом PR и push:
 *   - er-guard против базы: CACHE_VERSION и *_VERSION подняты, новые файлы — в index.html и sw.js,
 *     без переименований, зависимостей приложения, TypeScript, британского написания и т.д.;
 *   - аудит контента «база → сейчас»: IPA и британская IPA — 0; книжное и дубли не выросли
 *     (британские слова / написание выросли — предупреждение, не провал).
 * Итог — в сводке задания на GitHub ($GITHUB_STEP_SUMMARY) по-русски.
 *
 *   node scripts/ci-guard.mjs --base <ref>   # база: в PR — base.sha, на push — прошлый main
 *
 * Код выхода: 0 — можно выпускать (предупреждения не мешают), 1 — нарушение.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { summarizeAudit } from './er-health.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
const git = (args) => { const r = run('git', args); return r.status === 0 ? r.stdout.trim() : null; };

/** Аудит «база → сейчас» → { red: [...], warn: [...] }; base может быть null (аудита в базе не было) */
export function auditVerdict(base, head) {
  const red = [], warn = [];
  if (!head) return { red: ['аудит контента не запустился'], warn };
  if (head.ipa > 0) red.push(`IPA: ${head.ipa} (должно быть 0)`);
  if (head.looseIpa > 0) red.push(`британская IPA: ${head.looseIpa} (должно быть 0)`);
  for (const [k, name] of [['bookish', 'книжное'], ['duplicates', 'дубли']]) {
    if (base && base[k] != null && head[k] > base[k]) red.push(`${name} выросло: ${base[k]} → ${head[k]}`);
  }
  for (const [k, name] of [['words', 'британские слова'], ['spelling', 'британское написание'], ['brSlang', 'британский сленг']]) {
    const ref = base && base[k] != null ? base[k] : 0;
    if (head[k] != null && head[k] > ref) warn.push(`${name}: ${ref} → ${head[k]} — проверить`);
  }
  return { red, warn };
}

/** База из аргумента: пустая, нули (первый push ветки) или неизвестный коммит — предыдущий коммит */
export function pickBase(arg, verify) {
  const ok = (r) => r && !/^0+$/.test(r) && verify(r);
  if (ok(arg)) return arg;
  return verify('HEAD~1') ? 'HEAD~1' : null;
}

/** Сводка задания (markdown) */
export function summary({ base, guardText, guardCode, before, after, verdict }) {
  const ok = guardCode === 0 && !verdict.red.length;
  const L = [`## ${ok ? '✅' : '❌'} Сторож релиза: ${ok ? 'можно выпускать' : 'есть нарушения'}`, '', `База сравнения: \`${base}\``, ''];
  L.push('### Правила проекта (er-guard)', '', '```', guardText.trim() || '(нет вывода)', '```', '');
  L.push('### Аудит контента', '', '| | база | сейчас |', '|---|---|---|');
  for (const [k, name] of [['ipa', 'IPA (должно быть 0)'], ['looseIpa', 'британская IPA (0)'], ['bookish', 'книжное'], ['duplicates', 'дубли'],
    ['words', 'британские слова'], ['spelling', 'британское написание']]) {
    const v = (o) => (o && o[k] != null ? o[k] : '—');
    L.push(`| ${name} | ${v(before)} | ${v(after)} |`);
  }
  for (const r of verdict.red) L.push('', `- ❌ ${r}`);
  for (const w of verdict.warn) L.push('', `- ⚠️ ${w}`);
  return L.join('\n') + '\n';
}

function audit(root, out) {
  const script = path.join(root, 'scripts', 'audit_content.mjs');
  if (!fs.existsSync(script)) return null;
  const r = spawnSync('node', [script, '--out', out], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  try { return summarizeAudit(JSON.parse(fs.readFileSync(path.join(out, 'content-audit.json'), 'utf8'))); } catch {
    if (r.stderr) console.error(r.stderr.trim().split('\n').slice(-5).join('\n'));
    return null;
  }
}

function main() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--base');
  const base = pickBase(i >= 0 ? argv[i + 1] : null, (r) => git(['rev-parse', '--verify', '--quiet', `${r}^{commit}`]) != null);
  if (!base) { console.error('ci-guard: не с чем сравнивать (нет базы и нет предыдущего коммита)'); return 1; }

  const g = run('node', [path.join(ROOT, 'scripts', 'er-guard.mjs'), '--base', base]);
  // упал сам сторож (нет его строки итога) — в сводку хвост ошибки, это тоже провал
  const guardText = /СТОРОЖ ПРАВИЛ/.test(g.stdout || '') ? g.stdout : `сторож не отработал (код ${g.status}):\n${(g.stdout || '') + (g.stderr || '')}`.slice(-3000);
  const guardCode = g.status === 0 ? 0 : 1;

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-guard-'));
  const after = audit(ROOT, path.join(tmp, 'after'));
  let before = null;
  const wt = path.join(tmp, 'base');
  if (git(['worktree', 'add', '--detach', '--quiet', wt, base]) != null) {
    before = audit(wt, path.join(tmp, 'before'));
    git(['worktree', 'remove', '--force', wt]);
  }
  const verdict = auditVerdict(before, after);

  const md = summary({ base: base.length === 40 ? base.slice(0, 7) : base, guardText, guardCode, before, after, verdict });
  console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  fs.rmSync(tmp, { recursive: true, force: true });
  return guardCode || verdict.red.length ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) process.exit(main());
