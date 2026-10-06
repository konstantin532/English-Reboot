import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

/* Этап 7: защитные проверки после аудита контента — британское не должно вернуться. */
const FILES = ['content_grammar', 'content_vocab', 'content_extra', 'content_pro', 'content_us', 'content_words', 'lex_us', 'content_migrate'];
const ctx = { console: { log() {}, warn() {}, error() {} } };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(FILES.map((f) => fs.readFileSync(path.resolve(process.cwd(), 'js', f + '.js'), 'utf8')).join('\n;\n') +
  ';this.__G = GRAMMAR_CARDS;', ctx);
const M = ctx.ContentMigrate;
const ALL = [ctx.__G, ctx.WORD_CARDS, ctx.PHRASAL_CARDS, ctx.COLLOCATION_CARDS, ctx.IDIOM_CARDS, ctx.CONVERSATION_CARDS, ctx.SLANG_CARDS,
  ctx.MINIMAL_PAIR_CARDS, ctx.READING_CARDS, ctx.PRO_READINGS, ...Object.values(ctx.PRO_CONTENT || {})]
  .filter(Array.isArray).flat();

function walk(o, fn, depth = 0) {
  if (!o || typeof o !== 'object' || depth > 7) return;
  fn(o);
  for (const v of Object.values(o)) if (v && typeof v === 'object') walk(v, fn, depth + 1);
}
// Британские признаки: долгота ː, ɒ, əʊ, /e/ вместо /ɛ/, eə/ɪə/ʊə. После дифтонга (aɪ-ə, ɔɪ-ə, eɪ-ə, oʊ-ə, aʊ-ə:
// quiet, loyalty, payable, going) это два слога, а не британский звук.
const BRITISH_IPA = /ː|ɒ|əʊ|e(?!ɪ)|eə|(?<![aɔeo])ɪə|(?<![aɔeo])ʊə/;

describe('Аудит контента: транскрипция только американская', () => {
  it('в разборе примеров нет британской IPA', () => {
    const bad = [];
    ALL.forEach((c) => walk(c.payload, (o) => {
      if (Array.isArray(o.parts)) o.parts.forEach((p) => { if (p && p.ipa && BRITISH_IPA.test(p.ipa)) bad.push(`${c.id}:${p.word} ${p.ipa}`); });
    }));
    expect(bad.slice(0, 10)).toEqual([]);
  });
  it('в полях сленга, пар звуков и звуков нет британской IPA', () => {
    const bad = [];
    ALL.forEach((c) => ['ipa1', 'ipa2', 'ipa_short', 'ipa_full'].forEach((k) => {
      const v = c.payload[k];
      if (v && BRITISH_IPA.test(v)) bad.push(`${c.id}.${k} ${v}`);
    }));
    expect(bad).toEqual([]);
  });
});

describe('Аудит контента: американские слова и написание', () => {
  const english = [];
  ALL.forEach((c) => walk(c.payload, (o) => {
    Object.entries(o).forEach(([k, v]) => { if (typeof v === 'string' && !['ipa', 'ipa1', 'ipa2'].includes(k)) english.push([c.id, v]); });
    if (Array.isArray(o)) o.forEach((v) => { if (typeof v === 'string') english.push([c.id, v]); });
  }));
  const find = (re) => english.filter(([, t]) => re.test(t)).map(([id, t]) => id + ': ' + t.slice(0, 60));

  it('нет британского написания', () => {
    expect(find(/\b(colou?rs?|favourite|neighbours?|behaviour|apologis(e|ed)|cancelled|harbour|travelling|fibre|centre|rumour|plough\w*|grey)\b/i)
      .filter((x) => /colour|favourite|neighbour|behaviour|apologis|cancelled|harbour|travelling|fibre|centre|rumour|plough|grey/i.test(x))).toEqual([]);
  });
  it('нет британских слов, найденных аудитом', () => {
    expect(find(/\b(petrol|motorway|car park|rubbish|queueing|wardrobe|autumn|mum)\b/i)).toEqual([]);
  });
  it('нет карточек британского сленга', () => {
    const fronts = ctx.SLANG_CARDS.map((c) => c.payload.front);
    ['innit', 'cuppa', 'ta', 'loadsa', 'howzza'].forEach((w) => expect(fronts.includes(w)).toBe(false));
    ['didja', 'ya', "'kay", 'hadda', "c'mere", 'lotsa'].forEach((w) => expect(fronts.includes(w)).toBe(true));
  });
  it('пара caught / cot заменена: у многих американцев она звучит одинаково', () => {
    const fronts = ctx.MINIMAL_PAIR_CARDS.map((c) => c.payload.front);
    expect(fronts.includes('caught / cot')).toBe(false);
    expect(fronts.includes('hot / hat')).toBe(true);
  });
});

