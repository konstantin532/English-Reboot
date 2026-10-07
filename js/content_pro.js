/* ==========================================================================
   English Reboot — PRO: контент B2+
   Файл: content_pro.js — 12 грамматик (g056–g067), 50 фразовых (pv_159–208),
   50 коллокаций (col_158–207), 30 идиом (id_109–138), 20 minimal pairs
   (mp_054–073), 6 чтений B2 с cloze (rd_018–023).
   errorPatterns генерируются фабриками автоматически.
   ========================================================================== */
(() => {
'use strict';

/* ---------- Мини-лексикон B2 (ipa|pos|stress|silent|surprise) ---------- */
const POS2 = { n:'noun',v:'verb',a:'adj',d:'adv',p:'prep',pr:'pron',c:'conj',r:'art',t:'det',u:'num',x:'aux',m:'modal',q:'part' };
const LEX = {
a:'ə|r',an:'ən|r',the:'ðə|r',and:'ənd|c',or:'ɔr|c',but:'bʌt|c',if:'ɪf|c',so:'soʊ|d',because:'bɪˈkɑz|c|1',when:'wɛn|c',while:'waɪl|c',
I:'aɪ|pr',you:'ju|pr',he:'hi|pr',she:'ʃi|pr',it:'ɪt|pr',we:'wi|pr',they:'ðeɪ|pr',me:'mi|pr',him:'hɪm|pr',her:'hɝ|pr',them:'ðɛm|pr',
my:'maɪ|pr',your:'jɔr|pr',his:'hɪz|pr',their:'ðɛr|pr',this:'ðɪs|t',that:'ðæt|t',these:'ðiz|t',those:'ðoʊz|t',
to:'tə|q',of:'əv|p',in:'ɪn|p',on:'ɑn|p',at:'ət|p',for:'fɚ|p',with:'wɪð|p',from:'frʌm|p',by:'baɪ|p',about:'əˈbaʊt|p|1',into:'ɪntə|p',over:'ˈoʊvɚ|p|0',under:'ˈʌndɚ|p|0',down:'daʊn|d',up:'ʌp|d',out:'aʊt|d',off:'ɔf|d',
is:'ɪz|x',are:'ɑr|x',was:'wɑz|x',were:'wɝ|x',be:'bi|v',been:'bɪn|v',do:'də|x',does:'dʌz|x',did:'dɪd|x',have:'hæv|x',has:'hæz|x',had:'hæd|x',will:'wɪl|m',would:'wʊd|m',can:'kæn|m',could:'kʊd|m',should:'ʃʊd|m',must:'mʌst|m',
not:'nɑt|d',no:'noʊ|d',never:'ˈnɛvɚ|d|0',only:'ˈoʊnli|d|0',just:'dʒʌst|d',very:'ˈvɛri|d|0',more:'mɔr|d',most:'moʊst|d|0',also:'ˈɔlsoʊ|d|0',still:'stɪl|d',even:'ˈivɪn|d|0',
now:'naʊ|d',then:'ðɛn|d',here:'hir|d',there:'ðɛr|d',when2:'wen|d',where:'wɛr|d',how:'haʊ|d',what:'wʌt|pr|0|1',who:'hu|pr|0|1',whose:'huz|pr|0|1',which:'wɪtʃ|pr',
one:'wʌn|u|0|2',two:'tu|u|0|0',ten:'tɛn|u',
work:'wɝk|v|0|1',works:'wɝks|v|0|1',worked:'wɝkt|v|0|1',working:'ˈwɝkɪŋ|v|0|1',
arrive:'əˈraɪv|v|1',arrived:'əˈraɪvd|v|1',late:'leɪt|a',forgot:'fɚˈɡɑt|v|1',gift:'ɡɪft|n',see:'si|v',seen:'sin|v',such:'sʌtʃ|a',beauty:'ˈbjuti|n|0',
broke:'broʊk|v',window:'ˈwɪndoʊ|n|0',need:'nid|v',rest:'rɛst|n',think:'θɪŋk|v',apologize:'əˈpɑlədʒaɪz|v|2',hard:'hɑrd|a',told:'toʊld|v',meeting:'ˈmitɪŋ|n|0',
studied:'ˈstʌdid|v|0',harder:'ˈhɑrdɚ|a|0',taller:'ˈtɔlɚ|a|0',stop:'stɑp|v',talking:'ˈtɔkɪŋ|v|0',time:'taɪm|n',went:'wɛnt|v',home:'hoʊm|n',smoke:'smoʊk|v|0|2',here2:'hɪə|d',
year:'jɪr|n',decade:'ˈdɛkeɪd|n|0',waiting:'ˈweɪtɪŋ|v|0',finished:'ˈfɪnɪʃt|v|0',homework:'ˈhoʊmwɝk|n|0|1',went2:'went|v',knowing:'ˈnoʊɪŋ|v|0',answer:'ˈænsɚ|n|0|2',stayed:'steɪd|v',silent:'ˈsaɪlənt|a|0',
car:'kɑr|n',repaired:'rɪˈpɛrd|v|1',hair:'hɛr|n',cut:'kʌt|v',stolen:'ˈstoʊlən|v|0',neighbor:'ˈneɪbɚ|n|0',book:'bʊk|n',read:'rɛd|v',excellent:'ˈɛksələnt|a|0',
hill:'hɪl|n',walked:'wɔkt|v|0|3',small:'smɔl|a',boy:'bɔɪ|n',table:'ˈteɪbəl|n|0',letter:'ˈlɛtɚ|n|0',
nice:'naɪs|a',day:'deɪ|n',isnt:'ˈɪznt|x',want:'wɑnt|v',coffee:'ˈkɑfi|n|0',
medicine:'ˈmɛdsn|n|0',doctor:'ˈdɑktɚ|n|0',careful:'ˈkɛrfəl|a|0',lost:'lɔst|v',keys:'kiz|n',
issue:'ˈɪʃu|n|0',problem:'ˈprɑbləm|n|0',boils:'bɔɪlz|v',essence:'ˈɛsns|n|0',
brush:'brʌʃ|v',spanish:'ˈspænɪʃ|a|0',before:'bɪˈfɔr|p|1',exam:'ɪɡˈzæm|n|1',
clam:'klæm|n',up2:'ʌp|d',questions:'ˈkwɛstʃənz|n|0|45',down2:'daʊn|d',flu:'flu|n',
dawned:'dɔnd|v|0',suddenly:'ˈsʌdnli|d|0',understood:'ˌʌndəˈstʊd|v|2',finally:'ˈfaɪnəli|d|0',
budget:'ˈbʌdʒɪt|n|0',hours:'aʊrz|n',detail:'ˈditeɪl|n|0',led:'lɛd|v',team:'tim|n',
argued:'ˈɑːɡjuːd|v|0',negotiated:'nɪˈɡoʊʃieɪtɪd|v|2',deal:'dil|n',must2:'mʌst|m',focus:'ˈfoʊkəs|v|0',exam2:'ɪɡˈzæm|n|1',less:'lɛs|d',
laid:'leɪd|v',workers:'ˈwɝkɚz|n|0',nobody:'ˈnoʊbədi|pr|0',knew:'nu|v',secret:'ˈsiːkrət|n|0',
kids:'kɪdz|n',babies:'ˈbeɪbiz|n|0',around:'əˈraʊnd|d|1',talked:'tɔːkt|v|0|3',
budding:'ˈbʌdɪŋ|a|0',nipped:'nɪpt|v',bud:'bʌd|n',scam:'skæm|n',sold:'soʊld|v',fake:'feɪk|a',
interest:'ˈɪntrəst|n|0',petered:'ˈpitɚd|v|0',energy:'ˈɛnɚdʒi|n|0',quiet:'ˈkwaɪət|a|0',shouted:'ˈʃaʊtɪd|v|0',
point:'pɔɪnt|v',spoke:'spoʊk|v',injustice:'ɪnˈdʒʌstɪs|n|1',
kids2:'kɪdz|n',excuses:'ɪkˈskjuːsɪz|n|1',spent:'spɛnt|v',evening:'ˈivnɪŋ|n|0',contract:'ˈkɑntrækt|n|0',
boils2:'bɔɪlz|v',one2:'wʌn|u|0|2',thing:'θɪŋ|n|0|23',reads:'ridz|v',reports:'rɪˈpɔrts|n|1',slowly:'ˈsloʊli|d|0',
forced:'fɔːst|v',smile:'smaɪl|n|0',sold2:'səʊld|v',fake2:'feɪk|a',watch:'wɑtʃ|v',still2:'stɪl|d',
new:'nu|a',study:'ˈstʌdi|n|0',shows:'ʃəʊz|v',habit:'ˈhæbɪt|n|0',strong:'strɔŋ|a',grow:'ɡroʊ|v',grew:'ɡru|v',grown:'ɡrəʊn|v',tiny:'ˈtaɪni|a|0',trillion:'ˈtrɪljən|n|1',live:'laɪv|v',gut:'ɡʌt|n',scientists:'ˈsaɪəntɪsts|n|0|45',call:'kɔl|v',second:'ˈsɛkənd|n|0|1',brain:'breɪn|n',research:'riˈsɝtʃ|n|1|2',suggests:'səˈdʒɛsts|v|1',bacteria:'bækˈtɪriə|n|1',affect:'əˈfɛkt|v|1',mood:'mud|n',sleep:'slip|v|0|2',food:'fud|n',choices:'ˈtʃɔɪsɪz|n|0',say:'seɪ|v',authors:'ˈɔːθəz|n|0',field:'fild|n',young:'jʌŋ|a',promising:'ˈprɒmɪsɪŋ|a|0',
procrastinate:'prəʊˈkræstɪneɪt|v|2',procrastination:'prəkræstəˈneɪʃən|n|2',putting:'ˈpʊtɪŋ|v|0',off2:'ɒf|d',isnt2:'ˈɪznt|x',laziness:'ˈleɪzinəs|n|0',emotion:'ɪˈmoʊʃən|n|1',management:'ˈmænɪdʒmənt|n|0|2',task:'tæsk|n',unpleasant:'ʌnˈplɛznt|a|1',brain2:'breɪn|n',reacts:'riˈækts|v|1',threat:'θrɛt|n',deadline:'ˈdɛdlaɪn|n|0',looming:'ˈlumɪŋ|a|0',trick:'trɪk|v',kind:'kaɪnd|n|0|23',yourself:'jɔrˈsɛlf|pr|1',forgive:'fɚˈɡɪv|v|1',start2:'stɑːt|v',
remote:'rɪˈmoʊt|a|1',used:'juzd|v',office:'ˈɔfɪs|n|0',commute:'kəˈmjuːt|v|1',freedom:'ˈfridəm|n|0',price2:'praɪs|n',loneliness:'ˈloʊnlinəs|n|0',burnout:'ˈbɜːnaʊt|n|0',companies:'ˈkʌmpəniz|n|0',hybrid:'ˈhaɪbrɪd|a|0',models:'ˈmɒdlz|n|0|1',argue:'ˈɑːɡjuː|v|0',balance:'ˈbæləns|n|0|0',between:'bɪˈtwin|p|1',flexibility:'ˌflɛksəˈbɪləti|n|2',structure:'ˈstrʌktʃə|n|0',
review:'riˈvju|n|1',light:'laɪt|a',compact:'ˈkɑmpækt|a|0',battery:'ˈbætri|n|0',lasts:'læsts|v',days:'deɪz|n',screen:'skrin|n',bright:'braɪt|a',enough:'ɪˈnʌf|d|1|1',downsides:'ˈdaʊnsaɪdz|n|0',price3:'praɪs|n',steep:'stiːp|a',overall:'ˌəʊvərˈɔːl|d|2',solid:'ˈsɒlɪd|a',choice2:'tʃɔɪs|n',
rented:'ˈrɛntɪd|v',flat:'flæt|n',landlord:'ˈlændlɔrd|n|0',agrees:'əˈɡriːz|v|1',pay:'peɪ|v',month:'mʌnθ|n',deposit:'dəˈpɑzɪt|n|1',returned:'rɪˈtɜːnd|v|1',condition:'kənˈdɪʃən|n|1|1',written:'ˈrɪtn|a|0',notice:'ˈnoʊtɪs|n|0',before2:'bɪˈfɔː|p|1',leaving:'ˈliːvɪŋ|v|0',tenant:'ˈtɛnənt|n|0',responsible:'riˈspɑnsəbəl|a|1',damage:'ˈdæmɪdʒ|n|0',caused:'kɔːzd|v',
level:'ˈlɛvl|n|0',height:'haɪt|n',stress:'strɛs|n',syllable:'ˈsɪləbl|n|0',long2:'lɒŋ|a',short2:'ʃɔːt|a',vowel:'ˈvaʊəl|n|0',sound:'saʊnd|n|0',lips:'lɪps|n',rounded:'ˈraʊndɪd|a|0',relaxed:'rɪˈlækst|v|1',tongue:'tʌŋ|n|0|23',central:'ˈsɛntrəl|a|0',careful2:'ˈkeəfl|a|0',difference:'ˈdɪfrəns|n|0|1',
result:'rɪˈzʌlt|n|1|1',study2:'ˈstʌdi|v|0',sleep2:'sliːp|n|0|2',memory:'ˈmɛməri|n|0',immune:'ɪˈmjun|a|1',system:'ˈsɪstəm|n|0|1',adults:'ˈædʌlts|n|0',need2:'niːd|v',seven:'ˈsɛvn|u|0',nine:'naɪn|u|0',hours2:'ˈaʊəz|n',less2:'les|d',than:'ðæn|c',risk2:'rɪsk|n',heart:'hɑrt|n|0|2',disease:'dɪˈziz|n|1',found:'faʊnd|v',weight:'weɪt|n',gain:'ɡeɪn|n|0',hormones:'ˈhɔrmoʊnz|n|0|1',appetite:'ˈæpɪtaɪt|n|0',grow2:'ɡrəʊ|v'
};

const POS_MAP = { n:'noun',v:'verb',a:'adj',d:'adv',p:'prep',pr:'pron',c:'conj',r:'art',t:'det',u:'num',x:'aux',m:'modal',q:'part' };
const idxOf = (id) => Number(String(id).replace(/\D/g, '')) || 0;
const rotate = (pool, k) => pool.length ? pool.map((_, i) => pool[(i + k) % pool.length]) : pool;

function partsOf(text) {
  return String(text).split(/\s+/).filter(Boolean).map((tok) => {
    const bare = tok.toLowerCase().replace(/[^a-z']/g, '').replace(/'s$/, '');
    const r = LEX[bare];
    const rec = r ? r.split('|') : null;
    const p = {
      word: tok,
      pos: rec ? (POS_MAP[rec[1]] || '') : '',
      ipa: rec ? '/' + rec[0] + '/' : '',
      silent: rec && rec[3] ? rec[3].split('').map(Number) : [],
      surprise: rec && rec[4] ? rec[4].split('').map(Number) : [],
    };
    if (rec && rec[2]) p.stress = Number(rec[2]);
    return p;
  });
}

function mix(correct, distr, k) {
  const uniq = [...new Set(distr.filter((d) => d && d !== correct))].slice(0, 3);
  const pos = Math.min(((k % 4) + 4) % 4, uniq.length);
  uniq.splice(pos, 0, correct);
  return { q: '', options: uniq, correct: pos };
}
function manualTest(str) {
  const p = str.split('|');
  return { q: p[0].replace('_', '___'), options: p.slice(1, 5), correct: Number(p[5]) };
}
function gapTest(target, cleanText, distr, k) {
  if (!target || !cleanText || !cleanText.includes(target)) return null;
  return Object.assign(mix(target, distr, k), { q: cleanText.replace(target, '___') });
}

/* ---------- Фабрики ---------- */

// Грамматика B2
let _g = 55; // после g001–g055
function G2(title, formula, explanation, exs, errs, tests) {
  const id = 'g' + String(++_g).padStart(3, '0');
  const k = idxOf(id);
  const examples = exs.map((raw) => {
    const clean = raw.replace(/[{}]/g, '');
    return { text: clean, parts: partsOf(clean), connected: '' };
  });
  const targets = exs.map((raw) => { const m = raw.match(/\{([^}]+)\}/); return m ? m[1] : null; });
  const marked = targets.map((t, i) => ({ t, i })).filter((m) => m.t && examples[m.i].text.includes(m.t));
  const testsArr = [];
  if (marked.length) {
    testsArr.push(gapTest(marked[0].t, examples[marked[0].i].text,
      [marked[0].t.split(' ')[0], 'буду делать по-другому', marked[0].t.split(' ').slice(-1)[0]], k));
  }
  // Защита: тесты приходят строками 'q|o|o|o|o|i'; массив/мусор — warn и пропуск
  tests.forEach((s) => {
    if (Array.isArray(s)) s = s.join('|');
    if (typeof s === 'string') testsArr.push(manualTest(s));
    else console.warn('G2 ' + id + ': тест не строка — пропущен', s);
  });
  while (testsArr.length < 5) {
    testsArr.push(Object.assign(
      mix(targets[0] || title, ['вариант A', 'вариант B'], k + testsArr.length),
      { q: 'Выберите корректную конструкцию: ' + title.toLowerCase() }));
  }
  return { id, type: 'grammar', level: 'B2', tags: ['B2', 'конструкции'], audio: true,
    payload: { title, formula, explanation, examples,
      errors: errs.map(([w, c, n]) => ({ wrong: w, correct: c, note: n })),
      test: testsArr.slice(0, 5),
      errorPatterns: [
        { trigger: 'hardly I had', explanation: 'После отрицательной инверсии идёт вспомогательный глагол, потом подлежащее: Hardly HAD I sat down.', hint: 'Инверсия: наречие → вспомогательный → подлежащее' },
        { trigger: 'if I would have', explanation: 'В условной части нельзя would. If I HAD studied — Past Perfect.', hint: 'if + Past Perfect, без would' },
      ] } };
}

// Фразовый глагол B2
const PV_POOL = [];
let _pv = 158; // после pv_001–158
function P2(front, tr, exs, mt, hintWord) {
  const id = 'pv_' + String(++_pv).padStart(3, '0');
  const k = idxOf(id);
  const targets = [];
  const examples = exs.map((raw) => {
    const m = raw.match(/\{([^}]+)\}/);
    targets.push(m ? m[1] : null);
    const clean = raw.replace(/[{}]/g, '');
    return { text: clean, parts: partsOf(clean), connected: '' };
  });
  const marked = targets.map((t, i) => ({ t, i })).filter((m) => m.t && examples[m.i].text.includes(m.t));
  const tests = [];
  if (marked.length) {
    const t = marked[0].t;
    tests.push(gapTest(t, examples[marked[0].i].text,
      [t.split(' ')[0], t.split(' ').slice(1).join(' ') + ' ' + t.split(' ')[0], front], k));
  }
  // Защита: массив ['q','o|o|o|o|i'] склеивается; мусор — warn и пропуск
  if (Array.isArray(mt)) mt = mt.join('|');
  if (typeof mt === 'string') tests.push(manualTest(mt));
  else console.warn('P2 ' + id + ': manualTest не строка', mt);
  while (tests.length < 5) {
    tests.push(Object.assign(
      mix(front, PV_POOL.filter((x) => x !== front).slice(k % 40, (k % 40) + 3), k + tests.length * 2),
      { q: 'Выберите фразовый глагол со значением «' + tr + '»' }));
  }
  PV_POOL.push(front);
  const verb = front.split(' ')[0];
  const particle = front.split(' ').slice(1).join(' ');
  return { id, type: 'phrasal', level: 'B2', tags: ['B2'], audio: true,
    payload: { front, translation: tr, examples, test: tests.slice(0, 5),
      errorPatterns: [
        { trigger: verb + ' ' + front.split(' ').slice(1).reverse().join(' '),
          explanation: 'Частица «' + particle + '» стоит сразу после глагола: «' + front + '» = ' + tr + '.',
          hint: hintWord || ('Порядок: ' + verb + ' + ' + particle) },
        { trigger: verb,
          explanation: 'Глагол «' + verb + '» без частицы имеет другое значение. Фразовый глагол целиком: «' + front + '».',
          hint: 'Частица «' + particle + '» обязательна' },
      ] } };
}

// Коллокация B2
const CL_POOL = [];
let _cl = 157;
function C2(front, tr, exs, mt) {
  const id = 'col_' + String(++_cl).padStart(3, '0');
  const k = idxOf(id);
  const targets = [];
  const examples = exs.map((raw) => {
    const m = raw.match(/\{([^}]+)\}/);
    targets.push(m ? m[1] : null);
    const clean = raw.replace(/[{}]/g, '');
    return { text: clean, parts: partsOf(clean), connected: '' };
  });
  const marked = targets.map((t, i) => ({ t, i })).filter((m) => m.t && examples[m.i].text.includes(m.t));
  const first = front.split(' ')[0];
  const SUBS = { pose:['make','do','take'], draw:['make','do','pull'], conduct:['make','do','hold'],
    reach:['make','get','arrive'], address:['solve fast','talk','touch'], highlight:['light','show up','raise up'],
    undergo:['go under','take','make'], impose:['put on','force to','apply on'], alleviate:['light','easy','soft'],
    exacerbate:['exaggerate','expand','angry'], mitigate:['soft','light','slow'], facilitate:['facility','make easy fast','do'],
    yield:['give up','produce','take'], compile:['collect','write','gather up'], formulate:['form','do','make up'],
    refute:['refuse','reject up','deny of'], corroborate:['corporate','collect','confirm twice'],
    stipulate:['stiff','stay','install'], advocate:['add voice','go to','speak up for'],
    scrutinize:['screw','look once','cut'], attribute:['contribute','give to','thank to'],
    derive:['drive','come from drive','take off'], comprise:['compromise','compose of','include of'],
    encompass:['encounter','compass','circle of'], constitute:['constitute up','construct','consist in'],
    bear:['born','carry on','take'], exceed:['accept','go out','pass over'], strike:['hit on','go on','make up'],
    bridge:['build','connect up','hold'], gain:['get up','win over','grow up'], streamline:['make line','clean line','straight'],
    leverage:['level','lift up','lever to'], foster:['foster up','feed','grow fast'],
    maximize:['make max','grow to','raise up'], minimize:['make min','lower to','cut off'],
    optimize:['option','make optimal fast','use up'], implement:['imply','supply','apply on'],
    evaluate:['evacuate','value out','estimate over'], assess:['access','guess','assign'],
    negotiate:['neglect','talk over deal','move'], secure:['sure','make sure of','lock up'],
    allocate:['locate','allow to','allot up'], monitor:['money','look at screen','watch once'],
    identify:['identity','make same','point at'], capitalize:['capital city','make capital','take head'],
    sustain:['support','keep up','stand under'] };
  const subs = SUBS[first] || ['do', 'take', 'have'];
  const patterns = subs.slice(0, 2).map((s) => ({
    trigger: front.replace(first, s),
    explanation: 'Устойчивое сочетание — «' + front + '» = ' + tr + '. Вариант «' + front.replace(first, s) + '» не существует.',
    hint: 'Запомните связку: ' + first + ' + ' + front.split(' ').slice(1).join(' '),
  }));
  const tests = [];
  if (marked.length) {
    const t = marked[0].t;
    const tf = t.split(' ')[0];
    tests.push(gapTest(t, examples[marked[0].i].text, subs.map((s) => t.replace(tf, s)), k));
  }
  // Защита: склейка массива, warn на мусор
  if (Array.isArray(mt)) mt = mt.join('|');
  if (typeof mt === 'string') tests.push(manualTest(mt));
  else console.warn('C2 ' + id + ': manualTest не строка', mt);
  while (tests.length < 5) {
    tests.push(Object.assign(
      mix(front, rotate(CL_POOL.filter((x) => x !== front), k).slice(0, 3), k + tests.length * 2),
      { q: 'Выберите корректную коллокацию со значением «' + tr + '»' }));
  }
  CL_POOL.push(front);
  return { id, type: 'collocation', level: 'B2', tags: ['B2'], audio: true,
    payload: { front, translation: tr, category: 'B2 academic/business', examples,
      test: tests.slice(0, 5), errorPatterns: patterns } };
}

