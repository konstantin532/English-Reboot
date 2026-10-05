/* ==========================================================================
   English Reboot — Этап 3: интерфейс сцен
   Файл: scenes_ui.js — чат-лента эпизода: реплики персонажей с озвучкой,
   выбор с последствиями (реакция персонажа + комментарий тренера), открытая
   реплика с честной проверкой по смыслам (scenes.js), запись голоса в счётчик
   «фраз вслух», кнопка «Разобрать с ИИ», карта эпизодов в «Тренажёре».
   Используется и уроком «Сегодня» (play(epId, { onFinish, onQuit })).
   ========================================================================== */

const ScenesUI = (() => {
  'use strict';

  const MIN_SPOKEN_MS = 1000;
  const MAX_RECORD_MS = 30000;
  const KEY = 'scenes';

  // Реплики тренера. TODO(этап 6): перенести в общий файл реплик тренера.
  const COACH = {
    matched: 'Засчитано',
    unknown: 'Автоматически проверить не получилось — это не значит, что ответ плохой. Сравни с образцами:',
    voiceOnly: 'Голосовой ответ пока не проверяется автоматически (это появится вместе с распознаванием речи). Сравни с образцами:',
    done: 'Эпизод пройден! Так держать.',
  };
  const TONE_TAG = { natural: '✓ естественно', formal: '🎩 слишком официально', rude: '⚡ грубовато' };

  let ER = null;
  const st = {
    ep: null, nodeId: null, opts: {}, active: false,
    result: null, lock: false,
    rec: { recorder: null, stream: null, chunks: [], startedAt: 0, timer: null, active: false, url: null },
    spokenThis: false, audioEl: null,
  };

  function init(er) { ER = er; }
  const esc = (s) => (ER ? ER.escapeHtml(String(s == null ? '' : s)) : String(s));
  const episodes = () => window.SCENE_EPISODES || [];
  const cast = (id) => (window.SCENE_CAST || {})[id] || { name: id, en: id, role: '', color: '#6B7280', initial: '?' };
  const speak = (text, rate) => { if (window.TTS) TTS.speak(text, rate || Number(ER.settings().tts_rate) || 0.85); };
  const recordingSupported = () => !!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const trapsHtml = (text) => (window.TrapsUI ? TrapsUI.placeholder(text, { compact: true }) : '');

  async function loadProgress() {
    const r = await DB.getSetting(KEY);
    return Scenes.normalizeProgress(r.success ? r.data : null, episodes());
  }

  /* ---------- Карта эпизодов (Тренажёр → Сцены) ---------- */

  async function renderSetup() {
    const p = await loadProgress();
    const eps = episodes();
    const rows = eps.map((ep, i) => {
      const e = p[ep.id];
      const open = Scenes.isUnlocked(p, eps, i);
      const status = e.done ? '✅ пройден' : open ? '▶ открыт' : `🔒 откроется после «${esc(eps[i - 1].title)}»`;
      return `
        <li class="scene-row ${e.done ? 'is-done' : ''} ${open ? '' : 'is-locked'}">
          <span class="scene-num">${i + 1}</span>
          <span class="scene-info"><b>${esc(ep.title)}</b><span>${esc(ep.place)}</span><span class="scene-status">${status}</span></span>
          <button class="btn ${e.done ? 'btn-ghost' : 'btn-primary'} scene-play" type="button" data-ep="${ep.id}" ${open ? '' : 'disabled'}>
            ${e.done ? 'Сыграть ещё' : 'Играть'}</button>
        </li>`;
    }).join('');
    return `
      <div class="scenes-setup">
        <h3 class="card-title">Сцены: переезд в Нью-Йорк</h3>
        <p class="practice-intro">Сквозная история с Мэгги, Тони и мистером Окафором. Выбирай, что сказать, —
          персонажи реагируют по-разному. В открытых репликах отвечай своими словами.</p>
        <ul class="scene-list">${rows}</ul>
      </div>`;
  }

  function bindSetup() {
    document.querySelectorAll('.scene-play').forEach((b) => b.addEventListener('click', () => play(b.dataset.ep, {})));
  }

  /* ---------- Эпизод ---------- */

  function play(epId, opts) {
    const ep = episodes().find((e) => e.id === epId);
    if (!ep) { ER.toast('Эпизод не найден'); return; }
    st.ep = ep;
    st.opts = opts || {};
    st.active = true;
    st.result = { finished: false, opensOk: 0, opensSelf: 0, opensTotal: 0, tones: { natural: 0, formal: 0, rude: 0 }, spoken: 0 };
    st.startedAt = Date.now();
    resetRecording();
    if (ER && ER.claimContent) ER.claimContent();
    document.getElementById('content').innerHTML = `
      <div class="section-wrap">
        <div class="card scene-card" id="scene-root" data-ep="${ep.id}">
          <div class="scene-head">
            <div><p class="session-counter">Сцена · ${esc(ep.place)}</p><h2 class="scene-title">${esc(ep.title)}</h2></div>
            <button class="btn btn-ghost" id="scene-quit" type="button">Закончить</button>
          </div>
          <p class="scene-intro">${esc(ep.intro)}</p>
          <div class="scene-feed" id="scene-feed" aria-live="polite"></div>
          <div class="scene-input" id="scene-input"></div>
        </div>
      </div>`;
    document.getElementById('scene-root').addEventListener('click', onClick);
    window.scrollTo(0, 0);
    step(ep.start);
  }

  const feed = () => document.getElementById('scene-feed');
  const input = () => document.getElementById('scene-input');

  function audioBtn(text) {
    return `<button class="audio-btn scene-say" type="button" data-say="${esc(text)}" title="Прослушать" aria-label="Прослушать">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg></button>`;
  }

  function addCharacter(who, say, ru, mood) {
    const c = cast(who);
    const el = document.createElement('div');
    el.className = 'scene-msg is-them';
    el.innerHTML = `
      <span class="scene-avatar" style="--av:${c.color}" title="${esc(c.name)} — ${esc(c.role)}">${esc(c.initial)}</span>
      <div class="scene-bubble">
        <span class="scene-name">${esc(c.en)}${mood ? ` <span class="scene-mood" title="${mood}">${Scenes.MOODS[mood] || ''}</span>` : ''}</span>
        <span class="scene-text">${esc(say)}</span>${audioBtn(say)}
        ${ru ? `<details class="scene-ru"><summary>перевод</summary>${esc(ru)}</details>` : ''}
      </div>`;
    feed().appendChild(el);
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    speak(say);
  }

  function addMine(text, note) {
    const el = document.createElement('div');
    el.className = 'scene-msg is-me';
    el.innerHTML = `<div class="scene-bubble">${note ? `<span class="scene-name">${esc(note)}</span>` : ''}<span class="scene-text">${esc(text)}</span></div>`;
    feed().appendChild(el);
  }

  function addNote(html, cls) {
    const el = document.createElement('div');
    el.className = 'scene-note ' + (cls || '');
    el.innerHTML = html;
    feed().appendChild(el);
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return el;
  }

  function step(nodeId) {
    if (!st.active) return;
    const n = st.ep.nodes[nodeId];
    st.nodeId = nodeId;
    st.spokenThis = false;
    resetRecording();
    addCharacter(n.who, n.say, n.ru);
    if (n.end) { renderEnd(); return; }
    if (n.next) {
      input().innerHTML = `<div class="ladder-row"><button class="btn-primary" id="scene-next" type="button" data-next="${n.next}">Дальше →</button></div>`;
      return;
    }
    if (n.reply.type === 'choice') renderChoice(n);
    else renderOpen(n);
  }

  /* ---------- Выбор с последствиями ---------- */

  function renderChoice(n) {
    input().innerHTML = `
      <p class="scene-prompt">Что ответить?</p>
      <div class="scene-options">${n.reply.options.map((o, i) =>
        `<button class="scene-opt" type="button" data-i="${i}">${esc(o.text)}</button>`).join('')}</div>`;
  }

  function choose(i) {
    const n = st.ep.nodes[st.nodeId];
    const o = n.reply.options[i];
    st.result.tones[o.tone]++;
    addMine(o.text);
    const r = o.react;
    addCharacter(r.who || n.who, r.say, null, r.mood);
    const natural = n.reply.options.find((x) => x.tone === 'natural');
    addNote(`<span class="scene-tone is-${o.tone}">${TONE_TAG[o.tone]}</span> ${esc(o.coach)}
      ${o.tone !== 'natural' ? `<span class="scene-better">Естественно: «${esc(natural.text)}» ${audioBtn(natural.text)}</span>` : ''}`, 'is-coach');
    input().innerHTML = `
      <p class="scene-prompt">Скажи вслух естественный вариант: «${esc(natural.text)}»</p>
      ${trapsHtml(natural.text)}
      ${recorderHtml()}
      <div class="ladder-row"><button class="btn-primary" id="scene-next" type="button" data-next="${o.next}">Дальше →</button></div>`;
  }

  /* ---------- Открытая реплика ---------- */

  function renderOpen(n) {
    input().innerHTML = `
      <p class="scene-prompt">${esc(n.reply.prompt)}</p>
      <textarea class="ladder-input ladder-textarea" id="scene-answer" rows="2" lang="en" spellcheck="false"
        placeholder="Напиши ответ по-английски — или скажи его вслух"></textarea>
      ${recorderHtml()}
      <div class="ladder-row"><button class="btn-primary" id="scene-check" type="button">Ответить</button></div>`;
    setTimeout(() => { const t = document.getElementById('scene-answer'); if (t) t.focus(); }, 50);
  }

  function samplesHtml(samples) {
    return `<ul class="ladder-samples">${samples.map((s) => `<li>${esc(s)} ${audioBtn(s)}</li>`).join('')}</ul>`;
  }

  function checkOpen() {
    const n = st.ep.nodes[st.nodeId];
    const r = n.reply;
    const box = document.getElementById('scene-answer');
    const text = box ? box.value.trim() : '';
    if (!text && !st.spokenThis) { ER.toast('Напиши ответ или запиши его голосом'); return; }
    if (st.rec.active) stopRecording();
    st.result.opensTotal++;
    const aiBtn = text ? '<button class="btn btn-ghost" id="scene-ai" type="button">🤖 Разобрать с ИИ</button>' : '';
    if (text) {
      addMine(text);
      const m = Scenes.matchMeaning(text, r.meanings);
      if (m) {
        st.result.opensOk++;
        addCharacter(n.who, m.meaning.react.say, null, m.meaning.react.mood);
        addNote(`<b>✓ ${COACH.matched}:</b> ${esc(m.meaning.label)}. Как ещё можно сказать:${samplesHtml(r.samples)}`, 'is-ok');
        input().innerHTML = `${trapsHtml(r.samples[0])}<div class="ladder-row">${aiBtn}
          <button class="btn-primary" id="scene-next" type="button" data-next="${m.meaning.next}">Дальше →</button></div>`;
        st.lastAnswer = text;
        return;
      }
      addNote(`${COACH.unknown}${samplesHtml(r.samples)}`, 'is-unknown');
    } else {
      addMine('🎙 ответ голосом');
      addNote(`${COACH.voiceOnly}${samplesHtml(r.samples)}`, 'is-unknown');
    }
    st.lastAnswer = text;
    input().innerHTML = `
      ${trapsHtml(r.samples[0])}
      <p class="scene-prompt">Твой ответ подходит по смыслу?</p>
      <div class="ladder-row">
        <button class="btn-primary scene-self" type="button" data-ok="1" data-next="${r.fallbackNext}">Да, подходит</button>
        <button class="btn btn-ghost scene-self" type="button" data-ok="0" data-next="${r.fallbackNext}">Пока не очень</button>
        ${aiBtn}
      </div>`;
  }

  async function copyAiPrompt() {
    const n = st.ep.nodes[st.nodeId];
    const text = Scenes.aiPrompt({ episode: st.ep.title, who: cast(n.who).en, say: n.say, answer: st.lastAnswer || '', samples: n.reply.samples });
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) { ok = false; }
    if (ok) { ER.toast('Промпт скопирован — вставь его в любой чат с ИИ', 'success'); return; }
    addNote(`Скопируй промпт вручную:<textarea class="ladder-input scene-ai-text" rows="5" readonly>${esc(text)}</textarea>`, 'is-coach');
  }

  /* ---------- Запись голоса ---------- */

  function recorderHtml() {
    if (!recordingSupported()) return '<p class="setting-hint">Запись голоса недоступна в этом браузере — скажи вслух без записи.</p>';
    return `<div class="ladder-rec">
      <button class="btn" id="scene-rec" type="button">🎙 Записать себя</button>
      <button class="btn btn-ghost" id="scene-rec-stop" type="button" hidden>■ Стоп</button>
      <button class="btn btn-ghost" id="scene-rec-play" type="button" hidden>▶ Послушать себя</button>
      <span class="ladder-rec-status" id="scene-rec-status" aria-live="polite"></span>
    </div>`;
  }
  function setRecUI() {
    const a = document.getElementById('scene-rec');
    const s = document.getElementById('scene-rec-stop');
    const p = document.getElementById('scene-rec-play');
    if (a) a.hidden = st.rec.active;
    if (s) s.hidden = !st.rec.active;
    if (p) p.hidden = st.rec.active || !st.rec.url;
  }
  const recStatus = (t) => { const el = document.getElementById('scene-rec-status'); if (el) el.textContent = t; };

  async function startRecording() {
    if (st.rec.active || !recordingSupported()) return;
    if (window.TTS) TTS.stopSpeaking();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      st.rec = { ...st.rec, stream, recorder, chunks: [], startedAt: Date.now(), active: true };
      recorder.ondataavailable = (e) => { if (e.data && e.data.size) st.rec.chunks.push(e.data); };
      recorder.onstop = () => onStopped(Date.now() - st.rec.startedAt);
      recorder.start();
      st.rec.timer = setTimeout(stopRecording, MAX_RECORD_MS);
      recStatus('Говори…');
      setRecUI();
    } catch (err) {
      ER.toast('Нет доступа к микрофону: ' + ((err && err.message) || err), 'danger');
    }
  }
  function stopRecording() {
    clearTimeout(st.rec.timer);
    if (st.rec.recorder && st.rec.recorder.state !== 'inactive') st.rec.recorder.stop();
  }
  async function onStopped(ms) {
    const r = st.rec;
    if (r.stream) r.stream.getTracks().forEach((t) => t.stop());
    if (r.url) URL.revokeObjectURL(r.url);
    const blob = new Blob(r.chunks, { type: (r.recorder && r.recorder.mimeType) || 'audio/webm' });
    st.rec = { ...r, active: false, stream: null, url: URL.createObjectURL(blob) };
    setRecUI();
    if (ms >= MIN_SPOKEN_MS) {
      if (!st.spokenThis) { st.spokenThis = true; st.result.spoken++; await DB.addSpoken(SRS.todayStr(), 1); }
      recStatus('Записано ✓');
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
    if (st.rec.recorder && st.rec.recorder.state !== 'inactive') { st.rec.recorder.onstop = null; st.rec.recorder.stop(); }
    if (st.rec.stream) st.rec.stream.getTracks().forEach((t) => t.stop());
    if (st.rec.url) URL.revokeObjectURL(st.rec.url);
    st.rec = { recorder: null, stream: null, chunks: [], startedAt: 0, timer: null, active: false, url: null };
  }

  /* ---------- Конец эпизода ---------- */

  async function saveResult(finished) {
    const r = st.result;
    r.finished = finished;
    const raw = await DB.getSetting(KEY);
    const next = Scenes.recordPlay(raw.success ? raw.data : null, episodes(), st.ep.id, r, SRS.todayStr());
    await DB.saveSetting(KEY, next);
    // Сцена — тоже занятие: время идёт в статистику дня, карточки не трогаем
    const seconds = Math.round((Date.now() - (st.startedAt || Date.now())) / 1000);
    st.startedAt = Date.now();
    if (seconds > 0) {
      await DB.saveStudyLog(SRS.todayStr(), 0, 0, seconds);
      await SRS.updateStreak();
      ER.refreshHeaderStats();
    }
  }

  async function renderEnd() {
    const r = st.result;
    await saveResult(true);
    st.active = false;
    resetRecording();
    const choices = r.tones.natural + r.tones.formal + r.tones.rude;
    const nextIdx = episodes().findIndex((e) => e.id === st.ep.id) + 1;
    const nextEp = episodes()[nextIdx];
    const inLesson = typeof st.opts.onFinish === 'function';
    input().innerHTML = `
      <div class="scene-end" id="scene-end">
        <h3>${COACH.done} 🎬</h3>
        <p>Естественных ответов: <b>${r.tones.natural}</b> из ${choices}</p>
        <p>Открытых реплик засчитано автоматически: <b>${r.opensOk}</b> из ${r.opensTotal}</p>
        <p>Сказано вслух: <b>${r.spoken}</b> ${ER.plural(r.spoken, 'фраза', 'фразы', 'фраз')}</p>
        <div class="ladder-row">
          ${inLesson ? '<button class="btn-primary" id="scene-done" type="button">Дальше →</button>'
            : `${nextEp ? `<button class="btn-primary scene-play-next" type="button" data-ep="${nextEp.id}">Следующая сцена: ${esc(nextEp.title)}</button>` : ''}
               <button class="btn btn-ghost" id="scene-list" type="button">К списку сцен</button>`}
        </div>
      </div>`;
  }

  function quit() {
    if (!st.active) return;
    st.active = false;
    resetRecording();
    if (window.TTS) TTS.stopSpeaking();
    saveResult(false);
    if (typeof st.opts.onQuit === 'function') st.opts.onQuit();
    else backToList();
  }

  function backToList() { ER.openPractice('scenes'); }

  /* ---------- События ---------- */

  function onClick(e) {
    const say = e.target.closest('.scene-say');
    if (say) { speak(say.dataset.say); return; }
    const opt = e.target.closest('.scene-opt');
    if (opt && !opt.disabled) { document.querySelectorAll('.scene-opt').forEach((b) => { b.disabled = true; }); choose(Number(opt.dataset.i)); return; }
    const next = e.target.closest('#scene-next');
    if (next) { if (st.rec.active) stopRecording(); step(next.dataset.next); return; }
    if (e.target.closest('#scene-check')) { checkOpen(); return; }
    const self = e.target.closest('.scene-self');
    if (self) { if (self.dataset.ok === '1') st.result.opensSelf++; step(self.dataset.next); return; }
    if (e.target.closest('#scene-ai')) { copyAiPrompt(); return; }
    if (e.target.closest('#scene-rec')) { startRecording(); return; }
    if (e.target.closest('#scene-rec-stop')) { stopRecording(); return; }
    if (e.target.closest('#scene-rec-play')) { playRecording(); return; }
    if (e.target.closest('#scene-quit')) { quit(); return; }
    if (e.target.closest('#scene-done')) { const cb = st.opts.onFinish; st.opts = {}; cb(); return; }
    if (e.target.closest('#scene-list')) { backToList(); return; }
    const pn = e.target.closest('.scene-play-next');
    if (pn) { play(pn.dataset.ep, {}); }
  }

  // Переключение раздела: освобождаем микрофон
  function stop() {
    if (!st.active) return;
    st.active = false;
    resetRecording();
    saveResult(false);
  }

  const nextEpisodeId = async () => Scenes.nextEpisode(await loadProgress(), episodes());
  const titleOf = (id) => { const ep = episodes().find((e) => e.id === id); return ep ? ep.title : ''; };

  return { init, renderSetup, bindSetup, play, stop, nextEpisodeId, titleOf, isActive: () => st.active };
})();

if (typeof window !== 'undefined') window.ScenesUI = ScenesUI;
