/* ==========================================================================
   English Reboot — Этап 2: вкладка «Сегодня» — урок за 15 минут
   Файл: today_ui.js — стартовый экран: одна кнопка «Начать», честная сводка
   дня (вслух, ступени, минуты, серия), урок по плану Today.buildLesson через
   движок лестницы (LadderUI.runQueue), слова урока (послушай и выбери значение),
   итог дня. Урок можно прервать
   («Закончить» или уход на другую вкладку) и продолжить в тот же день —
   состояние в settings.today_lesson.
   ========================================================================== */

const TodayUI = (() => {
  'use strict';

  let ER = null;
  const KEY = 'today_lesson';
  const IMPROV_SPINS = 2; // спинов импровизации в конце урока

  // Реплики тренера. TODO(этап 6): перенести в общий файл реплик тренера.
  const COACH = Coach.LINES.today; // реплики коуча — в coach.js (этап 6)

  function init(er) { ER = er; }
  const esc = (s) => (ER ? ER.escapeHtml(String(s == null ? '' : s)) : String(s));
  const plural = (n, a, b, c) => (ER ? ER.plural(n, a, b, c) : c);

  async function loadSaved() {
    const r = await DB.getSetting(KEY);
    return r.success ? r.data : null;
  }
  const save = (lesson) => DB.saveSetting(KEY, lesson);

  /* ---------- Данные для плана урока ---------- */

  async function buildPlan() {
    const [cards, prog, due, pass, words] = await Promise.all([
      DB.getAll('conversation'), DB.getAllProgress(), SRS.getDueCards(), DB.getSetting('accent_passport'), DB.getAll('words'),
    ]);
    const wordItems = ((words.success && words.data) || []).map((c) => ({ id: c.id, level: c.level, sublevel: c.sublevel }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const items = ((cards.success && cards.data) || []).filter(Ladder.isUsCard).map(Ladder.itemFromCard)
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const started = new Set(((prog.success && prog.data) || []).map((r) => r.cardId));
    const lookup = window.TrapsUI ? await TrapsUI.ensureLookup() : null;
    const scene = window.ScenesUI ? await ScenesUI.nextEpisodeId() : null;
    const improv = window.ImprovUI ? IMPROV_SPINS : 0;
    const level = (ER && ER.settings && ER.settings().currentLevel) || null;
    return Today.buildLesson({ items, due, started, passport: pass.success ? pass.data : null, lookup, scene, improv, level, wordItems });
  }

  async function dayStats() {
    const today = SRS.todayStr();
    const [log, streak] = await Promise.all([DB.getStudyLog(today), DB.getSetting('streak')]);
    const d = (log.success && log.data) || {};
    // Серия считается при занятии; если сегодня ещё не занимался — показываем вчерашнюю
    const last = await DB.getSetting('last_study_date');
    const lastDay = last.success ? last.data : null;
    const alive = lastDay === today || lastDay === SRS.addDays(today, -1);
    return {
      spoken: d.spoken || 0,
      stepsUp: d.stepsUp || 0,
      // «<1» — занимался, но меньше минуты; честнее, чем «0 минут»
      minutes: d.duration > 0 && d.duration < 60 ? '<1' : Math.round((d.duration || 0) / 60),
      streak: alive && streak.success ? Number(streak.data) || 0 : 0,
    };
  }

  function tilesHtml(s) {
    const tile = (n, label, id) => `<div class="today-tile" id="${id}"><b>${n}</b><span>${label}</span></div>`;
    return `<div class="today-tiles">
      ${tile(s.spoken, plural(s.spoken, 'фраза вслух', 'фразы вслух', 'фраз вслух'), 'today-spoken')}
      ${tile(s.stepsUp, plural(s.stepsUp, 'ступень открыта', 'ступени открыты', 'ступеней открыто'), 'today-steps')}
      ${tile(s.minutes, s.minutes === '<1' ? 'минуты' : plural(s.minutes, 'минута', 'минуты', 'минут'), 'today-minutes')}
      ${tile(s.streak, plural(s.streak, 'день подряд', 'дня подряд', 'дней подряд'), 'today-streak')}
    </div>`;
  }

  function planHtml(plan) {
    const rows = [];
    if (plan.warmup.length) rows.push(`<li><span class="today-plan-n">${plan.warmup.length}</span> Разминка — ${plan.warmup.length} ${plural(plan.warmup.length, 'фраза', 'фразы', 'фраз')} на повтор</li>`);
    if (plan.fresh.length) {
      rows.push(`<li><span class="today-plan-n">${plan.fresh.length}</span> Новое — ${plan.fresh.length} ${plural(plan.fresh.length, 'фраза', 'фразы', 'фраз')} темы «${esc(plan.theme)}»: послушай, повтори вслух, пройди по лестнице</li>`);
    }
    if (plan.words && plan.words.length) {
      const n = plan.words.length, rev = plan.wordsDue || 0;
      rows.push(`<li><span class="today-plan-n">${n}</span> Слова — ${n} ${plural(n, 'слово', 'слова', 'слов')}${rev ? `, из них ${rev} на повтор` : ''}: послушай и выбери значение</li>`);
    }
    if (plan.scene) rows.push(`<li><span class="today-plan-n">🎬</span> Сцена — «${esc(ScenesUI.titleOf(plan.scene))}»: поговори с героями истории</li>`);
    if (plan.improv) rows.push(`<li><span class="today-plan-n">🎲</span> Импровизация — ${plan.improv} ${plural(plan.improv, 'ситуация', 'ситуации', 'ситуаций')} без подготовки</li>`);
    return `<ul class="today-plan">${rows.join('')}</ul>`;
  }

  /* ---------- Главный экран ---------- */

  async function render() {
    const today = SRS.todayStr();
    const [saved, stats] = await Promise.all([loadSaved(), dayStats()]);
    const resume = Today.resumable(saved, today);
    let main;
    if (resume) {
      main = `
        <p class="today-coach">${COACH.resume}</p>
        <button class="btn-primary today-start" id="today-continue" type="button">Продолжить урок</button>
        <p class="today-sub">${resume.phase === 'scene'
          ? `Осталась сцена «${esc(ScenesUI.titleOf(resume.scene))}»`
          : resume.phase === 'improv'
            ? `Осталась импровизация: ${resume.improv - (resume.improvDone || 0)} из ${resume.improv}`
            : resume.phase === 'words'
            ? `Остались слова: ${resume.words.length - (resume.wordsDone || 0)} из ${resume.words.length}`
            : `Задание ${resume.idx + 1} из ${resume.tasks.length}${resume.theme ? ` · тема «${esc(resume.theme)}»` : ''}`}</p>`;
    } else {
      const plan = await buildPlan();
      const done = Today.doneToday(saved, today);
      if (!Today.hasWork(plan)) {
        main = `<p class="today-coach">${COACH.empty}</p>
          <button class="btn today-start" id="today-library" type="button">Открыть библиотеку</button>`;
      } else {
        main = `
          <p class="today-coach">${done ? COACH.done : COACH.fresh}</p>
          <button class="btn-primary today-start" id="today-start" type="button">${done ? 'Ещё урок' : 'Начать'}</button>
          ${planHtml(plan)}`;
      }
    }
    return `
      <div class="section-wrap today">
        <div class="card today-hero">
          <h2 class="today-title">Сегодня</h2>
          ${main}
        </div>
        ${tilesHtml(stats)}
      </div>`;
  }

  function bind() {
    const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
    on('today-start', start);
    on('today-continue', resume);
    on('today-library', () => ER.switchTab('conversation'));
  }

  /* ---------- Урок ---------- */

  const callbacks = (lesson) => ({
    onProgress: (idx) => { lesson.idx = idx; return save(lesson); },
    onQuit: () => ER.switchTab('today'),
    onFinish: async () => {
      lesson.idx = lesson.tasks.length;
      await save(lesson);
      afterTasks(lesson);
    },
  });

  // После заданий лестницы: слова → сцена → импровизация → итог дня
  function afterTasks(lesson) {
    if ((lesson.words || []).length > (lesson.wordsDone || 0)) { runWords(lesson); return; }
    if (lesson.scene && !lesson.sceneDone && window.ScenesUI) { runScene(lesson); return; }
    if ((lesson.improv || 0) > (lesson.improvDone || 0) && window.ImprovUI) { runImprov(lesson); return; }
    finishLesson(lesson);
  }

  // Сцена: следующий эпизод истории
  function runScene(lesson) {
    ScenesUI.play(lesson.scene, {
      onFinish: async () => { lesson.sceneDone = true; await save(lesson); afterTasks(lesson); },
      onQuit: () => ER.switchTab('today'),
    });
  }

  // Импровизация: оставшиеся спины рулетки
  function runImprov(lesson) {
    ImprovUI.roulette({
      count: lesson.improv, done: lesson.improvDone || 0,
      onProgress: (n) => { lesson.improvDone = n; return save(lesson); },
      onFinish: () => finishLesson(lesson),
      onQuit: () => ER.switchTab('today'),
    });
  }

  /* ---------- Слова урока: значение, перевод, буквы, на слух ---------- */
  // Слова раздела «Слова». Ответ проверяется честно (вариант выбран верно или нет), результат
  // идёт в FSRS («знаю» / «не знаю») и в журнал дня — как отметка карточки в библиотеке.
  const bareOf = (w) => String(w || '').toLowerCase().replace(/[^a-z']/g, '');
  function wordIpa(card) {
    const front = bareOf(card.payload.front);
    for (const ex of card.payload.examples || []) {
      for (const p of ex.parts || []) if (bareOf(p.word) === front && p.ipa) return p.ipa;
    }
    const rec = window.LEX_US && window.LEX_US[front];
    return rec ? '/' + rec.split('|')[0] + '/' : '';
  }
  const speakWord = (text) => { if (window.TTS) TTS.speak(text, Number(ER.settings().tts_rate) || 0.7); };
  const PLAY_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>';

  async function runWords(lesson) {
    const res = await DB.getAll('words');
    const byId = new Map(((res.success && res.data) || []).map((c) => [c.id, c]));
    // слово могли убрать из курса — пропускаем его, не ломая урок
    const keep = (lesson.words || []).filter((id, i) => i < (lesson.wordsDone || 0) || byId.has(id));
    if (keep.length !== lesson.words.length) { lesson.words = keep; await save(lesson); }
    showWord(lesson, byId);
  }

  // Слово проходит 1–2 задания (Today.wordDrills по подуровню): значение, перевод с русского,
  // сборка из букв, запись на слух. Оценка в FSRS — после последнего задания (Today.gradeWord).
  const DRILL_TITLE = {
    meaning: 'Послушай и выбери значение',
    reverse: 'Выбери слово по-английски',
    letters: 'Собери слово из букв',
    listen: 'Послушай и напиши',
    past: 'Выбери прошедшее время (2-ю форму)',
    pp: "Выбери 3-ю форму (I've ___)",
    ed: 'Послушай: как звучит окончание -ed?',
    did: 'Вставь глагол в вопрос с did',
    say: 'Скажи формы вслух — потом сравни с образцом',
  };
  // Глаголы A2: какой тест карточки (content_words.js → buildVerbs) отвечает за задание
  const VERB_TEST = { irr: { meaning: 0, past: 1, pp: 2, did: 4 }, reg: { meaning: 0, ed: 1, did: 3 } };
  const recordSupported = () => !!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const MIN_SPOKEN_MS = 1000;
  let disposeRec = null;   // остановить запись и микрофон при уходе с экрана слова   // как в лестнице и импровизации: «фраза вслух» — запись от 1 секунды
  // Буквы для «собери из букв»: перемешаны детерминированно (по id), чтобы экран не прыгал
  function shuffledLetters(word, seed) {
    const letters = String(word).toLowerCase().split('').filter((ch) => /[a-z]/.test(ch));
    let x = 0;
    for (const ch of String(seed)) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
    const out = letters.map((ch, i) => ({ ch, i }));
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    // Совпало с исходным порядком — сдвигаем, чтобы было что собирать
    if (out.length > 1 && out.every((o, i) => o.i === i)) out.push(out.shift());
    return out;
  }

  // Озвучка реально есть: системный английский голос или сеть для онлайн-голоса
  function canListen() {
    if (!window.TTS || !TTS.isTTSAvailable()) return false;
    const st = TTS.getStatus();
    return (st.englishVoices > 0 && !st.systemBroken) || st.online;
  }

  // Ход по заданиям слова хранится в уроке (wordDrill, wordErr): после перерыва урок продолжается
  // с того же задания и с уже сделанными ошибками — иначе «знаю» можно было бы получить, начав заново
  function showWord(lesson, byId, drillIdx = Number(lesson.wordDrill) || 0, errors = Number(lesson.wordErr) || 0) {
    if (disposeRec) { disposeRec(); disposeRec = null; }
    const i = lesson.wordsDone || 0;
    if (i >= lesson.words.length) { afterTasks(lesson); return; }
    const card = byId.get(lesson.words[i]);
    const p = card.payload;
    const review = i < (lesson.wordsDue || 0);
    const vf = p.forms || null;
    const drills = Today.wordDrills(card.sublevel || card.level, review, canListen(), vf ? vf.kind : '', recordSupported());
    if (drillIdx >= drills.length) { drillIdx = 0; errors = 0; }
    const kind = drills[drillIdx];
    const ipa = vf ? (vf.parts || []).map((pt) => pt.ipa || '').filter(Boolean).join(' · ') : wordIpa(card);
    const pct = Math.round((i / lesson.words.length) * 100);
    const ipaHtml = ipa ? `<p class="words-ipa">${esc(ipa)} <span class="ru-tr">${window.Annotate ? Annotate.ruTranscribe(ipa, p.front) : ''}</span></p>` : '';
    const playBtn = `<button class="audio-btn" id="words-play" type="button" title="Прослушать" aria-label="Прослушать слово">${PLAY_ICON}</button>`;
    const optsHtml = (t) => `<div class="ladder-options">${t.options.map((o, k) => `<button class="ladder-opt words-opt" type="button" data-i="${k}">${esc(o)}</button>`).join('')}</div>`;
    let body = '';
    let target = p.front;
    // У глаголов тест ищем по ключу (buildVerbs ставит key), номер — запасной путь для старых данных
    const testFor = (k) => (vf ? (p.test.find((t) => t.key === k) || p.test[(VERB_TEST[vf.kind] || {})[k]]) : (k === 'reverse' ? p.test[1] : p.test[0]));
    if (vf && ['past', 'pp', 'ed', 'did'].includes(kind)) {
      const t = testFor(kind);
      body = `<div class="words-front"><span class="words-word words-word--ru">${esc(kind === 'did' ? p.translation : vf.base + ' — ' + p.translation)}</span>${kind === 'ed' ? playBtn : ''}</div>
        <p class="words-hint">${esc(t.q)}</p>${optsHtml(t)}`;
    } else if (kind === 'say') {
      body = `<div class="words-front"><span class="words-word">${esc(vf ? vf.base : p.front)}</span> <span class="words-hint">— ${esc(p.translation)}</span></div>
        <p class="words-hint">Скажи вслух все формы${vf && vf.kind === 'irr' ? ' (например: go — went — gone)' : ''}. Сначала по памяти, потом послушай образец и себя.</p>
        <div class="words-say">
          <button class="btn-primary" id="words-rec" type="button"><svg class="i-ico" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>Записать</button>
          <button class="btn btn-ghost" id="words-stop" type="button" hidden>■ Стоп</button>
          <button class="btn btn-ghost" id="words-model" type="button" hidden>▶ Образец</button>
          <button class="btn btn-ghost" id="words-mine" type="button" hidden>▶ Моя запись</button>
        </div>
        <p class="words-hint" id="words-say-status" aria-live="polite"></p>`;
    } else if (kind === 'meaning') {
      body = `<div class="words-front"><span class="words-word">${esc(p.front)}</span>${playBtn}</div>${ipaHtml}${optsHtml(p.test[0])}`;
    } else if (kind === 'reverse') {
      body = `<div class="words-front"><span class="words-word words-word--ru">${esc(p.translation)}</span></div>${optsHtml(p.test[1])}`;
    } else if (kind === 'letters') {
      const tiles = shuffledLetters(p.front, card.id);
      const slots = p.front.split('').map((ch) => (/[a-z]/i.test(ch) ? '<span class="words-slot"></span>' : `<span class="words-slot is-fixed">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`)).join('');
      body = `<p class="words-hint">${esc(p.translation)} ${playBtn}</p>
        <div class="words-slots" id="words-slots" aria-live="polite">${slots}</div>
        <div class="words-tiles">${tiles.map((t, k) => `<button class="words-tile" type="button" data-k="${k}" data-ch="${t.ch}">${t.ch}</button>`).join('')}</div>`;
    } else {
      target = p.front;
      // Перевод-подсказка: на слух легко спутать омофоны (break / brake, sell / cell)
      body = `<div class="words-front">${playBtn}<span class="words-hint">Слово звучит — напиши его по-английски. Значение: «${esc(p.translation)}»</span></div>
        <form class="words-write" id="words-write" autocomplete="off">
          <input class="words-input" id="words-input" type="text" autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false" aria-label="Слово по-английски">
          <button class="btn-primary" id="words-check" type="submit">Проверить</button>
        </form>`;
    }
    if (ER && ER.claimContent) ER.claimContent();
    document.getElementById('content').innerHTML = `
      <div class="section-wrap">
        <div class="card ladder-card words-card" id="words-root" data-id="${esc(card.id)}" data-kind="${kind}">
          <div class="session-progress"><div class="session-progress-fill" style="width:${pct}%"></div></div>
          <div class="ladder-head"><p class="session-counter">Слово ${i + 1} из ${lesson.words.length} · ${review ? 'Повторение' : 'Новое слово'}${drills.length > 1 ? ` · задание ${drillIdx + 1} из ${drills.length}` : ''}</p></div>
          <h2 class="ladder-step-title">Слова урока</h2>
          <p class="ladder-prompt">${vf && vf.base === 'be' && kind === 'did' ? 'Вставь нужную форму be в вопрос' : DRILL_TITLE[kind]}</p>
          ${body}
          <div class="ladder-feedback" id="words-feedback" aria-live="polite"></div>
          <div class="ladder-actions" id="words-actions"><button class="btn btn-ghost" id="words-quit" type="button">Закончить</button></div>
        </div>
      </div>`;
    window.scrollTo(0, 0);
    // В «выбери по-английски» звук выдал бы ответ — слово звучит только после ответа. У глаголов: в «-ed» звучит
    // прошедшая форма (её и слушаем), в выборе форм и вопросе с did — ничего (формы — ответ), «вслух» — сначала по памяти
    if (vf && kind === 'ed') setTimeout(() => speakWord(vf.past), 250);
    else if (kind !== 'reverse' && !(vf && ['past', 'pp', 'did', 'say'].includes(kind))) setTimeout(() => speakWord(p.front), 250);
    const root = document.getElementById('words-root');
    let answered = false;
    const shownAt = Date.now();
    let placed = 0;
    let slipped = false; // ошибка в «собери из букв» считается один раз
    const letterSlots = [...root.querySelectorAll('.words-slot:not(.is-fixed)')];

    // Пропуск задания (нет микрофона): оценка — по остальным заданиям слова
    const skipDrill = () => {
      if (drillIdx + 1 < drills.length) { showWord(lesson, byId, drillIdx + 1, errors); return; }
      const mark = Today.gradeWord(errors, Math.max(1, drills.length - 1));
      lesson.wordsDone = i + 1;
      lesson.wordsOk = (lesson.wordsOk || 0) + (mark === 'know' ? 1 : 0);
      lesson.wordDrill = 0;
      lesson.wordErr = 0;
      recordWord(lesson, card.id, mark);
      showWord(lesson, byId, 0, 0);
    };
    const finishDrill = (ok, shown) => {
      answered = true;
      setTimeout(() => speakWord(p.front), 150); // после ответа слово звучит всегда
      const ex = (p.examples || [])[0];
      const errs = errors + (ok ? 0 : 1);
      const more = drillIdx + 1 < drills.length;
      // В промежуточном задании при верном ответе написание не показываем: следующее задание
      // («собери из букв», «по русскому») не должно проверять память на пару секунд
      const verdict = ok && more ? '<b>Верно</b> · дальше ещё одно задание с этим словом'
        : `<b>${ok ? 'Верно' : 'Правильно:'}</b> ${esc(p.front)} — ${esc(p.translation)}${shown ? ` · ${shown}` : ''}`;
      document.getElementById('words-feedback').innerHTML = `
        <div class="ladder-verdict${ok ? '' : ' is-miss'}">
          <p>${verdict}</p>
          ${ex && !(ok && more) ? `<p class="words-ex">${esc(ex.text)} <span class="words-ex-ru">— ${esc(ex.ru || '')}</span></p>` : ''}
        </div>`;
      document.getElementById('words-actions').innerHTML = `
        <button class="btn btn-ghost" id="words-quit" type="button">Закончить</button>
        <button class="btn-primary" id="words-next" type="button">Дальше</button>`;
      document.getElementById('words-next').focus();
      if (more) {
        lesson.wordDrill = drillIdx + 1;
        lesson.wordErr = errs;
        save(lesson);
        root.__next = () => showWord(lesson, byId, drillIdx + 1, errs);
        return;
      }
      // Слово пройдено: счётчики урока меняем сразу — «Дальше» может прийти раньше записи
      const mark = Today.gradeWord(errs, drills.length);
      lesson.wordsDone = i + 1;
      lesson.wordsOk = (lesson.wordsOk || 0) + (mark === 'know' ? 1 : 0);
      lesson.wordDrill = 0;
      lesson.wordErr = 0;
      root.__next = () => showWord(lesson, byId, 0, 0);
      recordWord(lesson, card.id, mark);
    };

    // «Скажи вслух»: запись → образец и своя запись рядом. Оценки нет ни от приложения, ни «верно» за самооценку
    // (честно: сравнивает сам ученик) — на оценку слова для FSRS задание не влияет, как и пропуск; запись от 1 секунды
    // засчитывается как «фраза вслух»
    const rec = { recorder: null, stream: null, chunks: [], url: null, startedAt: 0, spoken: false, timer: null };
    const sayStatus = (txt) => { const el = document.getElementById('words-say-status'); if (el) el.textContent = txt; };
    const showBtn = (id, on) => { const el = document.getElementById(id); if (el) el.hidden = !on; };
    if (disposeRec) disposeRec();
    disposeRec = () => {
      clearTimeout(rec.timer);
      if (rec.recorder && rec.recorder.state !== 'inactive') { rec.recorder.onstop = null; rec.recorder.stop(); }
      if (rec.stream) rec.stream.getTracks().forEach((t) => t.stop());
      if (rec.url) URL.revokeObjectURL(rec.url);
    };
    async function onSay(e) {
      if (e.target.closest('#words-model')) { speakWord(vf ? [vf.base, ...String(vf.past).split('/'), vf.pp].filter((v, k, a) => vf.kind === 'irr' || a.indexOf(v) === k).join(', ') : p.front); return; }
      if (e.target.closest('#words-mine')) { if (rec.url) { const a = new Audio(rec.url); a.play().catch(() => {}); } return; }
      if (e.target.closest('#words-stop')) { if (rec.recorder && rec.recorder.state !== 'inactive') rec.recorder.stop(); return; }
      if (!e.target.closest('#words-rec')) return;
      if (window.TTS) TTS.stopSpeaking();
      try {
        rec.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        rec.recorder = new MediaRecorder(rec.stream);
        rec.chunks = [];
        rec.recorder.ondataavailable = (ev) => { if (ev.data && ev.data.size) rec.chunks.push(ev.data); };
        rec.recorder.onstop = async () => {
          clearTimeout(rec.timer);
          const ms = Date.now() - rec.startedAt;
          if (rec.stream) rec.stream.getTracks().forEach((t) => t.stop());
          if (rec.url) URL.revokeObjectURL(rec.url);
          rec.url = URL.createObjectURL(new Blob(rec.chunks, { type: rec.recorder.mimeType || 'audio/webm' }));
          showBtn('words-rec', true); showBtn('words-stop', false);
          if (ms < MIN_SPOKEN_MS) { sayStatus('Слишком коротко — скажи все формы (от 1 секунды).'); return; }
          if (!rec.spoken) { rec.spoken = true; if (window.DB && DB.addSpoken) await DB.addSpoken(SRS.todayStr(), 1); }
          showBtn('words-model', true); showBtn('words-mine', true);
          sayStatus('Записано ✓ Послушай образец и себя. Можно записать ещё раз.');
          if (!answered) {
            answered = true;
            document.getElementById('words-actions').innerHTML = `
              <button class="btn btn-ghost" id="words-quit" type="button">Закончить</button>
              <button class="btn-primary" id="words-next" type="button">Дальше</button>`;
            root.__next = skipDrill;
          }
        };
        rec.startedAt = Date.now();
        rec.recorder.start();
        showBtn('words-rec', false); showBtn('words-stop', true);
        sayStatus('Говори…');
        clearTimeout(rec.timer);
        rec.timer = setTimeout(() => { if (rec.recorder && rec.recorder.state === 'recording') rec.recorder.stop(); }, 8000);
      } catch (err) {
        if (rec.stream) rec.stream.getTracks().forEach((t) => t.stop());
        if (answered) { sayStatus('Не получилось записать ещё раз.'); return; }
        // Без микрофона задание не засчитываем ни «верно», ни «ошибкой» — просто пропускаем
        answered = true;
        sayStatus('Нет доступа к микрофону — задание «вслух» не засчитывается.');
        document.getElementById('words-actions').innerHTML = `
          <button class="btn btn-ghost" id="words-quit" type="button">Закончить</button>
          <button class="btn-primary" id="words-next" type="button">Дальше</button>`;
        root.__next = skipDrill;
      }
    }

    root.addEventListener('click', (e) => {
      if (e.target.closest('#words-play')) { speakWord(vf && kind === 'ed' ? vf.past : p.front); return; }
      if (e.target.closest('#words-quit')) { if (disposeRec) { disposeRec(); disposeRec = null; } ER.switchTab('today'); return; }
      // «Дальше» срабатывает один раз: двойной клик не ответит за ученика на следующем экране
      if (e.target.closest('#words-next')) { const next = root.__next; root.__next = null; if (next) next(); return; }
      if (kind === 'say') { onSay(e); return; }
      if (answered || Date.now() - shownAt < 300) return; // хвост двойного клика по «Дальше»
      const opt = e.target.closest('.words-opt');
      if (opt) {
        const t = testFor(kind);
        const ok = Number(opt.dataset.i) === t.correct;
        root.querySelectorAll('.words-opt').forEach((b, k) => {
          b.disabled = true;
          if (k === t.correct) b.classList.add('is-correct');
          else if (b === opt) b.classList.add('is-wrong');
        });
        finishDrill(ok);
        return;
      }
      const tile = e.target.closest('.words-tile');
      if (tile && !tile.disabled) {
        const want = target.toLowerCase().replace(/[^a-z]/g, '')[placed];
        if (tile.dataset.ch === want) {
          letterSlots[placed].textContent = tile.dataset.ch;
          letterSlots[placed].classList.add('is-filled');
          tile.disabled = true;
          tile.classList.add('is-used');
          placed++;
          if (placed === letterSlots.length) finishDrill(!slipped);
        } else {
          slipped = true;
          tile.classList.remove('is-wrong');
          void tile.offsetWidth; // перезапуск анимации
          tile.classList.add('is-wrong');
        }
      }
    });
    const form = document.getElementById('words-write');
    if (form) {
      const input = document.getElementById('words-input');
      setTimeout(() => input.focus(), 50);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (answered || !input.value.trim()) return;
        const ok = Today.sameWord(input.value, target);
        input.disabled = true;
        input.classList.add(ok ? 'is-correct' : 'is-wrong');
        document.getElementById('words-check').disabled = true;
        finishDrill(ok, ok ? '' : `написано: «${esc(input.value.trim())}»`);
      });
    }
  }

  async function recordWord(lesson, id, mark) {
    await save(lesson);
    const r = await SRS.saveProgress(id, 'words', mark);
    if (r && r.success) {
      SRS.updateStreak();
      if (ER && ER.addStudyLog) await ER.addStudyLog(1, mark === 'know' ? 1 : 0, 0);
    }
  }

  async function finishLesson(lesson) {
    lesson.done = true;
    await save(lesson);
    showSummary(lesson);
  }

  async function start() {
    const btn = document.getElementById('today-start');
    if (btn) btn.disabled = true;
    const plan = await buildPlan();
    if (!Today.hasWork(plan)) { ER.toast(COACH.empty); ER.switchTab('today'); return; }
    const lesson = { date: SRS.todayStr(), tasks: plan.tasks, idx: 0, theme: plan.theme, scene: plan.scene, sceneDone: false,
      improv: plan.improv || 0, improvDone: 0, words: plan.words || [], wordsDue: plan.wordsDue || 0, wordsDone: 0, wordsOk: 0,
      done: false };
    await save(lesson);
    if (!lesson.tasks.length) { afterTasks(lesson); return; }
    LadderUI.runQueue(lesson.tasks, { startIdx: 0, ...callbacks(lesson) });
  }

  async function resume() {
    const lesson = Today.resumable(await loadSaved(), SRS.todayStr());
    if (!lesson) { ER.switchTab('today'); return; }
    if (lesson.phase === 'words' || lesson.phase === 'scene' || lesson.phase === 'improv') { afterTasks(lesson); return; }
    LadderUI.runQueue(lesson.tasks, { startIdx: lesson.idx, ...callbacks(lesson) });
  }

  /* ---------- Итог дня ---------- */

  // Реплика коуча по фактам «Сказано вслух» (сравнение только с собой) + темп «90 дней»
  async function coachTalk() {
    const today = SRS.todayStr();
    const r = await DB.getStudyLogRange('0000-00-00', today);
    const logs = (r.success && r.data) || [];
    return { day: Coach.dayLine(Pacers.facts(logs, today)).text, pace: Coach.paceLine(Pacers.table(logs, today).goal) };
  }

  async function showSummary(lesson) {
    const s = await dayStats();
    const talk = await coachTalk();
    const scene = lesson && lesson.sceneDone && window.ScenesUI ? ScenesUI.titleOf(lesson.scene) : '';
    if (ER && ER.claimContent) ER.claimContent();
    document.getElementById('content').innerHTML = `
      <div class="section-wrap today">
        <div class="card today-hero today-summary" id="today-summary">
          <h2 class="today-title">Итог дня</h2>
          <p class="today-big">Сказано вслух: <b>${s.spoken}</b> ${plural(s.spoken, 'фраза', 'фразы', 'фраз')}.
            Открыто ступеней: <b>${s.stepsUp}</b>.</p>
          ${scene ? `<p class="today-sub" id="today-scene-done">🎬 Сцена «${esc(scene)}» пройдена</p>` : ''}
          ${lesson && lesson.wordsDone ? `<p class="today-sub" id="today-words-done">📖 Слова: ${lesson.wordsOk || 0} из ${lesson.wordsDone} — верно</p>` : ''}
          ${lesson && lesson.improvDone ? `<p class="today-sub" id="today-improv-done">🎲 Импровизаций: ${lesson.improvDone}</p>` : ''}
          <p class="today-sub">${s.minutes === '<1' ? 'меньше минуты' : `${s.minutes} ${plural(s.minutes, 'минута', 'минуты', 'минут')}`} занятий сегодня ·
            серия ${s.streak} ${plural(s.streak, 'день', 'дня', 'дней')}</p>
          <p class="today-coach" id="today-day-line">${esc(talk.day)}</p>
          ${talk.pace ? `<p class="today-sub" id="today-pace-line">${esc(talk.pace)}</p>` : ''}
          <button class="btn-primary" id="today-home" type="button">На главную</button>
        </div>
      </div>`;
    document.getElementById('today-home').addEventListener('click', () => ER.switchTab('today'));
    window.scrollTo(0, 0);
  }

  return { init, render, bind, start, resume, showSummary };
})();

if (typeof window !== 'undefined') window.TodayUI = TodayUI;
