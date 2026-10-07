#!/usr/bin/env node
/**
 * `vitest run [фильтр…] [--reporter=json --outputFile=путь]` на node:test (шим для облачной сессии).
 * Файлы — как в vitest.config.js: tests/**\/*.test.js без tests/e2e. Фильтр — подстрока пути, как у vitest.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2).filter((a) => a !== 'run');
let reporter = null, outputFile = null;
const filters = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  const val = (name) => (a.startsWith(name + '=') ? a.slice(name.length + 1) : a === name ? args[++i] : null);
  let v;
  if ((v = val('--reporter')) !== null) reporter = v;
  else if ((v = val('--outputFile')) !== null) outputFile = v;
  else if (a.startsWith('-')) { /* прочие флаги vitest шим молча пропускает */ }
  else filters.push(a);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'e2e' || e.name === 'node_modules' ? [] : walk(p);
    return e.name.endsWith('.test.js') ? [p] : [];
  });
}
let files = walk('tests').sort();
if (filters.length) files = files.filter((f) => filters.some((s) => f.includes(s)));
if (!files.length) { console.error('vitest-шим: нет тестов под фильтр ' + filters.join(' ')); process.exit(1); }

const node = ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', '--disable-warning=ExperimentalWarning', '--test',
  '--test-reporter=spec', '--test-reporter-destination=stdout'];
if (reporter === 'json') {
  const dest = outputFile ? path.resolve(outputFile) : '/dev/stdout';
  if (outputFile) fs.mkdirSync(path.dirname(dest), { recursive: true });
  node.push('--test-reporter=' + path.join(HERE, 'json-reporter.js'), '--test-reporter-destination=' + dest);
}
const r = spawnSync(process.execPath, [...node, ...files], { stdio: 'inherit' });
process.exit(r.status ?? 1);
