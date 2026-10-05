/**
 * scripts/cmu_ipa.mjs — CMU Pronouncing Dictionary (ARPAbet) → американская IPA (этап 7).
 * Dev-инструментарий: приложение этот файл не использует.
 * Словарь: https://github.com/cmusphinx/cmudict (BSD-2-Clause), путь к cmudict.dict передаётся явно.
 * Формат IPA совпадает с js/lex_us.js: ɚ/ɝ, ɑ/ɔ, oʊ, без знаков долготы; ˈ — перед ударным слогом
 * (у односложных слов не ставится), второстепенное ударение не пишем.
 */
import fs from 'node:fs';

const V = {
  AA: 'ɑ', AE: 'æ', AH: 'ʌ', AO: 'ɔ', AW: 'aʊ', AY: 'aɪ', EH: 'ɛ', ER: 'ɝ', EY: 'eɪ',
  IH: 'ɪ', IY: 'i', OW: 'oʊ', OY: 'ɔɪ', UH: 'ʊ', UW: 'u',
};
const C = {
  B: 'b', CH: 'tʃ', D: 'd', DH: 'ð', F: 'f', G: 'ɡ', HH: 'h', JH: 'dʒ', K: 'k', L: 'l', M: 'm', N: 'n',
  NG: 'ŋ', P: 'p', R: 'r', S: 's', SH: 'ʃ', T: 't', TH: 'θ', V: 'v', W: 'w', Y: 'j', Z: 'z', ZH: 'ʒ',
};
// Допустимые начала слога (для места знака ударения): максимальный допустимый кластер
const ONSETS = new Set(['pl', 'pr', 'bl', 'br', 'tr', 'dr', 'kl', 'kr', 'ɡl', 'ɡr', 'fl', 'fr', 'θr', 'ʃr', 'sp', 'st', 'sk',
  'sm', 'sn', 'sl', 'sw', 'tw', 'kw', 'dw', 'spl', 'spr', 'str', 'skr', 'skw', 'skj', 'spj', 'pj', 'bj', 'kj', 'fj', 'mj', 'vj', 'hj', 'sj']);

export function arpaToIpa(arpa) {
  const ph = arpa.trim().split(/\s+/);
  const units = ph.map((p) => {
    const m = p.match(/^([A-Z]+)([012])?$/);
    if (!m) return null;
    if (m[2] !== undefined) {
      let v = V[m[1]];
      if (m[1] === 'AH' && m[2] === '0') v = 'ə';
      if (m[1] === 'ER' && m[2] === '0') v = 'ɚ';
      return { v: true, ipa: v, stress: m[2] === '1' };
    }
    return { v: false, ipa: C[m[1]] };
  }).filter(Boolean);
  const vowels = units.filter((u) => u.v).length;
  let out = '';
  let stressed = false; // как в lex_us.js: только первое основное ударение (составные слова)
  units.forEach((u, i) => {
    if (u.v && u.stress && vowels > 1 && !stressed) {
      stressed = true;
      // отступаем назад на максимально допустимое начало слога
      let j = i, onset = '';
      while (j > 0 && !units[j - 1].v) {
        const cand = units[j - 1].ipa + onset;
        if (onset && !ONSETS.has(cand)) break;
        onset = cand;
        j--;
      }
      // ' вставляем перед onset (он уже выведен в out)
      out = out.slice(0, out.length - onset.length) + 'ˈ' + onset;
    }
    out += u.ipa;
  });
  return out;
}

// cmudict.dict → Map(word → [ipa, ipa(2), …])
export function loadCmu(file) {
  const map = new Map();
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([^\s(]+)(?:\(\d+\))?\s+([^#]+)/);
    if (!m) continue;
    const w = m[1].toLowerCase();
    if (!map.has(w)) map.set(w, []);
    map.get(w).push(arpaToIpa(m[2]));
  }
  return map;
}
