import { describe, it, expect } from 'vitest';
import {
  summarizeVitest, summarizePlaywright, parseBaseline, evaluate, baselineSection, summarizeAudit, parseAuditLine,
} from '../scripts/er-health.mjs';
import { addedLines, removedLines, check, compareCards, isAppFile, swAssets, indexRefs } from '../scripts/er-guard.mjs';
import { sections, checkboxes, scoutAge, versions } from '../scripts/er-brief.mjs';
import { summarizeRuns, slugFromUrl } from '../scripts/er-ci.mjs';
import { formatUnit, formatE2e } from '../scripts/er.mjs';
import { codeDiff, isDataHunk, collapseData, similarity, cardText, markedLine, marksSample, ipaChanges } from '../scripts/er-review.mjs';
import { cardDiff, stripParts } from '../scripts/er-cards.mjs';
import { nextIdsOf } from '../scripts/er-brief.mjs';

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
});
