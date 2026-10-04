/* ==========================================================================
   English Reboot — IELTS-подготовка
   Файл: ielts.js — Writing (Task 1/2: таймер, счётчик слов, автоанализ,
   самооценка по 4 критериям band descriptors, промпт для ИИ-экзаменатора),
   Speaking (Part 1–3: таймеры 1+2 мин, запись голоса), Reading (True/False/
   Not Given), Academic Word List. Черновики эссе — в localStorage.
   ========================================================================== */
const IELTS = (() => {
  'use strict';

  let ER = null;
  const st = { mode: 'writing', task: 2, prompt: 0, timer: null, left: 0, rec: null, stream: null, chunks: [] };
  const LS_KEY = 'er_ielts_essays';
  const esc = (s) => (ER ? ER.escapeHtml(String(s)) : String(s));
  const pick = (a) => Math.floor(Math.random() * a.length);

  /* ---------- Данные ---------- */
  const W2 = [
    'Some people believe that university education should be free for everyone. Others think students should pay. Discuss both views and give your opinion.',
    'In many countries, people are living longer. Do the advantages of this outweigh the disadvantages?',
    'Some people think that the best way to reduce crime is to give longer prison sentences. Others believe there are better ways. Discuss both views and give your opinion.',
    'Many people now work from home using technology. What are the advantages and disadvantages of this trend?',
    'Governments should spend more money on public transport than on building new roads. To what extent do you agree or disagree?',
    'Children today spend too much time on screens. What problems does this cause, and what solutions can you suggest?',
    'Some believe that international tourism has a negative effect on local communities. To what extent do you agree or disagree?',
    'It is more important for schools to teach practical skills than academic subjects. To what extent do you agree or disagree?',
    'Many young people today do not know much about the history of their country. Why is this the case? What can be done about it?',
    'Advertising encourages people to buy things they do not need. Do you agree or disagree?',
    'Environmental problems are too big for individuals to solve; only governments and large companies can make a difference. To what extent do you agree?',
    'Some people prefer to live in a big city, while others prefer a small town. Discuss both views and give your opinion.',
  ];
  const W1 = [
    'The line graph shows the percentage of households with internet access in three countries between 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    'The bar chart compares the amount of money spent on food, housing, transport and leisure by an average family in 1990 and 2020. Summarise the main features and make comparisons where relevant.',
    'The pie charts show the sources of electricity production in a country in 2005 and 2025. Summarise the information by selecting and reporting the main features.',
    'The diagram illustrates the process of recycling plastic bottles. Summarise the information by selecting and reporting the main features.',
    'The table shows the number of international students in five universities in 2010, 2015 and 2020. Summarise the main features and make comparisons where relevant.',
    'The two maps show how a seaside town changed between 1990 and the present day. Summarise the main changes.',
  ];
  const SP1 = ['Do you work or are you a student?', 'What do you like most about your hometown?', 'How do you usually spend your weekends?', 'Do you prefer reading books or watching films? Why?', 'How often do you use public transport?', 'What kind of music do you enjoy?', 'Do you like cooking? Why / why not?', 'Is it important to have a hobby?', 'How has your daily routine changed in recent years?', 'Do you prefer mornings or evenings?'];
  const SP2 = [
    ['Describe a person who has influenced you.', ['who this person is', 'how you know them', 'what they did', 'and explain why they influenced you'], ['Do role models matter more for children or adults?', 'Are celebrities good role models?', 'How has social media changed who young people admire?']],
    ['Describe a place you visited that you would like to return to.', ['where it is', 'when you went there', 'what you did there', 'and explain why you want to go back'], ['Why do people travel abroad?', 'How does tourism affect local culture?', 'Will virtual travel ever replace real travel?']],
    ['Describe a skill you learned that took a long time.', ['what the skill is', 'how you learned it', 'what difficulties you had', 'and explain how you feel about it now'], ['Which skills will be most important in the future?', 'Should schools teach more practical skills?', 'Is it easier to learn as a child or as an adult?']],
    ['Describe a book or film that made you think.', ['what it was', 'when you read or watched it', 'what it was about', 'and explain why it made you think'], ['Do people read less than in the past?', 'Should films be used in education?', 'How do stories influence society?']],
    ['Describe a time you helped someone.', ['who you helped', 'what the situation was', 'how you helped', 'and explain how you felt afterwards'], ['Are people less helpful in big cities?', 'Should volunteering be compulsory at school?', 'What makes people want to help others?']],
    ['Describe a piece of technology you find useful.', ['what it is', 'how long you have had it', 'how you use it', 'and explain why it is useful to you'], ['Has technology made people more isolated?', 'Should children have smartphones?', 'What jobs might disappear because of AI?']],
    ['Describe an important decision you made.', ['what the decision was', 'when you made it', 'what options you had', 'and explain why it was important'], ['Should young people make decisions about their careers early?', 'Do older people make better decisions?', 'How do advertisements influence decisions?']],
    ['Describe a goal you hope to achieve in the future.', ['what the goal is', 'why you chose it', 'what you are doing to achieve it', 'and explain how you will feel when you achieve it'], ['Is it better to set big or small goals?', 'Why do some people give up on their goals?', 'Do schools put too much pressure on students?']],
  ];
  // Academic Word List (выборка самых частотных слов, sublist 1–3)
  const AWL = 'analyse|анализировать;approach|подход;assess|оценивать;assume|предполагать;authority|власть, орган;available|доступный;benefit|польза;concept|понятие;consist|состоять;constitute|составлять;context|контекст;contract|контракт;data|данные;define|определять;derive|происходить, извлекать;distribute|распределять;economy|экономика;environment|окружающая среда;establish|устанавливать;estimate|оценка, оценивать;evident|очевидный;factor|фактор;finance|финансы;formula|формула;function|функция;identify|выявлять;income|доход;indicate|указывать;individual|индивидуальный;interpret|толковать;involve|вовлекать;issue|проблема, вопрос;labour|труд;legal|законный;major|главный;method|метод;occur|происходить;percent|процент;period|период;policy|политика, курс;principle|принцип;proceed|продолжать;process|процесс;require|требовать;research|исследование;respond|реагировать;role|роль;section|раздел;significant|значительный;similar|похожий;source|источник;specific|конкретный;structure|структура;theory|теория;vary|различаться;achieve|достигать;acquire|приобретать;affect|влиять;appropriate|подходящий;aspect|аспект;consequence|последствие;considerable|значительный;crucial|ключевой;demonstrate|демонстрировать;emphasis|акцент;ensure|обеспечивать;evaluate|оценивать;feature|черта;impact|влияние;implement|внедрять;maintain|поддерживать;obtain|получать;potential|потенциал;primary|основной;promote|продвигать;relevant|уместный;resource|ресурс;strategy|стратегия;sufficient|достаточный;sustainable|устойчивый;trend|тенденция;undertake|предпринимать;whereas|тогда как'
    .split(';').map((s) => s.split('|'));
  const AWL_SET = new Set(AWL.map((w) => w[0]));
  const LINKERS = ['however', 'moreover', 'furthermore', 'in addition', 'therefore', 'consequently', 'as a result', 'on the other hand', 'nevertheless', 'although', 'whereas', 'for example', 'for instance', 'in contrast', 'in conclusion', 'to sum up', 'firstly', 'secondly', 'finally', 'similarly', 'despite', 'while', 'thus', 'hence', 'overall'];
  const STOP = new Set('the a an and or but of to in on at for with is are was were be been it this that these those as by from not have has had do does did can will would should could may might their there they them its his her our your we you he she i which who what when where how also more most than so such very many much some any all other into about only'.split(' '));
  const READING = {
    title: 'The Rise of Urban Farming',
    text: 'Over the past two decades, urban farming has moved from a niche hobby to a recognised part of city planning. In cities such as Singapore and Detroit, rooftops, abandoned car parks and even shipping containers have been converted into productive growing spaces. Supporters argue that growing food close to consumers reduces transport emissions and gives residents access to fresh produce. However, critics point out that urban farms currently supply only a small fraction of a city\'s food, and that the high cost of land and energy makes many projects dependent on public subsidies. A 2019 study found that vertical farms use up to 95 percent less water than traditional agriculture, although they consume far more electricity for lighting. Many city councils now include community gardens in their development plans, mainly because of their social benefits: they bring neighbours together and provide educational opportunities for children.',
    qs: [
      ['Urban farming was a popular hobby twenty years ago.', 'NG', 'В тексте сказано, что это было нишевое (узкое) хобби — о популярности ничего не сказано.'],
      ['Urban farms produce most of the food consumed in Singapore.', 'F', 'Критики отмечают, что городские фермы дают лишь малую долю еды города.'],
      ['Many urban farming projects rely on government money.', 'T', 'Многие проекты зависят от public subsidies — государственных субсидий.'],
      ['Vertical farms use less electricity than traditional farms.', 'F', 'Наоборот: они потребляют гораздо больше электричества на освещение.'],
      ['Detroit has more urban farms than any other city.', 'NG', 'Сравнения количества ферм в тексте нет.'],
      ['Community gardens are valued mainly for social reasons.', 'T', 'Советы включают их в планы в основном из-за социальной пользы.'],
    ],
  };

  /* ---------- Утилиты ---------- */
  const fmtTime = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  const $ = (id) => document.getElementById(id);
  function loadEssays() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch (e) { return []; } }
  function saveEssays(a) { try { localStorage.setItem(LS_KEY, JSON.stringify(a.slice(0, 30))); } catch (e) { /* storage недоступен */ } }

  function stopTimer() { if (st.timer) clearInterval(st.timer); st.timer = null; }
  function startTimer(sec, elId, onEnd) {
    stopTimer();
    st.left = sec;
    const el = $(elId);
    const tick = () => {
      if (!el || !document.body.contains(el)) { stopTimer(); return; }
      el.textContent = fmtTime(st.left);
      el.classList.toggle('ielts-timer-low', st.left <= 60);
      if (st.left-- <= 0) { stopTimer(); if (onEnd) onEnd(); }
    };
    tick();
    st.timer = setInterval(tick, 1000);
  }
  function stop() {
    stopTimer();
    if (st.rec && st.rec.state !== 'inactive') st.rec.stop();
    if (st.stream) st.stream.getTracks().forEach((t) => t.stop());
    st.rec = null; st.stream = null;
  }

  /* ---------- Анализ эссе ---------- */
  function analyse(text, task) {
    const words = (text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || []);
    const paras = text.split(/\n\s*\n|\n/).filter((p) => p.trim().split(/\s+/).length > 5).length;
    const sents = text.split(/[.!?]+/).filter((s) => s.trim().length > 3).length || 1;
    const low = ' ' + text.toLowerCase().replace(/\s+/g, ' ') + ' ';
    const linkers = LINKERS.filter((l) => low.includes(' ' + l + ' ') || low.includes(' ' + l + ','));
    const stem = (w) => ['', 's', 'es', 'd', 'ed', 'ing', 'ly', 'al', 'ment', 'ion'].some((e) => w.endsWith(e) && (AWL_SET.has(w.slice(0, w.length - e.length)) || AWL_SET.has(w.slice(0, w.length - e.length) + 'e')));
    const awl = [...new Set(words.filter(stem))];
    const contractions = (text.match(/\b\w+'(t|re|ve|ll|d|m)\b/gi) || []);
    const freq = {};
    words.forEach((w) => { if (!STOP.has(w) && w.length > 3) freq[w] = (freq[w] || 0) + 1; });
    const repeated = Object.entries(freq).filter(([, n]) => n >= 4).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const uniq = new Set(words).size;
    const min = task === 1 ? 150 : 250;
    const tips = [];
    if (words.length < min) tips.push(`Меньше ${min} слов — на экзамене это прямой штраф по Task Response/Achievement.`);
    if (paras < (task === 1 ? 3 : 4)) tips.push(task === 1 ? 'Нужна структура: вступление (перефраз), overview, 2 абзаца с деталями.' : 'Нужно 4–5 абзацев: введение, 2–3 абзаца аргументов, заключение.');
    if (task === 1 && !/overall|in general|it is clear/.test(low)) tips.push('Нет overview (Overall, …) — без него Task Achievement выше 5 не поставят.');
    if (linkers.length < 5) tips.push('Мало связок — добавь however, moreover, as a result, in contrast.');
    if (awl.length < 5) tips.push('Мало академической лексики (AWL) — см. вкладку «Лексика».');
    if (contractions.length) tips.push(`Сокращения (${[...new Set(contractions)].slice(0, 4).join(', ')}) — в академическом письме пиши полностью.`);
    if (/\b(i think|in my opinion)\b/.test(low) && (low.match(/\bi think\b/g) || []).length > 2) tips.push('«I think» слишком часто — варьируй: I would argue, it seems to me.');
    if (repeated.length) tips.push('Повторы: ' + repeated.map(([w, n]) => `${w} ×${n}`).join(', ') + ' — подбери синонимы.');
    if (words.length / sents > 28) tips.push('Слишком длинные предложения — разбей часть из них.');
    if (words.length / sents < 11) tips.push('Предложения короткие — добавь сложные (which, although, if).');
    return { words: words.length, paras, sents, avg: Math.round(words.length / sents), ttr: words.length ? Math.round((uniq / words.length) * 100) : 0, linkers, awl, tips };
  }

  function aiPrompt(text, task, prompt) {
    return `Act as a certified IELTS examiner. Assess my IELTS Academic Writing Task ${task} using the official band descriptors (${task === 1 ? 'Task Achievement' : 'Task Response'}, Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy). Give a band for each criterion and the overall band, list my errors with corrections, and show a band 8 version of my weakest paragraph. Explain in Russian.\n\nTask: ${prompt}\n\nMy answer:\n${text}`;
  }

  /* ---------- Рендер ---------- */
  function render() {
    stop();
    const tabs = [['writing', '✍️ Writing'], ['speaking', '🎙 Speaking'], ['reading', '📖 Reading'], ['vocab', '📚 Лексика (AWL)']]
      .map(([m, l]) => `<button class="mode-btn ${st.mode === m ? 'active' : ''}" data-ielts-mode="${m}" type="button">${l}</button>`).join('');
    const body = { writing: renderWriting, speaking: renderSpeaking, reading: renderReading, vocab: renderVocab }[st.mode]();
    return `<div class="section-wrap">
      <div class="section-header"><h2><span class="line-bullet is-diamond line-bullet--lg" style="--line:#0039A6;--line-ink:#fff" aria-hidden="true"><span>E</span></span><span>IELTS-подготовка</span></h2></div>
      <p class="setting-hint">Формат Academic IELTS. Для band 6.5+ нужен уровень B2–C1: сначала доведи до «Изучено» грамматику и лексику B1–B2, параллельно тренируй здесь форматы экзамена.</p>
      <div class="practice-modes" role="tablist">${tabs}</div>
      <div class="card practice-panel ielts-panel">${body}</div></div>`;
  }

  function renderWriting() {
    const list = st.task === 1 ? W1 : W2;
    if (st.prompt >= list.length) st.prompt = 0;
    const essays = loadEssays();
    return `
      <div class="ielts-row">
        <select id="ielts-task" class="setting-select" aria-label="Задание">
          <option value="2" ${st.task === 2 ? 'selected' : ''}>Task 2 — эссе (40 мин, 250+ слов)</option>
          <option value="1" ${st.task === 1 ? 'selected' : ''}>Task 1 — график/процесс (20 мин, 150+ слов)</option>
        </select>
        <button class="btn btn-ghost" id="ielts-new" type="button">🔀 Другая тема</button>
        <span class="ielts-timer" id="ielts-timer">${fmtTime(st.task === 1 ? 1200 : 2400)}</span>
        <button class="btn btn-ghost" id="ielts-timer-btn" type="button">▶ Таймер</button>
      </div>
      <p class="ielts-prompt">${esc(list[st.prompt])}</p>
      ${st.task === 1 ? '<p class="setting-hint">Графика нет: придумай правдоподобные цифры и опиши их — тренируется язык трендов и сравнений.</p>' : ''}
      <textarea id="ielts-essay" class="ielts-essay" rows="14" placeholder="Пиши ответ здесь…" spellcheck="false"></textarea>
      <div class="ielts-row"><span id="ielts-wc">0 слов</span>
        <button class="btn-primary" id="ielts-check" type="button">Проверить</button>
        <button class="btn btn-ghost" id="ielts-ai" type="button">📋 Промпт для ИИ-экзаменатора</button></div>
      <div id="ielts-result"></div>
      ${essays.length ? `<details class="ielts-history"><summary>Мои эссе (${essays.length})</summary>${essays.map((e) =>
        `<div class="ielts-hist-item"><b>${esc(e.date)}</b> · Task ${e.task} · ${e.words} слов${e.band ? ' · ≈ band ' + e.band : ''}<br><span class="setting-hint">${esc(e.prompt.slice(0, 90))}…</span></div>`).join('')}</details>` : ''}`;
  }

  function renderResult(a, task) {
    const crit = [task === 1 ? 'Task Achievement' : 'Task Response', 'Coherence & Cohesion', 'Lexical Resource', 'Grammar Range & Accuracy'];
    return `
      <div class="ielts-stats">
        <span><b>${a.words}</b> слов</span><span><b>${a.paras}</b> абзацев</span><span><b>${a.avg}</b> слов/предл.</span>
        <span><b>${a.ttr}%</b> уникальных слов</span><span><b>${a.linkers.length}</b> связок</span><span><b>${a.awl.length}</b> AWL-слов</span>
      </div>
      ${a.tips.length ? '<ul class="ielts-tips">' + a.tips.map((t) => `<li>${esc(t)}</li>`).join('') + '</ul>' : '<p class="ielts-ok">Формальные признаки в порядке 👍</p>'}
      ${a.awl.length ? `<p class="setting-hint">AWL: ${a.awl.map(esc).join(', ')}</p>` : ''}
      <h3 class="card-title">Самооценка по band descriptors</h3>
      <div class="ielts-crit">${crit.map((c, i) => `<label>${c}<select class="setting-select ielts-band" data-i="${i}">${[4, 5, 6, 7, 8, 9].map((b) => `<option ${b === 6 ? 'selected' : ''}>${b}</option>`).join('')}</select></label>`).join('')}</div>
      <p class="setting-hint">7 = гибкая лексика и грамматика с редкими ошибками, чёткая позиция и логика; 6 = идея понятна, но есть ошибки и шаблонные связки; 5 = частые ошибки, позиция размыта.</p>
      <button class="btn-primary" id="ielts-save" type="button">Сохранить с оценкой</button> <span id="ielts-band-out" class="ielts-band-out"></span>`;
  }

  function renderSpeaking() {
    const c = SP2[st.prompt % SP2.length];
    const recOk = !!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const p1 = [0, 1, 2].map(() => SP1[pick(SP1)]).filter((q, i, a) => a.indexOf(q) === i);
    return `
      <h3 class="card-title">Part 1 — короткие ответы (2–3 предложения, причина + пример)</h3>
      <ul class="ielts-qs">${p1.map((q) => `<li>${esc(q)} <button class="btn btn-ghost ielts-say ielts-say-sm" data-say="${esc(q)}" type="button" aria-label="Озвучить">🔊</button></li>`).join('')}</ul>
      <h3 class="card-title">Part 2 — карточка (1 мин подготовка, 2 мин речь)</h3>
      <div class="ielts-cue"><b>${esc(c[0])}</b><br>You should say:<ul>${c[1].map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
      <div class="ielts-row">
        <span class="ielts-timer" id="ielts-timer">01:00</span>
        <button class="btn-primary" id="ielts-sp-start" type="button">▶ Начать (подготовка → речь)</button>
        <button class="btn btn-ghost" id="ielts-new" type="button">🔀 Другая карточка</button>
      </div>
      <p class="setting-hint" id="ielts-sp-status">${recOk ? 'Речь запишется автоматически — прослушай себя и оцени: паузы, связки, времена, произношение.' : 'Запись недоступна в этом браузере — тренируйся с таймером.'}</p>
      <div id="ielts-audio"></div>
      <h3 class="card-title">Part 3 — обсуждение (развёрнутое мнение, 4–6 предложений)</h3>
      <ul class="ielts-qs">${c[2].map((q) => `<li>${esc(q)}</li>`).join('')}</ul>
      <p class="setting-hint">Фразы-помощники: <i>That's an interesting question… / On the one hand… / I'd say that… / A good example of this is…</i></p>`;
  }

  function renderReading() {
    const opts = (i) => ['T', 'F', 'NG'].map((v) => `<label class="ielts-opt"><input type="radio" name="rq${i}" value="${v}"> ${{ T: 'True', F: 'False', NG: 'Not Given' }[v]}</label>`).join('');
    return `
      <h3 class="card-title">${esc(READING.title)}</h3>
      <p class="ielts-text">${esc(READING.text)}</p>
      <p class="setting-hint"><b>True</b> — текст это утверждает; <b>False</b> — текст противоречит; <b>Not Given</b> — информации нет. Самая частая ошибка — додумывать за автора.</p>
      <ol class="ielts-qs">${READING.qs.map((q, i) => `<li>${esc(q[0])}<div>${opts(i)}</div><div class="ielts-expl" id="rx${i}"></div></li>`).join('')}</ol>
      <button class="btn-primary" id="ielts-r-check" type="button">Проверить</button> <span id="ielts-r-score"></span>`;
  }

  function renderVocab() {
    return `<p class="setting-hint">Academic Word List — слова, которые экзаменаторы ждут в Writing и Speaking (Lexical Resource). Нажми слово, чтобы услышать.</p>
      <div class="ielts-awl">${AWL.map(([en, ru]) => `<button class="ielts-word ielts-say" data-say="${en}" type="button"><b>${en}</b><span>${ru}</span></button>`).join('')}</div>`;
  }

  /* ---------- События ---------- */
  function rerender() { const c = $('content'); if (c) { c.innerHTML = render(); bind(); } }

  function bind() {
    const root = $('content');
    if (!root) return;
    root.querySelectorAll('[data-ielts-mode]').forEach((b) => b.addEventListener('click', () => { st.mode = b.dataset.ieltsMode; st.prompt = 0; rerender(); }));
    root.querySelectorAll('.ielts-say').forEach((b) => b.addEventListener('click', () => window.TTS && TTS.speak(b.dataset.say, 0.85)));
    const nb = $('ielts-new');
    if (nb) nb.addEventListener('click', () => { const n = st.mode === 'speaking' ? SP2.length : (st.task === 1 ? W1 : W2).length; st.prompt = (st.prompt + 1 + pick(Array(Math.max(1, n - 1)))) % n; rerender(); });

    if (st.mode === 'writing') {
      const ta = $('ielts-essay');
      const list = () => (st.task === 1 ? W1 : W2);
      $('ielts-task').addEventListener('change', (e) => { st.task = Number(e.target.value); st.prompt = pick(list()); rerender(); });
      ta.addEventListener('input', () => { const n = (ta.value.match(/[A-Za-z]+(?:'[a-z]+)?/g) || []).length; $('ielts-wc').textContent = n + ' слов'; });
      $('ielts-timer-btn').addEventListener('click', () => startTimer(st.task === 1 ? 1200 : 2400, 'ielts-timer', () => ER && ER.toast('⏰ Время вышло!', 'warning')));
      $('ielts-check').addEventListener('click', () => {
        if (ta.value.trim().split(/\s+/).length < 30) { if (ER) ER.toast('Напиши хотя бы 30 слов'); return; }
        const a = analyse(ta.value, st.task);
        $('ielts-result').innerHTML = renderResult(a, st.task);
        const calc = () => { const v = [...document.querySelectorAll('.ielts-band')].map((s) => Number(s.value)); const b = Math.round((v.reduce((x, y) => x + y, 0) / 4) * 2) / 2; $('ielts-band-out').textContent = 'Overall ≈ ' + b; return b; };
        document.querySelectorAll('.ielts-band').forEach((s) => s.addEventListener('change', calc));
        calc();
        $('ielts-save').addEventListener('click', () => {
          const e = loadEssays();
          e.unshift({ date: new Date().toLocaleDateString('ru-RU'), task: st.task, prompt: list()[st.prompt], words: a.words, band: calc(), text: ta.value });
          saveEssays(e);
          if (ER) { ER.toast('Эссе сохранено', 'success'); if (ER.addStudyLog) ER.addStudyLog(1); }
        });
      });
      $('ielts-ai').addEventListener('click', async () => {
        if (!ta.value.trim()) { if (ER) ER.toast('Сначала напиши ответ'); return; }
        try { await navigator.clipboard.writeText(aiPrompt(ta.value, st.task, list()[st.prompt])); if (ER) ER.toast('Скопировано — вставь в любой ИИ-чат для разбора по band descriptors', 'success'); }
        catch (e) { if (ER) ER.toast('Не удалось скопировать', 'danger'); }
      });
    }

    if (st.mode === 'speaking') {
      $('ielts-sp-start').addEventListener('click', async (ev) => {
        ev.target.disabled = true;
        const status = $('ielts-sp-status');
        status.textContent = 'Подготовка: набросай ключевые слова по каждому пункту.';
        startTimer(60, 'ielts-timer', async () => {
          status.textContent = '🎙 Говори! Старайся заполнить все 2 минуты.';
          if (ER) ER.toast('Время говорить!');
          await startRecording();
          startTimer(120, 'ielts-timer', () => { stopRecording(); status.textContent = 'Готово. Прослушай запись ниже.'; ev.target.disabled = false; });
        });
      });
    }

    if (st.mode === 'reading') {
      $('ielts-r-check').addEventListener('click', () => {
        let ok = 0;
        READING.qs.forEach((q, i) => {
          const v = (document.querySelector(`input[name="rq${i}"]:checked`) || {}).value;
          const right = v === q[1];
          if (right) ok++;
          $('rx' + i).innerHTML = `<span class="${right ? 'ielts-ok' : 'ielts-bad'}">${right ? '✓' : '✗ Ответ: ' + q[1]}</span> ${esc(q[2])}`;
        });
        $('ielts-r-score').textContent = `${ok} / ${READING.qs.length}`;
      });
    }
  }

  async function startRecording() {
    if (!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) return;
    try {
      st.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      st.chunks = [];
      st.rec = new MediaRecorder(st.stream);
      st.rec.ondataavailable = (e) => { if (e.data.size) st.chunks.push(e.data); };
      st.rec.onstop = () => {
        const box = $('ielts-audio');
        if (box && st.chunks.length) box.innerHTML = `<audio controls src="${URL.createObjectURL(new Blob(st.chunks, { type: st.rec ? st.rec.mimeType : 'audio/webm' }))}"></audio>`;
        if (st.stream) st.stream.getTracks().forEach((t) => t.stop());
        st.stream = null;
      };
      st.rec.start();
    } catch (e) { if (ER) ER.toast('Нет доступа к микрофону', 'warning'); }
  }
  function stopRecording() { if (st.rec && st.rec.state !== 'inactive') st.rec.stop(); }

  return { init: (er) => { ER = er; }, render, bind, stop, analyse };
})();
if (typeof globalThis !== 'undefined') globalThis.IELTS = IELTS;
