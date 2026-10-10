import { describe, it, expect } from 'vitest';
import {
  summarizeVitest, summarizePlaywright, parseBaseline, evaluate, baselineSection, summarizeAudit, parseAuditLine,
} from '../scripts/er-health.mjs';
import { addedLines, removedLines, check, compareCards, isAppFile, swAssets, indexRefs } from '../scripts/er-guard.mjs';
import { sections, checkboxes, scoutAge, versions, archiveJournal, latestMetric } from '../scripts/er-brief.mjs';
import { summarizeRuns, slugFromUrl, vitestTotal, countLine, ciVerdict, annotationTotal } from '../scripts/er-ci.mjs';
import { formatUnit, formatE2e, jobLimitMin, jobStatus } from '../scripts/er.mjs';
import { codeDiff, isDataHunk, collapseData, similarity, cardText, markedLine, marksSample, ipaChanges, dictStats, dictNote, codePrompt, pedagoguePrompt } from '../scripts/er-review.mjs';
import { cardDiff, stripParts } from '../scripts/er-cards.mjs';
import { nextIdsOf, retiredIds, prLine } from '../scripts/er-brief.mjs';
import { usageOf, formatUsage, journalLine, historyLine, callLabel } from '../scripts/er-usage.mjs';
import { lessonsOf, addLesson, lessonsLine } from '../scripts/er-lessons.mjs';

/* Скрипты скилла english-reboot-evolve: модель верит их сводкам вместо логов, поэтому разбор и
   решения «красное/зелёное» стерегутся тестами. */

const BASE_TEXT = `## Эталон

На 2026-10-06, main после пакета A1+, часть 1 (PR #5), \`nproc\` = 2: юнит 232, E2E 53 (5,3 мин, flaky 0),
аудит — IPA 0, британской IPA 0, книжное 5, дубли 8; карточек 2729; план «+4000» — 930.

## Бэклог
`;

const health = (over = {}) => ({
  label: 'after', out: '/tmp/x', date: '2026-10-07', nproc: 2, elapsedMs: 300000,
  git: { branch: 'feature/x', sha: 'abc1234', dirty: false },
  unit: { total: 240, passed: 240, failed: 0, skipped: 0, failures: [] },
  e2e: { total: 54, passed: 54, failed: 0, flaky: 0, skipped: 0, durationMs: 280000, failures: [], flakyNames: [] },
  audit: { ipa: 0, looseIpa: 0, words: 0, spelling: 0, brSlang: 0, bookish: 5, duplicates: 8 },
  stats: { cards: 2800, planDone: 1000 },
  ...over,
});

describe('er-health: разбор отчётов', () => {
  it('JSON vitest: считает упавшие и даёт их имена с сообщением', () => {
    const s = summarizeVitest({
      numTotalTests: 3, numPassedTests: 1, numFailedTests: 1, numPendingTests: 1,
      testResults: [{ name: '/r/tests/a.test.js', status: 'failed', assertionResults: [
        { fullName: 'A > ok', status: 'passed', failureMessages: [] },
        { fullName: 'A > bad', status: 'failed', failureMessages: ['expected 1\n  to be 2'] },
        { fullName: 'A > skip', status: 'skipped', failureMessages: [] },
      ] }],
    });
    expect(s.total).toBe(3);
    expect(s.failed).toBe(1);
    expect(s.skipped).toBe(1);
    expect(s.failures[0].name).toBe('a.test.js: A > bad');
    expect(s.failures[0].message).toBe('expected 1 to be 2');
  });

  it('JSON vitest: файл, упавший при загрузке, — тоже провал', () => {
    const s = summarizeVitest({ numTotalTests: 0, numFailedTests: 0, testResults: [{ name: '/r/tests/b.test.js', status: 'failed', message: 'SyntaxError', assertionResults: [] }] });
    expect(s.failed).toBe(1);
    expect(s.failures[0].name).toBe('b.test.js');
  });

  it('JSON Playwright: flaky отдельно от упавших, с именами для бэклога', () => {
    const spec = (title, status, line) => ({ title, file: 'today.spec.js', line, tests: [{ status, results: [{ error: status === 'unexpected' ? { message: '\x1b[31mTimeout\x1b[0m 5000ms' } : null }] }] });
    const s = summarizePlaywright({
      stats: { expected: 1, unexpected: 1, flaky: 1, skipped: 0, duration: 120000 },
      suites: [{ title: 'today.spec.js', specs: [spec('ок', 'expected', 3), spec('мигает', 'flaky', 9), spec('падает', 'unexpected', 20)] }],
    });
    expect(s.total).toBe(3);
    expect(s.failed).toBe(1);
    expect(s.flaky).toBe(1);
    expect(s.flakyNames).toEqual(['today.spec.js:9 › мигает']);
    expect(s.failures[0].message).toBe('Timeout 5000ms');
  });

  it('аудит: JSON и строка консоли дают одни числа', () => {
    expect(summarizeAudit({ ipa: [], looseIpa: [], words: [], spelling: [1], brSlang: [], bookish: [1, 2], duplicates: [1] }))
      .toEqual({ ipa: 0, looseIpa: 0, words: 0, spelling: 1, brSlang: 0, bookish: 2, duplicates: 1 });
    const p = parseAuditLine('Карточек: 2729. IPA: 0 (авто: 0, вручную: 0), прочая IPA: 0, слова: 0, написание: 1, книжное: 5, дубли: 8');
    expect(p.cards).toBe(2729);
    expect(p.bookish).toBe(5);
    expect(p.spelling).toBe(1);
  });
});

