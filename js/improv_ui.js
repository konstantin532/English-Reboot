/* ==========================================================================
   English Reboot — Этап 4: интерфейс импровизации
   Файл: improv_ui.js
   • round(el, spec, done) — один раунд: ситуация и реплика → 5 с подумать →
     таймер 20/30 с (+10 с) с записью голоса → по желанию ответ текстом (тогда
     условие проверяется честно) → образцы носителя, подсказка тона → самооценка.
     Используют: рулетка (Тренажёр), ступень 8 лестницы, урок «Сегодня».
   • Импров-рулетка и режим «Yes, and…» в «Тренажёре».
   • lessonBlock — N спинов в конце урока «Сегодня».
   Голос до этапа 5 автоматически не проверяется — так и пишем.
   ========================================================================== */

const ImprovUI = (() => {
  'use strict';

  const KEY = 'improv';
  const MIN_SPOKEN_MS = 1000;
  // Скорость таймеров: в тестах ускоряется (configure({ secondMs: 50 }))
  const cfg = { secondMs: 1000, thinkSec: Improv.THINK_SEC };

  // Реплики тренера. TODO(этап 6): перенести в общий файл реплик тренера.
  const COACH = {
    think: 'Подумай пару секунд — не над грамматикой, а над тем, ЧТО сказать.',
    talk: 'Говори! Ошибки — нормально, главное не молчать.',
    condOk: 'Условие выполнено',
    condMiss: 'Фразы-условия в тексте не нашлось — в следующий раз вверни её.',
    voiceOnly: 'Ответ голосом пока не проверяется автоматически — сравни с образцами.',
  };

  let ER = null;
  const st = { active: false, timer: null, rec: null, audioEl: null };

  function init(er) { ER = er; }
  function configure(o) { Object.assign(cfg, o || {}); }
  const esc = (s) => (ER ? ER.escapeHtml(String(s == null ? '' : s)) : String(s));
  const speak = (text, rate) => { if (window.TTS) TTS.speak(text, rate || Number(ER.settings().tts_rate) || 0.85); };
  const recordingSupported = () => !!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const tones = () => window.TONE_VARIANTS || {};
  const level = () => (ER && ER.settings().currentLevel) || null;
  const trapsHtml = (text) => (window.TrapsUI ? TrapsUI.placeholder(text, { compact: true }) : '');
  const audioBtn = (text) => `<button class="audio-btn imp-say" type="button" data-say="${esc(text)}" title="Прослушать" aria-label="Прослушать">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg></button>`;

  /* ---------- Хранение ---------- */

  async function loadStats() {
    const r = await DB.getSetting(KEY);
    return Improv.normalizeStats(r.success ? r.data : null);
  }
  async function saveRound(round, seconds) {
    const r = await DB.getSetting(KEY);
    await DB.saveSetting(KEY, Improv.recordRound(r.success ? r.data : null, round));
    if (seconds > 0) {
      await DB.saveStudyLog(SRS.todayStr(), 0, 0, seconds);
      await SRS.updateStreak();
      ER.refreshHeaderStats();
    }
  }

  /* ---------- Запись голоса ---------- */

  function newRecorder(onSpoken) {
    const r = { recorder: null, stream: null, chunks: [], startedAt: 0, url: null, active: false, spoken: false };
    r.start = async () => {
      if (r.active || !recordingSupported()) return false;
      if (window.TTS) TTS.stopSpeaking();
      try {
        r.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        r.recorder = new MediaRecorder(r.stream);
        r.chunks = [];
        r.recorder.ondataavailable = (e) => { if (e.data && e.data.size) r.chunks.push(e.data); };
        r.recorder.onstop = async () => {
          const ms = Date.now() - r.startedAt;
          if (r.stream) r.stream.getTracks().forEach((t) => t.stop());
          if (r.url) URL.revokeObjectURL(r.url);
          r.url = URL.createObjectURL(new Blob(r.chunks, { type: r.recorder.mimeType || 'audio/webm' }));
          r.active = false;
          if (ms >= MIN_SPOKEN_MS && !r.spoken) { r.spoken = true; await DB.addSpoken(SRS.todayStr(), 1); }
          if (r.onStopped) r.onStopped(ms);
          if (onSpoken && r.spoken) onSpoken();
        };
        r.startedAt = Date.now();
        r.recorder.start();
        r.active = true;
        return true;
      } catch (e) {
        ER.toast('Нет доступа к микрофону: ' + ((e && e.message) || e), 'danger');
        return false;
      }
    };
    r.stop = () => { if (r.recorder && r.recorder.state !== 'inactive') r.recorder.stop(); };
    r.play = () => {
      if (!r.url) return;
      if (!st.audioEl) st.audioEl = new Audio();
      st.audioEl.src = r.url;
      st.audioEl.play().catch(() => {});
    };
    r.dispose = () => {
      if (r.recorder && r.recorder.state !== 'inactive') { r.recorder.onstop = null; r.recorder.stop(); }
      if (r.stream) r.stream.getTracks().forEach((t) => t.stop());
      if (r.url) URL.revokeObjectURL(r.url);
    };
    return r;
  }

  function clearTimer() { if (st.timer) { clearInterval(st.timer); st.timer = null; } }

  /* ---------- Раунд ---------- */

  /**
   * spec: { place, situation, who, say, mood, condition, samples, seconds, autoAccept, cardId }
   * done({ recorded, condition: true|false|null, selfOk, seconds, cardId })
   */
  function round(el, spec, done) {
    clearTimer();
    if (st.rec) st.rec.dispose();
    const rec = newRecorder();
    st.rec = rec;
    st.active = true;
    const startedAt = Date.now();
    const seconds = spec.seconds || Improv.timerFor(level());
    const mood = spec.mood || null;
    el.innerHTML = `
      <div class="imp-round" id="imp-round" data-phase="card">
        <div class="imp-situation">
          ${spec.place ? `<span class="imp-place">${esc(spec.place)}</span>` : ''}
          <p>${esc(spec.situation)}</p>
        </div>
        ${mood ? `<p class="imp-mood" data-mood="${mood.id}">${mood.icon} ${esc(mood.ru)} — <span>${esc(mood.hint)}</span></p>` : ''}
        <div class="scene-msg is-them"><span class="scene-avatar" style="--av:#0EA5E9">${esc((spec.who || '?').charAt(0))}</span>
          <div class="scene-bubble"><span class="scene-name">${esc(spec.who || '')}</span><span class="scene-text">${esc(spec.say)}</span>${audioBtn(spec.say)}</div></div>
        ${spec.condition ? `<p class="imp-cond">Вверни фразу: <b>«${esc(spec.condition)}»</b> ${audioBtn(spec.condition)}</p>` : ''}
        <div class="imp-stage" id="imp-stage"></div>
      </div>`;
    const stage = el.querySelector('#imp-stage');
    const rootEl = el.querySelector('#imp-round');
    const setPhase = (p) => { rootEl.dataset.phase = p; };
    speak(spec.say);

    // 1) подумать
    let thinkLeft = cfg.thinkSec;
    const renderThink = () => {
      stage.innerHTML = `
        <div class="imp-clock is-think"><span class="imp-num" id="imp-num">${thinkLeft}</span><span>подумать</span></div>
        <p class="ladder-sub">${COACH.think}</p>
        <button class="btn-primary" id="imp-go" type="button">Начать сейчас</button>`;
    };
    setPhase('think');
    renderThink();
    st.timer = setInterval(() => {
      thinkLeft--;
      const n = stage.querySelector('#imp-num');
      if (n) n.textContent = Math.max(0, thinkLeft);
      if (thinkLeft <= 0) startTalk();
    }, cfg.secondMs);

    // 2) говорить: таймер + запись
    let timer = null;
    let talking = false;
    async function startTalk() {
      if (talking) return;
      talking = true;
      clearTimer();
      setPhase('talk');
      timer = Improv.createTimer(seconds, 0);
      let ticks = 0;
      stage.innerHTML = `
        <div class="imp-clock is-talk"><span class="imp-num" id="imp-num">${seconds}</span><span>говори</span></div>
        <p class="ladder-sub">${COACH.talk}</p>
        <p class="imp-rec-status" id="imp-rec-status">${recordingSupported() ? '🎙 Запись…' : 'Запись недоступна в этом браузере — говори вслух без записи.'}</p>
        <div class="ladder-row">
          <button class="btn" id="imp-plus" type="button">+10 с</button>
          <button class="btn-primary" id="imp-stop" type="button">Готово</button>
        </div>`;
      await rec.start();
      st.timer = setInterval(() => {
        ticks++;
        const left = Improv.remaining(timer, ticks * 1000);
        const n = stage.querySelector('#imp-num');
        if (n) n.textContent = left;
        if (left <= 0) finishTalk();
      }, cfg.secondMs);
      stage._plus = () => { timer = Improv.addTime(timer); const n = stage.querySelector('#imp-num'); if (n) n.textContent = Improv.remaining(timer, ticks * 1000); };
    }

    // 3) ответ текстом (необязательно) → образцы
    function finishTalk() {
      if (rootEl.dataset.phase !== 'talk') return;
      clearTimer();
      rec.stop();
      setPhase('review');
      stage.innerHTML = `
        <p class="ladder-sub">Можно записать свой ответ текстом — тогда проверим условие. Или сразу к образцам.</p>
        <textarea class="ladder-input ladder-textarea" id="imp-text" rows="2" lang="en" spellcheck="false" placeholder="Что получилось сказать (по-английски)"></textarea>
        <div class="ladder-row">
          ${recordingSupported() ? '<button class="btn btn-ghost" id="imp-play" type="button">▶ Послушать себя</button>' : ''}
          <button class="btn-primary" id="imp-reveal" type="button">Показать образцы</button>
        </div>`;
    }

    // 4) образцы, условие, тон → самооценка
    function reveal() {
      const box = stage.querySelector('#imp-text');
      const text = box ? box.value.trim() : '';
      const cond = spec.condition ? Improv.conditionMet(text, spec.condition, tones()) : null;
      const hint = spec.condition && mood ? Improv.toneHint(spec.condition, mood, tones()) : null;
      setPhase('reveal');
      const condLine = !spec.condition ? ''
        : cond === true ? `<p class="ladder-fact is-ok">✓ ${COACH.condOk}: «${esc(spec.condition)}» прозвучало.</p>`
          : cond === false ? `<p class="ladder-fact">${COACH.condMiss}</p>`
            : `<p class="ladder-fact">${COACH.voiceOnly}</p>`;
      const auto = spec.autoAccept && cond === true;
      stage.innerHTML = `
        ${text ? `<div class="scene-msg is-me"><div class="scene-bubble"><span class="scene-text">${esc(text)}</span></div></div>` : ''}
        ${condLine}
        ${hint ? `<p class="imp-tone">Под настроение «${esc(mood.ru.toLowerCase())}» звучит так: <b>«${esc(hint)}»</b> ${audioBtn(hint)}</p>` : ''}
        <p class="ladder-sub">Как ответил бы носитель (это примеры, а не единственно верный ответ):</p>
        <ul class="ladder-samples">${(spec.samples || []).map((s) => `<li>${esc(s)} ${audioBtn(s)}</li>`).join('')}</ul>
        ${spec.condition ? trapsHtml(spec.condition) : ''}
        ${auto ? '<div class="ladder-row"><button class="btn-primary imp-self" type="button" data-ok="1">Дальше →</button></div>'
          : `<p class="ladder-sub">Получилось ответить по ситуации?</p>
        <div class="ladder-row">
          <button class="btn-primary imp-self" type="button" data-ok="1">Получилось</button>
          <button class="btn btn-ghost imp-self" type="button" data-ok="0">Ещё потренирую</button>
        </div>`}`;
      stage._cond = cond;
    }

    function finish(selfOk) {
      clearTimer();
      rec.dispose();
      st.active = false;
      const secs = Math.round((Date.now() - startedAt) / 1000);
      done({ recorded: rec.spoken, condition: stage._cond === undefined ? null : stage._cond, selfOk, seconds: secs, cardId: spec.cardId || null });
    }

    el.addEventListener('click', function onClick(e) {
      if (!el.contains(rootEl)) { el.removeEventListener('click', onClick); return; }
      const say = e.target.closest('.imp-say');
      if (say) { speak(say.dataset.say); return; }
      if (e.target.closest('#imp-go')) { startTalk(); return; }
      if (e.target.closest('#imp-plus') && stage._plus) { stage._plus(); return; }
      if (e.target.closest('#imp-stop')) { finishTalk(); return; }
      if (e.target.closest('#imp-play')) { rec.play(); return; }
      if (e.target.closest('#imp-reveal')) { reveal(); return; }
      const self = e.target.closest('.imp-self');
      if (self) { el.removeEventListener('click', onClick); finish(self.dataset.ok === '1'); }
    });
  }

  /* ---------- Рулетка: какие карточки крутить ---------- */

  async function spinNext() {
    const [stats, prog, pass] = await Promise.all([loadStats(), DB.getAllProgress(), DB.getSetting('accent_passport')]);
    const cards = window.IMPROV_CARDS || [];
    // знакомые фразы: на лестнице уже ступень 4+
    const byFront = new Map();
    const conv = await DB.getAll('conversation');
    ((conv.success && conv.data) || []).forEach((c) => byFront.set(c.id, c.payload.front));
    const known = new Set(((prog.success && prog.data) || []).filter((r) => r.ladder && r.ladder.step >= 4).map((r) => byFront.get(r.cardId)).filter(Boolean));
    let score = null;
    if (window.AccentTraps && window.TrapsUI && pass.success && pass.data) {
      const weak = AccentTraps.weakTraps(pass.data);
      if (weak.size) {
        const lookup = await TrapsUI.ensureLookup();
        score = (c) => c.phrases.reduce((s, f) => s + AccentTraps.trapIdsOf(f, lookup).filter((t) => weak.has(t)).length, 0);
      }
    }
    return Improv.spin({ cards, recent: stats.recent, known, score });
  }

  const specFromSpin = (s) => ({
    place: s.card.place, situation: s.card.situation, who: s.card.who, say: s.card.say,
    mood: s.mood, condition: s.condition, samples: s.card.samples, cardId: s.card.id,
  });

  /* ---------- Тренажёр → Импровизация ---------- */

  async function renderSetup() {
    const s = await loadStats();
    const secs = Improv.timerFor(level());
    return `
      <div class="imp-setup">
        <h3 class="card-title">Импровизация</h3>
        <p class="practice-intro">Случайная ситуация, настроение собеседника и фраза, которую надо ввернуть.
          ${Improv.THINK_SEC} секунд подумать — и ${secs} секунд говорить. Без подготовки, как в жизни.</p>
        <div class="imp-modes">
          <button class="btn-primary" id="imp-roulette" type="button">🎲 Крутить рулетку</button>
          <button class="btn" id="imp-yesand" type="button">➕ Yes, and…</button>
        </div>
        <p class="setting-hint">Спинов: <b>${s.spins}</b> · историй «Yes, and…»: <b>${s.yesAnd}</b> · с записью голоса: <b>${s.recorded}</b>
          ${s.condChecked ? ` · условие выполнено: <b>${s.condOk}</b> из ${s.condChecked} проверенных` : ''}</p>
      </div>`;
  }

  function bindSetup() {
    const r = document.getElementById('imp-roulette');
    const y = document.getElementById('imp-yesand');
    if (r) r.addEventListener('click', () => roulette({}));
    if (y) y.addEventListener('click', () => yesAnd({}));
  }

  function screen(title, sub) {
    if (ER && ER.claimContent) ER.claimContent();
    document.getElementById('content').innerHTML = `
      <div class="section-wrap">
        <div class="card imp-card" id="imp-root">
          <div class="scene-head"><div><p class="session-counter">${esc(sub)}</p><h2 class="scene-title">${esc(title)}</h2></div>
            <button class="btn btn-ghost" id="imp-quit" type="button">Закончить</button></div>
          <div id="imp-host"></div>
        </div>
      </div>`;
    window.scrollTo(0, 0);
    return document.getElementById('imp-host');
  }

  /**
   * Серия спинов. opts: { count, title, onFinish, onQuit, onProgress(n) }.
   * Без count — бесконечная рулетка в тренажёре («Ещё спин» / «Закончить»).
   */
  async function roulette(opts) {
    const o = opts || {};
    let n = o.done || 0;
    const total = o.count || 0;
    const next = async () => {
      const s = await spinNext();
      if (!s) { ER.toast('Нет карточек'); return; }
      const host = screen('Импров-рулетка', total ? `Спин ${n + 1} из ${total}` : 'Тренажёр · импровизация');
      document.getElementById('imp-quit').addEventListener('click', () => quit(o));
      round(host, specFromSpin(s), async (res) => {
        await saveRound(res, res.seconds);
        n++;
        if (o.onProgress) await o.onProgress(n);
        if (total && n >= total) { if (o.onFinish) o.onFinish(); return; }
        if (total) { next(); return; }
        host.innerHTML = `<div class="ladder-row imp-after"><button class="btn-primary" id="imp-again" type="button">🎲 Ещё спин</button>
          <button class="btn btn-ghost" id="imp-back" type="button">Закончить</button></div>`;
        host.querySelector('#imp-again').addEventListener('click', next);
        host.querySelector('#imp-back').addEventListener('click', () => ER.openPractice('improv'));
      });
    };
    next();
  }

  function quit(o) {
    stop();
    if (o && o.onQuit) o.onQuit(); else ER.openPractice('improv');
  }

  /* ---------- «Yes, and…» ---------- */

  async function yesAnd(opts) {
    const o = opts || {};
    const stories = window.YES_AND_STORIES || [];
    const story = o.storyId ? stories.find((s) => s.id === o.storyId) : stories[Math.floor(Math.random() * stories.length)];
    if (!story) return;
    const host = screen(story.title, 'Yes, and… · продолжи историю без подготовки');
    document.getElementById('imp-quit').addEventListener('click', () => quit(o));
    const startedAt = Date.now();
    let turn = 0;
    let recordedAny = false;
    const answers = [];
    clearTimer();
    host.innerHTML = `<p class="scene-intro">${esc(story.ru)}</p><div class="scene-feed" id="ya-feed"></div><div class="scene-input" id="ya-input"></div>`;
    const feed = host.querySelector('#ya-feed');
    const input = host.querySelector('#ya-input');
    const rec = newRecorder();
    st.rec = rec;
    st.active = true;

    const showTurn = () => {
      const t = story.turns[turn];
      const el = document.createElement('div');
      el.className = 'scene-msg is-them';
      el.innerHTML = `<span class="scene-avatar" style="--av:#EC4899">M</span><div class="scene-bubble"><span class="scene-name">Maggie</span><span class="scene-text">${esc(t.say)}</span>${audioBtn(t.say)}</div>`;
      feed.appendChild(el);
      speak(t.say);
      input.innerHTML = `
        <p class="scene-prompt">Твой ход ${turn + 1} из ${story.turns.length}: подхвати и продолжи — «Yes, and…»</p>
        <textarea class="ladder-input ladder-textarea" id="ya-text" rows="2" lang="en" spellcheck="false" placeholder="Можно записать ответ текстом (необязательно)"></textarea>
        <div class="ladder-rec">
          <button class="btn" id="ya-rec" type="button">🎙 Записать себя</button>
          <button class="btn btn-ghost" id="ya-rec-stop" type="button" hidden>■ Стоп</button>
          <span class="ladder-rec-status" id="ya-rec-status"></span>
        </div>
        <div class="ladder-row"><button class="btn-primary" id="ya-next" type="button">Дальше →</button></div>`;
    };

    const finishStory = () => {
      rec.dispose();
      st.active = false;
      input.innerHTML = `
        <p class="ladder-fact">Это была импровизация — тут нет единственно верного ответа. Вот как могли бы продолжить носители:</p>
        <ol class="ya-review">${story.turns.map((t, i) => `<li><p class="ya-their">${esc(t.say)}</p>
          ${answers[i] ? `<p class="ya-mine">Ты: ${esc(answers[i])}</p>` : ''}
          <ul class="ladder-samples">${t.samples.map((s) => `<li>${esc(s)} ${audioBtn(s)}</li>`).join('')}</ul></li>`).join('')}</ol>
        <p class="ladder-sub">Получилось поддержать разговор?</p>
        <div class="ladder-row">
          <button class="btn-primary ya-self" type="button" data-ok="1">Получилось</button>
          <button class="btn btn-ghost ya-self" type="button" data-ok="0">Ещё потренирую</button>
        </div>`;
    };

    host.addEventListener('click', async (e) => {
      const say = e.target.closest('.imp-say');
      if (say) { speak(say.dataset.say); return; }
      if (e.target.closest('#ya-rec')) {
        if (await rec.start()) { host.querySelector('#ya-rec').hidden = true; host.querySelector('#ya-rec-stop').hidden = false; host.querySelector('#ya-rec-status').textContent = 'Говори…'; }
        return;
      }
      if (e.target.closest('#ya-rec-stop')) {
        rec.onStopped = (ms) => { const s = host.querySelector('#ya-rec-status'); if (s) s.textContent = ms >= MIN_SPOKEN_MS ? 'Записано ✓' : 'Слишком коротко — от 1 секунды.'; };
        rec.stop();
        host.querySelector('#ya-rec').hidden = false; host.querySelector('#ya-rec-stop').hidden = true;
        return;
      }
      if (e.target.closest('#ya-next')) {
        if (rec.active) rec.stop();
        if (rec.spoken) recordedAny = true;
        rec.spoken = false; // каждый ход — отдельная «фраза вслух»
        const text = (host.querySelector('#ya-text') || {}).value || '';
        answers[turn] = text.trim();
        if (text.trim()) {
          const el = document.createElement('div');
          el.className = 'scene-msg is-me';
          el.innerHTML = `<div class="scene-bubble"><span class="scene-text">${esc(text.trim())}</span></div>`;
          feed.appendChild(el);
        }
        turn++;
        if (turn < story.turns.length) showTurn(); else finishStory();
        return;
      }
      const self = e.target.closest('.ya-self');
      if (self) {
        const secs = Math.round((Date.now() - startedAt) / 1000);
        await saveRound({ yesAnd: true, recorded: recordedAny, selfOk: self.dataset.ok === '1' }, secs);
        if (o.onFinish) { o.onFinish(); return; }
        input.innerHTML = `<div class="ladder-row"><button class="btn-primary" id="ya-again" type="button">➕ Ещё история</button>
          <button class="btn btn-ghost" id="ya-back" type="button">Закончить</button></div>`;
        input.querySelector('#ya-again').addEventListener('click', () => yesAnd({}));
        input.querySelector('#ya-back').addEventListener('click', () => ER.openPractice('improv'));
      }
    });
    showTurn();
  }

  /* ---------- Урок «Сегодня»: N спинов в конце ---------- */

  function lessonBlock(count, done, opts) {
    roulette({ count, done, ...(opts || {}) });
  }

  // Переключение раздела: освобождаем микрофон и таймеры
  function stop() {
    clearTimer();
    if (st.rec) { st.rec.dispose(); st.rec = null; }
    st.active = false;
    if (window.TTS) TTS.stopSpeaking();
  }

  return { init, configure, round, renderSetup, bindSetup, roulette, yesAnd, lessonBlock, stop, spinNext, isActive: () => st.active };
})();

if (typeof window !== 'undefined') window.ImprovUI = ImprovUI;