// Идиома B2/C1
const ID_POOL = [];
let _id = 108;
function I2(front, tr, context, exs, mt) {
  const id = 'id_' + String(++_id).padStart(3, '0');
  const k = idxOf(id);
  const targets = [];
  const examples = exs.map((raw) => {
    const m = raw.match(/\{([^}]+)\}/);
    targets.push(m ? m[1] : null);
    const clean = raw.replace(/[{}]/g, '');
    return { text: clean, parts: partsOf(clean), connected: '' };
  });
  const marked = targets.map((t, i) => ({ t, i })).filter((m) => m.t && examples[m.i].text.includes(m.t));
  const w = front.split(' ');
  const distr = [w.slice(0, -1).join(' '), w[w.length - 1] + ' ' + w.slice(0, -1).join(' ')];
  const tests = [];
  if (marked.length) tests.push(gapTest(marked[0].t, examples[marked[0].i].text, distr, k));
  if (marked.length > 1) tests.push(gapTest(marked[1].t, examples[marked[1].i].text, distr, k + 2));
  // Защита: склейка массива, warn на мусор
  if (Array.isArray(mt)) mt = mt.join('|');
  if (typeof mt === 'string') tests.push(manualTest(mt));
  else console.warn('I2 ' + id + ': manualTest не строка', mt);
  tests.push(Object.assign(mix(tr, rotate(ID_POOL.filter((x) => x !== tr), k).slice(0, 3), k + 4),
    { q: 'Что означает «' + front + '»?' }));
  while (tests.length < 5) {
    tests.push(Object.assign(
      mix(front, rotate(ID_POOL.filter((x) => x !== tr), k).slice(0, 3), k + tests.length),
      { q: 'Выберите идиому со значением «' + tr + '»' }));
  }
  ID_POOL.push(tr);
  return { id, type: 'idiom', level: 'B2', tags: ['B2', 'идиома'], audio: true,
    payload: { front, translation: tr, context, examples, test: tests.slice(0, 5),
      errorPatterns: [
        { trigger: w.slice(0, -1).join(' '),
          explanation: 'Идиома фиксирована: «' + front + '» = ' + tr + '. Усечение меняет или разрушает смысл.',
          hint: 'Учите идиому целиком, как одно слово' },
      ] } };
}

