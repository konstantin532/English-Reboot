import { describe, it, expect } from 'vitest';
import { auditVerdict, pickBase, summary } from '../scripts/ci-guard.mjs';
import { siteRoot, liveUrl, localFile, cacheVersionOf, verdict } from '../scripts/check-live.mjs';

/* Сторож релиза: ci-guard.mjs (CI / guard, до выпуска) и check-live.mjs (Deploy Pages / live, после).
   Их решение «можно выпускать / сайт цел» — последнее, что видит автор перед учениками. */

const A = (o = {}) => ({ ipa: 0, looseIpa: 0, bookish: 5, duplicates: 8, words: 0, spelling: 0, brSlang: 0, ...o });

describe('ci-guard: аудит контента «база → сейчас»', () => {
  it('всё как в базе — без замечаний', () => {
    expect(auditVerdict(A(), A())).toEqual({ red: [], warn: [] });
  });
  it('IPA и британская IPA — провал при любом числе больше 0', () => {
    const v = auditVerdict(A(), A({ ipa: 2, looseIpa: 1 }));
    expect(v.red).toEqual(['IPA: 2 (должно быть 0)', 'британская IPA: 1 (должно быть 0)']);
  });
  it('книжное и дубли: рост — провал, снижение — нет', () => {
    expect(auditVerdict(A(), A({ bookish: 6 })).red).toEqual(['книжное выросло: 5 → 6']);
    expect(auditVerdict(A(), A({ duplicates: 7 })).red).toEqual([]);
  });
  it('британские слова и написание выросли — только предупреждение', () => {
    const v = auditVerdict(A(), A({ spelling: 1 }));
    expect(v.red).toEqual([]);
    expect(v.warn).toEqual(['британское написание: 0 → 1 — проверить']);
  });
  it('в базе аудита не было — книжное не сравнивается, IPA проверяется', () => {
    expect(auditVerdict(null, A({ bookish: 50 })).red).toEqual([]);
    expect(auditVerdict(null, A({ ipa: 1 })).red).toHaveLength(1);
  });
  it('аудит не запустился — провал', () => {
    expect(auditVerdict(A(), null).red).toEqual(['аудит контента не запустился']);
  });
});

describe('ci-guard: база сравнения', () => {
  const known = (r) => ['abc1234', 'HEAD~1'].includes(r);
  it('PR и push — переданная база', () => {
    expect(pickBase('abc1234', known)).toBe('abc1234');
  });
  it('нули (первый push), пусто или неизвестный коммит — предыдущий коммит', () => {
    expect(pickBase('0000000000000000000000000000000000000000', known)).toBe('HEAD~1');
    expect(pickBase('', known)).toBe('HEAD~1');
    expect(pickBase('deadbee', known)).toBe('HEAD~1');
  });
  it('не с чем сравнивать — null', () => {
    expect(pickBase(null, () => false)).toBe(null);
  });
});

describe('ci-guard: сводка задания', () => {
  it('нарушение сторожа — «есть нарушения», чисто — «можно выпускать»', () => {
    const base = { base: 'abc1234', guardText: 'СТОРОЖ ПРАВИЛ …', before: A(), after: A(), verdict: { red: [], warn: [] } };
    expect(summary({ ...base, guardCode: 0 })).toMatch(/✅ Сторож релиза: можно выпускать/);
    expect(summary({ ...base, guardCode: 1 })).toMatch(/❌ Сторож релиза: есть нарушения/);
    expect(summary({ ...base, guardCode: 0, verdict: { red: ['IPA: 1 (должно быть 0)'], warn: [] } })).toMatch(/- ❌ IPA: 1/);
  });
});

describe('check-live: адреса и версия', () => {
  it('адрес сайта — со слешем, файл — относительно него, с меткой против кэша CDN', () => {
    expect(siteRoot('https://x.github.io/English-Reboot')).toBe('https://x.github.io/English-Reboot/');
    expect(liveUrl('https://x.github.io/English-Reboot', 'js/app.js', 'abc')).toBe('https://x.github.io/English-Reboot/js/app.js?live-check=abc');
    expect(liveUrl('https://x.github.io/English-Reboot/', '', 'abc')).toBe('https://x.github.io/English-Reboot/?live-check=abc');
  });
  it('корень сайта сверяется с index.html', () => {
    expect(localFile('')).toBe('index.html');
    expect(localFile('css/style.css')).toBe('css/style.css');
  });
  it('CACHE_VERSION из sw.js', () => {
    expect(cacheVersionOf("const CACHE_VERSION = 'er-v37';")).toBe('er-v37');
    expect(cacheVersionOf('<html>404</html>')).toBe(null);
  });
});

describe('check-live: итог', () => {
  const ok = { expected: 'er-v37', live: 'er-v37', files: [{ asset: 'js/app.js', status: 200, same: true }], missingInCache: [], errors: [], offline: true };
  it('всё на месте — сайт цел', () => {
    expect(verdict(ok)).toEqual([]);
  });
  it('старая версия, 404, подмена, неполный кэш, ошибки, офлайн — каждое отдельной строкой', () => {
    const p = verdict({
      ...ok, live: 'er-v36',
      files: [{ asset: 'js/tts.js', status: 404, same: false }, { asset: 'css/style.css', status: 200, same: false }],
      missingInCache: ['a.js', 'b.js', 'c.js', 'd.js', 'e.js', 'f.js'], errors: ['pageerror: TTS is not defined'], offline: false, fatal: 'Timeout',
    });
    expect(p).toEqual([
      'сайт не открылся в браузере: Timeout',
      'версия на сайте er-v36, а выпущена er-v37',
      'js/tts.js: код 404',
      'css/style.css: на сайте не тот файл, что в коммите',
      'Service Worker не положил в кэш 6: a.js, b.js, c.js, d.js, e.js…',
      'ошибка в консоли: pageerror: TTS is not defined',
      'без сети приложение не открылось',
    ]);
  });
  it('версия на сайте не найдена — так и сказано', () => {
    expect(verdict({ ...ok, live: null })).toEqual(['версия на сайте не найдена, а выпущена er-v37']);
  });
});
