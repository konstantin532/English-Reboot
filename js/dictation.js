/* ==========================================================================
   English Reboot — Шаг 6: диктант
   Файл: dictation.js — режимы word/phrase/sentence, посимвольная проверка
   (LCS-diff), подсказка (первые буквы), пропуск, результат в модалке.
   Зависимости получает через ER (window.ER из app.js).
   ========================================================================== */

const Dictation = (() => {
  'use strict';

  const st = {
    mode: 'word', items: [], cards: [], idx: 0,
    attempts: 0, score: 0, hintUsed: false, errors: 0, active: false,
    answered: false, // ответ на текущее задание уже принят — повторный Enter игнорируем
  };
  let ER = null;

  function init(er) { ER = er; }

  /* ---------- Нормализация и diff ---------- */
  function normalize(s) {
    return String(s).toLowerCase()
      .replace(/[.,!?;:"“”()]/g, '')
      .replace(/['’]/g, '')      // don't = dont
      .replace(/\s+/g, ' ')
      .trim();
  }

  // LCS-дифф: список {ch, type} для user относительно target
  function diffChars(target, user) {
    const m = target.length, n = user.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = m - 1; i >= 0; i--)
      for (let j = n - 1; j >= 0; j--)
        dp[i][j] = target[i] === user[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const res = [];
    let i = 0, j = 0;
    while (i < m && j < n) {
      if (target[i] === user[j]) { res.push({ ch: user[j], type: 'ok' }); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { res.push({ ch: target[i], type: 'missing' }); i++; }
      else { res.push({ ch: user[j], type: 'extra' }); j++; }
    }
    while (i < m) res.push({ ch: target[i++], type: 'missing' });
    while (j < n) res.push({ ch: user[j++], type: 'extra' });
    return res;
  }

  function diffHtml(target, user) {
    return diffChars(target, user).map((d) => {
      const ch = d.ch === ' ' ? '␣' : ER.escapeHtml(d.ch);
      if (d.type === 'ok') return `<span class="correct-char">${ch}</span>`;
      if (d.type === 'missing') return `<span class="missing-char">${ch}</span>`;
      return `<span class="extra-char">${ch}</span>`;
    }).join('');
  }

  function hintFor(text) {
    return normalize(text).split(' ').map((w) =>
      w.charAt(0) + '_'.repeat(Math.min(Math.max(w.length - 1, 0), 4))
    ).join(' ');
  }

  /* ---------- Экран настройки ---------- */
  function renderSetup() {
    const stores = ER.contentStores();
    return `
      <div class="dictation-setup">
        <h3 class="card-title">Настройки диктанта</h3>
        <div class="setup-row">
          <label for="dict-mode">Что диктуем</label>
          <select id="dict-mode" class="setting-select">
            <option value="word">Отдельные слова</option>
            <option value="phrase">Фразы (3–4 слова)</option>
            <option value="sentence">Целые предложения</option>
          </select>
        </div>
        <div class="setup-row">
          <label for="dict-source">Источник карточек</label>
          <select id="dict-source" class="setting-select">
            <option value="srs">Из очереди SRS (к повторению)</option>
            ${stores.map((s) => `<option value="${s.store}">${s.label}</option>`).join('')}
          </select>
        </div>
        <div class="setup-row">
          <label for="dict-count">Количество</label>
          <select id="dict-count" class="setting-select">
            <option value="5">5</option><option value="10" selected>10</option><option value="15">15</option>
          </select>
        </div>
        <button class="btn-primary" id="dict-start" type="button">Начать диктант</button>
        <p class="setting-hint">Ошибки записываются в журнал «Мои слабые места» и влияют на SRS-интервалы.</p>
      </div>`;
  }

  function bindSetup() {
    const btn = document.getElementById('dict-start');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      if (!TTS.isTTSAvailable()) { ER.toast('Озвучка недоступна в этом браузере', 'danger'); return; }
      const cfg = {
        mode: document.getElementById('dict-mode').value,
        source: document.getElementById('dict-source').value,
        count: Number(document.getElementById('dict-count').value),
      };
      const items = await ER.collectCards(cfg.source, cfg.count);
      if (!items.length) { ER.toast('Нет карточек для диктанта: пройдитесь по разделам или вернитесь завтра', 'danger'); return; }
      begin(cfg.mode, items);
    });
  }

  /* ---------- Запуск ---------- */
  async function begin(mode, items) {
    const cards = [];
    for (const it of items) {
      const res = await DB.getByKey(it.storeName, it.cardId);
      if (res.success && res.data) {
        const text = targetFor(res.data, mode);
        if (text) cards.push({ cardId: it.cardId, storeName: it.storeName, card: res.data, targetText: text });
      }
    }
    if (!cards.length) { ER.toast('Не удалось собрать карточки для диктанта', 'danger'); return; }
    Object.assign(st, { mode, items: cards, cards, idx: 0, attempts: 0, score: 0, hintUsed: false, errors: 0, active: true, answered: false });
    renderCard();
  }

  function targetFor(card, mode) {
    const text = Annotate.firstExampleText(card);
    if (!text) return null;
    const words = text.trim().split(/\s+/);
    const strip = (w) => w.replace(/[.,!?;:]+$/, '');
    if (mode === 'word') {
      // первое содержательное слово (≥3 букв), а не «I»/«the»
      const w = words.find((x) => x.replace(/[^a-zA-Z']/g, '').length >= 3);
      return strip(w || words[0]);
    }
    if (mode === 'phrase') return words.slice(0, Math.min(4, words.length)).join(' ').replace(/[.,!?;:]+$/, '');
    return text;
  }

  /* ---------- Карточка диктанта ---------- */
  function renderCard() {
    const item = st.items[st.idx];
    const pct = Math.round((st.idx / st.items.length) * 100);
    document.getElementById('content').innerHTML = `
      <div class="section-wrap">
        <div class="card">
          <div class="session-progress"><div class="session-progress-fill" style="width:${pct}%"></div></div>
          <div class="dictation-screen">
            <p class="session-counter">${modeLabel(st.mode)} · задание ${st.idx + 1} из ${st.items.length}</p>
            <button class="dictation-play" id="dict-play" type="button" aria-label="Прослушать">🔊</button>
            <p class="dictation-hint">Напиши то, что услышал${st.mode === 'word' ? '' : ' (пунктуация не учитывается)'}:</p>
            <input type="text" id="dict-input" placeholder="Введите текст…"
                   autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
            <div class="dictation-actions" id="dict-actions">
              <button id="dict-check" class="btn" type="button">Проверить</button>
              <button id="dict-hint" class="btn btn-ghost" type="button">Подсказка</button>
              <button id="dict-skip" class="btn btn-ghost" type="button">Пропустить</button>
            </div>
            <div class="dictation-feedback" id="dict-feedback"></div>
          </div>
        </div>
      </div>`;

    const input = document.getElementById('dict-input');
    document.getElementById('dict-play').addEventListener('click', play);
    document.getElementById('dict-check').addEventListener('click', check);
    document.getElementById('dict-hint').addEventListener('click', showHint);
    document.getElementById('dict-skip').addEventListener('click', () => reveal(true));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    input.focus();
  }

  function modeLabel(m) { return m === 'word' ? 'Слово' : m === 'phrase' ? 'Фраза' : 'Предложение'; }

  function play() {
    const item = st.items[st.idx];
    st.attempts++;
    TTS.speak(item.targetText, ER.settings().tts_rate);
    if (st.attempts >= 3 && !document.getElementById('dict-reveal')) {
      const b = document.createElement('button');
      b.id = 'dict-reveal';
      b.className = 'btn btn-ghost';
      b.type = 'button';
      b.textContent = 'Показать ответ';
      b.addEventListener('click', () => reveal(false));
      document.getElementById('dict-actions').appendChild(b);
    }
  }

  function showHint() {
    st.hintUsed = true;
    setFeedback(`<span class="dict-hint-text">Подсказка: <b>${ER.escapeHtml(hintFor(st.items[st.idx].targetText))}</b></span>`, '');
  }

  function lockInput() {
    st.answered = true;
    const input = document.getElementById('dict-input');
    if (input) input.readOnly = true;
  }

  function check() {
    if (st.answered) return;
    const input = document.getElementById('dict-input');
    const user = normalize(input.value);
    if (!user) { setFeedback('Введите текст', 'wrong'); return; }
    lockInput();
    const target = normalize(st.items[st.idx].targetText);
        // AI-разбор: errorPatterns карточки против ввода пользователя
    let patternHtml = '';
    const card = st.items[st.idx].card;
    const pats = card.payload && card.payload.errorPatterns;
    if (pats && pats.length) {
      const hit = pats.find((p) => user.includes(String(p.trigger).toLowerCase()) ||
        String(p.trigger).toLowerCase().includes(user));
      if (hit) patternHtml = `
        <div class="error-explanation" role="status">
          <p class="error-expl">💡 ${hit.explanation}</p>
          <p class="error-hint">🔑 ${hit.hint}</p>
        </div>`;
    }

    if (user === target) {
      st.score += st.hintUsed ? 0.5 : 1;
      setFeedback(`✓ Верно!${st.hintUsed ? ' (с подсказкой — 0.5 балла)' : ''}`, 'correct');
      if (window.Gamify) window.Gamify.onDictationItem(true);
      document.getElementById('dict-actions').style.visibility = 'hidden';
      setTimeout(next, 900);
    } else {
      registerError();
            setFeedback(
        `<div class="dict-diff">${diffHtml(target, user)}</div>` +
        `<p class="dict-answer">Правильно: <b>${ER.escapeHtml(st.items[st.idx].targetText)}</b></p>` +
        patternHtml +
        `<button class="btn" id="dict-next" type="button">Дальше</button>`, 'wrong');
      document.getElementById('dict-actions').style.visibility = 'hidden';
      document.getElementById('dict-next').addEventListener('click', next);
      // фокус — после того как Enter отпущен, иначе то же нажатие сразу листает дальше
      setTimeout(() => { const b = document.getElementById('dict-next'); if (b) b.focus(); }, 300);
    }
  }

  function reveal(countError) {
    if (st.answered) return;
    lockInput();
    if (countError) registerError();
    setFeedback(
      `<p class="dict-answer">Правильно: <b>${ER.escapeHtml(st.items[st.idx].targetText)}</b></p>` +
      `<button class="btn" id="dict-next" type="button">Дальше</button>`, 'wrong');
    document.getElementById('dict-actions').style.visibility = 'hidden';
    document.getElementById('dict-next').addEventListener('click', next);
  }

  function registerError() {
    st.errors++;
    const item = st.items[st.idx];
    // Ошибка диктанта = SRS-оценка «Не знаю» (+ запись в errors_log)
    SRS.saveProgress(item.cardId, item.storeName, 'dontknow');
  }

  function setFeedback(html, cls) {
    const el = document.getElementById('dict-feedback');
    if (el) { el.innerHTML = html; el.className = 'dictation-feedback' + (cls ? ' ' + cls : ''); }
  }

  function next() {
    if (!st.active) return;
    st.idx++;
    st.attempts = 0;
    st.hintUsed = false;
    st.answered = false;
    if (st.idx < st.items.length) renderCard();
    else finish();
  }

  /* ---------- Результат ---------- */
  function finish() {
    st.active = false;
    if (window.Gamify) window.Gamify.onDictationFinish(st.errors, st.items.length);
    if (ER && ER.addStudyLog) ER.addStudyLog(st.items.length, Math.round(st.score), 0);
    const total = st.items.length;
    const scoreStr = Number.isInteger(st.score) ? st.score : st.score.toFixed(1);
    ER.showModal(`
      <h3>Диктант завершён! ✍️</h3>
      <div class="session-result">
        <p>Правильных: <strong>${scoreStr}</strong> из ${total}</p>
        <p>Ошибок: <strong>${st.errors}</strong></p>
      </div>
      <div class="session-actions">
        <button class="btn" id="dict-retry" type="button">Пройти заново</button>
        <button class="btn btn-ghost" id="dict-close" type="button">Закрыть</button>
      </div>`, {
      'dict-retry': () => { ER.closeModal(); begin(st.mode, st.items); },
      'dict-close': () => { ER.closeModal(); ER.switchTab('practice'); },
    });
    ER.refreshHeaderStats();
  }

  return { init, renderSetup, bindSetup, begin };
})();
