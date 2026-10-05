/* ==========================================================================
   English Reboot — Этап 3: сквозная история «Переезд в Нью-Йорк»
   Файл: scenes_us.js — персонажи и эпизоды (данные; логика — в scenes.js).
   Партия 1: 4 эпизода — аэропорт, такси, квартира, кофейня.
   Тексты написаны вручную на фразах из content_us.js (список phrases у эпизода
   проверяется тестом). Реплики ученика — нейтральные по роду.
   Тон вариантов выбора: natural — как сказал бы американец; formal — правильно,
   но как из учебника/анкеты; rude — грубовато. Персонаж реагирует по-разному.
   ========================================================================== */

const SCENE_CAST = {
  maggie: { name: 'Мэгги', en: 'Maggie', role: 'соседка по квартире', color: '#EC4899', initial: 'M' },
  tony: { name: 'Тони', en: 'Tony', role: 'коллега по команде', color: '#3B82F6', initial: 'T' },
  okafor: { name: 'Мистер Окафор', en: 'Mr. Okafor', role: 'арендодатель', color: '#6B7280', initial: 'O' },
  officer: { name: 'Офицер', en: 'Officer', role: 'паспортный контроль', color: '#0F766E', initial: '★' },
  ray: { name: 'Рэй', en: 'Ray', role: 'таксист', color: '#F59E0B', initial: 'R' },
  jess: { name: 'Джесс', en: 'Jess', role: 'бариста', color: '#8B5CF6', initial: 'J' },
};

