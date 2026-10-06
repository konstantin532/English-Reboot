/* ==========================================================================
   English Reboot — SRS-сессия и тренажёр
   Файл: app_session.js — кнопки «Знаю / Сложно / Не знаю», вкладка «Тренажёр», SRS-сессия с итогом, проверка ответов в тестах карточек.
   Вынесено из app.js без изменения логики. Общее состояние и функции ядра —
   через контекст C (app.js → AppSession.bind(core)): C.settings, C.state, C.toast…
   ========================================================================== */

const AppSession = (() => {
  'use strict';

  let C = null; // контекст ядра (app.js)
  function bind(core) { C = core; }

  /* ---------- SRS-кнопки ---------- */

  // Американская разговорная фраза: вход в лестницу упражнений (ladder_ui.js)
  function ladderButtonHtml(cardData, rec) {
    const step = LadderUI.stepOf(rec);
    const title = Ladder.STEPS[step - 1].title;
    return `
      <div class="ladder-entry">
        <button class="btn-primary ladder-train-btn" data-id="${C.escapeAttr(cardData.id)}" type="button">🪜 Тренировать: сказать, а не прочитать</button>
        <span class="ladder-entry-step">Ступень ${step} из 8 · ${title}</span>
      </div>`;
  }

  function srsButtonsHtml(isNew) {
    if (isNew) {
      return `
        <div class="srs-buttons">
          <button class="srs-btn srs-hard" data-mark="hard" type="button">Сложно</button>
          <button class="srs-btn srs-know" data-mark="know" type="button">Знаю</button>
        </div>`;
    }
    return `
      <div class="srs-buttons">
        <button class="srs-btn srs-dontknow" data-mark="dontknow" type="button">Не знаю</button>
        <button class="srs-btn srs-hard" data-mark="hard" type="button">Сложно</button>
        <button class="srs-btn srs-know" data-mark="know" type="button">Знаю</button>
      </div>`;
  }

  function srsDoneHtml(mark) {
    return `
      <div class="srs-done">
        <span class="srs-done-label">✓ Отмечено: ${C.MARK_LABEL[mark]}</span>
        <button class="btn btn-ghost edit-mark-btn" type="button">Изменить</button>
      </div>`;
  }

  async function handleSrsMark(btn) {
    let cardId, storeName;
    if (C.state.inSession && C.currentSession) {
      const item = C.currentSession.cards[C.currentSession.currentIndex];
      if (!item) return;
      cardId = item.cardId;
      storeName = item.storeName;
    } else {
      cardId = C.state.currentCardId;
      storeName = C.state.currentStore || 'grammar_cards';
    }
    if (!cardId) return;
    const mark = btn.dataset.mark;
    document.querySelectorAll('.srs-btn').forEach((b) => { b.disabled = true; });

    const res = await SRS.saveProgress(cardId, storeName, mark);
    if (!res.success) {
      C.toast('Не удалось сохранить: ' + res.error, 'danger');
      document.querySelectorAll('.srs-btn').forEach((b) => { b.disabled = false; });
      return;
    }
    const cache = storeName === 'grammar_cards' ? C.grammarCache : C.vocabCache[storeName];
    if (cache) cache.progress[cardId] = res.data;

    SRS.updateStreak();
    if (!C.state.inSession) await C.addStudyLog(1, mark === 'know' ? 1 : 0, 0);
    C.runAchievementCheck();
    C.refreshHeaderStats();

    if (C.state.inSession) {
      if (mark === 'know') C.currentSession.correctCount++;
      C.currentSession.currentIndex++;
      setTimeout(advanceSession, 350);
    } else {
      const area = document.getElementById('srs-area');
      if (area) area.innerHTML = srsDoneHtml(mark);
      C.toast('Отметка сохранена: ' + C.MARK_LABEL[mark], 'success');
    }
  }

  /* ---------- Тренажёр ---------- */

  async function renderPractice(t) {
    const due = await SRS.getDueCards();
    const relearn = due.filter((c) => c.status === 'relearning' || c.status === 'lapsed').length;
    const modes = `
      <div class="practice-modes" role="tablist" aria-label="Режимы тренажёра">
        <button class="mode-btn ${!C.state.practiceMode ? 'active' : ''}" data-mode="srs" type="button">🔄 SRS-повторение</button>
        <button class="mode-btn ${C.state.practiceMode === 'dictation' ? 'active' : ''}" data-mode="dictation" type="button">✍️ Диктант</button>
        <button class="mode-btn ${C.state.practiceMode === 'shadowing' ? 'active' : ''}" data-mode="shadowing" type="button">🎤 Shadowing</button>
        <button class="mode-btn ${C.state.practiceMode === 'ladder' ? 'active' : ''}" data-mode="ladder" type="button">🪜 Лестница фраз</button>
        <button class="mode-btn ${C.state.practiceMode === 'scenes' ? 'active' : ''}" data-mode="scenes" type="button">🎬 Сцены</button>
        <button class="mode-btn ${C.state.practiceMode === 'improv' ? 'active' : ''}" data-mode="improv" type="button">🎲 Импровизация</button>
      </div>`;

    let panel;
    if (C.state.practiceMode === 'dictation') {
      panel = Dictation.renderSetup();
    } else if (C.state.practiceMode === 'shadowing') {
      panel = Shadowing.renderSetup();
    } else if (C.state.practiceMode === 'ladder') {
      panel = await LadderUI.renderSetup();
    } else if (C.state.practiceMode === 'scenes') {
      panel = await ScenesUI.renderSetup();
    } else if (C.state.practiceMode === 'improv') {
      panel = await ImprovUI.renderSetup();
    } else {
      panel = due.length ? `
        <h2 class="detail-title">Повторение</h2>
        <p class="practice-intro">У тебя <b>${due.length}</b> ${C.plural(due.length, 'карточка', 'карточки', 'карточек')} на повторение${relearn ? ' · ' + relearn + ' требуют особого внимания' : ''}. Жми «Начать»!</p>
        <button class="btn-primary" id="start-session-btn" type="button">Начать повторение</button>
        <p class="practice-alt">Или изучай новые карточки в разделах выше.</p>
      ` : `
        <h2 class="detail-title">Всё повторено!</h2>
        <p class="practice-intro">На сегодня всё. Возвращайся завтра — и не забывай отмечать новые карточки в разделах.</p>
        <p class="practice-alt">Или изучай новые карточки в разделах выше.</p>
      `;
    }

    return `<div class="section-wrap">${C.sectionHeader(t)}${modes}<div class="card practice-panel">${panel}</div></div>`;
  }

  /* ---------- SRS-сессия ---------- */

  async function startSessionUI() {
    const cards = await SRS.startSession(SRS.todayStr(), 15);
    if (!cards.length) { C.toast('Нет карточек на повторение'); return; }
    C.currentSession = {
      cards, currentIndex: 0, correctCount: 0, totalCount: cards.length,
      startedAt: new Date().toISOString(),
    };
    C.state.inSession = true;
    C.state.readingRate = Number(C.settings.tts_rate) || 0.7;
    renderSessionCard();
  }

  function sessionCardContentHtml(cardData) {
    const p = cardData.payload;
    if (cardData.type === 'grammar') {
      return `
        <h2 class="detail-title">${p.title}</h2>
        <div class="formula">${C.escapeHtml(p.formula)}</div>
        <p class="explanation">${p.explanation}</p>
        <h3>Примеры</h3><div class="examples">${C.examplesHtml(p)}</div>`;
    }
    if (cardData.type === 'minimal_pair') {
      const words = p.word2 ? `
        <div class="pair-words">
          <div class="pair-word">
            <button class="audio-btn" data-speech="${C.escapeAttr(p.word1)}" type="button" aria-label="Озвучить ${p.word1}">🔊</button>
            <span class="pw-text">${p.word1}</span><span class="ipa">${p.ipa1}</span><span class="ru-tr">${Annotate.ruTranscribe(p.ipa1, p.word1)}</span>
          </div>
          <span class="pair-slash">/</span>
          <div class="pair-word">
            <button class="audio-btn" data-speech="${C.escapeAttr(p.word2)}" type="button" aria-label="Озвучить ${p.word2}">🔊</button>
            <span class="pw-text">${p.word2}</span><span class="ipa">${p.ipa2}</span><span class="ru-tr">${Annotate.ruTranscribe(p.ipa2, p.word2)}</span>
          </div>
        </div>` : `<div class="ipa-chips"><span class="ipa-chip">${p.ipa1} <span class="ru-tr">${Annotate.ruTranscribe(p.ipa1, p.word1)}</span></span></div>`;
      return `
        <h2 class="detail-title">${p.front}</h2>
        ${words}
        <p class="articulation">${p.articulation}</p>
        <h3>Примеры</h3><div class="examples">${C.examplesHtml(p)}</div>`;
    }
    if (cardData.type === 'reading') {
      const paras = C.escapeHtml(p.text).split('\n').map((l) => `<p class="reading-line">${l}</p>`).join('');
      return `
        <h2 class="detail-title">${p.title}</h2>
        <div class="reading-controls">
          <button class="btn read-all-btn" type="button">🔊 Озвучить текст</button>
          <div class="reading-speed-control">
            <label>Скорость:</label>
            <select class="reading-speed" id="reading-rate" aria-label="Скорость озвучки">
              ${[0.5, 0.7, 1.0].map((r) => `<option value="${r}" ${Math.abs(C.state.readingRate - r) < 0.05 ? 'selected' : ''}>${r.toFixed(1)}×</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="reading-text">${paras}</div>`;
    }
    let head;
    if (p.full_form) {
      head = `
        <h2 class="detail-title">${p.front}</h2>
        <p class="slang-full-form">= ${p.full_form}</p>
        <div class="ipa-chips">
          <span class="ipa-chip">полная: ${p.ipa_full} <span class="ru-tr">${Annotate.ruTranscribe(p.ipa_full, p.full_form || '')}</span></span>
          <span class="ipa-chip">сокращённая: ${p.ipa_short} <span class="ru-tr">${Annotate.ruTranscribe(p.ipa_short, p.front)}</span></span>
        </div>`;
    } else {
      head = `
        <h2 class="detail-title">${p.front}
          <button class="audio-btn audio-btn--inline" data-speech="${C.escapeAttr(p.front)}" type="button" aria-label="Озвучить">🔊</button>
        </h2>
        <p class="card-translation">${p.translation || ''}</p>`;
    }
    let extra = '';
    if (p.dialog) extra = `<div class="conversation-dialog">${p.dialog.map((l) => `<p>${String(l).replace(/^\s*[—–-]\s*/, '')}</p>`).join('')}</div>`;
    if (p.context) extra = `<div class="context-note"><span class="context-icon" aria-hidden="true">💡</span><p>${p.context}</p></div>`;
    if (p.category && !p.dialog) extra = `<div class="category-badge">${p.category}</div>`;
    return head + extra + ((p.examples || []).length ? `<h3>Примеры</h3><div class="examples">${C.examplesHtml(p)}</div>` : '');
  }

  async function renderSessionCard() {
    if (!C.currentSession) return;
    const item = C.currentSession.cards[C.currentSession.currentIndex];
    if (!item) { showSessionComplete(); return; }
    const res = await DB.getByKey(item.storeName, item.cardId);
    if (!res.success || !res.data) {
      C.currentSession.currentIndex++;
      advanceSession();
      return;
    }
    const cardData = res.data;
    if (cardData.type === 'reading') C.state.readingText = cardData.payload.text;
    const pct = Math.round((C.currentSession.currentIndex / C.currentSession.totalCount) * 100);
    const statusLabel = (item.status === 'relearning' || item.status === 'lapsed')
      ? '<span class="status-badge status-relearning">На повторении</span>' : '';

    document.getElementById('content').innerHTML = `
      <div class="section-wrap">
        <div class="session-progress"><div class="session-progress-fill" style="width:${pct}%"></div></div>
        <p class="session-counter" aria-live="polite">Карточка ${C.currentSession.currentIndex + 1} из ${C.currentSession.totalCount} · клавиши 1/2/3 — оценка</p>
        <div class="card-detail session-card">
          <div class="detail-top">
            <span class="practice-alt" style="margin:0">Оцени себя честно — интервал зависит от отметки.</span>
            <span class="topic-meta">${statusLabel}
              <span class="level-badge level-badge--${cardData.level}">${cardData.level}</span>
            </span>
          </div>
          ${sessionCardContentHtml(cardData)}
          <div class="srs-area" id="srs-area">${srsButtonsHtml(false)}</div>
        </div>
      </div>`;
    window.scrollTo(0, 0);
  }

  function advanceSession() {
    if (!C.currentSession) return;
    if (C.currentSession.currentIndex >= C.currentSession.totalCount) { showSessionComplete(); return; }
    renderSessionCard();
  }

  function showSessionComplete() {
    const dur = C.currentSession.startedAt
      ? Math.round((Date.now() - new Date(C.currentSession.startedAt).getTime()) / 1000) : 0;
    C.addStudyLog(C.currentSession.totalCount, C.currentSession.correctCount, dur);
    C.runAchievementCheck();

    const zone = document.getElementById('session-complete-modal');
    if (!zone) { C.currentSession = null; return; }
    const { correctCount, totalCount } = C.currentSession;
    const percent = totalCount ? Math.round((correctCount / totalCount) * 100) : 0;
    zone.querySelector('.session-result').innerHTML = `
      <p>Пройдено карточек: <strong>${totalCount}</strong></p>
      <p>Ответов «Знаю»: <strong>${correctCount}</strong></p>
      <p>Точность: <strong>${percent}%</strong></p>`;
    zone.hidden = false;
    requestAnimationFrame(() => zone.querySelector('.modal-overlay').classList.add('show'));
    C.refreshHeaderStats();
  }

  function closeSessionModal() {
    const zone = document.getElementById('session-complete-modal');
    if (zone && !zone.hidden) {
      zone.querySelector('.modal-overlay').classList.remove('show');
      setTimeout(() => { zone.hidden = true; }, 200);
    }
    C.currentSession = null;
    C.state.inSession = false;
    C.refreshHeaderStats();
  }

  function bindSessionModal() {
    const zone = document.getElementById('session-complete-modal');
    if (!zone) return;
    zone.querySelector('#btn-repeat-today').addEventListener('click', async () => {
      closeSessionModal();
      const due = await SRS.getDueCards();
      if (due.length) startSessionUI();
      else C.toast('Все карточки повторены! Возвращайся завтра.', 'success');
    });
    zone.querySelector('#btn-close-modal').addEventListener('click', () => {
      closeSessionModal();
      C.switchTab('practice');
    });
  }

  /* ---------- Логика теста ---------- */

  function handleTestAnswer(btn) {
    const qEl = btn.closest('.test-question');
    if (!qEl || qEl.classList.contains('answered')) return;
    qEl.classList.add('answered');
    const isCorrect = btn.dataset.correct === 'true';
    if (isCorrect) C.state.test.correct += 1;
    C.state.test.answered += 1;
    qEl.querySelectorAll('.test-option').forEach((b) => {
      b.disabled = true;
      if (b.dataset.correct === 'true') b.classList.add('is-correct');
    });
    if (!isCorrect) btn.classList.add('is-wrong');
    const progressEl = document.getElementById('test-progress');
    if (progressEl) progressEl.textContent = `Отвечено ${C.state.test.answered}/${C.state.test.total}`;
    if (C.state.test.answered === C.state.test.total) showTestResult();
  }

  function showTestResult() {
    const el = document.getElementById('test-result');
    if (!el) return;
    const { correct, total } = C.state.test;
    const verdict = correct === total ? 'Отлично! Можно отмечать «Знаю».'
      : correct / total >= 0.6 ? 'Неплохо, но стоит перечитать материал.'
      : 'Стоит вернуться к правилу и примерам.';
    el.innerHTML = `<b>${correct}/${total} правильных</b><span>${verdict}</span>`;
    el.hidden = false;
  }

  return { bind, ladderButtonHtml, srsButtonsHtml, handleSrsMark, renderPractice, startSessionUI, closeSessionModal, bindSessionModal, handleTestAnswer };
})();
