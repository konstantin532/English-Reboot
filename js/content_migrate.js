/* ==========================================================================
   English Reboot — Этап 7: миграция прогресса после правок контента
   Файл: content_migrate.js — чистая функция plan() (тестируется в node) + данные.
   Выполняется один раз при обновлении (app.js, ключ content_meta).
   • MERGE: дубли одной фразы в одном разделе. Лишняя карточка убирается из базы,
     её прогресс переносится на оставшуюся — если у той прогресса ещё нет
     (иначе остаётся тот, что уже есть: его ученик набрал на «главной» карточке).
   • RESET: карточки, которые на том же номере стали ДРУГОЙ фразой (британский
     сленг → американский, caught/cot → hot/hat). Прогресс по старой фразе честно
     сбрасываем — новую ученик ещё не учил.
   ========================================================================== */

const ContentMigrate = (() => {
  'use strict';

  const KEY = 'migr_content_audit_7';

  // from → to (номер, который остаётся). store — где лежит карточка.
  const MERGE = [
    { store: 'conversation', from: 'cv_029', to: 'cv_144' }, // Long story short...
    { store: 'conversation', from: 'cv_054', to: 'cv_146' }, // You know...
    { store: 'conversation', from: 'cv_058', to: 'cv_145' }, // Like...
    { store: 'conversation', from: 'cv_065', to: 'cv_142' }, // Are you with me? (у cv_065 был сломанный пример)
    { store: 'slang', from: 'sl_071', to: 'sl_061' },         // lotta: дубль затирал «lotsa» (sl_062)
  ];
  const RESET = ['sl_046', 'sl_058', 'sl_063', 'sl_067', 'sl_068', 'mp_010'];

  /**
   * План изменений по текущему прогрессу.
   * @param {Object<string, object>} progress — cardId → запись прогресса
   * @returns {{ put: object[], del: string[], cards: [store, id][] }}
   *   put — записи прогресса сохранить, del — cardId прогресса удалить, cards — карточки удалить из разделов
   */
  function plan(progress) {
    const p = progress || {};
    const put = [], del = [];
    MERGE.forEach((m) => {
      const from = p[m.from];
      if (!from) return;
      if (!p[m.to]) put.push({ ...from, cardId: m.to, storeName: from.storeName || m.store });
      del.push(m.from);
    });
    RESET.forEach((id) => { if (p[id]) del.push(id); });
    return { put, del, cards: MERGE.map((m) => [m.store, m.from]) };
  }

  const REMOVED = new Set(MERGE.map((m) => m.from));

  return { KEY, MERGE, RESET, REMOVED, plan };
})();

if (typeof globalThis !== 'undefined') globalThis.ContentMigrate = ContentMigrate;
