/* ==========================================================================
   English Reboot — Шаг 8: экспорт/импорт/синхронизация
   Файл: exportImport.js — полный бэкап .json, импорт с валидацией,
   QR-синхронизация (Charts API + офлайн-путь копированием), Anki/Quizlet .txt
   ========================================================================== */

const ExportImport = (() => {
  'use strict';

  let ER = null;
  function init(er) { ER = er; }

  // Пользовательские данные. Контент карточек не экспортируем — он сидируется из content-файлов
  const EXPORT_STORES = ['progress', 'personal_deck', 'word_bank', 'settings', 'achievements', 'errors_log', 'study_log', 'content_meta'];

  function download(filename, text, mime) {
    const blob = new Blob([text], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(new Error('Не удалось прочитать файл'));
      fr.readAsText(file);
    });
  }

  /* ---------- Полный экспорт ---------- */

  async function exportFullBackup() {
    const data = {};
    for (const s of EXPORT_STORES) {
      const r = await DB.getAll(s);
      data[s] = (r.success && r.data) || [];
    }
    const payload = {
      appVersion: '1.0.0',
      dbVersion: 1,
      exportDate: new Date().toISOString(),
      data,
    };
    download('english-reboot-backup-' + SRS.todayStr() + '.json', JSON.stringify(payload, null, 2), 'application/json');
    if (ER) ER.toast('Экспорт готов: ' + data.progress.length + ' записей прогресса', 'success');
    return { success: true };
  }

  /* ---------- Полный импорт ---------- */

  async function importFullBackup(file) {
    let obj;
    try {
      const text = await readFile(file);
      obj = JSON.parse(text);
    } catch (e) {
      return { success: false, error: 'Неверный формат файла: ' + e.message };
    }
    if (!obj || typeof obj !== 'object' || !obj.data || typeof obj.data !== 'object')
      return { success: false, error: 'Неверный формат файла: нет блока data' };
    if (!Array.isArray(obj.data.progress) || !Array.isArray(obj.data.settings))
      return { success: false, error: 'Неверный формат файла: progress/settings должны быть массивами' };
    if (obj.app && obj.app !== 'English Reboot' && !obj.appVersion)
      return { success: false, error: 'Это файл другого приложения' };

    const imported = {};
    for (const s of EXPORT_STORES) {
      await DB.clearStore(s);
      const items = Array.isArray(obj.data[s]) ? obj.data[s] : [];
      if (items.length) await DB.bulkPut(s, items);
      imported[s] = items.length;
    }
    return { success: true, imported };
  }

  /* ---------- QR-синхронизация ---------- */

  async function exportQRData() {
    const s = await DB.getAllSettings();
    const st = (s.success && s.data) || {};
    const prog = await DB.getAllProgress();
    const recs = (prog.success && prog.data) || [];
    const per = {};
    recs.forEach((r) => {
      if (r.status === 'mastered') {
        const k = r.storeName || SRS.storeForCard(r.cardId) || 'other';
        per[k] = (per[k] || 0) + 1;
      }
    });
    const ach = await DB.getAllAchievements();
    const obj = {
      v: 1,
      s: {
        theme: st.theme || 'light',
        level: st.currentLevel || '',
        goal: st.daily_goal || 20,
        rate: st.tts_rate || 0.7,
        streak: st.streak || 0,
      },
      a: ((ach.success && ach.data) || []).map((a) => a.id),
      p: per,
    };
    let json = JSON.stringify(obj);
    if (json.length > 2048) { delete obj.p; json = JSON.stringify(obj); } // плотный QR плохо сканируется
    return json;
  }

  // Google Charts QR API давно отключён — рисуем QR локально, работает и офлайн
  function qrSvg(text) {
    if (typeof window.qrcode !== 'function') return null;
    try {
      window.qrcode.stringToBytes = window.qrcode.stringToBytesFuncs['UTF-8'];
      const qr = window.qrcode(0, 'M'); // 0 = размер подбирается автоматически
      qr.addData(text, 'Byte');
      qr.make();
      return qr.createSvgTag({ cellSize: 4, margin: 4, scalable: true, alt: 'QR-код с настройками' });
    } catch (e) {
      console.warn('[ER] QR не построен:', e);
      return null;
    }
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { return false; }
  }

  function showQR(jsonStr) {
    const svg = qrSvg(jsonStr);
    ER.showModal(`
      <div class="qr-modal">
        <h3>Быстрая синхронизация</h3>
        ${svg ? `<div id="qr-img" class="qr-svg" role="img" aria-label="QR-код с настройками">${svg}</div>`
          : '<p class="qr-warning">Не удалось построить QR-код. Скопируйте данные ниже.</p>'}
        <p>Отсканируй QR-код приложением-сканером на другом устройстве.</p>
        <details class="qr-details">
          <summary>Офлайн-вариант: показать данные для копирования</summary>
          <pre class="qr-raw">${ER.escapeHtml(jsonStr)}</pre>
          <button class="btn btn-ghost" id="qr-copy" type="button">Скопировать</button>
        </details>
        <p class="qr-warning">QR содержит только настройки, достижения и сводку прогресса. Для полного переноса используйте экспорт файлом.</p>
        <button class="btn btn-ghost" id="qr-close" type="button">Закрыть</button>
      </div>`, {
      'qr-close': () => ER.closeModal(),
      'qr-copy': async () => ER.toast(await copyText(jsonStr) ? 'Скопировано' : 'Не удалось скопировать — выделите текст вручную'),
    });
  }

  async function importQRData(jsonStr) {
    let obj;
    try { obj = JSON.parse(jsonStr); } catch (e) { return { success: false, error: 'Некорректный JSON' }; }
    if (!obj || obj.v !== 1 || !obj.s) return { success: false, error: 'Неверный формат данных синхронизации' };

    const map = {
      theme: obj.s.theme,
      currentLevel: obj.s.level || null,
      daily_goal: Number(obj.s.goal) || 20,
      tts_rate: Number(obj.s.rate) || 0.7,
    };
    for (const [k, v] of Object.entries(map)) {
      if (v !== undefined && v !== null && v !== '') await DB.saveSetting(k, v);
    }
    if (obj.s.streak) await DB.saveSetting('streak', Number(obj.s.streak));

    let achAdded = 0;
    if (Array.isArray(obj.a)) {
      for (const id of obj.a) {
        const ex = await DB.getAchievement(id);
        if (!(ex.success && ex.data)) {
          await DB.saveAchievement(id, SRS.todayStr());
          achAdded++;
        }
      }
    }
    // Прогресс намеренно не перезаписывается — это только сводка
    return { success: true, applied: 'settings' + (achAdded ? ' + достижения (' + achAdded + ')' : '') };
  }

  /* ---------- Anki / Quizlet ---------- */

  function rowsFor(card) {
    const p = card.payload || {};
    const ex = (p.examples && p.examples[0] && p.examples[0].text) || (p.dialog && p.dialog[0]) || '';
    const clean = (v) => String(v == null ? '' : v).replace(/\t/g, ' ').replace(/\s+/g, ' ').trim();
    if (card.type === 'grammar')
      return { anki: [clean(p.title), clean(p.formula), clean(p.explanation)], quizlet: [clean(p.title), clean(p.formula)] };
    if (card.type === 'minimal_pair')
      return { anki: [clean(p.front), clean(p.articulation), clean(ex)], quizlet: [clean(p.front), clean(p.articulation)] };
    if (card.type === 'reading')
      return { anki: [clean(p.title), clean(p.reading_type), clean(String(p.text || '').replace(/\n+/g, ' '))], quizlet: [clean(p.title), clean(p.reading_type)] };
    if (card.type === 'slang')
      return { anki: [clean(p.front), clean(p.full_form), clean(ex)], quizlet: [clean(p.front), clean(p.full_form)] };
    return { anki: [clean(p.front), clean(p.translation), clean(ex)], quizlet: [clean(p.front), clean(p.translation)] };
  }

  async function exportAnki(storeName, sectionName) {
    const r = await DB.getAll(storeName);
    const cards = (r.success && r.data) || [];
    const lines = cards.map((c) => rowsFor(c).anki.join('\t'));
    download(sectionName + '-anki-export.txt', lines.join('\n'), 'text/plain;charset=utf-8');
    if (ER) ER.toast('Anki: экспортировано ' + lines.length + ' карточек', 'success');
    return { success: true, count: lines.length };
  }

  async function exportQuizlet(storeName, sectionName) {
    const r = await DB.getAll(storeName);
    const cards = (r.success && r.data) || [];
    const lines = cards.map((c) => rowsFor(c).quizlet.join('\t'));
    download(sectionName + '-quizlet-export.txt', lines.join('\n'), 'text/plain;charset=utf-8');
    if (ER) ER.toast('Quizlet: экспортировано ' + lines.length + ' карточек', 'success');
    return { success: true, count: lines.length };
  }

  return { init, exportFullBackup, importFullBackup, exportQRData, showQR, importQRData, exportAnki, exportQuizlet };
})();