describe('er-health: эталон', () => {
  it('читает эталон, написанный текстом', () => {
    const b = parseBaseline(BASE_TEXT);
    expect(b.unit).toBe(232);
    expect(b.e2e).toBe(53);
    expect(b.e2eMin).toBe(5.3);
    expect(b.flaky).toBe(0);
    expect(b.nproc).toBe(2);
    expect(b.bookish).toBe(5);
    expect(b.duplicates).toBe(8);
    expect(b.cards).toBe(2729);
    expect(b.planDone).toBe(930);
  });

  it('эталон, записанный скриптом, читается обратно теми же числами', () => {
    const md = '# E\n\n' + baselineSection(health(), 'после PR #6') + '## Бэклог\n';
    const b = parseBaseline(md);
    expect(b.source).toBe('json');
    expect(b.unit).toBe(240);
    expect(b.e2e).toBe(54);
    expect(b.e2eMin).toBe(4.7);
    expect(b.cards).toBe(2800);
    expect(md).toMatch(/юнит 240, E2E 54 \(4,7 мин, flaky 0\)/);
  });

  it('нет раздела — null', () => { expect(parseBaseline('# E\n## Бэклог\n')).toBe(null); });
});

describe('er-health: красное, жёлтое, зелёное', () => {
  const base = parseBaseline(BASE_TEXT);
  it('всё как надо — зелёное', () => { expect(evaluate(health(), base, null).status).toBe('green'); });
  it('упал юнит — красное', () => {
    expect(evaluate(health({ unit: { total: 240, passed: 239, failed: 1, skipped: 0, failures: [] } }), base, null).status).toBe('red');
  });
  it('тестов меньше эталона — красное', () => {
    expect(evaluate(health({ unit: { total: 200, passed: 200, failed: 0, skipped: 0, failures: [] } }), base, null).status).toBe('red');
  });
  it('тестов меньше, чем до итерации — красное', () => {
    expect(evaluate(health(), base, health({ unit: { total: 250, passed: 250, failed: 0, skipped: 0, failures: [] } })).red.join()).toMatch(/меньше, чем до итерации/);
  });
  it('выросли «книжное» или «дубли», появилась IPA — красное', () => {
    expect(evaluate(health({ audit: { ...health().audit, duplicates: 9 } }), base, null).status).toBe('red');
    expect(evaluate(health({ audit: { ...health().audit, ipa: 1 } }), base, null).status).toBe('red');
  });
  it('flaky и медленный E2E — жёлтое, с именами', () => {
    const v = evaluate(health({ e2e: { ...health().e2e, flaky: 1, flakyNames: ['x.spec.js:1 › t'], durationMs: 9 * 60000 } }), base, null);
    expect(v.status).toBe('yellow');
    expect(v.warn.join()).toMatch(/x\.spec\.js:1/);
    expect(v.warn.join()).toMatch(/1,5 раза/);
  });
  it('время сравнивается только при том же nproc', () => {
    expect(evaluate(health({ nproc: 8, e2e: { ...health().e2e, durationMs: 9 * 60000 } }), base, null).status).toBe('green');
  });
  it('E2E не запустились — красное, а не «зелёное без E2E»', () => {
    expect(evaluate(health({ e2e: null }), base, null).status).toBe('red');
  });
});

const ctxOf = (over = {}) => ({
  baseRef: 'abc', files: [], added: {}, removed: {},
  base: { sw: "const CACHE_VERSION = 'er-v34';\nconst ASSETS = ['./', './js/a.js'];", app: "const VOCAB_VERSION = '1.0.0';", gamify: '', db: 'const DB_VERSION = 2;', pkg: { devDependencies: {} } },
  head: {
    sw: "const CACHE_VERSION = 'er-v34';\nconst ASSETS = ['./', './js/a.js'];", index: '<script src="js/a.js"></script>',
    app: "const VOCAB_VERSION = '1.0.0';", gamify: '', db: 'const DB_VERSION = 2;', pkg: { devDependencies: {} }, exists: () => true,
  },
  ...over,
});
const bad = (R) => R.filter((r) => r.level === '✗').map((r) => `[${r.rule}] ${r.text}`);

