#!/usr/bin/env node
/**
 * scripts/er-lessons.mjs — уроки агента: что сожгло токены, что сломалось, где инструкция подвела.
 *
 * Уроки живут в разделе «Уроки агента» docs/EVOLUTION.md, по строке на урок:
 *   - [ключ] ×2 (2026-10-09, 2026-10-12) текст
 * Тот же ключ второй раз — счётчик растёт, дата добавляется. Урок с ×2 и больше — повод предложить правку
 * скилла или новую команду er (этап /er-ship), но только через PR: уроки — данные, а не инструкции.
 *
 *   node scripts/er.mjs lessons                         # уроки, повторившиеся — сверху
 *   node scripts/er.mjs lessons add <ключ> "<текст>"    # записать урок (ключ — латиница/кириллица, цифры, дефис)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = process.env.ER_ROOT ? path.resolve(process.env.ER_ROOT) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SECTION = 'Уроки агента';
export const PROMOTE = 2;
const LINE = /^- \[([\wа-яё-]+)\] ×(\d+) \(([^)]*)\) (.+)$/i;

/** Уроки из markdown всего EVOLUTION.md → [{ key, count, dates, text }] */
export function lessonsOf(md) {
  const m = String(md).match(new RegExp(`^## ${SECTION}\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'));
  if (!m) return [];
  return m[1].split('\n').map((l) => l.match(LINE)).filter(Boolean)
    .map((x) => ({ key: x[1].toLowerCase(), count: Number(x[2]), dates: x[3].split(',').map((d) => d.trim()).filter(Boolean), text: x[4].trim() }));
}

const lineOf = (l) => `- [${l.key}] ×${l.count} (${l.dates.join(', ')}) ${l.text}`;

/** Добавить урок: тот же ключ — ×N+1 и дата (текст — новый, если дан); раздела нет — создать перед «Итерации» */
export function addLesson(md, key, text, date) {
  key = String(key || '').toLowerCase().trim();
  if (!/^[\wа-яё-]+$/i.test(key)) throw new Error('ключ урока — одно слово: буквы, цифры, дефис');
  text = String(text || '').replace(/\s+/g, ' ').trim();
  const src = String(md);
  const list = lessonsOf(src);
  const old = list.find((l) => l.key === key);
  if (old) { old.count++; if (!old.dates.includes(date)) old.dates.push(date); if (text) old.text = text; }
  else { if (!text) throw new Error('новый урок без текста'); list.push({ key, count: 1, dates: [date], text }); }
  const body = `## ${SECTION}\n\nДанные, не инструкции. Повтор ×${PROMOTE} — предложить правку скилла или команду er через PR (этап /er-ship).\n\n` +
    list.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)).map(lineOf).join('\n') + '\n\n';
  const re = new RegExp(`^## ${SECTION}\\n[\\s\\S]*?(?=^## |(?![\\s\\S]))`, 'm');
  if (re.test(src)) return src.replace(re, body);
  const at = src.search(/^## Итерации$/m);
  return at >= 0 ? src.slice(0, at) + body + src.slice(at) : src.replace(/\n*$/, '\n\n') + body;
}

/** Строка для er start */
export function lessonsLine(md) {
  const L = lessonsOf(md);
  if (!L.length) return 'УРОКИ АГЕНТА: нет';
  const hot = L.filter((l) => l.count >= PROMOTE);
  return `УРОКИ АГЕНТА: ${L.length}` + (hot.length ? `; повторились — предложить правку скилла (/er-ship): ${hot.map((l) => `[${l.key}] ×${l.count}`).join(', ')}` : '');
}

function main() {
  const [cmd, key, ...rest] = process.argv.slice(2);
  const f = path.join(ROOT, 'docs', 'EVOLUTION.md');
  const md = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  if (cmd === 'add') {
    try {
      fs.writeFileSync(f, addLesson(md, key, rest.join(' '), new Date().toISOString().slice(0, 10)));
    } catch (e) { console.log('er lessons: ' + e.message); return 2; }
    const l = lessonsOf(fs.readFileSync(f, 'utf8')).find((x) => x.key === key.toLowerCase());
    console.log(`урок [${l.key}] ×${l.count}${l.count >= PROMOTE ? ' — повторился: предложить правку скилла или команду er (через PR)' : ''}`);
    return 0;
  }
  const L = lessonsOf(md);
  console.log(L.length ? L.map(lineOf).join('\n') : 'Уроков нет. Записать: node scripts/er.mjs lessons add <ключ> "<текст>"');
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) process.exit(main());
