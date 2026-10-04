/* ==========================================================================
   English Reboot — Шаг 8: напоминания
   In-app баннер (все платформы) + локальные уведомления (Android Chromium,
   пока браузер открыт). Серверного push нет — честно указываем в UI.
   ========================================================================== */

const Notifications = (() => {
  'use strict';

  let ER = null;
  let reminderTimer = null;

  function init(er) { ER = er; }

  const supported = () => 'Notification' in window;

  async function requestPermission() {
    if (!supported()) return 'unsupported';
    try { return await Notification.requestPermission(); } catch (e) { return 'denied'; }
  }

  function showLocal(title, body) {
    if (!supported() || Notification.permission !== 'granted') return false;
    try {
      new Notification(title, { body, icon: './icon-192.png', tag: 'er-reminder' });
      return true;
    } catch (e) { return false; }
  }

  // Планирование до ближайшего timeStr ("19:00"); в момент срабатывания
  // проверяем, что дневная цель ещё не закрыта, и перепланируем на завтра
  async function scheduleReminder(timeStr) {
    if (reminderTimer) clearTimeout(reminderTimer);
    const [h, m] = String(timeStr || '19:00').split(':').map(Number);
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h || 19, m || 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);

    reminderTimer = setTimeout(async () => {
      const today = SRS.todayStr();
      const log = await DB.getStudyLog(today);
      const done = (log.success && log.data) ? (log.data.cardsStudied || 0) : 0;
      const goal = Number(ER.settings().daily_goal) || 20;
      const due = await SRS.getDueCards();
      if (done < goal && due.length) {
        const shown = showLocal('English Reboot', 'У тебя ' + due.length + ' карточек на повторение. Загляни!');
        if (!shown && ER) ER.toast('Напоминание: ' + due.length + ' карточек ждут повторения', 'info');
      }
      scheduleReminder(timeStr);
    }, next - now);
  }

  async function inAppReminder() {
    const due = await SRS.getDueCards();
    const zone = document.getElementById('banner-container');
    if (!zone || !due.length) return;
    zone.innerHTML = `
      <div class="reminder-banner" role="status" aria-live="polite">
        <span class="reminder-icon" aria-hidden="true">📖</span>
        <span class="reminder-text">У тебя <b>${due.length}</b> ${ER.plural(due.length, 'карточка', 'карточки', 'карточек')} на повторение. Начать?</span>
        <button class="reminder-btn" id="reminder-start" type="button">Повторить</button>
        <button class="reminder-close" id="reminder-close" type="button" aria-label="Скрыть баннер">✕</button>
      </div>`;
    document.getElementById('reminder-start').addEventListener('click', () => {
      zone.innerHTML = '';
      ER.startSrsSession();
    });
    document.getElementById('reminder-close').addEventListener('click', () => { zone.innerHTML = ''; });
  }

  function showOfflineBanner() {
    let b = document.getElementById('offline-banner');
    if (b) return;
    b = document.createElement('div');
    b.id = 'offline-banner';
    b.className = 'offline-banner';
    b.setAttribute('role', 'status');
    b.innerHTML = '<span aria-hidden="true">📡</span><span>Оффлайн-режим. QR-подсказки недоступны, карточки и весь прогресс работают.</span>';
    const zone = document.getElementById('banner-container');
    if (zone) zone.appendChild(b);
  }

  function hideOfflineBanner() {
    const b = document.getElementById('offline-banner');
    if (b) b.remove();
  }

  return { init, supported, requestPermission, scheduleReminder, inAppReminder, showOfflineBanner, hideOfflineBanner };
})();