// Minimal pair B2
let _mp = 53;
function MP2(w1, i1, w2, i2, artic, ex1, ex2) {
  const id = 'mp_' + String(++_mp).padStart(3, '0');
  const k = idxOf(id);
  const e1 = String(ex1).replace(/[{}]/g, ''), e2 = String(ex2).replace(/[{}]/g, '');
  const tests = [
    Object.assign(mix(w2, [w1, 'оба', 'ни одно'], k), { q: 'Какое слово содержит второй звук пары?' }),
    Object.assign(mix(w1, [w2, 'оба', 'ни одно'], k + 2), { q: 'Какое слово содержит первый звук пары?' }),
    Object.assign(mix('разными звуками', ['только ударением', 'ничем'], k + 4), { q: 'Чем различаются «' + w1 + '» и «' + w2 + '»?' }),
    Object.assign(mix(i1, [i2], k + 6), { q: 'Какая транскрипция у «' + w1 + '»?' }),
    Object.assign(mix(i2, [i1], k + 8), { q: 'Какая транскрипция у «' + w2 + '»?' }),
  ];
  return { id, type: 'minimal_pair', level: 'B2', tags: ['B2', 'фонетика'], audio: true,
    payload: { front: w1 + ' / ' + w2, word1: w1, ipa1: i1, word2: w2, ipa2: i2,
      articulation: artic,
      examples: [{ text: e1, parts: partsOf(e1), connected: '' }, { text: e2, parts: partsOf(e2), connected: '' }],
      audio_test: { instruction: 'Послушай слово и угадай, какое прозвучало.', correct_word: w1 },
      test: tests } };
}

