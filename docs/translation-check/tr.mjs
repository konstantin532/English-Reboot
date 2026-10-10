// docs/translation-check/tr.mjs — проверка переводов EN→RU по пачкам. Постоянный инструмент: папка хранит,
// какие карточки уже проверены, и новые или изменённые после проверки карточки сама находит снова.
//   node docs/translation-check/tr.mjs status          — сколько проверено и что дальше
//   node docs/translation-check/tr.mjs next [пар=150]  — следующая пачка непроверенных карточек (в порядке приоритета разделов)
//   node docs/translation-check/tr.mjs apply <файл|->  — применить правки к пачке и отметить её проверенной («-» — правок нет)
// Файл правок (TSV, без заголовка): id ⇥ поле ⇥ новый перевод ⇥ почему ⇥ важность. Поле «заметка» — в notes.tsv без правки.
// state.json — отпечаток текста каждой проверенной карточки; fixes.tsv — все правки; notes.tsv — замечания; PROGRESS.md — отчёт.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, '../..');
const { loadCards, body, stripParts } = await import(path.join(ROOT, 'scripts/er-cards.mjs'));
const STATE = path.join(DIR, 'state.json');
const ORDER = ['Идиомы', 'Коллокации', 'Фразовые глаголы', 'Сленг', 'Фразы', 'Слова'];
const SEC = { cv: 'Фразы', wd: 'Слова', pv: 'Фразовые глаголы', col: 'Коллокации', cl: 'Коллокации', id: 'Идиомы', sl: 'Сленг' };
const VER = { vocab: ['js/app.js', 'VOCAB_VERSION'], extra: ['js/app.js', 'EXTRA_VERSION'], words: ['js/app.js', 'WORDS_VERSION'],
  pro: ['js/gamify.js', 'PRO_VERSION'], grammar: ['js/app.js', 'CONTENT_VERSION'] };
