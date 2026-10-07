import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import '../js/annotate.js';

/* Разметка слов (word_marks.js): часть речи, ударный слог и немые буквы считаются по американской IPA
   и словарю — для любой новой карточки, без ручной разметки. Тест стережёт, чтобы новые слова не
   остались без цвета, ударения и немых букв (так было с пакетами A1 и A1+). */
const FILES = ['content_grammar', 'content_vocab', 'content_extra', 'content_pro', 'content_us', 'content_words', 'lex_us',
  'pos_us', 'word_marks'];
const ctx = { console: { log() {}, warn() {}, error() {} } };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(FILES.map((f) => fs.readFileSync(path.resolve(process.cwd(), 'js', f + '.js'), 'utf8')).join('\n;\n') +
  ';this.__G = GRAMMAR_CARDS; this.__WM = WordMarks;', ctx);
const WM = ctx.__WM;
const ALL = [ctx.__G, ctx.WORD_CARDS, ctx.PHRASAL_CARDS, ctx.COLLOCATION_CARDS, ctx.IDIOM_CARDS, ctx.CONVERSATION_CARDS,
  ctx.SLANG_CARDS, ctx.MINIMAL_PAIR_CARDS, ctx.READING_CARDS, ...Object.values(ctx.PRO_CONTENT || {})].filter(Array.isArray).flat();
const partsOf = (cards) => {
  const out = [];
  const walk = (o, d) => { if (!o || typeof o !== 'object' || d > 7) return; if (Array.isArray(o.parts)) out.push(o.parts); for (const v of Object.values(o)) if (v && typeof v === 'object') walk(v, d + 1); };
  cards.forEach((c) => walk(c.payload, 0));
  return out;
};

// Немые буквы и ударный слог одного слова по IPA
function marks(word, ipa) {
  const a = WM.align(word, ipa);
  if (!a) return null;
  const span = WM.stressSpanOf(word, a);
  return { silent: WM.silentOf(word, a).map((i) => word[i]).join(''), stress: span ? word.slice(span[0], span[1]) : '' };
}

describe('Немые буквы — по американской IPA', () => {
  it('классические немые буквы', () => {
    const cases = { know: ['noʊ', 'k'], walk: ['wɔk', 'l'], could: ['kʊd', 'l'], two: ['tu', 'w'], answer: ['ˈænsɚ', 'w'],
      who: ['hu', 'w'], what: ['wʌt', 'h'], hour: ['aʊr', 'h'], listen: ['ˈlɪsən', 't'], night: ['naɪt', 'gh'],
      daughter: ['ˈdɔtɚ', 'gh'], island: ['ˈaɪlənd', 's'], doubt: ['daʊt', 'b'], sign: ['saɪn', 'g'], guess: ['ɡɛs', 'u'],
      build: ['bɪld', 'u'], science: ['ˈsaɪəns', 'c'], receipt: ['rɪˈsit', 'p'], autumn: ['ˈɔtəm', 'n'], written: ['ˈrɪtən', 'w'] };
    for (const [w, [ipa, sil]] of Object.entries(cases)) expect(marks(w, ipa).silent, w).toBe(sil);
  });

  it('выпавшие слоги: Wednesday, chocolate, every, different, business', () => {
    expect(marks('wednesday', 'ˈwɛnzdeɪ').silent).toBe('de');
    expect(marks('chocolate', 'ˈtʃɑklət').silent).toBe('o');
    expect(marks('every', 'ˈɛvri').silent).toBe('e');
    expect(marks('different', 'ˈdɪfrənt').silent).toBe('e');
    expect(marks('business', 'ˈbɪznəs').silent).toBe('i');
  });

  it('ошибки старой ручной разметки не повторяются: please, sleep, work, weather, great — без немых', () => {
    for (const [w, ipa] of [['please', 'pliz'], ['sleep', 'slip'], ['work', 'wɝk'], ['weather', 'ˈwɛðɚ'], ['great', 'ɡreɪt'],
      ['thing', 'θɪŋ'], ['station', 'ˈsteɪʃən'], ['people', 'ˈpipəl'], ['laugh', 'læf'], ['enough', 'ɪˈnʌf']]) {
      expect(marks(w, ipa).silent, w).toBe('');
    }
  });

  it('конечная e после согласной не помечается (make, here, makes), а -ed с немой e — помечается (liked, played)', () => {
    expect(marks('make', 'meɪk').silent).toBe('');
    expect(marks('here', 'hɪr').silent).toBe('');
    expect(marks('makes', 'meɪks').silent).toBe('');
    expect(marks('liked', 'laɪkt').silent).toBe('e');
    expect(marks('played', 'pleɪd').silent).toBe('e');
    expect(marks('wanted', 'ˈwɑntɪd').silent).toBe('');
  });
});

