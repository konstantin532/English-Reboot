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

  /* ---------- Слова урока: послушай и выбери значение ---------- */
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

  function showWord(lesson, byId) {
    const i = lesson.wordsDone || 0;
    if (i >= lesson.words.length) { afterTasks(lesson); return; }
    const card = byId.get(lesson.words[i]);
    const p = card.payload;
    const t = p.test[0]; // «Что значит …?» — первый вопрос каждой карточки слова
    const ipa = wordIpa(card);
    const review = i < (lesson.wordsDue || 0);
    const pct = Math.round((i / lesson.words.length) * 100);
    if (ER && ER.claimContent) ER.claimContent();
    document.getElementById('content').innerHTML = `
      <div class="section-wrap">
        <div class="card ladder-card words-card" id="words-root" data-id="${esc(card.id)}">
          <div class="session-progress"><div class="session-progress-fill" style="width:${pct}%"></div></div>
          <div class="ladder-head"><p class="session-counter">Слово ${i + 1} из ${lesson.words.length} · ${review ? 'Повторение' : 'Новое слово'}</p></div>
          <h2 class="ladder-step-title">Слова урока</h2>
          <p class="ladder-prompt">Послушай и выбери значение</p>
          <div class="words-front">
            <span class="words-word">${esc(p.front)}</span>
            <button class="audio-btn" id="words-play" type="button" title="Прослушать" aria-label="Прослушать слово">${PLAY_ICON}</button>
          </div>
          ${ipa ? `<p class="words-ipa">${esc(ipa)} <span class="ru-tr">${window.Annotate ? Annotate.ruTranscribe(ipa, p.front) : ''}</span></p>` : ''}
          <div class="ladder-options">${t.options.map((o, k) => `<button class="ladder-opt words-opt" type="button" data-i="${k}">${esc(o)}</button>`).join('')}</div>
          <div class="ladder-feedback" id="words-feedback" aria-live="polite"></div>
          <div class="ladder-actions" id="words-actions"><button class="btn btn-ghost" id="words-quit" type="button">Закончить</button></div>
        </div>
      </div>`;
    window.scrollTo(0, 0);
    setTimeout(() => speakWord(p.front), 250);
    const root = document.getElementById('words-root');
    let answered = false;
    root.addEventListener('click', (e) => {
      if (e.target.closest('#words-play')) { speakWord(p.front); return; }
      if (e.target.closest('#words-quit')) { ER.switchTab('today'); return; }
      if (e.target.closest('#words-next')) { showWord(lesson, byId); return; }
      const opt = e.target.closest('.words-opt');
      if (!opt || answered) return;
      answered = true;
      const ok = Number(opt.dataset.i) === t.correct;
      root.querySelectorAll('.words-opt').forEach((b, k) => {
        b.disabled = true;
        if (k === t.correct) b.classList.add('is-correct');
        else if (b === opt) b.classList.add('is-wrong');
      });
      const ex = (p.examples || [])[0];
      document.getElementById('words-feedback').innerHTML = `
        <div class="ladder-verdict${ok ? '' : ' is-miss'}">
          <p><b>${ok ? 'Верно' : 'Правильно:'}</b> ${esc(p.front)} — ${esc(p.translation)}</p>
          ${ex ? `<p class="words-ex">${esc(ex.text)} <span class="words-ex-ru">— ${esc(ex.ru || '')}</span></p>` : ''}
        </div>`;
      document.getElementById('words-actions').innerHTML = `
        <button class="btn btn-ghost" id="words-quit" type="button">Закончить</button>
        <button class="btn-primary" id="words-next" type="button">Дальше</button>`;
      // Счётчики урока меняем сразу: «Дальше» может прийти раньше, чем запишется прогресс
      lesson.wordsDone = i + 1;
      lesson.wordsOk = (lesson.wordsOk || 0) + (ok ? 1 : 0);
      recordWord(lesson, card.id, ok);
    });
  }

  async function recordWord(lesson, id, ok) {
    await save(lesson);
    const r = await SRS.saveProgress(id, 'words', ok ? 'know' : 'dontknow');
    if (r && r.success) {
      SRS.updateStreak();
      if (ER && ER.addStudyLog) await ER.addStudyLog(1, ok ? 1 : 0, 0);
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
          <h2 class="today-title">Итог дня 🎉</h2>
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
