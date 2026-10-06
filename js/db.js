/* ==========================================================================
   English Reboot — финал: db.js
   Схема IndexedDB (19 хранилищ), CRUD, настройки, прогресс, журнал ошибок,
   study_log, достижения, батч-запись. Логика интервалов — в srs.js.
   Все функции async, возвращают { success, error?, data? }.
   ========================================================================== */

const DB = (() => {
  'use strict';

  const DB_NAME = 'english_reboot';
  const DB_VERSION = 2; // 2: хранилище words (раздел «Слова»)

  const STORES = [
    { name: 'words',         keyPath: 'id',     indexes: ['level', 'payload.category'] },
    { name: 'grammar_cards', keyPath: 'id',     indexes: ['level', 'type'] },
    { name: 'phrasal_verbs', keyPath: 'id',     indexes: ['level', 'tags'] },
    { name: 'collocations',  keyPath: 'id',     indexes: ['level', 'payload.category'] },
    { name: 'idioms',        keyPath: 'id',     indexes: ['level'] },
    { name: 'conversation',  keyPath: 'id',     indexes: ['level', 'payload.category'] },
    { name: 'slang',         keyPath: 'id',     indexes: ['level'] },
    { name: 'minimal_pairs', keyPath: 'id',     indexes: ['level'] },
    { name: 'readings',      keyPath: 'id',     indexes: ['level', 'payload.reading_type'] },
    { name: 'culture_notes', keyPath: 'id',     indexes: [] },
    { name: 'personal_deck', keyPath: 'id',     autoIncrement: true, indexes: [] },
    { name: 'progress',      keyPath: 'cardId', indexes: ['nextReview', 'status'] },
    { name: 'settings',      keyPath: 'key',    indexes: [] },
    { name: 'achievements',  keyPath: 'id',     indexes: [] },
    { name: 'errors_log',    keyPath: 'cardId', indexes: ['errorCount'] },
    { name: 'word_bank',     keyPath: 'word',   indexes: ['frequency'] },
    { name: 'study_log',     keyPath: 'date',   indexes: ['cardsStudied'] },
    { name: 'backups',       keyPath: 'date',   indexes: [] },
    { name: 'content_meta',  keyPath: 'key',    indexes: [] },
  ];

  let _db = null;

  const ok = (data) => ({ success: true, data });
  const fail = (error) => ({ success: false, error: (error && error.message) || String(error) });

  function reqAsPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function txDone(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Транзакция прервана'));
    });
  }

  // Любой модуль может обратиться к БД раньше, чем app.js вызовет initDB()
  // (gamify.js стартует первым) — поэтому все операции сами дожидаются открытия.
  async function ensureReady() {
    if (_db) return;
    const r = await initDB();
    if (!r.success || !_db) throw new Error(r.error || 'БД не открыта');
  }

  function toDateStr(d) {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  /* ---------- Инициализация ---------- */

  let _opening = null; // общий промис открытия: повторные вызовы не открывают БД дважды

  function initDB() {
    if (_db) return Promise.resolve(ok(true));
    if (_opening) return _opening;
    _opening = new Promise((resolve) => {
      try {
        if (!('indexedDB' in window)) return resolve(fail(new Error('IndexedDB не поддерживается этим браузером')));
        if (_db) return resolve(ok(true));

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          // Создаём недостающие хранилища: при первой установке — все, при обновлении
          // со старой версии — только новые (данные и прогресс ученика не трогаем)
          STORES.forEach((cfg) => {
            if (db.objectStoreNames.contains(cfg.name)) return;
            const store = db.createObjectStore(cfg.name, {
              keyPath: cfg.keyPath,
              autoIncrement: !!cfg.autoIncrement,
            });
            cfg.indexes.forEach((idx) => store.createIndex(idx, idx, { unique: false }));
          });
        };

        request.onsuccess = () => {
          _db = request.result;
          _db.onversionchange = () => { _db.close(); _db = null; _opening = null; };
          resolve(ok(true));
        };
        request.onerror = () => resolve(fail(request.error));
        request.onblocked = () => resolve(fail(new Error('БД заблокирована другой вкладкой — закройте её и повторите')));
      } catch (e) {
        resolve(fail(e));
      }
    }).then((res) => {
      if (!res.success) _opening = null; // при ошибке даём шанс повторить
      return res;
    });
    return _opening;
  }

  /* ---------- CRUD ---------- */

  async function saveCard(storeName, data) {
    try {
      await ensureReady();
      const tx = _db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(data);
      await txDone(tx);
      return ok(data);
    } catch (e) { return fail(e); }
  }

  async function getAll(storeName) {
    try {
      await ensureReady();
      const tx = _db.transaction(storeName, 'readonly');
      const data = await reqAsPromise(tx.objectStore(storeName).getAll());
      return ok(data);
    } catch (e) { return fail(e); }
  }

  async function getByKey(storeName, key) {
    try {
      await ensureReady();
      const tx = _db.transaction(storeName, 'readonly');
      const data = await reqAsPromise(tx.objectStore(storeName).get(key));
      return ok(data);
    } catch (e) { return fail(e); }
  }

  async function deleteCard(storeName, key) {
    try {
      await ensureReady();
      const tx = _db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
      await txDone(tx);
      return ok(true);
    } catch (e) { return fail(e); }
  }

  async function getByIndex(storeName, indexName, value) {
    try {
      await ensureReady();
      const tx = _db.transaction(storeName, 'readonly');
      const data = await reqAsPromise(tx.objectStore(storeName).index(indexName).getAll(value));
      return ok(data);
    } catch (e) { return fail(e); }
  }

  async function clearStore(storeName) {
    try {
      await ensureReady();
      const tx = _db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).clear();
      await txDone(tx);
      return ok(true);
    } catch (e) { return fail(e); }
  }

  /* ---------- Настройки ---------- */

  async function saveSetting(key, value) {
    try {
      await ensureReady();
      const tx = _db.transaction('settings', 'readwrite');
      tx.objectStore('settings').put({ key, value });
      await txDone(tx);
      return ok({ key, value });
    } catch (e) { return fail(e); }
  }

  async function getSetting(key) {
    try {
      await ensureReady();
      const tx = _db.transaction('settings', 'readonly');
      const record = await reqAsPromise(tx.objectStore('settings').get(key));
      return ok(record ? record.value : undefined);
    } catch (e) { return fail(e); }
  }

  async function getAllSettings() {
    try {
      await ensureReady();
      const tx = _db.transaction('settings', 'readonly');
      const records = await reqAsPromise(tx.objectStore('settings').getAll());
      const result = {};
      records.forEach((r) => { result[r.key] = r.value; });
      return ok(result);
    } catch (e) { return fail(e); }
  }

  /* ---------- Прогресс и ошибки ---------- */

  async function getProgressByCardId(cardId) {
    return getByKey('progress', cardId);
  }

  async function getAllProgress() {
    return getAll('progress');
  }

  async function getErrorsLog() {
    try {
      const res = await getAll('errors_log');
      if (!res.success) return res;
      const sorted = (res.data || []).sort((a, b) => (b.errorCount || 0) - (a.errorCount || 0));
      return ok(sorted);
    } catch (e) { return fail(e); }
  }

  async function saveError(cardId, storeName, errorCount) {
    try {
      await ensureReady();
      const rec = { cardId, storeName: storeName || null, errorCount, lastError: toDateStr(new Date()) };
      const tx = _db.transaction('errors_log', 'readwrite');
      tx.objectStore('errors_log').put(rec);
      await txDone(tx);
      return ok(rec);
    } catch (e) { return fail(e); }
  }

  /* ---------- study_log (журнал занятий, шаг 7) ---------- */

  // Запись за день копится: карточки/правильные/секунды суммируются
  async function saveStudyLog(date, cardsStudied, correct, duration) {
    try {
      await ensureReady();
      const tx = _db.transaction('study_log', 'readwrite');
      const store = tx.objectStore('study_log');
      const prev = await reqAsPromise(store.get(date));
      const rec = {
        ...(prev || {}), // сохраняем дополнительные поля дня (например, spoken — фразы вслух)
        date,
        cardsStudied: ((prev && prev.cardsStudied) || 0) + (cardsStudied || 0),
        correct: ((prev && prev.correct) || 0) + (correct || 0),
        duration: ((prev && prev.duration) || 0) + (duration || 0),
        sessions: ((prev && prev.sessions) || 0) + 1,
      };
      store.put(rec);
      await txDone(tx);
      return ok(rec);
    } catch (e) { return fail(e); }
  }

  // Счётчик дня в study_log (без интернета): spoken — фразы вслух (запись ≥1 с),
  // stepsUp — открытые ступени лестницы. Число сессий не трогаем — это не отдельное занятие.
  async function addDayCounter(date, field, count) {
    try {
      await ensureReady();
      const tx = _db.transaction('study_log', 'readwrite');
      const store = tx.objectStore('study_log');
      const prev = await reqAsPromise(store.get(date));
      const rec = {
        cardsStudied: 0, correct: 0, duration: 0, sessions: 0,
        ...(prev || {}),
        date,
        [field]: ((prev && prev[field]) || 0) + (count === undefined ? 1 : count),
      };
      store.put(rec);
      await txDone(tx);
      return ok(rec);
    } catch (e) { return fail(e); }
  }
  const addSpoken = (date, count) => addDayCounter(date, 'spoken', count || 1);

  async function getStudyLog(date) {
    return getByKey('study_log', date);
  }

  async function getStudyLogRange(startDate, endDate) {
    try {
      const res = await getAll('study_log');
      if (!res.success) return res;
      return ok(res.data.filter((r) => r.date >= startDate && r.date <= endDate));
    } catch (e) { return fail(e); }
  }

  /* ---------- Достижения (шаг 7) ---------- */

  async function saveAchievement(id, date) {
    try {
      await ensureReady();
      const rec = { id, date, earnedAt: new Date().toISOString() };
      const tx = _db.transaction('achievements', 'readwrite');
      tx.objectStore('achievements').put(rec);
      await txDone(tx);
      return ok(rec);
    } catch (e) { return fail(e); }
  }

  async function getAchievement(id) {
    return getByKey('achievements', id);
  }

  async function getAllAchievements() {
    return getAll('achievements');
  }

  // Все записи прогресса конкретного хранилища
  async function getProgressByStore(storeName) {
    try {
      const res = await getAll('progress');
      if (!res.success) return res;
      return ok(res.data.filter((r) => r.storeName === storeName));
    } catch (e) { return fail(e); }
  }

  /* ---------- Массовые операции (шаг 8) ---------- */

  // Батч-запись массива по 50 за транзакцию — для импорта и восстановления
  async function bulkPut(storeName, items) {
    try {
      await ensureReady();
      const CHUNK = 50;
      for (let i = 0; i < items.length; i += CHUNK) {
        const tx = _db.transaction(storeName, 'readwrite');
        const st = tx.objectStore(storeName);
        items.slice(i, i + CHUNK).forEach((it) => st.put(it));
        await txDone(tx);
      }
      return ok(items.length);
    } catch (e) { return fail(e); }
  }

  // Количество записей в хранилище
  async function getStoreSize(storeName) {
    try {
      await ensureReady();
      const tx = _db.transaction(storeName, 'readonly');
      const n = await reqAsPromise(tx.objectStore(storeName).count());
      return ok(n);
    } catch (e) { return fail(e); }
  }

  /* ---------- Обслуживание ---------- */

  async function clearAllData() {
    try {
      await ensureReady();
      const names = STORES.map((s) => s.name);
      const tx = _db.transaction(names, 'readwrite');
      names.forEach((name) => tx.objectStore(name).clear());
      await txDone(tx);
      return ok(true);
    } catch (e) { return fail(e); }
  }

  async function seedContent(contentArray, storeName, onProgress) {
    try {
      await ensureReady();
      const total = contentArray.length;
      const CHUNK = 50;
      let done = 0;

      for (let i = 0; i < total; i += CHUNK) {
        const chunk = contentArray.slice(i, i + CHUNK);
        try {
          const tx = _db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          chunk.forEach((item) => store.put(item));
          await txDone(tx);
        } catch (e) {
          await saveCard('content_meta', {
            key: 'lastSeededIndex',
            value: { store: storeName, index: done, total, at: new Date().toISOString(), error: e.message || String(e) },
          });
          throw new Error(`Сидирование «${storeName}» прервано на позиции ${done}: ${e.message || e}`);
        }
        done += chunk.length;
        if (typeof onProgress === 'function') onProgress(done, total);
      }
      return ok({ added: total });
    } catch (e) { return fail(e); }
  }

  return {
    initDB, saveCard, getAll, getByKey, deleteCard, getByIndex, clearStore,
    saveSetting, getSetting, getAllSettings,
    getProgressByCardId, getAllProgress, getErrorsLog, saveError,
    saveStudyLog, addSpoken, addDayCounter, getStudyLog, getStudyLogRange,
    saveAchievement, getAchievement, getAllAchievements, getProgressByStore,
    bulkPut, getStoreSize,
    clearAllData, seedContent, STORES, toDateStr,
  };
})();