describe('Аудит контента: дубли и миграция прогресса', () => {
  const ids = (arr) => arr.map((c) => c.id);
  it('лишние копии убраны, остальные номера не сдвинулись', () => {
    const all = [...ids(ctx.CONVERSATION_CARDS), ...ids(ctx.SLANG_CARDS)];
    M.MERGE.forEach((m) => { expect(all.includes(m.from)).toBe(false); expect(all.includes(m.to)).toBe(true); });
    expect(new Set(all).size).toBe(all.length);
    expect(ctx.SLANG_CARDS.find((c) => c.id === 'sl_062').payload.front).toBe('lotsa');
    expect(ctx.SLANG_CARDS.find((c) => c.id === 'sl_063').payload.front).toBe('ya');
  });
  it('прогресс дубля переносится, если у оставшейся карточки его нет', () => {
    const pl = M.plan({ cv_029: { cardId: 'cv_029', storeName: 'conversation', reps: 4, ladder: { step: 3 } } });
    expect(pl.put.length).toBe(1);
    expect(pl.put[0].cardId).toBe('cv_144');
    expect(pl.put[0].reps).toBe(4);
    expect(pl.put[0].ladder.step).toBe(3);
    expect(pl.del).toEqual(['cv_029']);
  });
  it('если у оставшейся карточки уже есть прогресс — он остаётся, дубль удаляется', () => {
    const pl = M.plan({ cv_029: { cardId: 'cv_029', reps: 9 }, cv_144: { cardId: 'cv_144', reps: 2 } });
    expect(pl.put).toEqual([]);
    expect(pl.del).toEqual(['cv_029']);
  });
  it('карточки, ставшие другой фразой, — прогресс сбрасывается; карточки-дубли удаляются из разделов', () => {
    const pl = M.plan({ sl_058: { cardId: 'sl_058' }, mp_010: { cardId: 'mp_010' }, sl_001: { cardId: 'sl_001' } });
    expect(pl.del).toEqual(['sl_058', 'mp_010']);
    expect(pl.cards.map((x) => x.join(':'))).toEqual(M.MERGE.map((m) => m.store + ':' + m.from));
    expect(M.plan({}).del).toEqual([]);
  });
});

describe('Аудит контента: омографы (live, close, read, use, wind)', () => {
  // IPA слова в конкретном примере курса: ищем предложение и берём разбор слова
  function ipaIn(sentence, word) {
    let found = null;
    ALL.forEach((c) => walk(c.payload, (o) => {
      if (found || !Array.isArray(o.parts)) return;
      if (o.parts.map((p) => p.word).join(' ') !== sentence) return;
      const p = o.parts.find((x) => String(x.word).toLowerCase().replace(/[^a-z']/g, '') === word);
      if (p) found = p.ipa;
    }));
    return found;
  }
  it('в примерах курса выбран нужный вариант по смыслу', () => {
    expect(ipaIn('I live on the fifth floor, 5C.', 'live')).toBe('/lɪv/');
    expect(ipaIn('Close your eyes.', 'close')).toBe('/kloʊz/');
    expect(ipaIn("It's close. Just two blocks.", 'close')).toBe('/kloʊs/');
    expect(ipaIn('I read before bed.', 'read')).toBe('/rid/');
    expect(ipaIn('He saw it but left me on read.', 'read')).toBe('/rɛd/');
    expect(ipaIn('First, read the instructions.', 'read')).toBe('/rid/');
    expect(ipaIn('Can I use this towel?', 'use')).toBe('/juz/');
    expect(ipaIn('Warning: surfaces are hot after use. Keep away from children.', 'use')).toBe('/jus/');
    expect(ipaIn('The wind is so cold.', 'wind')).toBe('/wɪnd/');
  });
  it('правила: live music, wind down, Tony read', () => {
    const R = ctx.LEX_US_HOMOGRAPH_RULES;
    expect(R.live('', 'music', [], '', 'live')).toBe('laɪv');
    expect(R.live('i', 'in', [], 'I', 'live')).toBe('lɪv');
    expect(R.wind('to', 'down', [], 'to', 'wind')).toBe('waɪnd');
    expect(R.read('tony', 'it', [], 'Tony', 'read')).toBe('rɛd');
    expect(R.read('i', 'it', ['i', 'read', 'it', 'yesterday'], 'I', 'read')).toBe('rɛd');
  });
});