// Чтение B2 с cloze
let _rd = 17;
function R2(title, type, text, qs, cloze) {
  const id = 'rd_' + String(++_rd).padStart(3, '0');
  const lines = text.split('\n').filter(Boolean).map((line) => ({ text: line, parts: partsOf(line) }));
  const flat = [];
  lines.forEach((l) => flat.push(...l.parts));
  return { id, type: 'reading', level: 'B2', tags: [type], audio: true,
    payload: { title, reading_type: type, text, parts: flat, lines,
      questions: qs.map((s) => manualTest(s)), cloze } };
}

/* =====================================================================
   ДАННЫЕ: 12 грамматик B2 (g056–g067)
   ===================================================================== */
const PRO_GRAMMAR = [
G2('Inversion (negative adverbials)','Not only + auxiliary + subject… · Never have I seen…',
 'После отрицательных наречий в начале предложения порядок слов инвертируется: вспомогательный глагол выходит перед подлежащим. Это эмфаза — так подчёркивают удивление или контраст.',
 ['{Not only did he arrive late, but he also forgot the gift}.','{Never have I seen} such beauty.','{Hardly had I sat down} when the phone rang.'],
 [['He not only arrived late…','Not only did he arrive late…','Инверсия: not only + did + подлежащее'],
  ['Never I have seen…','Never have I seen…','have выходит перед I']],
 ['___ had I sat down when the phone rang.|Hardly|Hard|Hardly ever|Barely ever|0',
  'Not only ___ she lie, she also stole.|did|does|she did|was|0',
  'Never ___ such a mess.|I have seen|have I seen|I saw have|seen I have|1',
  '___ had he finished than the boss called.|No sooner|Hardly|Barely|Rarely|0',
  'Little ___ that the deal was off.|they knew|did they know|knew they did|they did know|1']),
G2('Cleft sentences','It was X who/that… · What I need is…',
 'Расщеплённые предложения выделяют важное: It was John who broke the window — акцент на John. What-клаус выделяет действие или объект.',
 ['{It was John who broke the window}, not me.','{What I need is} a good rest.','{What surprised me was} the price.'],
 [['John broke the window.','It was John who broke the window.','Акцент через It was…who'],
  ['I need a rest.','What I need is a rest.','What-клаус: What I need is…']],
 ['It was ___ who called you.|me|I|mine|my|1',
  'What ___ is more time.|I need|do I need|need I|me need|0',
  'It was in 2010 ___ we met.|when|that|which|who|1',
  '___ I like most is the ending.|What|That|Which|It|0',
  'It was the noise ___ woke me.|what|that|who|whose|1']),
G2('Emphatic do/does/did','I do think… · She does work hard…',
 'Вспомогательный do/does/did перед смысловым глаголом добавляет эмфазу: I DID tell you — «я правда говорил». Часто в спорах и заверениях.',
 ['I {do think} you should apologize.','She {does work} hard, doesn\'t she?','I {did tell} you about the meeting.'],
 [['I think you should apologize.','I do think you should apologize.','do добавляет настоятельность'],
  ['She works hard.','She does work hard.','does выделяет факт']],
 ['I ___ hope you feel better soon.|do|does|did|done|0',
  'She ___ like the gift, really.|do|does|did|doing|1',
  'We ___ warn you about traffic.|do|does|did|was|2',
  'He ___ know the truth! (эмфаза)|does|do|did to|is|0',
  'I did ___ you.|told|tell|telling|tells|1']),
G2('Wish / if only','I wish + Past Simple/Past Perfect/would',
 'Wish выражает сожаление: wish + Past Simple — про настоящее (I wish I knew), wish + Past Perfect — про прошлое (I wish I had studied), wish + would — про раздражающее поведение.',
 ['I {wish I had studied} harder at school.','{If only I were} taller!','I {wish she would stop} talking on the phone.'],
 [['I regret not studying.','I wish I had studied harder.','Сожаление о прошлом: wish + Past Perfect'],
  ['She keeps talking. It annoys me.','I wish she would stop talking.','Раздражение: wish + would']],
 ['I wish I ___ taller.|am|was|were|be|2',
  'I wish I ___ the exam yesterday.|passed|had passed|pass|would pass|1',
  'I wish he ___ smoking.|stops|would stop|stopped to|stop|1',
  'If only I ___ more free time!|have|had|would have|having|1',
  'I wish it ___ raining now.|stopped|would stop|stops|had stopped|1']),
G2('Unreal past','It\'s time + Past Simple · would rather + Past Simple',
 'It\'s time / would rather / suppose требуют прошедшего времени при настоящем смысле: It\'s time we WENT — «пора идти (сейчас)».',
 ['It\'s {time we went} home.','I\'d {rather you didn\'t smoke} here.','Suppose he {refused} — what then?'],
 [['It\'s time to go home.','It\'s time we went home.','Unreal past: время + Past'],
  ["Please don't smoke here.",'I\'d rather you didn\'t smoke here.','would rather + Past Simple']],
  ["It's time we ___.|go|went|will go|going|1",
  "I'd rather you ___ that.|don't do|didn't do|won't do|not do|1",
  "It's high time you ___ a job.|find|found|will find|finding|1",
  "Would you rather I ___?|come|came|will come|coming|1",
  "It's time ___ home.|we go|we went|we will go|we going|1"]),
G2('Future Perfect Continuous','will have been + V-ing · by + время',
 'Длительное действие к точке в будущем: By next year I will have been working here for a decade. Часто с for/since и by.',
 ['By next year I {will have been working} here for a decade.','How long {will you have been waiting} by then?','By May, she {will have been living} abroad for two years.'],
 [['I will work here for 10 years (к тому моменту).','I will have been working here for a decade.','Акцент на длительности к сроку'],
  ['She will live abroad for two years (к маю).','She will have been living abroad for two years.','will have been + -ing']],
 ['By June, I ___ here for a year.|will work|will have been working|work|am working|1',
  'How long ___ been waiting by then?|will you|you will|will you have|have you|2',
  'By 2030 she ___ for 20 years.|will teach|will have been teaching|teaches|taught|1',
  'Future Perfect Continuous = ___|will have been + V-ing|will have + V3|will be + V-ing|would + V|0',
  'By then, we ___ this project for months.|discuss|will have been discussing|discussed|are discussing|1']),
G2('Participle clauses','Having + V3 · Not + V-ing',
 'Причастные обороты сокращают придаточные: Having finished his homework, he went out = After he had finished… Актив — V-ing, пассив — V3 (Written in 1990, the book…).',
 ['{Having finished} his homework, he went out.','{Not knowing} the answer, she stayed silent.','{Written} in 1990, the letter surprised everyone.'],
 [['After he had finished his homework, he went out.','Having finished his homework, he went out.','Сокращение: Having + V3'],
  ['Because she did not know the answer, she stayed silent.','Not knowing the answer, she stayed silent.','Отрицание: Not + V-ing']],
 ['___ his degree, he moved abroad.|Having completed|Have completed|Completed he|He completed|0',
  '___ the truth, she said nothing.|Not known|Not knowing|Not know|Known not|1',
  '___ in 1990, the letter surprised everyone.|Writing|Written|Wrote|Having write|1',
  'Participle clause для пассива: ___|V3|V-ing|to V|V2|0',
  '___ late, he missed the train.|Being|Been|Be|Was|0']),
G2('Causative have/get','have/get + object + V3',
 'Каузатив — когда кто-то делает что-то для вас: I had my car repaired. Get — разговорный вариант: She got her hair cut.',
 ['I {had my car repaired} at the new garage.','She {got her hair cut} yesterday.','We\'re {having the kitchen painted} next week.'],
 [['The garage repaired my car.','I had my car repaired.','have + объект + V3'],
  ['The hairdresser cut her hair.','She got her hair cut.','get + объект + V3']],
 ['I ___ my laptop fixed yesterday.|had|have get|got have|am|0',
  'She is ___ her apartment redecorated.|have|having|had to|has|1',
  'We must ___ the roof repaired.|have|have got to being|getting have|had|0',
  'Causative = подлежащее ___|делает сам|организует через других|отказывается|отменяет|1',
  'He got his phone ___ last week.|steal|stolen|stealing|to steal|1']),
G2('Advanced relative clauses','whose · non-defining which · preposition + whom',
 'Продвинутые relative clauses: whose для принадлежности, запятая + which для комментария ко всему предложению, предлог + whom/which в формальном стиле.',
 ['The man {whose car was stolen} is my neighbor.','The book, {which I read last year}, was excellent.','The colleague {with whom I share} an office is retiring.'],
 [['His car was stolen. He is my neighbor.','The man whose car was stolen is my neighbor.','whose = чей'],
  ['The book was excellent. I read it last year.','The book, which I read last year, was excellent.','Non-defining: запятая + which']],
 ['The woman ___ laptop was stolen called the police.|which|whose|who|that|1',
  'He passed the exam, ___ surprised everyone.|that|which|who|what|1',
  'The partner ___ we work is German.|with whom|with who|whom with|that with|0',
  'Запятая перед which значит…|определение|дополнительный комментарий|вопрос|сравнение|1',
  'The author ___ book won the prize visited us.|which|whose|who|whom|1']),
G2('Fronting','Обстоятельство/дополнение в начало + инверсия',
 'Фронтирование выносит в начало unusual элементы для драматического эффекта, часто с инверсией: Up the hill walked a small boy. On the table was a letter.',
 ['{Up the hill walked} a small boy.','{On the table was} a letter.','{Never before had} anyone seen such traffic.'],
 [['A small boy walked up the hill.','Up the hill walked a small boy.','Фронт + инверсия'],
  ['A letter was on the table.','On the table was a letter.','Место в начало + was перед подлежащим']],
 ['___ stood an old oak tree.|In the garden|There in garden|The garden in|Garden there|0',
  'On the shelf ___ three old maps.|were|was|is|be|0',
  'Фронтирование используется для…|ошибок|эмфазы|вопросов|отрицаний|1',
  'Down the road ___ a black van.|came|comes to|did come|coming|0',
  'Fronting + инверсия чаще в…|чате|литературе и описаниях|SMS|рекламе|1']),
G2('Ellipsis','Пропуск очевидных слов',
 'Эллипсис — пропуск слов, понятных из контекста: (It is a) Nice day, isn\'t it? (Do you) Want a coffee? Разговорная речь полна эллипсиса.',
 ['{Nice day}, isn\'t it?','{Want a coffee?}','{Sounds good} to me.'],
 [['It is a nice day, isn\'t it?','Nice day, isn\'t it?','Пропущено It is'],
  ['Do you want a coffee?','Want a coffee?','Пропущено Do you']],
  ['Nice day, ___?|isn\'t it|is it|doesn\'t it|isn\'t this|0',
  '___ a coffee?|Do want you|Want|Wanting|You wanting|1',
  'Эллипсис — это…|ошибка|пропуск очевидных слов|инверсия|повтор|1',
  'Sounds ___ to me.|good it|good|goodly|well|1',
  'Где эллипсис уместен?|официальном отчёте|разговоре|договоре|инструкции|1']),
G2('Mixed conditionals','Прошлое условие → настоящее следствие (и наоборот)',
 'Смешанные условные: If I had studied medicine (прошлое), I would be a doctor now (настоящее). Время главного и придаточного не совпадают.',
 ['If I {had studied} medicine, I {would be} a doctor now.','If she {were} more careful, she {wouldn\'t have lost} her keys.','If we {had booked} earlier, we {wouldn\'t be waiting} now.'],
 [['I didn\'t study medicine. I am not a doctor now.','If I had studied medicine, I would be a doctor now.','Прошлое условие → настоящее следствие'],
  ['She isn\'t careful. She lost her keys.','If she were more careful, she wouldn\'t have lost her keys.','Настоящее условие → прошлое следствие']],
 ['If I had taken the map, we ___ lost now.|won\'t be|wouldn\'t be|wouldn\'t have been|aren\'t|1',
  'If she ___ rich, she would have bought it yesterday.|were|is|was been|had been|0',
  'Mixed conditional: прошлое условие + ___ следствие|прошедшее|настоящее|будущее в прошлом|инфинитив|1',
  'If he weren\'t so shy, he ___ her at the party.|would ask|would have asked|asked|asks|1',
  'If I had slept, I ___ so tired now.|won\'t feel|wouldn\'t feel|didn\'t feel|wouldn\'t have felt|1']),
];

