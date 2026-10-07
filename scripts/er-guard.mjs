#!/usr/bin/env node
/**
 * scripts/er-guard.mjs — сторож правил проекта по диффу (dev-инструмент скилла english-reboot-evolve).
 *
 * Механически проверяет то, что раньше вычитывали глазами модель и Ревизор-код:
 * версии (CACHE_VERSION, *_VERSION, DB_VERSION), новые файлы в index.html и sw.js, переименования,
 * номера карточек и миграцию, «купленные» зелёные тесты, innerHTML с переменной, сеть, британское
 * написание, род в репликах ученика, следы чужих текстов. Смысл, педагогику и качество кода
 * по-прежнему смотрят ревизоры — сторож снимает с них механику.
 *
 *   node scripts/er-guard.mjs                 # рабочее дерево (вместе с незакоммиченным) против main
 *   node scripts/er-guard.mjs --base <ref>    # против другой базы
 *   node scripts/er-guard.mjs --out <файл>    # ещё и записать отчёт в файл (путь — ревизору)
 *
 * Метки: ✗ — нарушение правила (код выхода 1), ? — проверить глазами, ! — напоминание.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const git = (args, opts = {}) => {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, ...opts });
  return r.status === 0 ? r.stdout : null;
};

/* ───────────── чистые функции (есть тесты) ───────────── */