const clean = (s) => String(s ?? '').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
const branch = () => { try { return execFileSync('git', ['-C', ROOT, 'rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { return '?'; } };

/** Все пары курса: [{ id, group, sec, field, en, key, ru }] в порядке приоритета разделов */
function allPairs() {
  const { cards } = loadCards(ROOT);
  const out = [];
  for (const [id, { group, card }] of cards) {
    const sec = SEC[id.replace(/[_\d].*$/, '')];
    if (!sec) continue;
    const p = stripParts(body(card));
    if (p.front && p.translation) out.push({ id, group, sec, field: p.full_form ? 'значение' : 'перевод',
      en: clean(p.front) + (p.full_form ? ' (= ' + clean(p.full_form) + ')' : ''), key: clean(p.front), ru: p.translation });
    (p.examples || []).forEach((e, i) => {
      const ru = e.ru || e.translation;
      if (e.text && ru) out.push({ id, group, sec, field: 'пример ' + (i + 1), en: clean(e.text), key: clean(e.text), ru });
    });
  }
  return out.map((x, i) => ({ ...x, n: i })).sort((a, b) => ORDER.indexOf(a.sec) - ORDER.indexOf(b.sec) || a.n - b.n);
}

/** Отпечаток текста карточки: поменялся английский или русский — карточку надо проверить снова */
function prints(pairs) {
  const by = new Map();
  for (const p of pairs) by.set(p.id, (by.get(p.id) || '') + p.field + '\u0001' + p.en + '\u0001' + p.ru + '\u0002');
  return new Map([...by].map(([id, s]) => [id, crypto.createHash('sha1').update(s).digest('hex').slice(0, 12)]));
}

function readState(pairs) {
  let s;
  try { s = JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch { s = {}; }
  if (Array.isArray(s.checked)) { // старый формат (список id) — тогда все эти карточки проверялись в нынешнем виде
    const pr = prints(pairs); s.checked = Object.fromEntries(s.checked.filter((id) => pr.has(id)).map((id) => [id, pr.get(id)]));
  }
  if (Array.isArray(s.bumped)) s.bumped = { 'feature/translation-fix': s.bumped };
  return { checked: s.checked || {}, pending: s.pending || [], bumped: s.bumped || {} };
}
const writeState = (s) => fs.writeFileSync(STATE, JSON.stringify({ checked: s.checked, pending: s.pending, bumped: s.bumped }) + '\n');

/** id карточек, которые надо проверить: новые и изменённые после проверки */
function todo(state, pairs) {
  const pr = prints(pairs);
  const ids = [...new Set(pairs.map((p) => p.id))];
  return { ids, left: ids.filter((id) => state.checked[id] !== pr.get(id)), fresh: ids.filter((id) => !state.checked[id]).length };
}

function report(state, pairs) {
  const { ids, left, fresh } = todo(state, pairs);
  const leftSet = new Set(left);
  const fixFile = path.join(DIR, 'fixes.tsv');
  const fixes = fs.existsSync(fixFile) ? fs.readFileSync(fixFile, 'utf8').trim().split('\n').slice(1).filter(Boolean) : [];
  const rows = ORDER.map((s) => {
    const all = [...new Set(pairs.filter((p) => p.sec === s).map((p) => p.id))];
    return `| ${s} | ${all.filter((id) => !leftSet.has(id)).length} из ${all.length} | ${fixes.filter((l) => l.split('\t')[1] === s).length} |`;
  });
  const next = left.length ? pairs.find((p) => p.id === left[0]).sec : '—';
  const md = `# Проверка переводов EN → RU\n\nОбновляется инструментом \`tr.mjs\` после каждой пачки.\n\n` +
    `Проверено карточек: **${ids.length - left.length} из ${ids.length}**, исправлено переводов за всё время: **${fixes.length}**. ` +
    (left.length ? `Ждут проверки ${left.length} (новых ${fresh}, изменённых ${left.length - fresh}), дальше — раздел «${next}».` : 'Всё проверено.') +
    `\n\n| Раздел | Проверено карточек | Исправлено |\n|---|---|---|\n${rows.join('\n')}\n\n` +
    `Правки «было → стало» с причиной — \`fixes.tsv\`, замечания по английской стороне — \`notes.tsv\`.\n\n` +
    `**Проверить снова** (после новых карточек или в любой момент): написать в чате «проверь перевод English Reboot». ` +
    `Инструмент возьмёт только новые и изменённые после проверки карточки.\n`;
  fs.writeFileSync(path.join(DIR, 'PROGRESS.md'), md);
  return { total: ids.length, left: left.length, fresh, fixes: fixes.length, next, leftIds: left };
}

function locate(src, ru, key) {
  // все вхождения перевода в кавычках; берём то, перед которым ближе всего стоит английский ключ карточки
  const hits = [];
  for (const q of ["'", '"']) {
    const lit = q + ru.replace(/\\/g, '\\\\').replace(new RegExp(q, 'g'), '\\' + q) + q;
    for (let i = src.indexOf(lit); i !== -1; i = src.indexOf(lit, i + 1)) {
      const win = src.slice(Math.max(0, i - 600), i).replace(/\\(['"])/g, '$1').replace(/[{}]/g, '');
      const at = win.lastIndexOf(key);
      if (at !== -1) hits.push({ i, q, lit, dist: win.length - at });
    }
  }
  hits.sort((a, b) => a.dist - b.dist);
  if (!hits.length || (hits[1] && hits[1].dist === hits[0].dist)) return null;
  return hits[0];
}

/** Тесты, где записана версия раздела (`toBe('1.5.1')` рядом с «WORDS_VERSION»), — на новую версию */
function bumpPinned(name, oldV, newV) {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const dir = path.join(ROOT, 'tests');
  if (!fs.existsSync(dir)) return [];
  const changed = [];
  for (const f of walk(dir).filter((f) => f.endsWith('.js'))) {
    const s = fs.readFileSync(f, 'utf8');
    const t = s.split('\n').map((l) => (l.includes(name) && l.includes(`'${oldV}'`)
      ? l.replace(`'${oldV}'`, `'${newV}'`).replace(`${name}: ${oldV}`, `${name}: ${newV}`) : l)).join('\n');
    if (t !== s) { fs.writeFileSync(f, t); changed.push(path.relative(ROOT, f)); }
  }
  return changed;
}

/** Версии разделов и CACHE_VERSION поднимаются один раз на ветку — тогда ученики получат исправления */
function bump(state, groups) {
  const br = branch();
  const done = state.bumped[br] || (state.bumped[br] = []);
  const now = []; const tests = [];
  for (const g of groups) {
    const v = VER[g];
    if (!v || done.includes(v[1])) continue;
    const f = path.join(ROOT, v[0]);
    const s = fs.readFileSync(f, 'utf8');
    let oldV, newV;
    const t = s.replace(new RegExp(`(const ${v[1]} = )('?)([\\d.]+)\\2;( *\\/\\/ *)`), (m, a, q, ver, c) => {
      const parts = ver.split('.'); parts[parts.length - 1] = String(Number(parts.at(-1)) + 1);
      oldV = ver; newV = parts.join('.');
      return `${a}${q}${newV}${q};${c}${newV}: исправлены переводы; `;
    });
    if (t === s) continue;
    fs.writeFileSync(f, t); done.push(v[1]); now.push(`${v[1]} ${newV}`);
    tests.push(...bumpPinned(v[1], oldV, newV));
  }
  if (now.length && !done.includes('CACHE_VERSION')) {
    const f = path.join(ROOT, 'sw.js');
    fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/CACHE_VERSION = 'er-v(\d+)'/, (m, n) => {
      now.push(`CACHE_VERSION er-v${Number(n) + 1}`); return `CACHE_VERSION = 'er-v${Number(n) + 1}'`;
    }));
    done.push('CACHE_VERSION');
  }
  return { now, tests: [...new Set(tests)] };
}

const [cmd, arg] = process.argv.slice(2);
const pairs0 = allPairs();
const state = readState(pairs0);

if (cmd === 'next') {
  const want = Number(arg) || 150;
  const { leftIds } = report(state, pairs0);
  const left = new Set(leftIds);
  const batch = []; const ids = [];
  for (const p of pairs0) {
    if (!left.has(p.id)) continue;
    if (!ids.includes(p.id)) { if (batch.length >= want) break; ids.push(p.id); }
    batch.push(p);
  }
  state.pending = ids; writeState(state);
  if (!ids.length) { console.log('Всё проверено: новых и изменённых карточек нет.'); process.exit(0); }
  console.log(`Пачка: ${ids.length} карточек, ${batch.length} пар; осталось после неё ${leftIds.length - ids.length} карточек`);
  for (const p of batch) console.log(`${p.id}\t${p.field}\t${p.en}\t${p.ru}`);
} else if (cmd === 'apply') {
  if (!state.pending.length) { console.log('Нет открытой пачки: сначала next'); process.exit(1); }
  const rows = arg && arg !== '-' ? fs.readFileSync(arg, 'utf8').split('\n').filter((l) => l.trim()).map((l) => l.split('\t')) : [];
  const before = pairs0;
  const byKey = new Map(before.map((p) => [p.id + '|' + p.field, p]));
  const files = fs.readdirSync(path.join(ROOT, 'js')).filter((f) => /^(content_.*|improv_us)\.js$/.test(f)).map((f) => path.join(ROOT, 'js', f));
  const orig = new Map(files.map((f) => [f, fs.readFileSync(f, 'utf8')]));
  const src = new Map(orig);
  const plan = []; const notes = []; const errors = [];
  for (const [id, field, ru, why = '', sev = ''] of rows) {
    if (field === 'заметка') { notes.push([id, ru]); continue; }
    if (!state.pending.includes(id)) { errors.push(`${id}: не из открытой пачки`); continue; }
    const p = byKey.get(id + '|' + field);
    if (!p) { errors.push(`${id} ${field}: нет такой пары`); continue; }
    if (p.ru === ru) continue;
    const found = files.map((f) => ({ f, h: locate(src.get(f), p.ru, p.key) })).filter((x) => x.h).sort((a, b) => a.h.dist - b.h.dist);
    if (!found.length) { errors.push(`${id} ${field}: не нашёл «${p.ru}» в файлах`); continue; }
    const { f, h } = found[0];
    const lit = h.q + ru.replace(/\\/g, '\\\\').replace(new RegExp(h.q, 'g'), '\\' + h.q) + h.q;
    const s = src.get(f);
    src.set(f, s.slice(0, h.i) + lit + s.slice(h.i + h.lit.length));
    plan.push({ p, ru, why, sev });
  }
  for (const [f, s] of src) if (s !== orig.get(f)) fs.writeFileSync(f, s);
  const afterPairs = allPairs();
  const after = new Map(afterPairs.map((p) => [p.id + '|' + p.field, p.ru]));
  const expect = new Map(plan.map((x) => [x.p.id + '|' + x.p.field, x.ru]));
  for (const [k, p] of byKey) {
    const now = after.get(k);
    if (expect.has(k) ? now !== expect.get(k) : now !== p.ru) errors.push(`${k}: после правки «${now}» — ожидалось «${expect.get(k) ?? p.ru}»`);
  }
  if (errors.length) {
    for (const [f, s] of orig) fs.writeFileSync(f, s);
    console.log('ОШИБКИ — файлы возвращены как были, пачка не отмечена:\n' + errors.join('\n'));
    process.exit(1);
  }
  const fixesFile = path.join(DIR, 'fixes.tsv');
  if (!fs.existsSync(fixesFile)) fs.writeFileSync(fixesFile, 'id\tраздел\tполе\tEN\tбыло\tстало\tпочему\tважность\n');
  fs.appendFileSync(fixesFile, plan.map((x) => [x.p.id, x.p.sec, x.p.field, x.p.en, x.p.ru, x.ru, x.why, x.sev].join('\t') + '\n').join(''));
  if (notes.length) fs.appendFileSync(path.join(DIR, 'notes.tsv'), notes.map((n) => n.join('\t') + '\n').join(''));
  // одинаковый перевод у двух карточек раздела — в автотестах будет два верных ответа
  const dup = plan.filter((x) => x.p.field === 'перевод' && afterPairs.some((o) => o.field === 'перевод' && o.group === x.p.group && o.id !== x.p.id && o.ru === x.ru));
  const b = bump(state, [...new Set(plan.map((x) => x.p.group))]);
  const pr = prints(afterPairs);
  for (const id of state.pending) state.checked[id] = pr.get(id);
  const sec = [...new Set(before.filter((p) => state.pending.includes(p.id)).map((p) => p.sec))].join(', ');
  const first = state.pending[0], last = state.pending.at(-1);
  state.pending = []; writeState(state);
  const r = report(state, afterPairs);
  console.log(`Исправлено ${plan.length}, заметок ${notes.length}${b.now.length ? '; версии: ' + b.now.join(', ') : ''}` +
    `${b.tests.length ? '; версия в тестах: ' + b.tests.join(', ') : ''}. Проверено ${r.total - r.left} из ${r.total} карточек, всего правок ${r.fixes}.`);
  if (dup.length) console.log('⚠ такой же перевод уже есть у другой карточки раздела: ' + dup.map((x) => x.p.id).join(', '));
  console.log(`COMMIT: Переводы: ${sec} (${first}…${last}) — исправлено ${plan.length}`);
} else {
  const r = report(state, pairs0); writeState(state);
  console.log(`Проверено ${r.total - r.left} из ${r.total} карточек, правок за всё время ${r.fixes}. ` +
    (r.left ? `Ждут проверки ${r.left} (новых ${r.fresh}, изменённых ${r.left - r.fresh}), дальше: ${r.next}` : 'Новых и изменённых карточек нет.') +
    (state.pending.length ? `; открыта пачка из ${state.pending.length} карточек` : ''));
}
