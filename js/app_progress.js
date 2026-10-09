/* ==========================================================================
   English Reboot — вкладка «Прогресс»
   Файл: app_progress.js — уровень по изученным карточкам, сводка, серия, достижения, прогресс по разделам.
   Вынесено из app.js без изменения логики. Общее состояние и функции ядра —
   через контекст C (app.js → AppProgress.bind(core)): C.settings, C.state, C.toast…
   ========================================================================== */

const AppProgress = (() => {
  'use strict';

  let C = null; // контекст ядра (app.js)
  function bind(core) { C = core; }

  /* ---------- Вкладка «Прогресс» ---------- */

  async function renderProgress(t) {
    const today = SRS.todayStr();
    const stats = await SRS.getStats(today);
    const streak = await C.currentStreak();
    const allProg = await DB.getAllProgress();
    const recs = (allProg.success && allProg.data) || [];

    const userLv = Achievements.getUserLevel(stats.mastered);
    const levelBlock = `
      <div class="user-level-display">
        <span class="level-icon" aria-hidden="true">${userLv.icon}</span>
        <span class="level-title">${userLv.title}</span>
        <span class="level-kind">Уровень по изученным карточкам</span>
        <div class="level-progress" role="progressbar" aria-valuenow="${userLv.progress}" aria-valuemin="0" aria-valuemax="100">
          <div class="level-progress-fill" style="width:${userLv.progress}%"></div>
        </div>
        <p class="level-next">${userLv.next
          ? `До уровня «${userLv.next.title}»: ещё ${userLv.next.min - stats.mastered} ${C.plural(userLv.next.min - stats.mastered, 'карточка', 'карточки', 'карточек')} «Изучено»`
          : 'Максимальный уровень — ты Полиглот! 👑'}</p>
      </div>`;

    const overview = `
      <div class="progress-overview">
        <div class="stat-card"><span class="stat-num">${stats.mastered}</span><span class="stat-label">Изучено</span></div>
        <div class="stat-card"><span class="stat-num">${stats.learning}</span><span class="stat-label">В работе</span></div>
        <div class="stat-card"><span class="stat-num">${stats.toReview}</span><span class="stat-label">На повторе</span></div>
        <div class="stat-card"><span class="stat-num">${stats.total}</span><span class="stat-label">Всего</span></div>
        <div class="stat-card" title="Средняя вероятность вспомнить твои карточки прямо сейчас — по модели памяти FSRS (как в Anki). Цель — около 90%.">
          <span class="stat-num">${stats.retention === null ? '—' : stats.retention + '%'}</span><span class="stat-label">Память сегодня</span></div>
      </div>
      <div class="streak-display">
        <span class="streak-num">${streak}</span><span class="streak-label">дней подряд</span>
      </div>`;

    const achList = await Achievements.getAll();
    const achievementsBlock = `
      <div class="achievements-section">
        <h3 class="card-title">Достижения</h3>
        <div class="achievements-grid">
          ${achList.map((a) => `
            <div class="achievement-card ${a.unlocked ? 'unlocked' : 'locked'}">
              <span class="ach-icon" aria-hidden="true">${a.unlocked ? a.icon : '🔒'}</span>
              <span class="ach-title">${a.title}</span>
              <span class="ach-desc">${a.description}</span>
              ${a.unlocked && a.date ? `<span class="ach-date">${a.date}</span>` : ''}
            </div>`).join('')}
        </div>
      </div>`;

    const rows = [];
    for (const cs of C.CONTENT_STORES) {
      const totalRes = await DB.getAll(cs.store);
      const totalCount = (totalRes.success && totalRes.data) ? totalRes.data.length : 0;
      const started = recs.filter((r) => (r.storeName || SRS.storeForCard(r.cardId)) === cs.store).length;
      const pct = totalCount ? Math.round((started / totalCount) * 100) : 0;
      rows.push(`
        <div class="section-progress">
          <span class="section-name">${cs.label}</span>
          <div class="section-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div class="section-bar-fill" style="width:${pct}%"></div></div>
          <span class="section-count">${started}/${totalCount}</span>
        </div>`);
    }

    const logRes = await DB.getStudyLogRange(SRS.addDays(today, -29), today);
    const logMap = {};
    ((logRes.success && logRes.data) || []).forEach((r) => { logMap[r.date] = r; });
    const calCells = [];
    for (let i = 29; i >= 0; i--) {
      const d = SRS.addDays(today, -i);
      const rec = logMap[d];
      const studied = rec && (rec.cardsStudied || 0) > 0;
      calCells.push(`<div class="cal-day${studied ? ' studied' : ''}${i === 0 ? ' today' : ''}"
        title="${d}${rec ? ' · ' + rec.cardsStudied + ' карточек' : ''}">${d.slice(8)}</div>`);
    }
    const calendarBlock = `
      <h3 class="card-title" style="margin-top:18px">Календарь занятий (30 дней)</h3>
      <div class="study-calendar" aria-label="Календарь занятий за 30 дней">${calCells.join('')}</div>
      <p class="setting-hint">Зелёный — был заход и работа с карточками. Рамка — сегодня.</p>`;

    const history = ((logRes.success && logRes.data) || [])
      .filter((r) => (r.cardsStudied || 0) > 0)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 10);
    const historyBlock = `
      <h3 class="card-title" style="margin-top:18px">История занятий</h3>
      ${history.length
        ? history.map((r) => `
            <div class="history-item">
              <span class="history-date">${r.date}</span>
              <span class="history-cards">${r.cardsStudied} карточек</span>
              <span class="history-correct">${r.correct || 0} «Знаю»</span>
            </div>`).join('')
        : '<p class="setting-hint">История появится после первой сессии.</p>'}`;

    const errs = await SRS.getErrorCards();
    const errItems = [];
    for (const e of errs) {
      const store = e.storeName || SRS.storeForCard(e.cardId);
      const cardRes = await DB.getByKey(store, e.cardId);
      const front = cardRes.success && cardRes.data
        ? (cardRes.data.payload.front || cardRes.data.payload.title || e.cardId)
        : e.cardId;
      errItems.push(`
        <div class="error-item">
          <span class="error-word">${front}</span>
          <span class="error-count">Ошибок: ${e.errorCount}</span>
          <button class="error-practice" data-store="${store}" data-id="${e.cardId}" type="button">Повторить</button>
        </div>`);
    }

    return `
      <div class="section-wrap">
        ${C.sectionHeader(t)}
        <div class="card">${levelBlock}${overview}</div>
        <div class="card" style="margin-top:16px">${achievementsBlock}</div>
        <div class="card" style="margin-top:16px">
          <h3 class="card-title">Прогресс по разделам</h3>
          ${rows.join('')}
          <p class="setting-hint">Считаются карточки, к которым вы прикоснулись (любая отметка SRS).</p>
          ${calendarBlock}
          ${historyBlock}
        </div>
        ${window.TrapsUI ? await TrapsUI.passportHtml() : ''}
        <div class="card error-log" style="margin-top:16px">
          <h3 class="card-title">Мои слабые места</h3>
          ${errItems.length ? errItems.join('') : '<p class="setting-hint">Ошибок пока нет. Так держать!</p>'}
        </div>
      </div>`;
  }

  return { bind, renderProgress };
})();
