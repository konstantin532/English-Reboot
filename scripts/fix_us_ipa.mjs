/**
 * scripts/fix_us_ipa.mjs — замена британской IPA на американскую в контенте (этап 7).
 * Dev-инструментарий, запускается один раз после аудита:
 *   node scripts/audit_content.mjs --cmu …/cmudict.dict   (строит docs/content-audit.json)
 *   node scripts/fix_us_ipa.mjs                             (правит js/content_*.js)
 * Источник замен — раздел «ipa» отчёта: слово + британская IPA → американская (CMU / слабая
 * форма) и ручные решения из раздела 1б. Меняются только записи IPA в словарях
 * (слово:'ipa|…') и в разметке грамматики w('слово','pos','/ipa/'); остальное — вручную.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const audit = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'content-audit.json'), 'utf8'));

// Ручные решения (отчёт, раздел 1б): там, где CMU не подходит
const MANUAL = {
  'croissant|ˈkrwʌsɒn': 'krəˈsɑnt',
  'used|juːst': 'just', // «used to» — привык
};

const bare = (w) => String(w || '').toLowerCase().replace(/[^a-z']/g, '').replace(/^'+|'+$/g, '');
const map = new Map();
for (const r of audit.ipa) map.set(r.word + '|' + r.ipa, MANUAL[r.word + '|' + r.ipa] || r.us);

// Американская запись /ɛ/ вместо британской /e/ (кроме дифтонга eɪ): так пишут CMU и lex_us.js
const IPA_ONLY = /^[a-zæɑɒɔəɜɛɪʊʌθðʃʒŋɡˈˌːɚɝ.' -]+$/;
const normE = (ipa) => (IPA_ONLY.test(ipa) ? ipa.replace(/e(?!ɪ)/g, 'ɛ') : ipa);
let total = 0;
const perFile = {};
function fix(file) {
  const p = path.join(ROOT, 'js', file);
  let s = fs.readFileSync(p, 'utf8');
  let n = 0;
  // 1) словари: key:'ipa|…' / "key":"ipa|…" (ключ может быть в кавычках: "don't")
  s = s.replace(/(^|[,{\s])(["']?)([A-Za-z][A-Za-z'’.-]*)\2:(["'])([^|"'\n]+)(\|[^"'\n]*)?\4/g, (m, pre, kq, key, q, ipa, rest) => {
    // только записи словаря: «ipa|часть речи[|…]»
    if (!rest || !/^\|[a-z]{1,2}(\||$)/.test(rest)) return m;
    const us = normE(map.get(bare(key) + '|' + ipa) || ipa);
    if (us === ipa) return m;
    n++;
    return `${pre}${kq}${key}${kq}:${q}${us}${rest || ''}${q}`;
  });
  // 2) грамматика: w('word','pos','/ipa/'
  s = s.replace(/w\(("([^"]+)"|'([^']+)'),\s*(["'])([^"']*)\4,\s*(["'])\/([^/"']+)\/\6/g, (m, wq, w1, w2, q2, pos, q3, ipa) => {
    const word = w1 || w2, q1 = w1 ? '"' : "'";
    const us = normE(map.get(bare(word) + '|' + ipa) || ipa);
    if (us === ipa) return m;
    n++;
    return `w(${q1}${word}${q1},${q2}${pos}${q2},${q3}/${us}/${q3}`;
  });
  fs.writeFileSync(p, s);
  perFile[file] = n;
  total += n;
}
['content_grammar.js', 'content_vocab.js', 'content_extra.js', 'content_pro.js'].forEach(fix);
console.log('Заменено записей IPA:', total, perFile);