describe('er-guard: сторож правил', () => {
  it('разбирает добавленные и удалённые строки диффа с номерами', () => {
    const diff = 'diff --git a/js/a.js b/js/a.js\n--- a/js/a.js\n+++ b/js/a.js\n@@ -3,2 +3,3 @@\n-old\n+new1\n+new2\n ctx\n';
    expect(addedLines(diff)['js/a.js']).toEqual([{ line: 3, text: 'new1' }, { line: 4, text: 'new2' }]);
    expect(removedLines(diff)['js/a.js']).toEqual([{ line: 3, text: 'old' }]);
  });

  it('файлы приложения и dev-файлы различаются', () => {
    expect(isAppFile('js/today.js')).toBe(true);
    expect(isAppFile('index.html')).toBe(true);
    expect(isAppFile('scripts/er-guard.mjs')).toBe(false);
    expect(isAppFile('tests/today.test.js')).toBe(false);
    expect(isAppFile('docs/EVOLUTION.md')).toBe(false);
  });

  it('sw.js и index.html читаются', () => {
    expect(swAssets("const ASSETS = [\n  './', './js/a.js', './css/s.css',\n];")).toEqual(['js/a.js', 'css/s.css']);
    expect(indexRefs('<link rel="icon" href="data:x"><link rel="stylesheet" href="css/s.css"><script src="js/a.js"></script>')).toEqual(['css/s.css', 'js/a.js']);
  });

  it('только dev-файлы — нарушений нет', () => {
    expect(bad(check(ctxOf({ files: [{ status: 'A', path: 'scripts/x.mjs' }] })))).toEqual([]);
  });

  it('файл приложения изменён без CACHE_VERSION — нарушение правила 2', () => {
    expect(bad(check(ctxOf({ files: [{ status: 'M', path: 'js/a.js' }] }))).join()).toMatch(/\[2\].*CACHE_VERSION/);
  });

  it('новый js без index.html и sw.js, переименование — нарушения', () => {
    const c = ctxOf({ files: [{ status: 'A', path: 'js/b.js' }, { status: 'R', from: 'js/c.js', path: 'js/d.js' }] });
    c.head.sw = c.head.sw.replace('er-v34', 'er-v35');
    const out = bad(check(c)).join('\n');
    expect(out).toMatch(/js\/b\.js не подключён в index\.html/);
    expect(out).toMatch(/js\/b\.js нет в списке кэша sw\.js/);
    expect(out).toMatch(/\[4\] переименован js\/c\.js → js\/d\.js/);
  });

  it('контент изменён без *_VERSION и с другой фразой на том же номере без миграции — нарушения правила 11', () => {
    const c = ctxOf({
      files: [{ status: 'M', path: 'js/content_vocab.js' }],
      cards: compareCards(
        { sections: { phrasal: [{ id: 'pv_001', payload: { front: 'come in' } }] } },
        { sections: { phrasal: [{ id: 'pv_001', payload: { front: 'go out' } }, { id: 'pv_002', payload: { front: 'sit down' } }] } }),
    });
    c.head.sw = c.head.sw.replace('er-v34', 'er-v35');
    const out = bad(check(c)).join('\n');
    expect(out).toMatch(/\*_VERSION/);
    expect(out).toMatch(/pv_001: «come in» → «go out».*content_migrate/);
  });

  it('новые карточки в конец с поднятой версией — без нарушений', () => {
    const c = ctxOf({
      files: [{ status: 'M', path: 'js/content_vocab.js' }],
      cards: compareCards({ sections: { phrasal: [{ id: 'pv_001', payload: { front: 'come in' } }] } },
        { sections: { phrasal: [{ id: 'pv_001', payload: { front: 'come in' } }, { id: 'pv_002', payload: { front: 'sit down' } }] } }),
    });
    c.head.sw = c.head.sw.replace('er-v34', 'er-v35');
    c.head.app = "const VOCAB_VERSION = '1.1.0';";
    expect(bad(check(c))).toEqual([]);
  });

  it('skip в тестах и ослабленный конфиг — нарушения «не покупать зелёные тесты»', () => {
    const out = bad(check(ctxOf({
      files: [{ status: 'M', path: 'tests/a.test.js' }, { status: 'M', path: 'playwright.config.js' }],
      added: { 'tests/a.test.js': [{ line: 5, text: "  it.skip('x', () => {});" }], 'playwright.config.js': [{ line: 5, text: '  retries: 5,' }] },
    }))).join('\n');
    expect(out).toMatch(/tests\/a\.test\.js:5 skip/);
    expect(out).toMatch(/playwright\.config\.js:5/);
  });

  it('innerHTML с переменной и сеть — на проверку глазами (правило 13)', () => {
    const c = ctxOf({ files: [{ status: 'M', path: 'js/a.js' }], added: { 'js/a.js': [
      { line: 7, text: "el.innerHTML = '<b>' + name + '</b>';" },
      { line: 8, text: "el.innerHTML = '<b>' + escapeHtml(name) + '</b>';" },
      { line: 9, text: 'fetch(url);' },
    ] } });
    const look = check(c).filter((r) => r.level === '?' && r.rule === 13).map((r) => r.text).join('\n');
    expect(look).toMatch(/js\/a\.js:7/);
    expect(look).not.toMatch(/js\/a\.js:8/);
    expect(look).toMatch(/js\/a\.js:9 сетевой запрос/);
  });

  it('субтитры с таймкодом — нарушение авторского права', () => {
    const out = bad(check(ctxOf({ files: [{ status: 'M', path: 'js/content_us.js' }], added: { 'js/content_us.js': [{ line: 1, text: '00:00:01,000 --> 00:00:02,000' }] } }))).join();
    expect(out).toMatch(/\[©\].*субтитры/);
  });
});

describe('er-brief: выжимка EVOLUTION.md', () => {
  it('PR от бота помечен: в лимит «один открытый PR от скилла» не входит', () => {
    const pr = (login, type) => ({ number: 14, head: { ref: 'dependabot/npm_and_yarn/dev-1' }, title: 'bump', user: { login, type }, updated_at: '2026-11-01T06:00:00Z' });
    expect(prLine(pr('dependabot[bot]', 'Bot'))).toMatch(/бот, не от скилла/);
    expect(prLine(pr('renovate[bot]'))).toMatch(/бот, не от скилла/);
    const own = prLine(pr('konstantin532', 'User'), ' · er-v37');
    expect(own).not.toMatch(/бот/);
    expect(own).toBe('  #14 dependabot/npm_and_yarn/dev-1 — bump (konstantin532, 2026-11-01) · er-v37');
  });
  const md = '# E\n## Планы автора\n### План X\n- [x] шаг 1\n- [ ] шаг 2\n  продолжение\n## Бэклог\n- [ ] одно\n- [x] другое\n## Разведка 2026-09-01\n';
  it('разделы и чекбоксы', () => {
    expect(sections(md).map((s) => s.title)).toEqual(['Планы автора', 'Бэклог', 'Разведка 2026-09-01']);
    const cb = checkboxes(sections(md)[0].body);
    expect(cb.map((c) => c.done)).toEqual([true, false]);
    expect(cb[1].text).toMatch(/шаг 2\n {2}продолжение/);
  });
  it('разведка старше 30 дней — нужна', () => {
    expect(scoutAge(md, new Date('2026-10-07T00:00:00Z'))).toEqual({ date: '2026-09-01', days: 36, due: true });
    expect(scoutAge('# пусто').due).toBe(true);
  });
  it('версии собираются из всех файлов', () => {
    const v = versions({ 'sw.js': "const CACHE_VERSION = 'er-v34';", 'js/db.js': 'const DB_VERSION = 2;' });
    expect(v.CACHE_VERSION.value).toBe('er-v34');
    expect(v.DB_VERSION.value).toBe('2');
  });
});

