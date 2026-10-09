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
WM.markCourse();   // в приложении — перед сидированием (app.js, gamify.js)
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
  it('r, «съеденная» в CMU гласной ɚ/ɝ, остаётся в слоге: cor·rect, wor·ry, cur·rent; ɡj — начало слога: ar·gu·ment', () => {
    expect(marks('correct', 'kɚˈɛkt')).toEqual({ silent: '', stress: 'rect' });
    expect(marks('worry', 'ˈwɝi')).toEqual({ silent: '', stress: 'wor' });
    expect(marks('current', 'ˈkɝənt')).toEqual({ silent: '', stress: 'cur' });
    expect(marks('interesting', 'ˈɪntɚɛstɪŋ').stress).toBe('in');
    expect(marks('argument', 'ˈɑrɡjəmənt').stress).toBe('ar');
    expect(marks('regular', 'ˈrɛɡjəlɚ').stress).toBe('reg');
  });
  it('ручная IPA без ˈ (лексиконы content_*.js): слог из lex_us.js, иначе по номеру слога', () => {
    const at = (p) => { WM.markWord(p); return p.stressAt ? p.word.slice(...p.stressAt) : ''; };
    expect(at({ word: 'today.', ipa: '/tədeɪ/', stress: 1 })).toBe('day');
    expect(at({ word: 'family', ipa: '/fæməli/', stress: 0 })).toBe('fam');
    // неверный ручной номер (advice|0) уступает словарю: ad·VICE
    expect(at({ word: 'advice?', ipa: '/ədvaɪs/', stress: 0 })).toBe('vice');
    expect(at({ word: 'prediction', ipa: '/prɪdɪkʃən/', stress: 1 })).toBe('dic');
  });
  it('e перед n + гласной выпадает (evening /ˈivnɪŋ/), слоговой n остаётся без немой (listen, seven)', () => {
    expect(marks('evening', 'ˈivnɪŋ')).toEqual({ silent: 'e', stress: 'eve' });
    expect(marks('seven', 'ˈsɛvn')).toEqual({ silent: '', stress: 'sev' });
    expect(marks('listen', 'ˈlɪsn').silent).toBe('t');
  });
  it('буквы с диакритикой: café', () => {
    const p = { word: 'café', ipa: '/kæˈfeɪ/' };
    WM.markWord(p);
    expect(p.word.slice(...p.stressAt)).toBe('fé');
    expect(p.silent).toEqual([]);
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
  it("живая речь A1+: 'til, 'bout, fer — предлоги, brr и uh-uh — междометия, а не существительные", () => {
    expect(tag("Wait 'til Friday.")["'til"]).toBe('prep');
    expect(tag("Let's talk 'bout it.")["'bout"]).toBe('prep');
    expect(tag("What's fer dinner?").fer).toBe('prep');
    expect(tag("Call 'em later.")["'em"]).toBe('pron');
    expect(tag('Brr, so cold.').brr).toBe('adv');
    expect(tag('Uh-uh, not this one.').uhuh).toBe('adv');
  });
  it('Go wash up! — go глагол; Is the TV plugged in? — страдательный, is вспомогательный', () => {
    expect(tag("Go wash up, dinner's ready!").go).toBe('verb');
    expect(tag('Is the TV plugged in?')).toMatchObject({ is: 'aux', plugged: 'verb' });
    expect(tag('Is the store open?').is).toBe('verb');
    expect(tag('Is your sister tired?').is).toBe('verb');
  });
  it('неправильный глагол: метка у всех форм сказуемого (take, took, taken, takes), американские формы', () => {
    const irr = (sentence) => { const parts = sentence.split(/\s+/).map((word) => ({ word })); WM.markParts(parts);
      return Object.fromEntries(parts.map((p) => [p.word.replace(/[^A-Za-z']/g, '').toLowerCase(), !!p.irr])); };
    expect(irr('He came in and took off his jacket.')).toMatchObject({ came: true, took: true, jacket: false, in: false });
    expect(irr("I've never eaten sushi.")).toMatchObject({ eaten: true });
    expect(irr('We worked and played all day.')).toMatchObject({ worked: false, played: false });   // правильные
    expect(irr("Let's go! We're late.")).toMatchObject({ "let's": false, "we're": false, go: true });
    expect(irr('She is tired and was late.')).toMatchObject({ is: false, was: true });             // am/is/are — не метим
    expect(irr('Did you go home?')).toMatchObject({ did: false, go: true });                        // did — вспомогательный
    expect(irr('Turn left at the light.')).toMatchObject({ left: false });                          // направление, не leave
    expect(WM.irregularOf('gotten')).toEqual({ base: 'get', past: 'got', pp: 'gotten' });
    expect(WM.irregularOf('running')).toMatchObject({ base: 'run' });
    expect(WM.irregularOf('worked')).toBeNull();
  });
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
  it('вопрос с do/модальным: глагол после подлежащего; do после модального и подлежащего — смысловой', () => {
    expect(tag('What does this word mean?')).toMatchObject({ does: 'aux', word: 'noun', mean: 'verb' });
    expect(tag('Does your brother like jazz?')).toMatchObject({ does: 'aux', like: 'verb' });
    expect(tag('Did you do it?')).toMatchObject({ did: 'aux', do: 'verb' });
    expect(tag("Let's do this again sometime soon.")).toMatchObject({ do: 'verb', sometime: 'adv' });
    expect(tag("I'll text you the address.").text).toBe('verb');
  });
  it("'s после существительного — is: Dinner's ready; притяжательное — Maggie's bag", () => {
    expect(tag("Come down, dinner's ready.").ready).toBe('adj');
    expect(tag("Everything's 30% off.")["everything's"]).toBe('pron');
    expect(tag("Don't pull the cat's tail.").tail).toBe('noun');
  });
  it('частица фразового глагола — наречие; on/in перед дополнением у непереходных — предлог', () => {
    expect(tag('A new team will take over the project.').over).toBe('adv');
    expect(tag('Turn on the light, please.').on).toBe('adv');
    expect(tag('Turn the light on.').on).toBe('adv');
    expect(tag("What's going on here?").on).toBe('adv');
    expect(tag('Go on a trip.').on).toBe('prep');
    expect(tag('We looked at the map.').at).toBe('prep');
  });
  it('конец именной группы, страдательный с by, that-союз и that-местоимение', () => {
    expect(tag('He wore a wool vest.').vest).toBe('noun');
    expect(tag("Don't let the dog sleep.").sleep).toBe('verb');
    expect(tag('The family was torn apart by the quarrel.')).toMatchObject({ was: 'aux', torn: 'verb', apart: 'adv' });
    expect(tag('We were surprised by the news.')).toMatchObject({ were: 'verb', surprised: 'adj' });
    expect(tag('She pointed out that we were late.').that).toBe('conj');
    expect(tag('Small changes beat any diet that you abandon.').that).toBe('pron');
    expect(tag("It's late — go to bed!").go).toBe('verb');
    expect(tag('Wait a second.').second).toBe('noun');
    expect(tag('The second day was fun.').second).toBe('num');
  });
  it('словарь LEX файла контента (одна часть речи на слово) — подсказка, решает контекст; ручная грамматика — закон', () => {
    const lexParts = () => [{ word: 'I', pos: 'pron' }, { word: 'have', pos: 'aux' }, { word: 'an', pos: 'art' }, { word: 'idea!', pos: 'noun' }];
    expect(WM.markParts(lexParts(), true).map((p) => p.pos)).toEqual(['pron', 'verb', 'art', 'noun']);
    expect(WM.markParts(lexParts()).map((p) => p.pos)).toEqual(['pron', 'aux', 'art', 'noun']);
    // в курсе: «I have an idea» в коллокациях — глагол (красный), а не вспомогательный (серый)
    const cl = ctx.COLLOCATION_CARDS.flatMap((c) => c.payload.examples).find((e) => /^Wait — I have an idea!/.test(e.text));
    expect(cl.parts.find((p) => p.word === 'have').pos).toBe('verb');
  });
  it('по замечаниям ревизоров: повелительное do, first, home, what + сущ., вопрос с that, междометия, go + глагол', () => {
    expect(tag('Do your homework!').do).toBe('verb');
    expect(tag('Do you like it?').do).toBe('aux');
    expect(tag('Do you have any questions').do).toBe('aux');
    expect(tag('Do it now — are you ready?').do).toBe('verb');
    expect(tag('Could I see the room first?').first).toBe('adv');
    expect(tag('The first day was fun.').first).toBe('num');
    expect(tag('I stay home on Sundays.').home).toBe('adv');
    expect(tag('What time is it?').what).toBe('det');
    expect(tag('What do you want?').what).toBe('pron');
    expect(tag('Is that okay now?').okay).toBe('adj');
    expect(tag('Sorry, I was on mute.').sorry).toBe('adv');
    expect(tag("I'm sorry.").sorry).toBe('adj');
    expect(tag("Go knock 'em dead!")).toMatchObject({ knock: 'verb', dead: 'adj' });
    expect(tag('I called, but no one answered.').no).toBe('det');
    expect(tag('Listen and repeat: this, that, mother.')).toMatchObject({ repeat: 'verb', that: 'pron', mother: 'noun' });
    expect(tag('Yes — the X2 removes that fear completely.')).toMatchObject({ x: 'noun', removes: 'verb', that: 'det', fear: 'noun' });
    expect(tag('For everyone in between, this is it.').between).toBe('adv');
    expect(tag('We are in between jobs.').between).toBe('prep');
    expect(tag("Wear a hat, it's freezing out there.").freezing).toBe('adj');
    expect(tag('Let me get this one.').this).toBe('det');
  });
  it('в примерах карточки фразового глагола его частица — наречие (stand by you, stood by his friend)', () => {
    const all = [...ctx.PHRASAL_CARDS, ...Object.values(ctx.PRO_CONTENT).flat()];
    const card = all.find((c) => c.payload && c.payload.front === 'stand by');
    expect(card).toBeTruthy();
    const bys = card.payload.examples.flatMap((e) => e.parts.filter((p) => WM.bareOf(p.word) === 'by'));
    expect(bys.length).toBeGreaterThan(0);
    expect(bys.map((p) => p.pos)).toEqual(bys.map(() => 'adv'));
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
  it('у многосложных слов есть ударный слог — и при ручной IPA без ˈ (кроме аббревиатур без выравнивания)', () => {
    const multi = all.filter((p) => p.ipa && WM.phonemes(p.ipa).filter((t) => t.v).length >= 2 &&
      (/ˈ/.test(p.ipa) || Number.isInteger(p.stress)) && (String(p.word).match(/[aeiouy]+/gi) || []).length >= 2);
    const missing = multi.filter((p) => !p.stressAt);
    expect(multi.length).toBeGreaterThan(7000);
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
  it('курс размечается перед каждым сидированием в IndexedDB (app.js, gamify.js), а не при каждой загрузке', () => {
    const src = { app: fs.readFileSync('js/app.js', 'utf8'), gamify: fs.readFileSync('js/gamify.js', 'utf8') };
    for (const [file, fn, call] of [['app', 'async function seedJobs(', 'await markCourseOnce()'], ['app', 'async function checkAndSeedContent(', 'await markCourseOnce()'],
      ['gamify', 'async function seedPro(', 'WordMarks.markCourse()']]) {
      const s = src[file], i = s.indexOf(fn), body = s.slice(i, s.indexOf('\n  }\n', i));
      expect(i, fn).toBeGreaterThan(-1);
      expect(body.indexOf(call), fn).toBeGreaterThan(-1);
      expect(body.indexOf(call), fn).toBeLessThan(body.indexOf('seedContent('));
    }
    expect(src.app).toMatch(/async function markCourseOnce\(\) \{[\s\S]*?setTimeout[\s\S]*?try \{ WordMarks\.markCourse\(\); \} catch/);
    const c2 = { console: { log() {}, warn() {}, error() {} } };
    c2.window = c2;
    vm.createContext(c2);
    vm.runInContext(FILES.map((f) => fs.readFileSync(path.resolve(process.cwd(), 'js', f + '.js'), 'utf8')).join('\n;\n'), c2);
    expect(c2.WORD_MARKS_STATS).toBeUndefined();
    expect(c2.WORD_CARDS[0].payload.examples[0].parts.some((p) => p.stressAt)).toBe(false);
  });
  it('в примерах ученику не видны служебные {скобки} (minimal pairs)', () => {
    const bad = all.filter((p) => /[{}]/.test(p.word)).map((p) => p.word);
    expect(bad.slice(0, 5)).toEqual([]);
  });
  it('словарь частей речи pos_us.js покрывает слова курса (новые слова — scripts/fill_pos_us.mjs)', () => {
    const W = ctx.POS_US;
    // Имена героев и мест (Tony, Brooklyn) — существительные по заглавной букве (isName в word_marks.js), словарь им не нужен:
    // в знаменатель не входят слова, которые встречаются с заглавной посреди предложения и ни разу — со строчной
    const midCap = new Set(), lowerSeen = new Set();
    partsOf(ALL).forEach((ps) => ps.forEach((p, i) => {
      const b = WM.bareOf(p.word).replace(/'s$/, '');
      const first = i === 0 || /[.!?:;»"”)—]$/.test(String(ps[i - 1].word || ''));
      if (/^[«"“(]?[A-Z]/.test(p.word)) { if (!first) midCap.add(b); } else lowerSeen.add(b);
    }));
    const names = new Set([...midCap].filter((b) => !lowerSeen.has(b)));
    const open = all.map((p) => WM.bareOf(p.word).replace(/'s$/, '')).filter((b) => b && !WM.CLOSED[b] && !WM.CTX_WORDS.includes(b) && !names.has(b));
    const covered = open.filter((b) => W[b]).length;
    expect(covered / open.length).toBeGreaterThan(0.97);
  });
});
