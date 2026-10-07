/**
 * Репортёр node:test → JSON в формате репортёра json у vitest (как у Jest):
 * numTotalTests, numPassedTests, numFailedTests, numPendingTests, testResults[].assertionResults[].
 * Его читает scripts/er-health.mjs — одинаково с настоящим vitest и с этим шимом.
 */
import path from 'node:path';

export default async function* jsonReporter(source) {
  const files = new Map();      // file → { stack: [], results: [] }
  const fileOf = (f) => {
    const key = f || '(unknown)';
    if (!files.has(key)) files.set(key, { stack: [], results: [] });
    return files.get(key);
  };
  const started = Date.now();

  for await (const ev of source) {
    const d = ev.data || {};
    if (ev.type === 'test:start') {
      const f = fileOf(d.file);
      f.stack.length = d.nesting;
      f.stack[d.nesting] = d.name;
      continue;
    }
    if (ev.type !== 'test:pass' && ev.type !== 'test:fail') continue;
    const f = fileOf(d.file);
    const det = d.details || {};
    const err = det.error;
    const isSuite = det.type === 'suite';
    // Упавший describe считаем, только если упал он сам (а не его тесты), иначе — только тесты внутри
    if (isSuite && (ev.type === 'test:pass' || (err && err.failureType === 'subtestsFailed'))) continue;
    // Файл целиком (nesting 0 с именем = путь файла) — если упал при загрузке, это провал
    const ancestors = f.stack.slice(0, d.nesting).filter(Boolean);
    let status = ev.type === 'test:pass' ? 'passed' : 'failed';
    if (d.skip) status = 'skipped';
    if (d.todo) status = 'todo';
    const cause = err && (err.cause || err);
    f.results.push({
      ancestorTitles: ancestors,
      title: d.name,
      fullName: [...ancestors, d.name].join(' > '),
      status,
      duration: det.duration_ms,
      failureMessages: status === 'failed' && cause ? [String(cause.message || cause).slice(0, 2000)] : [],
    });
  }

  const testResults = [...files.entries()].map(([file, f]) => ({
    name: path.resolve(file),
    status: f.results.some((r) => r.status === 'failed') ? 'failed' : 'passed',
    assertionResults: f.results,
  }));
  const all = testResults.flatMap((t) => t.assertionResults);
  const count = (s) => all.filter((r) => r.status === s).length;
  const out = {
    numTotalTests: all.length,
    numPassedTests: count('passed'),
    numFailedTests: count('failed'),
    numPendingTests: count('skipped'),
    numTodoTests: count('todo'),
    numTotalTestSuites: testResults.length,
    startTime: started,
    success: count('failed') === 0,
    testResults,
    shim: 'er-vitest-shim',
  };
  yield JSON.stringify(out) + '\n';
}
