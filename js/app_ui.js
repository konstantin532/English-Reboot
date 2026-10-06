/* ==========================================================================
   English Reboot — интерфейс ядра
   Файл: app_ui.js — тема и слои разметки, боковая панель, шапка и мобильное меню, горячие клавиши, тосты, модальные окна и подтверждения, экранирование.
   Вынесено из app.js без изменения логики. Общее состояние и функции ядра —
   через контекст C (app.js → AppUI.bind(core)): C.settings, C.state, C.toast…
   ========================================================================== */

const AppUI = (() => {
  'use strict';

  let C = null; // контекст ядра (app.js)
  function bind(core) { C = core; }

  /* ---------- Тема и слои ---------- */

  function applyTheme(theme) {
    const t = ['dark', 'amoled'].includes(theme) ? theme : 'light';
    document.documentElement.dataset.theme = t;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'amoled' ? '#000000' : t === 'dark' ? '#1E1E1E' : '#E67E22');
  }

  async function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
    C.settings.theme = next;
    const sel = document.getElementById('set-theme');
    if (sel) sel.value = next;
    const res = await DB.saveSetting('theme', next);
    if (!res.success) toast('Тема применена, но не сохранена: ' + res.error, 'danger');
  }

  function applyLayer(layerKey) {
    const layer = C.LAYERS.find((l) => l.key === layerKey);
    if (!layer) return;
    document.body.classList.toggle(layer.offClass, C.settings[layerKey] === false);
  }

  /* ---------- Боковая панель ---------- */

  function updateSidebarStats(done = 0, total = 0, streak = 0) {
    const percent = total > 0 ? Math.min(done / total, 1) : 0;
    document.getElementById('ring-value').style.strokeDashoffset = (C.RING_CIRCUMFERENCE * (1 - percent)).toFixed(1);
    document.getElementById('ring-num').textContent = `${done}/${total}`;
    document.getElementById('streak-days').textContent = `${streak} ${plural(streak, 'день', 'дня', 'дней')}`;
  }

  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  /* ---------- Шапка и меню ---------- */

  function bindHeader() {
    // Защитный хелпер: отсутствующий элемент — warning, а не крах init
    const on = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', fn);
      else console.warn('[ER] В index.html нет элемента #' + id + ' — обработчик не привязан');
    };

    on('theme-toggle', toggleTheme);
    on('search-btn', () => Search.openSearch());
    on('wordbank-btn', C.openWordbank);
    on('ach-counter', () => C.switchTab('progress'));
    on('install-btn', async () => {
      if (!C.deferredPrompt) return;
      C.deferredPrompt.prompt();
      const res = await C.deferredPrompt.userChoice;
      if (res && res.outcome === 'accepted') document.getElementById('install-btn').hidden = true;
      C.deferredPrompt = null;
    });
    on('logo-link', (e) => {
      e.preventDefault();
      C.switchTab('today');
      closeMobileNav();
    });
    on('nav-toggle', toggleMobileNav);
    on('nav-backdrop', closeMobileNav);
    on('backup-btn', async () => {
      const okSave = await Backup.createBackup();
      toast(okSave ? 'Резервная копия сохранена в браузер' : 'Не удалось создать копию', okSave ? 'success' : 'danger');
    });
    on('sync-btn', () => {
      C.switchTab('settings');
      toast('Синхронизация — в разделе «Данные и синхронизация»');
    });
  }

  function toggleMobileNav() {
    const open = document.body.classList.toggle('nav-open');
    document.getElementById('nav-toggle').setAttribute('aria-expanded', String(open));
  }

  function closeMobileNav() {
    document.body.classList.remove('nav-open');
    document.getElementById('nav-toggle').setAttribute('aria-expanded', 'false');
  }

  function bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') {
        e.preventDefault();
        Search.openSearch();
      }
      // В сессии: 1/2/3 — SRS-оценка
      const typing = e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]');
      if (C.state.inSession && !typing && !e.ctrlKey && !e.metaKey && !e.altKey && ['1', '2', '3'].includes(e.key)) {
        const map = { '1': '.srs-dontknow', '2': '.srs-hard', '3': '.srs-know' };
        const btn = document.querySelector('#srs-area ' + map[e.key]);
        if (btn && !btn.disabled) btn.click();
      }
      if (e.key === 'Escape') {
        Search.closeSearch();
        closeMobileNav();
        closeModal(false);
        C.closeWordPopup();
        C.closeWordbank();
        // Закрываем итоговую модалку, только если она реально открыта —
        // иначе Escape посреди сессии обнулял её и кнопки оценки «умирали»
        const sm = document.getElementById('session-complete-modal');
        if (sm && !sm.hidden) C.closeSessionModal();
      }
    });
  }

  /* ---------- Тосты и подтверждения ---------- */

  function toast(message, type = 'info') {
    const zone = document.getElementById('toast-zone');
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.textContent = message;
    el.setAttribute('role', 'status');
    zone.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 2600);
  }

  let modalResolve = null;

  function confirmDialog({ title, text, confirmLabel = 'Подтвердить' }) {
    return new Promise((resolve) => {
      modalResolve = resolve;
      const zone = document.getElementById('modal-zone');
      zone.innerHTML = `
        <div class="modal-overlay">
          <div class="modal-card" role="dialog" aria-modal="true" aria-label="${title}">
            <h3>${title}</h3>
            <p>${text}</p>
            <div class="modal-actions">
              <button class="btn btn-ghost" type="button" data-cancel>Отмена</button>
              <button class="btn btn-danger" type="button" data-confirm>${confirmLabel}</button>
            </div>
          </div>
        </div>`;
      zone.hidden = false;
      const overlay = zone.querySelector('.modal-overlay');
      requestAnimationFrame(() => overlay.classList.add('show'));
      zone.querySelector('[data-cancel]').addEventListener('click', () => closeModal(false));
      zone.querySelector('[data-confirm]').addEventListener('click', () => closeModal(true));
      overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(false); });
      zone.querySelector('[data-cancel]').focus();
    });
  }

  function closeModal(result) {
    const zone = document.getElementById('modal-zone');
    if (zone.hidden) return;
    zone.querySelector('.modal-overlay').classList.remove('show');
    setTimeout(() => { zone.hidden = true; zone.innerHTML = ''; }, 200);
    if (modalResolve) { modalResolve(result); modalResolve = null; }
  }

  /* ---------- Экранирование и ошибки ---------- */

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escapeAttr(s) { return escapeHtml(s); }

  function showDbError(message) {
    const banner = document.createElement('div');
    banner.className = 'db-error';
    banner.innerHTML =
      '<b>IndexedDB недоступна.</b> Интерфейс работает, но настройки и прогресс не сохранятся.' +
      (message ? ' Причина: ' + message : '');
    document.querySelector('.app-header').insertAdjacentElement('afterend', banner);
  }

  return { bind, applyTheme, applyLayer, updateSidebarStats, plural, bindHeader, closeMobileNav, bindKeyboard, toast, confirmDialog, closeModal, escapeHtml, escapeAttr, showDbError };
})();
