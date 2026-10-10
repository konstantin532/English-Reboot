// docs/translation-check/tr.mjs — проверка переводов EN→RU по пачкам (рабочий инструмент; удалить, когда проверка закончена).
//   node docs/translation-check/tr.mjs status          — сколько проверено и что дальше
//   node docs/translation-check/tr.mjs next [пар=150]  — следующая пачка непроверенных карточек (в порядке приоритета разделов)
//   node docs/translation-check/tr.mjs apply <файл>    — применить правки к пачке и отметить её проверенной
// Файл правок (TSV, без заголовка): id ⇥ поле ⇥ новый перевод ⇥ почему ⇥ важность. Поле «заметка» — в notes.tsv без правки.
// Состояние — state.json, правки — fixes.tsv, заметки — notes.tsv, отчёт — PROGRESS.md (всё в этой папке).
import fs from 'node:fs';
import path from 'node:path';
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
const readState = () => { try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch { return { checked: [], pending: [], bumped: [] }; } };
const writeState = (s) => fs.writeFileSync(STATE, JSON.stringify(s, null, 0) + '\n');

/** Все пары курса: [{ id, group, sec, field, en, key, ru }] в порядке приоритета */
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

function report(state, pairs) {
  const ids = [...new Set(pairs.map((p) => p.id))];
  const done = new Set(state.checked);
  const fixes = fs.existsSync(path.join(DIR, 'fixes.tsv')) ? fs.readFileSync(path.join(DIR, 'fixes.tsv'), 'utf8').trim().split('\n').slice(1).filter(Boolean) : [];
  const lines = ORDER.map((s) => {
    const all = [...new Set(pairs.filter((p) => p.sec === s).map((p) => p.id))];
    const ok = all.filter((id) => done.has(id)).length;
    const fx = fixes.filter((l) => l.split('\t')[1] === s).length;
    return `| ${s} | ${ok} из ${all.length} | ${fx} |`;
  });
  const left = ids.filter((id) => !done.has(id));
  const next = left.length ? pairs.find((p) => p.id === left[0]).sec : '—';
  const md = `# Проверка переводов EN → RU\n\nВетка \`feature/translation-fix\`. Обновляется после каждой пачки.\n\n` +
    `Проверено карточек: **${ids.length - left.length} из ${ids.length}**, исправлено переводов: **${fixes.length}**. ` +
    (left.length ? `Дальше — раздел «${next}».` : 'Проверка закончена.') + `\n\n| Раздел | Проверено карточек | Исправлено |\n|---|---|---|\n${lines.join('\n')}\n\n` +
    `Все правки «было → стало» — в \`fixes.tsv\`, замечания по английской стороне — в \`notes.tsv\`.\n\n` +
    `**Как продолжить:** в новом чате написать «продолжай проверку перевода English Reboot» — работа пойдёт с первой непроверенной карточки.\n`;
  fs.writeFileSync(path.join(DIR, 'PROGRESS.md'), md);
  return { total: ids.length, left: left.length, fixes: fixes.length, next };
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

function bump(state, groups) {
  const done = [];
  for (const g of groups) {
    const v = VER[g];
    if (!v || state.bumped.includes(v[1])) continue;
    const f = path.join(ROOT, v[0]);
    let s = fs.readFileSync(f, 'utf8');
    s = s.replace(new RegExp(`(const ${v[1]} = )('?)([\\d.]+)\\2;( *\\/\\/ *)`), (m, a, q, ver, c) => {
      const parts = ver.split('.'); parts[parts.length - 1] = String(Number(parts.at(-1)) + 1);
      const nv = parts.join('.');
      return `${a}${q}${nv}${q};${c}${nv}: исправлены переводы; `;
    });
    fs.writeFileSync(f, s); state.bumped.push(v[1]); done.push(v[1]);
  }
  if (done.length && !state.bumped.includes('CACHE_VERSION')) {
    const f = path.join(ROOT, 'sw.js');
    fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/CACHE_VERSION = 'er-v(\d+)'/, (m, n) => `CACHE_VERSION = 'er-v${Number(n) + 1}'`));
    state.bumped.push('CACHE_VERSION'); done.push('CACHE_VERSION');
  }
  return done;
}

const [cmd, arg] = process.argv.slice(2);
const state = readState();

if (cmd === 'next') {
  const pairs = allPairs();
  const done = new Set(state.checked);
  const want = Number(arg) || 150;
  const batch = []; const ids = [];
  for (const p of pairs) {
    if (done.has(p.id)) continue;
    if (!ids.includes(p.id)) { if (batch.length >= want) break; ids.push(p.id); }
    batch.push(p);
  }
  state.pending = ids; writeState(state);
  const r = report(state, pairs);
  console.log(`Пачка: ${ids.length} карточек, ${batch.length} пар; осталось после неё ${r.left - ids.length} карточек`);
  for (const p of batch) console.log(`${p.id}\t${p.field}\t${p.en}\t${p.ru}`);
} else if (cmd === 'apply') {
  if (!state.pending.length) { console.log('Нет открытой пачки: сначала next'); process.exit(1); }
  const rows = arg && arg !== '-' ? fs.readFileSync(arg, 'utf8').split('\n').filter((l) => l.trim()).map((l) => l.split('\t')) : [];
  const before = allPairs();
  const byKey = new Map(before.map((p) => [p.id + '|' + p.field, p]));
  const files = fs.readdirSync(path.join(ROOT, 'js')).filter((f) => /^(content_.*|improv_us)\.js$/.test(f)).map((f) => path.join(ROOT, 'js', f));
  const orig = new Map(files.map((f) => [f, fs.readFileSync(f, 'utf8')]));
  const src = new Map(orig);
  const plan = []; const notes = []; const errors = [];
  for (const [id, field, ru, why = '', sev = ''] of rows) {
    if (field === 'заметка') { notes.push([id, ru]); continue; }
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
  const after = new Map(allPairs().map((p) => [p.id + '|' + p.field, p.ru]));
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
  const dup = plan.filter((x) => x.p.field === 'перевод' && before.some((o) => o.field === 'перевод' && o.group === x.p.group && o.id !== x.p.id && o.ru === x.ru));
  const bumped = bump(state, [...new Set(plan.map((x) => x.p.group))]);
  state.checked.push(...state.pending.filter((id) => !state.checked.includes(id)));
  const sec = [...new Set(before.filter((p) => state.pending.includes(p.id)).map((p) => p.sec))].join(', ');
  const first = state.pending[0], last = state.pending.at(-1);
  state.pending = []; writeState(state);
  const r = report(state, before);
  console.log(`Исправлено ${plan.length}, заметок ${notes.length}${bumped.length ? '; версии: ' + bumped.join(', ') : ''}. ` +
    `Проверено ${r.total - r.left} из ${r.total} карточек, всего правок ${r.fixes}.`);
  if (dup.length) console.log('⚠ такой же перевод уже есть у другой карточки раздела: ' + dup.map((x) => x.p.id).join(', '));
  console.log(`COMMIT: Переводы: ${sec} (${first}…${last}) — исправлено ${plan.length}`);
} else {
  const r = report(state, allPairs());
  console.log(`Проверено ${r.total - r.left} из ${r.total} карточек, правок ${r.fixes}. Дальше: ${r.next}${state.pending.length ? `; открыта пачка из ${state.pending.length} карточек` : ''}`);
}