describe('er-ci: состояние проверок одной строкой', () => {
  it('зелёное, красное, идёт', () => {
    const run = (name, status, conclusion) => ({ name, status, conclusion, started_at: '2026-10-07T00:00:00Z', completed_at: '2026-10-07T00:04:00Z' });
    expect(summarizeRuns([run('test', 'completed', 'success'), run('pages', 'completed', 'skipped')]).state).toBe('success');
    expect(summarizeRuns([run('test', 'completed', 'failure')]).state).toBe('failure');
    expect(summarizeRuns([run('test', 'in_progress', null)]).state).toBe('pending');
    expect(summarizeRuns([]).state).toBe('none');
    expect(summarizeRuns([run('test', 'completed', 'success')]).line).toBe('CI: ✓ test (success, 4 мин)');
  });
  it('slug репозитория из адреса remote', () => {
    expect(slugFromUrl('https://github.com/konstantin532/english-reboot')).toBe('konstantin532/english-reboot');
    expect(slugFromUrl('git@github.com:konstantin532/English-Reboot.git')).toBe('konstantin532/English-Reboot');
  });
});

describe('er test / er e2e: одна строка вместо лога', () => {
  it('зелёный прогон — одна строка, красный — упавшие с сообщением', () => {
    expect(formatUnit({ total: 280, passed: 280, failed: 0, skipped: 0, failures: [] }, 8500, '/l')).toBe('юнит 280/280 ✓ (8,5 с)');
    const red = formatUnit({ total: 3, passed: 2, failed: 1, skipped: 0, failures: [{ name: 'today.test.js: урок', message: 'expected 1 to be 2' }] }, 900, '/tmp/u.log');
    expect(red).toMatch(/упало 1 из 3/);
    expect(red).toMatch(/today\.test\.js: урок/);
    expect(red).toMatch(/лог: \/tmp\/u\.log/);
    expect(formatE2e({ total: 5, passed: 4, failed: 0, flaky: 1, flakyNames: ['a.spec.js:3 › t'], failures: [] }, 47000, '/l')).toBe('E2E 5/5 ✓ · flaky 1: a.spec.js:3 › t (47 с)');
  });
});

describe('er-review: каждому ревизору — свой срез', () => {
  it('сгенерированные словари выпадают из диффа кода, строки данных сворачиваются', () => {
    const diff = 'diff --git a/js/lex_us.js b/js/lex_us.js\n--- a/js/lex_us.js\n+++ b/js/lex_us.js\n@@ -1 +1 @@\n-x\n+y\n' +
      "diff --git a/js/content_words.js b/js/content_words.js\n--- a/js/content_words.js\n+++ b/js/content_words.js\n@@ -10,2 +10,4 @@\n+  const PHRASAL_DATA = [\n+    ['come over', 'фраз. глаг.', 'зайти'],\n+    ['lie down', 'фраз. глаг.', 'прилечь'],\n+  ];\n" +
      'diff --git a/js/today.js b/js/today.js\n--- a/js/today.js\n+++ b/js/today.js\n@@ -1 +1 @@\n-a()\n+b()\n';
    const r = codeDiff(diff);
    expect(r.generated).toEqual(['js/lex_us.js']);
    expect(r.text).toContain('const PHRASAL_DATA = [');
    expect(r.text).not.toContain('come over');
    expect(r.text).toContain('строк данных');
    expect(r.text).toContain('+b()');
  });
  it('хунк из одних данных распознаётся, хунк с кодом — нет', () => {
    expect(isDataHunk(['@@', "+    ['a', 'b'],", "+    w('I','pron','/aɪ/'),"])).toBe(true);
    expect(isDataHunk(['@@', "+    ['a', 'b'],", '+  const x = f(y);'])).toBe(false);
    expect(collapseData("@@\n+  const A = [\n+    ['a'],\n+    ['b'],\n+  ];").dropped).toBe(3);
  });
  it('похожие варианты теста: общие значимые слова или две короткие реакции', () => {
    expect(similarity('Мне надо прилечь.', 'Мне надо наряжаться?')).toBeGreaterThanOrEqual(0.5);
    expect(similarity('Yeah, sure', 'Okay')).toBeGreaterThanOrEqual(0.5);
    expect(similarity('Где касса?', 'Что случилось?')).toBe(0);
    expect(similarity('Free shipping', 'Yeah, sure')).toBe(0);
  });
  it('карточка педагогу: примеры с переводом, тесты с пропуском и рискованные, остальные числом', () => {
    const t = cardText('wd_0001', { group: 'words', card: { level: 'A1', sublevel: 'A1', payload: { front: 'water', translation: 'вода',
      examples: [{ text: 'Can I get some water?', ru: 'Можно воды?', parts: [{ word: 'water' }] }],
      test: [{ q: 'Что значит «water»?', options: ['вода', 'еда'], correct: 0 }, { q: 'Can I get some ___?', options: ['water', 'bread'], correct: 0 }] } } }, 'новая');
    expect(t).toMatch(/water — вода/);
    expect(t).toMatch(/- Can I get some water\? — Можно воды\?/);
    expect(t).toMatch(/тест: Can I get some ___\? → ✓water · ✗bread/);
    expect(t).toMatch(/ещё тестов: 1/);
    expect(t).not.toMatch(/parts/);
  });
  it('разметка слов педагогу строкой: ЗАГЛАВНЫЕ — ударный слог, (буква) — немая, после / — часть речи', () => {
    expect(markedLine([{ word: 'Listen', pos: 'verb', stressAt: [0, 3], silent: [3] }, { word: 'up!', pos: 'adv' }, { word: '—' }]))
      .toBe('LIS(t)en/глаг up!/нар —');
  });
  it('выборка разметки: сначала новые карточки, затем (если менялся движок) — случайно по курсу, без повторов', () => {
    const card = (id, words) => [id, { group: 'words', card: { id, payload: { examples: [{ text: words, parts: words.split(' ').map((w) => ({ word: w, pos: 'noun' })) }] } } }];
    const cards = new Map([card('a', 'new one'), card('b', 'old one'), card('c', 'old two'), card('d', 'new one')]);
    expect(marksSample(cards, ['a'], { random: false })).toEqual(['a: new/сущ one/сущ']);
    const r = marksSample(cards, ['a'], { random: true, seed: 1, max: 3 });
    expect(r[0]).toBe('a: new/сущ one/сущ');
    expect(r.filter((l) => /new\/сущ one/.test(l))).toHaveLength(1);       // d повторяет a — не дублируется
    expect(r.length).toBeGreaterThan(1);
  });
  it('IPA, изменившаяся в примерах, видна педагогу (в тексте карточек её нет)', () => {
    const m = (ipa) => new Map([['x', { group: 'words', card: { payload: { examples: [{ parts: [{ word: 'Engineer.', ipa }] }] } } }]]);
    expect(ipaChanges(m('/ˈɛndʒənɪr/'), m('/ˌɛndʒəˈnɪr/'))).toEqual(['engineer: /ˈɛndʒənɪr/ → /ˌɛndʒəˈnɪr/']);
    expect(ipaChanges(m('/a/'), m('/a/'))).toEqual([]);
    const two = (i1, i2) => new Map([['x', { group: 'words', card: { payload: { examples: [{ parts: [{ word: 'progress', ipa: i1 }] }, { parts: [{ word: 'progress', ipa: i2 }] }] } } }]]);
    expect(ipaChanges(two('/proʊˈɡrɛs/', '/ˈprɑɡrɛs/'), two('/ˈprɑɡrɛs/', '/ˈprɑɡrɛs/'))).toEqual(['progress: /proʊˈɡrɛs/ → везде /ˈprɑɡrɛs/']);
  });
});

