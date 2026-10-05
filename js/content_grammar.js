/* ==========================================================================
   English Reboot — Шаг 2: Контент грамматики
   Файл: content_grammar.js — 48 карточек grammar_cards
   Хелперы w/ex/err/q/card генерируют объекты формата ТЗ.
   Индексы silent/surprise — позиции букв (0-based), stress — номер слога.
   ========================================================================== */

/* ---------- Хелперы записи ---------- */

// Слово: w("work","verb","/wɝk/",{s:0,sl:[1],sp:[2]})
// s — индекс ударного слога, sl — немые буквы, sp — неожиданные звуки
const w = (word, pos, ipa, o = {}) => {
  const p = { word, pos, ipa, silent: o.sl || [], surprise: o.sp || [] };
  if (o.s !== undefined) p.stress = o.s;
  return p;
};

// Пример: ex(текст, [parts], connected) — connected: как звучит в слитной речи
const ex = (text, parts, connected = '') => ({ text, parts, connected });

// Типичная ошибка
const err = (wrong, correct, note) => ({ wrong, correct, note });

// Тестовый вопрос
const q = (q, options, correct) => ({ q, options, correct });

// Карточка
const card = (id, level, tags, title, formula, explanation, examples, errors, test) =>
  ({ id, type: 'grammar', level, tags, audio: true,
     payload: { title, formula, explanation, examples, errors, test } });

