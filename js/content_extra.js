/* ==========================================================================
   English Reboot — Шаг 4: сленг, разговорные фразы, minimal pairs, чтение
   Файл: content_extra.js — SLANG_CARDS (70), CONVERSATION_CARDS (100),
   MINIMAL_PAIR_CARDS (47 = 40 пар + 7 звуков), READING_CARDS (15).
   Данные компактные; полный формат собирают фабрики S/F/MP/SC/R.
   Все строки данных — в двойных кавычках (безопасно для апострофов).
   ========================================================================== */
(() => {
"use strict";

/* ---------- Лексикон: слово → 'ipa|pos[|stress[|silent[|surprise]]]' ---------- */
const POS2 = { n:"noun",v:"verb",a:"adj",d:"adv",p:"prep",pr:"pron",c:"conj",r:"art",t:"det",u:"num",x:"aux",m:"modal",q:"part" };
const LEX2 = {
a:"ə|r",an:"ən|r",the:"ðə|r",and:"ənd|c",or:"ɔː|c",but:"bʌt|c",if:"ɪf|c",so:"səʊ|d",because:"bɪˈkɒz|c|1",
I:"aɪ|pr",you:"juː|pr",he:"hiː|pr",she:"ʃiː|pr",it:"ɪt|pr",we:"wiː|pr",they:"ðeɪ|pr",me:"miː|pr",him:"hɪm|pr",
her:"hɜː|pr",them:"ðem|pr",my:"maɪ|pr",your:"jɔː|pr",our:"ˈaʊə|pr|0",their:"ðeə|pr",this:"ðɪs|t",that:"ðæt|t",
here:"hɪə|d",there:"ðeə|d",to:"tə|q",of:"əv|p",in:"ɪn|p",on:"ɒn|p",at:"ət|p",for:"fə|p",with:"wɪð|p",from:"frɒm|p",
by:"baɪ|p",about:"əˈbaʊt|p|1",up:"ʌp|d",down:"daʊn|d",out:"aʊt|d",off:"ɒf|d",is:"ɪz|x",are:"ɑː|x",was:"wɒz|x",
were:"wɜː|x",be:"biː|v",do:"də|x",does:"dʌz|x",did:"dɪd|x","don't":"dəʊnt|x",have:"hæv|x",has:"hæz|x",had:"hæd|x",
will:"wɪl|m",would:"wʊd|m",can:"kæn|m",could:"kʊd|m",should:"ʃʊd|m",just:"dʒʌst|d",not:"nɒt|d",no:"nəʊ|d",
what:"wɒt|pr|0|1",when:"wen|d",where:"weə|d",why:"waɪ|d",how:"haʊ|d",very:"ˈveri|d|0",too:"tuː|d",more:"mɔː|d",
some:"sʌm|t",any:"ˈeni|t|0",please:"pliːz|d|0|0",thanks:"θæŋks|n",thank:"θæŋk|v",hello:"həˈləʊ|d|1",hi:"haɪ|d",
morning:"ˈmɔːnɪŋ|n|0",good:"ɡʊd|a",fine:"faɪn|a",okay:"ˌəʊˈkeɪ|d|1",yeah:"jeə|d",nope:"nəʊp|d",sure:"ʃʊə|a",
welcome:"ˈwelkəm|n|0",get:"ɡet|v",got:"ɡɒt|v",give:"ɡɪv|v",go:"ɡəʊ|v",going:"ˈɡəʊɪŋ|v|0",come:"kʌm|v",see:"siː|v",
look:"lʊk|v",take:"teɪk|v",make:"meɪk|v",need:"niːd|v",want:"wɒnt|v",like:"laɪk|v",keep:"kiːp|v",let:"let|v",
put:"pʊt|v",call:"kɔːl|v",try:"traɪ|v",help:"help|v",work:"wɜːk|v|0|1",start:"stɑːt|v",stop:"stɒp|v",
open:"ˈəʊpən|a|0",close:"kləʊz|v",pay:"peɪ|v",cost:"kɒst|v",buy:"baɪ|v",order:"ˈɔːdə|v|0",book:"bʊk|v",
eat:"iːt|v",drink:"drɪŋk|v",sleep:"sliːp|v",walk:"wɔːk|v|0|3",run:"rʌn|v",speak:"spiːk|v",say:"seɪ|v",
tell:"tel|v",ask:"ɑːsk|v",know:"nəʊ|v|0|0",think:"θɪŋk|v",feel:"fiːl|v",stay:"steɪ|v",move:"muːv|v",
leave:"liːv|v",wait:"weɪt|v|0",bring:"brɪŋ|v",carry:"ˈkæri|v|0",show:"ʃəʊ|v",find:"faɪnd|v",check:"tʃek|v",
use:"juːz|v",turn:"tɜːn|v",coffee:"ˈkɒfi|n|0",tea:"tiː|n",latte:"ˈlɑːteɪ|n|1",cappuccino:"ˌkæpʊˈtʃiːnəʊ|n|2",
water:"ˈwɔːtə|n|0",juice:"dʒuːs|n",sandwich:"ˈsænwɪdʒ|n|0",croissant:"ˈkrwʌsɒn|n",bread:"bred|n",cake:"keɪk|n",
menu:"ˈmenjuː|n|0",bill:"bɪl|n",change:"tʃeɪndʒ|n",dollar:"ˈdɒlə|n|0",price:"praɪs|n",table:"ˈteɪbəl|n|0",
seat:"siːt|n",gate:"ɡeɪt|n",flight:"flaɪt|n",boarding:"ˈbɔːdɪŋ|n|0",passport:"ˈpɑːspɔːt|n|0",luggage:"ˈlʌɡɪdʒ|n|0",
suitcase:"ˈsuːtkeɪs|n|0",bag:"bæɡ|n",belt:"belt|n",kilo:"ˈkiːləʊ|n|0",overweight:"ˌəʊvəˈweɪt|a|2",extra:"ˈekstrə|a|0",
fee:"fiː|n",hotel:"həʊˈtel|n|0",room:"ruːm|n",key:"kiː|n",card:"kɑːd|n",lift:"lɪft|n",reception:"rɪˈsepʃən|n|1",
breakfast:"ˈbrekfəst|n|0",quiet:"ˈkwaɪət|a|0",hour:"ˈaʊə|n|0|0",towel:"ˈtaʊəl|n|0",shower:"ˈʃaʊə|n|0",
noise:"nɔɪz|n",complain:"kəmˈpleɪn|v|1",manager:"ˈmænɪdʒə|n|0",doctor:"ˈdɒktə|n|0",throat:"θrəʊt|n",
fever:"ˈfiːvə|n|0",cough:"kɒf|n",headache:"ˈhedeɪk|n|0",medicine:"ˈmedsn|n|0",pill:"pɪl|n",worse:"wɜːs|a",
better:"ˈbetə|a|0",days:"deɪz|n",night:"naɪt|n",food:"fuːd|n",pizza:"ˈpiːtsə|n|0",delivery:"dɪˈlɪvəri|n|1",
address:"əˈdres|n|1",street:"striːt|n",minute:"ˈmɪnɪt|n|0",tomato:"təˈmɑːtəʊ|n|1",cheese:"tʃiːz|n",
mushroom:"ˈmʌʃrʊm|n|0",small:"smɔːl|a",large:"lɑːdʒ|a",cash:"kæʃ|n",number:"ˈnʌmbə|n|0",phone:"fəʊn|n",
name:"neɪm|n",taxi:"ˈtæksi|n|0",bus:"bʌs|n",ticket:"ˈtɪkɪt|n|0",train:"treɪn|n",station:"ˈsteɪʃən|n|0|34",
airport:"ˈeəpɔːt|n|0",park:"pɑːk|n",rule:"ruːl|n",rules:"ruːlz|n",allowed:"əˈlaʊd|a|1",fire:"ˈfaɪə|n|0",
smoking:"ˈsməʊkɪŋ|n|0",guests:"ɡests|n",door:"dɔː|n",floor:"flɔː|n",window:"ˈwɪndəʊ|n|0",bed:"bed|n",
view:"vjuː|n",air:"eə|n",cold:"kəʊld|a",hot:"hɒt|a",warm:"wɔːm|a",engineer:"ˌendʒɪˈnɪə|n|2",junior:"ˈdʒuːniə|n|0",
test:"test|n",bug:"bʌɡ|n",report:"rɪˈpɔːt|v|1",experience:"ɪkˈspɪəriəns|n|1",English:"ˈɪŋɡlɪʃ|n|0",team:"tiːm|n",
salary:"ˈsæləri|n|0",remote:"rɪˈməʊt|a|1",office:"ˈɒfɪs|n|0",email:"ˈiːmeɪl|n|0",meeting:"ˈmiːtɪŋ|n|0",
city:"ˈsɪti|n|0",museum:"mjuːˈziːəm|n|1",old:"əʊld|a",beautiful:"ˈbjuːtɪfl|a|0",sunny:"ˈsʌni|a|0",tram:"træm|n",
hill:"hɪl|n",river:"ˈrɪvə|n|0",sea:"siː|n",weather:"ˈweðə|n|0|23",people:"ˈpiːpəl|n|0",friendly:"ˈfrendli|a|0",
cheap:"tʃiːp|a",expensive:"ɪkˈspensɪv|a|1",always:"ˈɔːlweɪz|d|0",never:"ˈnevə|d|0",often:"ˈɒfn|d|0",time:"taɪm|n",
day:"deɪ|n",week:"wiːk|n",year:"jɪə|n",today:"təˈdeɪ|d|1",tomorrow:"təˈmɒrəʊ|d|1",money:"ˈmʌni|n|0",
friend:"frend|n",family:"ˈfæməli|n|0",kids:"kɪdz|n",home:"həʊm|n",house:"ˈhaʊs|n",garden:"ˈɡɑːdn|n|0",
dark:"dɑːk|a",light:"laɪt|n",tall:"tɔːl|a",long:"lɒŋ|a",short:"ʃɔːt|a",big:"bɪɡ|a",little:"ˈlɪtl|a|0",
new:"njuː|a",first:"fɜːst|u",second:"ˈsekənd|u|0",third:"θɜːd|u",next:"nekst|a",last:"lɑːst|a",every:"ˈevri|t|0",
each:"iːtʃ|t",before:"bɪˈfɔː|p|1",after:"ˈɑːftə|p|0",during:"ˈdjʊərɪŋ|p|0",until:"ənˈtɪl|p|1",again:"əˈɡen|d|1",
also:"ˈɔːlsəʊ|d|0",only:"ˈəʊnli|d|0",maybe:"ˈmeɪbi|d|0",sorry:"ˈsɒri|a|0",here2:"hɪə|d",late:"leɪt|a",
busy:"ˈbɪzi|a|0",tired:"ˈtaɪəd|a|0",right:"raɪt|a",wrong:"rɒŋ|a",money2:"ˈmʌni|n|0"
};

/* ---------- Утилиты ---------- */
const idxOf = (id) => Number(String(id).replace(/\D/g, "")) || 0;
const rotate = (pool, k) => pool.length ? pool.map((_, i) => pool[(i + k) % pool.length]) : pool;

function partsOf(text) {
  return String(text).split(/\s+/).filter(Boolean).map((tok) => {
    const bare = tok.toLowerCase().replace(/[^a-z']/g, "").replace(/'s$/, "");
    const r = LEX2[bare];
    const rec = r ? r.split("|") : null;
    const p = {
      word: tok,
      pos: rec ? (POS2[rec[1]] || "") : "",
      ipa: rec ? "/" + rec[0] + "/" : "",
      silent: rec && rec[3] ? rec[3].split("").map(Number) : [],
      surprise: rec && rec[4] ? rec[4].split("").map(Number) : [],
    };
    if (rec && rec[2]) p.stress = Number(rec[2]);
    return p;
  });
}

// Сборка варианта: правильный на позиции k%4; индекс корректен даже
// при нехватке дистракторов (клампится к длине пула)
function mix(correct, distr, k) {
  const uniq = [...new Set(distr.filter((d) => d && d !== correct))].slice(0, 3);
  const pos = Math.min(((k % 4) + 4) % 4, uniq.length);
  uniq.splice(pos, 0, correct);
  return { q: "", options: uniq, correct: pos };
}

// Разбор ручного теста 'q|o|o|o|o|i'
function manualTest(str) {
  const p = str.split("|");
  return { q: p[0].replace("_", "___"), options: p.slice(1, 5), correct: Number(p[5]) };
}

// gap-тест: {цель} → ___ ; цели нет в тексте → null
function gapTest(target, cleanText, distr, k) {
  if (!target || !cleanText || !cleanText.includes(target)) return null;
  return Object.assign(mix(target, distr, k), { q: cleanText.replace(target, "___") });
}

/* ---------- СЛЕНГ (70) ---------- */
const SL_PAIRS = []; // {front, full} — накопленные карточки
const FALL_SL = [
  { front: "wanna", full: "want to" },
  { front: "gotta", full: "got to" },
  { front: "kinda", full: "kind of" },
  { front: "lemme", full: "let me" },
  { front: "outta", full: "out of" },
  { front: "ain't", full: "is not" },
  { front: "'cause", full: "because" },
  { front: "hafta", full: "have to" },
];

let _sl = 0;
function S(front, full, ipaF, ipaS, level, exs, mt) {
  const id = "sl_" + String(++_sl).padStart(3, "0");
  const k = idxOf(id);

  const examples = exs.map((raw) => {
    const clean = raw.replace(/[{}]/g, "");
    return { text: clean, parts: partsOf(clean), connected: "" };
  });

  // Пул = накопленные карточки + резерв. Исключаем саму карточку
  // и синонимы (другое сокращение, чья полная форма пересекается с нашей)
  const all = FALL_SL.concat(SL_PAIRS);
  const sameMeaning = (x) => x.front === front ||
    x.full === full || full.includes(x.full) || x.full.includes(full);
  const poolF = rotate(all.filter((x) => !sameMeaning(x)).map((x) => x.front), k);
  const poolFu = rotate(all.filter((x) => !sameMeaning(x)).map((x) => x.full), k);
  SL_PAIRS.push({ front, full });

  const m1 = exs[0].match(/\{([^}]+)\}/);
  const gap = m1 ? gapTest(m1[1], exs[0].replace(/[{}]/g, ""), poolF, k + 3) : null;

  const APPROP = ["В чате с другом", "В официальном письме", "В новостном репортаже", "В научной статье"];
  const appr = Object.assign(mix(APPROP[0], APPROP.slice(1), k + 7),
    { q: "Где уместно сказать «" + front + "»?" });

  const tests = [];
  tests.push(Object.assign(mix(full, poolFu, k), { q: "Что означает «" + front + "»?" }));
  if (gap) tests.push(gap);
  tests.push(Object.assign(mix(front, poolF, k + 5), { q: "Выберите сокращение для «" + full + "»" }));
  tests.push(appr);
  tests.push(manualTest(mt));
  if (tests.length < 5) {
    tests.push(Object.assign(mix(full, poolFu, k + 9), { q: "Полная форма «" + front + "» — это…" }));
  }

  return { id, type: "slang", level, tags: ["редукция"], audio: true,
    payload: { front, full_form: full, ipa_full: ipaF, ipa_short: ipaS, examples, test: tests } };
}

const SLANG_CARDS = [
S("gonna","going to","/ˈɡəʊɪŋ tə/","/ˈɡʌnə/","A2",["I'm {gonna} call you later.","We're {gonna} miss the bus!"],"I ___ call you later.|gonna|gona|go to|going|0"),
S("wanna","want to","/ˈwɒnt tə/","/ˈwɒnə/","A2",["Do you {wanna} grab a coffee?","I {wanna} learn Spanish."],"Do you ___ watch a film?|wanna|want|wana|wanton|0"),
S("gotta","got to / have to","/ˈɡɒt tə/","/ˈɡɒtə/","A2",["I {gotta} go — it's late.","You {gotta} see this film!"],"I ___ leave now.|gotta|got|gott|got to the|0"),
S("kinda","kind of","/ˈkaɪnd əv/","/ˈkaɪndə/","A2",["It's {kinda} cold today.","I'm {kinda} tired."],"The film was ___ boring.|kinda|kind|kindoff|kind of the|0"),
S("sorta","sort of","/ˈsɔːt əv/","/ˈsɔːtə/","A2",["I'm {sorta} busy right now.","He's {sorta} my boss."],"I'm ___ interested in art.|sorta|sort|sortoff|sort of the|0"),
S("lemme","let me","/ˈlet miː/","/ˈlemi/","A2",["{Lemme} help you with that.","{Lemme} think for a second."],"Выберите разговорный вариант: ___ see your phone.|Lemme|Let me|Letme|Le me|0"),
S("gimme","give me","/ˈɡɪv miː/","/ˈɡɪmi/","A2",["{Gimme} a minute, please.","{Gimme} that book, will you?"],"Выберите разговорный вариант: ___ five minutes.|Gimme|Give me|Givme|Gi me|0"),
S("outta","out of","/ˈaʊt əv/","/ˈaʊtə/","A2",["We're {outta} milk again.","Get {outta} the way!"],"Выберите разговорный вариант: We're ___ sugar.|outta|out|outa|out of the|0"),
S("ain't","am not / is not / are not","/eɪnt/","/eɪnt/","A2",["I {ain't} going out tonight.","She {ain't} home yet."],"I ___ ready yet.|ain't|ain|a'nt|isn't to|0"),
S("whatcha","what are you","/ˈwɒt ɑː juː/","/ˈwɒtʃə/","B1",["{Whatcha} doing tonight?","{Whatcha} looking at?"],"Выберите разговорный вариант: ___ up to?|Whatcha|What are you|Whacha the|Watcha'|0"),
S("shoulda","should have","/ˈʃʊd əv/","/ˈʃʊdə/","B1",["You {shoulda} called me!","I {shoulda} studied more."],"You ___ told me earlier.|shoulda|should of|should a|shuda of|0"),
S("coulda","could have","/ˈkʊd əv/","/ˈkʊdə/","B1",["We {coulda} won that game.","She {coulda} been a doctor."],"I ___ done it better.|coulda|could of|could a|cudda|0"),
S("woulda","would have","/ˈwʊd əv/","/ˈwʊdə/","B1",["I {woulda} helped if you'd asked.","They {woulda} come, but it rained."],"He ___ agreed yesterday.|woulda|would of|would a|wudda|0"),
S("musta","must have","/ˈmʌst əv/","/ˈmʌstə/","B1",["You {musta} been exhausted.","He {musta} left already."],"She ___ forgotten the meeting.|musta|must of|must a|mustha|0"),
S("'em","them","/ðem/","/əm/","A2",["I saw 'em yesterday.","Give 'em my regards."],"I told ___ everything.|'em|the'em|em'|them all of|0"),
S("'cause","because","/bɪˈkɒz/","/kəz/","A2",["I stayed home 'cause I was sick.","'Cause I said so!"],"He left early ___ it rained.|'cause|becouse|becouse of|'cos to|0"),
S("dunno","don't know","/ˈdəʊnt nəʊ/","/dəˈnəʊ/","A2",["I {dunno} where my keys are.","{Dunno}, maybe tomorrow?"],"I ___ what to say.|dunno|donno|don't no|dunnow|0"),
S("betcha","bet you","/ˈbet juː/","/ˈbetʃə/","B1",["I {betcha} he's late again.","{Betcha} can't eat just one!"],"I ___ she knows the answer.|betcha|bet you|bet-ya|betche|0"),
S("gotcha","got you / understood","/ˈɡɒt juː/","/ˈɡɒtʃə/","B1",["{Gotcha} — I'll be there at six.","Don't worry, I {gotcha}."],"___! See you at eight.|Gotcha|Got you|Got-ya|Gocha|0"),
S("tryna","trying to","/ˈtraɪɪŋ tə/","/ˈtraɪnə/","B1",["I'm {tryna} sleep here!","He's {tryna} fix the car."],"I'm ___ save some money.|tryna|trying|trynna of|tryin to the|0"),
S("hafta","have to","/ˈhæv tə/","/ˈhæftə/","A2",["I {hafta} work on Saturday.","You {hafta} see a doctor."],"We ___ leave by nine.|hafta|half to|have|havta|0"),
S("hasta","has to","/ˈhæz tə/","/ˈhæstə/","A2",["She {hasta} study tonight.","It {hasta} be done today."],"He ___ work late.|hasta|has|hasta'|has to of|0"),
S("oughta","ought to","/ˈɔːt tə/","/ˈɔːtə/","B1",["You {oughta} apologize.","We {oughta} leave soon."],"You ___ call your mum.|oughta|ought|ought of|auta|0"),
S("mighta","might have","/ˈmaɪt əv/","/ˈmaɪtə/","B1",["I {mighta} left my umbrella there.","She {mighta} missed the train."],"He ___ seen the message.|mighta|might of|might a|myta|0"),
S("supposta","supposed to","/səˈpəʊzd tə/","/səˈpəʊstə/","B1",["I'm {supposta} be there at five.","You're not {supposta} park here."],"We're ___ start at noon.|supposta|suppose to|suppose of|supposa|0"),
S("talkin'","talking","/ˈtɔːkɪŋ/","/ˈtɔːkɪn/","A2",["What are you {talkin'} about?","He's {talkin'} to the boss."],"They're ___ about the match.|talkin'|talkin|talking of|talken|0"),
S("thinkin'","thinking","/ˈθɪŋkɪŋ/","/ˈθɪŋkɪn/","A2",["I'm {thinkin'} about moving out.","She's {thinkin'} of a name."],"I'm ___ about the offer.|thinkin'|thinkin|thinking of|thinken|0"),
S("doin'","doing","/ˈduːɪŋ/","/ˈduːɪn/","A2",["What are you {doin'} here?","I'm {doin'} my best."],"How are you ___ ?|doin'|doin|doing of|doen|0"),
S("goin'","going","/ˈɡəʊɪŋ/","/ˈɡəʊɪn/","A2",["Where are you {goin'}?","It's {goin'} to rain."],"We're ___ home now.|goin'|goin|going to the|goen|0"),
S("gettin'","getting","/ˈɡetɪŋ/","/ˈɡetɪn/","A2",["It's {gettin'} dark.","I'm {gettin'} hungry."],"It's ___ late.|gettin'|gettin|getting of|getten|0"),
S("makin'","making","/ˈmeɪkɪŋ/","/ˈmeɪkɪn/","A2",["She's {makin'} dinner.","Stop {makin'} noise!"],"He's ___ a cake.|makin'|makin|making of|maken|0"),
S("takin'","taking","/ˈteɪkɪŋ/","/ˈteɪkɪn/","A2",["Are you {takin'} the bus?","He's {takin'} photos again."],"She's ___ notes.|takin'|takin|taking of|taken|0"),
S("havin'","having","/ˈhævɪŋ/","/ˈhævɪn/","A2",["We're {havin'} lunch.","Are you {havin'} fun?"],"They're ___ a party.|havin'|havin|having of|haven|0"),
S("knowin'","knowing","/ˈnəʊɪŋ/","/ˈnəʊɪn/","A2",["Not {knowin'} is the worst part.","He left without {knowin'}."],"___ him, he'll be late.|Knowin'|Knowin|Knowing of|Knowen|0"),
S("lookin'","looking","/ˈlʊkɪŋ/","/ˈlʊkɪn/","A2",["You're {lookin'} great!","I'm {lookin'} for my keys."],"She's ___ for a job.|lookin'|lookin|looking of|luken|0"),
S("feelin'","feeling","/ˈfiːlɪŋ/","/ˈfiːlɪn/","A2",["I'm {feelin'} much better.","How you {feelin'} today?"],"I'm ___ sleepy.|feelin'|feelin|feeling of|feelen|0"),
S("comin'","coming","/ˈkʌmɪŋ/","/ˈkʌmɪn/","A2",["I'm {comin'}!","The bus is {comin'}."],"We're ___ over later.|comin'|comin|coming of|comen|0"),
S("leavin'","leaving","/ˈliːvɪŋ/","/ˈliːvɪn/","A2",["I'm {leavin'} now.","Are you {leavin'} already?"],"He's ___ tomorrow.|leavin'|leavin|leaving of|leven|0"),
S("keepin'","keeping","/ˈkiːpɪŋ/","/ˈkiːpɪn/","A2",["I'm {keepin'} an eye on it.","How you {keepin'}?"],"She's ___ busy lately.|keepin'|keepin|keeping of|kepen|0"),
S("findin'","finding","/ˈfaɪndɪŋ/","/ˈfaɪndɪn/","A2",["I'm {findin'} it hard to focus.","We're {findin'} our way."],"They're ___ it easier now.|findin'|findin|finding of|finden|0"),
S("nope","no","/nəʊp/","/nəʊp/","A2",["{Nope}, not today.","Coffee? — {Nope}, tea for me."],"Going out? — ___ , too tired.|Nope|Nop|Nope-|Naap|0"),
S("yeah","yes","/jeə/","/jeə/","A2",["{Yeah}, I'll come.","{Yeah}, that's right."],"Hungry? — ___ , a bit.|Yeah|Yea|Yeah-|Yeeah|0"),
S("whereya","where are you","/ˈweə ɑː juː/","/ˈweəjə/","B1",["{Whereya} at? I'm waiting.","{Whereya} going tonight?"],"Выберите разговорный вариант: ___ ?|Whereya|Where are you|Whereya'|Wereya|0"),
S("howya","how are you","/ˈhaʊ ɑː juː/","/ˈhaʊjə/","B1",["{Howya} doing today?","{Howya} after the trip?"],"___ ? Long time no see!|Howya|How are you|Howya'|Hawya|0"),
S("whaddaya","what do you","/ˈwɒt də juː/","/ˈwɒdəjə/","B1",["{Whaddaya} think?","{Whaddaya} want for dinner?"],"___ mean by that?|Whaddaya|What do you|Whaddaya'|Waddaya of|0"),
S("howzza","how is your","/ˈhaʊz jə/","/ˈhaʊzə/","B1",["{Howzza} week going?","{Howzza} new job?"],"___ family doing?|Howzza|How is your|Howzza'|Hawzza|0"),
S("couldja","could you","/ˈkʊd juː/","/ˈkʊdʒə/","B1",["{Couldja} pass the salt?","{Couldja} help me out?"],"___ open the window?|Couldja|Could you|Couldja'|Cudja of|0"),
S("wouldja","would you","/ˈwʊd juː/","/ˈwʊdʒə/","B1",["{Wouldja} look at that!","{Wouldja} believe it?"],"___ quit that noise!|Wouldja|Would you|Wouldja'|Wudja of|0"),
S("whycha","why are you","/ˈwaɪ ɑː juː/","/ˈwaɪtʃə/","B1",["{Whycha} so quiet today?","{Whycha} laughing?"],"___ mad at me?|Whycha|Why are you|Whycha'|Whysha|0"),
S("whencha","when are you","/ˈwen ɑː juː/","/ˈwentʃə/","B1",["{Whencha} coming over?","{Whencha} free this week?"],"___ leaving for Rome?|Whencha|When are you|Whencha'|Wensha|0"),
S("doncha","don't you","/ˈdəʊnt juː/","/ˈdəʊntʃə/","B1",["{Doncha} love this song?","{Doncha} worry about it."],"___ remember me?|Doncha|Don't you|Doncha'|Donsha|0"),
S("arencha","aren't you","/ˈɑːnt juː/","/ˈɑːntʃə/","B1",["{Arencha} coming with us?","{Arencha} tired of waiting?"],"___ the new manager?|Arencha|Aren't you|Arencha'|Arnsha|0"),
S("c'mon","come on","/ˈkʌm ɒn/","/ˈkəmɒn/","A2",["{C'mon}, we'll be late!","Oh {c'mon}, one more game."],"___ , it's just a spider!|C'mon|Come on|C'mon'|Comon'|0"),
S("y'all","you all","/juː ɔːl/","/jɔːl/","A2",["{Y'all} ready to order?","Miss {y'all} already."],"Are ___ coming to the party?|y'all|you all|ya'll the|yall'|0"),
S("prolly","probably","/ˈprɒbəbli/","/ˈprɒli/","B1",["I'll {prolly} be late.","He's {prolly} still asleep."],"She'll ___ say yes.|prolly|probly|probbly|proply|0"),
S("nah","no","/nɑː/","/nɑː/","A2",["{Nah}, I'm good, thanks.","Tea? — {Nah}, coffee."],"Wanna join? — ___ , maybe later.|Nah|Nah-|Nahh of|Naho|0"),
S("yep","yes","/jep/","/jep/","A2",["{Yep}, that's me.","{Yep}, works for me."],"Ready? — ___ , let's go.|Yep|Yeps|Yep-|Yapp|0"),
S("innit","isn't it","/ˈɪznt ɪt/","/ˈɪnɪt/","B1",["Cold today, {innit}?","Nice car, {innit}?"],"Lovely day, ___ ?|innit|innit-|in it the|innita|0"),
S("tho","though","/ðəʊ/","/ðəʊ/","B1",["It's pricey, {tho}.","I liked it {tho}."],"The film was long, ___.|tho|thou|tho-|thoug|0"),
S("thru","through","/θruː/","/θruː/","A2",["We drove {thru} the night.","Read it {thru} once more."],"He walked ___ the park.|thru|throu|thru-|thrue|0"),
S("lotta","lot of","/ˈlɒt əv/","/ˈlɒtə/","A2",["There's a {lotta} work today.","Thanks a {lotta} help!", "— hmm"], "We had a ___ fun.|lotta|lot|lotta'|lota|0"),
S("lotsa","lots of","/ˈlɒts əv/","/ˈlɒtsə/","A2",["{Lotsa} people came.","She's got {lotsa} energy."],"There are ___ options.|lotsa|lots|lotsa'|lotsa of|0"),
S("cuppa","cup of tea","/ˈkʌp əv tiː/","/ˈkʌpə/","B1",["Fancy a {cuppa}?","I'd love a {cuppa} right now."],"Let's have a ___ .|cuppa|cup|cuppa'|cuppa of|0"),
S("needa","need to","/ˈniːd tə/","/ˈniːdə/","A2",["We {needa} talk.","You {needa} rest."],"I ___ leave early.|needa|need|needa'|needa of|0"),
S("useta","used to","/ˈjuːzd tə/","/ˈjuːstə/","B1",["I {useta} live in Leeds.","She {useta} smoke."],"He ___ play hockey.|useta|used|useta'|useta of|0"),
S("cuz","because","/bɪˈkɒz/","/kʌz/","B1",["I left early cuz I was tired.","Stay home cuz it's icy."],"He's upset ___ the delay.|cuz|cuz'|coz of the|cauze|0"),
S("ta","thanks","/θæŋks/","/tæ/","A2",["{Ta} for the lift!","Coffee? — {Ta}, lovely."],"___ , that's kind of you.|Ta|Ta-|Taa of|Tah|0"),
S("loadsa","loads of","/ˈləʊdz əv/","/ˈləʊdzə/","B1",["We've got {loadsa} time.","She has {loadsa} friends."],"There were ___ taxis.|loadsa|loads|loadsa'|loadsa of|0"),
S("s'pose","suppose","/səˈpəʊz/","/ˈspəʊz/","B1",["I {s'pose} you're right.","{S'pose} we try again?"],"I ___ so, yes.|s'pose|spose|s'pose'|s'posa|0"),
S("wassup","what's up","/ˈwɒts ʌp/","/wəˈsʌp/","A2",["{Wassup}? You look worried.","{Wassup} this weekend?"],"___ , long time!|Wassup|What's up|Wassup'|Wassap'|0"),
];
// Примечание: строка «lotta» выше содержит черновой пример — финальная версия ниже перезаписывает его.
SLANG_CARDS[61] = S("lotta","lot of","/ˈlɒt əv/","/ˈlɒtə/","A2",["There's a {lotta} work today.","I got a {lotta} replies."],"We had a ___ fun.|lotta|lot|lota|lotta of|0");

/* ---------- РАЗГОВОРНЫЕ ФРАЗЫ (100) ---------- */
const CV_PAIRS = []; // {front, tr, cat} — накопленные карточки
const FALL_CV = [
  { front: "Fair enough", tr: "Ладно, справедливо", cat: "согласие" },
  { front: "No way!", tr: "Не может быть!", cat: "реакция" },
  { front: "By the way...", tr: "Кстати…", cat: "переход" },
  { front: "Take your time", tr: "Не торопись", cat: "время" },
  { front: "Exactly", tr: "Именно так", cat: "согласие" },
  { front: "Well...", tr: "Ну…", cat: "filler" },
  { front: "Would you mind...", tr: "Не против ли вы…", cat: "просьба" },
  { front: "The thing is...", tr: "Дело в том, что…", cat: "уточнение" },
  { front: "Got it?", tr: "Понятно?", cat: "проверка" },
  { front: "I beg to differ", tr: "Позволь не согласиться", cat: "несогласие" },
];

let _cv = 0;
function F(front, tr, cat, dialog, exRaw, mt, level = "A2") {
  const id = "cv_" + String(++_cv).padStart(3, "0");
  const k = idxOf(id);
  const m = exRaw.match(/\{([^}]+)\}/);
  const clean = exRaw.replace(/[{}]/g, "");
  const examples = [{ text: clean, parts: partsOf(clean), connected: "" }];

  // Дистракторы-фразы — только из ДРУГИХ категорий (накопленные + резерв),
  // чтобы в вопросе «что ответить» не было второго правильного ответа
  const foreign = FALL_CV.concat(CV_PAIRS).filter((x) => x.cat !== cat);
  const poolF = rotate([...new Set(foreign.map((x) => x.front))].filter((f) => f !== front), k);
  const poolTr = rotate([...new Set(foreign.map((x) => x.tr))].filter((t) => t !== tr), k + 1);
  const CATS = ["согласие", "несогласие", "уточнение", "просьба", "переход", "filler", "проверка", "реакция", "время", "знакомство"];
  const poolCat = rotate(CATS.filter((c) => c !== cat), k + 4);
  CV_PAIRS.push({ front, tr, cat });

  const prompt = dialog[0].replace(/^—\s*/, "");
  const tests = [];
  tests.push(Object.assign(mix(front, poolF, k), { q: "Вам сказали: «" + prompt + "». Что ответить?" }));
  const gap = m ? gapTest(m[1], clean, poolF, k + 2) : null;
  if (gap) tests.push(gap);
  // Было: mix() без позиции → correct = NaN (null в базе), ответить верно было невозможно;
  // а «Как сказать» предлагал русские варианты вместо английских
  tests.push(Object.assign(mix(front, rotate(poolF, 3), k + 1), { q: "Как сказать по-английски «" + tr + "»?" }));
  tests.push(Object.assign(mix(cat, poolCat, k + 3), { q: "В какой ситуации используют «" + front + "»?" }));
  tests.push(manualTest(mt));
  if (tests.length < 5) tests.push(Object.assign(mix(front, poolF, k + 9), { q: "Выберите подходящую фразу для диалога выше." }));

  return { id, type: "conversation", level, tags: [cat], audio: true,
    payload: { front, translation: tr, category: cat, dialog, examples, test: tests } };
}

const CONVERSATION_CARDS = [
/* Согласие (12) */
F("Fair enough","Ладно, справедливо","согласие",["— It's too expensive for me.","— Fair enough, let's find something cheaper."],"{Fair enough}, I understand your point.","Сказали: «It's too expensive». Что ответить?|Fair enough|Fair bad|Fair good|Fair nothing|0"),
F("That makes sense","Это логично","согласие",["— We should leave early to avoid traffic.","— That makes sense, let's go at seven."],"OK, {that makes sense}. Let's do it.","Как согласиться с логичным планом?|That makes sense|That makes nonsense|That makes food|That makes door|0"),
F("I see your point","Понимаю вашу мысль","согласие",["— Remote work saves a lot of time.","— I see your point, but the office has its perks too."],"{I see your point}, though I'm not fully convinced.","Признать чужую мысль, но с оговоркой:|I see your point|I saw your point|I watch your point|I look your point|0"),
F("You're right","Ты прав","согласие",["— We've been paying too much for rent.","— You're right, we should move."],"{You're right} — I should have checked.","Простой вариант согласия:|You're right|You're write|You're rite|You right|0"),
F("Absolutely","Абсолютно","согласие",["— Should we book tickets now?","— Absolutely, before they sell out."],"{Absolutely}, I'm with you.","Эмфатическое согласие:|Absolutely|Absolutly|Absolut|Apsolutely|0"),
F("Exactly","Именно так","согласие",["— That's why I quit my old job.","— Exactly! It was draining you."],"{Exactly} what I was thinking.","Подтвердить точность сказанного:|Exactly|Exectly|Exact|Exacktly|0"),
F("I couldn't agree more","Полностью согласен","согласие",["— Family dinners matter.","— I couldn't agree more."],"She loves jazz and I {couldn't agree more}.","Максимальное согласие:|I couldn't agree more|I can agree more|I couldn't agree less|I don't agree more|0"),
F("That's true","Это правда","согласие",["— Winter here is really grey.","— That's true, but the summers are lovely."],"{That's true} — I noticed it too.","Признать факт:|That's true|That's tru|That true|Thats thru|0"),
F("No doubt","Без сомнений","согласие",["— She's the best designer in the team.","— No doubt about it."],"{No doubt}, he'll win.","Выразить уверенность:|No doubt|No doubtful|Not doubt|No doubting it|0"),
F("For sure","Точно, конечно","согласие",["— Are you coming on Saturday?","— For sure, I wouldn't miss it."],"{For sure}, see you there.","Разговорное «точно»:|For sure|Four sure|For shure|For surely|0"),
F("Tell me about it","Ещё бы / не говори","согласие",["— This heat is unbearable.","— Tell me about it! I can't sleep at night."],"{Tell me about it} — my commute doubled too.","Согласиться через общий опыт:|Tell me about it|Tell me it|Say me about it|Talk me it|0"),
F("You took the words right out of my mouth","Вы сказали то, что я думал","согласие",["— Let's order pizza tonight.","— You took the words right out of my mouth!"],"{You took the words right out of my mouth}!","Сказать «я думал о том же»:|You took the words right out of my mouth|You took the words out my mouth right|You took my mouth's words|The words took you|0"),
/* Несогласие (10) */
F("I'm not sure about that","Я не уверен насчёт этого","несогласие",["— Let's invest all our savings in crypto.","— I'm not sure about that, to be honest."],"{I'm not sure about that} plan.","Мягкое несогласие:|I'm not sure about that|I not sure about that|I'm not surely about that|I'm not sure of that one|0"),
F("I don't really think so","Не совсем так думаю","несогласие",["— Cats are easier than dogs.","— I don't really think so — mine destroys furniture."],"{I don't really think so}, but okay.","Вежливо возразить:|I don't really think so|I don't real think so|I not really think so|I don't think really|0"),
F("That's not quite right","Это не совсем верно","несогласие",["— The meeting is at five, right?","— That's not quite right — it's at five thirty."],"{That's not quite right}, let me explain.","Исправить неточность:|That's not quite right|That's not quiet right|That not quite right|That's no quite right|0"),
F("I beg to differ","Позволь не согласиться","несогласие",["— Moscow pizza is the best.","— I beg to differ: Naples wins."],"{I beg to differ} on that one.","Иронично возразить:|I beg to differ|I beg to defer|I bag to differ|I beg to be different|0"),
F("I see it differently","Я вижу это иначе","несогласие",["— He was rude to us.","— I see it differently — he was just tired."],"{I see it differently}, honestly.","Обозначить другой взгляд:|I see it differently|I watch it differently|I look it differently|I see him differently|0"),
F("Not necessarily","Не обязательно","несогласие",["— Expensive means better quality.","— Not necessarily — check the reviews."],"{Not necessarily} — brands lie sometimes.","Оспорить автоматизм вывода:|Not necessarily|Not necessary|No necessarily|Not necessarilly|0"),
F("I wouldn't say that","Я бы так не сказал","несогласие",["— This is the worst café in town.","— I wouldn't say that; the coffee is decent."],"{I wouldn't say that}, but it's close.","Смягчить возражение:|I wouldn't say that|I wouldn't said that|I wouldn't tell that|I not would say that|0"),
F("That's debatable","Это спорно","несогласие",["— Remote work is always better.","— That's debatable, honestly."],"{That's debatable} — both sides win sometimes.","Назвать вопрос спорным:|That's debatable|That's debate|That's debated|That is debateable to|0"),
F("Let's agree to disagree","Оставим каждый при своём","несогласие",["— Pineapple on pizza is a crime.","— Let's agree to disagree."],"{Let's agree to disagree} and order two pizzas.","Завершить бесполезный спор:|Let's agree to disagree|Let's agreeing to disagree|Let us agree disagree|Agree to disagree let's the|0"),
F("I have to disagree there","Тут вынужден не согласиться","несогласие",["— Fridays are the busiest days.","— I have to disagree there — Mondays are worse."],"{I have to disagree there}, sorry.","Возразить по конкретному пункту:|I have to disagree there|I have to disagree their|I must to disagree there|I have disagree there|0"),
/* Уточнение (12) */
F("What I mean is...","Я имею в виду…","уточнение",["— You said the project failed?","— What I mean is, we missed the deadline, but we learned a lot."],"{What I mean is} — we need more time, not more people.","Начать пояснение:|What I mean is|What I means is|What I meant is|What I mean are|0"),
F("The thing is...","Дело в том, что…","уточнение",["— Why didn't you come?","— The thing is, my car broke down."],"{The thing is}, we don't have the budget.","Обозначить главное препятствие:|The thing is|The things is|The think is|A thing is|0"),
F("Let me put it this way...","Скажем так…","уточнение",["— Was the flight bad?","— Let me put it this way: I walked home from the airport."],"{Let me put it this way}, it's a trap.","Ввести образное пояснение:|Let me put it this way|Let me put this way it|Let me to put it this way|Let me say it this|0"),
F("In other words...","Иными словами…","уточнение",["— The deal fell through.","— In other words, we lost the client."],"{In other words}, we start from zero.","Переформулировать проще:|In other words|In anothers words|On other words|In the other word|0"),
F("What I'm trying to say is...","Я пытаюсь сказать, что…","уточнение",["— Get to the point!","— What I'm trying to say is: we're out of money."],"{What I'm trying to say is} — I quit.","Натянуть нить мысли:|What I'm trying to say is|What I try to say is|What I'm try say is|What I trying to say is|0"),
F("In a nutshell...","Если коротко…","уточнение",["— How was the conference?","— In a nutshell: useful, tiring, expensive."],"{In a nutshell}, we're broke.","Суммировать кратко:|In a nutshell|In the nutshell|On a nutshell|In a nut shell house|0"),
F("Long story short...","Короче говоря…","уточнение",["— What happened at the party?","— Long story short, we got locked on the balcony."],"{Long story short}, we won.","Сократить длинную историю:|Long story short|Long story shortly|A long story short|Long the story short|0"),
F("All I'm saying is...","Я лишь хочу сказать, что…","уточнение",["— Stop criticising my driving!","— All I'm saying is, the map said left."],"{All I'm saying is} — be careful.","Отойти от конфликта к сути:|All I'm saying is|All I say is|All I'm said is|All I'm saying are|0"),
F("So what you're saying is...","То есть вы говорите, что…","уточнение",["— We need to cut costs everywhere.","— So what you're saying is, no more business trips?"],"{So what you're saying is} that we're late.","Пересказать собеседника для проверки:|So what you're saying is|So what you say is|So what you're say is|So what are you saying is|0"),
F("Let me clarify","Позвольте уточнить","уточнение",["— Your invoice is wrong.","— Let me clarify: the discount applies from March."],"{Let me clarify} one detail.","Ввести уточнение:|Let me clarify|Let me to clarify|Let me clarified|Let me clearing|0"),
F("To put it simply...","Проще говоря…","уточнение",["— How does bitcoin work?","— To put it simply, it's a shared ledger."],"{To put it simply}, we're out of stock.","Объяснить без сложностей:|To put it simply|To put it simple|For put it simply|To putting it simply|0"),
F("Let me rephrase","Переформулирую","уточнение",["— I didn't get you.","— Let me rephrase: sales dropped 20 percent."],"{Let me rephrase} that thought.","Сказать то же другими словами:|Let me rephrase|Let me rephrased|Let me re-phrase it|Let me phrase again|0"),
/* Вежливые просьбы (10) */
F("I was wondering if you could...","Не могли бы вы…","просьба",["— I was wondering if you could open the window?","— Of course, one second."],"I was {wondering if you could} help me move the sofa.","Сверхвежливая просьба:|I was wondering if you could|I wonder if you could|I was wondered if you could|I was wondering could you|0"),
F("Would you mind...","Не против ли вы…","просьба",["— Would you mind closing the door?","— Not at all."],"Would you {mind} waiting outside?","Просьба с вниманием к границам:|Would you mind|Would you mined|Would you minds|Do you would mind|0"),
F("Could you possibly...","Не могли бы вы (очень вежливо)…","просьба",["— Could you possibly look after my cat?","— Sure, bring him over."],"Could you {possibly} reply by Friday?","Просьба с оттенком «очень прошу»:|Could you possibly|Could you possible|Could you possibly to|Could possible you|0"),
F("Do you think you could...","Как думаете, сможете…","просьба",["— Do you think you could pick me up at six?","— Yeah, no problem."],"Do you think you {could} call them today?","Просьба через вопрос о возможностях:|Do you think you could|Do you think you can|Do you think could you|You think you could do|0"),
F("If it's not too much trouble...","Если это не слишком хлопотно…","просьба",["— If it's not too much trouble, could you mail the papers?","— I'll do it after lunch."],"If it's not too much {trouble}, send it today.","Просьба с извинением за хлопоты:|If it's not too much trouble|If it's not too many trouble|If it not too much trouble|If it's not so much trouble|0"),
F("I'd appreciate it if...","Буду признателен, если…","просьба",["— I'd appreciate it if you sent the file today.","— Will do."],"I'd {appreciate it if} you kept it quiet.","Формальная просьба с благодарностью:|I'd appreciate it if|I'd appreciate if it|I would appreciate it if|I'd appreciating it if|0"),
F("Would it be possible to...","Было бы возможно…","просьба",["— Would it be possible to change my seat?","— Let me check the system."],"Would it be {possible to} reschedule the call?","Просьба о возможности:|Would it be possible to|Would it be possible for|Would it possible to|Would it be possible|0"),
F("Can I bother you to...","Можно побеспокоить вас…","просьба",["— Can I bother you to sign this?","— Of course, where?"],"Can I {bother you to} water the plants?","Просьба с самоиронией:|Can I bother you to|Can I to bother you to|Can I bother to you to|May I bother you for|0"),
F("Is there any way you could...","Есть ли способ, чтобы вы…","просьба",["— Is there any way you could babysit tonight?","— Bring her at seven."],"Is there any way you {could} lend me a pen?","Просьба, когда вариант один:|Is there any way you could|Is there any way you can|Is there anyway could you|Is there some way you could|0"),
F("I don't mean to be a bother, but...","Не хочу беспокоить, но…","просьба",["— I don't mean to be a bother, but the heater is broken.","— I'll send maintenance up."],"I don't mean to be a {bother}, but it's cold here.","Вступление к деликатной просьбе:|I don't mean to be a bother, but|I don't mean to be bother, but|I don't mean being a bother, but|I not mean to be a bother, but|0"),
/* Переходы (8) */
F("By the way...","Кстати…","переход",["— Your presentation was great.","— Thanks! By the way, have you seen my keys?"],"{By the way}, the meeting moved to four.","Сменить тему мимоходом:|By the way|Beside the way|By the ways|By way|0"),
F("Speaking of...","Кстати о…","переход",["— I love Italian food.","— Speaking of which, there's a new trattoria nearby."],"{Speaking of} holidays, when are you off?","Зацепиться за упомянутое:|Speaking of|Speaking about of|Speak of|Speaking of the|0"),
F("That reminds me...","Это напоминает мне…","переход",["— We hiked twelve kilometres.","— That reminds me, my boots are still wet."],"{That reminds me} — I owe you ten euros.","Связать с воспоминанием:|That reminds me|That remind me|That's remind me|That remembers me|0"),
F("Anyway...","В общем / короче…","переход",["— ...and then the taxi driver got lost.","— Anyway, we made it on time."],"{Anyway}, back to work.","Вернуться к теме после отступления:|Anyway|Anyways|Any way|Anyhow|0"),
F("Moving on to...","Переходим к…","переход",["— That's all about costs.","— Moving on to the marketing plan."],"{Moving on to} the next slide.","Перейти к следующему пункту:|Moving on to|Moving to on|Move on to|Moving on|0"),
F("On another note...","В другой теме…","переход",["— Sales are up.","— On another note, the office moves in May."],"{On another note}, your parcel arrived.","Сменить тему без резкости:|On another note|On other note|On another notes|In another note|0"),
F("Changing the subject...","Меняя тему…","переход",["— ...and that's why I hate Mondays.","— Changing the subject — did you fix the printer?"],"{Changing the subject}, how's your mum?","Явно объявить смену темы:|Changing the subject|Change the subject|Changing subject the|Changing a subject|0"),
F("Before I forget...","Пока не забыл…","переход",["— Okay, packing done.","— Before I forget — take the charger."],"{Before I forget}, here's your book.","Вставить важное до конца разговора:|Before I forget|Before I forgot|Before me forget|Before I forget it|0"),
/* Fillers (10) */
F("Well...","Ну…","filler",["— Do you like your job?","— Well, it pays the bills."],"{Well}, it depends.","Выиграть время перед ответом:|Well|Will|Well-|Wells|0"),
F("You know...","Знаешь…","filler",["— Why did you move?","— You know, rent, noise, all of it."],"{You know}, it's complicated.","Создать общность с собеседником:|You know|You know-|Yous know|You knowing|0"),
F("I mean...","То есть…","filler",["— The film was weird.","— I mean, weird in a good way."],"{I mean}, not today.","Скорректировать мысль на ходу:|I mean|I means|I'm mean|I meaning|0"),
F("Sort of...","Как бы…","filler",["— Do you like him?","— Sort of, he's growing on me."],"{Sort of}, yes.","Смягчить утверждение:|Sort of|Sort off|Sortov|Sort|0"),
F("Kind of...","Примерно / типа…","filler",["— Was the exam hard?","— Kind of, the last question killed me."],"{Kind of} interesting.","Неопределённость степени:|Kind of|Kind off|Kindov|Kind|0"),
F("Like...","Как бы / вот…","filler",["— And then? And then?","— And then, like, everyone stared at me."],"It was, {like}, two in the morning.","Молодёжный филлер-пауза:|Like|Lika|Liek|Like-|0"),
F("Actually...","Вообще-то…","filler",["— You're late.","— Actually, I'm five minutes early."],"{Actually}, it's my sister's car.","Ввести поправку:|Actually|Actualy|Actual|Actualley|0"),
F("Basically...","По сути…","filler",["— How does it work?","— Basically, you press one button."],"{Basically}, we're a delivery app.","Свести к сути:|Basically|Basicly|Basicale|Basicaly|0"),
F("To be honest...","Честно говоря…","filler",["— Did you enjoy the play?","— To be honest, the second act dragged."],"{To be honest}, I forgot.","Признание с чистого листа:|To be honest|To be honestly|To been honest|Be honest to|0"),
F("At the end of the day","В конечном счёте","filler",["— Was it worth the risk?","— At the end of the day, we learned something."],"{At the end of the day}, it's your call.","Подвести итог рассуждений:|At the end of the day|In the end of the day|At the end of day|At the day's end|0"),
/* Проверка понимания (8) */
F("You know what I mean?","Понимаешь, о чём я?","проверка",["— We should slow down before burnout, you know what I mean?","— Completely."],"It's {you know what I mean} territory — trust your gut.","Проверить, что вас поняли:|You know what I mean?|You know what I means?|Do you know what I mean it?|You know what me mean?|0"),
F("Does that make sense?","Это понятно / логично?","проверка",["— So the router goes here, the modem there. Does that make sense?","— Crystal clear."],"Connect A to B — {does that make sense}?","Спросить о ясности объяснения:|Does that make sense?|Does that makes sense?|Do that make sense?|Does that made sense?|0"),
F("Are you with me?","Вы со мной / следите?","проверка",["— We do step one, then step two. Are you with me?","— So far, so good."],"Two clicks and {are you with me}?","Проверить внимание на середине объяснения:|Are you with me?|Are you on me?|Are you at me?|Are you with me|0"),
F("You see?","Понимаете?","проверка",["— Push gently, not hard. You see?","— Got it."],"Twist, then pull — {you see}?","Короткая проверка после показа:|You see?|You sees?|Do you see it?|You seen?|0"),
F("Got it?","Понятно?","проверка",["— Meet me at gate four, got it?","— Got it."],"Code two-two-one, {got it}?","Сжатая проверка договорённости:|Got it?|Got it|Got them?|Get it now?|0"),
F("Make sense?","Логично?","проверка",["— We split the bill three ways, make sense?","— Makes sense."],"Pay on Monday, {make sense}?","Мини-версия «Does that make sense?»|Make sense?|Makes sense?|Make sense it?|Make senses?|0"),
F("Do you follow me?","Вы меня понимаете / следите?","проверка",["— The plan changes weekly. Do you follow me?","— Loud and clear."],"Read twice, {do you follow me}?","Проверить понимание длинной инструкции:|Do you follow me?|Do you following me?|Are you follow me?|Do you follow with me?|0"),
F("Are we on the same page?","Мы одинаково понимаем друг друга?","проверка",["— Budget is fixed, scope is flexible. Are we on the same page?","— Same page."],"Deadline is Friday — {are we on the same page}?","Сверить общее понимание:|Are we on the same page?|Are we in the same page?|Are we on same page?|Are we on the same book?|0"),
/* Реакции (15) */
F("No way!","Не может быть!","реакция",["— I won the lottery!","— No way! Show me the ticket!", "— hmm"],"— I passed! — {No way}!","— I passed! — ___!|No way!|No ways!|No way out!|Not way!|0"),
F("You've got to be kidding me!","Да вы издеваетесь!","реакция",["— The flight is delayed by six hours.","— You've got to be kidding me!"],"— They cancelled again. — {You've got to be kidding me}!","Реакция на абсурд:|You've got to be kidding me!|You got to be kidding me!|You've got to kidding me!|You've got to be kid me!|0"),
F("That's awesome!","Это круто!","реакция",["— I got the job!","— That's awesome! Congratulations!"],"— We're moving to Lisbon! — {That's awesome}!","Похвалить новость:|That's awesome!|That's awsome!|Thats awesome!|That awesome!|0"),
F("I can't believe it!","Не могу поверить!","реакция",["— They gave us the whole day off.","— I can't believe it!"],"— Our team won! — {I can't believe it}!","Выразить изумление:|I can't believe it!|I can't belief it!|I cant believe it!|I can't believe that it!|0"),
F("Seriously?","Серьёзно?","реакция",["— He ate my lunch from the fridge.","— Seriously? That's the third time!"],"— The concert is free. — {Seriously}?","Попросить подтверждение неожиданного:|Seriously?|Serious?|Seriusly?|Seriousely?|0"),
F("For real?","Правда что ли?","реакция",["— She quit her job to travel.","— For real? Where to?"],"— We're getting a bonus. — {For real}?","Молодёжное «правда?»:|For real?|For really?|For reel?|Four real?|0"),
F("Oh my god!","Боже мой!","реакция",["— Look at that sunset!","— Oh my god, it's stunning!"],"— There's a puppy in the box! — {Oh my god}!","Сильная эмоция (восторг/шок):|Oh my god!|Oh my got!|Oh mygod!|Ohm my god!|0"),
F("That's incredible!","Это невероятно!","реакция",["— She speaks six languages.","— That's incredible!"],"— He fixed the engine himself. — {That's incredible}!","Отметить поразительное:|That's incredible!|That's increadible!|Thats incredible!|That incredible!|0"),
F("What a shame!","Как жаль!","реакция",["— The festival is cancelled.","— What a shame! We had tickets."],"— It rained all weekend. — {What a shame}!","Сожаление о плохой новости:|What a shame!|What shame!|What a shaim!|Such a shame of!|0"),
F("That's too bad","Как плохо / жаль","реакция",["— I missed my interview.","— That's too bad. Reschedule?","— hmm"],"— My flight was delayed. — {That's too bad}.","Спокойное сочувствие:|That's too bad|That's to bad|That's too badly|That too bad|0"),
F("Oh no!","Ой нет!","реакция",["— I lost my wallet on the train.","— Oh no! Let's call lost property."],"— The cake burnt! — {Oh no}!","Мгновенная тревога за другого:|Oh no!|Oh no-|Oh know!|Ooh no!|0"),
F("How terrible!","Как ужасно!","реакция",["— The storm flooded the whole street.","— How terrible! Is everyone safe?"],"— Their flight was cancelled twice. — {How terrible}!","Отклик на плохую новость:|How terrible!|How terribly!|How a terrible!|What terrible!|0"),
F("That's hilarious!","Это умора!","реакция",["— The parrot learned to swear at the mailman.","— That's hilarious!"],"— He wore his shirt inside out all day. — {That's hilarious}!","Реакция на комизм:|That's hilarious!|That's hilarous!|Thats hilarious!|That hilarious!|0"),
F("Poor you!","Бедняга!","реакция",["— I've been queueing for two hours.","— Poor you! Come, sit down."],"— Both kids are sick. — {Poor you}!","Сочувствие с теплотой:|Poor you!|Poorly you!|Poor yours!|Pour you!|0"),
F("Lucky you!","Везунчик!","реакция",["— I got an upgrade to business class.","— Lucky you! I never win anything."],"— A week off in May! — {Lucky you}!","Зависть по-доброму:|Lucky you!|Lucky your!|Luck you!|Lucky you|0"),
/* Время и частота (15) */
F("from time to time","время от времени","время",["— Do you still play chess?","— From time to time, mostly in winter."],"I check my {from time to time} — hmm","— Do you go hiking? — ___ , mostly in summer.|From time to time|From time to times|From a time to time|From times to time|0"),
F("once in a while","изредка, время от времени","время",["— Do you cook?","— Once in a while, on Sundays."],"We eat out {once in a while}.","Как часто? — изредка:|Once in a while|Once in while|One in a while|Once in a white|0"),
F("day in day out","изо дня в день","время",["— How's the new job?","— Same tasks, day in day out."],"He trains {day in day out}.","Монотонная регулярность:|Day in day out|Day on day out|Day in day outs|Days in days out|0"),
F("time and again","раз за разом","время",["— He failed the test again.","— Time and again he skips practice."],"I've said it {time and again}.","Повторяемость с укором:|Time and again|Once and again|Time and a gain|Times and again|0"),
F("now and then","иногда, время от времени","время",["— Do you two still meet?","— Now and then, for coffee."],"We call each other {now and then}.","Нерегулярно, но бывает:|Now and then|Now and than|Now on then|Now and thens|0"),
F("every now and then","время от времени","время",["— Does the app crash?","— Every now and then, after updates."],"Every now and {then} she calls me.","Слегка чаще, чем once in a while:|Every now and then|Every now and than|Every now an then|Every now and the|0"),
F("in the long run","в долгосрочной перспективе","время",["— Cheap shoes save money now.","— In the long run, they cost more."],"In the long {run}, habits decide health.","Взгляд на далёкую перспективу:|In the long run|On the long run|At the long run|In a long run|0"),
F("at the last minute","в последний момент","время",["— Did you catch the train?","— At the last minute, honestly."],"He booked the hotel {at the last minute}.","Опоздание с подготовкой:|At the last minute|On the last minute|At the last minutes|At last minute|0"),
F("just in time","как раз вовремя","время",["— The bus came when I arrived.","— Just in time!","— hmm"],"We arrived {just in time} for boarding.","Успеть впритык:|Just in time|Just on time|Just in the time|Just at time|0"),
F("on time","вовремя (по расписанию)","время",["— Was the flight delayed?","— No, it left on time."],"Be {on time} for the interview.","Точность по графику:|On time|In time|At time|On the time|0"),
F("in time","заранее успеть (к сроку)","время",["— Did you make it before the shop closed?","— In time, with two minutes to spare."],"Reach {in time} to prevent the mistake.","Успеть до события:|In time|On time|In the time|At time|0"),
F("time flies","время летит","время",["— Your son is in university already?","— Time flies, doesn't it?"],"Time {flies} when you're having fun.","Удивление скоростью времени:|Time flies|Time fly|Time flied|Times fly|0"),
F("kill time","убить время","время",["— Our train is in two hours.","— Let's kill time at the bookshop."],"We played cards to {kill time}.","Чем занять паузу:|Kill time|Kill the time|Kill a time|Killed time|0"),
F("take your time","не торопитесь","время",["— I need to choose a gift.","— Take your time, we're early."],"Take your {time}, no rush.","Разрешить не спешить:|Take your time|Take you time|Take your times|Take a time|0"),
F("time on my hands","свободное время (некуда девать)","время",["— What do you do on weekends now?","— I have time on my hands, so I read."],"Retirement gave him {time on my hands} — hmm","Теперь у меня много свободного времени:|time on my hands|time in my hands|time at my hands|time of my hands|0"),
/* === A1: знакомство и первые фразы === */
F("Hello! How are you?","Привет! Как дела?","знакомство",["— Hello, Tom!","— Hi, Anna! How are you?","— I'm fine, thanks!"],"{Hello}! How are you today?","Друг сказал «Hello». Ваш ответ:|Hello! How are you?|Goodbye!|Good night!|See you later!|0","A1"),
F("What's your name?","Как тебя зовут?","знакомство",["— Hi! I'm Max. What's your name?","— I'm Kate. Nice to meet you!"],"{What's your name}? — I'm Kate.","Вас спросили имя. Ответ:|I'm Kate.|Kate is I.|My Kate.|I name Kate.|0","A1"),
F("Nice to meet you","Приятно познакомиться","знакомство",["— I'm Kate. Nice to meet you!","— Nice to meet you too!"],"{Nice to meet you} too!","К вам подошли: «Nice to meet you». Ответ:|Nice to meet you too!|Nice to meet you one!|Nice meet you too!|You too meet nice!|0","A1"),
F("Where are you from?","Откуда ты?","знакомство",["— I'm Max. And you? Where are you from?","— I'm from Spain."],"{Where are you from}? — I'm from Italy.","Спросить, откуда человек:|Where are you from?|Where do you from?|From where you are?|Where you from do?|0","A1"),
F("I don't understand","Я не понимаю","уточнение",["— First, write your name here.","— Sorry, I don't understand.","— Write your name on this line."],"{I don't understand} this word.","Сказать, что не понимаете:|I don't understand|I no understand|I'm not understand|I don't understanding|0","A1"),
F("Can you repeat, please?","Повторите, пожалуйста","уточнение",["— Open your books, please.","— Sorry, can you repeat, please?","— Open your books!"],"{Can you repeat}, please?","Вас не расслышали. Что сказать?|Can you repeat, please?|Repeat you, please?|You can repeat do?|Can please you repeat?|0","A1"),
];

/* ---------- Американская разговорная речь (v1.1, 40 фраз) ----------
   Живые фразы, как говорят в США в быту и на работе: неформально, но без грубостей.
   Помечены тегом «США». */
const US_CONVERSATION = [
F("How's it going?","Как дела? / Как оно?","знакомство",["— Hey, Mike!","— Hey! How's it going?"],"Hey, {how's it going}?","Самое частое «как дела» в США:|How's it going?|How it goes?|How's it go?|How is going?|0","A2"),
F("What have you been up to?","Чем занимался в последнее время?","знакомство",["— Hey, it's been a while!","— I know! So, what have you been up to?"],"So, {what have you been up to} lately?","Спросить, чем человек был занят:|What have you been up to?|What have you been up?|What you been doing up?|What are you been up to?|0","B1"),
F("I'm good, thanks","Нормально, спасибо","знакомство",["— How are you doing?","— I'm good, thanks. How about you?"],"{I'm good, thanks} — busy week, though.","Стандартный ответ на How are you?|I'm good, thanks|I'm well thank|I good, thanks|I'm goodly, thanks|0","A1"),
F("Long time no see","Сто лет не виделись","знакомство",["— Sarah? Is that you?","— Yes! Wow, long time no see!"],"Hey, {long time no see}! How've you been?","Встретили старого друга:|Long time no see|Long time not see|Long no see time|Much time no see|0","A2"),
F("Catch you later","Увидимся / до скорого","знакомство",["— I've got to run to class.","— Okay, catch you later!"],"Gotta go — {catch you later}!","Неформальное «пока»:|Catch you later|Catch you late|Take you later|Catch later you|0","A2"),
F("Take care","Береги себя / всего доброго","знакомство",["— Thanks for coming by.","— Of course. Take care!"],"Bye, {take care}!","Тёплое прощание:|Take care|Take carefully|Make care|Take a care|0","A1"),
F("Sounds good","Договорились / звучит отлично","согласие",["— Let's meet at the coffee shop at six.","— Sounds good, see you there."],"Pizza tonight? — {Sounds good}!","Согласиться с планом:|Sounds good|Sound good it|Sounds well|It sounding good|0","A2"),
F("I'm down","Я в деле / я за","согласие",["— Want to go hiking this Saturday?","— Sure, I'm down."],"Tacos after work? {I'm down}.","Разговорное «я за»:|I'm down|I'm up down|I'm downing|I down|0","B1"),
F("Works for me","Меня устраивает","согласие",["— Can we move the call to Friday?","— Works for me."],"Ten o'clock? {Works for me}.","Подтвердить, что время подходит:|Works for me|Work for me it|It's working me|Works me for|0","A2"),
F("Same here","У меня так же / я тоже","согласие",["— I'm so tired today.","— Same here. I barely slept."],"I love this song. — {Same here}!","«Я тоже» коротко:|Same here|Same there|Here same|The same is here|0","A2"),
F("Totally","Абсолютно / ещё как","согласие",["— That movie was way too long.","— Totally. I almost fell asleep."],"{Totally} agree with you.","Яркое американское «да, полностью»:|Totally|Totaly|Total|Totallly|0","A2"),
F("I'm on it","Уже занимаюсь / беру на себя","согласие",["— Can someone send the report to the client?","— I'm on it."],"The printer's broken? {I'm on it}.","Взять задачу на себя:|I'm on it|I'm at it|I'm in it|I on it|0","B1"),
F("Fair point","Справедливое замечание","согласие",["— We can't hire anyone until we have the budget.","— Fair point. Let's wait."],"{Fair point}, I didn't think of that.","Признать, что собеседник прав:|Fair point|Fair spot|Fairly point|Fare point|0","B1"),
F("Not really","Не особо / не совсем","несогласие",["— Did you like the new restaurant?","— Not really. It was kind of bland."],"Hungry? — {Not really}.","Мягкое «нет»:|Not really|No really|Not real|Really not much|0","A2"),
F("I'll pass","Я пас / пожалуй, нет","несогласие",["— Want some more cake?","— I'll pass, thanks. I'm stuffed."],"Karaoke? {I'll pass} tonight.","Вежливо отказаться:|I'll pass|I'll past|I pass it|I'll be pass|0","B1"),
F("I'm not so sure","Я не так уверен","несогласие",["— This plan is going to work, trust me.","— Hmm, I'm not so sure."],"{I'm not so sure} that's a good idea.","Высказать сомнение:|I'm not so sure|I'm no so sure|I not so sure|I'm not such sure|0","A2"),
F("No worries","Не переживай / всё нормально","реакция",["— Sorry I'm late!","— No worries, we just started."],"Forgot the charger? {No worries}, I have one.","Ответ на извинение:|No worries|Not worries|No worry it|Don't worries|0","A2"),
F("My bad","Моя вина / мой косяк","реакция",["— You took my coffee.","— Oh, my bad! Here you go."],"{My bad}, I sent the wrong file.","Неформально признать ошибку:|My bad|My wrong|Mine bad|My badly|0","A2"),
F("No big deal","Ничего страшного / ерунда","реакция",["— I broke your mug, I'm so sorry.","— No big deal, it was old anyway."],"It's {no big deal}, really.","Успокоить: «это мелочь»:|No big deal|No big thing|Not big deal|No large deal|0","A2"),
F("Good for you!","Молодец! / Рад за тебя!","реакция",["— I finally ran my first marathon!","— Good for you! That's huge."],"You got the job? {Good for you}!","Порадоваться за человека:|Good for you!|Good to you!|Well for you!|Good at you!|0","A2"),
F("That's a bummer","Обидно / досадно","реакция",["— The concert got canceled.","— Oh, that's a bummer."],"It's raining all weekend? {That's a bummer}.","Посочувствовать мелкой неудаче:|That's a bummer|That's a bumper|That's a bummed|That bummer is|0","B1"),
F("Hang in there","Держись","реакция",["— Finals week is killing me.","— Hang in there, it's almost over."],"{Hang in there} — you've got this.","Поддержать в трудный момент:|Hang in there|Hang on there|Hang in here|Hang it there|0","B1"),
F("It's on me","Я угощаю / за мой счёт","реакция",["— How much do I owe you for lunch?","— Don't worry, it's on me."],"Coffee's {on me} today.","Предложить заплатить за всех:|It's on me|It's at me|It's for me|It's by me|0","B1"),
F("Could you do me a favor?","Можешь сделать одолжение?","просьба",["— Hey, what's up?","— Could you do me a favor? I need a ride to the airport."],"{Could you do me a favor} and grab the mail?","Начать просьбу:|Could you do me a favor?|Could you make me a favor?|Could you give me a favor?|Could you do a favor me?|0","A2"),
F("Do you mind if I...","Ты не против, если я…","просьба",["— It's so hot in here.","— Do you mind if I open the window?"],"{Do you mind if I} sit here?","Спросить разрешения вежливо:|Do you mind if I...|Do you mind I...|Are you mind if I...|Do you mind that me...|0","A2"),
F("Can I get a...","Можно мне… (в кафе)","просьба",["— Hi, what can I get you?","— Can I get a large iced coffee, please?"],"{Can I get a} cheeseburger, no onions?","Как заказывают в американском кафе:|Can I get a...|Can I take a...|Give me get a...|Can I getting a...|0","A1"),
F("I was wondering if...","Я хотел узнать, не могли бы…","просьба",["— Hi, how can I help you?","— I was wondering if you could look at my resume."],"{I was wondering if} you're free on Friday.","Очень вежливое начало просьбы:|I was wondering if...|I wondered that...|I was wonder if...|I'm wondering that if...|0","B1"),
F("Let me know","Дай знать","просьба",["— I'm not sure I can make it tonight.","— No problem, just let me know."],"{Let me know} if you need anything.","Попросить сообщить:|Let me know|Let me to know|Make me know|Let know me|0","A2"),
F("Give me a sec","Секунду / дай секунду","время",["— Are you ready to go?","— Give me a sec, I need my keys."],"{Give me a sec}, I'm almost done.","Попросить подождать немного:|Give me a sec|Give me a second ago|Get me a sec|Give a me sec|0","A2"),
F("I'm running late","Я опаздываю","время",["— Where are you? The movie starts in ten minutes.","— Sorry, I'm running late. Traffic is crazy."],"{I'm running late}, save me a seat.","Предупредить об опоздании:|I'm running late|I'm late running|I run lately|I'm running lately|0","A2"),
F("I'll get back to you","Я тебе отвечу позже","время",["— Can you send me the numbers by Monday?","— Let me check and I'll get back to you."],"{I'll get back to you} on that tomorrow.","Пообещать ответить позже:|I'll get back to you|I'll come back you|I'll get you back|I'll return to you back|0","B1"),
F("Let's touch base","Давай сверимся / созвонимся","время",["— We should talk about the project again.","— Sure, let's touch base on Thursday."],"{Let's touch base} after the meeting.","Офисное «давай свяжемся»:|Let's touch base|Let's touch the base|Let's touching base|Let's base touch|0","B2"),
F("What do you mean?","Что ты имеешь в виду?","уточнение",["— The trip is kind of off.","— What do you mean? Is it canceled?"],"{What do you mean} by «later»?","Попросить пояснить:|What do you mean?|What you mean?|What do you meaning?|What does you mean?|0","A1"),
F("Just to be clear...","Чтобы было понятно…","уточнение",["— The report is due on Friday.","— Just to be clear, Friday, not Monday?"],"{Just to be clear}, we're splitting the bill?","Уточнить, чтобы не было путаницы:|Just to be clear...|Just to clear...|Just be clearly...|Only to be clear...|0","B1"),
F("Wait, so...","Подожди, то есть…","уточнение",["— I quit my job and bought a farm.","— Wait, so you're a farmer now?"],"{Wait, so} who's driving?","Переспросить с удивлением:|Wait, so...|Wait, then so...|Waiting, so...|Wait so that...|0","A2"),
F("Are you with me?","Ты следишь за мыслью?","проверка",["— Wait, I'm a little lost.","— Okay, slower: first the permit, then the builder. Are you with me?"],"{Are you with me} so far?","Проверить, понимает ли собеседник:|Are you with me?|Are you for me?|Do you with me?|Are you by me?|0","B1"),
F("Speaking of which...","Кстати, об этом…","переход",["— I need a new laptop.","— Speaking of which, there's a big sale this weekend."],"{Speaking of which}, did you call your mom?","Подхватить тему:|Speaking of which...|Speak of which...|Talking which of...|Speaking which of...|0","B1"),
F("Long story short...","Короче говоря…","переход",["— So what happened at the airport?","— Long story short, we missed the flight."],"{Long story short}, I got the job.","Перейти к сути истории:|Long story short...|Short story long...|Long short story...|Story long short...|0","B1"),
F("Like...","Типа… / ну…","filler",["— How was the party?","— It was, like, so crowded."],"It was, {like}, two hours long.","Самое частое американское слово-паразит:|Like...|Likely...|Liking...|As like...|0","A2"),
F("You know...","Ну, знаешь…","filler",["— Why did you leave so early?","— I was, you know, kind of tired."],"It's just, {you know}, complicated.","Заполнить паузу и вовлечь собеседника:|You know...|You known...|Do know...|You knowing...|0","A2"),
];
US_CONVERSATION.forEach((c) => { c.tags.push("США"); });
CONVERSATION_CARDS.push(...US_CONVERSATION);

// Убираем случайно попавшие черновые пометки «— hmm» в примерах (нормализация)
CONVERSATION_CARDS.forEach((c) => {
  c.payload.examples.forEach((e) => { e.text = e.text.replace(/\s*—\s*hmm\s*/g, ""); e.parts = partsOf(e.text); });
  c.payload.dialog.forEach((d, i) => { c.payload.dialog[i] = d.replace(/\s*—\s*hmm\s*/g, ""); });
});

/* ---------- MINIMAL PAIRS (40 пар) ---------- */
const ART = {
  shortlong: "Разница в гласном: краткий /ɪ/ против долгого /iː/. Для /iː/ растяни уголки губ в улыбку, язык выше и вперёд, звук тянется. Для /ɪ/ губы расслаблены, язык чуть ниже, звук короткий.",
  ae_e: "Разница в гласном: /æ/ против /e/. Для /æ/ широко открой рот, как при осмотре у врача. Для /e/ рот приоткрыт меньше, губы чуть растянуты — близко к русскому «э».",
  th_s: "Разница в согласном: /θ/ против /s/. Для /θ/ положи кончик языка между зубами и выдыхай — звук глухой, «шёпотный». Для /s/ язык за зубами, привычный свист. НЕ заменяй /θ/ на /s/ или /t/.",
  th_f: "Разница: /θ/ против /f/. Для /θ/ работает язык между зубами, для /f/ — нижняя губа у верхних зубов. Оба глухие, но органы разные.",
  th_d: "Разница: /ð/ против /d/. /ð/ — межзубный, язык между зубами, голос звучит. /d/ — язык за верхними зубами, резкий взрыв.",
  l_r: "Разница: /l/ против /r/. Для /l/ кончик языка касается бугорков за верхними зубами. Для /r/ язык НЕ касается нёба: кончик загнут к куполу рта, губы слегка округлены.",
  o_ɜ: "Разница в гласном: /ɔː/ против /ɜː/. Для /ɔː/ губы округлены, звук долгий. Для /ɜː/ губы нейтральны, язык в центре рта — «между о и э».",
  o_sh: "Разница в гласном: долгий /ɔː/ против краткого /ɒ/. Для /ɔː/ губы округлены и напряжены. Для /ɒ/ рот открыт шире, губы почти не работают, звук короткий.",
  u_ʊ: "Разница в гласном: долгий /uː/ против краткого /ʊ/. Для /uː/ губы сильно округлены и вытянуты. Для /ʊ/ округление слабое, звук короткий и расслабленный.",
  ae_ʌ: "Разница в гласном: /æ/ против /ʌ/. Для /æ/ рот открыт широко. Для /ʌ/ — нейтрально приоткрыт, звук короткий, как безударное русское «а».",
  a_ɜ: "Разница в гласном: /ɑː/ против /ɜː/. Для /ɑː/ рот открыт широко, язык лежит плоско. Для /ɜː/ губы нейтральны, язык в центре.",
  e_3l: "Разница: /ɜː/ против /ɜːl/. Во втором слове после гласного включается «тёмный» /l/: кончик языка поднимается к альвеолам и приглушает звук.",
  u_o: "Разница в гласном: краткий /ʊ/ против долгого /ɔː/.",
  v_w: "Разница: /v/ против /w/. Для /v/ верхние зубы касаются нижней губы — слышно трение. Для /w/ губы округлены, как для «у», зубы не участвуют. НЕ заменяй /w/ на /v/.",
  s_z: "Разница: /s/ против /z/. Язык одинаков, разница только в голосе: /s/ — глухой, /z/ — звонкий, горло вибрирует.",
  th_t: "Разница: /θ/ против /t/. Для /θ/ язык МЕЖДУ зубами, плавный выдох без взрыва. Для /t/ язык за зубами, резкий взрыв.",
  o_ou: "Разница в гласном: /ɔː/ против /oʊ/. /ɔː/ — один долгий звук. /oʊ/ — дифтонг: от «о» скользит к «у».",
  f_v: "Разница: /f/ против /v/. Органы одинаковые — губа и зубы. Разница в голосе: /f/ — глухой, /v/ — звонкий.",
};

let _mp = 0;
// Чужие звуки для искажения транскрипций (исключаем звуки самой пары)
const ALT_SOUNDS = ["e", "ʌ", "ɑː", "ɒ", "ʊ", "ɔː", "uː", "æ", "ɜː", "əʊ", "s", "z", "f", "v", "t", "k", "m", "n", "l", "ʃ"];
function altSound(exclude, k) {
  const pool = ALT_SOUNDS.filter((s) => !exclude.includes(s));
  return pool[((k % pool.length) + pool.length) % pool.length];
}
// Исказить IPA: заменить звук; если его нет в строке — перевернуть содержимое
function mangleIpa(ipa, sound, bad) {
  if (sound && ipa.includes(sound)) return ipa.replace(sound, bad);
  const inner = ipa.slice(1, -1);
  return "/" + inner.split("").reverse().join("") + "/";
}

function MP(w1, i1, w2, i2, level, ph1, ph2, artic, ex1, ex2) {
  const id = "mp_" + String(++_mp).padStart(3, "0");
  const k = idxOf(id);
  const examples = [
    { text: ex1, parts: partsOf(ex1), connected: "" },
    { text: ex2, parts: partsOf(ex2), connected: "" },
  ];

  // Транскрипционные дистракторы: чужая IPA + два искажения с РАЗНЫми звуками —
  // иначе «word1 с заменённым звуком» совпадает с IPA word2 и пул схлопывается
  const a1 = altSound([ph1, ph2], k);
  const a2 = altSound([ph1, ph2, a1], k + 1);
  const fake1 = mangleIpa(i1, ph1, a1);
  const fake2 = mangleIpa(i2, ph2, a2);

  const tests = [
    Object.assign(mix(w2, [w1, "оба", "ни одно"], k), { q: "Какое слово содержит звук /" + ph2 + "/?" }),
    Object.assign(mix(w1, [w2, "оба", "ни одно"], k + 2), { q: "Какое слово содержит звук /" + ph1 + "/?" }),
    Object.assign(mix(ph1 + " – " + ph2, ["только ударением", "ничем — слова звучат одинаково", "только написанием"], k + 4),
      { q: "Чем различаются «" + w1 + "» и «" + w2 + "»?" }),
    Object.assign(mix(i1, [...new Set([i2, fake1, fake2])], k + 6), { q: "Какая транскрипция у слова «" + w1 + "»?" }),
    Object.assign(mix(i2, [...new Set([i1, fake1, fake2])], k + 8), { q: "Какая транскрипция у слова «" + w2 + "»?" }),
  ];

  return { id, type: "minimal_pair", level, tags: ["фонетика"], audio: true,
    payload: { front: w1 + " / " + w2, word1: w1, ipa1: i1, word2: w2, ipa2: i2,
      articulation: artic, examples,
      audio_test: { instruction: "Послушай слово и угадай, какое прозвучало.", correct_word: w1 },
      test: tests } };
}

const MINIMAL_PAIR_CARDS = [
MP("ship","/ʃɪp/","sheep","/ʃiːp/","A2","ɪ","iː",ART.shortlong,"The {ship} is in the harbour.","The {sheep} are in the field."),
MP("bad","/bæd/","bed","/bed/","A2","æ","e",ART.ae_e,"The dog has a {bad} habit.","I go to {bed} at eleven."),
MP("man","/mæn/","men","/men/","A2","æ","e",ART.ae_e,"That {man} is my uncle.","There are three {men} outside."),
MP("think","/θɪŋk/","sink","/sɪŋk/","A2","θ","s",ART.th_s,"I {think} you're right.","Don't let the plates {sink}."),
MP("three","/θriː/","free","/friː/","A2","θ","f",ART.th_f,"We have {three} cats.","Parking is {free} on Sunday."),
MP("this","/ðɪs/","diss","/dɪs/","B1","ð","d",ART.th_d,"{This} is my favourite song.","Don't {diss} my favourite band."),
MP("light","/laɪt/","right","/raɪt/","A2","l","r",ART.l_r,"Turn on the {light}, please.","You were {right} about the traffic."),
MP("collect","/kəˈlekt/","correct","/kəˈrekt/","B1","l","r",ART.l_r,"Please {collect} your keys at reception.","Your answer is {correct}."),
MP("walk","/wɔːk/","work","/wɜːk/","A2","ɔː","ɜː",ART.o_ɜ,"I {walk} to the office.","I start {work} at nine."),
MP("caught","/kɔːt/","cot","/kɒt/","B1","ɔː","ɒ",ART.o_sh,"He {caught} the last bus.","The baby sleeps in a {cot}."),
MP("pool","/puːl/","pull","/pʊl/","A2","uː","ʊ",ART.u_ʊ,"The hotel has a swimming {pool}.","Don't {pull} the cat's tail."),
MP("food","/fuːd/","good","/ɡʊd/","A2","uː","ʊ",ART.u_ʊ,"Italian {food} is my favourite.","That's a {good} idea."),
MP("bat","/bæt/","but","/bʌt/","A2","æ","ʌ",ART.ae_ʌ,"A {bat} flew out of the cave.","I called, {but} no one answered."),
MP("cap","/kæp/","cup","/kʌp/","A2","æ","ʌ",ART.ae_ʌ,"He wore a red {cap}.","Would you like a {cup} of tea?"),
MP("heart","/hɑːt/","hurt","/hɜːt/","B1","ɑː","ɜː",ART.a_ɜ,"She has a kind {heart}.","My eyes {hurt} from the screen."),
MP("word","/wɜːd/","world","/wɜːld/","B1","ɜː","ɜːl",ART.e_3l,"What does this {word} mean?","He dreams of travelling the {world}."),
MP("full","/fʊl/","fall","/fɔːl/","A2","ʊ","ɔː",ART.u_o,"The glass is {full}.","Leaves {fall} in autumn."),
MP("vet","/vet/","wet","/wet/","A2","v","w",ART.v_w,"Take the cat to the {vet}.","The grass is {wet} with dew."),
MP("vest","/vest/","west","/west/","A2","v","w",ART.v_w,"He wore a woollen {vest}.","The sun sets in the {west}."),
MP("very","/ˈveri/","wary","/ˈweəri/","B1","v","w",ART.v_w,"She was {very} kind to us.","Be {wary} of pickpockets."),
MP("sink","/sɪŋk/","zinc","/zɪŋk/","B1","s","z",ART.s_z,"The dishes are in the {sink}.","The fence is coated with {zinc}."),
MP("bus","/bʌs/","buzz","/bʌz/","A2","s","z",ART.s_z,"I take the {bus} to work.","I heard a {buzz} near the hive."),
MP("rice","/raɪs/","rise","/raɪz/","B1","s","z",ART.s_z,"Would you like some {rice}?","Prices {rise} every year."),
MP("peace","/piːs/","peas","/piːz/","B1","s","z",ART.s_z,"We finally have {peace} in the house.","I planted {peas} in the garden."),
MP("mouth","/maʊθ/","mouse","/maʊs/","A2","θ","s",ART.th_s,"Open your {mouth}, please.","A {mouse} ran across the kitchen."),
MP("bath","/bɑːθ/","bass","/beɪs/","B1","θ","s",ART.th_s,"A hot {bath} relaxes muscles.","He plays {bass} in a band."),
MP("thin","/θɪn/","tin","/tɪn/","A2","θ","t",ART.th_t,"The ice is {thin} — be careful.","Canned {tin} tomatoes work too."),
MP("tree","/triː/","three","/θriː/","A2","t","θ",ART.th_t,"A tall {tree} shades the yard.","I need {three} stamps."),
MP("fear","/fɪə/","feel","/fiːl/","B1","r","l",ART.l_r,"She has no {fear} of heights.","I {feel} much better today."),
MP("grow","/ɡrəʊ/","glow","/ɡləʊ/","A2","r","l",ART.l_r,"Tomatoes {grow} well here.","The stars {glow} at night."),
MP("arrive","/əˈraɪv/","alive","/əˈlaɪv/","B1","r","l",ART.l_r,"The train will {arrive} at noon.","The old traditions are still {alive}."),
MP("pray","/preɪ/","play","/pleɪ/","A2","r","l",ART.l_r,"They {pray} before dinner.","The kids {play} in the yard."),
MP("saw","/sɔː/","sow","/səʊ/","B1","ɔː","oʊ",ART.o_ou,"He {saw} a fox in the garden.","Farmers {sow} wheat in spring."),
MP("law","/lɔː/","low","/ləʊ/","A2","ɔː","oʊ",ART.o_ou,"That's against the {law}.","Speak {low} — the baby sleeps."),
MP("caught","/kɔːt/","code","/kəʊd/","B1","ɔː","oʊ",ART.o_ou,"She {caught} the flu.","I forgot my access {code}."),
MP("bought","/bɔːt/","boat","/bəʊt/","B1","ɔː","oʊ",ART.o_ou,"I {bought} new shoes.","We rented a {boat} for the day."),
MP("fan","/fæn/","van","/væn/","A2","f","v",ART.f_v,"The ceiling {fan} is on.","They moved house in a {van}."),
MP("fail","/feɪl/","veil","/veɪl/","B1","f","v",ART.f_v,"Backups never {fail} — I hope.","The bride wore a white {veil}."),
MP("safe","/seɪf/","save","/seɪv/","A2","f","v",ART.f_v,"Keep your passport {safe}.","Try to {save} some money monthly."),
MP("leaf","/liːf/","leave","/liːv/","A2","f","v",ART.f_v,"A dry {leaf} fell on the book.","What time does the train {leave}?"),
];

/* ---------- 7 звуков, которых нет в русском (mp_041–047) ---------- */
let _sc = 40;
const OTHER_SYMS = ["/ð/", "/s/", "/t/", "/d/", "/z/", "/e/", "/ʌ/", "/ɑː/", "/v/", "/uː/", "/r/", "/ŋ/", "/n/", "/l/", "/j/", "/w/", "/m/", "/f/"];
function SC(sym, ipaWord, wordsStr, confStr, artic, mt1, mt2) {
  const id = "mp_" + String(++_sc).padStart(3, "0");
  const k = idxOf(id);
  const words = wordsStr.split("|");
  const conf = confStr.split("|");
  const first = words[0];
  const examples = [{ text: "Listen and repeat: " + words.slice(0, 3).join(", ") + ".",
    parts: partsOf("Listen and repeat: " + words.slice(0, 3).join(", ") + "."), connected: "" }];

  const tests = [
    manualTest(mt1),
    manualTest(mt2),
    Object.assign(mix(first, conf, k), { q: "В каком слове есть звук " + sym + "?" }),
    Object.assign(mix(sym, rotate(OTHER_SYMS, k).filter((s) => s !== sym), k + 3), { q: "Каким значком IPA записывают этот звук?" }),
    Object.assign(mix(conf[0], words.slice(0, 3), k + 5), { q: "Выберите слово БЕЗ звука " + sym + "?" }),
  ];

  return { id, type: "minimal_pair", level: "A2", tags: ["фонетика", "звук"], audio: true,
    payload: { front: "Звук " + sym + " — " + words.slice(0, 3).join(", "),
      word1: first, ipa1: ipaWord, word2: "", ipa2: "",
      articulation: artic, examples,
      audio_test: { instruction: "Послушай слово: есть ли в нём звук " + sym + "?", correct_word: first },
      test: tests } };
}

const SOUND_CARDS = [
SC("/θ/","/θɪŋk/","think|three|bath|mouth|path","sink|tick|sing","Кончик языка между зубами. Не кусай язык — просто положи и выдыхай. Звук глухой, как шёпот. НЕ заменяй на /s/ (sink) или /t/ (tink).","Как поставить язык для /θ/?|Между зубами|За зубами|На нижнюю губу|К нёбу|0","Звук /θ/ по звучанию ближе к…|глухому шёпоту|звонкому жужжанию|русскому «ф»|русскому «т»|0"),
SC("/ð/","/ðɪs/","this|that|mother|brother|breathe","day|dime|zone","Тот же межзубный язык, что у /θ/, но С ГОЛОСОМ — горло вибрирует. Проверка: положи руку на горло — должно гудеть.","Чем /ð/ отличается от /θ/?|Голосом — он звонкий|Положением языка|Ничем|Он глухой|0","В каком слове звук /ð/?|mother|think|three|thanks|0"),
SC("/æ/","/kæt/","cat|bad|man|hat|map","bed|men|pet","Широко открой рот, как при осмотре у врача, и скажи короткий звук между «а» и «э». НЕ заменяй на русское «э» (bed).","Рот при произнесении /æ/…|широко открыт|почти закрыт|вытянут трубочкой|не двигается|0","Выберите слово со звуком /æ/:|man|men|met|meet|0"),
SC("/w/","/ˈwɔːtə/","water|we|want|window|warm","vest|very|veil","Губы округлите, как для «у», и сразу раскройте в следующий гласный: «у-а». Зубы НЕ участвуют. НЕ заменяй на /v/.","Как ставятся губы для /w/?|Округляются, как для «у»|Касаются зубов|Растягиваются в улыбке|Свободно|0","Выберите слово со звуком /w/:|window|vest|veil|very|0"),
SC("/h/","/haʊs/","house|help|hot|happy|hat","hour|air|ear","Лёгкий выдох, как на запотевшее стекло: «ха». Никакого русского твёрдого «х» в глубине горла — звук совсем лёгкий.","Звук /h/ — это…|лёгкий выдох|твёрдое русское «х»|горловое «г»|вибрация горла|0","Выберите слово БЕЗ звука /h/:|hour|house|help|happy|0"),
SC("/ŋ/","/sɪŋ/","sing|going|running|morning|long","sin|gone|sun","Задняя часть языка прижата к мягкому нёбу, воздух идёт в нос — как «н в нос». Попробуй: скажи «н» и зажми нос — звук пропадёт? Значит, верно.","Звук /ŋ/ произносится…|через нос|через зубы|через горло|с свистом|0","Выберите слово со звуком /ŋ/:|long|lock|lot|love|0"),
SC("/r/","/red/","red|right|run|road|river","led|light|lock","Кончик языка ЗАГНУТ к куполу рта и НЕ касается нёба. Губы слегка округлены. НЕ заменяй на русский «р» — он другой, без вибрации.","Что делает кончик языка при /r/?|Загнут, не касается нёба|Вибрирует у альвеол|Касается зубов|Между зубами|0","Выберите слово со звуком /r/:|river|live|love|lock|0"),
];

/* ---------- ЧТЕНИЕ (15) ---------- */
let _rd = 0;
function R(title, type, level, text, qs) {
  const id = "rd_" + String(++_rd).padStart(3, "0");
  const lines = text.split("\n").filter(Boolean).map((line) => ({ text: line, parts: partsOf(line) }));
  const flat = [];
  lines.forEach((l) => flat.push(...l.parts));
  return { id, type: "reading", level, tags: [type], audio: true,
    payload: { title, reading_type: type, text, parts: flat, lines,
      questions: qs.map((s) => manualTest(s)) } };
}

const READING_CARDS = [
R("В кафе","dialog","A2","— Good morning! What can I get you?\n— Hi! Can I have a latte, please?\n— Sure. Anything to eat?\n— Just a croissant, thanks.\n— For here or to go?\n— To go, please.\n— That's six dollars fifty.\n— Here you are. Keep the change.\n— Thanks! Have a nice day!",
["Что заказал клиент?|латте и круассан|чай и тост|сок и булочку|американо и сэндвич|0",
"Сколько стоил заказ?|6 долларов 50|5 долларов|7 долларов|4 доллара 50|0",
"Клиент берёт заказ…|с собой|в зале|на террасе|доставка|0",
"Фраза «Keep the change» значит…|сдачи не надо|верните сдачу|дайте скидку|примите карту|0",
"Какое настроение у диалога?|дружелюбное|напряжённое|официальное|грустное|0"]),
R("В аэропорту","dialog","B1","— Good morning. Your passport, please.\n— Here you are.\n— Checking in one bag?\n— Yes, one suitcase and one carry-on.\n— Your suitcase is two kilos overweight. That's an extra fee.\n— Oh, really? Can I move something to my carry-on?\n— Of course. Put it on the belt, please.\n— Done. Is that okay now?\n— Perfect. Seat 21A, boarding at gate five at ten forty.\n— Thank you very much!",
["Что вызвало проблему?|чемодан был тяжелее нормы|паспорт истёк|рейс отменили|не было брони|0",
"Как пассажир решил проблему?|переложил вещи в ручную кладь|заплатил сбор|выбросил вещи|купил новый чемодан|0",
"Какое место у пассажира?|21A|12B|5A|21C|0",
"Когда посадка?|в 10:40 на выходе 5|в 10:04 на выходе 15|в 14:10 на выходе 5|в 10:40 на выходе 15|0",
"Сколько багажа сдал пассажир?|один чемодан|два чемодана|ничего|три сумки|0"]),
R("В отеле","dialog","B1","— Good evening. Reservation for Smith.\n— Welcome, Mr Smith. Room 305, third floor.\n— Could I see the room first?\n— Of course, here's the key.\n— The air conditioner makes a terrible noise.\n— I'm terribly sorry. We'll send maintenance up right away.\n— Also, I asked for a room with a sea view.\n— Let me see… We can move you to 512, top floor, with a view. Is that okay?\n— Perfect, thank you.\n— Our pleasure. Breakfast is from seven to ten.",
["Что не устроило гостя в номере 305?|шумный кондиционер и вид во двор|холодная вода|грязное бельё|нет Wi-Fi|0",
"Что предложил персонал?|другой номер на верхнем этаже|скидку 20%|поздний выезд|бесплатный ужин|0",
"Номер нового гостя:|512|305|505|215|0",
"Во сколько завтрак?|с 7 до 10|с 8 до 11|с 7 до 9|с 6 до 10|0",
"Куда отправили специалиста?|в номер 305|в номер 512|в холл|в ресторан|0"]),
R("Заказ еды на дом","dialog","A2","— Papa Joe's Pizza, how can I help?\n— Hi! I'd like to order a large pepperoni pizza.\n— Anything else?\n— And a green salad, please.\n— That's eighteen dollars. Delivery is free.\n— Great. How long will it take?\n— About forty minutes.\n— Perfect. It's 12 Oak Street, apartment four.\n— Got it. Paying by card or cash?\n— Cash, please.",
["Что заказал клиент?|большую пиццу и салат|две пиццы|пиццу и колу|маленькую пиццу|0",
"Сколько стоит заказ?|18 долларов|8 долларов|80 долларов|12 долларов|0",
"Доставка…|бесплатная|стоит 2 доллара|стоит 5 долларов|отменена|0",
"Как клиент заплатит?|наличными|картой|онлайн|переводом|0",
"Адрес клиента:|12 Oak Street, кв. 4|12 Oak Street, кв. 14|21 Oak Street, кв. 4|12 Oak Road, кв. 4|0"]),
R("У врача","dialog","B1","— Good morning. What brings you in?\n— I've had a sore throat and a fever for three days.\n— Any cough or headache?\n— A dry cough in the mornings.\n— Let me look at your throat… It's red, but no infection.\n— Is it serious?\n— Nothing serious. It's a virus. Rest, drink warm liquids, and take these pills twice a day.\n— Should I stay home?\n— Yes, two or three days. Come back if the fever returns.",
["Как долго пациент болеет?|три дня|неделю|один день|месяц|0",
"Симптомы пациента:|горло, температура, сухой кашель|насморк и чихание|боль в спине|головокружение|0",
"Диагноз врача:|вирус, без инфекции|ангина|аллергия|бронхит|0",
"Как принимать таблетки?|дважды в день|один раз в день|трижды в день|по необходимости|0",
"Сколько оставаться дома?|два-три дня|неделю|один день|до пятницы|0"]),
R("Как технологии меняют работу","article","B1","Twenty years ago, most people worked in one office from nine to five. Today the picture looks very different. Fast internet, laptops and smartphones have changed not only where we work, but how.\nRemote work is the biggest change. Millions of people now work from home at least part of the week. They save hours of commuting and can live far from expensive cities. Video calls replaced many face-to-face meetings, and team chats replaced hallway conversations.\nBut this freedom has a price. When your home becomes your office, it is hard to switch off in the evening. Some remote workers say they feel isolated and miss simple office talk. Many companies now use a hybrid model: a few days at home, a few days in the office.\nAutomation is another force. Computers already do routine tasks: they sort emails, process invoices and check documents for mistakes. Some jobs disappear, but new ones appear — data analysts, app designers, AI trainers. The lesson is clear: the skills that matter most are the ones machines cannot copy, like creativity, empathy and teamwork.\nThe workplace will keep changing, and fast. The best strategy is not to fight technology but to keep learning. People who stay curious will always find their place in the new world of work.",
["Главная тема статьи:|как технологии меняют работу|история интернета|дистанционное обучение|гаджеты для сна|0",
"Какая модель становится популярной у компаний?|гибридная: дом + офис|полный возврат в офис|только удалёнка|четырёхдневная неделя|0",
"Какие навыки, по мнению автора, важнее всего?|творчество, эмпатия, командная работа|скорость печати|знание Excel|работа по ночам|0",
"Что автор говорит об автоматизации?|одни профессии исчезают, другие появляются|автоматизация вредна|роботы заменят всех|автоматизация не касается офисов|0",
"Совет автора в конце:|постоянно учиться новому|избегать технологий|работать больше часов|менять работу каждый год|0"]),
R("Здоровое питание: мифы и правда","article","B1","Open any social network and you will find a new «superfood» every month. First it was kale, then avocado, now some berry from a distant mountain. The truth is simple: there is no magic food. Health comes from the whole diet, not from one miracle product.\nAnother popular myth is that sugar is pure poison. Added sugar in sweets and fizzy drinks really is a problem — most people eat too much of it. But fruit, which also contains sugar, comes with fibre, vitamins and water. An apple will never harm you the way a bottle of soda can.\nCarbohydrates have a bad reputation too. Yet whole grains, potatoes and rice have fed humanity for centuries. The problem is not carbs themselves but huge portions and ultra-processed foods.\nSo what actually works? Boring, well-known rules. Cook at home more often. Fill half your plate with vegetables. Drink water instead of sweet drinks. Eat slowly and stop when you are full. Read labels: if the list of ingredients is longer than a railway timetable, think twice.\nNo single product will fix your health, and no single cake will destroy it. Balance, variety and moderation — that is the real superfood. Small changes repeated every day beat any extreme diet that you abandon in two weeks.",
["Что автор говорит о «суперфудах»?|чудо-еды не существует|капуста кале лечит всё|авокадо вреден|ягоды бесполезны|0",
"Отношение автора к сахару:|добавленный сахар — проблема, фрукты — нет|весь сахар — яд|сахар безвреден|фрукты опаснее газировки|0",
"Что автор думает об углеводах?|проблема в порциях и переработанной еде|углеводы надо убрать|картофель опасен|рис вредит здоровью|0",
"Практический совет из статьи:|наполнять полтарелки овощами|есть раз в день|считать каждую калорию|покупать только импортное|0",
"Главный вывод:|баланс и умеренность важнее крайностей|нужна жёсткая диета|спорт важнее питания|дорогие продукты полезнее|0"]),
R("Спорт для начинающих","article","B1","Every January, gyms fill with new people. By March, most of them are gone. Why does this happen so often? Usually because beginners start too big: two-hour workouts, six days a week, a strict diet from day one. The body protests, motivation dies, and the experiment ends.\nThe smarter way is to start small. Twenty minutes of walking every day is a real habit. After two weeks, add five minutes. When walking feels easy, try short runs: jog for one minute, walk for two, and repeat. Slowly, the running part grows. Good shoes matter more than an expensive subscription.\nHabit beats motivation. Choose a fixed time — before work, at lunch, right after dinner — and protect it. Put your sports clothes out in the evening: fewer decisions in the morning, fewer excuses too. A simple calendar with crosses for each active day works better than any fitness app.\nMusic, a training partner or a friendly group class can carry you through lazy days. But be careful with the classic beginner mistake: doing too much too soon. Pain in your knees or lower back is not a sign of progress; it is a signal to rest and check your technique.\nRemember that rest is part of training. Muscles grow between workouts, not during them. One or two rest days a week are not weakness — they are the plan. Consistency beats intensity: three calm sessions every week for a year will change your body and your mood far more than one heroic week in January.",
["Почему новички бросают спорт, по мнению автора?|начинают слишком резко|секции дорогие|плохая погода|скучные тренеры|0",
"С чего автор советует начать?|с 20 минут ходьбы ежедневно|с часового бега|с марафона|с тяжёлых весов|0",
"Что важнее мотивации?|привычка и фиксированное время|спортивная одежда|дорогой зал|добавки|0",
"Боль в коленях — это…|сигнал отдохнуть и проверить технику|признак прогресса|норма для новичка|повод тренироваться больше|0",
"Главный принцип статьи:|постоянность важнее интенсивности|тренироваться каждый день без отдыха|купить абонемент в лучший зал|бегать только зимой|0"]),
R("Путешествие в Лиссабон","article","B1","Lisbon does not shout. The Portuguese capital grows on you slowly: yellow trams climbing steep hills, laundry hanging from old windows, the smell of grilled sardines in narrow streets of Alfama. Visitors who expected a loud European capital often fall in love with this quiet charm instead.\nStart with the viewpoints — the miradouros. The city is built on hills, and almost every district has a terrace with a view over red roofs and the wide Tagus river. Tram 28 is the famous ride, but it is usually packed with tourists; walking through Alfama on foot is slower and far more rewarding.\nFood deserves its own day. Pastéis de nata — small egg tarts with crispy pastry — are the local weakness; eat them warm with cinnamon. For a proper lunch, look for places with a fixed menu: soup, a main dish of bacalhau (salted cod, which locals cook in a hundred ways) and coffee, all for a modest price. Seafood lovers should try grilled octopus at least once.\nTake a half-day trip to Belém to see the monastery and taste the original tarts, but keep a whole evening for fado: melancholic Portuguese songs in a tiny candle-lit room. You will not understand a word, and you will not need to.\nPractical advice: wear comfortable shoes — the hills are real — and keep a tram ticket in your pocket. Locals are friendly and patient with tourists' Portuguese, and a simple «bom dia» opens more doors than any phrasebook.",
["Какая черта Лиссабона выделена в начале статьи?|тихое обаяние|шум и суета|дороговизна|современная архитектура|0",
"Что автор советует вместо трамвая 28?|прогуляться по Алфаме пешком|взять такси|арендовать велосипед|поехать на метро|0",
"Что такое pastéis de nata?|яичные пирожные с хрустящим тестом|пирог с сардинами|суп из трески|местный сыр|0",
"Что советуют попробовать любителям морепродуктов?|жареного осьминога|креветки на гриле|устриц|рыбные палочки|0",
"Практический совет из статьи:|удобная обувь и билет на трамвай|зонтик обязателен|брать машину напрокат|посещать город только зимой|0"]),
R("Как найти первую работу","article","B1","The first job search feels like a paradox: everyone wants experience, but experience comes only with a job. The good news is that employers hiring juniors understand this. They are not looking for a finished expert — they are looking for potential, reliability and the ability to learn.\nStart with an honest self-assessment. List your skills: university projects, volunteer work, personal websites, even a well-run student club all count. Then build a one-page CV. One page — not three. Describe results, not duties: «grew a Telegram channel to 500 subscribers» sounds better than «was responsible for social media».\nTailor every application. Recruiters instantly spot a copy-pasted CV that mentions the wrong company name. A short cover letter — three paragraphs, no clichés — doubles your chances more than another online certificate.\nApply widely. Twenty applications, not two. Junior positions attract hundreds of candidates, so treat it as a numbers game with a learning loop: after each interview, write down what went well and what to improve.\nPrepare for interviews with the STAR method: describe a Situation, the Task, your Action and the Result. And prepare questions of your own — asking about the team and real tasks shows serious intent. After the interview, send a short thank-you email; few candidates do, and it is remembered.\nRejections are part of the process, not a verdict on your worth. The first job is not the finish line — it is simply the door. Once you are inside, real experience replaces everything the CV had to promise.",
["Главная проблема первого поиска работы:|везде требуют опыт|резюме длинные|мало вакансий|высокие зарплаты|0",
"Какой объём CV рекомендует автор?|одна страница|три страницы|десять страниц|объём не важен|0",
"Метод подготовки к интервью:|STAR|SMART|SWOT|OKR|0",
"Что стоит сделать после собеседования?|отправить короткое благодарственное письмо|позвонить каждый день|ждать молча|написать жалобу|0",
"Отношение автора к отказам:|это часть процесса|повод бросить поиск|признак плохого резюме|редкость на рынке|0"]),
R("Правила отеля","notice","A2","Hotel Sunrise — Guest Rules\n1. Quiet hours: from 22:00 to 07:00. Please keep noise low in the corridors.\n2. Breakfast is served in the dining room from 07:00 to 10:00.\n3. Check-out is at 12:00. Late check-out costs 20 dollars — ask at reception.\n4. Smoking is not allowed in rooms or on balconies.\n5. Visitors may stay in rooms until 23:00.\n6. Leave your key at reception when you go out.\n7. In case of fire, use the stairs, not the lift. The meeting point is in the car park.\nThank you for your cooperation. Enjoy your stay!",
["Во сколько заканчиваются тихие часы?|в 07:00|в 07:30|в 06:00|в 08:00|0",
"Поздний выезд стоит…|20 долларов|10 долларов|бесплатно|50 долларов|0",
"Курить в номерах…|запрещено|можно на балконе|можно после 22:00|можно с разрешения|0",
"При пожаре нужно…|идти по лестнице|ждать лифт|выбить окно|спрятаться в номере|0",
"Ключ при выходе…|оставляют на ресепшене|кладут под дверь|забирают с собой|отдают охране|0"]),
R("Инструкция к кофемашине","notice","A2","CoffeeMaster 300 — Quick Start\n1. Lift the lid and fill the tank with fresh water. Do not fill above the MAX line.\n2. Insert a coffee capsule. Close the lid until it clicks.\n3. Place your cup under the spout.\n4. Press the big button. Your coffee is ready in 30 seconds.\n5. To make a second cup, wait 10 seconds.\n6. Clean the drip tray once a week.\n7. Descale the machine once a month with a special tablet.\nWarning: surfaces are hot after use. Keep away from children.",
["Не наливайте воду выше…|линии MAX|крышки|половины бака|100 мл|0",
"Кофе готов через…|30 секунд|3 минуты|10 секунд|час|0",
"Капсулу нужно…|вставить и закрыть крышку до щелчка|разрезать пополам|намочить|нагреть отдельно|0",
"Очищайте поддон…|раз в неделю|раз в год|каждый день|никогда|0",
"Поверхности после использования…|горячие|холодные|всегда тёплые|ледяные|0"]),
R("Описание вакансии: Junior QA Engineer","notice","B1","TechNova is looking for a Junior QA Engineer.\nYour tasks: write and run test cases, report bugs clearly, check new features before release, and support the team with regression testing.\nWe expect: English at B1 level or higher, attention to detail, basic SQL, and the habit of asking questions early. Experience is welcome but not required — we train beginners.\nNice to have: knowledge of Postman, basic Python, or an interest in test automation.\nWe offer: fully remote work, flexible hours, paid training in the first month, and a friendly senior team that reviews your work daily.\nTo apply, send your CV and a short message about why testing interests you to jobs@technova.example. We reply to every candidate within five working days.",
["Обязанности junior QA:|тест-кейсы, отчёты о багах, регрессия|разработка фронтенда|управление командой|дизайн интерфейсов|0",
"Опыт работы…|приветствуется, но не обязателен|обязателен от 3 лет|не упоминается|запрещён|0",
"Что из этого в списке ожиданий?|basic SQL|свободный китайский|знание Figma|опыт продаж|0",
"Первый месяц…|оплачиваемое обучение|испытательный срок без оплаты|отпуск|работа в офисе|0",
"Компания отвечает кандидатам…|в течение пяти рабочих дней|в тот же день|через месяц|только избранным|0"]),
R("Меню кафе","notice","A2","Green Leaf Café — Menu\nDrinks: Espresso 2.50 | Cappuccino 3.50 | Tea (black, green) 2.00 | Fresh orange juice 4.00\nFood: Croissant 2.50 | Club sandwich 5.00 | Soup of the day 4.00 | Caesar salad 6.00 | Cheesecake 3.50\nLunch special: 12:00–15:00 — soup + main dish for 7.00.\nStudents get 10% off with a valid student card.\nFree water on request. Wi-Fi password: greenleaf2024.\nWe are open every day from 8:00 to 22:00.",
["Сколько стоит капучино?|3.50|2.50|4.00|5.00|0",
"Ланч-спецпредложение действует…|с 12:00 до 15:00|весь день|с 8:00 до 11:00|по выходным|0",
"Скидка для студентов…|10% по студенческому|20% всегда|5% по выходным|нет скидки|0",
"Комплексный обед (суп + главное) стоит…|7.00|10.00|4.00|6.00|0",
"Кафе открыто…|ежедневно с 8 до 22|только по будням|с 9 до 18|круглосуточно|0"]),
R("Правила национального парка","notice","B1","Blue Mountains National Park — Visitor Rules\nOpening hours: 08:00–20:00, every day.\n1. Stay on marked trails. Cliff edges are dangerous.\n2. Fires and BBQs are strictly forbidden. Take a cold picnic.\n3. Do not feed or touch wild animals. They look friendly; they are not.\n4. Take all rubbish with you. There are no bins on the trails.\n5. Dogs must stay on a short leash.\n6. Camping is allowed only with a permit — book online.\n7. Do not drink water from streams without boiling it.\nEmergencies: call 112. Rangers are on duty at the Visitor Centre until 18:00.\nEnjoy the park — and leave it as beautiful as you found it.",
["Время работы парка:|с 8 до 20|круглосуточно|с 6 до 18|с 10 до 16|0",
"Что строго запрещено?|костры и грили|фотографировать|гулять группой|пить чай|0",
"Мусор после пикника…|забирают с собой|оставляют в кустах|закапывают|отдают рейнджерам|0",
"Пить воду из ручьёв можно…|только прокипятив|без ограничений|нельзя кипятить|только детям|0",
"Экстренный номер:|112|911|102|000|0"]),
/* === A1 чтения === */
R("Знакомство","dialog","A1","— Hello!\n— Hi! My name is Max. What's your name?\n— I'm Kate.\n— Where are you from, Kate?\n— I'm from London. And you?\n— I'm from Rome.\n— Nice to meet you, Max!\n— Nice to meet you too!",
["Как зовут девушку?|Kate|Max|Anna|Rome|0",
"Откуда Макс?|из Рима|из Лондона|из Мадрида|из Парижа|0",
"Кто говорит «I'm from London»?|Кейт|Макс|оба|никто|0",
"«Nice to meet you» значит…|приятно познакомиться|хорошо встретиться|увидимся снова|до свидания|0",
"Сколько человек в диалоге?|два|три|один|четыре|0"]),
R("В магазине","dialog","A1","— Hello! Can I help you?\n— Yes, please. How much is this bag?\n— It's ten dollars.\n— OK. And how much are these pens?\n— They are two dollars.\n— Great. I take the bag and two pens, please.\n— That's fourteen dollars, please.\n— Here you are.\n— Thank you! Have a nice day!",
["Сколько стоит сумка?|10 долларов|12 долларов|2 доллара|14 долларов|0",
"Сколько стоят ручки?|2 доллара|10 долларов|4 доллара|20 долларов|0",
"Что покупает клиент?|сумку и две ручки|две сумки|рюкзак и ручку|только ручки|0",
"Итого к оплате:|14 долларов|12 долларов|10 долларов|20 долларов|0",
"«How much is this?» — вопрос о…|цене|цвете|размере|времени|0"]),
];

/* ---------- Экспорт и самопроверка ---------- */
(() => {
  const MINIMAL_ALL = MINIMAL_PAIR_CARDS.concat(SOUND_CARDS);
  const check = (name, arr, fields) => {
    const problems = [];
    arr.forEach((c) => {
      fields.forEach((f) => { if (c.payload[f] === undefined) problems.push(c.id + ": нет " + f); });
      const t = c.payload.test || c.payload.questions || [];
      if (t.length !== 5) problems.push(c.id + ": вопросов " + t.length + " вместо 5");
      t.forEach((qq, i) => {
        if (!qq || !Array.isArray(qq.options)) { problems.push(c.id + " #" + (i + 1) + ": нет options"); return; }
        if (qq.options.length < 4) problems.push(c.id + " #" + (i + 1) + ": вариантов " + qq.options.length);
        if (new Set(qq.options).size !== qq.options.length) problems.push(c.id + " #" + (i + 1) + ": дубли вариантов");
        if (qq.correct === undefined || qq.correct < 0 || qq.correct >= qq.options.length) problems.push(c.id + " #" + (i + 1) + ": неверный correct");
      });
    });
    if (problems.length) console.warn(name + " — проблемы:", problems.slice(0, 20));
    return problems.length === 0;
  };
  check("SLANG", SLANG_CARDS, ["front", "full_form", "ipa_full", "ipa_short", "examples"]);
  check("CONVERSATION", CONVERSATION_CARDS, ["front", "translation", "category", "dialog", "examples"]);
  check("MINIMAL", MINIMAL_ALL, ["front", "word1", "ipa1", "articulation", "examples", "audio_test"]);
  check("READINGS", READING_CARDS, ["title", "reading_type", "text", "parts", "lines", "questions"]);

  window.SLANG_CARDS = SLANG_CARDS;
  window.CONVERSATION_CARDS = CONVERSATION_CARDS;
  window.MINIMAL_PAIR_CARDS = MINIMAL_ALL; // 40 пар + 7 звуков = 47
  window.READING_CARDS = READING_CARDS;
  console.log(`content_extra.js: ${SLANG_CARDS.length} сленг, ${CONVERSATION_CARDS.length} фразы, ` +
    `${MINIMAL_PAIR_CARDS.length}+${SOUND_CARDS.length} мин.пары, ${READING_CARDS.length} чтений`);
})();
})();