describe('er-cards: что изменилось в карточках', () => {
  it('новые, удалённые, изменённые по тексту и только разметкой', () => {
    const m = (arr) => new Map(arr.map((c) => [c.id, { group: 'words', card: c }]));
    const A = m([{ id: 'a', payload: { front: 'x', examples: [{ text: 't', parts: [{ word: 't' }] }] } }, { id: 'b', payload: { front: 'y' } }, { id: 'c', payload: { front: 'z' } }]);
    const B = m([{ id: 'a', payload: { front: 'x', examples: [{ text: 't', parts: [{ word: 't', pos: 'noun' }] }] } }, { id: 'b', payload: { front: 'Y' } }, { id: 'd', payload: { front: 'w' } }]);
    expect(cardDiff(A, B)).toEqual({ added: ['d'], removed: ['c'], changed: ['b'], partsOnly: ['a'] });
    expect(stripParts({ examples: [{ text: 't', parts: [1] }] })).toEqual({ examples: [{ text: 't' }] });
  });
  it('сторож требует версию именно того раздела, чьи карточки изменились', () => {
    const c = ctxOf({ files: [{ status: 'M', path: 'js/content_words.js' }] });
    c.head.sw = c.head.sw.replace('er-v34', 'er-v35');
    c.base.app = "const WORDS_VERSION = '1.2.0'; const VOCAB_VERSION = '1.0.0';";
    c.head.app = "const WORDS_VERSION = '1.2.0'; const VOCAB_VERSION = '1.1.0';";
    c.cardDiff = { added: ['wd_0551'], removed: [], changed: [], partsOnly: [] };
    c.cardGroups = new Map([['wd_0551', 'words']]);
    const out = check(c);
    expect(out.filter((r) => r.level === '✗').map((r) => r.text).join()).toMatch(/WORDS_VERSION тот же/);
    expect(out.filter((r) => r.level === '?').map((r) => r.text).join()).toMatch(/VOCAB_VERSION поднята, а карточки раздела vocab не менялись/);
  });
});

describe('er-brief: следующие номера карточек', () => {
  it('для каждого префикса — максимум + 1 с той же шириной', () => {
    expect(nextIdsOf(['wd_0001', 'wd_0550', 'pv_208', 'pv_238', 'g067', 'cafe-order'])).toEqual(['g068', 'pv_239', 'wd_0551']);
  });
  it('номер, убранный миграцией (дубль), занят навсегда — его не выдаём снова', () => {
    // sl_071 убран как дубль (content_migrate MERGE): новая карточка на нём исчезла бы при сборке
    expect(nextIdsOf(['sl_069', 'sl_070'], ['sl_071', 'cv_029'])).toEqual(['sl_072']);
    expect(nextIdsOf(new Map([['sl_070', 1], ['wd_0550', 1]]).keys(), ['sl_071'])).toEqual(['sl_072', 'wd_0551']);
    expect(retiredIds()).toContain('sl_071');
  });
});

/* Механика, которую раньше выполняла модель по тексту скилла: теперь её делают команды er,
   а модель только читает итог. Без этих тестов правило снова пришлось бы держать в голове. */

