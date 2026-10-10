/* ==========================================================================
   English Reboot — справочник «Как устроен английский»
   Файл: pos_guide.js — объяснение для ученика (не карточки, в повторения не попадает).
   Стиль — «строго и по делу» (выбор автора 2026-10-10): правило → название через английский →
   как узнать → примеры → американская речь → импровизация вслух (сначала по памяти, потом образец
   и звук) → своя фраза. Про английский, не про русский: без латыни и русской лингвистики.
   Цвет ключевого слова — те же классы pos-*, что в разметке примеров (css/style.css, POS-PALETTE).
   Весь текст статичный и свой; ввода ученика здесь нет. Оценок нет: образец — для сравнения на слух.
   ========================================================================== */

const PosGuide = (() => {
  'use strict';

  // examples: [английская фраза, ключевое слово (подсвечивается), перевод, свой класс цвета — по желанию]
  // say: [русская фраза, английский образец] — ученик говорит по памяти, потом открывает образец
  const CHAPTERS = [
    {
      id: "intro", icon: "🧭", title: "Как пользоваться справочником",
      paras: [
        "Справочник объясняет, из каких частей состоит английская фраза и как их узнать. Все главы построены одинаково: правило → как узнать → примеры → американская речь → упражнение вслух.",
        "Цвета под словами в примерах приложения — это части речи: синий — существительное, красный — глагол, оранжевая двойная линия — неправильный глагол, зелёный — прилагательное, фиолетовый — наречие, бирюзовый — местоимение, коричневый — предлог, линия цвета текста (сплошная или штриховая) — глаголы-помощники, серый пунктир — служебные слова.",
        "Зачем это нужно: у английских слов почти нет окончаний, и роль слова определяет его место во фразе. Зная часть речи, легче понять фразу на слух и построить свою.",
        "Упражнение вслух: прочитай русскую фразу, скажи её по-английски по памяти, затем нажми кнопку — появится и прозвучит образец. Сравни со своим вариантом. Оценок нет.",
      ],
    },
    {
      id: "noun", icon: "📦", pos: "pos-noun", en: "noun", ru: "существительное", word: "book",
      rule: "Существительное называет человека, предмет, место или понятие: friend, phone, city, idea. Отвечает на вопрос «кто? что?».",
      name: "Noun — родственник английского name («имя»): слово, которое что-то называет.",
      spot: "Перед ним часто стоят a, an, the, my, this. Во множественном числе добавляется -s: car → cars. Типичные окончания: -tion (station), -ness (kindness), -ment (apartment), -er (driver).",
      live: "Многие существительные в американской речи работают и как глаголы — без изменения формы: text (сообщение) → Text me (напиши мне), Google → Google it (найди в Google). Роль определяет место: сразу после I, you, we слово становится действием.",
      examples: [["My phone is dead.", "phone", "У меня сел телефон."], ["Text me later.", "Text", "Напиши мне позже."]],
      say: [["Мне нужно немного воды.", "I need some water."], ["Где ключи?", "Where are the keys?"]],
      free: "Назови вслух пять предметов рядом с тобой: a phone, a cup, a window…",
    },
    {
      id: "verb", icon: "⚙️", pos: "pos-verb", en: "verb", ru: "глагол", word: "work",
      rule: "Глагол обозначает действие или состояние: go, eat, think, be. В английском предложении глагол есть всегда: «Я дома» — I am home, «Она врач» — She is a doctor.",
      name: "Verb — родственник английского word («слово»): глагол считали главным словом предложения.",
      spot: "Стоит сразу после того, кто действует: I work, they work. После he, she, it добавляется -s: she works. Прошедшее время правильных глаголов — +ed: worked.",
      live: "В быстрой речи глагол сливается со следующим словом: going to → gonna, want to → wanna, got to → gotta. В вопросах помощник часто пропадает: You coming? = Are you coming?",
      examples: [["We work from home on Fridays.", "work", "По пятницам мы работаем из дома."], ["I think it's a good idea.", "think", "Думаю, это хорошая идея."]],
      say: [["Я работаю из дома.", "I work from home."], ["Она живёт в Нью-Йорке.", "She lives in New York."]],
      free: "Скажи вслух три действия, которые ты делаешь каждое утро: I wake up, I drink coffee, I check my phone…",
    },
    {
      id: "irregular", icon: "🔁", pos: "pos-verb pos-irr", en: "irregular verb", ru: "неправильный глагол", word: "went",
      rule: "Неправильный глагол образует прошедшее время и 3-ю форму не по схеме +ed: go — went — gone (не goed). В приложении он подчёркнут оранжевой двойной линией.",
      name: "Regular значит «обычный, по правилу» (regular price — обычная цена). Irregular — «не по правилу»: формы нужно запомнить.",
      spot: "Неправильных глаголов около двухсот, но среди них — самые частые. Все десять самых употребительных глаголов английского неправильные: be, have, do, say, go, get, make, know, think, take.",
      history: [
        "Около тысячи лет назад в английском было два типа глаголов. Одни меняли гласную внутри слова: sing — sang — sung. Другие добавляли окончание, из которого выросло современное -ed.",
        "Способ с -ed проще, поэтому он победил: все новые глаголы правильные (text — texted, google — googled), а многие старые перешли в правильные (help: раньше holp, теперь helped).",
        "Неправильными остались самые частые глаголы: их слышат и говорят так часто, что старая форма не забывается. По исследованию Гарвардского университета (2007), глагол, который встречается в 100 раз реже, становится правильным примерно в 10 раз быстрее.",
        "Went — особый случай: это прошедшее время старого глагола wend («держать путь»). Около XV века оно заменило собственное прошедшее время go.",
        "В американском английском правильные формы learned, burned, dreamed встречаются чаще, чем learnt, burnt, dreamt. Зато для США типичны неправильные dove (от dive), snuck (от sneak) и gotten: It's gotten cold.",
      ],
      groups: [
        ["Все три формы одинаковые", "put — put — put, cut, let, hit, set, cost, hurt, quit"],
        ["2-я и 3-я совпадают", "buy — bought — bought, think — thought, catch — caught, tell — told, make — made"],
        ["Меняется гласная", "sing — sang — sung, drink — drank — drunk, begin — began — begun, swim — swam — swum"],
        ["3-я форма на -n", "take — took — taken, give — gave — given, see — saw — seen, eat — ate — eaten, write — wrote — written"],
      ],
      live: "В песнях и фильмах звучит I seen it, I done it — это нестандартный разговорный вариант. Узнавать — да, в своей речи — I saw it, I did it. Неправильные глаголы можно отфильтровать во вкладке «Фразовые глаголы».",
      examples: [["We went to bed late last night.", "went", "Мы вчера поздно легли спать."], ["It's gotten really cold.", "gotten", "Стало очень холодно."]],
      say: [["Мы вчера ходили в кино.", "We went to the movies yesterday."], ["Вы смотрели тот фильм?", "Did you see that movie?"], ["Стало холодно.", "It's gotten cold."]],
      free: "Расскажи вслух о вчерашнем дне, используя три неправильных глагола: went, had, saw…",
    },
    {
      id: "adj", icon: "🎨", pos: "pos-adj", en: "adjective", ru: "прилагательное", word: "happy",
      rule: "Прилагательное описывает существительное: big, cheap, tired, cool. Отвечает на вопрос «какой?».",
      name: "Adjective удобно запомнить через add («добавлять»): прилагательное добавляется к существительному.",
      spot: "Стоит перед существительным (a cheap place) или после be (This place is cheap). Не меняется по числу: big house — big houses. Типичные окончания: -ful (useful), -less (useless), -able (comfortable), -ous (famous), -y (funny). Несколько прилагательных идут в порядке: мнение → размер → возраст → цвет → происхождение: a nice big old red car.",
      live: "В разговоре одно прилагательное часто составляет всю реплику: Nice! Awesome. Weird. Fair enough.",
      examples: [["This place is so cheap.", "cheap", "Здесь так дёшево."], ["The kids are tired.", "tired", "Дети устали."]],
      say: [["Это очень дорого.", "It's really expensive."], ["Какой классный город!", "What a cool city!"]],
      free: "Опиши вслух свою комнату тремя прилагательными: It's small, bright and messy.",
    },
    {
      id: "adv", icon: "🎚️", pos: "pos-adv", en: "adverb", ru: "наречие", word: "fast",
      rule: "Наречие уточняет действие: как (slowly), когда (now), где (here), насколько (really, totally).",
      name: "Adverb = ad + verb, «к глаголу»: стоит рядом с глаголом и уточняет его. Тем же фиолетовым цветом помечены частицы фразовых глаголов (up, off, out): они меняют смысл глагола — give «давать», give up «сдаваться».",
      spot: "Многие наречия оканчиваются на -ly: quickly, really, finally. Самые частые — без -ly: now, here, still, just, too, fast, hard.",
      live: "В разговоре американцы часто опускают -ly: He did real good. Узнавать стоит, в своей речи — really good. Частые усилители: super easy, totally fine, literally в значении «прямо-таки»: I'm literally starving.",
      examples: [["Please speak slowly.", "slowly", "Говорите, пожалуйста, медленно."], ["We just got here.", "just", "Мы только что пришли."]],
      say: [["Говорите медленнее, пожалуйста.", "Please speak more slowly."], ["Мы только что пришли.", "We just got here."]],
      free: "Скажи одно действие тремя способами: I eat slowly. I eat fast. I eat a lot.",
    },
    {
      id: "pron", icon: "🏷️", pos: "pos-pron", en: "pronoun", ru: "местоимение", word: "she",
      rule: "Местоимение заменяет существительное, чтобы не повторять его: I, you, he, she, it, we, they; my, your, their.",
      name: "Pronoun = pro + noun, «вместо существительного».",
      spot: "Тот, о ком речь, в английской фразе называется обязательно: «Иду домой» — I'm going home. Даже у погоды есть it: It's raining. I всегда пишется с большой буквы.",
      live: "You — и «ты», и «вы». Обращение ко всей компании — you guys (о любой компании, не только о мужчинах), на юге США — y'all. They в разговоре означает и «он или она», когда пол неизвестен: Someone called — they left a message.",
      examples: [["She lives near here.", "She", "Она живёт неподалёку."], ["Someone left their bag.", "their", "Кто-то оставил сумку."]],
      say: [["Идёт дождь.", "It's raining."], ["Где вы все?", "Where are you guys?"]],
      free: "Скажи вслух по одной фразе о трёх людях из своей жизни: She…, He…, They…",
    },
    {
      id: "prep", icon: "📍", pos: "pos-prep", en: "preposition", ru: "предлог", word: "on",
      rule: "Предлог показывает место, время или направление: in, on, at, to, from, with.",
      name: "Preposition = pre + position, «стоящий перед»: ставится перед существительным. Pre- значит «перед», как в preview, prepay.",
      spot: "Время: in — месяц, год, отрезок (in October, in 2026); on — день, дата (on Monday, on May 5); at — точное время (at 5 pm). Устойчивые выражения запоминаются целиком: in the morning, at night. В вопросах предлог часто стоит в конце: Who are you talking to? Where are you from?",
      live: "В быстрой речи предлоги ослабевают: kind of → kinda, out of → outta, a lot of → a lotta, to звучит как [тэ]. Американский вариант — on the weekend.",
      examples: [["See you on Monday.", "on", "Увидимся в понедельник."], ["Where are you from?", "from", "Откуда вы?"]],
      say: [["Увидимся в пятницу.", "See you on Friday."], ["Я на работе.", "I'm at work."]],
      free: "Скажи вслух, где ты сейчас и что вокруг, тремя предлогами: I'm at home, my phone is on the table…",
    },
    {
      id: "helpers", icon: "🎬", pos: "pos-modal", en: "modal & auxiliary verbs", ru: "глаголы-помощники", word: "can",
      rule: "Глаголы-помощники работают вместе с главным глаголом. Вспомогательные (do, does, did, be, have) образуют вопросы, отрицания и времена. Модальные (can, should, must, might) добавляют значение: могу, стоит, должен, возможно.",
      name: "Auxiliary значит «вспомогательный» (auxiliary staff — вспомогательный персонал). Modal запоминается через mode — «режим»: модальный глагол задаёт режим действия — можно, нужно, стоит.",
      spot: "В вопросе помощник стоит перед тем, кто действует: Do you work? Did you see that? Отрицание — тоже через помощника: I don't know. После помощника — начальная форма глагола: Did you go (не Did you went). Модальные не получают -s: she can (не she cans). В примерах модальные подчёркнуты сплошной линией цвета текста, вспомогательные — штриховой.",
      live: "Помощники в речи сокращаются сильнее всего: did you → didja, do you → d'you, don't know → dunno, have to → hafta, I would → I'd. Иногда помощник пропадает: You want some? = Do you want some?",
      examples: [["Can you help me?", "Can", "Можешь помочь?"], ["Did you see that?", "Did", "Видели это?", "pos-aux"]],
      say: [["Вы говорите по-английски?", "Do you speak English?"], ["Можешь мне помочь?", "Can you help me?"]],
      free: "Задай вслух три вопроса новому знакомому: Do you…? Can you…? Did you…?",
    },
    {
      id: "service", icon: "🧩", pos: "pos-art", en: "articles, conjunctions & other function words", ru: "служебные слова", word: "the",
      rule: "Служебные слова связывают фразу: артикли (a, an, the), союзы (and, but, because, if), частица to. Отдельного значения почти не имеют, но без них фраза звучит неправильно.",
      name: "Conjunction запоминается через junction («соединение, перекрёсток»): союз соединяет части предложения. Article — маленький элемент перед существительным.",
      spot: "a / an — «какой-то, один из»: I need a car. The — «тот самый, известный обоим»: Where's the car? a — родственник слова one, а the — родственник that: отсюда и значения. В примерах служебные слова — серый пунктир.",
      live: "В речи служебные слова звучат слабо: the → [ðə], a → [ə], and → [n] (rock 'n' roll), because → 'cause. Именно их чаще всего не слышно в фильмах.",
      examples: [["I need a coffee and a nap.", "and", "Мне нужны кофе и сон."], ["Call me if you need anything.", "if", "Позвони, если что-нибудь понадобится."]],
      say: [["Мне нужна машина.", "I need a car."], ["Где машина? (та самая, наша)", "Where's the car?"]],
      free: "Назови вслух три вещи, которые хочется купить (a…), и три, которые уже есть дома (the… или my…).",
    },
    {
      id: "interj", icon: "💥", pos: "", en: "interjection", ru: "междометие", word: "wow",
      rule: "Междометие выражает реакцию или эмоцию: wow, oops, ugh, yay, yikes.",
      name: "Interjection = inter + ject: inter- значит «между» (international), -ject — «бросать» (inject, project). Междометие «вброшено» между фразами.",
      spot: "Обычно стоит отдельно или в начале фразы: Oops, my bad! Значение во многом передаёт интонация, поэтому цветом в примерах не выделяется.",
      live: "uh-huh (интонация вверх) — «да»; uh-uh (ударение на первый слог) — «нет». ugh — раздражение, yikes — «ой-ой», whoa — удивление, phew — облегчение.",
      examples: [["Oops, my bad.", "Oops", "Ой, моя вина."], ["Uh-uh, no way.", "Uh-uh", "Не-а, ни за что."]],
      say: [["Ой, моя вина.", "Oops, my bad."], ["Ого, круто!", "Wow, that's cool!"]],
      free: "Отреагируй вслух одним междометием: завтра выходной… пропал Wi-Fi… пицца уже приехала.",
    },
    {
      id: "tenses", icon: "⏳", pos: "", en: "tenses", ru: "времена", word: "",
      rule: "Время глагола показывает, когда происходит действие и как говорящий на него смотрит: как на факт, процесс или результат.",
      name: "Tense — грамматическое «время». Не путать с прилагательным tense — «напряжённый».",
      spot: "Система времён — сетка 3 × 4. Три времени: прошлое, настоящее, будущее. Четыре вида: простой факт (I work), процесс (I'm working), результат (I've worked), длительность до сих пор (I've been working). Изменяемых форм у самого глагола только две — work и worked, остальное строится с помощниками. Начни с четырёх самых частых: I work (обычно), I worked (вчера), I'm working (сейчас), I'm gonna work (план).",
      live: "Где британец скажет Have you eaten yet?, американец часто скажет Did you eat yet? — Present Perfect в США звучит реже. Будущее в разговоре чаще выражают через gonna, чем через will: I'm gonna call her.",
      examples: [["I'm working right now.", "working", "Я сейчас работаю.", "pos-verb"], ["Did you eat yet?", "Did", "Вы уже поели?", "pos-aux"]],
      say: [["Я сейчас работаю.", "I'm working right now."], ["Завтра я позвоню маме.", "I'm gonna call my mom tomorrow."], ["Вы уже поели?", "Did you eat yet?"]],
      free: "Скажи одно действие в четырёх формах: обычно, вчера, сейчас, завтра. I cook. I cooked. I'm cooking. I'm gonna cook.",
    },
    {
      id: "order", icon: "🚂", pos: "", en: "word order", ru: "порядок слов", word: "",
      rule: "Порядок слов в английском фиксированный: кто → действие → что → где → когда. We | watched | a movie | at home | yesterday.",
      name: "Около тысячи лет назад в английском были падежные окончания, и порядок слов был свободнее. Окончания исчезли, и смысл теперь передаёт место слова: Dog bites man и Man bites dog — разные события.",
      spot: "Тот, кто действует, всегда стоит перед глаголом — даже если это формальное it или there: It's cold. There's a problem. Место и время обычно в конце: I saw her at the mall last night.",
      live: "В разговоре американцы часто задают вопрос без изменения порядка — только интонацией вверх: You're coming? You did what?! Такой вопрос нужно узнавать на слух.",
      examples: [["We watched a movie at home yesterday.", "watched", "Вчера мы смотрели фильм дома.", "pos-verb"], ["You're coming?", "coming", "Ты идёшь?", "pos-verb"]],
      say: [["Вчера мы ужинали дома.", "We had dinner at home yesterday."], ["Холодно.", "It's cold."]],
      free: "Расскажи вслух свой вчерашний вечер тремя фразами по схеме: кто → действие → что → где → когда.",
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

  // Импровизация: сначала сказать по памяти, потом открыть образец (кнопка ещё и озвучивает его)
  function sayHtml(say) {
    return `<ul class="pg-say">${say.map(([ru, en]) => `<li>
      <span class="pg-say-ru">«${esc(ru)}»</span>
      <button class="pg-say-btn" type="button" data-say="${esc(en)}">Показать образец</button>
      <span class="pg-say-en" hidden>${esc(en)}</span>
    </li>`).join('')}</ul>`;
  }

  function chapterHtml(c, open) {
    const head = c.en
      ? `<span class="pg-icon" aria-hidden="true">${c.icon}</span>${c.word ? `<span class="pg-word ${c.pos}">${esc(c.word)}</span>` : ''}<span class="pg-title">${esc(c.ru)}</span><span class="pg-en">${esc(c.en)}</span>`
      : `<span class="pg-icon" aria-hidden="true">${c.icon}</span><span class="pg-title">${esc(c.title)}</span>`;
    let body = '';
    if (c.paras) body += c.paras.map((p) => `<p>${esc(p)}</p>`).join('');
    if (c.rule) body += `<p class="pg-rule"><b>Правило.</b> ${esc(c.rule)}</p>`;
    if (c.name) body += `<h4>${c.id === 'order' ? 'Почему так' : 'Название'}</h4><p>${esc(c.name)}</p>`;
    if (c.spot) body += `<h4>${c.id === 'irregular' ? 'Почему это важно' : 'Как узнать'}</h4><p>${esc(c.spot)}</p>`;
    if (c.history) body += `<h4>Почему они «неправильные»</h4>${c.history.map((p) => `<p>${esc(p)}</p>`).join('')}`;
    if (c.groups) body += `<h4>Группы форм для запоминания</h4><ul class="pg-groups">${c.groups.map(([g, ex]) => `<li><b>${esc(g)}</b>: ${esc(ex)}</li>`).join('')}</ul>`;
    if (c.examples) body += `<h4>Примеры</h4><ul class="pg-examples">${c.examples.map((e) => exampleHtml(e, c.pos)).join('')}</ul>`;
    if (c.live) body += `<h4>В американской речи</h4><p>${esc(c.live)}</p>`;
    if (c.say) body += `<h4>Импровизация вслух</h4><p class="pg-say-how">Скажи фразу по-английски по памяти, затем нажми кнопку — появится и прозвучит образец.</p>${sayHtml(c.say)}`;
    if (c.free) body += `<p class="pg-free"><b>Своя фраза.</b> ${esc(c.free)}</p>`;
    return `<details class="pg-chapter" id="pg-${c.id}"${open ? ' open' : ''}><summary>${head}</summary><div class="pg-body">${body}</div></details>`;
  }

  // Разметка справочника для модального окна; openId — какую главу раскрыть
  function html(openId) {
    const id = CHAPTERS.some((c) => c.id === openId) ? openId : 'intro';
    return `<div class="pos-guide">
      <h3>Как устроен английский</h3>
      <p class="pg-lead">Части речи, неправильные глаголы, времена и порядок слов: правило, примеры и упражнение вслух.</p>
      ${CHAPTERS.map((c) => chapterHtml(c, c.id === id)).join('')}
      <div class="modal-actions"><button class="btn" id="pg-close" type="button">Понятно</button></div>
    </div>`;
  }

  return { CHAPTERS, html };
})();

if (typeof window !== 'undefined') window.PosGuide = PosGuide;
