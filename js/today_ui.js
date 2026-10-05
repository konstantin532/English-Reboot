/* ==========================================================================
   English Reboot — Этап 2: вкладка «Сегодня» — урок за 15 минут
   Файл: today_ui.js — стартовый экран: одна кнопка «Начать», честная сводка
   дня (вслух, ступени, минуты, серия), урок по плану Today.buildLesson через
   движок лестницы (LadderUI.runQueue), итог дня. Урок можно прервать
   («Закончить» или уход на другую вкладку) и продолжить в тот же день —
   состояние в settings.today_lesson.
   ========================================================================== */

const TodayUI = (() => {
  'use strict';

  let ER = null;
  const KEY = 'today_lesson';
  const IMPROV_SPINS = 2; // спинов импровизации в конце урока

  // Реплики тренера. TODO(этап 6): перенести в общий файл реплик тренера.
  const COACH = {
    fresh: 'Пятнадцать минут — и сегодня ты скажешь по-английски больше, чем вчера.',
    resume: 'Урок на паузе — продолжим с того же места.',
    done: 'Урок дня пройден. Хочешь — ещё один, хочешь — загляни в библиотеку.',
    empty: 'Всё повторено и все фразы в работе. FSRS вернёт их, когда придёт время.',
    summary: 'Вот это работа. Завтра — следующий шаг.',
  };

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
    const [cards, prog, due, pass] = await Promise.all([
      DB.getAll('conversation'), DB.getAllProgress(), SRS.getDueCards(), DB.getSetting('accent_passport'),
    ]);
    const items = ((cards.success && cards.data) || []).filter(Ladder.isUsCard).map(Ladder.itemFromCard)
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const started = new Set(((prog.success && prog.data) || []).map((r) => r.cardId));
    const lookup = window.TrapsUI ? await TrapsUI.ensureLookup() : null;
    const scene = window.ScenesUI ? await ScenesUI.nextEpisodeId() : null;
    const improv = window.ImprovUI ? IMPROV_SPINS : 0;
    return Today.buildLesson({ items, due, started, passport: pass.success ? pass.data : null, lookup, scene, improv });
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

  // После заданий лестницы: сцена → импровизация → итог дня
  function afterTasks(lesson) {
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
      improv: plan.improv || 0, improvDone: 0, done: false };
    await save(lesson);
    if (!lesson.tasks.length) { afterTasks(lesson); return; }
    LadderUI.runQueue(lesson.tasks, { startIdx: 0, ...callbacks(lesson) });
  }

  async function resume() {
    const lesson = Today.resumable(await loadSaved(), SRS.todayStr());
    if (!lesson) { ER.switchTab('today'); return; }
    if (lesson.phase === 'scene' || lesson.phase === 'improv') { afterTasks(lesson); return; }
    LadderUI.runQueue(lesson.tasks, { startIdx: lesson.idx, ...callbacks(lesson) });
  }

  /* ---------- Итог дня ---------- */

  async function showSummary(lesson) {
    const s = await dayStats();
    const scene = lesson && lesson.sceneDone && window.ScenesUI ? ScenesUI.titleOf(lesson.scene) : '';
    if (ER && ER.claimContent) ER.claimContent();
    document.getElementById('content').innerHTML = `
      <div class="section-wrap today">
        <div class="card today-hero today-summary" id="today-summary">
          <h2 class="today-title">Итог дня 🎉</h2>
          <p class="today-big">Сказано вслух: <b>${s.spoken}</b> ${plural(s.spoken, 'фраза', 'фразы', 'фраз')}.
            Открыто ступеней: <b>${s.stepsUp}</b>.</p>
          ${scene ? `<p class="today-sub" id="today-scene-done">🎬 Сцена «${esc(scene)}» пройдена</p>` : ''}
          ${lesson && lesson.improvDone ? `<p class="today-sub" id="today-improv-done">🎲 Импровизаций: ${lesson.improvDone}</p>` : ''}
          <p class="today-sub">${s.minutes === '<1' ? 'меньше минуты' : `${s.minutes} ${plural(s.minutes, 'минута', 'минуты', 'минут')}`} занятий сегодня ·
            серия ${s.streak} ${plural(s.streak, 'день', 'дня', 'дней')}</p>
          <p class="today-coach">${COACH.summary}</p>
          <button class="btn-primary" id="today-home" type="button">На главную</button>
        </div>
      </div>`;
    document.getElementById('today-home').addEventListener('click', () => ER.switchTab('today'));
    window.scrollTo(0, 0);
  }

  return { init, render, bind, start, resume, showSummary };
})();

if (typeof window !== 'undefined') window.TodayUI = TodayUI;