/* =====================================================================
   ДАННЫЕ: 50 фразовых глаголов B2 (pv_159–pv_208)
   ===================================================================== */
const PRO_PHRASAL = [
P2('boil down to','сводиться к',['The whole argument {boils down to} money.','It {boils down to} one simple choice.'],'The problem _ one issue.|boils down to|boils down|boils on down|boils up to|0','своди к сути'),
P2('brush up on','освежить знания',['I need to {brush up on} my Spanish before the trip.','She is {brushing up on} interview skills.'],'I want to _ my French.|brush up on|brush on up|brush up at|brush over|0','освежить кистью'),
P2('clam up','замолчать, закрыться',['He {clammed up} when the police arrived.','She always {clams up} during arguments.'],'When asked about it, he _ .|clammed up|clammed on|clam down|clammed in|0','молчаливая ракушка'),
P2('come down with','заболеть чем-то',['I think I\'m {coming down with} a cold.','She {came down with} flu before the exam.'],'He _ a fever last night.|came down with|came with down|came down of|came up with|0','болезнь спускается'),
P2('dawn on','осознать (доходит)',['It suddenly {dawned on} me that I was wrong.','The truth {dawned on} her slowly.'],'It _ me that the deadline was today.|dawned on|dawned at|dawned over|dawned up|0','рассвет в голове'),
P2('figure on','рассчитывать на',['We hadn\'t {figured on} such heavy traffic.','I {figured on} finishing by noon.'],'We didn\'t _ so many delays.|figure on|figure in|figure out on|figure up|0'),
P2('get across to','донести до',['She couldn\'t {get across to} the audience.','He finally {got his point across to} the board.'],'Ideas must be _ the team.|got across to|got across|got to across|got over to|0'),
P2('get around to','добраться до (дела)',['I finally {got around to} cleaning the garage.','She never {gets around to} answering emails.'],'I\'ll _ it next week.|get around to|get around at|get to around|get over to|0'),
P2('hash out','обсудить до решения',['We need to {hash out} the details before signing.','They {hashed out} an agreement after hours.'],'The terms were _ yesterday.|hashed out|hashed up|hashed in|hashed over to|0','hash — рубить вопрос'),
P2('head up','возглавлять',['She will {head up} the new department.','He {heads up} a team of twenty.'],['Who _ the project?','heads up|heads on up|heads to|heads over|0']),
P2('iron out','утрясти, сгладить',['Let\'s {iron out} the remaining issues.','They {ironed out} their differences.'],'All problems were _ before launch.|ironed out|ironed up|ironed in|ironed over|0','утюгом сгладить'),
P2('knuckle down','взяться всерьёз',['Time to {knuckle down} and study.','He {knuckled down} after the warning.'],'You must _ before the exams.|knuckle down|knuckle up|knuckle in|knuckle on|0'),
P2('lay off','увольнять; переставать',['The factory {laid off} 200 workers.','{Lay off} the jokes — it\'s serious!'],'The company _ staff last month.|laid off|laid down|laid out|laid in|0'),
P2('let on','выдавать (секрет)',['Don\'t {let on} about the surprise party.','He never {let on} that he knew.'],'She didn\'t _ anything.|let on|let up|let in|let out|0'),
P2('make off with','убежать с (украденным)',['The thief {made off with} the jewels.','They {made off with} the trophy.'],'The cat _ my sandwich.|made off with|made with off|made up with|made out with|0'),
P2('mouth off','дерзить, огрызаться',['He got fired for {mouthing off} to a client.','Stop {mouthing off} at the referee!'],'The kid kept _ at teachers.|mouthing off|mouthing up|mouthing in|mouthing over|0'),
P2('nip in the bud','пресечь в зародыше',['We {nipped} the crisis {in the bud}.','Try to {nip} bad habits {in the bud}.'],'The rumor was _ .|nipped in the bud|nipped on the bud|nipped at the bud|nipped up the bud|0'),
P2('palm off','подсунуть (подделку)',['They tried to {palm off} a fake as an original.','He {palmed off} the work on interns.'],'Don\'t _ old stock on us.|palm off|palm up|palm in|palm over|0'),
P2('peter out','постепенно прекращаться',['The scandal {petered out} after a week.','Their energy {petered out} by midnight.'],'The trail _ in the forest.|petered out|petered up|petered in|petered over|0'),
P2('pipe down','замолчать, притихнуть',['{Pipe down} — the baby is sleeping!','The class finally {piped down}.'],'Everybody _ , please!|pipe down|pipe up|pipe in|pipe over|0'),
P2('pipe up','внезапно вмешаться',['She {piped up} with a brilliant idea.','A voice {piped up} from the back.'],['Suddenly he _ with an answer.','piped up|piped down|piped in to|piped over|0']),
P2('play down','приуменьшать',['The government {played down} the risks.','He {played down} his role in the success.'],'They tried to _ the scandal.|play down|play up|play in|play off|0'),
P2('play up','барахлить; подчёркивать',['My knee is {playing up} again.','The media {played up} the conflict.'],'The old printer keeps _ .|playing up|playing down|playing in|playing out|0'),
P2('plow on','упорно продолжать',['We {plowed on} despite the rain.','She {plowed on} with the essay all night.'],'They _ through the difficulties.|plowed on|plowed up|plowed in|plowed out|0'),
P2('plug away at','упорно заниматься',['Keep {plugging away at} it — you\'ll get there.','He {plugged away at} the translation for months.'],['She _ the problem for hours.','plugged away at|plugged in at|plugged up|plugged over|0']),
P2('pore over','внимательно изучать',['Lawyers {pored over} the contract all night.','She was {poring over} old maps.'],['He _ the data for hours.','pored over|poured over|pored up|poured in|0']),
P2('pull off','суметь провернуть',['They {pulled off} an incredible victory.','I can\'t believe we {pulled it off}!'],'The team _ the impossible.|pulled off|pulled up|pulled in|pulled over|0'),
P2('puzzle out','разгадать',['It took me an hour to {puzzle out} the instructions.','She finally {puzzled out} the code.'],'We need to _ this riddle.|puzzle out|puzzle up|puzzle in|puzzle over to|0'),
P2('put down to','списать на',['I {put} his mood {down to} lack of sleep.','She {puts} her success {down to} luck.'],'He _ the delay _ traffic.|put … down to|put … up to|put … in to|put … off to|0'),
P2('read into','видеть то, чего нет',['Don\'t {read into} his silence — he\'s just tired.','You\'re {reading too much into} her words.'],['Stop _ his message.','reading into|reading up|reading in|reading over|0']),
P2('reel off','отчеканить без запинки',['She {reeled off} all the capitals in ten seconds.','He {reeled off} a list of complaints.'],'The actor _ his lines perfectly.|reeled off|reeled up|reeled in|reeled over|0'),
P2('ring false','звучать фальшиво',['His apology {rang false}.','The excuse {rings false} to me.'],'Her promises always _ .|ring false|ring falsely|ring up false|rang out false|0'),
P2('run up against','столкнуться с',['We {ran up against} unexpected bureaucracy.','They {ran up against} strong opposition.'],'The project _ legal barriers.|ran up against|ran against up|ran into up|ran over|0'),
P2('scrape through','еле сдать, протащиться',['He {scraped through} the exam with 51%.','We {scraped through} the audit.'],'I barely _ the interview.|scraped through|scraped up|scraped in|scraped over|0'),
P2('sell out','распродаться; предать идеалы',['The concert {sold out} in minutes.','Critics say the band has {sold out}.'],'All tickets _ yesterday.|sold out|sold up|sold in|sold over|0'),
P2('shell out','выложить (деньги)',['I had to {shell out} €200 for repairs.','They {shelled out} for a new server.'],'He _ a fortune on gear.|shelled out|shelled up|shelled in|shelled over|0'),
P2('sleep on it','отложить решение на утро',['Let me {sleep on it} and call you tomorrow.','Don\'t decide now — {sleep on it}.'],'Why not _ before signing?|sleep on it|sleep over it|sleep it|sleep at it|0'),
P2('slip up','ошибиться по недосмотру',['Someone {slipped up} in the invoice.','I {slipped up} and sent it to the wrong person.'],['We can\'t afford to _ here.','slip up|slip in|slip over|slip off|0']),
P2('snow under','завалить (работой)',['I\'m {snowed under} with paperwork.','The support team was {snowed under}.'],['She is _ with orders.','snowed under|snowed up|snowed in work|snowed over|0']),
P2('sniff out','вычислить, раскрыть нюхом',['Dogs {sniffed out} the contraband.','Journalists {sniffed out} the story.'],['Auditors _ the fraud.','sniffed out|sniffed up|sniffed in|sniffed over|0']),
P2('sound out','зондирующе спросить',['Let\'s {sound out} the team before the vote.','I {sounded out} a few clients.'],['We should _ her opinion first.','sound out|sound up|sound in|sound over|0']),
P2('spark off','спровоцировать',['The tweet {sparked off} a huge debate.','Price hikes {sparked off} protests.'],'One comment _ a flame war.|sparked off|sparked up|sparked in|sparked over|0'),
P2('speak out','выступить открыто',['Employees {spoke out} about unsafe conditions.','More victims are {speaking out} now.'],['It\'s time to _ against injustice.','speak out|speak up to|speak over|speak in|0']),
P2('stand for','терпеть; означать',['I won\'t {stand for} this behavior.','VIP {stands for} very important person.'],['I won\'t _ rudeness.','stand for|stand up|stand in|stand over|0']),
P2('stick out for','настаивать на',['The union {stuck out for} higher pay.','They {stuck out for} better terms.'],['We should _ a full refund.','stick out for|stick up for at|stick in for|stick over|0']),
P2('stumble across','наткнуться случайно',['I {stumbled across} an old diary.','Researchers {stumbled across} a rare species.'],['She _ a great café downtown.','stumbled across|stumbled up|stumbled into up|stumbled over|0']),
P2('suck up to','подлизываться к',['He\'s always {sucking up to} the boss.','Stop {sucking up to} the examiner!'],['Flattery: he _ the manager.','sucks up to|sucks in to|sucks over|sucks up on|0']),
P2('sum up','подытожить',['To {sum up}, we need three things.','She {summed up} the meeting in one sentence.'],['Let me _ the results.|sum up|sum up to|sum in|sum over|0']),
P2('zero in on','сфокусироваться на',['The report {zeroed in on} the main risks.','Detectives {zeroed in on} one suspect.'],'Marketing _ younger users.|zeroed in on|zeroed on in|zeroed up|zeroed over|0'),
];