describe('Ударный слог — по знаку ˈ в IPA, слоги как в словаре', () => {
  it('ударный слог в написании', () => {
    const cases = { water: ['ˈwɔtɚ', 'wa'], hotel: ['hoʊˈtɛl', 'tel'], banana: ['bəˈnænə', 'nan'], happy: ['ˈhæpi', 'hap'],
      tomorrow: ['təˈmɑroʊ', 'mor'], relaxed: ['rɪˈlækst', 'laxed'], flying: ['ˈflaɪɪŋ', 'fly'], quiet: ['ˈkwaɪət', 'qui'],
      question: ['ˈkwɛstʃən', 'ques'], listen: ['ˈlɪsən', 'lis'], apartment: ['əˈpɑrtmənt', 'part'], taxi: ['ˈtæksi', 'tax'] };
    for (const [w, [ipa, st]] of Object.entries(cases)) expect(marks(w, ipa).stress, w).toBe(st);
  });
  it('односложное и «одна гласная на письме» (our /ˈaʊɚ/) — без выделения', () => {
    expect(marks('cat', 'kæt').stress).toBe('');
    expect(marks('our', 'ˈaʊɚ').stress).toBe('');
  });
});

describe('Разметка токена: кавычки, сокращения, рендер', () => {
  it('индексы — в координатах токена: «Know, where\'s', () => {
    const p1 = { word: '«Know,', ipa: '/noʊ/' };
    WM.markWord(p1);
    expect(p1.silent).toEqual([1]);
    const p2 = { word: "Where's", ipa: '/wɛr/' };   // IPA основы — хвост 's не помечается немым
    WM.markWord(p2);
    expect(p2.silent.map((i) => "Where's"[i]).join('')).toBe('h');
  });
  it('рендер: stressAt выделяет буквы ударного слога, немые буквы внутри', () => {
    const html = globalThis.Annotate.renderParts([{ word: 'listen', ipa: '/ˈlɪsən/', pos: 'verb', stressAt: [0, 3], silent: [3] }]);
    expect(html).toContain('<span class="stress">lis</span><span class="silent-letter">t</span>en');
    expect(html).toContain('pos-verb');
  });
});

