/* ==========================================================================
   English Reboot — раздел «Слова»: базовый американский словарь по подуровням
   Файл: content_words.js — WORD_CARDS. Пакет A1, часть 1: 200 слов в 12 темах.
   Строка данных: [слово, часть речи, перевод, пример 1, перевод 1, пример 2, перевод 2, тема, подуровень?]
   В примерах {слово} — целевая форма для теста «вставь слово» (в карточку не попадает).
   Примеры — свои, в духе сериала: герои истории «Переезд в Нью-Йорк» (Мэгги, Тони, Джесс,
   Рэй, Сэм, Прия, Ким, Луис, мисс Гарсия). Реплики ученика в переводах — без рода.
   Тесты (5 на карточку) собираются автоматически: значение, перевод на английский,
   два «вставь слово» по примерам и перевод примера. IPA и русскую транскрипцию
   словам примеров дописывает lex_us.js (CMU, американское произношение).
   Подуровень (A1, A1+, …, B2+) — в поле sublevel; поле level — базовый уровень A1–B2.
   ========================================================================== */
(() => {
  'use strict';

  const DATA = [
    /* ---------- Еда и напитки ---------- */
    ['water', 'сущ.', 'вода', 'Can I get some {water}?', 'Можно мне воды?', 'Jess drinks {water} all day.', 'Джесс весь день пьёт воду.', 'Еда и напитки'],
    ['coffee', 'сущ.', 'кофе', '{Coffee} first, then work.', 'Сначала кофе, потом работа.', 'Ray makes bad {coffee}.', 'Рэй варит плохой кофе.', 'Еда и напитки'],
    ['tea', 'сущ.', 'чай', 'Maggie wants hot {tea}.', 'Мэгги хочет горячего чая.', 'Is this green {tea}?', 'Это зелёный чай?', 'Еда и напитки'],
    ['milk', 'сущ.', 'молоко', 'We need {milk} again.', 'Нам снова нужно молоко.', 'No {milk} for me, thanks.', 'Мне без молока, спасибо.', 'Еда и напитки'],
    ['juice', 'сущ.', 'сок', 'Tony loves orange {juice}.', 'Тони обожает апельсиновый сок.', 'The {juice} is in the fridge.', 'Сок в холодильнике.', 'Еда и напитки'],
    ['bread', 'сущ.', 'хлеб', 'This {bread} is still warm.', 'Этот хлеб ещё тёплый.', 'Get some {bread}, okay?', 'Купи хлеба, ладно?', 'Еда и напитки'],
    ['egg', 'сущ.', 'яйцо', 'Two {eggs}, please.', 'Два яйца, пожалуйста.', 'Sam can\'t even cook an {egg}.', 'Сэм даже яйцо приготовить не может.', 'Еда и напитки'],
    ['apple', 'сущ.', 'яблоко', 'Want an {apple}?', 'Хочешь яблоко?', 'This {apple} is so sweet.', 'Это яблоко такое сладкое.', 'Еда и напитки'],
    ['cheese', 'сущ.', 'сыр', 'Extra {cheese}, please!', 'Побольше сыра, пожалуйста!', 'Maggie puts {cheese} on everything.', 'Мэгги кладёт сыр на всё.', 'Еда и напитки'],
    ['chicken', 'сущ.', 'курица', 'I\'ll get the {chicken}.', 'Я возьму курицу.', 'The {chicken} smells great.', 'Курица отлично пахнет.', 'Еда и напитки'],
    ['rice', 'сущ.', 'рис', 'Chicken and {rice}, please.', 'Курицу с рисом, пожалуйста.', 'Is the {rice} ready?', 'Рис готов?', 'Еда и напитки'],
    ['soup', 'сущ.', 'суп', 'This {soup} is too hot.', 'Этот суп слишком горячий.', 'Kim brings Jess some {soup}.', 'Ким приносит Джесс суп.', 'Еда и напитки'],
    ['pizza', 'сущ.', 'пицца', '{Pizza} night at our place!', 'Вечер пиццы у нас!', 'Tony orders {pizza} again.', 'Тони снова заказывает пиццу.', 'Еда и напитки'],
    ['sandwich', 'сущ.', 'сэндвич', 'A turkey {sandwich}, please.', 'Сэндвич с индейкой, пожалуйста.', 'Luis eats a {sandwich} at noon.', 'Луис ест сэндвич в полдень.', 'Еда и напитки'],
    ['cookie', 'сущ.', 'печенье', 'One {cookie}? Okay, two.', 'Одно печенье? Ладно, два.', 'Jess bakes {cookies} on Sundays.', 'Джесс по воскресеньям печёт печенье.', 'Еда и напитки'],
    ['breakfast', 'сущ.', 'завтрак', '{Breakfast} is ready!', 'Завтрак готов!', 'Tony skips {breakfast} again.', 'Тони опять пропускает завтрак.', 'Еда и напитки'],
    ['lunch', 'сущ.', 'обед', 'Want to get {lunch}?', 'Пойдём пообедаем?', '{Lunch} is on me today.', 'Обед сегодня за мой счёт.', 'Еда и напитки'],
    ['dinner', 'сущ.', 'ужин', '{Dinner} at seven?', 'Ужин в семь?', 'Maggie cooks {dinner} tonight.', 'Сегодня ужин готовит Мэгги.', 'Еда и напитки'],

    /* ---------- Люди и семья ---------- */
    ['mom', 'сущ.', 'мама', 'My {mom} calls every day.', 'Мама звонит мне каждый день.', 'Say hi to your {mom}!', 'Передавай привет маме!', 'Люди и семья'],
    ['dad', 'сущ.', 'папа', 'My {dad} loves baseball.', 'Мой папа обожает бейсбол.', 'Tony looks like his {dad}.', 'Тони похож на своего папу.', 'Люди и семья'],
    ['brother', 'сущ.', 'брат', 'This is my {brother}, Ben.', 'Это мой брат Бен.', 'Sam has two {brothers}.', 'У Сэма два брата.', 'Люди и семья'],
    ['sister', 'сущ.', 'сестра', 'My {sister} lives in Ohio.', 'Моя сестра живёт в Огайо.', 'Is that your {sister}?', 'Это твоя сестра?', 'Люди и семья'],
    ['family', 'сущ.', 'семья', 'My {family} is big.', 'У меня большая семья.', 'Jess misses her {family}.', 'Джесс скучает по семье.', 'Люди и семья'],
    ['friend', 'сущ.', 'друг, подруга', 'Maggie is my {friend}.', 'Мэгги — моя подруга.', 'Sam is a good {friend}.', 'Сэм — хороший друг.', 'Люди и семья'],
    ['kid', 'сущ.', 'ребёнок (разг.)', 'The {kids} are asleep.', 'Дети спят.', 'Luis has three {kids}.', 'У Луиса трое детей.', 'Люди и семья'],
    ['baby', 'сущ.', 'малыш', 'The {baby} is so cute!', 'Малыш такой милый!', 'Priya has a new {baby}.', 'У Прии недавно родился малыш.', 'Люди и семья'],
    ['guy', 'сущ.', 'парень (разг.)', 'Who\'s that {guy}?', 'Кто этот парень?', 'Ray is a nice {guy}.', 'Рэй — славный парень.', 'Люди и семья'],
    ['people', 'сущ.', 'люди', 'So many {people} here!', 'Здесь столько людей!', '{People} in New York walk fast.', 'В Нью-Йорке люди ходят быстро.', 'Люди и семья'],
    ['name', 'сущ.', 'имя', 'My {name} is Alex.', 'Меня зовут Алекс.', 'What\'s his {name}?', 'Как его зовут?', 'Люди и семья'],
    ['boss', 'сущ.', 'начальник', 'Priya is my {boss}.', 'Прия — моя начальница.', 'The {boss} is in a meeting.', 'Начальник на совещании.', 'Люди и семья'],
    ['roommate', 'сущ.', 'сосед по квартире', 'My {roommate} is Maggie.', 'Мы с Мэгги снимаем квартиру вместе.', 'Is your {roommate} home?', 'Твой сосед дома?', 'Люди и семья'],
    ['neighbor', 'сущ.', 'сосед (амер. написание)', 'Our {neighbor} has a dog.', 'У нашего соседа есть собака.', 'Say hi to the {neighbors}.', 'Поздоровайся с соседями.', 'Люди и семья'],
    ['husband', 'сущ.', 'муж', 'Ms. Garcia\'s {husband} is a chef.', 'Муж мисс Гарсии — повар.', 'Her {husband} works at night.', 'Её муж работает по ночам.', 'Люди и семья'],
    ['wife', 'сущ.', 'жена', 'Luis and his {wife} have a store.', 'У Луиса и его жены есть магазин.', 'His {wife} is a doctor.', 'Его жена — врач.', 'Люди и семья'],

    /* ---------- Дом ---------- */
    ['home', 'сущ., нареч.', 'дом; домой', 'I\'m {home}!', 'Я дома!', 'Let\'s go {home}.', 'Пойдём домой.', 'Дом'],
    ['apartment', 'сущ.', 'квартира (амер.)', 'Our {apartment} is small.', 'Наша квартира маленькая.', 'The {apartment} has two rooms.', 'В квартире две комнаты.', 'Дом'],
    ['room', 'сущ.', 'комната', 'This is my {room}.', 'Это моя комната.', 'Maggie\'s {room} is a mess.', 'В комнате Мэгги бардак.', 'Дом'],
    ['kitchen', 'сущ.', 'кухня', 'Coffee\'s in the {kitchen}.', 'Кофе на кухне.', 'Tony cleans the {kitchen}.', 'Тони убирает кухню.', 'Дом'],
    ['bathroom', 'сущ.', 'ванная, туалет', 'Is the {bathroom} free?', 'Ванная свободна?', 'The {bathroom} light is broken.', 'В ванной не работает свет.', 'Дом'],
    ['bed', 'сущ.', 'кровать', 'Time for {bed}!', 'Пора спать!', 'My {bed} is too small.', 'Моя кровать слишком маленькая.', 'Дом'],
    ['door', 'сущ.', 'дверь', 'Close the {door}, please.', 'Закрой дверь, пожалуйста.', 'Someone\'s at the {door}!', 'Кто-то у двери!', 'Дом'],
    ['window', 'сущ.', 'окно', 'Open the {window}.', 'Открой окно.', 'Great view from this {window}!', 'Из этого окна отличный вид!', 'Дом'],
    ['table', 'сущ.', 'стол', 'Dinner\'s on the {table}.', 'Ужин на столе.', 'A {table} for two?', 'Столик на двоих?', 'Дом'],
    ['chair', 'сущ.', 'стул', 'Take a {chair}.', 'Бери стул.', 'This {chair} is broken.', 'Этот стул сломан.', 'Дом'],
    ['couch', 'сущ.', 'диван', 'Sam sleeps on the {couch}.', 'Сэм спит на диване.', 'Nice new {couch}!', 'Классный новый диван!', 'Дом'],
    ['key', 'сущ.', 'ключ', 'Where\'s my {key}?', 'Где мой ключ?', 'Maggie has a {key} too.', 'У Мэгги тоже есть ключ.', 'Дом'],
    ['light', 'сущ.', 'свет', 'Turn off the {light}.', 'Выключи свет.', 'The kitchen {light} is on.', 'На кухне горит свет.', 'Дом'],
    ['floor', 'сущ.', 'пол; этаж', 'We live on the third {floor}.', 'Мы живём на третьем этаже.', 'Your bag is on the {floor}.', 'Твоя сумка на полу.', 'Дом'],
    ['elevator', 'сущ.', 'лифт (амер.)', 'The {elevator} is broken again.', 'Лифт опять сломан.', 'Take the {elevator} to five.', 'Поднимись на лифте на пятый.', 'Дом'],

    /* ---------- Город и транспорт ---------- */
    ['street', 'сущ.', 'улица', 'This {street} is so loud.', 'На этой улице так шумно.', 'Cross the {street} here.', 'Переходи улицу здесь.', 'Город и транспорт'],
    ['store', 'сущ.', 'магазин (амер.)', 'The {store} closes at nine.', 'Магазин закрывается в девять.', 'Luis works at a {store}.', 'Луис работает в магазине.', 'Город и транспорт'],
    ['bank', 'сущ.', 'банк', 'Is the {bank} open?', 'Банк открыт?', 'Ms. Garcia works at the {bank}.', 'Мисс Гарсия работает в банке.', 'Город и транспорт'],
    ['park', 'сущ.', 'парк', 'Let\'s walk in the {park}.', 'Давай погуляем в парке.', 'The {park} is near our place.', 'Парк рядом с нами.', 'Город и транспорт'],
    ['subway', 'сущ.', 'метро (амер.)', 'Take the {subway}. It\'s fast.', 'Езжай на метро. Это быстро.', 'The {subway} is so crowded.', 'В метро такая давка.', 'Город и транспорт'],
    ['bus', 'сущ.', 'автобус', 'The {bus} is late.', 'Автобус опаздывает.', 'Is this your {bus}?', 'Это твой автобус?', 'Город и транспорт'],
    ['train', 'сущ.', 'поезд', 'My {train} leaves at six.', 'Мой поезд уходит в шесть.', 'The {train} to Boston is full.', 'Поезд в Бостон полный.', 'Город и транспорт'],
    ['taxi', 'сущ.', 'такси', 'Ray drives a {taxi}.', 'Рэй водит такси.', 'Let\'s get a {taxi}.', 'Давай поймаем такси.', 'Город и транспорт'],
    ['car', 'сущ.', 'машина', 'Nice {car}!', 'Классная машина!', 'Tony has an old {car}.', 'У Тони старая машина.', 'Город и транспорт'],
    ['bike', 'сущ.', 'велосипед', 'Jess rides her {bike} to work.', 'Джесс ездит на работу на велосипеде.', 'Where\'s my {bike}?', 'Где мой велосипед?', 'Город и транспорт'],
    ['airport', 'сущ.', 'аэропорт', 'The {airport} is so big!', 'Аэропорт такой огромный!', 'Ray drives to the {airport}.', 'Рэй едет в аэропорт.', 'Город и транспорт'],
    ['ticket', 'сущ.', 'билет', 'Do you have your {ticket}?', 'У тебя есть билет?', 'Two {tickets} for the movie, please.', 'Два билета на фильм, пожалуйста.', 'Город и транспорт'],
    ['map', 'сущ.', 'карта (схема)', 'Check the {map}.', 'Посмотри на карте.', 'This {map} is old.', 'Эта карта старая.', 'Город и транспорт'],
    ['corner', 'сущ.', 'угол', 'The store is on the {corner}.', 'Магазин на углу.', 'Meet me at the {corner}.', 'Встретимся на углу.', 'Город и транспорт'],
    ['block', 'сущ.', 'квартал (амер.)', 'It\'s two {blocks} from here.', 'Это в двух кварталах отсюда.', 'Walk one {block} and turn left.', 'Пройди квартал и поверни налево.', 'Город и транспорт'],
    ['downtown', 'нареч., сущ.', 'в центр, центр города (амер.)', 'Let\'s go {downtown}.', 'Поехали в центр.', 'Priya works {downtown}.', 'Прия работает в центре.', 'Город и транспорт'],
    ['sidewalk', 'сущ.', 'тротуар (амер.)', 'Stay on the {sidewalk}!', 'Иди по тротуару!', 'The {sidewalk} is wet.', 'Тротуар мокрый.', 'Город и транспорт'],

    /* ---------- Время ---------- */
    ['time', 'сущ.', 'время', 'What {time} is it?', 'Который час?', 'No {time} for breakfast!', 'Нет времени на завтрак!', 'Время'],
    ['day', 'сущ.', 'день', 'Have a nice {day}!', 'Хорошего дня!', 'What a long {day}!', 'Какой длинный день!', 'Время'],
    ['night', 'сущ.', 'ночь, вечер', 'Good {night}, Maggie!', 'Спокойной ночи, Мэгги!', 'Ray drives at {night}.', 'Рэй ездит по ночам.', 'Время'],
    ['morning', 'сущ.', 'утро', 'Good {morning}!', 'Доброе утро!', 'Jess runs every {morning}.', 'Джесс бегает каждое утро.', 'Время'],
    ['evening', 'сущ.', 'вечер', 'See you this {evening}.', 'Увидимся вечером.', 'It\'s a nice {evening}.', 'Хороший вечер.', 'Время'],
    ['week', 'сущ.', 'неделя', 'See you next {week}!', 'Увидимся на следующей неделе!', 'What a {week}!', 'Ну и неделька!', 'Время'],
    ['weekend', 'сущ.', 'выходные', 'Any plans for the {weekend}?', 'Есть планы на выходные?', 'Sam sleeps all {weekend}.', 'Сэм спит все выходные.', 'Время'],
    ['today', 'нареч.', 'сегодня', '{Today} is my first day.', 'Сегодня мой первый день.', 'Is the bank open {today}?', 'Банк сегодня работает?', 'Время'],
    ['tomorrow', 'нареч.', 'завтра', 'See you {tomorrow}!', 'До завтра!', 'Jess has a test {tomorrow}.', 'У Джесс завтра тест.', 'Время'],
    ['yesterday', 'нареч.', 'вчера', 'Tony was late {yesterday}.', 'Тони вчера опоздал.', 'It rained all day {yesterday}.', 'Вчера весь день шёл дождь.', 'Время'],
    ['now', 'нареч.', 'сейчас', 'Come here {now}!', 'Иди сюда сейчас же!', 'Maggie is busy right {now}.', 'Мэгги сейчас занята.', 'Время'],
    ['later', 'нареч.', 'позже', 'Talk to you {later}!', 'Поговорим позже!', 'Call me {later}, okay?', 'Позвони мне позже, ладно?', 'Время'],
    ['early', 'нареч., прил.', 'рано; ранний', 'Ray gets up {early}.', 'Рэй встаёт рано.', 'It\'s too {early}!', 'Слишком рано!', 'Время'],
    ['late', 'нареч., прил.', 'поздно; опаздывающий', 'Sorry, the train is {late}.', 'Извини, поезд опаздывает.', 'It\'s {late}. Go to bed.', 'Уже поздно. Иди спать.', 'Время'],
    ['minute', 'сущ.', 'минута', 'Give me a {minute}.', 'Дай мне минутку.', 'The bus comes in five {minutes}.', 'Автобус придёт через пять минут.', 'Время'],
    ['hour', 'сущ.', 'час', 'The movie is two {hours} long.', 'Фильм идёт два часа.', 'See you in an {hour}.', 'Увидимся через час.', 'Время'],
    ['Monday', 'сущ.', 'понедельник', 'See you on {Monday}.', 'Увидимся в понедельник.', 'Ugh, {Monday} again.', 'Опять понедельник.', 'Время'],

    /* ---------- Числа и деньги ---------- */
    ['one', 'числ.', 'один', 'Just {one} coffee, please.', 'Только один кофе, пожалуйста.', '{One} ticket to Boston.', 'Один билет до Бостона.', 'Числа и деньги'],
    ['two', 'числ.', 'два', 'A table for {two}.', 'Столик на двоих.', '{Two} coffees to go.', 'Два кофе с собой.', 'Числа и деньги'],
    ['three', 'числ.', 'три', 'Sam has {three} cats.', 'У Сэма три кошки.', 'Give me {three} minutes.', 'Дай мне три минуты.', 'Числа и деньги'],
    ['five', 'числ.', 'пять', 'It\'s {five} dollars.', 'Это пять долларов.', 'See you at {five}.', 'Увидимся в пять.', 'Числа и деньги'],
    ['ten', 'числ.', 'десять', 'The store opens at {ten}.', 'Магазин открывается в десять.', '{Ten} more minutes!', 'Ещё десять минут!', 'Числа и деньги'],
    ['twenty', 'числ.', 'двадцать', 'That\'s {twenty} bucks.', 'Это двадцать баксов.', 'Jess is {twenty} today.', 'Джесс сегодня двадцать лет.', 'Числа и деньги'],
    ['hundred', 'числ.', 'сто', 'A {hundred} dollars? No way!', 'Сто долларов? Ни за что!', 'There are a {hundred} people here.', 'Здесь сто человек.', 'Числа и деньги'],
    ['money', 'сущ.', 'деньги', 'Tony has no {money} again.', 'У Тони опять нет денег.', 'Save your {money}!', 'Береги деньги!', 'Числа и деньги'],
    ['dollar', 'сущ.', 'доллар', 'It\'s one {dollar}.', 'Это стоит один доллар.', 'Can I borrow ten {dollars}?', 'Можно одолжить десять долларов?', 'Числа и деньги'],
    ['cash', 'сущ.', 'наличные', '{Cash} or card?', 'Наличными или картой?', 'Luis only takes {cash}.', 'Луис берёт только наличные.', 'Числа и деньги'],
    ['card', 'сущ.', 'карта (банковская)', 'Can I pay by {card}?', 'Можно оплатить картой?', 'My {card} doesn\'t work.', 'Моя карта не работает.', 'Числа и деньги'],
    ['price', 'сущ.', 'цена', 'What\'s the {price}?', 'Какая цена?', 'The {price} is too high.', 'Цена слишком высокая.', 'Числа и деньги'],
    ['change', 'сущ.', 'сдача', 'Here\'s your {change}.', 'Вот ваша сдача.', 'Keep the {change}.', 'Сдачи не надо.', 'Числа и деньги'],
    ['tip', 'сущ.', 'чаевые', 'Leave a {tip}, please.', 'Оставь чаевые, пожалуйста.', 'Ray gets a big {tip}.', 'Рэй получает большие чаевые.', 'Числа и деньги'],
    ['cheap', 'прил.', 'дешёвый', 'This place is {cheap}.', 'Здесь дёшево.', 'The bus is {cheap}.', 'Автобус дешёвый.', 'Числа и деньги'],
    ['expensive', 'прил.', 'дорогой', 'New York is so {expensive}!', 'Нью-Йорк такой дорогой!', 'This jacket is too {expensive}.', 'Эта куртка слишком дорогая.', 'Числа и деньги'],

    /* ---------- Тело и здоровье ---------- */
    ['head', 'сущ.', 'голова', 'My {head} hurts.', 'У меня болит голова.', 'Tony shakes his {head}.', 'Тони качает головой.', 'Тело и здоровье'],
    ['hand', 'сущ.', 'рука (кисть)', 'Wash your {hands}!', 'Помой руки!', 'Give me your {hand}.', 'Дай мне руку.', 'Тело и здоровье'],
    ['eye', 'сущ.', 'глаз', 'Close your {eyes}.', 'Закрой глаза.', 'Maggie has blue {eyes}.', 'У Мэгги голубые глаза.', 'Тело и здоровье'],
    ['foot', 'сущ.', 'ступня, нога', 'Ouch, my {foot}!', 'Ой, моя нога!', 'Jess hurt her {foot}.', 'Джесс повредила ногу.', 'Тело и здоровье'],
    ['back', 'сущ.', 'спина', 'Sam\'s {back} hurts.', 'У Сэма болит спина.', 'Sit up and straighten your {back}.', 'Сядь ровно и выпрями спину.', 'Тело и здоровье'],
    ['tooth', 'сущ.', 'зуб', 'Ray has a bad {tooth}.', 'У Рэя болит зуб.', 'Brush your {teeth}!', 'Почисти зубы!', 'Тело и здоровье'],
    ['doctor', 'сущ.', 'врач', 'You need a {doctor}.', 'Тебе нужен врач.', 'The {doctor} can see you now.', 'Врач готов вас принять.', 'Тело и здоровье'],
    ['medicine', 'сущ.', 'лекарство', 'Take your {medicine}.', 'Прими лекарство.', 'Kim gives Jess some {medicine}.', 'Ким даёт Джесс лекарство.', 'Тело и здоровье'],
    ['sick', 'прил.', 'больной', 'Jess is {sick} today.', 'Джесс сегодня болеет.', 'Tony feels {sick}.', 'Тони плохо себя чувствует.', 'Тело и здоровье'],
    ['tired', 'прил.', 'уставший', 'Maggie is so {tired}.', 'Мэгги так устала.', 'Sam looks {tired}.', 'Сэм выглядит уставшим.', 'Тело и здоровье'],
    ['hurt', 'глаг.', 'болеть; ушибить', 'Does it {hurt}?', 'Болит?', 'My eyes {hurt}.', 'У меня болят глаза.', 'Тело и здоровье'],
    ['sleep', 'глаг., сущ.', 'спать; сон', 'Go to {sleep}!', 'Иди спать!', 'Tony can\'t {sleep}.', 'Тони не может уснуть.', 'Тело и здоровье'],
    ['cold', 'прил., сущ.', 'холодный; простуда', 'It\'s {cold} outside.', 'На улице холодно.', 'Jess has a {cold}.', 'У Джесс простуда.', 'Тело и здоровье'],
    ['hot', 'прил.', 'горячий; жаркий', 'Careful, it\'s {hot}!', 'Осторожно, горячо!', 'It\'s so {hot} today.', 'Сегодня так жарко.', 'Тело и здоровье'],
    ['rest', 'сущ., глаг.', 'отдых; отдыхать', 'You need some {rest}.', 'Тебе нужно отдохнуть.', '{Rest} today, okay?', 'Сегодня отдыхай, хорошо?', 'Тело и здоровье'],

    /* ---------- Одежда и цвета ---------- */
    ['shirt', 'сущ.', 'рубашка, футболка', 'Nice {shirt}!', 'Классная рубашка!', 'Tony needs a clean {shirt}.', 'Тони нужна чистая рубашка.', 'Одежда и цвета'],
    ['pants', 'сущ.', 'брюки (амер.)', 'These {pants} are too long.', 'Эти брюки слишком длинные.', 'Sam wears black {pants}.', 'Сэм носит чёрные брюки.', 'Одежда и цвета'],
    ['shoes', 'сущ.', 'обувь, туфли', 'Take off your {shoes}, please.', 'Сними обувь, пожалуйста.', 'Jess has new {shoes}.', 'У Джесс новые туфли.', 'Одежда и цвета'],
    ['sneakers', 'сущ.', 'кроссовки (амер.)', 'Wear your {sneakers}. We\'re walking.', 'Надень кроссовки. Мы идём пешком.', 'Ray loves white {sneakers}.', 'Рэй обожает белые кроссовки.', 'Одежда и цвета'],
    ['jacket', 'сущ.', 'куртка', 'Take a {jacket}. It\'s cold.', 'Возьми куртку. Холодно.', 'Is this your {jacket}?', 'Это твоя куртка?', 'Одежда и цвета'],
    ['hat', 'сущ.', 'шапка, шляпа', 'Cool {hat}!', 'Классная шапка!', 'Maggie forgets her {hat} again.', 'Мэгги снова забывает шапку.', 'Одежда и цвета'],
    ['bag', 'сущ.', 'сумка', 'My {bag} is so heavy.', 'Моя сумка такая тяжёлая.', 'Put your {bag} here.', 'Положи сумку сюда.', 'Одежда и цвета'],
    ['dress', 'сущ.', 'платье', 'What a pretty {dress}!', 'Какое красивое платье!', 'Priya wears a red {dress}.', 'Прия в красном платье.', 'Одежда и цвета'],
    ['socks', 'сущ.', 'носки', 'Where are my {socks}?', 'Где мои носки?', 'Sam wears funny {socks}.', 'Сэм носит смешные носки.', 'Одежда и цвета'],
    ['red', 'прил.', 'красный', 'The {red} one, please.', 'Красный, пожалуйста.', 'Stop at the {red} light.', 'Остановись на красный свет.', 'Одежда и цвета'],
    ['blue', 'прил.', 'синий, голубой', 'Tony\'s car is {blue}.', 'Машина Тони синяя.', 'I love this {blue} jacket.', 'Мне очень нравится эта синяя куртка.', 'Одежда и цвета'],
    ['green', 'прил.', 'зелёный', 'Go! The light is {green}.', 'Иди! Зелёный свет.', 'Maggie drinks {green} tea.', 'Мэгги пьёт зелёный чай.', 'Одежда и цвета'],
    ['black', 'прил.', 'чёрный', 'Just {black} coffee, please.', 'Просто чёрный кофе, пожалуйста.', 'The cat is {black}.', 'Кошка чёрная.', 'Одежда и цвета'],
    ['white', 'прил.', 'белый', 'The walls are {white}.', 'Стены белые.', 'Jess wants {white} sneakers.', 'Джесс хочет белые кроссовки.', 'Одежда и цвета'],
    ['gray', 'прил.', 'серый (амер. написание)', 'It\'s a {gray} day.', 'Сегодня пасмурно.', 'Luis has a {gray} cat.', 'У Луиса серая кошка.', 'Одежда и цвета'],
    ['color', 'сущ.', 'цвет (амер. написание)', 'What {color} is it?', 'Какого это цвета?', 'Blue is my favorite {color}.', 'Синий — мой любимый цвет.', 'Одежда и цвета'],

    /* ---------- Работа и учёба ---------- */
    ['job', 'сущ.', 'работа (должность)', 'I have a new {job}!', 'У меня новая работа!', 'Ray likes his {job}.', 'Рэю нравится его работа.', 'Работа и учёба'],
    ['work', 'сущ., глаг.', 'работа; работать', 'See you at {work}.', 'Увидимся на работе.', 'Priya {works} a lot.', 'Прия много работает.', 'Работа и учёба'],
    ['office', 'сущ.', 'офис', 'The {office} is on the tenth floor.', 'Офис на десятом этаже.', 'Is Priya in the {office}?', 'Прия в офисе?', 'Работа и учёба'],
    ['meeting', 'сущ.', 'встреча, совещание', 'The {meeting} starts at ten.', 'Совещание начинается в десять.', 'Sorry, I\'m in a {meeting}.', 'Извините, у меня совещание.', 'Работа и учёба'],
    ['email', 'сущ.', 'письмо, имейл', 'Check your {email}.', 'Проверь почту.', 'Priya sends a long {email}.', 'Прия отправляет длинное письмо.', 'Работа и учёба'],
    ['computer', 'сущ.', 'компьютер', 'My {computer} is so slow.', 'Мой компьютер такой медленный.', 'Turn on the {computer}.', 'Включи компьютер.', 'Работа и учёба'],
    ['class', 'сущ.', 'занятие, урок', 'My English {class} is at six.', 'Моё занятие по английскому в шесть.', 'Jess has {class} today.', 'У Джесс сегодня занятия.', 'Работа и учёба'],
    ['teacher', 'сущ.', 'учитель', 'Our {teacher} is from Texas.', 'Наш учитель из Техаса.', 'The {teacher} is really nice.', 'Учитель очень хороший.', 'Работа и учёба'],
    ['student', 'сущ.', 'студент, ученик', 'Jess is a {student}.', 'Джесс студентка.', 'The {students} are here.', 'Ученики пришли.', 'Работа и учёба'],
    ['book', 'сущ.', 'книга', 'Good {book}?', 'Хорошая книга?', 'Maggie reads a {book} on the subway.', 'Мэгги читает книгу в метро.', 'Работа и учёба'],
    ['pen', 'сущ.', 'ручка', 'Can I borrow a {pen}?', 'Можно одолжить ручку?', 'This {pen} doesn\'t work.', 'Эта ручка не пишет.', 'Работа и учёба'],
    ['homework', 'сущ.', 'домашнее задание', 'Do your {homework}!', 'Сделай домашнее задание!', 'So much {homework} today!', 'Сегодня столько домашки!', 'Работа и учёба'],
    ['test', 'сущ.', 'тест, контрольная', 'The {test} is tomorrow.', 'Контрольная завтра.', 'Good luck on your {test}!', 'Удачи на тесте!', 'Работа и учёба'],
    ['question', 'сущ.', 'вопрос', 'Can I ask a {question}?', 'Можно задать вопрос?', 'Good {question}!', 'Хороший вопрос!', 'Работа и учёба'],
    ['answer', 'сущ., глаг.', 'ответ; отвечать', 'What\'s the {answer}?', 'Какой ответ?', 'Please {answer} the phone.', 'Пожалуйста, ответь на звонок.', 'Работа и учёба'],
    ['idea', 'сущ.', 'идея', 'Great {idea}!', 'Отличная идея!', 'Any {ideas} for dinner?', 'Есть идеи на ужин?', 'Работа и учёба'],

    /* ---------- Действия ---------- */
    ['go', 'глаг.', 'идти, ехать', 'Let\'s {go}!', 'Пошли!', 'Where do you {go} on weekends?', 'Куда ты ходишь по выходным?', 'Действия'],
    ['come', 'глаг.', 'приходить', '{Come} in!', 'Заходи!', 'Can you {come} to dinner?', 'Сможешь прийти на ужин?', 'Действия'],
    ['want', 'глаг.', 'хотеть', 'Do you {want} some tea?', 'Хочешь чаю?', 'Tony {wants} a new car.', 'Тони хочет новую машину.', 'Действия'],
    ['need', 'глаг.', 'нуждаться, нужно', 'I {need} coffee.', 'Мне нужен кофе.', 'Do we {need} milk?', 'Нам нужно молоко?', 'Действия'],
    ['like', 'глаг.', 'нравиться', 'I {like} your shoes!', 'Мне нравятся твои туфли!', 'Do you {like} pizza?', 'Ты любишь пиццу?', 'Действия'],
    ['love', 'глаг.', 'любить, обожать', 'I {love} this song!', 'Обожаю эту песню!', 'Maggie {loves} New York.', 'Мэгги обожает Нью-Йорк.', 'Действия'],
    ['eat', 'глаг.', 'есть, кушать', 'Let\'s {eat}!', 'Давай есть!', 'What do you {eat} for lunch?', 'Что ты ешь на обед?', 'Действия'],
    ['drink', 'глаг.', 'пить', 'What do you want to {drink}?', 'Что будешь пить?', 'Don\'t {drink} that, it\'s old!', 'Не пей это, оно старое!', 'Действия'],
    ['buy', 'глаг.', 'покупать', 'Let\'s {buy} some bread.', 'Давай купим хлеба.', 'Tony {buys} coffee every day.', 'Тони каждый день покупает кофе.', 'Действия'],
    ['pay', 'глаг.', 'платить', 'Who {pays} today?', 'Кто сегодня платит?', 'Let me {pay} this time.', 'Давай в этот раз заплачу я.', 'Действия'],
    ['see', 'глаг.', 'видеть', '{See} you soon!', 'До скорого!', 'Can you {see} the bus?', 'Ты видишь автобус?', 'Действия'],
    ['look', 'глаг.', 'смотреть; выглядеть', '{Look}! It\'s snowing!', 'Смотри! Снег идёт!', 'You {look} great!', 'Отлично выглядишь!', 'Действия'],
    ['know', 'глаг.', 'знать', 'I don\'t {know}.', 'Я не знаю.', 'Do you {know} Maggie?', 'Ты знаешь Мэгги?', 'Действия'],
    ['think', 'глаг.', 'думать', 'I {think} so.', 'Думаю, да.', 'What do you {think}?', 'Как думаешь?', 'Действия'],
    ['call', 'глаг.', 'звонить', '{Call} me tonight.', 'Позвони мне вечером.', 'Mom {calls} every Sunday.', 'Мама звонит каждое воскресенье.', 'Действия'],
    ['help', 'глаг., сущ.', 'помогать; помощь', 'Can you {help} me?', 'Можешь мне помочь?', 'Thanks for the {help}!', 'Спасибо за помощь!', 'Действия'],
    ['wait', 'глаг.', 'ждать', '{Wait} for me!', 'Подожди меня!', 'Sorry, can you {wait} a minute?', 'Извини, можешь подождать минутку?', 'Действия'],
    ['open', 'глаг., прил.', 'открывать; открытый', '{Open} the door, please.', 'Открой дверь, пожалуйста.', 'Is the store {open}?', 'Магазин открыт?', 'Действия'],
    ['start', 'глаг.', 'начинать(ся)', 'Let\'s {start}.', 'Давай начнём.', 'The movie {starts} at eight.', 'Фильм начинается в восемь.', 'Действия'],
    ['stop', 'глаг.', 'останавливать(ся)', '{Stop}! The light is red.', 'Стой! Красный свет.', 'Please {stop} here.', 'Остановите здесь, пожалуйста.', 'Действия'],
    ['try', 'глаг.', 'пробовать', '{Try} this cake!', 'Попробуй этот торт!', 'Can I {try} it on?', 'Можно примерить?', 'Действия'],
    ['find', 'глаг.', 'находить', 'I can\'t {find} my keys!', 'Не могу найти ключи!', '{Find} a seat, guys.', 'Найдите себе места, ребята.', 'Действия'],
    ['live', 'глаг.', 'жить', 'Where do you {live}?', 'Где ты живёшь?', 'Maggie {lives} in Brooklyn.', 'Мэгги живёт в Бруклине.', 'Действия'],
    ['talk', 'глаг.', 'говорить, разговаривать', 'Can we {talk}?', 'Можем поговорить?', 'Sam {talks} too much.', 'Сэм слишком много болтает.', 'Действия'],
    ['listen', 'глаг.', 'слушать', '{Listen} to this!', 'Послушай это!', 'Jess {listens} to music on the bus.', 'Джесс слушает музыку в автобусе.', 'Действия'],

    /* ---------- Описания ---------- */
    ['good', 'прил.', 'хороший', '{Good} job!', 'Отличная работа!', 'This pizza is really {good}.', 'Эта пицца правда вкусная.', 'Описания'],
    ['bad', 'прил.', 'плохой', 'Not {bad}!', 'Неплохо!', '{Bad} day?', 'Тяжёлый день?', 'Описания'],
    ['big', 'прил.', 'большой', 'What a {big} dog!', 'Какая большая собака!', 'Our kitchen isn\'t very {big}.', 'Наша кухня не очень большая.', 'Описания'],
    ['small', 'прил.', 'маленький', 'A {small} coffee, please.', 'Маленький кофе, пожалуйста.', 'New York apartments are {small}.', 'Квартиры в Нью-Йорке маленькие.', 'Описания'],
    ['new', 'прил.', 'новый', 'Is that a {new} phone?', 'Это новый телефон?', 'I\'m {new} here.', 'Я тут недавно.', 'Описания'],
    ['old', 'прил.', 'старый', 'This building is so {old}.', 'Это здание такое старое.', 'Ray has an {old} radio.', 'У Рэя старое радио.', 'Описания'],
    ['nice', 'прил.', 'приятный, милый', '{Nice} to meet you!', 'Приятно познакомиться!', 'What a {nice} day!', 'Какой хороший день!', 'Описания'],
    ['great', 'прил.', 'отличный', 'That\'s {great}!', 'Это здорово!', 'Maggie is a {great} cook.', 'Мэгги отлично готовит.', 'Описания'],
    ['cool', 'прил.', 'классный; прохладный', 'Your jacket is so {cool}!', 'Твоя куртка такая классная!', 'It\'s {cool} outside tonight.', 'Вечером на улице прохладно.', 'Описания'],
    ['easy', 'прил.', 'лёгкий, простой', 'That\'s {easy}!', 'Это легко!', 'The test is {easy}.', 'Тест лёгкий.', 'Описания'],
    ['hard', 'прил., нареч.', 'трудный; усердно', 'English is {hard}, but fun.', 'Английский трудный, но интересный.', 'Tony works {hard}.', 'Тони усердно работает.', 'Описания'],
    ['fast', 'прил., нареч.', 'быстрый; быстро', 'Wow, that was {fast}!', 'Ого, как быстро!', 'Ray drives too {fast}.', 'Рэй водит слишком быстро.', 'Описания'],
    ['happy', 'прил.', 'счастливый, довольный', 'Maggie looks so {happy}.', 'Мэгги выглядит такой счастливой.', '{Happy} birthday, Sam!', 'С днём рождения, Сэм!', 'Описания'],
    ['sad', 'прил.', 'грустный', 'Why is Tony {sad}?', 'Почему Тони грустный?', 'This movie is so {sad}.', 'Этот фильм такой грустный.', 'Описания'],
    ['busy', 'прил.', 'занятой; людный', 'Sorry, the boss is {busy}.', 'Извини, начальник занят.', 'The café is so {busy} today.', 'В кафе сегодня так людно.', 'Описания'],
    ['ready', 'прил.', 'готовый', 'Are we {ready}?', 'Мы готовы?', 'Dinner is {ready}!', 'Ужин готов!', 'Описания'],
    ['quiet', 'прил.', 'тихий', 'Please be {quiet}.', 'Пожалуйста, потише.', 'The library is so {quiet}.', 'В библиотеке так тихо.', 'Описания'],

    /* ---------- Маленькие слова ---------- */
    ['please', 'частица', 'пожалуйста', 'Water, {please}.', 'Воды, пожалуйста.', '{Please} sit down.', 'Садитесь, пожалуйста.', 'Маленькие слова'],
    ['thanks', 'частица', 'спасибо (разг.)', '{Thanks} a lot!', 'Большое спасибо!', '{Thanks} for dinner, Maggie.', 'Спасибо за ужин, Мэгги.', 'Маленькие слова'],
    ['sorry', 'прил.', 'извини, простите', '{Sorry}, my bad!', 'Извини, моя ошибка!', '{Sorry} I\'m late!', 'Извини за опоздание!', 'Маленькие слова'],
    ['okay', 'нареч.', 'хорошо, ладно', '{Okay}, let\'s go.', 'Ладно, пошли.', 'Is that {okay}?', 'Так нормально?', 'Маленькие слова'],
    ['maybe', 'нареч.', 'может быть', '{Maybe} tomorrow.', 'Может, завтра.', '{Maybe} Sam knows.', 'Может, Сэм знает.', 'Маленькие слова'],
    ['really', 'нареч.', 'правда; очень', '{Really}? No way!', 'Правда? Не может быть!', 'This soup is {really} good.', 'Этот суп правда вкусный.', 'Маленькие слова'],
    ['very', 'нареч.', 'очень', 'Thank you {very} much!', 'Большое вам спасибо!', 'The bus is {very} slow.', 'Автобус очень медленный.', 'Маленькие слова'],
    ['here', 'нареч.', 'здесь, сюда', 'Come {here}!', 'Иди сюда!', 'Your coffee is {here}.', 'Твой кофе здесь.', 'Маленькие слова'],
    ['there', 'нареч.', 'там, туда', 'Put it over {there}.', 'Положи вон туда.', 'Is Maggie {there}?', 'Мэгги там?', 'Маленькие слова'],
    ['always', 'нареч.', 'всегда', 'Tony is {always} late.', 'Тони всегда опаздывает.', 'Jess {always} smiles.', 'Джесс всегда улыбается.', 'Маленькие слова'],
    ['never', 'нареч.', 'никогда', 'Sam {never} cooks.', 'Сэм никогда не готовит.', '{Never} again!', 'Больше никогда!', 'Маленькие слова'],
    ['sometimes', 'нареч.', 'иногда', '{Sometimes} I walk to work.', 'Иногда я хожу на работу пешком.', 'Maggie {sometimes} sings in the shower.', 'Мэгги иногда поёт в душе.', 'Маленькие слова'],
  ];

  const items = DATA.map((r) => ({
    front: r[0], pos: r[1], ru: r[2],
    ex: [{ raw: r[3], ru: r[4] }, { raw: r[5], ru: r[6] }],
    topic: r[7], sub: r[8] || 'A1',
  }));
  const n = items.length;

  const clean = (raw) => String(raw).replace(/[{}]/g, '');
  // «Кто-то {слово} тут» → { before, target, after } (цель ищем по скобкам, а не по тексту:
  // «eat» не должно совпасть с «great»)
  function splitTarget(raw) {
    const m = String(raw).match(/^(.*?)\{([^}]+)\}(.*)$/);
    return m ? { before: clean(m[1]), target: m[2], after: clean(m[3]) } : null;
  }
  const baseLevel = (sub) => String(sub).replace('+', '');
  const posKey = (it) => it.pos.split(/[.,]/)[0];

  // Детерминированный выбор дистракторов: шаг по кругу, как в content_us.js
  function distractors(i, key, count, accept) {
    const out = [];
    const me = key(items[i]);
    const low = (v) => String(v).toLowerCase();
    for (let j = 1, k = (i * 17 + 11) % n; out.length < count && j < n; j++, k = (k + 37) % n) {
      if (k === i) continue;
      const it = items[k];
      if (accept && !accept(it)) continue;
      const v = key(it);
      if (!v || low(v) === low(me) || out.some((o) => low(o) === low(v))) continue;
      out.push(v);
    }
    // Если строгий фильтр дал мало вариантов — добираем без него
    if (out.length < count && accept) {
      for (const v of distractors(i, key, count)) if (out.length < count && !out.some((o) => low(o) === low(v)) && low(v) !== low(me)) out.push(v);
    }
    return out;
  }
  function q(text, correct, distr, pos) {
    const options = distr.slice(0, 3);
    const p = pos % (options.length + 1);
    options.splice(p, 0, correct);
    return { q: text, options, correct: p };
  }

  // Разметка слов — общая partsOf (части речи, немые буквы); IPA остальным допишет lex_us.js
  /* global partsOf */
  const parts = (text) => (typeof partsOf === 'function' ? partsOf(text)
    : String(text).split(/\s+/).filter(Boolean).map((w) => ({ word: w })));

  // Регистр вариантов в «вставь слово» — как у правильного ответа, иначе заглавная буква
  // подсказывает ответ (в начале предложения — с заглавной, в середине — со строчной).
  const PROPER = new Set(items.filter((x) => /^[A-Z]/.test(x.front)).map((x) => x.front.toLowerCase()));
  function matchCase(list, target) {
    const upper = /^[A-Z]/.test(target);
    return list.map((v) => {
      if (PROPER.has(String(v).toLowerCase())) return v;
      return upper ? v.charAt(0).toUpperCase() + v.slice(1) : v.charAt(0).toLowerCase() + v.slice(1);
    });
  }

  const cards = items.map((it, i) => {
    const samePos = (x) => posKey(x) === posKey(it);
    const tests = [];
    tests.push(q('Что значит «' + it.front + '»?', it.ru, distractors(i, (x) => x.ru, 3), i));
    tests.push(q('Как сказать по-английски «' + it.ru + '»?', it.front, distractors(i, (x) => x.front, 3, samePos), i + 1));
    const g1 = splitTarget(it.ex[0].raw);
    if (g1) {
      tests.push(q('Вставьте слово «' + it.ru + '»: ' + g1.before + '___' + g1.after, g1.target,
        matchCase(distractors(i, (x) => (splitTarget(x.ex[0].raw) || {}).target, 6, samePos), g1.target)
          .filter((v) => v.toLowerCase() !== g1.target.toLowerCase()), i + 2));
    }
    const g2 = splitTarget(it.ex[1].raw);
    if (g2) {
      tests.push(q(g2.before + '___' + g2.after + ' (' + it.ex[1].ru + ')', g2.target,
        matchCase(distractors(i, (x) => (splitTarget(x.ex[1].raw) || {}).target, 6, samePos), g2.target)
          .filter((v) => v.toLowerCase() !== g2.target.toLowerCase()), i + 3));
    }
    tests.push(q('Как перевести: «' + clean(it.ex[0].raw) + '»?', it.ex[0].ru, distractors(i, (x) => x.ex[0].ru, 3), i + 1));

    return {
      id: 'wd_' + String(i + 1).padStart(4, '0'),
      type: 'word',
      level: baseLevel(it.sub),
      sublevel: it.sub,
      tags: [it.topic],
      audio: true,
      payload: {
        front: it.front,
        translation: it.ru,
        pos: it.pos,
        category: it.topic,
        examples: it.ex.map((e) => ({ text: clean(e.raw), ru: e.ru, parts: parts(clean(e.raw)), connected: '' })),
        test: tests,
      },
    };
  });

  window.WORD_CARDS = cards;
  window.WORD_TOPICS = [...new Set(items.map((it) => it.topic))];
})();