/** Файл приложения (попадает к ученику и в кэш SW)? */
export function isAppFile(f) {
  if (/^(tests|scripts|docs|\.github|\.claude|node_modules)\//.test(f)) return false;
  if (/\.(md|bat|vbs)$/i.test(f) || /^(package(-lock)?\.json|LICENSE|\.gitignore|playwright\.config\.js|vitest\.config\.js)$/.test(f)) return false;
  return /^(index\.html|manifest\.json|sw\.js|icon-\d+\.png)$/.test(f) || /^(js|css|fonts)\//.test(f);
}

/** git diff -U0 → { файл: [{ line, text }] } — только добавленные строки с номерами в новом файле */
export function addedLines(diff) {
  const out = {};
  let file = null, n = 0;
  for (const l of String(diff).split('\n')) {
    if (l.startsWith('+++ ')) { file = l.slice(4).replace(/^b\//, ''); if (file === '/dev/null') file = null; else out[file] = out[file] || []; continue; }
    const h = l.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (h) { n = Number(h[1]); continue; }
    if (!file) continue;
    if (l.startsWith('+')) { out[file].push({ line: n, text: l.slice(1) }); n++; }
    else if (!l.startsWith('-') && !l.startsWith('\\')) n++;
  }
  return out;
}

/** То же для удалённых строк (номера — в старом файле) */
export function removedLines(diff) {
  const out = {};
  let file = null, n = 0;
  for (const l of String(diff).split('\n')) {
    if (l.startsWith('--- ')) { file = l.slice(4).replace(/^a\//, ''); if (file === '/dev/null') file = null; else out[file] = out[file] || []; continue; }
    if (l.startsWith('+++ ')) continue;
    const h = l.match(/^@@ -(\d+)(?:,\d+)? \+\d+(?:,\d+)? @@/);
    if (h) { n = Number(h[1]); continue; }
    if (!file) continue;
    if (l.startsWith('-')) { out[file].push({ line: n, text: l.slice(1) }); n++; }
    else if (!l.startsWith('+') && !l.startsWith('\\')) n++;
  }
  return out;
}

export const cacheVersion = (sw) => { const m = String(sw || '').match(/CACHE_VERSION\s*=\s*'([^']+)'/); return m ? m[1] : null; };
export const swAssets = (sw) => {
  const m = String(sw || '').match(/const ASSETS\s*=\s*\[([\s\S]*?)\];/);
  return m ? [...m[1].matchAll(/'\.\/([^']*)'/g)].map((x) => x[1]).filter(Boolean) : [];
};
export const indexRefs = (html) => [...String(html || '').matchAll(/<(?:script[^>]*\bsrc|link[^>]*\bhref)="([^"]+)"/g)]
  .map((m) => m[1]).filter((u) => !/^(data:|https?:|\/\/)/.test(u));
export const versionsOf = (src) => Object.fromEntries([...String(src || '').matchAll(/\b([A-Z_]+_VERSION)\s*=\s*('[^']*'|"[^"]*"|\d+)/g)].map((m) => [m[1], m[2]]));

/** Карточки «до» и «после» → удалённые, изменённые по смыслу (тот же id, другая фраза), новые */
export function compareCards(before, after) {
  const sig = (c) => String((c.payload && (c.payload.front || c.payload.title)) || '').trim();
  const index = (content) => {
    const m = new Map();
    for (const arr of Object.values(content.sections || {})) for (const c of arr || []) if (c && c.id && !m.has(c.id)) m.set(c.id, sig(c));
    return m;
  };
  const a = index(before), b = index(after);
  const removed = [], changed = [], added = [];
  for (const [id, s] of a) { if (!b.has(id)) removed.push(id); else if (b.get(id) !== s) changed.push(`${id}: «${s}» → «${b.get(id)}»`); }
  for (const id of b.keys()) if (!a.has(id)) added.push(id);
  return { removed, changed, added };
}

const BRIT = /\b(colour|favourite|flavour|honour|neighbour|behaviour|labour|humour|centre|theatre|metre|litre|organis(e|ed|es|ing|ation)|realis(e|ed|es|ing)|recognis(e|ed|es|ing)|apologis(e|ed|es|ing)|travell(ed|er|ing)|programme|cheque|tyre|grey|whilst|amongst|lorry|petrol|mobile phone|flat mate|flatmate|queue up|rubbish bin|holidays?)\b/i;
const GENDER = /(^|[^А-Яа-яЁё])[Яя] (был|была|сделал|сделала|понял|поняла|устал|устала|готов|готова|рад|рада|должен|должна|уверен|уверена|согласен|согласна|пришёл|пришла|забыл|забыла|хотел|хотела)(?![А-Яа-яЁё])/;
const PRAISE = /(Отлично|Молодец|Умница|Супер|Великолепно|Превосходно|Great job|Well done|Awesome|Perfect|Excellent)[!.]/;

/** Все проверки. ctx — данные из git (собирает collectContext), без побочных эффектов. */
export function check(ctx) {
  const R = [];
  const bad = (rule, text) => R.push({ level: '✗', rule, text });
  const look = (rule, text) => R.push({ level: '?', rule, text });
  const note = (rule, text) => R.push({ level: '!', rule, text });
  const { files, added, removed, base, head } = ctx;
  const changed = files.map((f) => f.path);
  const app = files.filter((f) => isAppFile(f.path) || (f.from && isAppFile(f.from)));
  const has = (p) => changed.includes(p);
  const addIn = (re) => Object.entries(added).filter(([f]) => re.test(f)).flatMap(([f, ls]) => ls.map((l) => ({ f, ...l })));

  // Правило 4: не переименовывать файлы
  for (const f of files.filter((x) => x.status === 'R')) bad(4, `переименован ${f.from} → ${f.path}`);
  for (const f of files.filter((x) => x.status === 'D')) note(4, `удалён ${f.path} — точно нужно?`);

  // Правило 2: CACHE_VERSION, index.html, sw.js
  const cvA = cacheVersion(base.sw), cvB = cacheVersion(head.sw);
  if (app.length && cvA === cvB) bad(2, `изменены файлы приложения (${app.slice(0, 4).map((f) => f.path).join(', ')}${app.length > 4 ? '…' : ''}), а CACHE_VERSION тот же (${cvB})`);
  if (cvA !== cvB) note(2, `CACHE_VERSION ${cvA} → ${cvB} (при открытых PR — наибольший из веток +1: er-brief)`);
  const assets = new Set(swAssets(head.sw));
  const refs = new Set(indexRefs(head.index));
  for (const f of files.filter((x) => x.status === 'A' && /^(js|css)\/.+\.(js|css)$/.test(x.path))) {
    if (!refs.has(f.path)) bad(2, `новый ${f.path} не подключён в index.html`);
    if (!assets.has(f.path)) bad(2, `новый ${f.path} нет в списке кэша sw.js (ASSETS)`);
  }
  for (const r of refs) if (/^(js|css)\//.test(r) && !assets.has(r)) bad(2, `${r} подключён в index.html, но нет в sw.js ASSETS`);
  for (const a of assets) if (/^js\/.+\.js$/.test(a) && !refs.has(a)) look(2, `${a} есть в sw.js, но не подключён в index.html`);
  for (const a of assets) if (a && !head.exists(a)) bad(2, `sw.js кэширует ${a}, а файла нет`);

  // Правило 1: без фреймворков, сборщиков и TypeScript; модули — IIFE
  for (const f of files.filter((x) => x.status === 'A' && /\.(ts|tsx|jsx|vue|svelte)$/.test(x.path))) bad(1, `новый файл ${f.path} — без TypeScript и фреймворков`);
  for (const l of addIn(/^js\/.+\.js$/)) {
    if (/^\s*(import\s.+from\s|import\s*\(|export\s)/.test(l.text)) bad(1, `${l.f}:${l.line} ES-модуль — в приложении только const X = (() => {...})()`);
  }
  const depsA = JSON.stringify((base.pkg || {}).dependencies || {}), depsB = JSON.stringify((head.pkg || {}).dependencies || {});
  if (depsA !== depsB) bad(1, 'package.json: изменены dependencies — приложению зависимости не положены');
  const devA = Object.keys((base.pkg || {}).devDependencies || {}), devB = Object.keys((head.pkg || {}).devDependencies || {});
  const newDev = devB.filter((d) => !devA.includes(d));
  if (newDev.length) note(1, `новые devDependencies: ${newDev.join(', ')} — в облаке npm закрыт, нужен шим`);

  // Правило 11: контент — версии разделов, номера карточек, миграция
  const contentChanged = changed.filter((f) => /^js\/(content_(?!migrate)\w+|lex_us|improv_us|scenes_us)\.js$/.test(f));
  if (contentChanged.length) {
    const vA = { ...versionsOf(base.app), ...versionsOf(base.gamify) }, vB = { ...versionsOf(head.app), ...versionsOf(head.gamify) };
    const bumped = Object.keys(vB).filter((k) => k !== 'APP_VERSION' && vA[k] !== undefined && vA[k] !== vB[k]);
    if (!bumped.length) bad(11, `менялся контент (${contentChanged.join(', ')}), а ни одна *_VERSION в js/app.js и js/gamify.js не поднята`);
    else note(11, `подняты: ${bumped.map((k) => `${k} ${vA[k]} → ${vB[k]}`).join(', ')} — сверить, что это версии изменённых разделов`);
    if (ctx.cards) {
      const { removed: rm, changed: ch, added: ad } = ctx.cards;
      if (ad.length) note(11, `новых карточек: ${ad.length} (${ad.slice(0, 3).join(', ')}${ad.length > 3 ? '…' : ''})`);
      if ((rm.length || ch.length) && !has('js/content_migrate.js')) {
        bad(11, `карточки удалены или стали другой фразой (${[...rm, ...ch].slice(0, 3).join('; ')}${rm.length + ch.length > 3 ? '…' : ''}), а js/content_migrate.js не менялся — нужна миграция прогресса`);
      } else if (rm.length || ch.length) look(11, `удалено ${rm.length}, другой фразой ${ch.length} — миграция в content_migrate.js есть, проверить её тестом`);
    } else look(11, 'карточки «до/после» сравнить не удалось — номера и миграцию проверить вручную');
  }

  // Правило 12: база
  if (has('js/db.js')) {
    const dbA = versionsOf(base.db).DB_VERSION, dbB = versionsOf(head.db).DB_VERSION;
    const storeTouch = (added['js/db.js'] || []).concat(removed['js/db.js'] || []).some((l) => /createObjectStore|deleteObjectStore|createIndex|deleteIndex|keyPath/.test(l.text));
    if (storeTouch && dbA === dbB) bad(12, `хранилища IndexedDB менялись, а DB_VERSION тот же (${dbB})`);
    if (dbA !== dbB) look(12, `DB_VERSION ${dbA} → ${dbB}: нужен E2E «старая база → новая, прогресс цел»`);
  }

  // «Не покупать зелёные тесты»
  for (const l of addIn(/^tests\//)) {
    // Только вызовы в начале строки — строки-примеры внутри тестов сторожа не в счёт
    if (/^\s*((it|test|describe)\.(skip|only|fixme|todo)|test\.fail|xit|xdescribe)\s*\(/.test(l.text)) bad(5, `${l.f}:${l.line} skip/only/fixme в тестах`);
    if (/^\s*(test\.(setTimeout|slow)\s*\(|retries\s*:)/.test(l.text)) look(5, `${l.f}:${l.line} таймаут/повторы в тесте — не «покупка» ли зелёного?`);
  }
  for (const cfg of ['playwright.config.js', 'vitest.config.js']) {
    for (const l of added[cfg] || []) if (/retries|timeout|testIgnore|exclude|grepInvert/.test(l.text)) bad(5, `${cfg}:${l.line} меняются retries/таймауты/исключения: ${l.text.trim()}`);
  }
  for (const f of files.filter((x) => x.status === 'D' && /^tests\//.test(x.path))) bad(5, `удалён тест ${f.path}`);
  const countTests = (ls) => ls.filter((l) => /^\s*(it|test)\s*\(/.test(l.text) || /\b(it|test)\s*\(\s*[`'"]/.test(l.text)).length;
  const countExpect = (ls) => ls.filter((l) => /\bexpect\s*\(/.test(l.text)).length;
  for (const f of new Set([...Object.keys(added), ...Object.keys(removed)])) {
    if (!/^tests\//.test(f)) continue;
    const plusT = countTests(added[f] || []), minusT = countTests(removed[f] || []);
    if (minusT > plusT) look(5, `${f}: тестов убрано ${minusT}, добавлено ${plusT} — проверить, что ничего не ослаблено`);
    const plusE = countExpect(added[f] || []), minusE = countExpect(removed[f] || []);
    if (minusE > plusE) look(5, `${f}: проверок expect убрано ${minusE}, добавлено ${plusE}`);
  }

  // Правило 13: чужой текст — не сырым в innerHTML, не в сеть
  for (const l of addIn(/^(js\/.+\.js|index\.html)$/)) {
    const t = l.text;
    if (/(innerHTML|outerHTML)\s*\+?=|insertAdjacentHTML\s*\(|document\.write\s*\(/.test(t) && /\$\{|['"`]\s*\+\s*\w|\+\s*['"`]|=\s*[A-Za-z_$][\w.$]*\s*;?\s*$/.test(t) && !/escapeHtml\s*\(/.test(t)) {
      look(13, `${l.f}:${l.line} разметка с переменной без escapeHtml — откуда данные? ${t.trim().slice(0, 90)}`);
    }
    if (/\bfetch\s*\(|sendBeacon|XMLHttpRequest|new WebSocket|new EventSource/.test(t)) look(13, `${l.f}:${l.line} сетевой запрос — офлайн без него работает? ввод ученика не уходит? ${t.trim().slice(0, 80)}`);
    if (/location\.(href|search|hash)\s*=|history\.(push|replace)State/.test(t)) look(13, `${l.f}:${l.line} запись в URL — не попадает ли туда ввод ученика?`);
  }

  // Правило 8: только американское написание (полный аудит — в er-health)
  for (const l of addIn(/^js\/.+\.js$/)) {
    const m = l.text.match(BRIT);
    if (m) look(8, `${l.f}:${l.line} «${m[0]}» — британское? ${l.text.trim().slice(0, 80)}`);
  }

  // Правило 7: реплики коуча и похвала — только в js/coach.js
  for (const l of addIn(/^js\/(?!coach\.js$).+\.js$/)) {
    if (PRAISE.test(l.text)) look(7, `${l.f}:${l.line} похвала вне js/coach.js? ${l.text.trim().slice(0, 80)}`);
  }

  // Правило 10: реплики ученика нейтральны по роду
  for (const l of addIn(/^js\/.+\.js$/)) {
    const m = l.text.match(GENDER);
    if (m) look(10, `${l.f}:${l.line} «Я ${m[2]}» — реплика ученика с родом? ${l.text.trim().slice(0, 80)}`);
  }

  // Правило 9 и авторское право
  for (const [f, ls] of Object.entries(added)) {
    if (/^(docs\/|scripts\/er-|tests\/er_tools\.test\.js$)/.test(f)) continue; // сам сторож и его примеры
    for (const l of ls) {
      if (/englishbad/i.test(l.text)) bad(9, `${f}:${l.line} название englishbad`);
      if (/\d\d:\d\d:\d\d[,.]\d{3}\s*-->/.test(l.text)) bad('©', `${f}:${l.line} похоже на субтитры (таймкод SRT/VTT) — чужие тексты в репозиторий нельзя`);
      if (/\[(Chorus|Verse|Hook|Bridge|Intro|Outro)[^\]]*\]/i.test(l.text)) look('©', `${f}:${l.line} разметка куплета/припева — это не текст песни?`);
    }
  }

  // Напоминания по итогу
  if (app.length && !has('CHANGELOG.md')) note('итог', 'CHANGELOG.md (Unreleased) не тронут');
  if (!has('docs/EVOLUTION.md')) note('итог', 'docs/EVOLUTION.md: запись итерации ещё не добавлена');
  return R;
}

export function format(R, ctx) {
  const L = [];
  const n = (lv) => R.filter((r) => r.level === lv).length;
  L.push(`СТОРОЖ ПРАВИЛ против ${ctx.baseRef} (${ctx.files.length} файлов изменено, из них приложения: ${ctx.files.filter((f) => isAppFile(f.path)).length}): ` +
    (n('✗') ? `✗ нарушений ${n('✗')}` : 'нарушений нет') + `, проверить ${n('?')}, напоминаний ${n('!')}`);
  for (const lv of ['✗', '?', '!']) for (const r of R.filter((x) => x.level === lv)) L.push(`${lv} [${r.rule}] ${r.text}`);
  return L.join('\n');
}

/* ───────────── сбор данных из git ───────────── */

function resolveBase(ref) {
  if (ref) return ref;
  for (const r of ['origin/main', 'main']) {
    const mb = git(['merge-base', 'HEAD', r]);
    if (mb) return mb.trim();
  }
  return 'main';
}

function collectContext(baseRef) {
  const base = resolveBase(baseRef);
  const ns = git(['diff', '--name-status', '-M', base]) || '';
  const files = ns.split('\n').filter(Boolean).map((l) => {
    const p = l.split('\t');
    const s = p[0][0];
    return s === 'R' ? { status: 'R', from: p[1], path: p[2] } : { status: s, path: p[1] };
  });
  const untracked = (git(['ls-files', '--others', '--exclude-standard']) || '').split('\n').filter(Boolean);
  for (const u of untracked) files.push({ status: 'A', path: u });
  const diff = git(['diff', '-U0', '-M', base]) || '';
  const added = addedLines(diff), removed = removedLines(diff);
  for (const u of untracked) {
    try { added[u] = fs.readFileSync(path.join(ROOT, u), 'utf8').split('\n').map((text, i) => ({ line: i + 1, text })); } catch { /* бинарный или папка */ }
  }
  const show = (f) => git(['show', `${base}:${f}`]);
  const cur = (f) => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch { return null; } };
  const json = (s) => { try { return JSON.parse(s); } catch { return null; } };
  const ctx = {
    baseRef: base.length === 40 ? base.slice(0, 7) : base, files, added, removed,
    base: { sw: show('sw.js'), app: show('js/app.js'), gamify: show('js/gamify.js'), db: show('js/db.js'), pkg: json(show('package.json')) },
    head: { sw: cur('sw.js'), index: cur('index.html'), app: cur('js/app.js'), gamify: cur('js/gamify.js'), db: cur('js/db.js'), pkg: json(cur('package.json')), exists: (p) => fs.existsSync(path.join(ROOT, p)) },
  };
  // Карточки «до/после» — только если контент менялся
  if (files.some((f) => /^js\/(content_\w+|improv_us)\.js$/.test(f.path))) {
    try {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'er-guard-'));
      fs.mkdirSync(path.join(tmp, 'js'));
      for (const f of ['content_grammar', 'content_vocab', 'content_extra', 'content_pro', 'content_us', 'content_words', 'improv_us']) {
        fs.writeFileSync(path.join(tmp, 'js', f + '.js'), show(`js/${f}.js`) || '');
      }
      ctx.cardsLoader = tmp;
    } catch { /* сравнение карточек пропустим */ }
  }
  return ctx;
}

async function main() {
  const argv = process.argv.slice(2);
  const bi = argv.indexOf('--base'), oi = argv.indexOf('--out');
  const ctx = collectContext(bi >= 0 ? argv[bi + 1] : null);
  if (ctx.cardsLoader) {
    try {
      const { loadContent } = await import(pathToFileURL(path.join(ROOT, 'scripts', 'content_stats.mjs')).href);
      ctx.cards = compareCards(loadContent(ctx.cardsLoader), loadContent(ROOT));
    } catch (e) { ctx.cards = null; }
    fs.rmSync(ctx.cardsLoader, { recursive: true, force: true });
  }
  const R = check(ctx);
  const text = format(R, ctx);
  console.log(text);
  if (oi >= 0) { fs.mkdirSync(path.dirname(path.resolve(argv[oi + 1])), { recursive: true }); fs.writeFileSync(argv[oi + 1], text + '\n'); }
  return R.some((r) => r.level === '✗') ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main().then((c) => process.exit(c));