describe('er ci: число тестов на CI и предел ожидания', () => {
  const at = (min) => new Date(Date.UTC(2026, 9, 8, 12, 0) + min * 60000).toISOString();
  const NOW = Date.UTC(2026, 9, 8, 12, 0) + 40 * 60000;
  const run = (status, startedMin, conclusion = null) => ({ id: 1, name: 'test', status, conclusion, started_at: at(startedMin), completed_at: conclusion ? at(startedMin + 4) : null, html_url: 'https://github.com/x/y/actions/runs/1' });

  it('итог vitest берётся из лога задания: метки времени и цвета не мешают, упавшие тоже в счёт', () => {
    const log = '2026-10-08T12:03:01.1234567Z \x1b[2m Test Files \x1b[22m 18 passed (18)\n2026-10-08T12:03:01.1234567Z \x1b[2m      Tests \x1b[22m \x1b[1m\x1b[32m303 passed\x1b[39m\x1b[22m (303)\n  54 passed (4.5m)';
    expect(vitestTotal(log)).toBe(303);
    expect(vitestTotal('      Tests  2 failed | 300 passed | 1 skipped (303)')).toBe(303);
    expect(vitestTotal('нет итога')).toBe(null);
  });

  it('число тестов CI из аннотации vitest-total (лог задания из облачной сессии не скачать)', () => {
    expect(annotationTotal([{ title: '', message: 'Node.js 20 is deprecated' }, { title: 'vitest-total', message: '303 tests, failed 0' }])).toBe(303);
    expect(annotationTotal([{ title: 'vitest-total', message: 'no vitest-report.json' }])).toBe(null);
    expect(annotationTotal(null)).toBe(null);
  });

  it('сверка с локальным прогоном: шим недосчитал, CI недосчитал, совпало, не с чем сравнить', () => {
    expect(countLine(468, { total: 412, sha: 'abc1234', source: 'er test' })).toMatch(/⚠.*412.*468.*шим/);
    expect(countLine(300, { total: 303, sha: 'abc1234', source: 'er test' })).toMatch(/⚠.*меньше/);
    expect(countLine(303, { total: 303, sha: 'abc1234', source: 'здоровье «после»' })).toMatch(/303.*как локально/);
    expect(countLine(303, null)).toMatch(/сравнить не с чем/);
    expect(countLine(null, { total: 303 })).toMatch(/не нашёл/);
  });

  it('проверки идут дольше предела — «не ответил» (не красное и не зелёное); моложе предела — ещё идёт', () => {
    const stuck = ciVerdict([run('queued', 5)], { now: NOW, maxMin: 30 });
    expect(stuck.state).toBe('stuck');
    expect(stuck.ageMin).toBe(35);
    expect(stuck.line).toMatch(/не ответил/);
    expect(ciVerdict([run('in_progress', 25)], { now: NOW, maxMin: 30 }).state).toBe('pending');
    expect(ciVerdict([run('completed', 0, 'success')], { now: NOW, maxMin: 30 }).state).toBe('success');
    expect(ciVerdict([run('completed', 0, 'failure')], { now: NOW, maxMin: 30 }).state).toBe('failure');
  });

  it('проверок нет: предел считается от первого вызова er ci для этого коммита', () => {
    expect(ciVerdict([], { now: NOW, maxMin: 30, firstSeen: NOW - 31 * 60000 }).state).toBe('stuck');
    expect(ciVerdict([], { now: NOW, maxMin: 30, firstSeen: NOW - 5 * 60000 }).state).toBe('none');
    expect(ciVerdict([], { now: NOW, maxMin: 30 }).state).toBe('none');
  });
});

describe('er wait: фоновая задача готова, идёт, зависла или прервалась', () => {
  it('предел — от эталонного времени E2E, не меньше 12 минут; эталона нет — 25', () => {
    expect(jobLimitMin({ e2eMin: 4.5 })).toBe(14);
    expect(jobLimitMin({ e2eMin: 1 })).toBe(12);
    expect(jobLimitMin(null)).toBe(25);
  });
  it('итог записан — готово; процесса нет — прервалась; дольше предела — зависла; иначе — идёт', () => {
    const start = { at: 0, pid: 123 };
    expect(jobStatus({ done: { status: 0 }, start, alive: false, now: 60 * 60000, limitMin: 14 })).toBe('done');
    expect(jobStatus({ done: null, start, alive: false, now: 60000, limitMin: 14 })).toBe('dead');
    expect(jobStatus({ done: null, start, alive: true, now: 15 * 60000, limitMin: 14 })).toBe('stuck');
    expect(jobStatus({ done: null, start, alive: true, now: 5 * 60000, limitMin: 14 })).toBe('running');
    expect(jobStatus({ done: null, start: null, alive: null, now: 5 * 60000, limitMin: 14 })).toBe('running');
  });
  it('дольше предела, но лог ещё пишется — не «зависла»: машина медленнее эталона', () => {
    const start = { at: 0, pid: 123 };
    expect(jobStatus({ done: null, start, alive: true, now: 20 * 60000, limitMin: 14, logIdleMin: 0.5 })).toBe('running');
    expect(jobStatus({ done: null, start, alive: true, now: 20 * 60000, limitMin: 14, logIdleMin: 6 })).toBe('stuck');
  });
});

