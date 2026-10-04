/* ==========================================================================
   English Reboot — Шаг 6: shadowing (теневое повторение)
   Файл: shadowing.js — караоке-подсветка слов, скорость, запись себя
   через MediaRecorder с graceful degradation.
   Подсветка: точная — по событиям onboundary; fallback — таймеры.
   ========================================================================== */

const Shadowing = (() => {
  'use strict';

  const st = {
    items: [], idx: 0, rate: 0.7, playing: false,
    timers: [], boundaryFired: false,
    recorder: null, chunks: [], stream: null, recording: null, recordingActive: false,
    audioEl: null, active: false,
  };
  let ER = null;

  function init(er) { ER = er; }

  const recordingSupported = () =>
    !!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  /* ---------- Настройка ---------- */
  function renderSetup() {
    const stores = ER.contentStores();
    const recNote = recordingSupported()
      ? '<p class="setting-hint">Запись голоса доступна — сравните себя с диктором.</p>'
      : '<p class="setting-hint">Запись недоступна в этом браузере. Используй Chrome или Firefox.</p>';
    return `
      <div class="shadowing-setup">
        <h3 class="card-title">Настройки shadowing</h3>
        <div class="setup-row">
          <label for="shadow-source">Источник карточек</label>
          <select id="shadow-source" class="setting-select">
            <option value="srs">Из очереди SRS (к повторению)</option>
            ${stores.map((s) => `<option value="${s.store}">${s.label}</option>`).join('')}
          </select>
        </div>
        <div class="setup-row">
          <label for="shadow-count">Количество фраз</label>
          <select id="shadow-count" class="setting-select">
            <option value="5">5</option><option value="10" selected>10</option><option value="15">15</option>
          </select>
        </div>
        <button class="btn-primary" id="shadow-start" type="button">Начать shadowing</button>
        ${recNote}
      </div>`;
  }

  function bindSetup() {
    const btn = document.getElementById('shadow-start');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      if (!TTS.isTTSAvailable()) { ER.toast('Озвучка недоступна в этом браузере', 'danger'); return; }
      const items = await ER.collectCards(
        document.getElementById('shadow-source').value,
        Number(document.getElementById('shadow-count').value));
      if (!items.length) { ER.toast('Нет карточек — выберите раздел или вернитесь завтра', 'danger'); return; }
      begin(items);
    });
  }

  async function begin(items) {
    const cards = [];
    for (const it of items) {
      const res = await DB.getByKey(it.storeName, it.cardId);
      if (res.success && res.data) {
        const text = Annotate.firstExampleText(res.data);
        if (text) cards.push({ cardId: it.cardId, storeName: it.storeName, card: res.data, text });
      }
    }
    if (!cards.length) { ER.toast('Не удалось собрать фразы', 'danger'); return; }
    st.items = cards;
    st.idx = 0;
    st.rate = Number(ER.settings().tts_rate) || 0.7;
    st.active = true;
    renderCard();
  }

  /* ---------- Карточка ---------- */
  function renderCard() {
    const item = st.items[st.idx];
    const pct = Math.round((st.idx / st.items.length) * 100);
    const words = item.text.trim().split(/\s+/);
    const recBlock = recordingSupported() ? `
      <div class="shadowing-record" id="shadow-record-block">
        <button id="shadow-record" class="btn" type="button">● Записать себя</button>
        <button id="shadow-record-stop" class="btn btn-ghost" type="button" hidden>■ Стоп</button>
        <button id="shadow-playback" class="btn btn-ghost" type="button">▶ Прослушать себя</button>
      </div>` : `
      <p class="setting-hint">Запись недоступна в этом браузере. Используй Chrome или Firefox.</p>`;

    document.getElementById('content').innerHTML = `
      <div class="section-wrap">
        <div class="card">
          <div class="session-progress"><div class="session-progress-fill" style="width:${pct}%"></div></div>
          <div class="shadowing-screen">
            <p class="session-counter">Фраза ${st.idx + 1} из ${st.items.length}</p>
            <div class="shadowing-text" id="shadow-text">
              ${words.map((w, i) => `<span class="shadow-word" data-index="${i}">${ER.escapeHtml(w)}</span>`).join(' ')}
            </div>
            <div class="shadowing-controls">
              <button id="shadow-play" class="btn" type="button">▶ Играть</button>
              <button id="shadow-pause" class="btn btn-ghost" type="button">⏸ Пауза</button>
              <select id="shadow-rate" class="setting-select" aria-label="Скорость">
                ${[0.5, 0.7, 1.0].map((r) =>
                  `<option value="${r}" ${Math.abs(st.rate - r) < 0.05 ? 'selected' : ''}>${r.toFixed(1)}×</option>`).join('')}
              </select>
            </div>
            ${recBlock}
            <div class="shadowing-next">
              <button id="shadow-next" class="btn-primary" type="button">Следующая →</button>
            </div>
          </div>
        </div>
      </div>`;

    document.getElementById('shadow-play').addEventListener('click', play);
    document.getElementById('shadow-pause').addEventListener('click', pause);
    document.getElementById('shadow-rate').addEventListener('change', changeRate);
    document.getElementById('shadow-next').addEventListener('click', next);
    if (recordingSupported()) {
      document.getElementById('shadow-record').addEventListener('click', record);
      document.getElementById('shadow-record-stop').addEventListener('click', stopRecord);
      document.getElementById('shadow-playback').addEventListener('click', playback);
    }
  }

  /* ---------- Воспроизведение с караоке ---------- */
  function clearTimers() { st.timers.forEach(clearTimeout); st.timers = []; }
  function clearHighlight() {
    document.querySelectorAll('.shadow-word.shadow-active')
      .forEach((el) => el.classList.remove('shadow-active'));
  }
  function highlight(i) {
    clearHighlight();
    const el = document.querySelector(`.shadow-word[data-index="${i}"]`);
    if (el) el.classList.add('shadow-active');
  }

  function play() {
    if (st.playing) return;
    const item = st.items[st.idx];
    const text = item.text;

    // Карта слов: индекс → позиция в строке (для onboundary и таймеров)
    const map = [];
    const re = /\S+/g;
    let m;
    while ((m = re.exec(text))) map.push({ start: m.index, word: m[0] });

    st.playing = true;
    st.boundaryFired = false;
    clearTimers();

    // Fallback-таймеры: ~62 мс/символ на скорости 1.0
    const perChar = 62 / st.rate;
    map.forEach((wd, i) => {
      st.timers.push(setTimeout(() => { if (!st.boundaryFired) highlight(i); }, wd.start * perChar));
    });
    st.timers.push(setTimeout(() => {
      if (!st.boundaryFired) { clearHighlight(); st.playing = false; }
    }, (text.length + 8) * perChar));

    TTS.speakWithEvents(text, st.rate, {
      // Точные границы слов от движка — перекрывают таймеры
      onboundary: (e) => {
        if (e.name && e.name !== 'word') return;
        st.boundaryFired = true;
        clearTimers();
        let idx = 0;
        for (let i = 0; i < map.length; i++) {
          if (map[i].start <= e.charIndex) idx = i; else break;
        }
        highlight(idx);
      },
      onend: () => { clearTimers(); clearHighlight(); st.playing = false; },
      onerror: () => { clearTimers(); clearHighlight(); st.playing = false; },
    });
  }

  function pause() {
    TTS.stopSpeaking();
    clearTimers();
    clearHighlight();
    st.playing = false;
  }

  function changeRate(e) {
    st.rate = Number(e.target.value);
    ER.settings().tts_rate = st.rate;
    ER.persistSetting('tts_rate', st.rate);
  }

  /* ---------- Запись себя ---------- */
  function setRecUI(active) {
    const rec = document.getElementById('shadow-record');
    const stop = document.getElementById('shadow-record-stop');
    if (rec) rec.hidden = active;
    if (stop) stop.hidden = !active;
  }

  async function record() {
    if (st.recordingActive) return;
    try {
      st.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      st.chunks = [];
      st.recorder = new MediaRecorder(st.stream);
      st.recorder.ondataavailable = (e) => { if (e.data.size) st.chunks.push(e.data); };
      st.recorder.onstop = () => {
        const blob = new Blob(st.chunks, { type: st.recorder.mimeType || 'audio/webm' });
        if (st.recording) URL.revokeObjectURL(st.recording);
        st.recording = URL.createObjectURL(blob);
        st.stream.getTracks().forEach((t) => t.stop());
        st.recordingActive = false;
        setRecUI(false);
        ER.toast('Запись готова — прослушайте и сравните с оригиналом', 'success');
      };
      st.recorder.start();
      st.recordingActive = true;
      setRecUI(true);
    } catch (err) {
      ER.toast('Нет доступа к микрофону: ' + (err.message || err), 'danger');
    }
  }

  function stopRecord() {
    if (st.recorder && st.recordingActive && st.recorder.state !== 'inactive') st.recorder.stop();
  }

  function playback() {
    if (!st.recording) { ER.toast('Сначала запиши себя'); return; }
    if (!st.audioEl) st.audioEl = new Audio();
    st.audioEl.src = st.recording;
    st.audioEl.play();
  }

  function next() {
    pause();
    stopRecord();
    st.idx++;
    if (st.idx < st.items.length) renderCard();
    else finish();
  }

  // Вызывается при переключении раздела: глушим озвучку и освобождаем микрофон
  function stop() {
    if (!st.active && !st.recordingActive) return;
    pause();
    stopRecord();
    if (st.stream) st.stream.getTracks().forEach((t) => t.stop());
    st.active = false;
  }

  function finish() {
    st.active = false;
    if (window.Gamify) window.Gamify.onShadowingFinish(st.items.length);
    if (ER.addStudyLog) ER.addStudyLog(st.items.length, 0, 0);
    ER.showModal(`
      <h3>Shadowing завершён! 🎤</h3>
      <div class="session-result"><p>Проработано фраз: <strong>${st.items.length}</strong></p></div>
      <div class="session-actions">
        <button class="btn" id="sh-retry" type="button">Ещё раз</button>
        <button class="btn btn-ghost" id="sh-close" type="button">Закрыть</button>
      </div>`, {
      'sh-retry': () => { ER.closeModal(); begin(st.items); },
      'sh-close': () => { ER.closeModal(); ER.switchTab('practice'); },
    });
  }

  return { init, renderSetup, bindSetup, begin, stop };
})();