const GRAMMAR_CARDS = [
/* ================= A1 СТАРТОВЫЙ НАБОР ================= */

card('g049','A1',['глагол to be','базовое'],
'Глагол to be: am / is / are',
'I am · he/she/it is · you/we/they are · − am not / isn\'t / aren\'t',
'Главный глагол «быть». В русском «я студент» — без глагола, в английском он обязателен: I am a student. Форма зависит от подлежащего.',
[
 ex('I am a student.',[
  w('I','pron','/aɪ/'), w('am','verb','/æm/'), w('a','art','/ə/'), w('student','noun','/ˈstudənt/',{s:0})]),
 ex('She is my sister.',[
  w('She','pron','/ʃi/'), w('is','verb','/ɪz/'), w('my','pron','/maɪ/'), w('sister','noun','/ˈsɪstɚ/',{s:0})]),
 ex('They are happy.',[
  w('They','pron','/ðeɪ/'), w('are','verb','/ɑr/'), w('happy','adj','/ˈhæpi/',{s:0})]),
],
[
 err('I is a student.','I am a student.','С местоимением I всегда am.'),
 err('She am my sister.','She is my sister.','С he/she/it — is; с you/we/they — are.'),
],
[
 q('I ___ a teacher.',['am','is','are','be'],0),
 q('She ___ my friend.',['am','is','are','be'],1),
 q('They ___ at home.',['am','is','are','be'],2),
 q('___ you tired?',['Am','Is','Are','Be'],2),
 q('He ___ not hungry.',['am','is','are','be'],1),
]),

card('g050','A1',['глагол to be','вопросы'],
'Вопросы с to be',
'Am/Is/Are + подлежащее? · Wh-слово + am/is/are…?',
'Чтобы задать вопрос, to be выходит вперёд: You are okay → Are you okay? Специальные вопросы начинаются с What/Where/How, затем to be.',
[
 ex('Are you okay?',[
  w('Are','verb','/ɑr/'), w('you','pron','/ju/'), w('okay','adj','/oʊˈkeɪ/',{s:1})]),
 ex('Is this your bag?',[
  w('Is','verb','/ɪz/'), w('this','pron','/ðɪs/'), w('your','pron','/jɔr/'), w('bag','noun','/bæɡ/')]),
 ex('Where is the station?',[
  w('Where','adv','/wɛr/'), w('is','verb','/ɪz/'), w('the','art','/ðə/'), w('station','noun','/ˈsteɪʃən/',{s:0,sp:[4,5]})],
  'station — ti читается /ʃ/'),
],
[
 err('You are okay?','Are you okay?','В вопросе to be выходит вперёд.'),
 err('Where is station?','Where is the station?','Перед единственным предметом нужен the.'),
],
[
 q('___ she at work?',['Am','Is','Are','Do'],1),
 q('___ they happy?',['Am','Is','Are','Do'],2),
 q('Where ___ you from?',['is','are','am','be'],1),
 q('___ is your name?',['What','Who','Where','How'],0),
 q('Is this ___ pen?',['you','your','yours to','you are'],1),
]),

card('g051','A1',['числа','возраст'],
'Числа 0–20 и возраст',
'one, two, three… · How old are you? — I\'m ten (years old).',
'Возраст в английском — через to be, не через have: I am ten years old. Числительные 13–19 оканчиваются на -teen: thirteen, fourteen, fifteen.',
[
 ex('I am ten years old.',[
  w('I','pron','/aɪ/'), w('am','verb','/æm/'), w('ten','num','/tɛn/'), w('years','noun','/jɪrz/'), w('old','adj','/oʊld/')]),
 ex('How old are you?',[
  w('How','adv','/haʊ/'), w('old','adj','/oʊld/'), w('are','verb','/ɑr/'), w('you','pron','/ju/')]),
 ex('My brother is seven.',[
  w('My','pron','/maɪ/'), w('brother','noun','/ˈbrʌðə/',{s:0}), w('is','verb','/ɪz/'), w('seven','num','/ˈsɛvn/',{s:0})]),
],
[
 err('I have ten years.','I am ten years old.','Возраст — через to be, не через have.'),
 err('I am ten years.','I am ten years old.','В конце нужно слово old.'),
],
[
 q('I ___ twelve years old.',['am','is','are','have'],0),
 q('Как пишется 5?',['five','fiv','fife','faiv'],0),
 q('How ___ are you?',['old','many','much','long'],0),
 q('She is ___ years old. (9)',['nine','nin','nain','none'],0),
 q('Two + three = ___',['five','four','six','seven'],0),
]),

card('g052','A1',['знакомство','базовое'],
'Приветствия и знакомство',
'Hello! / Hi! · My name is… · Nice to meet you',
'Первые фразы любого разговора: приветствие, имя, «приятно познакомиться». После My name всегда нужен is: My name is Anna.',
[
 ex('Hello! My name is Anna.',[
  w('Hello','adv','/həˈloʊ/',{s:1}), w('My','pron','/maɪ/'), w('name','noun','/neɪm/'), w('is','verb','/ɪz/'), w('Anna','noun','/ˈænə/',{s:0})]),
 ex('Nice to meet you.',[
  w('Nice','adj','/naɪs/'), w('to','part','/tə/'), w('meet','verb','/mit/'), w('you','pron','/ju/')]),
 ex('How are you? — I\'m fine, thanks.',[
  w('How','adv','/haʊ/'), w('are','verb','/ɑr/'), w('you','pron','/ju/'), w("I'm",'pron','/aɪm/'), w('fine','adj','/faɪn/'), w('thanks','noun','/θæŋks/')]),
],
[
 err('My name Anna.','My name is Anna.','Нужен глагол is: My name is…'),
 err('Nice meet you.','Nice to meet you.','Между nice и meet нужен to.'),
],
[
 q('My name ___ Kate.',['is','am','are','be'],0),
 q('___ to meet you!',['Nice','Good','Well','Fine'],0),
 q('How are you? — I\'m ___.',['fine','name','meet','old'],0),
 q('Hello! ___ Anna.',['I\'m','I is','Me is','My is'],0),
 q('«Приятно познакомиться»:',['Nice to meet you','Nice meet you','Meet you nice','You meet nice'],0),
]),

card('g053','A1',['have got','владение'],
'Have got / Has got',
'I/you/we/they have got · he/she/it has got · − haven\'t / hasn\'t got',
'«Иметь, владеть»: I have got a dog. С he/she/it — has got. В разговоре сокращают: I\'ve got, she\'s got.',
[
 ex('I have got a dog.',[
  w('I','pron','/aɪ/'), w('have','verb','/hæv/'), w('got','verb','/ɡɑt/'), w('a','art','/ə/'), w('dog','noun','/dɔɡ/')]),
 ex('She has got two cats.',[
  w('She','pron','/ʃi/'), w('has','verb','/hæz/'), w('got','verb','/ɡɑt/'), w('two','num','/tu/',{sl:[1]}), w('cats','noun','/kæts/')],
  'two — w немая'),
 ex('They haven\'t got a car.',[
  w('They','pron','/ðeɪ/'), w("haven't",'verb','/ˈhævnt/'), w('got','verb','/ɡɑt/'), w('a','art','/ə/'), w('car','noun','/kɑr/')]),
],
[
 err('She have got a pen.','She has got a pen.','С he/she/it — has got.'),
 err('I have got 10 years.','I am ten years old.','Возраст — to be; have got — о владении.'),
],
[
 q('He ___ got a bike.',['have','has','is','am'],1),
 q('We ___ got a big house.',['have','has','is','does'],0),
 q('___ she got a brother?',['Have','Has','Is','Does'],1),
 q('I haven\'t ___ a pen.',['got','get','getting','gets'],0),
 q('«У меня есть кошка»:',['I have got a cat','I has got a cat','I am a cat','I got have cat'],0),
]),

card('g054','A1',['модальные глаголы','умения'],
'Can / Can\'t',
'I can swim · I can\'t drive · Can you…?',
'Can — «могу, умею». После can глагол идёт без to: I can swim. Can не меняется по лицам: he can.',
[
 ex('I can swim.',[
  w('I','pron','/aɪ/'), w('can','modal','/kæn/'), w('swim','verb','/swɪm/')]),
 ex('She can\'t drive.',[
  w('She','pron','/ʃi/'), w("can't",'modal','/kænt/'), w('drive','verb','/draɪv/')]),
 ex('Can you help me?',[
  w('Can','modal','/kæn/'), w('you','pron','/ju/'), w('help','verb','/hɛlp/'), w('me','pron','/mi/')]),
],
[
 err('She can to swim.','She can swim.','После can — глагол без to.'),
 err('He cans dance.','He can dance.','Can не меняется по лицам — без -s.'),
],
[
 q('I ___ play the guitar.',['can','cans','to can','canning'],0),
 q('She ___ swim very well.',['can\'t','can to','not can','don\'t can'],0),
 q('___ you open the window?',['Can','Do','Are','Is'],0),
 q('После can глагол идёт…',['без to','с to','с -ing','с -ed'],0),
 q('«Я не умею петь»:',['I can\'t sing','I can sing','I don\'t can sing','I can to not sing'],0),
]),

card('g055','A1',['like','предпочтения'],
'I like / I don\'t like',
'I like music · She likes pizza · I don\'t like… · Do you like…?',
'«Нравиться, любить»: I like music. В 3-м лице ед. ч. — likes. О действии после like ставим -ing: I like swimming.',
[
 ex('I like music.',[
  w('I','pron','/aɪ/'), w('like','verb','/laɪk/'), w('music','noun','/ˈmjuzɪk/',{s:0})]),
 ex('She likes pizza.',[
  w('She','pron','/ʃi/'), w('likes','verb','/laɪks/'), w('pizza','noun','/ˈpitsə/',{s:0})]),
 ex('I don\'t like cold weather.',[
  w('I','pron','/aɪ/'), w("don't",'aux','/doʊnt/'), w('like','verb','/laɪk/'), w('cold','adj','/koʊld/'), w('weather','noun','/ˈwɛðɚ/',{s:0,sp:[2,3]})],
  'weather — ea читается /e/'),
],
[
 err('I like swim.','I like swimming.','После like о действии — форма -ing.'),
 err('She like tea.','She likes tea.','3-е лицо ед. ч. — likes.'),
],
[
 q('I ___ football.',['like','likes','liking','liked'],0),
 q('She ___ ice cream.',['likes','like','liking','liked'],0),
 q('___ you like cats?',['Do','Does','Are','Is'],0),
 q('I like ___ books.',['reading','read to','to reading','reads'],0),
 q('He ___ like coffee.',['doesn\'t','don\'t','isn\'t','not'],0),
]),

/* ================= ЧАСТИ РЕЧИ (A2) ================= */

card('g001','A2',['существительные','базовое'],
'Существительные: исчисляемые/неисчисляемые',
'a/an + countable (a book, two books) · some + uncountable (some water)',
'Исчисляемые существительные можно посчитать: a book, two books. Неисчисляемые — нельзя: water, money, advice. К ним не добавляют -s и не ставят a/an; используют some, much, a lot of.',
[
 ex('I need some water.',[
  w('I','pron','/aɪ/'), w('need','verb','/nid/'), w('some','det','/sʌm/'), w('water','noun','/ˈwɔtɚ/',{s:0})]),
 ex('She has three brothers.',[
  w('She','pron','/ʃi/'), w('has','verb','/hæz/'), w('three','num','/θri/'), w('brothers','noun','/ˈbrʌðəz/',{s:0})]),
 ex('How much time do we have?',[
  w('How','adv','/haʊ/'), w('much','det','/mʌtʃ/'), w('time','noun','/taɪm/'), w('do','aux','/də/'), w('we','pron','/wi/'), w('have','verb','/hæv/')],
  'do → слабая форма /də/'),
],
[
 err('I have many money.','I have a lot of money.','Money — неисчисляемое: much money или a lot of money, но не many.'),
 err('She gave me an advice.','She gave me some advice.','Advice неисчисляемое — без a/an. Отдельный предмет: a piece of advice.'),
],
[
 q('How ___ water do you drink?',['much','many','some','any'],0),
 q('I bought ___ at the market.',['a bread','breads','some bread','some breads'],2),
 q('There are three ___ in the yard.',['child','childs','children','childrens'],2),
 q('Can I have ___ information?',['an','a','some','many'],2),
 q("We don't have ___ time.",['many','much','a lot','no'],1),
]),

card('g002','A2',['существительные','множественное число'],
'Существительные: множественное число',
'+s (cats) · +es после -s/-sh/-ch/-x (boxes) · -y→-ies (city→cities) · men, children, feet',
'Большинство существительных образуют множественное число через -s/-es. Есть исключения: man→men, child→children, foot→feet, tooth→teeth, mouse→mice.',
[
 ex('The boxes are heavy.',[
  w('The','art','/ðə/'), w('boxes','noun','/ˈbɑksɪz/',{s:0}), w('are','verb','/ɑr/'), w('heavy','adj','/ˈhɛvi/',{s:0})]),
 ex('Two women work here.',[
  w('Two','num','/tu/',{sl:[0]}), w('women','noun','/ˈwɪmɪn/',{s:0,sp:[1,3]}), w('work','verb','/wɝk/',{sp:[1]}), w('here','adv','/hir/')]),
 ex('My feet hurt after the walk.',[
  w('My','pron','/maɪ/'), w('feet','noun','/fit/'), w('hurt','verb','/hɝt/'), w('after','prep','/ˈæftɚ/',{s:0}), w('the','art','/ðə/'), w('walk','noun','/wɔk/',{sl:[3]})],
  'walk — l немая: /wɔːk/'),
],
[
 err('I saw three mans.','I saw three men.','Man — неправильное множественное число: man → men.'),
 err('There are five peoples in the room.','There are five people in the room.','People — уже форма множественного числа от person.'),
],
[
 q("Plural of 'child'?",['childs','childes','children','childrens'],2),
 q("Plural of 'city'?",['citys','cities','cityes',"city's"],1),
 q("Plural of 'box'?",['boxs','boxes','boxen','box'],1),
 q('One foot, two ___.',['foots','feet','feets','footes'],1),
 q("Plural of 'mouse'?",['mouses','mice','mices','mouse'],1),
]),

card('g003','A2',['существительные','притяжательный падеж'],
'Существительные: притяжательный падеж',
"John's car · my friend's house · the children's room · the students' books",
"Притяжательный падеж: добавляем 's к одушевлённому существительному. Если слово уже оканчивается на -s во множественном числе — только апостроф: the students' books.",
[
 ex("This is Anna's bag.",[
  w('This','pron','/ðɪs/'), w('is','verb','/ɪz/'), w("Anna's",'noun','/ˈænəz/',{s:0}), w('bag','noun','/bæɡ/')]),
 ex("My brother's car is new.",[
  w('My','pron','/maɪ/'), w("brother's",'noun','/ˈbrʌðəz/',{s:0}), w('car','noun','/kɑr/'), w('is','verb','/ɪz/'), w('new','adj','/nu/')]),
 ex("The students' answers were good.",[
  w('The','art','/ðə/'), w("students'",'noun','/ˈstudənts/',{s:0}), w('answers','noun','/ˈænsɚz/',{s:0,sl:[2]}), w('were','verb','/wɝ/'), w('good','adj','/ɡʊd/')],
  "answer — w немая: /ˈɑːnsə/"),
],
[
 err('This is Johns car.',"This is John's car.","Не забывайте апостроф: John's."),
 err("The boys's toys are here.","The boys' toys are here.","Мн. ч. на -s: только апостроф, без второй s."),
],
[
 q("___ bike is red.",['Tom',"Tom's",'Toms"','Tom is'],1),
 q('These are the ___ shoes.',["childrens","children's",'children',"childrens'"],1),
 q('The ___ office is on the third floor.',["boss's","boss'",'bosses','boss'],0),
 q("Whose phone is this? It's ___.",["Mary's",'Marys','Mary','Maries'],0),
 q('___ sister lives in Paris.',["Ann's",'Anns','Ann',"Ann's her"],0),
]),

card('g004','A2',['артикли','a/an'],
'Артикли: a/an',
'a + согласный звук (a book) · an + гласный звук (an apple, an hour)',
'A/an ставим перед исчисляемыми в ед. ч., когда предмет упоминается впервые или это один из многих. Выбор зависит от звука, а не буквы: an hour (h немая), a university /ju/.',
[
 ex('She is an engineer.',[
  w('She','pron','/ʃi/'), w('is','verb','/ɪz/'), w('an','art','/ən/'), w('engineer','noun','/ˈɛndʒənɪr/',{s:2})]),
 ex('I saw a bird in the garden.',[
  w('I','pron','/aɪ/'), w('saw','verb','/sɔ/'), w('a','art','/ə/'), w('bird','noun','/bɝd/'), w('in','prep','/ɪn/'), w('the','art','/ðə/'), w('garden','noun','/ˈɡɑrdən/',{s:0})]),
 ex('It takes an hour by bus.',[
  w('It','pron','/ɪt/'), w('takes','verb','/teɪks/'), w('an','art','/ən/'), w('hour','noun','/aʊr/',{s:0,sl:[0]}), w('by','prep','/baɪ/'), w('bus','noun','/bʌs/')],
  'hour — h немая: /ˈaʊə/'),
],
[
 err('She is a engineer.','She is an engineer.','Перед гласным звуком — an.'),
 err('He waited for a hour.','He waited for an hour.','hour начинается со звука /aʊ/ — an, несмотря на букву h.'),
],
[
 q('I need ___ umbrella.',['a','an','the','—'],1),
 q('He is ___ honest man.',['a','an','the','—'],1),
 q('She has ___ university degree.',['a','an','the','—'],0),
 q('We waited for ___ hour.',['a','an','the','—'],1),
 q('It was ___ amazing film.',['a','an','the','—'],1),
]),

card('g005','A2',['артикли','the'],
'Артикли: the',
'the = конкретный предмет: the sun, the door (который мы оба видим)',
'The используем, когда предмет конкретен или известен собеседнику: упомянут раньше, единственный в своём роде (the sun, the moon) или понятен из ситуации.',
[
 ex('Close the door, please.',[
  w('Close','verb','/kloʊz/'), w('the','art','/ðə/'), w('door','noun','/dɔr/'), w('please','adv','/pliz/')]),
 ex('The sun is bright today.',[
  w('The','art','/ðə/'), w('sun','noun','/sʌn/'), w('is','verb','/ɪz/'), w('bright','adj','/braɪt/'), w('today','adv','/təˈdeɪ/',{s:1})]),
 ex('I bought a shirt. The shirt is blue.',[
  w('I','pron','/aɪ/'), w('bought','verb','/bɔt/'), w('a','art','/ə/'), w('shirt','noun','/ʃɝt/'), w('The','art','/ðə/'), w('shirt','noun','/ʃɝt/'), w('is','verb','/ɪz/'), w('blue','adj','/blu/')],
  'Первое упоминание — a, второе — the'),
],
[
 err('I live in the Moscow.','I live in Moscow.','Перед названиями городов артикль не нужен.'),
 err('Sun rises in the east.','The sun rises in the east.','Уникальные объекты — всегда the: the sun, the moon.'),
],
[
 q('Where is ___ key I gave you?',['a','an','the','—'],2),
 q('___ Moon goes around ___ Earth.',['A … a','The … the','— … —','The … a'],1),
 q("Can you close ___ window? It's cold.",['a','an','the','—'],2),
 q('She plays ___ piano.',['a','an','the','—'],2),
 q('This is ___ best film ever.',['a','an','the','—'],2),
]),

card('g006','A2',['артикли','нулевой артикль'],
'Артикли: нулевой',
'без артикля: обобщения (I like music), приёмы пищи (have lunch), города, страны, виды спорта',
'Артикль не ставится перед неисчисляемыми и множественным числом в общем смысле (I like music, Cats are cute), перед именами, городами, большинством стран, приёмами пищи и видами спорта.',
[
 ex('I like music and books.',[
  w('I','pron','/aɪ/'), w('like','verb','/laɪk/'), w('music','noun','/ˈmjuzɪk/',{s:0}), w('and','conj','/ən/'), w('books','noun','/bʊks/')],
  'and → /ən/ (слабая форма)'),
 ex('She has lunch at school.',[
  w('She','pron','/ʃi/'), w('has','verb','/hæz/'), w('lunch','noun','/lʌntʃ/'), w('at','prep','/æt/'), w('school','noun','/skul/',{sp:[2,3]})],
  'school — ch → /k/'),
 ex('Cats sleep a lot.',[
  w('Cats','noun','/kæts/'), w('sleep','verb','/slip/'), w('a','art','/ə/'), w('lot','adv','/lɑt/')]),
],
[
 err('I love the cats.','I love cats.','Обобщённое множество — без артикля; the cats = конкретные коты.'),
 err('We had the dinner at 7.','We had dinner at 7.','Приёмы пищи — без артикля: have breakfast/lunch/dinner.'),
],
[
 q("I'm interested in ___ history.",['a','an','the','—'],3),
 q('She plays ___ tennis.',['a','an','the','—'],3),
 q('We had ___ breakfast at 8.',['a','an','the','—'],3),
 q('___ life is beautiful.',['A','The','—','An'],2),
 q('He goes to ___ school by bus.',['a','an','the','—'],3),
]),

card('g007','A2',['местоимения','личные','притяжательные'],
'Местоимения: личные и притяжательные',
'I — my — mine · he — his · she — her — hers · they — their — theirs',
'Личные местоимения заменяют подлежащее (I, you, he…). Притяжательные (my, your, his…) стоят перед существительным. Абсолютные формы (mine, hers, theirs) — без существительного: This book is mine.',
[
 ex('This is my sister. Her name is Kate.',[
  w('This','pron','/ðɪs/'), w('is','verb','/ɪz/'), w('my','pron','/maɪ/'), w('sister','noun','/ˈsɪstɚ/',{s:0}), w('Her','pron','/hɝ/'), w('name','noun','/neɪm/'), w('is','verb','/ɪz/'), w('Kate','noun','/keɪt/')]),
 ex('We love our city.',[
  w('We','pron','/wi/'), w('love','verb','/lʌv/',{sp:[1]}), w('our','pron','/aʊr/',{s:0}), w('city','noun','/ˈsɪti/',{s:0})]),
 ex('The red car is theirs.',[
  w('The','art','/ðə/'), w('red','adj','/rɛd/'), w('car','noun','/kɑr/'), w('is','verb','/ɪz/'), w('theirs','pron','/ðɛrz/')]),
],
[
 err('Me like coffee.','I like coffee.','Me — объектное местоимение; подлежащее — I.'),
 err('This is mines.','This is mine.','Mine уже притяжательное — без -s.'),
],
[
 q('___ brother is a pilot.',['I','My','Me','Mine'],1),
 q('Is this bag ___?',['your','you','yours',"you're"],2),
 q('She forgot ___ keys.',['her','she','hers','herself'],0),
 q('The cat drinks ___ milk.',['it',"its","it's","its'"],1),
 q('We sold ___ house.',['our','us','ours','ourselves'],0),
]),

card('g008','A2',['местоимения','объектные','указательные'],
'Местоимения: объектные и указательные',
'I → me · he → him · she → her · they → them · this/these (рядом) · that/those (далеко)',
'Объектные местоимения стоят после глагола или предлога: see me, with him. This/these — о том, что рядом или сейчас; that/those — о том, что дальше или в прошлом.',
[
 ex('Call me tomorrow.',[
  w('Call','verb','/kɔl/'), w('me','pron','/mi/'), w('tomorrow','adv','/təˈmɑroʊ/',{s:1})]),
 ex('I gave him the book.',[
  w('I','pron','/aɪ/'), w('gave','verb','/ɡeɪv/'), w('him','pron','/hɪm/'), w('the','art','/ðə/'), w('book','noun','/bʊk/')]),
 ex('These apples are sweet, but those are sour.',[
  w('These','pron','/ðiz/'), w('apples','noun','/ˈæpəlz/',{s:0}), w('are','verb','/ɑr/'), w('sweet','adj','/swit/'), w('but','conj','/bʌt/'), w('those','pron','/ðoʊz/'), w('are','verb','/ɑr/'), w('sour','adj','/saʊr/',{s:0})]),
],
[
 err('She loves I.','She loves me.','После глагола — объектное местоимение me.'),
 err('Between you and I.','Between you and me.','После предлога — me: between you and me.'),
],
[
 q('Can you help ___?',['I','me','my','mine'],1),
 q("We're going with ___.",['they','them','their','theirs'],1),
 q('___ shoes over there are hers.',['This','That','These','Those'],3),
 q('___ book in my hand is new.',['This','Those','These are','That over'],0),
 q('Give ___ the pen, please.',['I','my','me','mine'],2),
]),

card('g009','A2',['местоимения','some/any'],
'Местоимения: неопределённые',
'some (+): some water, somebody · any (−/?): any milk, anybody · nobody — никто',
'Some — в утверждениях и просьбах. Any — в отрицаниях и вопросах. Somebody/someone — кто-то; anybody — кто-нибудь/никто (в отрицаниях); nobody — никто, глагол после него в положительной форме.',
[
 ex('There is some milk in the fridge.',[
  w('There','adv','/ðɛr/'), w('is','verb','/ɪz/'), w('some','det','/sʌm/'), w('milk','noun','/mɪlk/'), w('in','prep','/ɪn/'), w('the','art','/ðə/'), w('fridge','noun','/frɪdʒ/')],
  "There is → there's /ðeəz/"),
 ex('Do you have any questions?',[
  w('Do','aux','/də/'), w('you','pron','/ju/'), w('have','verb','/hæv/'), w('any','det','/ˈɛni/',{sp:[0]}), w('questions','noun','/ˈkwɛstʃənz/',{s:0,sp:[4,5]})],
  'Do you → /dʒə/; question — ti → /tʃ/'),
 ex('Nobody knows the answer.',[
  w('Nobody','pron','/ˈnoʊbədi/',{s:0}), w('knows','verb','/noʊz/',{sl:[0]}), w('the','art','/ðə/'), w('answer','noun','/ˈænsɚ/',{s:0,sl:[2]})],
  'know, answer — немые k и w'),
],
[
 err("I don't have some money.","I don't have any money.",'В отрицаниях — any, не some.'),
 err("Nobody doesn't know him.",'Nobody knows him.','Nobody уже отрицание — второй not не нужен.'),
],
[
 q('Would you like ___ tea?',['any','some','no','nothing'],1),
 q("I don't see ___ difference.",['some','any','no','none'],1),
 q('___ called you yesterday.',['Anybody','Somebody','Nobody never','Any one'],1),
 q('Is there ___ bread left?',['some','any','no','nothing'],1),
 q('I looked for my keys, but found ___.',['anywhere','somewhere','nowhere','everywhere'],2),
]),

card('g010','A2',['местоимения','возвратные'],
'Местоимения: возвратные',
'myself · yourself · himself · herself · itself · ourselves · yourselves · themselves',
'Возвратные местоимения показывают, что действие направлено на самого деятеля: I hurt myself. Также для усиления: I did it myself — я сам это сделал.',
[
 ex("Be careful! Don't hurt yourself.",[
  w('Be','verb','/bi/'), w('careful','adj','/ˈkɛrfəl/',{s:0}), w("Don't",'aux','/doʊnt/'), w('hurt','verb','/hɝt/'), w('yourself','pron','/ˈjɔrsɛlf/',{s:1})]),
 ex('She taught herself French.',[
  w('She','pron','/ʃi/'), w('taught','verb','/tɔt/'), w('herself','pron','/hɚˈsɛlf/',{s:1}), w('French','noun','/frɛntʃ/')]),
 ex('We built the house ourselves.',[
  w('We','pron','/wi/'), w('built','verb','/bɪlt/'), w('the','art','/ðə/'), w('house','noun','/haʊs/'), w('ourselves','pron','/aʊɚˈsɛlvz/',{s:1})]),
],
[
 err('Myself went to the shop.','I went to the shop myself.','Myself не заменяет I в роли подлежащего.'),
 err('They introduced theirself.','They introduced themselves.','Форма для they — themselves.'),
],
[
 q('I can do it ___.',['me','myself','mine','my'],1),
 q('The cat is washing ___.',['itself','it','himself','herself'],0),
 q('We enjoyed ___ at the party.',['ourself','ourselves','us','our'],1),
 q('He blames ___ for the mistake.',['him','his','himself','heself'],2),
 q('Did you paint this ___, or did someone help you?',['you','yourself','yours','your'],1),
]),

card('g011','A2',['местоимения','относительные'],
'Местоимения: относительные',
'who (люди) · which (вещи) · that (люди/вещи) · whose (чей) · where (где)',
'Относительные местоимения соединяют главное предложение с придаточным. Who — о людях, which — о предметах, that — можно вместо обоих в определительных придаточных, whose — чей.',
[
 ex('The man who lives next door is a doctor.',[
  w('The','art','/ðə/'), w('man','noun','/mæn/'), w('who','pron','/hu/',{sl:[1]}), w('lives','verb','/lɪvz/'), w('next','adj','/nɛkst/'), w('door','noun','/dɔr/'), w('is','verb','/ɪz/'), w('a','art','/ə/'), w('doctor','noun','/ˈdɑktɚ/',{s:0})],
  'who — w немая'),
 ex('The book which I borrowed was great.',[
  w('The','art','/ðə/'), w('book','noun','/bʊk/'), w('which','pron','/wɪtʃ/'), w('I','pron','/aɪ/'), w('borrowed','verb','/ˈbɑroʊd/',{s:0}), w('was','verb','/wɑz/'), w('great','adj','/ɡreɪt/',{sp:[2,3]})],
  'great — ea → /eɪ/'),
 ex("She's the girl whose father works with me.",[
  w("She's",'pron','/ʃiz/'), w('the','art','/ðə/'), w('girl','noun','/ɡɝl/'), w('whose','pron','/huz/',{sl:[1]}), w('father','noun','/ˈfɑðɚ/',{s:0}), w('works','verb','/wɝks/',{sp:[1]}), w('with','prep','/wɪð/'), w('me','pron','/mi/')]),
],
[
 err('The car who is red is mine.','The car which is red is mine.','Who — только для людей; для предметов — which/that.'),
 err('The man which called you is here.','The man who called you is here.','Для людей — who.'),
],
[
 q('The woman ___ lives here is my aunt.',['which','who','whose','where'],1),
 q('This is the film ___ everybody talks about.',['who','whose','that','where'],2),
 q('Do you know the boy ___ dog barks all night?',['who','which','whose','whom'],2),
 q("That's the café ___ we met.",['which','who','whose','where'],3),
 q('The phone ___ I bought is broken.',['who','which','whose','where'],1),
]),

card('g012','A2',['прилагательные','сравнение'],
'Прилагательные: степени сравнения',
'big → bigger → the biggest · famous → more famous → the most famous · good → better → the best',
'Короткие прилагательные: -er/-est (tall → taller → the tallest). Длинные (2+ слога, кроме -y): more/most. Исключения: good→better→best, bad→worse→worst, far→further.',
[
 ex('Today is hotter than yesterday.',[
  w('Today','adv','/təˈdeɪ/',{s:1}), w('is','verb','/ɪz/'), w('hotter','adj','/ˈhɑtɚ/',{s:0}), w('than','conj','/ðæn/'), w('yesterday','adv','/ˈjɛstɚdeɪ/',{s:0})]),
 ex('This film is more interesting than that one.',[
  w('This','pron','/ðɪs/'), w('film','noun','/fɪlm/'), w('is','verb','/ɪz/'), w('more','adv','/mɔr/'), w('interesting','adj','/ˈɪntrəstɪŋ/',{s:0}), w('than','conj','/ðæn/'), w('that','pron','/ðæt/'), w('one','num','/wʌn/',{sp:[0],sl:[2]})],
  'one — o → /w/, e немая'),
 ex('She is the best student in the class.',[
  w('She','pron','/ʃi/'), w('is','verb','/ɪz/'), w('the','art','/ðə/'), w('best','adj','/bɛst/'), w('student','noun','/ˈstudənt/',{s:0}), w('in','prep','/ɪn/'), w('the','art','/ðə/'), w('class','noun','/klæs/')]),
],
[
 err('This book is more better.','This book is better.','Нельзя соединять more и -er: или more interesting, или better.'),
 err('He is tallest in the team.','He is the tallest in the team.','Superlative требует the.'),
],
[
 q('An elephant is ___ than a horse.',['big','bigger','biggest','more big'],1),
 q('This task is ___ than the last one.',['difficult','more difficult','most difficult','difficulter'],1),
 q('She is ___ singer in the country.',['famous','more famous','the most famous','most famous'],2),
 q('My coffee is ___ than yours.',['good','better','best','more good'],1),
 q('February is ___ month of the year.',['short','shorter','the shortest','shortest'],2),
]),

card('g013','A2',['прилагательные','порядок'],
'Прилагательные: порядок',
'мнение → размер → возраст → форма → цвет → происхождение → материал → назначение',
'В английском прилагательные идут в строгом порядке: opinion → size → age → shape → color → origin → material → purpose. Big red wooden chair — размер, цвет, материал.',
[
 ex('She wore a beautiful long black dress.',[
  w('She','pron','/ʃi/'), w('wore','verb','/wɔr/'), w('a','art','/ə/'), w('beautiful','adj','/ˈbjutəfəl/',{s:0}), w('long','adj','/lɔŋ/'), w('black','adj','/blæk/'), w('dress','noun','/drɛs/')]),
 ex('He bought an old round wooden table.',[
  w('He','pron','/hi/'), w('bought','verb','/bɔt/'), w('an','art','/ən/'), w('old','adj','/oʊld/'), w('round','adj','/raʊnd/'), w('wooden','adj','/ˈwʊdən/',{s:0}), w('table','noun','/ˈteɪbəl/',{s:0})]),
 ex('I have a small gray Japanese car.',[
  w('I','pron','/aɪ/'), w('have','verb','/hæv/'), w('a','art','/ə/'), w('small','adj','/smɔl/'), w('gray','adj','/ɡreɪ/'), w('Japanese','adj','/dʒæpəˈniz/',{s:2}), w('car','noun','/kɑr/')]),
],
[
 err('She has a red big bag.','She has a big red bag.','Размер идёт перед цветом: big red.'),
 err("It's a wooden old chair.","It's an old wooden chair.",'Возраст перед материалом: old wooden.'),
],
[
 q('Choose the correct order:',['a leather nice bag','a nice leather bag','a bag nice leather','a nice bag leather'],1),
 q('___ car',['a red Japanese new','a Japanese red new','a new red Japanese','a new Japanese red'],2),
 q('She adopted ___ puppy.',['a brown little','a little brown','little a brown','brown a little'],1),
 q('It was ___ day.',['a cold rainy fall','a rainy cold fall','a fall cold rainy','a cold fall rainy'],0),
 q('He gave me ___ box.',['a small square cardboard','a cardboard small square','a square small cardboard','a cardboard square small'],0),
]),

card('g014','A2',['прилагательные','-ed/-ing'],
'Прилагательные: -ed vs -ing',
'bored (кто-то скучает) · boring (что-то скучное) · interested in · interesting',
'Прилагательные на -ed описывают чувства человека (the film bored me → I am bored). На -ing — свойство предмета или человека, вызывающего чувство (the film is boring).',
[
 ex('The film was really boring.',[
  w('The','art','/ðə/'), w('film','noun','/fɪlm/'), w('was','verb','/wɑz/'), w('really','adv','/ˈrɪli/',{s:0}), w('boring','adj','/ˈbɔrɪŋ/',{s:0})]),
 ex('I was bored during the lesson.',[
  w('I','pron','/aɪ/'), w('was','verb','/wɑz/'), w('bored','adj','/bɔrd/'), w('during','prep','/ˈdʊrɪŋ/',{s:0}), w('the','art','/ðə/'), w('lesson','noun','/ˈlɛsən/',{s:0})]),
 ex('We were surprised by the news.',[
  w('We','pron','/wi/'), w('were','verb','/wɝ/'), w('surprised','adj','/səˈpraɪzd/',{s:1}), w('by','prep','/baɪ/'), w('the','art','/ðə/'), w('news','noun','/nuz/')]),
],
[
 err('I am very interesting in history.','I am very interested in history.','Человек испытывает интерес — interested; интересным может быть предмет.'),
 err('The trip was tiring, so I felt tiring.','The trip was tiring, so I felt tired.','О своём чувстве говорим через -ed: tired.'),
],
[
 q('The lesson was ___. I fell asleep.',['bored','boring','bore','bores'],1),
 q("I'm ___ in astronomy.",['interesting','interested','interest','interests'],1),
 q('What an ___ idea!',['excited','exciting','excite','excitedly'],1),
 q('She was ___ when she saw the snake.',['frightening','frightened','frighten','frights'],1),
 q('The news was ___, so we were ___.',['surprising … surprised','surprised … surprising','surprise … surprising','surprising … surprise'],0),
]),

card('g015','A2',['наречия','частота'],
'Наречия: частоты',
'always (100%) → usually → often → sometimes → rarely → never (0%) · перед глаголом, после be',
'Наречия частоты стоят перед смысловым глаголом (I often walk) и после глагола be (He is always late).',
[
 ex('I usually walk to work.',[
  w('I','pron','/aɪ/'), w('usually','adv','/ˈjuʒəwəli/',{s:0}), w('walk','verb','/wɔk/',{sl:[3]}), w('to','prep','/tə/'), w('work','noun','/wɝk/',{sp:[1]})]),
 ex('She is always on time.',[
  w('She','pron','/ʃi/'), w('is','verb','/ɪz/'), w('always','adv','/ˈɔlweɪz/',{s:0}), w('on','prep','/ɑn/'), w('time','noun','/taɪm/')]),
 ex('We rarely eat fast food.',[
  w('We','pron','/wi/'), w('rarely','adv','/ˈrɛrli/',{s:0}), w('eat','verb','/it/'), w('fast','adj','/fæst/'), w('food','noun','/fud/')]),
],
[
 err('I go always to the gym.','I always go to the gym.','Частотные наречия — перед смысловым глаголом.'),
 err('He is late always.','He is always late.','После be наречие стоит перед прилагательным: is always late.'),
],
[
 q('He ___ gets up at 6 a.m.',['usual','usually','use','used to'],1),
 q('They ___ late for meetings.',['are always','always are','always','always be'],0),
 q('How ___ do you visit your grandma?',['often','much','many','long'],0),
 q('We ___ argue.',['hardly ever','hard ever','ever hardly','hardly never'],0),
 q('She ___ comes here.',['sometime','sometimes','some times','some time'],1),
]),

card('g016','A2',['наречия','образ действия','степень'],
'Наречия: образа действия и степени',
'adj + -ly: slow → slowly · very, too, quite, really + adj/adv',
'Наречия образа действия образуются через -ly (careful → carefully). Наречия степени усиливают или ослабляют значение: very good, too expensive, quite difficult.',
[
 ex('She speaks English very well.',[
  w('She','pron','/ʃi/'), w('speaks','verb','/spiks/'), w('English','noun','/ˈɪŋɡlɪʃ/',{s:0}), w('very','adv','/ˈvɛri/',{s:0}), w('well','adv','/wɛl/')]),
 ex('He drives too fast.',[
  w('He','pron','/hi/'), w('drives','verb','/draɪvz/'), w('too','adv','/tu/'), w('fast','adv','/fæst/')]),
 ex('Please, listen carefully.',[
  w('Please','adv','/pliz/'), w('listen','verb','/ˈlɪsən/',{s:0,sl:[3]}), w('carefully','adv','/ˈkɛrfəli/',{s:0})],
  'listen — t немая'),
],
[
 err('She sings beautiful.','She sings beautifully.','Наречие образа действия: beautifully.'),
 err('He is too much tall.','He is too tall.','Too стоит прямо перед прилагательным.'),
],
[
 q('He runs ___.',['quick','quickly','quickness','quicker'],1),
 q('This bag is ___ expensive.',['very much','very','too much','so much'],1),
 q('She speaks English ___.',['good','well','goodly','best'],1),
 q('The coffee is ___ hot to drink.',['very','too','so','much'],1),
 q('They worked ___ all night.',['hard','hardly','harder','hardest'],0),
]),

card('g017','A2',['предлоги','время'],
'Предлоги: времени',
'at 5 o\'clock · on Monday · in July · by Friday (не позже) · since 2020 (с тех пор) · for two hours (в течение)',
'at — точное время (at 6 pm, at night); on — дни и даты (on Monday, on 5 May); in — месяцы, годы (in May, in 2025). by — к какому сроку; since — с какого момента; for — как долго.',
[
 ex("The meeting starts at 9 o'clock.",[
  w('The','art','/ðə/'), w('meeting','noun','/ˈmitɪŋ/',{s:0}), w('starts','verb','/stɑrts/'), w('at','prep','/æt/'), w('9','num','/naɪn/'), w("o'clock",'adv','/əˈklɑk/',{s:1})]),
 ex('We met on Friday evening.',[
  w('We','pron','/wi/'), w('met','verb','/mɛt/'), w('on','prep','/ɑn/'), w('Friday','noun','/ˈfraɪdeɪ/',{s:0}), w('evening','noun','/ˈivnɪŋ/',{s:0})]),
 ex("I've worked here for five years.",[
  w("I've",'pron','/aɪv/'), w('worked','verb','/wɝkt/',{sp:[1]}), w('here','adv','/hir/'), w('for','prep','/fɚ/'), w('five','num','/faɪv/'), w('years','noun','/jɪrz/')],
  'for → слабая форма /fə/'),
],
[
 err("I'll see you in Monday.","I'll see you on Monday.",'Дни недели — on.'),
 err('She was born at 1998.','She was born in 1998.','Годы — in.'),
],
[
 q('The train leaves ___ 7:30.',['in','on','at','by'],2),
 q('My birthday is ___ July.',['in','on','at','since'],0),
 q('We have known each other ___ 2019.',['for','since','at','from'],1),
 q('I lived in Paris ___ three years.',['since','for','at','during'],1),
 q('Finish the report ___ Friday.',['until','by','in','at'],1),
]),

card('g018','A2',['предлоги','место'],
'Предлоги: места и движения',
'in (внутри) · on (на поверхности) · at (у точки) · to (направление) · into (внутрь, движение) · across (через)',
'in — внутри пространства (in the room); on — на поверхности (on the table); at — у точки (at the door, at school). to — направление, into — движение внутрь, across — через.',
[
 ex('The keys are in the drawer.',[
  w('The','art','/ðə/'), w('keys','noun','/kiz/'), w('are','verb','/ɑr/'), w('in','prep','/ɪn/'), w('the','art','/ðə/'), w('drawer','noun','/drɔr/')]),
 ex('Your phone is on the table.',[
  w('Your','pron','/jɔr/'), w('phone','noun','/foʊn/'), w('is','verb','/ɪz/'), w('on','prep','/ɑn/'), w('the','art','/ðə/'), w('table','noun','/ˈteɪbəl/',{s:0})]),
 ex('She walked across the bridge.',[
  w('She','pron','/ʃi/'), w('walked','verb','/wɔkt/'), w('across','prep','/əˈkrɔs/',{s:1}), w('the','art','/ðə/'), w('bridge','noun','/brɪdʒ/')]),
],
[
 err('I arrived to London.','I arrived in London.','arrive in (город/страна), arrive at (конкретное место).'),
 err('The book is in the table.','The book is on the table.','На поверхности — on.'),
],
[
 q('I live ___ Berlin.',['at','in','on','to'],1),
 q('The cat is ___ the roof.',['in','on','at','into'],1),
 q('We met ___ the airport.',['in','on','at','into'],2),
 q('She jumped ___ the pool.',['in','into','on','at'],1),
 q('He walked ___ the street to the shop.',['across','above','along','under'],0),
]),

card('g019','A2',['предлоги','зависимые'],
'Предлоги: зависимые',
'depend ON · interested IN · good AT · listen TO · wait FOR · afraid OF',
'Многие глаголы, прилагательные и существительные требуют определённого предлога. Учите их сразу вместе: depend on, believe in, look forward to, afraid of.',
[
 ex('It depends on the weather.',[
  w('It','pron','/ɪt/'), w('depends','verb','/dɪˈpɛndz/',{s:1}), w('on','prep','/ɑn/'), w('the','art','/ðə/'), w('weather','noun','/ˈwɛðɚ/',{s:0,sp:[2,3]})],
  'weather — ea → /e/'),
 ex("I'm interested in astronomy.",[
  w("I'm",'pron','/aɪm/'), w('interested','adj','/ˈɪntrəstɪd/',{s:0}), w('in','prep','/ɪn/'), w('astronomy','noun','/əˈstrɑnəmi/',{s:1})]),
 ex('She is good at solving problems.',[
  w('She','pron','/ʃi/'), w('is','verb','/ɪz/'), w('good','adj','/ɡʊd/'), w('at','prep','/æt/'), w('solving','verb','/ˈsɑlvɪŋ/',{s:0}), w('problems','noun','/ˈprɑbləmz/',{s:0})]),
],
[
 err("I'm waiting of the bus.","I'm waiting for the bus.",'wait FOR.'),
 err('He is married with a doctor.','He is married to a doctor.','married TO somebody.'),
],
[
 q('This cake tastes ___ honey.',['of','with','at','from'],0),
 q("She's afraid ___ spiders.",['from','of','about','with'],1),
 q('Listen ___ me carefully.',['at','to','for','in'],1),
 q("I'm looking forward ___ the trip.",['for','to','at','on'],1),
 q('It depends ___ you.',['of','from','on','about'],2),
]),

card('g020','A2',['союзы'],
'Союзы',
'and (и) · or (или) · but (но) · because (потому что) · although (хотя) · while (пока) · if (если) · when (когда)',
'Союзы соединяют слова или части предложения. and/or/but — сочинительные; because, although, while, if, when — подчинительные, вводят придаточные.',
[
 ex('I wanted to come, but I was ill.',[
  w('I','pron','/aɪ/'), w('wanted','verb','/ˈwɔntɪd/',{s:0}), w('to','part','/tə/'), w('come','verb','/kʌm/'), w('but','conj','/bʌt/'), w('I','pron','/aɪ/'), w('was','verb','/wɑz/'), w('ill','adj','/ɪl/')],
  'to → слабая форма /tə/'),
 ex('She stayed at home because it was raining.',[
  w('She','pron','/ʃi/'), w('stayed','verb','/steɪd/'), w('at','prep','/æt/'), w('home','noun','/hoʊm/'), w('because','conj','/bɪˈkɑz/',{s:1}), w('it','pron','/ɪt/'), w('was','verb','/wɑz/'), w('raining','verb','/ˈreɪnɪŋ/',{s:0})]),
 ex("When I finish work, I'll call you.",[
  w('When','conj','/wɛn/'), w('I','pron','/aɪ/'), w('finish','verb','/ˈfɪnɪʃ/',{s:0}), w('work','noun','/wɝk/',{sp:[1]}), w("I'll",'pron','/aɪl/'), w('call','verb','/kɔl/'), w('you','pron','/ju/')]),
],
[
 err('Although it was cold, but we went out.','Although it was cold, we went out.','Нельзя использовать although и but вместе.'),
 err('Because I was tired, so I went to bed.','Because I was tired, I went to bed.','Because и so не используются вместе.'),
],
[
 q('I was hungry, ___ I made a sandwich.',['because','so','although','but'],1),
 q('We can go by bus ___ by train.',['or','so','because','although'],0),
 q('___ it was raining, we went for a walk.',['Because','So','Although','But'],2),
 q('Call me ___ you arrive.',['when','if','although','while'],0),
 q('He was sleeping ___ I was cooking.',['while','because','so','or'],0),
]),

card('g021','A2',['числа','даты','время'],
'Числа: количественные, порядковые, даты, время',
'1st, 2nd, 3rd, 4th… · the third of May · half past six · a quarter to nine',
'Порядковые: first, second, third, затем -th (fourth, fifth — особые). Время: half past six (6:30), a quarter to nine (8:45).',
[
 ex('My birthday is on the third of June.',[
  w('My','pron','/maɪ/'), w('birthday','noun','/ˈbɝθdeɪ/',{s:0}), w('is','verb','/ɪz/'), w('on','prep','/ɑn/'), w('the','art','/ðə/'), w('third','num','/θɝd/'), w('of','prep','/əv/'), w('June','noun','/dʒun/')]),
 ex('The film starts at a quarter past eight.',[
  w('The','art','/ðə/'), w('film','noun','/fɪlm/'), w('starts','verb','/stɑrts/'), w('at','prep','/æt/'), w('a','art','/ə/'), w('quarter','noun','/ˈkwɔrtɚ/',{s:0}), w('past','prep','/pæst/'), w('eight','num','/eɪt/')]),
 ex('It costs twenty euros.',[
  w('It','pron','/ɪt/'), w('costs','verb','/kɑsts/'), w('twenty','num','/ˈtwɛnti/',{s:0}), w('euros','noun','/ˈjuroʊz/',{s:0})]),
],
[
 err('I have twenty one years.','I am twenty-one years old.','Возраст: to be + число + years old.'),
 err('The meeting is on 10:00.','The meeting is at 10:00.','Точное время — at.'),
],
[
 q('3rd =',['threeth','third','three','thirdy'],1),
 q('6:45 =',['a quarter past six','a quarter to seven','six quarters','half past six'],1),
 q('How do you spell 12?',['twelth','twelve','twelwe','second'],1),
 q('The exam is ___ 15 May.',['in','at','on','by'],2),
 q('£4.50 =',['four pounds and half','four pounds fifty','four fifty pound','four pound fifty'],1),
]),

/* ================= ВРЕМЕНА (A2–B1) ================= */

card('g022','A2',['времена','настоящее'],
'Present Simple',
'S + V (he/she/it: V + s/es) · ? Do/Does + S + V · − S + don\'t/doesn\'t + V',
'Регулярные действия, факты, привычки, расписания. В 3-м лице ед. ч. (he/she/it) к глаголу добавляется -s/-es. Вопросы и отрицания — через do/does.',
[
 ex('I work every day.',[
  w('I','pron','/aɪ/'), w('work','verb','/wɝk/',{sp:[1]}), w('every','det','/ˈɛvri/',{s:0}), w('day','noun','/deɪ/')]),
 ex('She reads books in the evening.',[
  w('She','pron','/ʃi/'), w('reads','verb','/ridz/'), w('books','noun','/bʊks/'), w('in','prep','/ɪn/'), w('the','art','/ðə/'), w('evening','noun','/ˈivnɪŋ/',{s:0})]),
 ex('Water boils at 100 degrees.',[
  w('Water','noun','/ˈwɔtɚ/',{s:0}), w('boils','verb','/bɔɪlz/'), w('at','prep','/æt/'), w('100','num','/ˈhʌndrəd/',{s:0}), w('degrees','noun','/dɪˈɡriz/',{s:1})]),
],
[
 err('I works every day.','I work every day.','Не добавляем -s после I/you/we/they.'),
 err("She don't like coffee.","She doesn't like coffee.","3-е лицо ед. ч. → doesn't, не don't."),
],
[
 q('She ___ to school every day.',['go','goes','going','gone'],1),
 q('___ you like tea?',['Do','Does','Is','Are'],0),
 q('He ___ play football.',["don't","doesn't","isn't","aren't"],1),
 q('Water ___ at 0 degrees.',['freeze','freezes','freezing','frozen'],1),
 q('Выберите правильное: ___',["I doesn't know","I don't know",'I not know','I am not know'],1),
]),

card('g023','A2',['времена','настоящее'],
'Present Continuous',
'S + am/is/are + V-ing · now, at the moment, Look!',
'Действие происходит сейчас или в текущий период. Также запланированное будущее: I\'m meeting Anna tomorrow. Глаголы состояния (know, like, want) в Continuous не используются.',
[
 ex("I'm reading a book now.",[
  w("I'm",'pron','/aɪm/'), w('reading','verb','/ˈridɪŋ/',{s:0}), w('a','art','/ə/'), w('book','noun','/bʊk/'), w('now','adv','/naʊ/')]),
 ex("She isn't working today.",[
  w('She','pron','/ʃi/'), w("isn't",'verb','/ˈɪznt/'), w('working','verb','/ˈwɝkɪŋ/',{s:0,sp:[1]}), w('today','adv','/təˈdeɪ/',{s:1})],
  "isn't → /ˈɪznt/"),
 ex("Look! It's raining.",[
  w('Look','verb','/lʊk/'), w("It's",'pron','/ɪts/'), w('raining','verb','/ˈreɪnɪŋ/',{s:0})]),
],
[
 err('I am work now.','I am working now.','Нужна форма -ing.'),
 err('She is knowing the answer.','She knows the answer.','Глаголы состояния (know, like, want) не используются в Continuous.'),
],
[
 q('Listen! Someone ___ the piano.',['plays','is playing','play','played'],1),
 q('We ___ to Spain next week.',['fly','are flying','flies','flew'],1),
 q('He ___ TV at the moment.',['watch','is watching','watches','watching'],1),
 q('I ___ your idea.',["don't understand",'am not understanding','understand not','not understand'],0),
 q('Why ___ you crying?',['do','are','is','does'],1),
]),

card('g024','A2',['времена','прошедшее'],
'Past Simple',
'S + V2 (worked, went) · − S + didn\'t + V · ? Did + S + V? · yesterday, ago, last week',
'Завершённые действия в прошлом с указанием времени. Правильные глаголы: +ed; неправильные — вторая форма (go → went). Вопросы и отрицания — через did.',
[
 ex('We visited Rome last year.',[
  w('We','pron','/wi/'), w('visited','verb','/ˈvɪzɪtɪd/',{s:0}), w('Rome','noun','/roʊm/'), w('last','adj','/læst/'), w('year','noun','/jɪr/')]),
 ex("She didn't sleep well.",[
  w('She','pron','/ʃi/'), w("didn't",'aux','/ˈdɪdnt/'), w('sleep','verb','/slip/'), w('well','adv','/wɛl/')]),
 ex('Did you see the news?',[
  w('Did','aux','/dɪd/'), w('you','pron','/ju/'), w('see','verb','/si/'), w('the','art','/ðə/'), w('news','noun','/nuz/')]),
],
[
 err("I didn't went to school.","I didn't go to school.","После didn't — первая форма глагола."),
 err('Did she called you?','Did she call you?','После did — первая форма.'),
],
[
 q('I ___ my keys yesterday.',['lose','lost','losed','losing'],1),
 q('___ you enjoy the concert?',['Do','Did','Was','Were'],1),
 q('He ___ come to the party.',["didn't","didn't came","doesn't","wasn't"],0),
 q('They ___ to Japan in 2019.',['go','went','gone','going'],1),
 q('She ___ her homework an hour ago.',['finish','finished','finishes','finishing'],1),
]),

card('g025','A2',['времена','прошедшее'],
'Past Continuous',
'S + was/were + V-ing · while, when, at 8 pm yesterday',
'Длительное действие в определённый момент прошлого. Часто фон для другого действия: I was sleeping when you called.',
[
 ex('I was cooking dinner at 6 pm.',[
  w('I','pron','/aɪ/'), w('was','verb','/wɑz/'), w('cooking','verb','/ˈkʊkɪŋ/',{s:0}), w('dinner','noun','/ˈdɪnɚ/',{s:0}), w('at','prep','/æt/'), w('6','num','/sɪks/'), w('pm','noun','/ˈpiɛm/')]),
 ex('They were playing football when it started to rain.',[
  w('They','pron','/ðeɪ/'), w('were','verb','/wɝ/'), w('playing','verb','/ˈpleɪɪŋ/',{s:0}), w('football','noun','/ˈfʊtbɔl/',{s:0}), w('when','conj','/wɛn/'), w('it','pron','/ɪt/'), w('started','verb','/ˈstɑrtɪd/',{s:0}), w('to','part','/tə/'), w('rain','verb','/reɪn/')]),
 ex('What were you doing at midnight?',[
  w('What','pron','/wʌt/',{sl:[1]}), w('were','verb','/wɝ/'), w('you','pron','/ju/'), w('doing','verb','/ˈduɪŋ/',{s:0}), w('at','prep','/æt/'), w('midnight','noun','/ˈmɪdnaɪt/',{s:0})],
  'What were you → /wɒwəju/'),
],
[
 err('I was sleep when she called.','I was sleeping when she called.','Форма was + -ing.'),
 err('While I cooked, he was reading.','While I was cooking, he was reading.','Длительный фон — Past Continuous.'),
],
[
 q('At 9 pm we ___ dinner.',['have','had','were having','are having'],2),
 q('She ___ when the phone rang.',['was cooking','cooked','cooks','is cooking'],0),
 q('I saw him while I ___ to work.',['walked','was walking','walk','am walking'],1),
 q('___ they playing outside?',['Did','Was','Were','Do'],2),
 q('It ___ raining when we left.',["wasn't","didn't","weren't","isn't"],0),
]),

card('g026','B1',['времена','настоящее','perfect'],
'Present Perfect',
"S + have/has + V3 · just, already, yet, ever, never, since, for",
'Результат или опыт к настоящему моменту; время не указано или не закончилось. since — начальная точка, for — длительность. С точным временем в прошлом (yesterday) — Past Simple.',
[
 ex('I have just finished my project.',[
  w('I','pron','/aɪ/'), w('have','aux','/hæv/'), w('just','adv','/dʒʌst/'), w('finished','verb','/ˈfɪnɪʃt/',{s:0}), w('my','pron','/maɪ/'), w('project','noun','/ˈprɑdʒɛkt/',{s:0})]),
 ex('She has never been to Asia.',[
  w('She','pron','/ʃi/'), w('has','aux','/hæz/'), w('never','adv','/ˈnɛvɚ/',{s:0}), w('been','verb','/bɪn/'), w('to','prep','/tə/'), w('Asia','noun','/ˈeɪʒə/',{s:0})]),
 ex("We've known each other for ten years.",[
  w("We've",'pron','/wiv/'), w('known','verb','/noʊn/',{sl:[0]}), w('each','det','/itʃ/'), w('other','pron','/ˈʌðɚ/',{s:0}), w('for','prep','/fɚ/'), w('ten','num','/tɛn/'), w('years','noun','/jɪrz/')],
  "We've known → слитно /wiːv nəʊn/"),
],
[
 err('I have seen him yesterday.','I saw him yesterday.','С точным временем в прошлом — Past Simple.'),
 err('She has went home.','She has gone home.','Нужна третья форма (V3): gone.'),
],
[
 q('I ___ this film three times.',['saw','have seen','see','am seeing'],1),
 q('She ___ here since May.',['works','has worked','worked','is working'],1),
 q('Have you ___ tried sushi?',['never','ever','just','yet'],1),
 q('We ___ finished the report yet.',['have','has',"haven't",'had'],2),
 q('___ you ever been to London?',['Did','Do','Have','Were'],2),
]),

card('g027','B1',['времена','настоящее','perfect continuous'],
'Present Perfect Continuous',
'S + have/has been + V-ing · for two hours, since morning',
'Действие началось в прошлом и продолжается (или только что закончилось) с акцентом на длительность или процесс: I\'ve been waiting for an hour.',
[
 ex("I've been waiting for an hour.",[
  w("I've",'pron','/aɪv/'), w('been','verb','/bɪn/'), w('waiting','verb','/ˈweɪtɪŋ/',{s:0}), w('for','prep','/fɚ/'), w('an','art','/ən/'), w('hour','noun','/aʊr/',{s:0,sl:[0]})],
  "I've been → /aɪv bɪn/"),
 ex('She has been studying all day.',[
  w('She','pron','/ʃi/'), w('has','aux','/hæz/'), w('been','verb','/bɪn/'), w('studying','verb','/ˈstʌdiɪŋ/',{s:0}), w('all','det','/ɔl/'), w('day','noun','/deɪ/')]),
 ex('How long have you been learning English?',[
  w('How','adv','/haʊ/'), w('long','adv','/lɔŋ/'), w('have','aux','/həv/'), w('you','pron','/ju/'), w('been','verb','/bɪn/'), w('learning','verb','/ˈlɝnɪŋ/',{s:0,sp:[2,3]}), w('English','noun','/ˈɪŋɡlɪʃ/',{s:0})],
  'learning — ea → /ɜː/'),
],
[
 err('I am working here since 2020.','I have been working here since 2020.','С since/for и до сих пор — Present Perfect Continuous.'),
 err('He has been knowing her for years.','He has known her for years.','Глаголы состояния не имеют Continuous форм.'),
],
[
 q('I ___ this novel all week.',['read','have read','have been reading','am reading'],2),
 q('She ___ for two hours.',['is running','runs','has been running','ran'],2),
 q('How long ___ you been waiting?',['do','did','have','are'],2),
 q("We've been living here ___ 2018.",['for','since','at','from'],1),
 q("He's tired because he ___ all night.",['works','has been working','worked','is working'],1),
]),

card('g028','B1',['времена','прошедшее','perfect'],
'Past Perfect',
'S + had + V3 · before, after, by the time, when',
'Действие, завершённое до другого момента в прошлом: When I arrived, the train had already left.',
[
 ex('The film had started when we arrived.',[
  w('The','art','/ðə/'), w('film','noun','/fɪlm/'), w('had','aux','/hæd/'), w('started','verb','/ˈstɑrtɪd/',{s:0}), w('when','conj','/wɛn/'), w('we','pron','/wi/'), w('arrived','verb','/əˈraɪvd/',{s:1})]),
 ex('She had finished work before I called.',[
  w('She','pron','/ʃi/'), w('had','aux','/hæd/'), w('finished','verb','/ˈfɪnɪʃt/',{s:0}), w('work','noun','/wɝk/',{sp:[1]}), w('before','conj','/bɪˈfɔr/',{s:1}), w('I','pron','/aɪ/'), w('called','verb','/kɔld/')]),
 ex("I couldn't enter because I had lost my key.",[
  w('I','pron','/aɪ/'), w("couldn't",'aux','/ˈkʊdnt/'), w('enter','verb','/ˈɛntɚ/',{s:0}), w('because','conj','/bɪˈkɑz/',{s:1}), w('I','pron','/aɪ/'), w('had','aux','/hæd/'), w('lost','verb','/lɔst/'), w('my','pron','/maɪ/'), w('key','noun','/ki/')]),
],
[
 err('When she came, I already cooked dinner.','When she came, I had already cooked dinner.','Более раннее действие — Past Perfect.'),
 err('He had went out.','He had gone out.','V3: gone.'),
],
[
 q('By the time we arrived, the film ___.',['started','had started','has started','starts'],1),
 q('She told me she ___ the exam.',['passed','had passed','has passed','passes'],1),
 q('I was sure I ___ him before.',['met','had met','have met','meet'],1),
 q('After he ___ the letter, he posted it.',['wrote','had written','writes','has written'],1),
 q('The train ___ left when I got to the station.',['already','had already','has already','have already'],1),
]),

card('g029','B1',['времена','прошедшее','perfect continuous'],
'Past Perfect Continuous',
'S + had been + V-ing · for two hours before…',
'Длительное действие, которое продолжалось до определённого момента в прошлом: She had been working there for ten years before she quit.',
[
 ex('He had been driving for hours when he stopped.',[
  w('He','pron','/hi/'), w('had','aux','/hæd/'), w('been','verb','/bɪn/'), w('driving','verb','/ˈdraɪvɪŋ/',{s:0}), w('for','prep','/fɚ/'), w('hours','noun','/aʊrz/'), w('when','conj','/wɛn/'), w('he','pron','/hi/'), w('stopped','verb','/stɑpt/')]),
 ex('They had been living in Spain before they moved.',[
  w('They','pron','/ðeɪ/'), w('had','aux','/hæd/'), w('been','verb','/bɪn/'), w('living','verb','/ˈlɪvɪŋ/',{s:0}), w('in','prep','/ɪn/'), w('Spain','noun','/speɪn/'), w('before','conj','/bɪˈfɔr/',{s:1}), w('they','pron','/ðeɪ/'), w('moved','verb','/muvd/')]),
 ex('I had been waiting for 20 minutes when the bus came.',[
  w('I','pron','/aɪ/'), w('had','aux','/hæd/'), w('been','verb','/bɪn/'), w('waiting','verb','/ˈweɪtɪŋ/',{s:0}), w('for','prep','/fɚ/'), w('20','num','/ˈtwɛnti/',{s:0}), w('minutes','noun','/ˈmɪnɪts/',{s:0}), w('when','conj','/wɛn/'), w('the','art','/ðə/'), w('bus','noun','/bʌs/'), w('came','verb','/keɪm/')]),
],
[
 err('She was working there for years before she retired.','She had been working there for years before she retired.','До-прошлое длительное — had been + -ing.'),
 err('I had been knowing him since school.','I had known him since school.','Состояния (know) — без Continuous.'),
],
[
 q('She ___ for two hours when I finally called.',['waited','had been waiting','was waiting','has been waiting'],1),
 q('They ___ football for an hour before it rained.',['played','had been playing','were playing','have played'],1),
 q('He was tired because he ___ since dawn.',['drove','had been driving','was driving','drives'],1),
 q('I ___ the book for a week before I finished it.',['read','had been reading','was reading','have been reading'],1),
 q('How long ___ she been working there before she left?',['did','had','has','was'],1),
]),

card('g030','A2',['времена','будущее'],
'Future Simple (will)',
'S + will + V · tomorrow, soon, next year · I think, probably, maybe',
'Спонтанные решения, обещания, предсказания и прогнозы: I\'ll help you. Отрицание: won\'t (will not).',
[
 ex("I'll call you later.",[
  w("I'll",'pron','/aɪl/'), w('call','verb','/kɔl/'), w('you','pron','/ju/'), w('later','adv','/ˈleɪtɚ/',{s:0})],
  "I'll call → /aɪl kɔːl/"),
 ex("It won't be easy.",[
  w('It','pron','/ɪt/'), w("won't",'aux','/woʊnt/'), w('be','verb','/bi/'), w('easy','adj','/ˈizi/',{s:0})]),
 ex('I think she will pass the exam.',[
  w('I','pron','/aɪ/'), w('think','verb','/θɪŋk/'), w('she','pron','/ʃi/'), w('will','aux','/wɪl/'), w('pass','verb','/pæs/'), w('the','art','/ðə/'), w('exam','noun','/ɪɡˈzæm/',{s:1})]),
],
[
 err('I will to help you.','I will help you.','После will — инфинитив без to.'),
 err('She wills come.','She will come.','will не изменяется по лицам.'),
],
[
 q("Don't worry, I ___ help you.",['will','am going to','am helping','helped'],0),
 q('I think it ___ rain tomorrow.',['will','would','is','does'],0),
 q("She ___ agree, I'm sure.",["won't","willn't",'not will',"doesn't"],0),
 q('___ you open the window, please?',['Will','Do','Are','Shall'],0),
 q('We ___ probably be late.',['are','will','will be','being'],2),
]),

card('g031','A2',['времена','будущее'],
'going to (намерение)',
'S + am/is/are going to + V · планы и очевидные предсказания',
'Запланированные намерения (I\'m going to study medicine) и предсказания на основе очевидных признаков (Look at the clouds — it\'s going to rain).',
[
 ex("I'm going to start a new course.",[
  w("I'm",'pron','/aɪm/'), w('going','verb','/ˈɡoʊɪŋ/',{s:0}), w('to','part','/tə/'), w('start','verb','/stɑrt/'), w('a','art','/ə/'), w('new','adj','/nu/'), w('course','noun','/kɔrs/')],
  "going to → gonna /ˈɡəʊnə/ в быстрой речи"),
 ex("It's going to rain — look at the clouds.",[
  w("It's",'pron','/ɪts/'), w('going','verb','/ˈɡoʊɪŋ/',{s:0}), w('to','part','/tə/'), w('rain','verb','/reɪn/'), w('look','verb','/lʊk/'), w('at','prep','/æt/'), w('the','art','/ðə/'), w('clouds','noun','/klaʊdz/')]),
 ex('They are going to move house in May.',[
  w('They','pron','/ðeɪ/'), w('are','verb','/ɑr/'), w('going','verb','/ˈɡoʊɪŋ/',{s:0}), w('to','part','/tə/'), w('move','verb','/muv/'), w('house','noun','/haʊs/'), w('in','prep','/ɪn/'), w('May','noun','/meɪ/')]),
],
[
 err('I going to travel.','I am going to travel.','Нужен am/is/are перед going to.'),
 err('He is go to leave.','He is going to leave.','going to — фиксированная форма.'),
],
[
 q('Look at those clouds! It ___ rain.',['will','is going to','goes to','is raining'],1),
 q('We ___ visit grandma on Sunday (это план).',['will','are going to','go to','going to'],1),
 q('She ___ study medicine next year.',['is going to','will going','goes','will to'],0),
 q("I'm going to ___ more exercise.",['doing','do','did','does'],1),
 q('They ___ going to sell their car.',["isn't","don't","aren't","not"],2),
]),

card('g032','B1',['времена','будущее'],
'Future Continuous',
'S + will be + V-ing · this time tomorrow, at 5 pm',
'Действие, которое будет в процессе в определённый момент будущего: This time tomorrow I\'ll be flying to Rome.',
[
 ex("This time tomorrow I'll be flying to Rome.",[
  w('This','pron','/ðɪs/'), w('time','noun','/taɪm/'), w('tomorrow','adv','/təˈmɑroʊ/',{s:1}), w("I'll",'pron','/aɪl/'), w('be','verb','/bi/'), w('flying','verb','/ˈflaɪɪŋ/',{s:0}), w('to','prep','/tə/'), w('Rome','noun','/roʊm/')]),
 ex('At 8 pm we will be having dinner.',[
  w('At','prep','/æt/'), w('8','num','/eɪt/'), w('pm','noun','/ˈpiɛm/'), w('we','pron','/wi/'), w('will','aux','/wɪl/'), w('be','verb','/bi/'), w('having','verb','/ˈhævɪŋ/',{s:0}), w('dinner','noun','/ˈdɪnɚ/',{s:0})]),
 ex("Don't call at noon — she'll be working.",[
  w("Don't",'aux','/doʊnt/'), w('call','verb','/kɔl/'), w('at','prep','/æt/'), w('noon','noun','/nun/'), w("she'll",'pron','/ʃil/'), w('be','verb','/bi/'), w('working','verb','/ˈwɝkɪŋ/',{s:0,sp:[1]})]),
],
[
 err('Tomorrow at 5 I will work.','Tomorrow at 5 I will be working.','Процесс в момент будущего — will be + -ing.'),
 err('She will being sleeping.','She will be sleeping.','Форма: will be + V-ing.'),
],
[
 q('At 10 am tomorrow we ___ the new office.',['visit','will visit','will be visiting','are visited'],2),
 q("Don't phone me at 7 — I ___ dinner.",['will cook','cook','will be cooking','have cooked'],2),
 q('This time next year I ___ in Japan.',['live','will be living','will lived','am lived'],1),
 q('She ___ working here next month.',['will be','will being','will been','be will'],0),
 q('What ___ you be doing at 9 pm tomorrow?',['will','will be','are','do'],0),
]),

card('g033','B1',['времена','будущее','perfect'],
'Future Perfect',
'S + will have + V3 · by 2030, by the time, by next week',
'Действие завершится к определённому моменту в будущем: By 2030 I will have finished my degree.',
[
 ex('By 2030 I will have finished my degree.',[
  w('By','prep','/baɪ/'), w('2030','num','/ˈtwɛnti ˈθɝti/'), w('I','pron','/aɪ/'), w('will','aux','/wɪl/'), w('have','aux','/həv/'), w('finished','verb','/ˈfɪnɪʃt/',{s:0}), w('my','pron','/maɪ/'), w('degree','noun','/dɪˈɡri/',{s:1})]),
 ex('She will have arrived by noon.',[
  w('She','pron','/ʃi/'), w('will','aux','/wɪl/'), w('have','aux','/həv/'), w('arrived','verb','/əˈraɪvd/',{s:1}), w('by','prep','/baɪ/'), w('noon','noun','/nun/')]),
 ex("By the time you come, we'll have cooked dinner.",[
  w('By','prep','/baɪ/'), w('the','art','/ðə/'), w('time','noun','/taɪm/'), w('you','pron','/ju/'), w('come','verb','/kʌm/'), w("we'll",'pron','/wil/'), w('have','aux','/həv/'), w('cooked','verb','/kʊkt/'), w('dinner','noun','/ˈdɪnɚ/',{s:0})]),
],
[
 err('By June I will finish the course.','By June I will have finished the course.','Завершение к сроку — Future Perfect.'),
 err('She will have arrive.','She will have arrived.','После will have — V3.'),
],
[
 q('By next month I ___ the project.',['will finish','will have finished','finish','will finishing'],1),
 q('She ___ here for 20 years by 2025.',['will work','will have worked','works','working'],1),
 q('By the time you wake up, I ___ breakfast.',['make','will have made','will making','made'],1),
 q('By Friday they ___ the house.',['will sold','will have sold','will sell have','sell'],1),
 q("In ten years' time he ___ his own company.",['will have built','will built','will be build','builds'],0),
]),

/* ================= КОНСТРУКЦИИ (B1) ================= */

card('g034','B1',['модальные глаголы'],
'Модальные глаголы',
'can/could · must · have to · should · might/may · would · после них — V без to',
'Модальные глаголы выражают отношение к действию. После них — инфинитив без to. Must — от самого говорящего, have to — внешняя необходимость. Could/might/may — вероятность.',
[
 ex('You should see a doctor.',[
  w('You','pron','/ju/'), w('should','modal','/ʃʊd/'), w('see','verb','/si/'), w('a','art','/ə/'), w('doctor','noun','/ˈdɑktɚ/',{s:0})]),
 ex("I can't come to the party.",[
  w('I','pron','/aɪ/'), w("can't",'modal','/kænt/'), w('come','verb','/kʌm/'), w('to','prep','/tə/'), w('the','art','/ðə/'), w('party','noun','/ˈpɑrti/',{s:0})],
  "can't — t почти не слышен перед согласной"),
 ex('You must wear a helmet.',[
  w('You','pron','/ju/'), w('must','modal','/mʌst/'), w('wear','verb','/wɛr/'), w('a','art','/ə/'), w('helmet','noun','/ˈhɛlmɪt/',{s:0})]),
],
[
 err('He musts study.','He must study.','Модальные глаголы не принимают -s.'),
 err('She can to swim.','She can swim.','После can — инфинитив без to.'),
],
[
 q("You ___ smoke here — it's forbidden.",["mustn't","don't have to","shouldn't",'can'],0),
 q("It's late. You ___ go home.",['might','should','can','would'],1),
 q('I ___ swim when I was five.',['can','could','may','must'],1),
 q('She ___ be at work — her car is here.',['must','should','can','would'],0),
 q('___ you help me, please?',['May','Could','Must','Should'],1),
]),

card('g035','B1',['условные предложения'],
'Conditionals: Zero, 1st',
'0: If + Present Simple, Present Simple · 1: If + Present Simple, will + V',
'Zero conditional — общие истины: If you heat ice, it melts. First conditional — реальные будущие ситуации: If it rains, we will stay home. После if — не will.',
[
 ex('If you heat water to 100 degrees, it boils.',[
  w('If','conj','/ɪf/'), w('you','pron','/ju/'), w('heat','verb','/hit/'), w('water','noun','/ˈwɔtɚ/',{s:0}), w('to','prep','/tə/'), w('100','num','/ˈhʌndrəd/',{s:0}), w('degrees','noun','/dɪˈɡriz/',{s:1}), w('it','pron','/ɪt/'), w('boils','verb','/bɔɪlz/')]),
 ex("If it rains tomorrow, we'll stay at home.",[
  w('If','conj','/ɪf/'), w('it','pron','/ɪt/'), w('rains','verb','/reɪnz/'), w('tomorrow','adv','/təˈmɑroʊ/',{s:1}), w("we'll",'pron','/wil/'), w('stay','verb','/steɪ/'), w('at','prep','/æt/'), w('home','noun','/hoʊm/')]),
 ex("If you don't hurry, you'll miss the bus.",[
  w('If','conj','/ɪf/'), w('you','pron','/ju/'), w("don't",'aux','/doʊnt/'), w('hurry','verb','/ˈhʌri/',{s:0}), w("you'll",'pron','/jul/'), w('miss','verb','/mɪs/'), w('the','art','/ðə/'), w('bus','noun','/bʌs/')]),
],
[
 err("If it will rain, I'll stay home.","If it rains, I'll stay home.",'После if — Present Simple, не will.'),
 err("I'll help you if you will ask.","I'll help you if you ask.",'if + Present Simple.'),
],
[
 q('If you ___ me, I\'ll help you.',['will ask','ask','asks','asked'],1),
 q('If you mix blue and yellow, you ___ green.',['get','will get','would get','got'],0),
 q("We'll go to the beach if the weather ___ fine.",['is','will be','would be','was'],0),
 q('If she ___ the exam, her parents will be happy.',['passes','will pass','pass','would pass'],0),
 q('If you press this button, the machine ___.',['starts','will started','started','starting'],0),
]),

card('g036','B1',['условные предложения'],
'Conditionals: 2nd, 3rd, Mixed',
'2: If + Past Simple, would + V · 3: If + had + V3, would have + V3',
'Second conditional — нереальное или маловероятное настоящее/будущее: If I were rich, I would travel. Third — нереальное прошлое: If I had known, I would have told you.',
[
 ex('If I had more time, I would learn the guitar.',[
  w('If','conj','/ɪf/'), w('I','pron','/aɪ/'), w('had','verb','/hæd/'), w('more','adv','/mɔr/'), w('time','noun','/taɪm/'), w('I','pron','/aɪ/'), w('would','modal','/wʊd/'), w('learn','verb','/lɝn/',{sp:[2,3]}), w('the','art','/ðə/'), w('guitar','noun','/ɡɪˈtɑr/',{s:1})]),
 ex('If she had studied, she would have passed.',[
  w('If','conj','/ɪf/'), w('she','pron','/ʃi/'), w('had','aux','/hæd/'), w('studied','verb','/ˈstʌdid/',{s:0}), w('she','pron','/ʃi/'), w('would','modal','/wʊd/'), w('have','aux','/həv/'), w('passed','verb','/pæst/')]),
 ex('If I were you, I would apologize.',[
  w('If','conj','/ɪf/'), w('I','pron','/aɪ/'), w('were','verb','/wɝ/'), w('you','pron','/ju/'), w('I','pron','/aɪ/'), w('would','modal','/wʊd/'), w('apologize','verb','/əˈpɑlədʒaɪz/',{s:1})],
  "I would → I'd /aɪd/"),
],
[
 err('If I would have money, I would buy it.','If I had money, I would buy it.','В условии — Past Simple, не would.'),
 err('If he had asked me, I would told him.','If he had asked me, I would have told him.','Third conditional: would have + V3.'),
],
[
 q('If I ___ rich, I\'d buy a yacht.',['am','was','were','will be'],2),
 q("If she ___ earlier, she wouldn't have missed the train.",['left','had left','would leave','leaves'],1),
 q('I ___ you if I knew the answer.',['would tell','told','will tell','had told'],0),
 q('If he ___ harder, he would have passed.',['studied','had studied','would study','studies'],1),
 q('What ___ you do if you won the lottery?',['will','would','do','did'],1),
]),

card('g037','B1',['залог','пассив'],
'Passive Voice',
'be + V3: is built · was built · will be built · has been built',
'Страдательный залог ставит объект действия на первое место, когда важен результат, а не исполнитель: The bridge was built in 1900. Исполнитель добавляется через by.',
[
 ex('This bridge was built in 1900.',[
  w('This','pron','/ðɪs/'), w('bridge','noun','/brɪdʒ/'), w('was','aux','/wɑz/'), w('built','verb','/bɪlt/'), w('in','prep','/ɪn/'), w('1900','num','/naɪnˈtin ˈhʌndrəd/')]),
 ex('English is spoken all over the world.',[
  w('English','noun','/ˈɪŋɡlɪʃ/',{s:0}), w('is','aux','/ɪz/'), w('spoken','verb','/ˈspoʊkən/',{s:0}), w('all','det','/ɔl/'), w('over','prep','/ˈoʊvɚ/',{s:0}), w('the','art','/ðə/'), w('world','noun','/wɝld/',{sp:[1]})]),
 ex('The results will be announced tomorrow.',[
  w('The','art','/ðə/'), w('results','noun','/rɪˈzʌlts/',{s:1}), w('will','aux','/wɪl/'), w('be','aux','/bi/'), w('announced','verb','/əˈnaʊnst/',{s:1}), w('tomorrow','adv','/təˈmɑroʊ/',{s:1})]),
],
[
 err('The house built in 2001.','The house was built in 2001.','Пассив требует be: was built.'),
 err('This song is wrote by Adele.','This song is written by Adele.','V3: written.'),
],
[
 q('The letters ___ yesterday.',['delivered','were delivered','was delivered','deliver'],1),
 q('Rice ___ in China.',['grows','is grown','is growing','has grown'],1),
 q('The new road ___ next year.',['will build','will be built','builds','will be building'],1),
 q('The window ___ by the boys.',['break','was broken','were broken','breaking'],1),
 q('This car ___ in Germany.',['make','is made','made','is making'],1),
]),

card('g038','B1',['герундий','инфинитив'],
'Gerund vs Infinitive',
'enjoy/avoid/finish + -ing · decide/want/hope + to V · после предлогов — -ing',
'Некоторые глаголы требуют -ing (enjoy doing), другие — to-инфинитив (decide to do). После предлогов всегда -ing: good at swimming. Учите глагол сразу с нужной формой.',
[
 ex('I enjoy reading in the evening.',[
  w('I','pron','/aɪ/'), w('enjoy','verb','/ɪnˈdʒɔɪ/',{s:1}), w('reading','verb','/ˈridɪŋ/',{s:0}), w('in','prep','/ɪn/'), w('the','art','/ðə/'), w('evening','noun','/ˈivnɪŋ/',{s:0})]),
 ex('She decided to change jobs.',[
  w('She','pron','/ʃi/'), w('decided','verb','/dɪˈsaɪdɪd/',{s:1}), w('to','part','/tə/'), w('change','verb','/tʃeɪndʒ/'), w('jobs','noun','/dʒɑbz/')]),
 ex('He is good at cooking.',[
  w('He','pron','/hi/'), w('is','verb','/ɪz/'), w('good','adj','/ɡʊd/'), w('at','prep','/æt/'), w('cooking','noun','/ˈkʊkɪŋ/',{s:0})]),
],
[
 err('I want going home.','I want to go home.','want требует to-инфинитив.'),
 err('She is interested to paint.','She is interested in painting.','После предлога in — -ing форма.'),
],
[
 q("I don't mind ___ early.",['to get','getting','get','got'],1),
 q('We decided ___ home.',['staying','to stay','stay','stayed'],1),
 q('She avoided ___ the question.',['to answer','answering','answer','answered'],1),
 q('He hopes ___ the exam.',['passing','to pass','pass','passed'],1),
 q('Thank you for ___ me.',['to help','helping','help','helped'],1),
]),

card('g039','B1',['конструкции','used to'],
'used to / be used to / get used to',
'used to + V (прошлая привычка) · be used to + -ing (привык) · get used to + -ing (привыкаю)',
'used to do — делал раньше, теперь нет: I used to smoke. be used to doing — имею привычку: I\'m used to getting up early. get used to doing — привыкаю: I\'m getting used to the climate.',
[
 ex('I used to play chess every weekend.',[
  w('I','pron','/aɪ/'), w('used','verb','/just/'), w('to','part','/tə/'), w('play','verb','/pleɪ/'), w('chess','noun','/tʃɛs/'), w('every','det','/ˈɛvri/',{s:0}), w('weekend','noun','/ˈwikɛnd/',{s:0})],
  "used to → /ˈjuːstə/"),
 ex('She is used to working nights.',[
  w('She','pron','/ʃi/'), w('is','verb','/ɪz/'), w('used','adj','/just/'), w('to','prep','/tə/'), w('working','verb','/ˈwɝkɪŋ/',{s:0,sp:[1]}), w('nights','noun','/naɪts/')]),
 ex('He is getting used to the new city.',[
  w('He','pron','/hi/'), w('is','verb','/ɪz/'), w('getting','verb','/ˈɡɛtɪŋ/',{s:0}), w('used','adj','/just/'), w('to','prep','/tə/'), w('the','art','/ðə/'), w('new','adj','/nu/'), w('city','noun','/ˈsɪti/',{s:0})],
  "getting used to → /ˈɡetɪŋ juːstə/"),
],
[
 err('I am used to play tennis.','I am used to playing tennis.','be used to + -ing.'),
 err('I use to swim a lot.','I used to swim a lot.','Прошлая привычка — used to (с -d).'),
],
[
 q('I ___ smoke, but I gave up two years ago.',['use to','used to','am used to','using to'],1),
 q('She ___ getting up early. (привыкла)',['used to','is used to','get used to','would'],1),
 q("It's hard to ___ the hot weather.",['used to','be used to','get used to','would use to'],2),
 q('He ___ drive to work, but now he cycles.',['used to','is used to','uses','was used to'],0),
 q("I can't ___ this noise.",['used to','get used to','used','getting used'],1),
]),

card('g040','B1',['косвенная речь'],
'Reported Speech',
'He said (that) he was tired · сдвиг: am → was, will → would, have → had',
'В косвенной речи время сдвигается на шаг назад: Present → Past, Past → Past Perfect, will → would. Косвенный вопрос — прямой порядок слов: He asked where I lived.',
[
 ex('She said she was busy.',[
  w('She','pron','/ʃi/'), w('said','verb','/sɛd/'), w('she','pron','/ʃi/'), w('was','verb','/wɑz/'), w('busy','adj','/ˈbɪzi/',{s:0})]),
 ex('He told me he would call later.',[
  w('He','pron','/hi/'), w('told','verb','/toʊld/'), w('me','pron','/mi/'), w('he','pron','/hi/'), w('would','modal','/wʊd/'), w('call','verb','/kɔl/'), w('later','adv','/ˈleɪtɚ/',{s:0})],
  'would → слабо /wəd/'),
 ex('They asked where I lived.',[
  w('They','pron','/ðeɪ/'), w('asked','verb','/æskt/'), w('where','adv','/wɛr/'), w('I','pron','/aɪ/'), w('lived','verb','/lɪvd/')]),
],
[
 err('He said me he was tired.','He told me he was tired.','say (to smb) / tell smb: said to me или told me.'),
 err('She asked where did I live.','She asked where I lived.','В косвенном вопросе — прямой порядок слов, без did.'),
],
[
 q("'I am tired,' he said. → He said he ___ tired.",['is','was','were','had been'],1),
 q("'I will call,' she said. → She said she ___ call.",['will','would','wills','woulds'],1),
 q('He asked me where I ___.',['live','do live','did live','lived'],3),
 q('She ___ me that she was ill.',['said','told','spoke','talked'],1),
 q("'Do you like tea?' → He asked if I ___ tea.",['like','liked','do like','did like'],1),
]),

card('g041','B1',['каузатив'],
'Have something done',
'S + have/has/had + object + V3: I had my hair cut',
'Каузатив: кто-то делает что-то для нас. I had my car repaired — машину чинил не я сам. Образование: have + объект + V3.',
[
 ex('I had my hair cut yesterday.',[
  w('I','pron','/aɪ/'), w('had','verb','/hæd/'), w('my','pron','/maɪ/'), w('hair','noun','/hɛr/'), w('cut','verb','/kʌt/'), w('yesterday','adv','/ˈjɛstɚdeɪ/',{s:0})]),
 ex('She is having her apartment renovated.',[
  w('She','pron','/ʃi/'), w('is','aux','/ɪz/'), w('having','verb','/ˈhævɪŋ/',{s:0}), w('her','pron','/hɝ/'), w('apartment','noun','/əˈpɑrtmənt/',{s:1}), w('renovated','verb','/ˈrɛnəveɪtɪd/',{s:0})]),
 ex('We must have the roof repaired.',[
  w('We','pron','/wi/'), w('must','modal','/mʌst/'), w('have','verb','/hæv/'), w('the','art','/ðə/'), w('roof','noun','/ruf/'), w('repaired','verb','/rɪˈpɛrd/',{s:1})]),
],
[
 err("I cut my hair at the barber's.","I had my hair cut at the barber's.",'Услуга выполнена другим человеком — have + object + V3.'),
 err('She had repaired her car (в сервисе).','She had her car repaired.','Если работу сделал кто-то другой: had her car repaired — а had repaired = Past Perfect «починила сама».'),
],
[
 q('I ___ my phone repaired last week.',['had','have','am','has'],0),
 q('She is ___ her eyes tested.',['have','has','having','had'],2),
 q('We ___ the walls painted tomorrow.',['will had','will have had','will have','will having'],2),
 q('He ___ his car washed every Sunday.',['has','is','having','have'],0),
 q('They ___ their house robbed last night.',['had','have','has','having'],0),
]),

card('g042','B1',['вопросы','tag questions'],
'Tag questions',
"You are ready, aren't you? · She came, didn't she? · positive → negative tag",
'Разделительный вопрос подтверждает сказанное: хвост противоположен по знаку основной части и повторяет подлежащее и вспомогательный глагол. You like coffee, don\'t you?',
[
 ex("You're coming, aren't you?",[
  w("You're",'pron','/jʊr/'), w('coming','verb','/ˈkʌmɪŋ/',{s:0}), w("aren't",'aux','/ɑrnt/'), w('you','pron','/ju/')],
  "You're → /jɔː/"),
 ex("She works here, doesn't she?",[
  w('She','pron','/ʃi/'), w('works','verb','/wɝks/',{sp:[1]}), w('here','adv','/hir/'), w("doesn't",'aux','/ˈdʌznt/'), w('she','pron','/ʃi/')]),
 ex("They didn't leave, did they?",[
  w('They','pron','/ðeɪ/'), w("didn't",'aux','/ˈdɪdnt/'), w('leave','verb','/liv/'), w('did','aux','/dɪd/'), w('they','pron','/ðeɪ/')]),
],
[
 err("He is a doctor, isn't it?","He is a doctor, isn't he?",'Тэг повторяет подлежащее: he → he.'),
 err("You like tea, isn't it?","You like tea, don't you?",'Со смысловым глаголом — don\'t/doesn\'t/didn\'t.'),
],
[
 q('She is late, ___?',["isn't she",'is she',"isn't it","doesn't she"],0),
 q("You didn't see him, ___?",['did you',"didn't you",'do you','had you'],0),
 q('They live in Rome, ___?',["don't they",'do they',"aren't they","didn't they"],0),
 q('He can drive, ___?',["can't he",'can he',"doesn't he","isn't he"],0),
 q("Let's go, ___?",['will we','shall we','do we',"don't we"],1),
]),

card('g043','B1',['вопросы'],
'Вопросы: общие, Wh-, косвенные',
'Do you…? (общий) · Where do you…? (Wh-) · What are you waiting for? · Could you tell me where…? (косвенный)',
'Общие вопросы требуют yes/no и начинаются со вспомогательного глагола. Специальные — с Wh-слова. Косвенные вопросы имеют прямой порядок слов: I don\'t know where he is (не where is he).',
[
 ex('Where do you work?',[
  w('Where','adv','/wɛr/'), w('do','aux','/də/'), w('you','pron','/ju/'), w('work','verb','/wɝk/',{sp:[1]})],
  "do you → /dʒə/"),
 ex('What are you waiting for?',[
  w('What','pron','/wʌt/',{sl:[1]}), w('are','aux','/ɑr/'), w('you','pron','/ju/'), w('waiting','verb','/ˈweɪtɪŋ/',{s:0}), w('for','prep','/fɚ/')],
  'What are you → whatcha /ˈwɒtʃə/'),
 ex('Could you tell me where the station is?',[
  w('Could','modal','/kʊd/'), w('you','pron','/ju/'), w('tell','verb','/tɛl/'), w('me','pron','/mi/'), w('where','adv','/wɛr/'), w('the','art','/ðə/'), w('station','noun','/ˈsteɪʃən/',{s:0,sp:[3,4]}), w('is','verb','/ɪz/')],
  'Could you → /kʊdʒə/'),
],
[
 err('Where he works?','Where does he work?','Нужен вспомогательный does.'),
 err("I don't know where is he.","I don't know where he is.",'В косвенном вопросе — прямой порядок слов.'),
],
[
 q('___ she speak French?',['Do','Does','Is','Has'],1),
 q('___ did you go last night?',['What','Where','Who','When'],1),
 q('Who ___ the window? (кто-то разбил)',['broke','did break','breaks','broken'],0),
 q('Do you know what time ___?',['is it','it is','does it','is'],1),
 q('She asked me how old ___.',['am I','was I','I am','I was'],3),
]),

card('g044','B1',['отрицания'],
'Отрицания',
"don't/doesn't/didn't + V · no + noun: no money = not any money",
'Отрицание смыслового глагола — через do/does/did + not. no ставится перед существительным: I have no time = I don\'t have any time. Двойное отрицание недопустимо.',
[
 ex("I don't understand this rule.",[
  w('I','pron','/aɪ/'), w("don't",'aux','/doʊnt/'), w('understand','verb','/ʌndɚˈstænd/',{s:2}), w('this','det','/ðɪs/'), w('rule','noun','/rul/')]),
 ex('She has no brothers or sisters.',[
  w('She','pron','/ʃi/'), w('has','verb','/hæz/'), w('no','det','/noʊ/',{sl:[0]}), w('brothers','noun','/ˈbrʌðəz/',{s:0}), w('or','conj','/ɔr/'), w('sisters','noun','/ˈsɪstɚz/',{s:0})],
  'or → слабо /ə/'),
 ex('They didn\'t come to the meeting.',[
  w('They','pron','/ðeɪ/'), w("didn't",'aux','/ˈdɪdnt/'), w('come','verb','/kʌm/'), w('to','prep','/tə/'), w('the','art','/ðə/'), w('meeting','noun','/ˈmitɪŋ/',{s:0})]),
],
[
 err("I don't know nothing.","I don't know anything.",'В английском одно отрицание: not … anything.'),
 err("She doesn't likes tea.","She doesn't like tea.","После doesn't — первая форма."),
],
[
 q('He ___ smoke.',["doesn't","don't","isn't",'not'],0),
 q('I have ___ money.',['not','no','none','any'],1),
 q("We didn't ___ anything wrong.",['do','did','done','doing'],0),
 q("She ___ go to work yesterday.",["didn't","doesn't","wasn't",'not'],0),
 q('Nobody ___ the answer.',['know',"don't know",'knows',"doesn't know"],2),
]),

card('g045','A2',['конструкции'],
'There is / There are',
'There is + ед. ч./неисчисл. · There are + мн. ч. · ? Is there…? · − There isn\'t/aren\'t',
'Конструкция сообщает о наличии чего-то: There is a café near here. Is/are согласуется со следующим существительным. В вопросе is/are выходит вперёд.',
[
 ex('There is a pharmacy around the corner.',[
  w('There','adv','/ðɛr/'), w('is','verb','/ɪz/'), w('a','art','/ə/'), w('pharmacy','noun','/ˈfɑrməsi/',{s:0}), w('around','prep','/əˈraʊnd/',{s:1}), w('the','art','/ðə/'), w('corner','noun','/ˈkɔrnɚ/',{s:0})],
  "There is → there's /ðeəz/"),
 ex('There are two parks in our district.',[
  w('There','adv','/ðɛr/'), w('are','verb','/ɑr/'), w('two','num','/tu/',{sl:[0]}), w('parks','noun','/pɑrks/'), w('in','prep','/ɪn/'), w('our','pron','/aʊr/',{s:0}), w('district','noun','/ˈdɪstrɪkt/',{s:0})]),
 ex('Is there any milk left?',[
  w('Is','verb','/ɪz/'), w('there','adv','/ðɛr/'), w('any','det','/ˈɛni/',{sp:[0]}), w('milk','noun','/mɪlk/'), w('left','adv','/lɛft/')]),
],
[
 err('There is many people here.','There are many people here.','people — мн. ч. → are.'),
 err('It is a book on the table.','There is a book on the table.','О наличии чего-то — there is.'),
],
[
 q('___ a problem with the Wi-Fi.',['There is','There are','It is','This is'],0),
 q('___ three options.',['There is','There are','It has','There be'],1),
 q('___ any questions?',['Is there','Are there','There is','Have there'],1),
 q('There ___ no milk in the fridge.',['are','is','were','be'],1),
 q('There ___ a lot of cars on the road.',['is','are','was','be'],1),
]),

card('g046','B1',['реакции','согласие'],
'So do I / Neither do I',
'So + aux + S (тоже) · Neither + aux + S (тоже не) · I do, too · I don\'t, either',
'So do I — я тоже (после утверждения). Neither do I — я тоже не (после отрицания). Вспомогательный глагол повторяется из первой реплики: I can swim — So can I.',
[
 ex('I like jazz. — So do I.',[
  w('I','pron','/aɪ/'), w('like','verb','/laɪk/'), w('jazz','noun','/dʒæz/'), w('So','adv','/soʊ/'), w('do','aux','/də/'), w('I','pron','/aɪ/')]),
 ex("I've never been to Japan. — Neither have I.",[
  w("I've",'pron','/aɪv/'), w('never','adv','/ˈnɛvɚ/',{s:0}), w('been','verb','/bɪn/'), w('to','prep','/tə/'), w('Japan','noun','/dʒəˈpæn/',{s:1}), w('Neither','adv','/ˈnaɪðɚ/',{s:0,sp:[1,2]}), w('have','aux','/həv/'), w('I','pron','/aɪ/')],
  "Neither → /ˈnaɪðə/"),
 ex('She can drive. — So can her brother.',[
  w('She','pron','/ʃi/'), w('can','modal','/kæn/'), w('drive','verb','/draɪv/'), w('So','adv','/soʊ/'), w('can','modal','/kæn/'), w('her','pron','/hɝ/'), w('brother','noun','/ˈbrʌðə/',{s:0})]),
],
[
 err("I don't like coffee. — Me too.","I don't like coffee. — Me neither.",'После отрицания — me neither / Neither do I.'),
 err('I went to the party. — So I did.','I went to the party. — So did I.','Порядок: So + вспомогательный глагол + подлежащее.'),
],
[
 q('I love spicy food. — ___.',['So do I','So am I','Neither do I','So I do'],0),
 q("I can't swim. — ___.",['So can I','Neither can I','Neither I can','So do I'],1),
 q('She was late. — ___.',['So was I','So did I','Neither was I','So do I'],0),
 q("I don't eat meat. — ___.",['Me too','Me neither','So do I','Neither I do'],1),
 q("I've finished. — ___.",['So have I','So did I','So am I','Neither have I'],0),
]),

card('g047','B1',['предложения','предпочтения'],
"I'd rather / It's worth / How about / Let's",
"I'd rather + V · It's worth + -ing · How about + -ing? · Let's + V",
'Конструкции для предложений и предпочтений: I\'d rather stay home (лучше бы остался), It\'s worth trying (стоит попробовать), How about watching a film?, Let\'s go (давай).',
[
 ex("I'd rather stay at home tonight.",[
  w("I'd",'pron','/aɪd/'), w('rather','adv','/ˈræðɚ/',{s:0}), w('stay','verb','/steɪ/'), w('at','prep','/æt/'), w('home','noun','/hoʊm/'), w('tonight','adv','/təˈnaɪt/',{s:1})],
  "I'd rather → /aɪd ˈrɑːðə/"),
 ex('This museum is worth visiting.',[
  w('This','pron','/ðɪs/'), w('museum','noun','/mjuˈziəm/',{s:1}), w('is','verb','/ɪz/'), w('worth','adj','/wɝθ/',{sp:[1]}), w('visiting','verb','/ˈvɪzɪtɪŋ/',{s:0})]),
 ex('How about ordering pizza?',[
  w('How','adv','/haʊ/'), w('about','prep','/əˈbaʊt/',{s:1}), w('ordering','verb','/ˈɔrdɚɪŋ/',{s:0}), w('pizza','noun','/ˈpitsə/',{s:0})]),
],
[
 err("Let's to go.","Let's go.","После Let's — инфинитив без to."),
 err("I'd rather to stay.","I'd rather stay.",'would rather + инфинитив без to.'),
],
[
 q("I'd rather ___ at home.",['to stay','staying','stay','stayed'],2),
 q('How about ___ to the movies?',['to go','going','go','we go'],1),
 q('___ visit grandma this weekend!',["Let's to","Let's",'Lets','Let us to'],1),
 q('The book is worth ___.',['to read','reading','read','to reading'],1),
 q("It's cold — I'd rather not ___ out.",['to go','going','go','went'],2),
]),

card('g048','B1',['разговорные конструкции'],
'I was wondering if / The thing is / By the way / I mean',
'I was wondering if you could… (сверхвежливо) · The thing is… (суть в том) · By the way… (кстати) · I mean… (то есть)',
'Разговорные конструкции: I was wondering if you could help — сверхвежливая просьба. The thing is — вводит главное препятствие. By the way — сменить тему; I mean — уточнить мысль.',
[
 ex('I was wondering if you could help me.',[
  w('I','pron','/aɪ/'), w('was','verb','/wɑz/'), w('wondering','verb','/ˈwʌndərɪŋ/',{s:0}), w('if','conj','/ɪf/'), w('you','pron','/ju/'), w('could','modal','/kʊd/'), w('help','verb','/hɛlp/'), w('me','pron','/mi/')],
  'was wondering — was слабо /wəz/'),
 ex("The thing is, I don't have time today.",[
  w('The','art','/ðə/'), w('thing','noun','/θɪŋ/'), w('is','verb','/ɪz/'), w('I','pron','/aɪ/'), w("don't",'aux','/doʊnt/'), w('have','verb','/hæv/'), w('time','noun','/taɪm/'), w('today','adv','/təˈdeɪ/',{s:1})]),
 ex('By the way, I saw your brother yesterday.',[
  w('By','prep','/baɪ/'), w('the','art','/ðə/'), w('way','noun','/weɪ/'), w('I','pron','/aɪ/'), w('saw','verb','/sɔ/'), w('your','pron','/jɔr/'), w('brother','noun','/ˈbrʌðə/',{s:0}), w('yesterday','adv','/ˈjɛstɚdeɪ/',{s:0})]),
],
[
 err('I was wondering could you help me.','I was wondering if you could help me.','После wondering нужен союз if/whether.'),
 err('The thing is, because I was busy.','The thing is, I was busy.','После the thing is — обычное предложение, без because/so.'),
],
[
 q('___ if you could open the window? (вежливо)',['I wonder','I was wondering',"I'm wondering?",'I wondered'],1),
 q('The thing is, I ___ really busy this week.',['am','be','being','is'],0),
 q('___, have you heard from Max lately?',['By the way','In the way','On the way','By way'],0),
 q("I like it. ___, it's not perfect, but it works.",['I mean','By the way','The thing is','I wonder'],0),
 q('I was wondering ___ you could give me a ride.',['that','if','what','does'],1),
]),

];

// Экспорт для app.js (проверка на дубликаты id — защита от опечаток)
(() => {
  const seen = new Set();
  GRAMMAR_CARDS.forEach((c) => {
    if (seen.has(c.id)) console.warn('Дубликат id в GRAMMAR_CARDS:', c.id);
    seen.add(c.id);
  });
  console.log(`content_grammar.js: ${GRAMMAR_CARDS.length} карточек готово`);
})();