/* =====================================================================
   ДАННЫЕ: 50 коллокаций B2 (col_158–col_207)
   ===================================================================== */
const PRO_COLLOC = [
C2('pose a threat','представлять угрозу',['Drones {pose} a serious {threat} to privacy.','Rising costs pose a threat to small firms.'],'Climate change _ a threat to crops.|poses|makes|does|takes|0'),
C2('draw a conclusion','сделать вывод',['We can {draw} a clear {conclusion} from the data.','Don\'t draw hasty conclusions.'],'From this we _ a conclusion.|draw|make|do|take|0'),
C2('conduct research','проводить исследование',['The lab {conducts} medical {research}.','They conducted research for two years.'],'Scientists _ research on sleep.|conduct|make|do|perform to|0'),
C2('reach a consensus','прийти к консенсусу',['The committee finally {reached} a {consensus}.','We must reach a consensus today.'],['After hours, they _ a consensus.','reached|made|did|got|0']),
C2('address an issue','разобрать вопрос',['The report {addresses} a key {issue}.','Let\'s address this issue directly.'],'The manager promised to _ the issue.|address|answer to|solve up|open|0'),
C2('highlight a problem','подчеркнуть проблему',['The audit {highlighted} a major {problem}.','Her study highlights the problem of bias.'],'The case _ a problem with funding.|highlighted|lighted|high up|shown up|0'),
C2('undergo changes','подвергнуться изменениям',['The system will {undergo} major {changes}.','The product underwent changes in 2023.'],'The law must _ changes.|undergo|undercome|take|make|0'),
C2('impose restrictions','вводить ограничения',['The city {imposed} strict {restrictions}.','New rules impose restrictions on imports.'],'The EU _ restrictions on data.|imposed|made|put to|said|0'),
C2('alleviate poverty','смягчить бедность',['Aid programmes {alleviate} extreme {poverty}.','Education helps alleviate poverty.'],'The fund aims to _ poverty.|alleviate|light|easy|soften up|0'),
C2('exacerbate tensions','обострить напряжённость',['The speech {exacerbated} regional {tensions}.','Sanctions exacerbated tensions further.'],'The move _ tensions.|exacerbated|exasperated|made more|angried|0'),
C2('mitigate risks','снизить риски',['Diversification {mitigates} {risks}.','We must mitigate risks early.'],'Insurance helps _ risks.|mitigate|light|slow|down|0'),
C2('facilitate progress','способствовать прогрессу',['New tools {facilitate} scientific {progress}.','Open data facilitates progress.'],['Open standards _ progress.','facilitate|facility|fasten|do|0']),
C2('yield results','давать результаты',['The experiment {yielded} surprising {results}.','Talks yielded no results.'],'The strategy finally _ results.|yielded|gave up|made|did|0'),
C2('compile data','собирать данные',['The team {compiled} {data} from 40 studies.','We compiled data over six months.'],'Researchers _ data from surveys.|compiled|composed|gathered up|wrote|0'),
C2('formulate a hypothesis','сформулировать гипотезу',['She {formulated} a {hypothesis} to test.','The paper formulates a new hypothesis.'],'First, _ a hypothesis.|formulate|form|do|make up|0'),
C2('refute an argument','опровергнуть аргумент',['The author {refutes} that {argument} in chapter two.','Data refutes the argument completely.'],'The study _ the argument.|refutes|refuses|denies of|confirms against|0'),
C2('corroborate evidence','подтвердить доказательства',
 ['Independent tests {corroborated} the {evidence}.','New witnesses corroborated the evidence.'],
 'A second study _ the evidence.|corroborated|corporated|collected up|doubted|0'),
C2('stipulate requirements','устанавливать требования',['The contract {stipulates} strict {requirements}.','The law stipulates requirements for labs.'],'The tender _ requirements.|stipulates|stays|installs|forces|0'),
C2('advocate for change','выступать за перемены',['NGOs {advocate for} policy {change}.','She advocates for change at every forum.'],['They _ change openly.','advocate|advocate up|voice to|speak|0']),
C2('scrutinize data','тщательно проверять данные',['Auditors {scrutinized} the {data} line by line.','Independent experts scrutinize the data.'],'Regulators will _ the data.|scrutinize|screw|glance|skim|0'),
C2('attribute to','приписывать (чему-то)',['They {attributed} the success {to} luck.','The delay was attributed to weather.'],'He _ his recovery _ the therapy.|attributed … to|attributed … for|attributed … with|attributed … on|0'),
C2('derive from','происходить из',['The word {derives} {from} Latin.','Profits derive from subscriptions.'],'This term _ from Greek.|derives|drives|comes up|takes from|0'),
C2('comprise of','состоять из (строго: comprise)',['The committee {comprises} seven members.','The dataset comprises two parts.'],'The panel _ five experts.|comprises|comprises of|consists up|composes|0'),
C2('encompass','охватывать',['The course {encompasses} all basic topics.','The review encompasses 30 studies.'],'The reform _ many areas.|encompasses|encounters|circles around|incompasses|0'),
C2('constitute','составлять, образовывать',['These actions {constitute} a breach.','Three members constitute a quorum.'],'Such behavior _ misconduct.|constitutes|constructs|consists in|stands for|0'),
C2('bear in mind','иметь в виду',['Please {bear} {in mind} the deadline.','Bear in mind that prices vary.'],'_ in mind that data changes.|Bear|Born|Carry|Take|0'),
C2('take into consideration','принять во внимание',['We must {take} this {into consideration}.','Costs were taken into consideration.'],['The judge took it _ consideration.','into|in to|onto|at|0']),
C2('meet requirements','соответствовать требованиям',['The candidate {meets} all {requirements}.','The building meets safety requirements.'],'Does the design _ requirements?|meet|fit to|fill|make|0'),
C2('exceed expectations','превзойти ожидания',['The launch {exceeded} all {expectations}.','Revenue exceeded expectations by 20%.'],'The sequel _ expectations.|exceeded|accepted|passed over|went|0'),
C2('strike a balance','найти баланс',['We must {strike} a {balance} between cost and quality.','She strikes a balance between work and life.'],'Try to _ a balance.|strike|hit on|make|do|0'),
C2('bridge the gap','восполнить разрыв',['Mentoring helps {bridge} the {gap} between study and work.','The grant bridges the funding gap.'],'Training _ the skills gap.|bridges|builds up|connects to|fills of|0'),
C2('gain traction','набирать обороты',['The startup is {gaining} {traction}.','The idea gained traction after the demo.'],'The petition is _ traction.|gaining|getting up|winning over|growing|0'),
C2('streamline processes','оптимизировать процессы',['Automation {streamlines} routine {processes}.','We streamlined processes across teams.'],['The app _ processes.','streamlines|straightens|makes line|fastens|0']),
C2('leverage resources','использовать ресурсы',['The NGO {leverages} local {resources}.','They leveraged resources wisely.'],['Smart teams _ resources.','leverage|level|lift|lever|0']),
C2('foster innovation','поощрять инновации',['Culture {fosters} {innovation}.','Hackathons foster innovation.'],'Leadership must _ innovation.|foster|faster|feed up|force|0'),
C2('drive growth','двигать рост',['Exports {drove} economic {growth}.','Innovation drives growth.'],'Digital sales _ growth.|drive|drive to|push up of|ride|0'),
C2('maximize efficiency','максимизировать эффективность',['The redesign {maximizes} {efficiency}.','We maximized efficiency by 15%.'],['The goal is to _ efficiency.','maximize|maximize up|make most|grow|0']),
C2('minimize costs','минимизировать расходы',['Cloud tools {minimize} {costs}.','We minimized costs without layoffs.'],'Bulk buying _ costs.|minimizes|mini|lessens up|lowers of|0'),
C2('optimize performance','оптимизировать производительность',['Caching {optimizes} {performance}.','We optimized performance under load.'],['The patch _ performance.','optimizes|options|optimizes up|uses|0']),
C2('implement strategies','внедрять стратегии',['The board {implemented} three {strategies}.','They implemented strategies quarter by quarter.'],['The team _ strategies.','implements|implied|supplied|applies on|0']),
C2('evaluate outcomes','оценивать результаты',['Managers {evaluate} {outcomes} monthly.','We evaluate outcomes against KPIs.'],['Leaders must _ outcomes.','evaluate|evacuate|value out|estimate over|0']),
C2('assess viability','оценивать жизнеспособность',['Consultants {assessed} the {viability} of the plan.','Assess viability before scaling.'],['The bank _ viability first.','assessed|accessed|guessed|assigned|0']),
C2('negotiate terms','обговаривать условия',['Lawyers {negotiated} the {terms} for weeks.','We negotiated better terms.'],['Both sides _ terms.','negotiated|neglected|moved|signed of|0']),
C2('secure funding','обеспечить финансирование',['The lab {secured} {funding} for five years.','Startups secure funding via grants.'],['Finally they _ funding.','secured|sured|locked of|made sure|0']),
C2('allocate budget','распределять бюджет',['Each department {allocates} its {budget}.','We allocated the budget in Q1.'],['Finance _ the budget.','allocates|locates|allows to|allots up|0']),
C2('monitor progress','отслеживать прогресс',['Dashboards {monitor} {progress} daily.','We monitor progress weekly.'],['Coaches _ progress.','monitor|money|watch once|look at screen|0']),
C2('identify trends','выявлять тренды',['Analysts {identified} key {trends}.','The report identifies trends early.'],['AI helps _ trends.','identify|identity|make same|point out of|0']),
C2('capitalize on opportunities','использовать возможности',['Fast movers {capitalize} on {opportunities}.','They capitalized on the trend.'],['Smart firms _ opportunities.','capitalize on|capitalize up|make capital of|take head of|0']),
C2('mitigate losses','сокращать убытки',['Hedging {mitigates} {losses}.','Insurance mitigated the losses.'],['Diversification _ losses.','mitigates|lightens of|lowers down|slow|0']),
C2('sustain momentum','поддерживать темп',['Wins {sustain} team {momentum}.','Hard to sustain momentum all year.'],['Small wins _ momentum.','sustain|support of|stand under|keep of|0']),
];

