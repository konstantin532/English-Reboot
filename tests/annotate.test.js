import { describe, it, expect } from 'vitest';
import '../js/annotate.js';

const { ruWord, ruTranscribe, splitSyllables } = globalThis.Annotate;
// Ударение — комбинируемый знак U+0301; для сравнения без ударения убираем его
const plain = (s) => s.replace(/́/g, '');

describe('Русская транскрипция: американское произношение', () => {
  it('базовые звуки и дифтонги', () => {
    expect(ruWord('/naɪt/', 'knight')).toBe('найт');
    expect(ruWord('/ˈhæpi/', 'happy')).toBe('хэ́пи');
    expect(ruWord('/ɡʊd/', 'good')).toBe('гуд');
  });

  it('r после гласной звучит, как в США (британская IPA на входе)', () => {
    expect(ruWord('/kɑː/', 'car')).toBe('кар');
    expect(plain(ruWord('/ˈwɔːtə/', 'water'))).toBe('уотэр');
    expect(plain(ruWord('/ˈɑːnsə/', 'answer'))).toBe('энсэр');
    expect(ruWord('/hɪə/', 'here')).toBe('хир');
  });

  it('американская IPA с явным r не даёт двойного «р»', () => {
    expect(plain(ruWord('əˈpɑrtmənt', 'apartment'))).toBe('эпартмэнт');
    expect(plain(ruWord('ˈdɪnɚ', 'dinner'))).toBe('динэр');
  });

  it('ɒ читается как «а» (lot, coffee), ŋk → «нк»', () => {
    expect(ruWord('/lɒt/', 'lot')).toBe('лат');
    expect(plain(ruWord('/ˈkɒfi/', 'coffee'))).toBe('кафи');
    expect(ruWord('/θɪŋk/', 'think')).toBe('синк');
  });

  it('йотация: you → ю, yes → ес', () => {
    expect(ruWord('/juː/', 'you')).toBe('ю');
    expect(ruWord('/jes/', 'yes')).toBe('ес');
  });

  it('ударение ставится над гласной ударного слога', () => {
    const s = ruWord('/səˈpəʊz/', 'suppose');
    expect(s).toContain('о́');
    expect(plain(s)).toBe('сэпоуз');
  });

  it("сокращения сохраняют окончание: where's, it's, I'll, we've", () => {
    expect(ruWord('/weə/', "where's")).toBe('уэрз');
    expect(ruWord('/ɪt/', "it's")).toBe('итс');
    expect(ruWord('/aɪ/', "I'll")).toBe('айл');
    expect(ruWord('/wiː/', "we've")).toBe('уив');
  });

  it('фраза транскрибируется по словам', () => {
    expect(plain(ruTranscribe('/ˈɡʊd ˈmɔːnɪŋ/', 'Good morning'))).toBe('гуд морнинг');
  });

  it('пустой ввод не роняет код', () => {
    expect(ruWord('', 'x')).toBe('');
    expect(ruTranscribe('', '')).toBe('');
  });
});

describe('Разбивка на слоги (для подсветки ударения)', () => {
  it('многосложные слова делятся, односложные — нет', () => {
    const parts = splitSyllables('answer');
    expect(parts.length).toBe(2);
    expect(parts.map((s) => s.text).join('')).toBe('answer');
    expect(parts[1].start).toBe(parts[0].text.length);
    expect(splitSyllables('cat')).toBe(null);
    expect(splitSyllables('hello!')).toBe(null);
  });
});
