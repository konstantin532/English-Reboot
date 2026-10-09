/* ==========================================================================
   English Reboot — справочник «Части речи: зачем и откуда названия»
   Файл: pos_guide.js — объяснение для ученика (не карточки, в повторения не попадает):
   что делает каждая часть речи, почему она так называется, как узнать её в живой речи,
   и отдельная глава — почему глаголы «неправильные».
   Цвет части речи — те же классы pos-*, что в разметке примеров (css/style.css, POS-PALETTE).
   Весь текст статичный, свой; ввода ученика здесь нет.
   ========================================================================== */

const PosGuide = (() => {
  'use strict';

  // Пример: [английская фраза, ключевое слово (подсвечивается цветом), перевод]
  const CHAPTERS = [
    {
      id: 'intro', title: 'Зачем вообще части речи',
      paras: [
        'Цвета под словами в примерах — это части речи. Они не для экзамена, а для понимания: в английском слова почти не меняют окончаний, и роль слова видна по тому, где оно стоит. Знаешь, что перед тобой глагол, — знаешь, чего ждать дальше.',
        'Одно и то же слово бывает разными частями речи: I work (глагол) и my work (существительное), a fast car (прилагательное) и drive fast (наречие). В кино это сплошь и рядом: «Text me» — существительное text стало глаголом «напиши мне».',
        'Откуда названия. Греческие грамматисты больше двух тысяч лет назад разделили слова на восемь «частей речи». Римляне перевели это на латынь — partes orationis, а английские и русские школьные грамматики выросли из латинских. Поэтому русские названия — почти дословные переводы тех же греко-латинских терминов: adverbium — на-речие, pronomen — мест-о-имение, praepositio — пред-лог. Логика уже знакома — просто её не видно, пока не скажешь вслух.',
        'Нажми на главу — внутри: что делает часть речи, почему так называется, как узнать её на слух и в тексте.',
      ],
    },
    {
      id: 'noun', pos: 'pos-noun', en: 'noun', ru: 'существительное', word: 'book',
      what: 'Называет людей, предметы, места и понятия: friend, phone, city, love. Отвечает на вопрос «кто? что?».',
      name: 'Noun — от латинского nomen, «имя»: это слово-название. Русское «имя существительное» — перевод латинского nomen substantivum, «имя сущности», то есть того, что существует.',
      spot: 'Стоит после a/an, the, my, this; во множественном числе получает -s (cars, friends). Частые окончания: -tion (information), -ness (kindness), -ment (apartment), -er (driver).',
      live: 'В американской речи существительные легко становятся глаголами: text me, Google it, let\'s grab lunch, we need to talk it out.',
      examples: [['My phone is in the car.', 'phone', 'Мой телефон в машине.'], ['Text me when you get home.', 'Text', 'Напиши, когда доберёшься до дома.']],
    },
    {
      id: 'verb', pos: 'pos-verb', en: 'verb', ru: 'глагол', word: 'work',
      what: 'Действие или состояние: go, eat, think, be. Без глагола английское предложение не бывает: по-русски «Я врач», по-английски обязательно I am a doctor.',
      name: 'Verb — от латинского verbum, «слово». Глагол считали главным словом предложения, «словом» вообще. Русское «глагол» значит то же самое: в древнерусском и церковнославянском «глаголъ» — это «слово, речь», а «глаголати» — «говорить».',
      spot: 'Стоит сразу после того, кто действует: I work, she works (у he/she/it — окончание -s). Прошедшее — чаще всего +ed, но у самых частых глаголов — своя форма (см. главу «Неправильные глаголы»).',
      live: 'В быстрой речи глагол часто сливается с соседями: going to → gonna, want to → wanna, got to → gotta. А вспомогательный are американцы нередко пропускают: You coming? вместо Are you coming?',
      examples: [['We work from home on Fridays.', 'work', 'По пятницам мы работаем из дома.'], ['I think it\'s a good idea.', 'think', 'Думаю, это хорошая идея.']],
    },
    {
      id: 'irregular', pos: 'pos-verb pos-irr', en: 'irregular verb', ru: 'неправильный глагол', word: 'went',
      what: 'Глагол, у которого прошедшее время и третья форма образуются не по правилу «+ed»: go — went — gone, а не goed. В приложении такие глаголы подчёркнуты оранжевой двойной линией.',
      name: 'Regular — от латинского regula, «линейка, правило». Правильный глагол — тот, что идёт «по линейке»: work — worked — worked. Неправильный (irregular) — тот, что не подчиняется сегодняшнему правилу. Но «неправильными» они стали только с точки зрения нашего времени: тысячу лет назад у них были свои строгие правила.',
      spot: 'Их около двухсот, но главное — они самые частые. Из десятка самых употребительных глаголов английского (be, have, do, say, go, get, make, know, think, take) неправильные все. Значит, в любом фильме ты слышишь их в каждой второй фразе.',
      history: [
        'Тысячу лет назад, в древнеанглийском, было два типа глаголов. «Сильные» меняли гласную внутри корня: sing — sang — sung, drink — drank — drunk, ride — rode — ridden. Это очень древний способ, такое чередование есть и в русском: брать — беру — сбор.',
        '«Слабые» глаголы просто добавляли окончание с d или t — от него и пошло современное -ed. Этот способ оказался удобнее: все новые глаголы спрягаются по нему (text — texted, google — googled), а многие старые сильные глаголы со временем «исправились». Раньше говорили help — holp, climb — clomb, теперь helped, climbed.',
        'Почему тогда went, а не goed? Выжили формы, которые слышат сотни раз в день: частое не успевают «исправить». А went вообще чужое слово: это прошедшее время старого глагола wend — «держать путь». Примерно в XV веке оно вытеснило собственное прошедшее время go. В русском то же самое: идти — шёл, быть — есть — был — разные корни склеились в один глагол.',
        'Процесс идёт и сейчас, и Америка тут заметна: американцы чаще говорят learned, burned, dreamed, spelled (у британцев встречается learnt, burnt). А в обратную сторону — свои неправильные формы: dove (от dive), snuck (от sneak) — их стоит узнавать на слух. И gotten — старая форма, которую Америка сохранила, а Британия почти потеряла: It\'s gotten cold.',
      ],
      groups: [
        ['Все три формы одинаковые', 'put — put — put, cut, let, hit, set, cost, hurt, quit'],
        ['2-я и 3-я совпадают', 'buy — bought — bought, think — thought, catch — caught, tell — told, make — made'],
        ['Меняется гласная', 'sing — sang — sung, drink — drank — drunk, begin — began — begun, swim — swam — swum'],
        ['3-я форма на -n', 'take — took — taken, give — gave — given, see — saw — seen, eat — ate — eaten, write — wrote — written'],
      ],
      live: 'В песнях и фильмах услышишь I seen it, I done it — это разговорные нестандартные формы. Узнавать — да, а в своей речи — I saw it, I did it. Учи формы в фразах и вслух: I went home. Did you go? I\'ve gone. Отфильтровать неправильные глаголы можно во вкладке «Фразовые глаголы».',
      examples: [['We went to bed late last night.', 'went', 'Мы вчера поздно легли спать.'], ['It\'s gotten really cold.', 'gotten', 'Стало очень холодно.']],
    },
    {
      id: 'adj', pos: 'pos-adj', en: 'adjective', ru: 'прилагательное', word: 'happy',
      what: 'Описывает существительное: какой? — big, cheap, tired, awesome.',
      name: 'Adjective — от латинского adiectivum, «прибавленное, приложенное»: слово, которое прикладывают к существительному. «Прилагательное» — дословный перевод (при-лаг-ать). Долгое время его даже не считали отдельной частью речи — оно было разновидностью «имени», отсюда «имя прилагательное».',
      spot: 'Стоит перед существительным или после be: a big house, the house is big. Не меняется по родам и числам, в отличие от русского: big house, big houses (а не «бигс»). Частые окончания: -ful (useful), -less (useless), -able (comfortable), -ous (famous), -y (funny).',
      live: 'В живой речи прилагательное часто стоит одно, вместо целой фразы: Nice! Awesome. Weird. Fair enough.',
      examples: [['This place is so cheap.', 'cheap', 'Здесь так дёшево.'], ['The kids are tired.', 'tired', 'Дети устали.']],
    },
    {
      id: 'adv', pos: 'pos-adv', en: 'adverb', ru: 'наречие', word: 'fast',
      what: 'Говорит, как, когда, где и насколько: slowly, now, here, really, always.',
      name: 'Adverb — латинское ad verbum, «при глаголе»: слово, которое стоит рядом с глаголом и уточняет его. «На-речие» — тот же перевод (verbum — «слово, речь»). В приложении этим же цветом помечены частицы фразовых глаголов (up, off, out): они тоже уточняют действие и меняют смысл — give → give up.',
      spot: 'Часто на -ly: quickly, really, finally. Но самые частые — без -ly: now, here, still, just, too, fast, hard.',
      live: 'Американцы в разговоре нередко говорят без -ly: Drive safe, He did real good. Узнавать стоит, а в своей речи — really good. Ещё одно частое наречие-усилитель — super: super easy.',
      examples: [['Please speak slowly.', 'slowly', 'Говорите, пожалуйста, медленно.'], ['We just got here.', 'just', 'Мы только что пришли.']],
    },
    {
      id: 'pron', pos: 'pos-pron', en: 'pronoun', ru: 'местоимение', word: 'she',
      what: 'Заменяет существительное, чтобы не повторять его: I, you, she, they, it, this, someone.',
      name: 'Pronoun — латинское pro nomine, «вместо имени». Русское «мест-о-имение» — буквально то же: «вместо имени».',
      spot: 'В английском местоимение почти всегда обязательно: по-русски «Иду домой», по-английски I\'m going home. «Идёт дождь» — It\'s raining: даже у дождя есть подлежащее it.',
      live: 'You бывает и «ты», и «вы», а во множественном числе американцы говорят you guys (обо всех, не только о мужчинах), на юге — y\'all. They в разговоре — ещё и «он или она», когда пол неизвестен: Someone called — they left a message.',
      examples: [['She lives near here.', 'She', 'Она живёт неподалёку.'], ['Someone left their bag.', 'their', 'Кто-то оставил сумку.']],
    },
    {
      id: 'prep', pos: 'pos-prep', en: 'preposition', ru: 'предлог', word: 'on',
      what: 'Показывает связь в пространстве и времени: in, on, at, to, from, with, about.',
      name: 'Preposition — латинское praepositio, «поставленное перед»: предлог стоит перед существительным. «Пред-лог» — дословный перевод.',
      spot: 'Перед существительным или местоимением: at work, on Monday, with me. Но в вопросах американцы спокойно ставят предлог в конец: Who are you talking to? What\'s it about? — так звучит естественно.',
      live: 'В быстрой речи предлоги почти исчезают: kind of → kinda, out of → outta, a lot of → a lotta, to → [тэ]. Поэтому их так трудно услышать в фильмах — и поэтому в заданиях на слух мы их ищем.',
      examples: [['See you on Monday.', 'on', 'Увидимся в понедельник.'], ['Who are you talking to?', 'to', 'С кем ты разговариваешь?']],
    },
    {
      id: 'helpers', pos: 'pos-modal', en: 'modal & auxiliary verbs', ru: 'модальные и вспомогательные глаголы', word: 'can',
      what: 'Помощники главного глагола. Модальные (can, must, should, might) добавляют отношение: могу, должен, стоит, может быть. Вспомогательные (do/does/did, be, have) строят вопросы, отрицания и времена.',
      name: 'Modal — от латинского modus, «способ, наклонение»: они передают, как говорящий относится к действию. Auxiliary — от auxilium, «помощь»; «вспомогательный» — перевод того же слова.',
      spot: 'По-русски вопрос делают интонацией: «Ты работаешь?» По-английски нужен помощник: Do you work? Отрицание — тоже через него: I don\'t work. После помощника глагол в начальной форме: Did you go, а не Did you went. Модальные не берут -s: she can, а не she cans. В примерах модальные — тёмная сплошная линия, вспомогательные — тёмный штрих.',
      live: 'Помощники в речи сжимаются сильнее всего: did you → didja, do you → d\'you, don\'t know → dunno, have to → hafta, I would → I\'d.',
      examples: [['Can you help me?', 'Can', 'Можешь помочь?'], ['Did you see that?', 'Did', 'Видели это?', 'pos-aux']],
    },
    {
      id: 'service', pos: 'pos-art', en: 'articles, conjunctions & other function words', ru: 'служебные слова', word: 'the',
      what: 'Артикли (a, an, the), союзы (and, but, because, if), частица to, числа. Сами по себе почти ничего не значат, но держат фразу вместе.',
      name: 'Article — от латинского articulus, «суставчик»: маленькое слово-сустав, а в старых русских грамматиках артикль так и называли — «член». Conjunction — от coniungere, «соединять»; русский «союз» — «то, что связывает».',
      spot: 'Артикль стоит перед существительным (или перед его прилагательным): a car, the old car. Артиклей в русском нет, поэтому они самые трудные. В примерах служебные слова — серый пунктир: смотреть на них можно меньше, а вот слышать надо учиться.',
      live: 'В живой речи служебные слова звучат слабо: the → [ðə], a → [ə], and → [n] (rock \'n\' roll), because → \'cause. Половину того, что «непонятно» в фильмах, составляют именно они.',
      examples: [['I need a coffee and a nap.', 'and', 'Мне нужны кофе и сон.'], ['Call me if you need anything.', 'if', 'Позвони, если что-нибудь понадобится.']],
    },
    {
      id: 'interj', pos: '', en: 'interjection', ru: 'междометие', word: 'wow',
      what: 'Слова-реакции: wow, oops, ugh, uh-huh, nope, yay. Передают чувство, а не смысл.',
      name: 'Interjection — латинское interiectio, «брошенное между»: его вставляют между словами. Русское «междо-метие» — тот же перевод: «метать между».',
      spot: 'Чаще всего стоит отдельно, в начале фразы, с восклицательным знаком: Oops, my bad! Цветом в примерах не выделяется — смысл передаёт интонация.',
      live: 'В американских фильмах междометий очень много, и есть ловушка: uh-huh (с подъёмом) — «ага, да», а uh-uh (с ударом на первом слоге) — «не-а, нет». Ещё: ugh — раздражение, yikes — «ой-ой», whoa — удивление.',
      examples: [['Oops, my bad.', 'Oops', 'Ой, моя вина.'], ['Uh-uh, no way.', 'Uh-uh', 'Не-а, ни за что.']],
    },
  ];

  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  function exampleHtml([text, key, ru, own], chapterPos) {
    const pos = own || chapterPos;
    const i = text.indexOf(key);
    const en = i < 0 || !pos ? esc(text)
      : esc(text.slice(0, i)) + `<span class="${pos}">${esc(key)}</span>` + esc(text.slice(i + key.length));
    return `<li><span class="pg-ex-en">${en}</span><span class="pg-ex-ru">${esc(ru)}</span></li>`;
  }

  function chapterHtml(c, open) {
    const head = c.pos !== undefined
      ? `<span class="pg-word ${c.pos}">${esc(c.word)}</span><span class="pg-title">${esc(c.ru)}</span><span class="pg-en">${esc(c.en)}</span>`
      : `<span class="pg-title">${esc(c.title)}</span>`;
    let body = '';
    if (c.paras) body += c.paras.map((p) => `<p>${esc(p)}</p>`).join('');
    if (c.what) body += `<h4>Что делает</h4><p>${esc(c.what)}</p>`;
    if (c.name) body += `<h4>Почему так называется</h4><p>${esc(c.name)}</p>`;
    if (c.spot) body += `<h4>${c.id === 'irregular' ? 'Почему это важно' : 'Как узнать'}</h4><p>${esc(c.spot)}</p>`;
    if (c.history) body += `<h4>Откуда они взялись</h4>${c.history.map((p) => `<p>${esc(p)}</p>`).join('')}`;
    if (c.groups) body += `<h4>Как их учить — по группам форм</h4><ul class="pg-groups">${c.groups.map(([g, ex]) => `<li><b>${esc(g)}</b>: ${esc(ex)}</li>`).join('')}</ul>`;
    if (c.live) body += `<h4>В живой американской речи</h4><p>${esc(c.live)}</p>`;
    if (c.examples) body += `<ul class="pg-examples">${c.examples.map((e) => exampleHtml(e, c.pos)).join('')}</ul>`;
    return `<details class="pg-chapter" id="pg-${c.id}"${open ? ' open' : ''}><summary>${head}</summary><div class="pg-body">${body}</div></details>`;
  }

  // Разметка справочника для модального окна; openId — какую главу раскрыть
  function html(openId) {
    const id = CHAPTERS.some((c) => c.id === openId) ? openId : 'intro';
    return `<div class="pos-guide">
      <h3>Части речи: зачем и откуда названия</h3>
      <p class="pg-lead">Почему глаголы «неправильные», откуда слово «наречие» и как всё это помогает понимать живую речь.</p>
      ${CHAPTERS.map((c) => chapterHtml(c, c.id === id)).join('')}
      <div class="modal-actions"><button class="btn" id="pg-close" type="button">Понятно</button></div>
    </div>`;
  }

  return { CHAPTERS, html };
})();

if (typeof window !== 'undefined') window.PosGuide = PosGuide;