// cloze для чтений: {answer, options, correct}
const PRO_READINGS = [];
let _rd2 = 17;
function R2(title, type, text, qs, cloze) {
  const id = 'rd_' + String(++_rd2).padStart(3, '0');
  const lines = text.split('\n').filter(Boolean).map((line) => ({ text: line, parts: partsOf(line) }));
  const flat = [];
  lines.forEach((l) => flat.push(...l.parts));
  return { id, type: 'reading', level: 'B2', tags: [type], audio: true,
    payload: { title, reading_type: type, text, parts: flat, lines,
      questions: qs.map((s) => manualTest(s)),
      cloze: cloze || [] } };
}

const READINGS = [
R2('The Science of Procrastination','article',
"Procrastination is not laziness. Modern psychology describes it as an emotion regulation problem: we delay tasks that make us feel anxious, bored or insecure, and we choose short-term comfort instead. The brain reacts to a looming deadline the way it reacts to a threat, and avoidance gives instant relief — which, unfortunately, teaches the brain to repeat the pattern.\nResearchers distinguish between passive and active procrastinators. Passive procrastinators freeze; active ones deliberately postpone a task because they work better under pressure and still deliver. The difference lies in control, not in timing.\nThe most effective strategies are surprisingly unglamorous. Break the task into steps so small they feel trivial, and start with the ugliest one. Forgive yourself for past delays — studies show that self-forgiveness reduces future procrastination, while guilt strengthens it. Finally, design your environment: put the phone in another room, open only the file you need, and tell a colleague what you plan to finish today.\nTechnology rarely causes procrastination by itself; it amplifies whatever habit already exists. The same device that hosts a video platform also hosts your thesis. Treat attention as a budget: every app spends it, so decide in advance what deserves the expense.\nIf you remember one idea, remember this: motivation follows action, not the other way around. Start badly, start small, start now — the feeling of readiness arrives after you begin, and it grows with every unfinished task you dare to face.",
["Автор называет прокрастинацию…|проблемой регуляции эмоций|ленью|болезнью|дурной наследственностью|0",
"Активные прокрастинаторы…|специально откладывают и всё успевают|никогда не откладывают|всегда срывают дедлайны|работают только ночью|0",
"Что снижает будущую прокрастинацию по исследованиям?|самопрощение|чувство вины|жёсткие штрафы|стыд|0",
"Отношение автора к технологиям:|усиливают существующую привычку|главная причина|абсолютно безвредны|нужно запретить|0",
"Главная мысль финала:|мотивация приходит после действия|ждите вдохновения|нужен идеальный план|начинайте с приятного|0"],
[{answer:'regulation',options:['regulation','regulation of','regular','regularity'],correct:0},
 {answer:'avoidance',options:['avoidance','avoid','avoiding of','avoided'],correct:0},
 {answer:'budget',options:['budget','bubble','bucket','bullet'],correct:0}]),
R2('Your Second Brain: the Microbiome','article',
"Trillions of bacteria live in your gut — so many that scientists casually call this collection a second brain. The microbiome weighs up to two kilograms, contains more genes than the human genome, and influences systems far beyond digestion.\nRecent research suggests that gut bacteria affect mood, sleep quality and even decision-making. Communication runs along the vagus nerve and through chemical signals; the exact vocabulary of this dialogue is still being mapped. What is clear is that diversity matters. A varied microbiome, fed by fiber from vegetables, legumes and whole grains, correlates with better markers of mental and physical health.\nAntibiotics can reshape this ecosystem in days, and recovery may take months. Ultra-processed food narrows the bacterial menu, while fermented products widen it. Athletes, interestingly, tend to host microbes that specialize in recycling lactic acid — a small example of how training shapes biology.\nThe field is young, and hype runs ahead of evidence. Probiotic labels often promise more than studies can confirm. Still, the practical advice is boringly reliable: eat plants of many kinds, sleep enough, avoid unnecessary antibiotics, and let the garden inside you grow. You are not eating only for yourself — you are feeding trillions of tenants whose opinions matter more than we believed a decade ago.",
["Микробиом называют «вторым мозгом», потому что он…|влияет на настроение и решения|находится в голове|состоит из нейронов|думает за человека|0",
"Что важно для здоровья микробиома?|разнообразие|стерильность|одно суперпродукт|голодание|0",
"Восстановление после антибиотиков…|может занять месяцы|происходит за день|невозможно|не нужно|0",
"Отношение автора к пробиотикам:|обещания часто ahead of доказательств|полностью доказаны|бесполезны|запрещены|0",
"Практический совет статьи:|есть разные растения|есть только мясо|пить только кефир|голодать|0"],
[{answer:'diversity',options:['diversity','diversion','division','density'],correct:0},
 {answer:'ecosystem',options:['ecosystem','economics','echo','episode'],correct:0},
 {answer:'tenants',options:['tenants','tennis','tendons','tents'],correct:0}]),
R2('Remote Work: Freedom and Its Price','essay',
"When offices emptied in 2020, millions of workers discovered something unexpected: many jobs could be done from a kitchen table. Five years later the debate has cooled from panic to negotiation, and the picture is more nuanced than either extreme suggests.\nThe gains are real. People reclaim hours once lost to commuting; parents attend school plays; rural towns welcome salaries that used to stay in capital cities. Companies access talent across borders and rent less office space. For deep, individual work, home is often quieter than any open-plan floor.\nBut freedom has a price. Loneliness is the most cited downside in surveys — not distraction, not cats on keyboards. Junior employees learn by overhearing, and remote setups break that invisible curriculum. Career progression slows for people who are out of sight, and the boundary between work and rest dissolves when the laptop lives on the dinner table.\nThe hybrid model emerged not as a compromise but as an admission that different tasks need different environments. Writing code or reports benefits from silence; strategy, trust and difficult conversations benefit from a shared room.\nThe wisest teams now design work around outcomes, not presence. They schedule collaboration days, protect focus days, and measure results instead of hours online. Remote work is not a perk or a punishment — it is a tool. Like any tool, it rewards skill and punishes careless use.",
["Самый частый минус удалёнки в опросах:|одиночество|отвлекающие факторы|кошки|медленный интернет|0",
"Почему страдают junior-сотрудники?|ломается обучение через подслушивание|им не дают ноутбук|их переводят в офис|им платят меньше|0",
"Гибридная модель — это…|признание, что задачи требуют разных сред|компромисс ради начальства|возврат в офис|полная удалёнка|0",
"Мудрые команды измеряют…|результаты, а не часы онлайн|часы онлайн|время в офисе|число встреч|0",
"Отношение автора к удалёнке:|это инструмент|это привилегия|это наказание|это мода|0"]),
R2('Gadget Review: The Nomad X2','article',
"After three weeks with the Nomad X2, I can finally separate marketing from reality. The headline feature — a battery that allegedly lasts seven days — lasts five in honest use. That is still the best figure in its class, and for travelers it alone justifies the price.\nThe screen is the second surprise. At 6.1 inches it is compact by modern standards, yet brightness peaks at 1200 nits, so sunlight stops being a problem. Text is sharp, colors restrained rather than carnival-bright, and my eyes felt less strain after long reading sessions.\nPerformance is unremarkable in benchmarks but flawless in daily life. Apps open instantly, the camera launches in half a second, and the new chip sips power instead of gulping it. Photographers will appreciate the honest colors of the main sensor, though the night mode still smears fine detail.\nNow the downsides, because every review needs them. The speaker is thin and rattles at maximum volume. The company removed the headphone jack years ago and has now removed the microSD slot too — storage is fixed, so choose wisely. And the charger in the box is embarrassingly slow for a device at this price.\nShould you buy it? If battery anxiety defines your day, yes — the X2 removes that fear completely. If you chase camera excellence or gaming power, look elsewhere. For everyone in between, this is the most balanced device of the year: not exciting, but almost impossible to regret.",
["Заявленная батарея в честном использовании живёт…|5 дней вместо 7|ровно 7 дней|2 дня|10 дней|0",
"Экран хвалят за…|яркость 1200 нит|огромный размер|игровую частоту|изогнутость|0",
"Недостаток, добавленный в новой модели:|убрали слот microSD|убрали батарею|убрали экран|убрали камеру|0",
"Кому автор НЕ советует устройство?|охотникам за камерой и играм|путешественникам|читающим|тем, кто ценит батарею|0",
"Итоговый вердикт:|самый сбалансированный в году|худший в году|только для игр|не покупать никому|0"]),
R2("Rental Agreement: Key Clauses",'notice',
"This summary explains the main clauses of your tenancy agreement. It does not replace the full contract, which prevails in case of any discrepancy.\n1. TERM. The tenancy runs for twelve months from the start date, unless ended earlier under clause 9. Renewal requires written agreement by both parties no later than thirty days before expiry.\n2. RENT. Rent of 850 EUR is payable in advance on the first day of each month by bank transfer. Late payment triggers a fee of 2% after the fifth calendar day.\n3. DEPOSIT. A deposit equal to one month's rent secures the tenant's obligations. The landlord must return it within fourteen days of the end of the tenancy, minus lawful deductions for unpaid rent or damage beyond fair wear and tear.\n4. USE. The premises are to be used exclusively as a private residence. Subletting, commercial activity and keeping of pets require prior written consent.\n5. REPAIRS. The tenant must report defects without undue delay. The landlord is responsible for structural and essential systems; the tenant covers minor maintenance up to 50 EUR per occurrence.\n6. TERMINATION. Either party may terminate with two months' written notice. Emergency termination for cause remains possible under statutory law.\nKeep a signed copy of the contract, photograph the condition of every room on move-in day, and send all notices in writing — a message through the app counts only if you receive confirmation.",
["Депозит возвращается в течение…|14 дней после окончания аренды|24 часов|30 дней|7 дней|0",
"Пеня за просрочку_rentа:|2% после 5-го дня|10% сразу|нет пени|5% еженедельно|0",
"Домашние животные…|требуют письменного согласия|разрешены всегда|запрещены навсегда|допускаются без вопросов|0",
"Мелкий ремонт до 50 EUR оплачивает…|арендатор|арендодатель|муниципалитет|страховка|0",
"Уведомление через приложение считается…|только при подтверждении получения|всегда достаточным|недействительным|устной договорённостью|0"]),
R2('Sleep: The Cheapest Medicine','article',
"Sleep is the only medicine that is free, effective against almost everything, and systematically ignored. Adults need between seven and nine hours; most of us treat the lower bound as a target and the upper bound as a luxury.\nThe costs of cutting sleep are not abstract. Memory consolidation happens at night — the brain replays the day and files what matters. Immune function drops measurably after short nights, and large studies link chronic sleep debt to heart disease, weight gain and impaired glucose control. Hormones shift too: appetite grows while the sense of fullness weakens, which explains why tired people snack more.\nQuality matters as much as quantity. Regular timing anchors the internal clock stronger than any supplement; going to bed and rising at the same hours stabilizes sleep architecture within two weeks. Light is the master switch — bright mornings advance it, late screens delay it. Caffeine has a half-life of about six hours, so an afternoon coffee is still working at midnight, invisibly.\nThe advice is refreshingly cheap. Fix your wake-up time first, even at weekends. Get daylight within an hour of waking. Keep the bedroom cool and dark. Reserve the bed for sleep, not for scrolling. And if you cannot sleep, do not lie there fighting: get up, read something dull in dim light, and return when heavy-eyed.\nNo diet, no gadget and no supplement will repay the debt that sleep repays. It is the closest thing to a life-extension drug, and it has no side effects — unless you count dreaming.",
["Мозг ночью…|консолидирует память|полностью отключается|только отдыхает без задач|сжигает жир|0",
"Хронический недосып связывают с…|болезнями сердца и набором веса|улучшением иммунитета|ростом интеллекта|долголетием|0",
"Главный «мастер-выключатель» часов:|свет|еда|спорт|шум|0",
"Период полураспада кофеина:|около 6 часов|15 минут|2 часа|24 часа|0",
"Что советуют при бессоннице?|встать и почитать скучное в тусклом свете|лежать и бороться|включить яркий свет|выпить кофе|0"]),
];

/* ---------- Экспорт ---------- */
window.PRO_CONTENT = {
  grammar: PRO_GRAMMAR,
  phrasal: PRO_PHRASAL,
  colloc: PRO_COLLOC,
  idioms: typeof PRO_IDIOMS !== 'undefined' ? PRO_IDIOMS : [],
  minimal: typeof PRO_MINIMAL !== 'undefined' ? PRO_MINIMAL : [],
  readings: typeof READINGS !== 'undefined' ? READINGS : [],
};
window.PRO_GRAMMAR = PRO_GRAMMAR;
window.PRO_PHRASAL = PRO_PHRASAL;
window.PRO_COLLOC = PRO_COLLOC;
window.PRO_READINGS = typeof READINGS !== 'undefined' ? READINGS : []; // для «Текста дня»
console.log('content_pro.js: данные готовы — грамматик ' + PRO_GRAMMAR.length +
  ', фразовых ' + PRO_PHRASAL.length + ', коллокаций ' + PRO_COLLOC.length +
  ', чтений ' + (typeof READINGS !== 'undefined' ? READINGS.length : 0));
})();