const SCENE_EPISODES = [
  /* ---------------- 1. Аэропорт JFK ---------------- */
  {
    id: 'ep1-airport', title: 'Аэропорт JFK', place: 'Нью-Йорк, паспортный контроль',
    intro: 'Самолёт приземлился в Нью-Йорке. Впереди паспортный контроль — и новая жизнь: работа, квартира, соседка Мэгги.',
    phrases: ["I'm here for business", 'How long are you staying?', 'Anything to declare?', 'I just landed', 'Text me when you land'],
    start: 'n1',
    nodes: {
      n1: {
        who: 'officer', say: 'Next, please! Hi there. What brings you to the US?', ru: 'Следующий! Здравствуйте. С какой целью в США?',
        reply: { type: 'choice', options: [
          { tone: 'natural', text: "I'm here for business. I'm starting a new job.",
            react: { say: 'Oh, nice! Congrats on the new job.', mood: 'smile' },
            coach: 'Коротко и по делу — на границе так и отвечают.', next: 'n2' },
          { tone: 'formal', text: 'Good afternoon. The purpose of my visit is professional employment.',
            react: { say: 'Uh-huh... So, work?', mood: 'confused' },
            coach: 'Грамматически верно, но звучит как анкета. Американец скажет: I\'m here for business.', next: 'n2' },
          { tone: 'rude', text: 'Work. Can we hurry up?',
            react: { say: 'Hey. Slow down. I need your passport first.', mood: 'frown' },
            coach: '«Hurry up» офицеру звучит как приказ. На границе лучше спокойно и вежливо.', next: 'n1b' },
        ] },
      },
      n1b: {
        who: 'officer', say: "Okay. Let's try again. What's the purpose of your visit?",
        reply: { type: 'choice', options: [
          { tone: 'natural', text: "Sorry, long flight. I'm here for business.",
            react: { say: 'No worries. Happens all the time.', mood: 'neutral' },
            coach: 'Извиниться и ответить — лучший выход. «Sorry, long flight» снимает напряжение.', next: 'n2' },
          { tone: 'rude', text: 'I already told you. Work.',
            react: { say: "Okay... I'm gonna need you to stay polite.", mood: 'frown' },
            coach: 'Повтор с раздражением только затягивает проверку. Вежливость тут экономит время.', next: 'n2' },
        ] },
      },
      n2: {
        who: 'officer', say: 'How long are you staying?', ru: 'На какой срок вы приехали?',
        reply: { type: 'open', prompt: 'Ответь своими словами: на какой срок приезд? (По сюжету — переезд на год, по работе.)',
          meanings: [
            { id: 'long', label: 'надолго — на год', keys: ['a year', 'one year', 'twelve months', 'for good', 'long time', 'long term', 'moving here', 'i am moving', 'relocating', 'permanently'],
              react: { say: "A year in New York! You're gonna love it.", mood: 'smile' }, next: 'n3' },
            { id: 'short', label: 'ненадолго', keys: ['a week', 'two weeks', 'few days', 'a month', 'couple of days', 'couple of weeks', 'short trip'],
              react: { say: 'Just a short trip? Your paperwork says one year.', mood: 'surprised' }, next: 'n3' },
            { id: 'unsure', label: 'пока не знаю', keys: ['not sure', 'do not know', 'no idea', 'it depends'],
              react: { say: 'You should know that. It says one year here — sound right?', mood: 'confused' }, next: 'n3' },
          ],
          samples: ["I'm here for a year.", 'About a year — I got a job here.', 'One year, on a work visa.', "I'm moving here for at least a year."],
          fallbackNext: 'n3' },
      },
      n3: {
        who: 'officer', say: 'Anything to declare?', ru: 'Есть что декларировать?',
        reply: { type: 'choice', options: [
          { tone: 'natural', text: 'No, nothing to declare.',
            react: { say: 'Alright.', mood: 'neutral' },
            coach: 'Идеально: «No, nothing to declare» — стандартный ответ.', next: 'n4' },
          { tone: 'formal', text: 'I hereby declare that I carry no prohibited items.',
            react: { say: 'Ha! Okay, counselor. Moving on.', mood: 'laugh' },
            coach: '«Hereby declare» — язык юристов. Офицер посмеялся, но хватило бы «No, nothing».', next: 'n4' },
          { tone: 'rude', text: 'Why would I have anything?',
            react: { say: "It's a standard question. Let's take a look at your bag.", mood: 'frown' },
            coach: 'Встречный вопрос с вызовом — и вот уже досмотр сумки. Просто «No».', next: 'n3b' },
        ] },
      },
      n3b: { who: 'officer', say: "Your bag's fine. Next time, just say no.", next: 'n4' },
      n4: { who: 'officer', say: 'Welcome to New York. Enjoy your stay!', ru: 'Добро пожаловать в Нью-Йорк!', next: 'n5' },
      n5: {
        who: 'maggie', say: "Hey, it's Maggie, your new roommate! Did your flight land?", ru: 'Привет, это Мэгги, твоя соседка! Самолёт приземлился?',
        reply: { type: 'open', prompt: 'Мэгги пишет в мессенджер. Ответь ей своими словами.',
          meanings: [
            { id: 'landed', label: 'да, на месте', keys: ['just landed', 'landed', 'i am here', 'i am at the airport', 'made it', 'in new york', 'got through customs'],
              react: { say: 'Yay! Welcome to New York!', mood: 'laugh' }, next: 'n6' },
            { id: 'not-yet', label: 'ещё нет', keys: ['not yet', 'still on the plane', 'still in line', 'not landed', 'not here yet'],
              react: { say: 'No rush! Text me when you land.', mood: 'warm' }, next: 'n6' },
          ],
          samples: ['I just landed!', 'Yep, I just landed at JFK.', 'Hey Maggie! Yes, I made it!', "I'm here! Just got through customs."],
          fallbackNext: 'n6' },
      },
      n6: { who: 'maggie', say: 'Grab a cab and text me the ETA. See you soon!', ru: 'Бери такси и напиши, когда будешь. До встречи!', end: true },
    },
  },

  /* ---------------- 2. Такси до Бруклина ---------------- */
  {
    id: 'ep2-taxi', title: 'Такси до Бруклина', place: 'Желтое такси, мост в Бруклин',
    intro: 'Очередь на такси, жёлтая машина, водитель Рэй. Нужно доехать до Бруклина, где ждёт Мэгги.',
    phrases: ['Hop in', 'Traffic is crazy', "I'm on my way", 'Keep the change', "That's a rip-off", 'Have a good one'],
    start: 'n1',
    nodes: {
      n1: {
        who: 'ray', say: 'Hey there! Where to?', ru: 'Привет! Куда едем?',
        reply: { type: 'choice', options: [
          { tone: 'natural', text: "Hi! Brooklyn, please. Here's the address.",
            react: { say: 'Brooklyn, you got it. Hop in!', mood: 'smile' },
            coach: '«Hi» + адрес + «please» — так звучит нормальный пассажир.', next: 'n2' },
          { tone: 'formal', text: 'Good evening. I would like to be transported to the following address.',
            react: { say: 'Transported? Like a package? Ha! Sure, hop in.', mood: 'laugh' },
            coach: '«Transported» говорят о грузах. Просто: Brooklyn, please.', next: 'n2' },
          { tone: 'rude', text: 'Brooklyn. Go.',
            react: { say: 'Okay... nice to meet you too.', mood: 'frown' },
            coach: 'Без «hi» и «please» звучит как приказ. В американском такси принято здороваться.', next: 'n2' },
        ] },
      },
      n2: {
        who: 'ray', say: 'First time in New York?', ru: 'Первый раз в Нью-Йорке?',
        reply: { type: 'open', prompt: 'Ответь Рэю своими словами: впервые здесь или нет?',
          meanings: [
            { id: 'first', label: 'да, впервые', keys: ['first time', 'never been', 'yes', 'yeah', 'yep', 'just moved'],
              react: { say: 'Welcome! You picked a great city.', mood: 'warm' }, next: 'n3' },
            { id: 'been-before', label: 'уже бывал(а)', keys: ['been here before', 'second time', 'not my first', 'visited before', 'nope'],
              react: { say: 'Oh, so you know the drill.', mood: 'smile' }, next: 'n3' },
          ],
          samples: ["Yeah, it's my first time here!", "Yes, first time. I'm so excited.", "Nope, I've been here before.", 'First time — I just moved here.'],
          fallbackNext: 'n3' },
      },
      n3: {
        who: 'ray', say: 'Traffic is crazy on the bridge. Could be forty minutes.', ru: 'На мосту жуткие пробки. Минут сорок, не меньше.',
        reply: { type: 'choice', options: [
          { tone: 'natural', text: "No worries, I'm not in a rush.",
            react: { say: 'Love that attitude.', mood: 'smile' },
            coach: '«No worries» — лёгкий, очень американский ответ.', next: 'n4' },
          { tone: 'formal', text: 'That is acceptable. Please proceed at your convenience.',
            react: { say: 'Uh... okay, boss.', mood: 'confused' },
            coach: 'Звучит как письмо начальнику. В такси хватит «No worries».', next: 'n4' },
          { tone: 'rude', text: 'Ugh, seriously? Drive faster.',
            react: { say: "Hey, I'm not breaking the law for you.", mood: 'frown' },
            coach: 'Подгонять водителя невежливо — и пробку это не уберёт.', next: 'n3b' },
        ] },
      },
      n3b: { who: 'ray', say: "Relax. We'll get there.", next: 'n4' },
      n4: {
        who: 'maggie', say: 'Where are you? 😊', ru: 'Ты где? 😊',
        reply: { type: 'open', prompt: 'Мэгги пишет сообщение. Ответь, где ты и когда будешь.',
          meanings: [
            { id: 'on-way', label: 'в пути', keys: ['on my way', 'in a cab', 'in the cab', 'in a taxi', 'in the taxi', 'almost there', 'stuck in traffic', 'on the bridge', 'be there in'],
              react: { say: "Perfect! I'll make some coffee ☕", mood: 'laugh' }, next: 'n5' },
          ],
          samples: ["I'm on my way!", "I'm in a cab, stuck in traffic.", "Almost there — I'll be there in forty minutes.", 'On the bridge now. Traffic is crazy!'],
          fallbackNext: 'n5' },
      },
      n5: {
        who: 'ray', say: "Here we are! That's twenty-eight fifty.", ru: 'Приехали! С вас двадцать восемь пятьдесят.',
        reply: { type: 'choice', options: [
          { tone: 'natural', text: "Here's thirty. Keep the change!",
            react: { say: 'Thanks, friend! Welcome to Brooklyn!', mood: 'laugh' },
            coach: 'Оставить сдачу — нормальные чаевые в такси.', next: 'n6' },
          { tone: 'formal', text: 'Kindly accept this payment of twenty-eight dollars and fifty cents.',
            react: { say: 'Uh... thanks? Okay.', mood: 'confused' },
            coach: 'Слишком торжественно для такси. Достаточно «Here you go».', next: 'n6' },
          { tone: 'rude', text: "That's a rip-off.",
            react: { say: "Hey, that's what the meter says, pal.", mood: 'frown' },
            coach: '«Rip-off» — обвинение в обмане. Если сомневаешься, спроси: «Is that the meter price?»', next: 'n6' },
        ] },
      },
      n6: { who: 'ray', say: 'Have a good one!', ru: 'Хорошего дня!', end: true },
    },
  },

  /* ---------------- 3. Ключи от квартиры ---------------- */
  {
    id: 'ep3-apartment', title: 'Ключи от квартиры', place: 'Бруклин, квартира на третьем этаже',
    intro: 'У подъезда ждёт арендодатель, мистер Окафор: ключи, правила дома — и знакомство с Мэгги.',
    phrases: ['Nice to finally meet you', 'Make yourself at home', "I'm jet-lagged", "Let's order in", "I'll take care of it"],
    start: 'n1',
    nodes: {
      n1: {
        who: 'okafor', say: "You must be the new tenant. I'm Mr. Okafor, the landlord.", ru: 'Вы, должно быть, новый жилец. Я мистер Окафор, арендодатель.',
        reply: { type: 'choice', options: [
          { tone: 'natural', text: 'Hi! Nice to finally meet you.',
            react: { say: 'Likewise. Come on in.', mood: 'smile' },
            coach: '«Nice to finally meet you» — если раньше общались только по почте.', next: 'n2' },
          { tone: 'formal', text: 'Greetings, Mr. Okafor. It is an honor to make your acquaintance.',
            react: { say: "An honor? Ha. It's just an apartment, but thank you.", mood: 'surprised' },
            coach: '«Honor» и «acquaintance» — для приёма у посла. Хватит «Nice to meet you».', next: 'n2' },
          { tone: 'rude', text: 'Yeah, yeah. Where are the keys?',
            react: { say: 'Patience. First, a few house rules.', mood: 'frown' },
            coach: 'С арендодателем лучше начать с приветствия — вам ещё год жить рядом.', next: 'n1b' },
        ] },
      },
      n1b: { who: 'okafor', say: 'Rule number one: be polite to your landlord.', next: 'n2' },
      n2: {
        who: 'okafor', say: 'Rent is due on the first of every month. Any questions?', ru: 'Аренда — первого числа каждого месяца. Вопросы есть?',
        reply: { type: 'open', prompt: 'Задай арендодателю вопрос своими словами — про Wi-Fi, стирку или мусор. Или скажи, что вопросов нет.',
          meanings: [
            { id: 'wifi', label: 'вопрос про Wi-Fi', keys: ['wi-fi', 'wifi', 'internet', 'password'],
              react: { say: "The Wi-Fi password is on the fridge.", mood: 'neutral' }, next: 'n3' },
            { id: 'laundry', label: 'вопрос про стирку', keys: ['laundry', 'washing machine', 'washer', 'dryer'],
              react: { say: 'Laundry room is in the basement.', mood: 'smile' }, next: 'n3' },
            { id: 'trash', label: 'вопрос про мусор', keys: ['trash', 'garbage', 'recycling'],
              react: { say: 'Trash goes out on Tuesdays.', mood: 'smile' }, next: 'n3' },
            { id: 'none', label: 'вопросов нет', keys: ['no questions', 'all good', 'i am good', 'no thanks', 'nope', 'that is all'],
              react: { say: 'Great. Here are your keys.', mood: 'smile' }, next: 'n3' },
          ],
          samples: ["Where's the laundry room?", "What's the Wi-Fi password?", 'When do I take out the trash?', 'No questions — all good, thanks!'],
          fallbackNext: 'n3' },
      },
      n3: {
        who: 'maggie', say: "Hey, roomie! I'm Maggie. Welcome home!", ru: 'Привет, сосед! Я Мэгги. Добро пожаловать домой!',
        reply: { type: 'choice', options: [
          { tone: 'natural', text: 'Hey, Maggie! So good to meet you in person.',
            react: { say: 'Come here, hug!', mood: 'laugh' },
            coach: 'Тепло и просто — с соседкой именно так.', next: 'n4' },
          { tone: 'formal', text: 'Hello, Maggie. I am pleased to meet you.',
            react: { say: "Wow, so formal! Relax, we're roommates now 😄", mood: 'surprised' },
            coach: '«Pleased to meet you» для соседки звучит холодно — как на собеседовании.', next: 'n4' },
          { tone: 'rude', text: 'Hi. Which room is mine?',
            react: { say: "Uh... okay. It's the one on the left.", mood: 'confused' },
            coach: 'Сразу к делу — и первое впечатление подпорчено. Начни с «Nice to meet you».', next: 'n4' },
        ] },
      },
      n4: {
        who: 'maggie', say: 'Make yourself at home. Do you need anything?', ru: 'Располагайся. Тебе что-нибудь нужно?',
        reply: { type: 'open', prompt: 'Ответь Мэгги своими словами: что тебе сейчас нужно (или ничего)?',
          meanings: [
            { id: 'tired', label: 'устал(а), нужен отдых', keys: ['tired', 'jet lag', 'jet lagged', 'sleep', 'nap', 'exhausted', 'rest', 'shower'],
              react: { say: "Totally get it. Take a nap, we'll talk later.", mood: 'warm' }, next: 'n5' },
            { id: 'hungry', label: 'голоден/голодна', keys: ['hungry', 'starving', 'food', 'eat', 'dinner', 'snack', 'order in'],
              react: { say: "Same! Let's order in.", mood: 'laugh' }, next: 'n5' },
            { id: 'nothing', label: 'ничего не нужно', keys: ['i am good', 'i am fine', 'all good', 'nothing', 'no thanks', 'not right now'],
              react: { say: "Cool. I'm here if you need me.", mood: 'smile' }, next: 'n5' },
          ],
          samples: ["I'm good, thanks!", "Honestly, I'm jet-lagged. I need a nap.", "I'm starving. Wanna order in?", 'Just a shower and some sleep.'],
          fallbackNext: 'n5' },
      },
      n5: {
        who: 'maggie', say: "Oh, one more thing: it's your turn to take out the trash on Tuesday 😄", ru: 'Да, и ещё: во вторник твоя очередь выносить мусор 😄',
        reply: { type: 'choice', options: [
          { tone: 'natural', text: "Ha, deal. I'll take care of it.",
            react: { say: 'I like you already.', mood: 'laugh' },
            coach: '«Deal» + «I\'ll take care of it» — легко и надёжно.', next: 'n6' },
          { tone: 'formal', text: 'I acknowledge my responsibility regarding the trash.',
            react: { say: "You're funny. Okay, robot.", mood: 'laugh' },
            coach: 'Так пишут в договорах, а не говорят на кухне.', next: 'n6' },
          { tone: 'rude', text: 'Seriously? I just got here.',
            react: { say: "Kidding! ...Kind of.", mood: 'confused' },
            coach: 'Мэгги шутила, а ответ получился колючим. Подыграть было бы проще.', next: 'n6' },
        ] },
      },
      n6: { who: 'maggie', say: 'Welcome home, roomie!', ru: 'С новосельем, сосед!', end: true },
    },
  },

  /* ---------------- 4. Кофейня за углом ---------------- */
  {
    id: 'ep4-coffee', title: 'Кофейня за углом', place: 'Бруклин, утро перед первым рабочим днём',
    intro: 'Утро. Кофейня за углом, бариста Джесс — и неожиданная встреча с будущим коллегой.',
    phrases: ['Can I get a coffee?', 'What do you recommend?', 'For here or to go?', 'Are you in line?', 'What do you do?', 'Sounds like a plan'],
    start: 'n1',
    nodes: {
      n1: {
        who: 'jess', say: 'Morning! What can I get you?', ru: 'Доброе утро! Что вам приготовить?',
        reply: { type: 'open', prompt: 'Закажи что-нибудь своими словами — или спроси, что посоветуют.',
          meanings: [
            { id: 'order', label: 'заказ', keys: ['coffee', 'latte', 'cappuccino', 'americano', 'espresso', 'cold brew', 'tea', 'can i get', 'i will have', 'i will get'],
              react: { say: 'Great choice!', mood: 'smile' }, next: 'n2' },
            { id: 'recommend', label: 'просьба посоветовать', keys: ['what do you recommend', 'recommend', 'what is good', 'what is popular'],
              react: { say: 'Our oat latte is kind of famous around here. Want one?', mood: 'laugh' }, next: 'n2' },
          ],
          samples: ['Can I get a coffee?', 'Can I get a large iced latte with oat milk?', 'What do you recommend?', 'Just a black coffee, please.'],
          fallbackNext: 'n2' },
      },
      n2: {
        who: 'jess', say: 'For here or to go?', ru: 'Здесь или с собой?',
        reply: { type: 'choice', options: [
          { tone: 'natural', text: 'To go, please.',
            react: { say: 'Coming right up!', mood: 'smile' },
            coach: 'Ровно так и отвечают: «To go» или «For here».', next: 'n3' },
          { tone: 'formal', text: 'I would prefer to consume it outside of this establishment.',
            react: { say: 'Ha! So... to go?', mood: 'laugh' },
            coach: '«Consume» и «establishment» — язык инструкций. В кофейне: «To go, please».', next: 'n3' },
          { tone: 'rude', text: 'Whatever. Just make it.',
            react: { say: '...Okay. One coffee.', mood: 'frown' },
            coach: 'Бариста не виновата, что утро. Одно «please» меняет всё.', next: 'n3' },
        ] },
      },
      n3: {
        who: 'tony', say: 'Hey — sorry, are you in line?', ru: 'Привет — извини, ты в очереди?',
        reply: { type: 'choice', options: [
          { tone: 'natural', text: 'No, go ahead!',
            react: { say: 'Thanks! Hey, wait... are you the new hire at Brightline?', mood: 'surprised' },
            coach: '«Go ahead» — «проходи», самый естественный ответ.', next: 'n4' },
          { tone: 'formal', text: 'Negative. You may proceed.',
            react: { say: 'Ha! Okay, captain. Hey... are you the new hire at Brightline?', mood: 'laugh' },
            coach: '«Negative, proceed» — рация военных. Просто: «No, go ahead».', next: 'n4' },
          { tone: 'rude', text: 'Yes. Back off.',
            react: { say: 'Whoa, okay. Sorry!', mood: 'frown' },
            coach: '«Back off» — «отвали». Слишком резко для очереди за кофе.', next: 'n3b' },
        ] },
      },
      n3b: { who: 'tony', say: 'No rush. Hey... are you the new hire at Brightline?', next: 'n4' },
      n4: {
        who: 'tony', say: "I'm Tony, I'm on your team! So, what do you do?", ru: 'Я Тони, мы в одной команде! А ты чем занимаешься?',
        reply: { type: 'open', prompt: 'Расскажи Тони своими словами, кем работаешь.',
          meanings: [
            { id: 'job', label: 'рассказ о работе', keys: ['i am in', 'i work in', 'i work as', 'i am a', 'i am an', 'developer', 'designer', 'marketing', 'sales', 'engineer', 'manager', 'analyst', 'i do'],
              react: { say: "Awesome, we're gonna work together a lot.", mood: 'laugh' }, next: 'n5' },
          ],
          samples: ["I'm in sales.", "I'm a designer — I'm on your team!", 'I work in marketing.', "I'm the new developer. I start Monday."],
          fallbackNext: 'n5' },
      },
      n5: {
        who: 'tony', say: "Wanna grab lunch on Monday? I'll show you around.", ru: 'Пообедаем в понедельник? Покажу тебе всё вокруг.',
        reply: { type: 'choice', options: [
          { tone: 'natural', text: "I'm down! Sounds like a plan.",
            react: { say: 'Sweet! See you Monday.', mood: 'laugh' },
            coach: '«I\'m down» + «Sounds like a plan» — живое американское «давай!».', next: 'n6' },
          { tone: 'formal', text: 'I would be delighted to accept your kind invitation.',
            react: { say: 'Ha, okay, fancy! See you Monday.', mood: 'surprised' },
            coach: 'Так отвечают на приглашение на свадьбу. Коллеге: «Sounds good!»', next: 'n6' },
          { tone: 'rude', text: "Maybe. I don't even know you.",
            react: { say: 'Fair enough... The offer stands!', mood: 'confused' },
            coach: 'Честно, но холодно. В новой команде такие приглашения — лучший шанс подружиться.', next: 'n6' },
        ] },
      },
      n6: { who: 'jess', say: 'One coffee to go! Have a great first day!', ru: 'Кофе с собой! Удачного первого дня!', end: true },
    },
  },
];

if (typeof window !== 'undefined') { window.SCENE_CAST = SCENE_CAST; window.SCENE_EPISODES = SCENE_EPISODES; }
if (typeof globalThis !== 'undefined') { globalThis.SCENE_CAST = SCENE_CAST; globalThis.SCENE_EPISODES = SCENE_EPISODES; }
