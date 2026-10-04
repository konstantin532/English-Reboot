/* ==========================================================================
   English Reboot — Шаг 8: автобэкапы в localStorage
   progress + settings + achievements, раз в 7 дней, тихо.
   ========================================================================== */

const Backup = (() => {
  'use strict';

  const BACKUP_KEY = 'er_backup';
  const BACKUP_INTERVAL_DAYS = 7;
  const BACKUP_MAX_SIZE = 500000; // ~500 КБ

  let ER = null;
  function init(er) { ER = er; }

  async function collect() {
    const p = await DB.getAll('progress');
    const s = await DB.getAll('settings');
    const a = await DB.getAll('achievements');
    return {
      progress: (p.success && p.data) || [],
      settings: (s.success && s.data) || [],
      achievements: (a.success && a.data) || [],
    };
  }

  async function createBackup() {
    try {
      const data = await collect();
      let json = JSON.stringify({ date: new Date().toISOString(), version: 1, data });
      if (json.length > BACKUP_MAX_SIZE) {
        // Переполнение: оставляем 500 последних по lastReview
        data.progress = data.progress.slice()
          .sort((a, b) => (b.lastReview || '').localeCompare(a.lastReview || ''))
          .slice(0, 500);
        json = JSON.stringify({ date: new Date().toISOString(), version: 1, data });
      }
      localStorage.setItem(BACKUP_KEY, json);
      return true;
    } catch (e) { return false; }
  }

  async function shouldBackup() {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return true; // первый бэкап
    try {
      const obj = JSON.parse(raw);
      const days = (Date.now() - new Date(obj.date).getTime()) / 86400000;
      return days >= BACKUP_INTERVAL_DAYS;
    } catch (e) { return true; }
  }

  // В study_log НЕ пишем: его ключ — дата, запись auto_backup затёрла бы статистику дня.
  // Маркер — в content_meta.
  async function autoBackup() {
    if (!(await shouldBackup())) return;
    const okSave = await createBackup();
    await DB.saveCard('content_meta', {
      key: 'last_auto_backup',
      value: new Date().toISOString(),
      ok: okSave,
    });
  }

  async function restoreFromBackup() {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return { success: false, reason: 'no_backup' };
    let obj;
    try { obj = JSON.parse(raw); } catch (e) { return { success: false, reason: 'corrupt' }; }
    if (!obj || !obj.data) return { success: false, reason: 'corrupt' };

    const restored = {};
    for (const s of ['progress', 'settings', 'achievements']) {
      const items = Array.isArray(obj.data[s]) ? obj.data[s] : [];
      await DB.clearStore(s);
      if (items.length) await DB.bulkPut(s, items);
      restored[s] = items.length;
    }
    return { success: true, restored };
  }

  // Повреждение = не только ошибка чтения, но и «БД работает, а настроек нет,
  // при этом бэкап есть» (кейс: пользователь удалил IndexedDB).
  async function checkIntegrity() {
    // Раньше признаком «БД пуста» было отсутствие настройки theme. Но тема
    // сохраняется только при ручном переключении — у большинства её нет, и
    // при КАЖДОМ запуске свежий прогресс затирался недельным бэкапом.
    // Теперь восстанавливаем, только если пусты и настройки, и прогресс.
    const settings = await DB.getAllSettings();
    if (!settings.success) return { ok: false, restored: false }; // БД недоступна — не трогаем
    if (Object.keys(settings.data || {}).length) return { ok: true, restored: false };
    const progress = await DB.getStoreSize('progress');
    if (progress.success && progress.data > 0) return { ok: true, restored: false };

    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return { ok: true, restored: false }; // честный первый запуск

    const res = await restoreFromBackup();
    if (res.success && ER) ER.toast('Данные восстановлены из резервной копии', 'success');
    else if (ER) ER.toast('Не удалось восстановить данные. Переустановите приложение', 'danger');
    return { ok: !!res.success, restored: !!res.success };
  }

  return { init, createBackup, shouldBackup, restoreFromBackup, checkIntegrity, autoBackup };
})();
