/* ==========================================================================
   English Reboot — Этап 1: интерфейс лестницы упражнений
   Файл: ladder_ui.js — сессия «Лестница фраз» в тренажёре и кнопка
   «Тренировать по лестнице» на карточке фразы. Логика ступеней — в ladder.js.
   Сессия: N фраз × 3 круга (фразы чередуются), каждая попытка — на текущей
   ступени фразы. Какие фразы взять — решает FSRS (очередь на повтор), новые
   добираются из одной темы.
   Временные версии (честные, с самооценкой — ничего не имитируем):
     • ступень 6 — запись голоса + образец + самооценка   TODO(этап 5): распознавание речи;
     • ступень 7 — ответ + 3 образца + самооценка         TODO(этап 3): проверка по смыслам;
     • ступень 8 — как 7, но реплика из другой ситуации   TODO(этап 4): импров-рулетка.
   ========================================================================== */

const LadderUI = (() => {
  'use strict';

  const ROUNDS = 3;
  const PHRASES_PER_SESSION = 5;
  const MIN_SPOKEN_MS = 1000; // «фраза вслух» засчитывается при записи от 1 секунды
  const MAX_RECORD_MS = 30000;

  // Реплики тренера. TODO(этап 6): вынести в общий файл реплик тренера с его именем.
  const COACH = {
    ok: ['Точно!', 'Есть!', 'Вот это по-американски.', 'Чисто.', 'Да, именно так.'],
    typo: ['Засчитано — только глянь на опечатку.', 'Почти идеально, одна буква сбежала.'],
    miss: ['Не беда — запоминаем и едем дальше.', 'Мимо, но это и есть тренировка.', 'Ошибка — это нормально. Вот как говорят:'],
    up: ['Новая ступень открыта!', 'Шаг вверх!'],
    down: ['Шаг назад, чтобы закрепить.', 'Вернёмся на ступеньку — так надёжнее.'],
    top: ['Фраза пройдена целиком. Она твоя!'],
  };
  const say = (k) => COACH[k][Math.floor(Math.random() * COACH[k].length)];

  let ER = null;
  const st = {
    active: false, items: null, byId: null,
    queue: [], idx: 0, phraseIds: [],
    ladders: {}, fsrsDone: new Set(), exclude: new Set(),
    ex: null, me: null, shownAt: 0, pending: null, spokenThis: false,
    stats: { total: 0, correct: 0, ups: 0, downs: 0, spoken: 0, started: 0 },
    rec: { recorder: null, stream: null, chunks: [], startedAt: 0, url: null, timer: null, active: false },
    audioEl: null, afterFinish: null,
  };

  function init(er) { ER = er; }

  const esc = (s) => (ER ? ER.escapeHtml(String(s == null ? '' : s)) : String(s));
  const recordingSupported = () => !!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const speak = (text, rate) => { if (window.TTS) TTS.speak(text, rate || Number(ER.settings().tts_rate) || 0.8); };
  const hasToneFor = (me) => Ladder.hasTone(me.front);

  /* ---------- Данные ---------- */

  async function loadItems() {
    if (st.items) return st.items;
    const r = await DB.getAll('conversation');
    st.cards = (r.success && r.data) || [];
    st.items = st.cards.filter(Ladder.isUsCard).map(Ladder.itemFromCard);
    st.byId = new Map(st.items.map((x) => [x.id, x]));
    return st.items;
  }

  async function loadDisputes() {
    const r = await DB.getSetting('ladder_disputes');
    const list = (r.success && Array.isArray(r.data)) ? r.data : [];
    st.exclude = new Set(list.map((d) => Ladder.pairKey(d.cardId, d.otherId)));
    return list;
  }

  async function spokenToday() {
    const r = await DB.getStudyLog(SRS.todayStr());
    return (r.success && r.data && r.data.spoken) || 0;
  }

  /* ---------- Экран настройки (вкладка «Тренажёр» → «Лестница») ---------- */

  async function renderSetup() {
    const themes = window.US_THEMES || [];
    const spoken = await spokenToday();
    return `
      <div class="ladder-setup">
        <h3 class="card-title">Лестница фраз</h3>
        <p class="practice-intro">Каждая фраза проходит 8 ступеней: от «узнай на слух» до импровизации.
          Три верных подряд (или 4 из 5) — открывается следующая. Ошибка — шаг назад, это нормально.</p>
        ${stepsLegendHtml()}
        <div class="setup-row">
          <label for="ladder-theme">Тема новых фраз</label>
          <select id="ladder-theme" class="setting-select">
            <option value="">Любая (продолжить по порядку)</option>
            ${themes.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}
          </select>
        </div>
        <button class="btn-primary" id="ladder-start" type="button">Начать</button>
        <p class="setting-hint">Сначала — фразы, которые пора повторить (решает FSRS), потом новые.
          ${spoken ? `Сегодня ты сказал вслух: <b>${spoken}</b> ${ER.plural(spoken, 'фразу', 'фразы', 'фраз')}.` : ''}</p>
      </div>`;
  }

  function stepsLegendHtml() {
    return `<ol class="ladder-legend">${Ladder.STEPS.map((s) =>
      `<li><span class="ladder-legend-n">${s.n}</span>${s.title}</li>`).join('')}</ol>`;
  }

  function bindSetup() {
    const btn = document.getElementById('ladder-start');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const theme = document.getElementById('ladder-theme').value;
      startSession(theme);
    });
  }

  /* ---------- Очередь ---------- */

  async function pickPhrases(theme, count) {
    const items = await loadItems();
    const prog = await DB.getAllProgress();
    const progress = new Map(((prog.success && prog.data) || []).map((r) => [r.cardId, r]));
    const inTheme = (x) => !theme || x.theme === theme;
    // 1) FSRS: что пора повторить
    const due = (await SRS.getDueCards()).filter((c) => st.byId.has(c.cardId) && inTheme(st.byId.get(c.cardId)));
    const ids = due.slice(0, count).map((c) => c.cardId);
    // 2) Новые — из одной темы, чтобы урок был связным
    if (ids.length < count) {
      const fresh = items.filter((x) => !progress.has(x.id) && !ids.includes(x.id));
      const topic = theme || (fresh[0] && fresh[0].theme);
      fresh.filter((x) => x.theme === topic).slice(0, count - ids.length).forEach((x) => ids.push(x.id));
    }
    return { ids, progress };
  }

  async function startSession(theme) {
    await loadItems();
    const { ids, progress } = await pickPhrases(theme, PHRASES_PER_SESSION);
    if (!ids.length) { ER.toast('В этой теме все фразы уже в работе — FSRS вернёт их, когда придёт время', 'info'); return; }
    begin(ids, progress, () => ER.switchTab('practice'));
  }

  // Одна фраза с карточки: 3 попытки подряд на её текущей ступени
  async function startSingle(cardId) {
    await loadItems();
    if (!st.byId.has(cardId)) { ER.toast('Лестница пока есть только для американских разговорных фраз'); return; }
    const r = await DB.getProgressByCardId(cardId);
    const progress = new Map(r.success && r.data ? [[cardId, r.data]] : []);
    begin([cardId], progress, () => ER.openCardAnywhere('conversation', cardId));
  }

  async function begin(ids, progress, afterFinish) {
    await loadDisputes();
    st.active = true;
    st.phraseIds = ids;
    st.queue = [];
    for (let r = 0; r < ROUNDS; r++) ids.forEach((id) => st.queue.push(id));
    st.idx = 0;
    st.ladders = {};
    ids.forEach((id) => { st.ladders[id] = Ladder.normalize(progress.get(id) && progress.get(id).ladder); });
    const today = SRS.todayStr();
    st.fsrsDone = new Set(ids.filter((id) => {
      const p = progress.get(id);
      return p && String(p.lastReview || '').slice(0, 10) === today;
    }));
    st.stats = { total: 0, correct: 0, ups: 0, downs: 0, spoken: 0, started: Date.now() };
    st.afterFinish = afterFinish;
    renderExercise();
  }

  /* ---------- Экран упражнения ---------- */

  function dotsHtml(ladder, me) {
    const tone = hasToneFor(me);
    return `<div class="ladder-dots" aria-label="Ступень ${ladder.step} из 8">${Ladder.STEPS.map((s) => {
      const skipped = s.n === Ladder.TONE_STEP && !tone;
      const cls = skipped ? 'is-skipped' : s.n < ladder.step ? 'is-done' : s.n === ladder.step ? 'is-current' : '';
      const title = skipped ? 'Для этой фразы пока нет вариантов тона — ступень пропускается' : s.title;
      return `<span class="ladder-dot ${cls}" title="${esc(title)}">${s.n}</span>`;
    }).join('')}</div>`;
  }

  // Слова фразы с американским IPA и русской транскрипцией. Разметку слов (IPA, ударение,
  // немые буквы) берём из примеров разговорных карточек — она уже дозаполнена lex_us.js;
  // чего там нет — из LEX_US (CMU dict).
  const bareOf = (w) => String(w || '').toLowerCase().replace(/[^a-z']/g, '').replace(/^'+|'+$/g, '');
  function wordIndex() {
    if (st.wordParts) return st.wordParts;
    const map = new Map();
    (st.cards || []).forEach((c) => ((c.payload && c.payload.examples) || []).forEach((ex) =>
      (ex.parts || []).forEach((p) => { const b = bareOf(p.word); if (b && p.ipa && !map.has(b)) map.set(b, p); })));
    st.wordParts = map;
    return map;
  }
  function partsFor(text) {
    const idx = wordIndex();
    const lex = window.LEX_US || {};
    return String(text).split(/\s+/).filter(Boolean).map((tok) => {
      const b = bareOf(tok);
      const known = idx.get(b);
      if (known) return { ...known, word: tok };
      const rec = lex[b] || lex[b.replace(/'s$/, '')];
      if (!rec) return { word: tok };
      const [ipa, stress] = rec.split('|');
      return stress !== undefined ? { word: tok, ipa: '/' + ipa + '/', stress: Number(stress) } : { word: tok, ipa: '/' + ipa + '/' };
    });
  }

  function phraseHtml(text) {
    const body = window.Annotate ? Annotate.renderParts(partsFor(text)) : esc(text);
    return `<div class="ladder-phrase"><div class="example-text">${body}</div>${audioBtn(text, 'Прослушать')}</div>`;
  }

  function audioBtn(text, label) {
    return `<button class="audio-btn" data-speech="${esc(text)}" type="button" title="${label}" aria-label="${label}">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>
    </button>`;
  }

  function cueHtml(cue, label) {
    if (!cue) return '';
    return `<div class="ladder-cue"><span class="ladder-cue-label">${label || 'Собеседник'}:</span>
      <span class="ladder-cue-text">«${esc(cue)}»</span>${audioBtn(cue, 'Прослушать реплику')}</div>`;
  }

  function renderExercise() {
    if (st.idx >= st.queue.length) { finish(); return; }
    const id = st.queue[st.idx];
    const me = st.byId.get(id);
    let ladder = st.ladders[id];
    if (ladder.step === Ladder.TONE_STEP && !hasToneFor(me)) ladder = st.ladders[id] = { ...ladder, step: Ladder.TONE_STEP + 1 };
    const ex = Ladder.buildExercise(ladder.step, me, st.items, { exclude: st.exclude });
    st.ex = ex; st.me = me; st.pending = null; st.spokenThis = false; st.shownAt = Date.now();
    resetRecording();

    const step = Ladder.STEPS[ex.step - 1];
    const pct = Math.round((st.idx / st.queue.length) * 100);
    document.getElementById('content').innerHTML = `
      <div class="section-wrap">
        <div class="card ladder-card" id="ladder-root" data-step="${ex.step}" data-kind="${ex.kind}">
          <div class="session-progress"><div class="session-progress-fill" style="width:${pct}%"></div></div>
          <div class="ladder-head">
            <p class="session-counter">Упражнение ${st.idx + 1} из ${st.queue.length} · ${esc(me.theme)}</p>
            ${dotsHtml(ladder, me)}
          </div>
          <h2 class="ladder-step-title"><span class="ladder-step-n">Ступень ${ex.step}</span> ${step.title}</h2>
          <p class="ladder-prompt">${esc(ex.prompt)}</p>
          ${bodyHtml(ex, me)}
          <div class="ladder-feedback" id="ladder-feedback" aria-live="polite"></div>
          <div class="ladder-actions" id="ladder-actions">
            <button class="btn btn-ghost" id="ladder-quit" type="button">Закончить</button>
          </div>
        </div>
      </div>`;
    bindExercise(ex);
    if (ex.step === 1) setTimeout(() => speak(ex.audio), 250);
  }

  function bodyHtml(ex, me) {
    switch (ex.kind) {
      case 'choice': {
        const head = ex.step === 1
          ? `<div class="ladder-listen"><button class="btn-primary ladder-play" type="button" data-say="${esc(ex.audio)}">▶ Прослушать ещё раз</button>
              <button class="btn btn-ghost ladder-play" type="button" data-say="${esc(ex.audio)}" data-rate="0.55">🐢 Медленно</button></div>`
          : cueHtml(ex.cue);
        return `${head}<div class="ladder-options">${ex.options.map((o, i) =>
          `<button class="ladder-opt" type="button" data-i="${i}">${esc(o)}</button>`).join('')}</div>`;
      }
      case 'assemble':
        return `${cueHtml(ex.cue)}
          <div class="ladder-answer" id="ladder-answer" aria-label="Собранная фраза"><span class="ladder-placeholder">Нажимай на слова по порядку</span></div>
          <div class="ladder-bank" id="ladder-bank">${ex.bank.map((w, i) =>
            `<button class="ladder-word" type="button" data-i="${i}">${esc(w)}</button>`).join('')}</div>
          <div class="ladder-row"><button class="btn-primary" id="ladder-check" type="button">Проверить</button>
            <button class="btn btn-ghost" id="ladder-reset" type="button">Сбросить</button></div>`;
      case 'type':
        return `${cueHtml(ex.cue)}
          <input class="ladder-input" id="ladder-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" lang="en" placeholder="Пиши по-английски…">
          <div class="ladder-row"><button class="btn-primary" id="ladder-check" type="button">Проверить</button>
            <button class="btn btn-ghost" id="ladder-giveup" type="button">Не помню</button></div>`;
      case 'say':
        return `${cueHtml(ex.cue)}
          <p class="ladder-sub">Ответь вслух вот так:</p>
          ${phraseHtml(ex.text)}
          <p class="ladder-sub">«${esc(me.ru)}»</p>
          ${recorderHtml()}
          <div class="ladder-self" id="ladder-self">
            <p class="ladder-sub">Сравни с образцом: похоже звучит?</p>
            <div class="ladder-row">
              <button class="btn-primary ladder-selfbtn" type="button" data-ok="1">Звучит похоже</button>
              <button class="btn btn-ghost ladder-selfbtn" type="button" data-ok="0">Ещё потренирую</button>
            </div>
          </div>
          <p class="setting-hint">Временная версия: автоматической проверки произношения пока нет — оцениваешь сам.</p>`;
      case 'own':
      case 'improv':
        return `${ex.mood ? `<p class="ladder-mood">🎭 ${esc(ex.mood.ru)}</p>` : ''}${cueHtml(ex.cue)}
          <textarea class="ladder-input ladder-textarea" id="ladder-input" rows="2" lang="en" spellcheck="false"
            placeholder="Напиши ответ или скажи его вслух…"></textarea>
          ${recorderHtml()}
          <div class="ladder-row" id="ladder-done-row"><button class="btn-primary" id="ladder-done" type="button">Готово — показать образцы</button></div>
          <p class="setting-hint">Временная версия: ответ своими словами пока не проверяется автоматически — покажем образцы, оценишь сам.</p>`;
      default:
        return '';
    }
  }

  function recorderHtml() {
    if (!recordingSupported()) {
      return `<p class="setting-hint">Запись голоса недоступна в этом браузере — скажи вслух без записи
        (в счётчик «фраз вслух» такие попытки не попадают).</p>`;
    }
    return `<div class="ladder-rec">
      <button class="btn" id="ladder-rec" type="button">🎙 Записать себя</button>
      <button class="btn btn-ghost" id="ladder-rec-stop" type="button" hidden>■ Стоп</button>
      <button class="btn btn-ghost" id="ladder-rec-play" type="button" hidden>▶ Послушать себя</button>
      <span class="ladder-rec-status" id="ladder-rec-status" aria-live="polite"></span>
    </div>`;
  }

  /* ---------- События ---------- */

  function bindExercise(ex) {
    const root = document.getElementById('ladder-root');
    root.addEventListener('click', (e) => {
      const play = e.target.closest('.ladder-play');
      if (play) { speak(play.dataset.say, play.dataset.rate ? Number(play.dataset.rate) : undefined); return; }
      const opt = e.target.closest('.ladder-opt');
      if (opt && !st.pending) { answerChoice(Number(opt.dataset.i)); return; }
      const word = e.target.closest('.ladder-word');
      if (word && !st.pending) { moveWord(word); return; }
      const self = e.target.closest('.ladder-selfbtn');
      if (self && !st.pending) { answerSelf(self.dataset.ok === '1'); return; }
      if (e.target.closest('#ladder-check') && !st.pending) { check(); return; }
      if (e.target.closest('#ladder-giveup') && !st.pending) { answerTyped(true); return; }
      if (e.target.closest('#ladder-reset')) { resetAssemble(); return; }
      if (e.target.closest('#ladder-done') && !st.pending) { revealOwn(); return; }
      if (e.target.closest('#ladder-next')) { next(); return; }
      if (e.target.closest('#ladder-dispute')) { dispute(); return; }
      if (e.target.closest('#ladder-quit')) { finish(); return; }
      if (e.target.closest('#ladder-rec')) { startRecording(); return; }
      if (e.target.closest('#ladder-rec-stop')) { stopRecording(); return; }
      if (e.target.closest('#ladder-rec-play')) { playRecording(); return; }
    });
    const input = document.getElementById('ladder-input');
    if (input) {
      if (ex.kind === 'type') input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !st.pending) check(); });
      setTimeout(() => input.focus(), 50);
    }
  }

  function check() {
    if (st.ex.kind === 'type') answerTyped(false);
    else if (st.ex.kind === 'assemble') answerAssemble();
  }

  // Ступени 1, 2, 5
  function answerChoice(i) {
    const ex = st.ex;
    const ok = i === ex.correct;
    document.querySelectorAll('.ladder-opt').forEach((b, j) => {
      b.disabled = true;
      if (j === ex.correct) b.classList.add('is-correct');
      else if (j === i) b.classList.add('is-wrong');
    });
    let extra = '';
    if (ex.step === 5 && ex.toneVariants) extra = toneTableHtml(ex.toneVariants, ex.tone);
    const canDispute = !ok && ex.disputable;
    settle(ok, { extra, chosen: ex.options[i], canDispute });
  }

  function toneTableHtml(t, active) {
    const rows = Object.keys(Ladder.TONE_LABELS).map((k) =>
      `<li class="${k === active ? 'is-active' : ''}"><span class="ladder-tone-label">${esc(Ladder.TONE_LABELS[k])}</span>
        <span class="ladder-tone-text">${esc(t[k])}</span>${audioBtn(t[k], 'Прослушать')}</li>`).join('');
    return `<ul class="ladder-tones">${rows}</ul>`;
  }

  // Ступень 3
  function moveWord(btn) {
    const answer = document.getElementById('ladder-answer');
    const bank = document.getElementById('ladder-bank');
    const ph = answer.querySelector('.ladder-placeholder');
    if (ph) ph.remove();
    (btn.parentElement === bank ? answer : bank).appendChild(btn);
    if (!answer.querySelector('.ladder-word')) answer.innerHTML = '<span class="ladder-placeholder">Нажимай на слова по порядку</span>';
  }
  function resetAssemble() {
    const bank = document.getElementById('ladder-bank');
    const answer = document.getElementById('ladder-answer');
    if (!bank || !answer || st.pending) return;
    [...bank.querySelectorAll('.ladder-word'), ...answer.querySelectorAll('.ladder-word')]
      .sort((a, b) => Number(a.dataset.i) - Number(b.dataset.i)).forEach((b) => bank.appendChild(b));
    answer.innerHTML = '<span class="ladder-placeholder">Нажимай на слова по порядку</span>';
  }
  function answerAssemble() {
    const picked = [...document.querySelectorAll('#ladder-answer .ladder-word')].map((b) => st.ex.bank[Number(b.dataset.i)]);
    if (!picked.length) { ER.toast('Собери фразу из слов'); return; }
    const ok = Ladder.checkAssembled(picked, st.ex.answer);
    document.querySelectorAll('.ladder-word').forEach((b) => { b.disabled = true; });
    document.getElementById('ladder-answer').classList.add(ok ? 'is-correct' : 'is-wrong');
    const traps = st.ex.traps.filter((t) => picked.includes(t));
    const extra = !ok && traps.length ? `<p class="ladder-sub">Слова-ловушки: ${traps.map((t) => '«' + esc(t) + '»').join(', ')} — в этой фразе лишние.</p>` : '';
    settle(ok, { extra });
  }

  // Ступень 4
  function answerTyped(gaveUp) {
    const input = document.getElementById('ladder-input');
    const val = input ? input.value : '';
    if (!gaveUp && !val.trim()) { ER.toast('Напиши фразу — или нажми «Не помню»'); return; }
    const r = gaveUp ? { ok: false, typos: [] } : Ladder.checkTyped(val, st.ex.answer);
    if (input) { input.disabled = true; input.classList.add(r.ok ? 'is-correct' : 'is-wrong'); }
    const extra = r.ok && r.typos.length
      ? `<p class="ladder-sub">Опечатка: ${r.typos.map((t) => `<s>${esc(t.got)}</s> → <b>${esc(t.want)}</b>`).join(', ')}</p>` : '';
    settle(r.ok, { extra, typo: r.ok && r.typos.length > 0 });
  }

  // Ступени 7–8: сначала образцы, потом самооценка
  function revealOwn() {
    const input = document.getElementById('ladder-input');
    const text = input ? input.value.trim() : '';
    if (!text && !st.spokenThis) { ER.toast('Напиши ответ или запиши его голосом'); return; }
    if (st.rec.active) stopRecording();
    if (input) input.disabled = true;
    const used = text ? Ladder.usesPhrase(text, st.me.front) : null;
    const usedLine = used === null ? ''
      : used ? `<p class="ladder-fact is-ok">✓ В ответе есть «${esc(st.me.front)}».</p>`
        : `<p class="ladder-fact">Фразы «${esc(st.me.front)}» в ответе не нашлось — попробуй вставить её в следующий раз.</p>`;
    const label = st.ex.kind === 'improv'
      ? 'Как эта фраза звучит в живой речи (это примеры, а не единственно верный ответ):'
      : 'Как ответил бы носитель — сравни со своим:';
    document.getElementById('ladder-feedback').innerHTML = `
      ${usedLine}
      <p class="ladder-sub">${label}</p>
      <ul class="ladder-samples">${st.ex.samples.map((s) => `<li>${esc(s)} ${audioBtn(s, 'Прослушать')}</li>`).join('')}</ul>
      <p class="ladder-sub">Твой ответ подходит по смыслу и звучит естественно?</p>`;
    document.getElementById('ladder-actions').innerHTML = `
      <button class="btn-primary ladder-selfbtn" type="button" data-ok="1">Да, подходит</button>
      <button class="btn btn-ghost ladder-selfbtn" type="button" data-ok="0">Пока не очень</button>`;
    const doneRow = document.getElementById('ladder-done-row');
    if (doneRow) doneRow.remove();
  }

  // Ступени 6–8: самооценка
  function answerSelf(ok) {
    if (st.rec.active) stopRecording();
    document.querySelectorAll('.ladder-selfbtn').forEach((b) => { b.disabled = true; });
    settle(ok, { self: true });
  }

  /* ---------- Итог попытки ---------- */

  function settle(ok, o) {
    const opts = o || {};
    const id = st.me.id;
    const prev = st.ladders[id];
    const r = Ladder.applyAnswer(prev, ok, { hasTone: hasToneFor(st.me), today: SRS.todayStr() });
    st.pending = { ok, prev, result: r, answerTime: Math.round((Date.now() - st.shownAt) / 1000), chosen: opts.chosen };

    const line = ok ? (opts.typo ? say('typo') : say('ok')) : say('miss');
    const event = r.event === 'up' ? `<p class="ladder-event is-up">${say('up')} Дальше: ступень ${r.to} — ${Ladder.STEPS[r.to - 1].title}.</p>`
      : r.event === 'down' ? `<p class="ladder-event is-down">${say('down')} Ступень ${r.to} — ${Ladder.STEPS[r.to - 1].title}.</p>`
        : r.event === 'top' ? `<p class="ladder-event is-up">${say('top')}</p>` : '';
    const correctBlock = (!ok && !opts.self) || st.ex.step === 1 || st.ex.step === 3 || st.ex.step === 4
      ? `<p class="ladder-sub">${ok ? 'Фраза' : 'Правильно'}: «${esc(st.me.ru)}»</p>${phraseHtml(st.ex.step === 2 ? st.me.b : st.me.front)}` : '';
    const fb = document.getElementById('ladder-feedback');
    const keepSamples = opts.self && (st.ex.kind === 'own' || st.ex.kind === 'improv') ? fb.innerHTML : '';
    fb.innerHTML = `${keepSamples}
      <div class="ladder-verdict ${ok ? 'is-ok' : 'is-miss'}"><b>${line}</b></div>
      ${opts.extra || ''}${correctBlock}${event}`;
    document.getElementById('ladder-actions').innerHTML = `
      ${opts.canDispute ? '<button class="btn btn-ghost" id="ladder-dispute" type="button">Мой вариант тоже подходит</button>' : ''}
      <button class="btn-primary" id="ladder-next" type="button">Дальше →</button>`;
    const nb = document.getElementById('ladder-next');
    if (nb) nb.focus();
    if (!ok) speak(st.ex.step === 2 ? st.me.b : st.me.front);
  }

  // «Мой вариант тоже подходит»: попытка не засчитывается ни в плюс, ни в минус,
  // пара больше не попадёт в вопрос, а спор сохраняется для ручной проверки автором.
  async function dispute() {
    const p = st.pending;
    if (!p || p.disputed) return;
    p.disputed = true;
    const otherId = st.ex.distractorIds && st.ex.distractorIds.find((x) => st.byId.get(x).b === p.chosen);
    if (otherId) {
      const list = await loadDisputes();
      list.push({ cardId: st.me.id, otherId, cue: st.me.a, expected: st.me.b, chosen: p.chosen, date: SRS.todayStr() });
      await DB.saveSetting('ladder_disputes', list);
      st.exclude.add(Ladder.pairKey(st.me.id, otherId));
    }
    document.getElementById('ladder-feedback').innerHTML = `
      <div class="ladder-verdict is-ok"><b>Принято. Этот вопрос не засчитан — и в такой паре больше не появится.</b></div>
      <p class="ladder-sub">Спорные пары сохраняются, чтобы автор курса проверил их вручную.</p>`;
    const d = document.getElementById('ladder-dispute');
    if (d) d.remove();
  }

  async function next() {
    const p = st.pending;
    if (!p) return;
    const nb = document.getElementById('ladder-next');
    if (nb) nb.disabled = true;
    if (!p.disputed) {
      const id = st.me.id;
      const fsrsAction = st.fsrsDone.has(id) ? null : (p.ok ? 'know' : 'dontknow');
      const res = await Ladder.saveResult(id, p.result.ladder, fsrsAction, p.answerTime);
      if (!res.success) {
        ER.toast('Не удалось сохранить прогресс: ' + res.error, 'danger');
        if (nb) nb.disabled = false;
        return;
      }
      st.fsrsDone.add(id);
      st.ladders[id] = res.data.ladder;
      st.stats.total++;
      if (p.ok) st.stats.correct++;
      if (p.result.event === 'up' || p.result.event === 'top') st.stats.ups++;
      if (p.result.event === 'down') st.stats.downs++;
    }
    st.idx++;
    renderExercise();
  }

  /* ---------- Запись голоса ---------- */

  function setRecUI() {
    const a = document.getElementById('ladder-rec');
    const s = document.getElementById('ladder-rec-stop');
    const p = document.getElementById('ladder-rec-play');
    if (a) a.hidden = st.rec.active;
    if (s) s.hidden = !st.rec.active;
    if (p) p.hidden = st.rec.active || !st.rec.url;
  }
  function recStatus(text) { const el = document.getElementById('ladder-rec-status'); if (el) el.textContent = text; }

  async function startRecording() {
    if (st.rec.active || !recordingSupported()) return;
    if (window.TTS) TTS.stopSpeaking();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      st.rec = { ...st.rec, stream, recorder, chunks: [], startedAt: Date.now(), active: true };
      recorder.ondataavailable = (e) => { if (e.data && e.data.size) st.rec.chunks.push(e.data); };
      recorder.onstop = () => onRecordingStopped(Date.now() - st.rec.startedAt);
      recorder.start();
      st.rec.timer = setTimeout(stopRecording, MAX_RECORD_MS);
      recStatus('Говори…');
      setRecUI();
    } catch (err) {
      recStatus('');
      ER.toast('Нет доступа к микрофону: ' + ((err && err.message) || err), 'danger');
    }
  }

  function stopRecording() {
    clearTimeout(st.rec.timer);
    if (st.rec.recorder && st.rec.recorder.state !== 'inactive') st.rec.recorder.stop();
  }

  async function onRecordingStopped(ms) {
    const r = st.rec;
    if (r.stream) r.stream.getTracks().forEach((t) => t.stop());
    if (r.url) URL.revokeObjectURL(r.url);
    const blob = new Blob(r.chunks, { type: (r.recorder && r.recorder.mimeType) || 'audio/webm' });
    st.rec = { ...r, active: false, stream: null, url: URL.createObjectURL(blob) };
    setRecUI();
    if (ms >= MIN_SPOKEN_MS) {
      if (!st.spokenThis) {
        st.spokenThis = true;
        st.stats.spoken++;
        await DB.addSpoken(SRS.todayStr(), 1);
      }
      recStatus('Записано ✓ Послушай себя и сравни с образцом.');
    } else {
      recStatus('Слишком коротко — скажи фразу целиком (от 1 секунды).');
    }
  }

  function playRecording() {
    if (!st.rec.url) return;
    if (!st.audioEl) st.audioEl = new Audio();
    st.audioEl.src = st.rec.url;
    st.audioEl.play().catch(() => {});
  }

  function resetRecording() {
    clearTimeout(st.rec.timer);
    if (st.rec.recorder && st.rec.recorder.state !== 'inactive') {
      st.rec.recorder.onstop = null;
      st.rec.recorder.stop();
    }
    if (st.rec.stream) st.rec.stream.getTracks().forEach((t) => t.stop());
    if (st.rec.url) URL.revokeObjectURL(st.rec.url);
    st.rec = { recorder: null, stream: null, chunks: [], startedAt: 0, url: null, timer: null, active: false };
  }

  /* ---------- Завершение ---------- */

  async function finish() {
    if (!st.active) return;
    st.active = false;
    resetRecording();
    if (window.TTS) TTS.stopSpeaking();
    const s = st.stats;
    const minutes = Math.max(1, Math.round((Date.now() - s.started) / 60000));
    if (s.total) {
      await ER.addStudyLog(st.phraseIds.length, s.correct, minutes * 60);
      await SRS.updateStreak();
      ER.refreshHeaderStats();
    }
    const after = st.afterFinish;
    ER.showModal(`
      <h3 id="ladder-summary-title">Готово! 🪜</h3>
      <div class="session-result ladder-summary">
        <p>Ты сказал вслух: <strong>${s.spoken}</strong> ${ER.plural(s.spoken, 'фразу', 'фразы', 'фраз')}</p>
        <p>Открыл ступеней: <strong>${s.ups}</strong>${s.downs ? ` · шагов назад: ${s.downs}` : ''}</p>
        <p>Верных ответов: <strong>${s.correct}</strong> из ${s.total}</p>
      </div>
      <div class="session-actions">
        <button class="btn-primary" id="ladder-again" type="button">Ещё круг</button>
        <button class="btn btn-ghost" id="ladder-close" type="button">Закрыть</button>
      </div>`, {
      'ladder-again': () => { ER.closeModal(); begin(st.phraseIds, new Map(st.phraseIds.map((id) => [id, { ladder: st.ladders[id], lastReview: SRS.todayStr() }])), after); },
      'ladder-close': () => { ER.closeModal(); if (after) after(); },
    });
  }

  // Переключение раздела: освобождаем микрофон и глушим озвучку
  function stop() {
    if (!st.active) return;
    st.active = false;
    resetRecording();
    if (window.TTS) TTS.stopSpeaking();
  }

  // Ступень фразы для бейджа на карточке
  const stepOf = (rec) => Ladder.normalize(rec && rec.ladder).step;

  return { init, renderSetup, bindSetup, startSession, startSingle, stop, stepOf, isActive: () => st.active };
})();

if (typeof window !== 'undefined') window.LadderUI = LadderUI;