describe('Части речи — по словарю и соседним словам', () => {
  const tag = (s) => { const parts = s.split(/\s+/).map((word) => ({ word })); const t = WM.tagParts(parts); return Object.fromEntries(parts.map((p, i) => [p.word.replace(/[^A-Za-z']/g, '').toLowerCase(), t[i]])); };
  it('work, call, rain: глагол или существительное по контексту', () => {
    expect(tag('I work from home.').work).toBe('verb');
    expect(tag('I usually walk to work.')).toMatchObject({ to: 'prep', work: 'noun' });
    expect(tag('I want to work today.')).toMatchObject({ to: 'part', work: 'verb' });
    expect(tag('Call me later.').call).toBe('verb');
    expect(tag('Thanks for the call.').call).toBe('noun');
    expect(tag("It's going to rain.").rain).toBe('verb');
    expect(tag('It looks like rain.')).toMatchObject({ like: 'prep', rain: 'noun' });
  });
  it('be: связка — глагол, страдательный залог — aux (как в ручной грамматике автора)', () => {
    expect(tag('She is my sister.').is).toBe('verb');
    expect(tag('This bridge was built in 1900.')).toMatchObject({ was: 'aux', built: 'verb' });
    expect(tag('The film was really boring.').boring).toBe('adj');
    expect(tag('She is working today.').working).toBe('verb');
  });
  it('вопросы, имена, прилагательные', () => {
    expect(tag('Do you like coffee?')).toMatchObject({ do: 'aux', like: 'verb', coffee: 'noun' });
    expect(tag('I do my homework.').do).toBe('verb');
    expect(tag('Are you ready?').ready).toBe('adj');
    expect(tag('Jess drinks water all day.')).toMatchObject({ jess: 'noun', drinks: 'verb', water: 'noun' });
    expect(tag('Cold weather is coming.').cold).toBe('adj');
    expect(tag("Maggie's bag is red.")).toMatchObject({ "maggie's": 'noun', bag: 'noun', red: 'adj' });
  });
});

describe('Весь курс размечен', () => {
  const all = partsOf(ALL).flat().filter((p) => p && /[a-z]/i.test(p.word || ''));
  it('у каждого слова в примерах есть часть речи', () => {
    const bad = all.filter((p) => !p.pos).map((p) => p.word);
    expect(bad.slice(0, 10)).toEqual([]);
  });
  it('у многосложных слов есть ударный слог (кроме аббревиатур без выравнивания)', () => {
    const multi = all.filter((p) => /ˈ/.test(p.ipa || '') && (String(p.word).match(/[aeiouy]+/gi) || []).length >= 2);
    const missing = multi.filter((p) => !p.stressAt && (p.stress === undefined || p.stress === null));
    expect(missing.length / multi.length).toBeLessThan(0.01);
  });
  it('выравнивание букв и IPA не сходится меньше чем у 0,5% слов (это аббревиатуры: TV, Mr, ATM)', () => {
    const st = ctx.WORD_MARKS_STATS;
    expect(st.failed / st.words).toBeLessThan(0.005);
  });
  it('новые слова (раздел «Слова»): у целевого слова карточки часть речи из её поля pos', () => {
    const map = WM.RU_POS;
    const bad = [];
    ctx.WORD_CARDS.forEach((c) => {
      const first = map[String(c.payload.pos).split(/,\s*/)[0]];
      const allowed = String(c.payload.pos).split(/,\s*/).map((x) => map[x]);
      const front = c.payload.front.toLowerCase();
      if (/\s/.test(front)) return;
      // Целевое слово — одно из вхождений (в «What do you do?» первое do — вспомогательный)
      c.payload.examples.forEach((e) => {
        const hits = e.parts.filter((p) => WM.bareOf(p.word) === front);
        if (hits.length && !hits.some((p) => allowed.includes(p.pos))) bad.push(`${c.id} ${front}: ${hits.map((p) => p.pos)} (ждали ${first})`);
      });
    });
    expect(bad.slice(0, 10)).toEqual([]);
  });
  it('в примерах ученику не видны служебные {скобки} (minimal pairs)', () => {
    const bad = all.filter((p) => /[{}]/.test(p.word)).map((p) => p.word);
    expect(bad.slice(0, 5)).toEqual([]);
  });
  it('словарь частей речи pos_us.js покрывает слова курса (новые слова — scripts/fill_pos_us.mjs)', () => {
    const W = ctx.POS_US;
    const open = all.map((p) => WM.bareOf(p.word).replace(/'s$/, '')).filter((b) => b && !WM.CLOSED[b] && !WM.CTX_WORDS.includes(b));
    const covered = open.filter((b) => W[b]).length;
    expect(covered / open.length).toBeGreaterThan(0.97);
  });
});