describe('er archive: старые записи журнала — в docs/evolution/', () => {
  const entry = (t) => `### ${t}\n\nЗапись ${t}.\n\n`;
  const md = '# Эволюция\n\n## Планы автора\n### План «+4000»\n- [ ] шаг\n\n## Эталон\n\nюнит 303\n\n## Итерации\n\nЖурнал по порядку.\n\n' +
    entry('2025-12-30 — старая') + entry('2026-01-02 — средняя') + entry('2026-10-07 (3) — новая') + '## Бэклог\n- [ ] одно\n\n## Разведка 2026-10-06\nфакты\n';

  it('переносит всё, кроме последних keep, по годам; остальные разделы не трогает; повтор ничего не меняет', () => {
    const r = archiveJournal(md, 1);
    expect(r.moved.map((m) => m.year)).toEqual(['2025', '2026']);
    expect(r.moved[0].text).toMatch(/### 2025-12-30 — старая/);
    expect(r.moved[1].text).toMatch(/### 2026-01-02 — средняя/);
    const its = sections(sections(r.md).find((s) => s.title === 'Итерации').body, 3);
    expect(its.map((s) => s.title)).toEqual(['2026-10-07 (3) — новая']);
    expect(r.md).toMatch(/docs\/evolution\/archive-2025\.md/);
    for (const name of ['Планы автора', 'Эталон', 'Бэклог', 'Разведка 2026-10-06']) {
      expect(sections(r.md).find((s) => s.title === name).body).toBe(sections(md).find((s) => s.title === name).body);
    }
    expect(archiveJournal(r.md, 1).moved).toEqual([]);
  });

  it('повторный перенос объединяет годы в строке «Старые записи» и не дублирует её', () => {
    const once = archiveJournal(md, 2).md;                       // ушла 2025-12-30
    expect(once).toMatch(/Старые записи: docs\/evolution\/archive-2025\.md\./);
    const twice = archiveJournal(once, 1).md;                    // ушла 2026-01-02
    expect(twice.match(/Старые записи:/g)).toHaveLength(1);
    expect(twice).toMatch(/Старые записи: docs\/evolution\/archive-2025\.md, docs\/evolution\/archive-2026\.md\./);
  });

  it('записей не больше keep — файл не меняется', () => {
    const r = archiveJournal(md, 30);
    expect(r.moved).toEqual([]);
    expect(r.md).toBe(md);
  });
});

describe('er start: метрика автора из docs/metrics/', () => {
  it('последняя непустая строка самого нового файла; файлов нет — null', () => {
    expect(latestMetric([{ name: '2026-09.csv', text: 'date,phrases\n2026-09-30,22\n' }, { name: '2026-10.csv', text: 'date,phrases\n2026-10-06,41\n2026-10-07,37\n\n' }]))
      .toEqual({ file: '2026-10.csv', line: '2026-10-07,37' });
    expect(latestMetric([])).toBe(null);
    expect(latestMetric([{ name: 'README.md', text: 'x' }])).toBe(null);
    // файл без даты в имени не считается «самым новым» только потому, что по алфавиту дальше
    expect(latestMetric([{ name: 'spoken.csv', text: 'old,1' }, { name: '2026-10.csv', text: '2026-10-07,37' }]).file).toBe('2026-10.csv');
  });
});

describe('er review: словари, которых нет в диффе, — ревизору-код числами', () => {
  it('записи словаря: добавлены, удалены, изменены', () => {
    const a = 'const LEX_US = {"cat":"kæt","dog":"dɔɡ|0","toy":"tɔɪ"};';
    const b = 'const LEX_US = {"cat":"kæt","dog":"dɑɡ|0","coins":"kɔɪnz"};';
    expect(dictStats(a, b)).toEqual({ total: 3, added: 1, removed: 1, changed: 1 });
    expect(dictStats('', b)).toEqual({ total: 3, added: 3, removed: 0, changed: 0 });
  });
  it('флаг: изменилось больше 10% записей или словарь менялся без новых карточек', () => {
    expect(dictNote('js/lex_us.js', { total: 100, added: 15, removed: 0, changed: 0 }, true)).toMatchObject({ flag: true });
    expect(dictNote('js/lex_us.js', { total: 100, added: 2, removed: 0, changed: 0 }, true)).toMatchObject({ flag: false });
    const n = dictNote('js/pos_us.js', { total: 100, added: 0, removed: 0, changed: 2 }, false);
    expect(n.flag).toBe(true);
    expect(n.line).toMatch(/pos_us\.js.*изменено 2.*из 100/);
  });
});

describe('er review: задания ревизорам — коротко, по-английски, с чек-листом педагога', () => {
  const paths = { code: '/r/code.diff', content: '/r/content.md', guard: '/r/guard.txt', root: '/repo', base: 'abc1234' };
  it('педагогу — чек-лист из docs/PEDAGOGY.md: одна новинка, калька, полная форма, ошибки русскоязычных, синтез без вердикта', () => {
    const p = pedagoguePrompt(paths, {});
    expect(p).toMatch(/\/repo\/docs\/PEDAGOGY\.md/);
    for (const re of [/one new thing/i, /calque/i, /full form/i, /Russian speakers/i, /synthes/i, /slang, rude words or AAVE/i]) expect(p).toMatch(re);
    expect(p).not.toMatch(/recognize.*field|пометка/i);            // поля «узнавать / говорить» в приложении нет — не проверять несуществующее
    expect(p).toMatch(/respectfully/i);                                     // сленг и AAVE — с регистром и уважительно
    expect(p).toMatch(/listening and pronunciation tasks the wrong options/i); // «ошибки русскоязычных» — не для заданий на смысл
    expect(p).toMatch(/not checked/i);                                      // «одна новинка» без контекста — не гадать
    // коротко и по-английски: кириллица — только в названиях разделов content.md, которые ревизор ищет как есть
    const full = pedagoguePrompt(paths, { marks: 3, ipa: 2 });
    expect(full.replace(/«[^»]*»|"(IPA изменилась|Разметка слов)"/g, '')).not.toMatch(/[а-яё]/i);
    expect(p.length).toBeLessThan(3000);
    expect(codePrompt(paths, []).replace(/«[^»]*»/g, '')).not.toMatch(/[а-яё]/i);
    expect(pedagoguePrompt(paths, { marks: 3 })).toMatch(/word markup/i);
    expect(pedagoguePrompt(paths, { ipa: 2 })).toMatch(/IPA changed/i);
  });
  it('ревизору-код — числа словарей и просьба выяснить причину только при флаге', () => {
    expect(codePrompt(paths, [])).not.toMatch(/their numbers/i);
    const flagged = codePrompt(paths, [{ line: 'js/lex_us.js: +900 −0, изменено 0 из 3000 (30%) — больше 10% записей', flag: true }]);
    expect(flagged).toMatch(/lex_us\.js: \+900/);
    expect(flagged).toMatch(/find out why/i);
    expect(flagged).toMatch(/git diff abc1234 -- /);
    expect(codePrompt(paths, [{ line: 'js/pos_us.js: +2 −0, изменено 0 из 3000 (0%)', flag: false }])).not.toMatch(/find out why/i);
  });
});

describe('er usage: токены итерации из транскрипта', () => {
  const at = (min) => new Date(Date.UTC(2026, 9, 9, 12, min)).toISOString();
  const turn = (id, min, usage, content = []) => ({ type: 'assistant', timestamp: at(min), message: { id, usage, content } });
  const U = { input_tokens: 10, cache_read_input_tokens: 900, cache_creation_input_tokens: 90, output_tokens: 50 };
  const T = [
    turn('m1', 0, U, [{ type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'npm test' } }]),
    turn('m1', 0, U), // та же реплика, записанная потоком второй строкой — не считать дважды
    { type: 'user', timestamp: at(1), message: { content: [{ type: 'tool_result', tool_use_id: 't1', content: 'x'.repeat(20000) }] } },
    turn('m2', 5, U, [{ type: 'tool_use', id: 't2', name: 'Read', input: { file_path: '/r/.claude/skills/er-build/SKILL.md' } }]),
    { type: 'user', timestamp: at(6), message: { content: [{ type: 'tool_result', tool_use_id: 't2', content: [{ type: 'text', text: 'y'.repeat(20000) }] }] } },
  ];

  it('ход считается один раз, контекст — вход + кэш', () => {
    const r = usageOf(T);
    expect(r.turns).toBe(2);
    expect(r.context).toBe(2000);
    expect(r.output).toBe(100);
    expect(r.calls).toEqual({ Bash: 1, Read: 1 });
  });

  it('крупный вывод — урок, чтение SKILL.md — нет; прямой npm test — нарушение', () => {
    const r = usageOf(T);
    expect(r.big.map((b) => b.label)).toEqual(['Bash: npm test']);
    expect(r.violations.join()).toMatch(/npm test/);
    expect(formatUsage(r)).toMatch(/крупный вывод ~5k: Bash: npm test/);
    expect(formatUsage(r)).toMatch(/✗ прямой npm test/);
  });

  it('метка er start отсекает раннее; npm test с тихим репортёром — не нарушение', () => {
    expect(usageOf(T, Date.parse(at(3))).turns).toBe(1);
    const q = usageOf([turn('a', 0, U, [{ type: 'tool_use', id: 'q', name: 'Bash', input: { command: 'npm test -- --reporter=dot' } }])]);
    expect(q.violations).toEqual([]);
  });

  it('строка журнала и история итераций', () => {
    expect(journalLine(usageOf(T), [usageOf(T)])).toBe('Токены: контекст 4k, вывод 200, ходов 4, субагентов 1, крупных выводов 2');
    const h = ['{"date":"2026-10-08","context":2000000,"big":3}', '{"date":"2026-10-09","context":1000000}'].join('\n');
    expect(historyLine(h)).toBe('ТОКЕНЫ ИТЕРАЦИЙ (среднее 1,50 млн контекста по 2): 2026-10-08 2,00 млн (крупных 3) · 2026-10-09 1,00 млн');
    expect(historyLine('')).toBe('');
  });

  it('имена вызовов короткие и без пути клона', () => {
    expect(callLabel({ name: 'Read', input: { file_path: '/home/c/english-reboot/js/app.js', offset: 10, limit: 20 } })).toBe('Read: js/app.js (10+20)');
    expect(callLabel({ name: 'Bash', input: { command: 'cd /x && er test\nmore' } })).toBe('Bash: er test');
  });
});

describe('er lessons: уроки агента считаются по ключу', () => {
  const MD = '# Эволюция\n\n## Бэклог\n\n- [ ] x\n\n## Итерации\n\n### 2026-10-09 — y\n';

  it('первый урок создаёт раздел перед «Итерации», остальное не тронуто', () => {
    const md = addLesson(MD, 'big-log', 'полный лог E2E прочитан целиком', '2026-10-09');
    expect(md).toMatch(/## Уроки агента\n[\s\S]*- \[big-log\] ×1 \(2026-10-09\) полный лог E2E прочитан целиком\n\n## Итерации/);
    expect(md.replace(/## Уроки агента[\s\S]*?(?=## Итерации)/, '')).toBe(MD);
  });

  it('тот же ключ — счётчик и дата, повтор поднимается наверх и виден в er start', () => {
    let md = addLesson(MD, 'a', 'первый', '2026-10-08');
    md = addLesson(md, 'big-log', 'лог', '2026-10-08');
    md = addLesson(md, 'BIG-LOG', '', '2026-10-09');
    const L = lessonsOf(md);
    expect(L[0]).toEqual({ key: 'big-log', count: 2, dates: ['2026-10-08', '2026-10-09'], text: 'лог' });
    expect(L).toHaveLength(2);
    expect(lessonsLine(md)).toBe('УРОКИ АГЕНТА: 2; повторились — предложить правку скилла (/er-ship): [big-log] ×2');
    expect(lessonsLine(MD)).toBe('УРОКИ АГЕНТА: нет');
  });

  it('ключ — одно слово, новый урок — с текстом', () => {
    expect(() => addLesson(MD, 'два слова', 'x', '2026-10-09')).toThrow();
    expect(() => addLesson(MD, 'new', '', '2026-10-09')).toThrow();
  });
});

describe('er-guard: инструкции агента', () => {
  it('правка .claude/skills — на проверку автору, удалённый запрет назван', () => {
    const R = check(ctxOf({
      files: [{ status: 'M', path: '.claude/skills/er-build/SKILL.md' }],
      removed: { '.claude/skills/er-build/SKILL.md': [{ line: 3, text: 'Never run npm test directly' }, { line: 4, text: 'обычная строка' }] },
    }));
    const look = R.filter((r) => r.rule === 'скилл');
    expect(look).toHaveLength(1);
    expect(look[0].level).toBe('?');
    expect(look[0].text).toMatch(/\(er-build\).*удалены строки с запретами: \.claude\/skills\/er-build\/SKILL\.md:3 —/);
    expect(bad(R)).toEqual([]);
  });

  it('englishbad в правилах агента — запрет, а не нарушение', () => {
    const R = check(ctxOf({ files: [{ status: 'A', path: '.claude/skills/er-build/SKILL.md' }], added: { '.claude/skills/er-build/SKILL.md': [{ line: 30, text: 'Do not use the englishbad channel' }] } }));
    expect(bad(R)).toEqual([]);
  });
});
