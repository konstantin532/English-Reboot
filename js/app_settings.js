/* ==========================================================================
   English Reboot — настройки
   Файл: app_settings.js — вкладка «Настройки»: тема, слои, цель, напоминания, звук и голоса, данные и синхронизация, экспорт в Anki/Quizlet, сброс прогресса и очистка базы.
   Вынесено из app.js без изменения логики. Общее состояние и функции ядра —
   через контекст C (app.js → AppSettings.bind(core)): C.settings, C.state, C.toast…
   ========================================================================== */

const AppSettings = (() => {
  'use strict';

  // Легенда цветов частей речи (палитра — css/style.css, блок POS-PALETTE)
  const POS_LEGEND = [
    ['pos-noun', 'существительное', 'кто? что?', 'book'],
    ['pos-verb', 'глагол', 'что делать?', 'work'],
    ['pos-verb pos-irr', 'неправильный глагол', 'формы учить: go – went – gone', 'went'],
    ['pos-adj', 'прилагательное', 'какой?', 'happy'],
    ['pos-adv', 'наречие, частица (up, off)', 'как? где? когда?', 'fast'],
    ['pos-pron', 'местоимение', 'вместо существительного', 'she'],
    ['pos-prep', 'предлог', 'где? когда? (in, on, at)', 'on'],
    ['pos-modal', 'модальный глагол', 'могу, должен', 'can'],
    ['pos-aux', 'вспомогательный', 'вопрос и отрицание', 'did'],
    ['pos-art', 'служебные', 'артикль, союз, число, to', 'the'],
  ];

  let C = null; // контекст ядра (app.js)
  function bind(core) { C = core; }

  /* ---------- Экспорт Anki/Quizlet: выбор раздела ---------- */

  function openAnkiModal() {
    let picked = null;
    const handlers = {};
    const secsHtml = C.CONTENT_STORES.map((s) =>
      `<button class="anki-section-btn" id="anki-sec-${s.store}" type="button">${s.label}</button>`).join('');
    handlers['anki-f-anki'] = () => doExport('anki');
    handlers['anki-f-quizlet'] = () => doExport('quizlet');
    handlers['anki-close'] = () => C.closeModal();
    C.CONTENT_STORES.forEach((s) => {
      handlers['anki-sec-' + s.store] = () => {
        picked = s.store;
        document.querySelectorAll('.anki-section-btn').forEach((b) => b.classList.remove('selected'));
        document.getElementById('anki-sec-' + s.store).classList.add('selected');
        document.getElementById('anki-hint').textContent = 'Раздел: ' + s.label + '. Выберите формат.';
      };
    });

    C.showModal(`
      <div class="anki-export-modal">
        <h3>Экспорт карточек</h3>
        <div class="anki-section-list">${secsHtml}</div>
        <p class="setting-hint" id="anki-hint">Выберите раздел…</p>
        <div class="anki-format-buttons">
          <button class="btn" id="anki-f-anki" type="button">Anki (.txt, 3 колонки)</button>
          <button class="btn btn-ghost" id="anki-f-quizlet" type="button">Quizlet (.txt, 2 колонки)</button>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="anki-close" type="button">Закрыть</button>
        </div>
      </div>`, handlers);

    async function doExport(fmt) {
      if (!picked) { C.toast('Сначала выберите раздел'); return; }
      const label = C.CONTENT_STORES.find((s) => s.store === picked).label;
      C.closeModal();
      if (fmt === 'anki') await ExportImport.exportAnki(picked, label);
      else await ExportImport.exportQuizlet(picked, label);
    }
  }

  /* ---------- Настройки ---------- */

  function renderSettings(t) {
    const themeOpt = (v, label) => `<option value="${v}" ${C.settings.theme === v ? 'selected' : ''}>${label}</option>`;
    const goalOpt = (v) => `<option value="${v}" ${Number(C.settings.daily_goal) === v ? 'selected' : ''}>${v} карточек</option>`;
    const lvOpt = (v, label) => `<option value="${v}" ${C.settings.currentLevel === v ? 'selected' : ''}>${label}</option>`;
    return `
      <div class="section-wrap">
        <div class="section-header">
          <h2>${C.lineBullet(t, 'line-bullet--lg')}<span>${t.title}</span></h2>
          <span class="save-note" id="save-note">Изменения сохраняются автоматически</span>
        </div>
        <section class="card settings-card">
          <div class="setting-row">
            <div class="setting-info"><label for="set-theme">Тема</label><p class="setting-hint">Светлая или тёмная</p></div>
                          <select id="set-theme" class="setting-select">${themeOpt('light', 'Светлая')}${themeOpt('dark', 'Тёмная')}${themeOpt('amoled', 'AMOLED (чёрная)')}</select>
          </div>
          <div class="setting-row">
            <div class="setting-info"><label for="set-level">Мой уровень</label><p class="setting-hint">Задан при онбординге, можно изменить</p></div>
            <select id="set-level" class="setting-select">
              <option value="">Не указан</option>
              ${lvOpt('A1', 'A1 — начинающий')}${lvOpt('A2', 'A2 — базовый')}${lvOpt('B1', 'B1 — средний')}${lvOpt('B2', 'B2 — продвинутый')}
            </select>
          </div>
          <div class="setting-row">
            <div class="setting-info"><label for="set-rate">Скорость речи</label><p class="setting-hint">Озвучка примеров, диктант, shadowing</p></div>
            <div class="rate-control">
              <input type="range" id="set-rate" min="0.5" max="1.0" step="0.1" value="${C.settings.tts_rate}" aria-label="Скорость речи">
              <output id="rate-out">${Number(C.settings.tts_rate).toFixed(1)}×</output>
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-info"><label for="set-goal">Дневная цель</label><p class="setting-hint">Сколько карточек в день до «цель достигнута»</p></div>
            <select id="set-goal" class="setting-select">${goalOpt(10)}${goalOpt(20)}${goalOpt(30)}</select>
          </div>
        </section>
        <section class="card settings-card" id="sound-card">
          <h3 class="card-title">Звук</h3>
          <div class="sound-status" id="sound-status"></div>
          <div class="setting-row">
            <div class="setting-info"><label for="set-tts-mode">Источник озвучки</label><p class="setting-hint">«Авто»: голос системы, а если он не работает — онлайн (живые записи слов и синтез фраз)</p></div>
            <select id="set-tts-mode" class="setting-select">
              <option value="auto">Авто (рекомендуется)</option>
              <option value="system">Только голос системы (офлайн)</option>
              <option value="online">Только онлайн</option>
            </select>
          </div>
          <div class="setting-row">
            <div class="setting-info"><label for="set-voice">Голос</label><p class="setting-hint">★ — естественный нейронный голос: звучит как живой человек. Самые приятные — в Microsoft Edge (Ava, Andrew, Emma, Aria, Jenny), в Chrome — Google US English</p></div>
            <select id="set-voice" class="setting-select"></select>
          </div>
          <div class="setting-row">
            <div class="setting-info"><span class="setting-label">Проверка</span><p class="setting-hint">Должна прозвучать английская фраза</p></div>
            <button class="btn-primary" id="btn-sound-test" type="button">Проверить звук</button>
          </div>
          <details class="sound-help">
            <summary>Звука нет? Как установить английский голос</summary>
            <ol>
              <li><b>Windows 10/11:</b> Параметры → Время и язык → Речь → «Добавить голоса» → English (United States). После установки перезапусти браузер.</li>
              <li><b>Самый приятный голос:</b> открой приложение в <b>Microsoft Edge</b> — там бесплатно есть нейронные голоса Ava, Andrew, Emma, Aria, Jenny (нужен интернет). Приложение выберет лучший сам; выбрать вручную можно выше.</li>
              <li><b>Браузер:</b> лучше всего Chrome или Edge. В Яндекс.Браузере и Opera системные голоса часто не работают — тогда выручит режим «Авто» или «Только онлайн».</li>
              <li><b>Android:</b> Настройки → Язык и ввод → Синтез речи → Google, язык English (US).</li>
              <li>Проверь, что у вкладки не выключен звук (значок динамика на вкладке) и громкость Windows не на нуле.</li>
            </ol>
          </details>
        </section>
        ${window.SpeechUI ? SpeechUI.settingsHtml() : ''}
        <section class="card settings-card">
          <h3 class="card-title">Слои разметки</h3>
          <div class="layer-preview" aria-hidden="true">
            <p class="preview-line">
              <span class="pos-art">The</span>
              <span class="pos-noun"><span class="silent-letter">k</span>n<span class="surprise-sound">igh</span>t</span>
              <span class="pos-verb pos-irr"><span class="silent-letter">k</span>new</span>
              <span class="pos-art">the</span>
              <span class="pos-noun"><span class="stress">an</span>swer</span>
            </p>
            <p class="preview-ipa ipa">ðə naɪt nu ði ˈænsɚ</p>
            <p class="preview-ipa ru-tr">${Annotate.ruTranscribe('ðə naɪt nu ði ˈænsɚ', 'the knight knew the answer')}</p>
            <p class="preview-line preview-line--connected">
              I <span class="pos-verb">want</span> <span class="connected">to</span> go
              <span class="connected-note">→ «wanna»</span>
            </p>
          </div>
          <ul class="pos-legend" aria-label="Цвета частей речи">
            ${POS_LEGEND.map(([cls, name, hint, ex]) => `<li><span class="pos-legend-word ${cls}">${ex}</span><span class="pos-legend-name">${name}</span><span class="pos-legend-hint">${hint}</span></li>`).join('')}
          </ul>
          <button class="pos-guide-btn pos-guide-link" data-ch="intro" type="button">Что такое части речи и откуда их названия →</button>
          <div class="layer-list">
            ${C.LAYERS.map((l) => `
              <div class="layer-row">
                <div class="setting-info"><label for="chk-${l.key}">${l.title}</label><p class="setting-hint">${l.hint}</p></div>
                <label class="switch">
                  <input type="checkbox" id="chk-${l.key}" data-layer="${l.key}" ${C.settings[l.key] ? 'checked' : ''}>
                  <span class="switch-ui"></span>
                </label>
              </div>`).join('')}
          </div>
        </section>
        <section class="card settings-card danger-zone">
          <h3 class="card-title">Данные</h3>
          <div class="btn-grid">
            <button class="btn btn-ghost" id="btn-reset-progress" type="button">Сбросить прогресс</button>
            <button class="btn btn-danger" id="btn-clear-db" type="button">Очистить IndexedDB</button>
          </div>
          <p class="setting-hint">Очистка — для разработки: контент загрузится заново, запустится онбординг.</p>
        </section>
        <section class="settings-section">
          <h3>Данные и синхронизация</h3>
          <button id="btn-export-json" type="button">Экспорт данных (.json) — полный бэкап</button>
          <button id="btn-import-json" type="button">Импорт данных (.json)</button>
          <input type="file" id="import-file" accept=".json,application/json" hidden aria-label="Файл импорта">
          <button id="btn-qr-sync" type="button">Быстрая синхронизация (QR)</button>
          <button id="btn-qr-apply" type="button">Применить данные синхронизации (вставить)</button>
          <button id="btn-export-anki" type="button">Экспорт в Anki / Quizlet</button>
          <button id="btn-restore-backup" type="button">Восстановить из авто-бэкапа (localStorage)</button>
          <p class="settings-hint">Авто-бэкап прогресса и настроек сохраняется в браузер раз в 7 дней автоматически.</p>
        </section>
        <section class="settings-section">
          <h3>Напоминания</h3>
          <div class="setting-row">
            <div class="setting-info"><label for="reminder-time">Время напоминания</label>
              <p class="setting-hint">Локальные уведомления работают на Android (Chrome), пока браузер открыт. На iOS доступен только баннер в приложении.</p>
            </div>
            <input type="time" id="reminder-time" value="${C.settings.reminder_time || '19:00'}" aria-label="Время напоминания">
          </div>
          <button id="btn-enable-notif" type="button">Разрешить уведомления</button>
        </section>
        <section class="settings-section">
          <h3>О приложении</h3>
          <p class="settings-hint">English Reboot v${C.APP_VERSION}</p>
          <p class="settings-hint">Карточек в базе: <span id="about-cards">…</span> · Уровни: A1–B2</p>
          <p class="settings-hint">Технологии: HTML, CSS, Vanilla JS, IndexedDB, PWA. Все данные — локально в вашем браузере.</p>
        </section>
      </div>`;
  }

  async function fillAbout() {
    let total = 0;
    for (const cs of C.CONTENT_STORES) {
      const r = await DB.getAll(cs.store);
      total += ((r.success && r.data) || []).length;
    }
    const el = document.getElementById('about-cards');
    if (el) el.textContent = total;
  }

  /* ---------- Настройки → Звук ---------- */
  function renderSoundStatus() {
    const el = document.getElementById('sound-status');
    if (!el) return;
    const st = TTS.getStatus();
    const ok = st.englishVoices > 0 && !st.systemBroken;
    const rows = [
      ['Английских голосов в системе', st.synth ? `${st.englishVoices} из ${st.allVoices}` : 'синтез речи не поддерживается'],
      ['Выбранный голос', st.voice || '—'],
      ['Интернет', st.online ? 'есть' : 'нет'],
      ['Последний раз звучал', st.lastEngine || '—'],
    ];
    if (st.lastError) rows.push(['Последняя ошибка', st.lastError]);
    el.innerHTML = `<p class="sound-verdict ${ok ? 'is-ok' : 'is-warn'}">${ok
      ? '✓ Голос системы найден — озвучка работает и офлайн.'
      : (st.mode === 'system' ? '⚠ Английского голоса нет — в режиме «Только голос системы» звука не будет.' : '⚠ Английского голоса нет или он не работает — звук идёт через интернет.')}</p>
      <dl class="sound-grid">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${C.escapeHtml(String(v))}</dd>`).join('')}</dl>`;
  }

  function bindSoundSettings() {
    const mode = document.getElementById('set-tts-mode');
    const voiceSel = document.getElementById('set-voice');
    if (!mode || !voiceSel) return;
    mode.value = TTS.getMode();
    const fillVoices = () => {
      const list = TTS.getAvailableVoices();
      voiceSel.innerHTML = list.length
        ? list.map((v) => `<option value="${C.escapeAttr(v.voiceURI)}">${TTS.isNatural(v) ? '★ ' : ''}${C.escapeHtml(v.name)} — ${v.lang}${v.localService ? '' : ' (онлайн)'}</option>`).join('')
        : '<option value="">Английских голосов нет</option>';
      voiceSel.disabled = !list.length;
      voiceSel.value = TTS.getVoiceURI();
      renderSoundStatus();
    };
    fillVoices();
    if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', fillVoices);
    mode.addEventListener('change', () => { TTS.setMode(mode.value); renderSoundStatus(); });
    voiceSel.addEventListener('change', () => { TTS.setVoice(voiceSel.value); renderSoundStatus(); });
    document.getElementById('btn-sound-test').addEventListener('click', () => {
      TTS.test();
      setTimeout(renderSoundStatus, 2500);
    });
  }

  function bindSettings() {
    document.getElementById('set-theme').addEventListener('change', async (e) => {
      C.settings.theme = e.target.value;
      C.applyTheme(C.settings.theme);
      await persistSetting('theme', C.settings.theme);
    });
    document.getElementById('set-level').addEventListener('change', async (e) => {
      C.settings.currentLevel = e.target.value || null;
      await persistSetting('currentLevel', C.settings.currentLevel);
      C.refreshHeaderStats();
    });
    document.querySelectorAll('[data-layer]').forEach((chk) => {
      chk.addEventListener('change', async () => {
        C.settings[chk.dataset.layer] = chk.checked;
        C.applyLayer(chk.dataset.layer);
        await persistSetting(chk.dataset.layer, chk.checked);
      });
    });
    const rate = document.getElementById('set-rate');
    const rateOut = document.getElementById('rate-out');
    rate.addEventListener('input', () => { rateOut.textContent = Number(rate.value).toFixed(1) + '×'; });
    rate.addEventListener('change', async () => {
      C.settings.tts_rate = Number(rate.value);
      await persistSetting('tts_rate', C.settings.tts_rate);
    });
    bindSoundSettings();
    document.getElementById('set-goal').addEventListener('change', async (e) => {
      C.settings.daily_goal = Number(e.target.value);
      await persistSetting('daily_goal', C.settings.daily_goal);
      C.refreshHeaderStats();
    });
    document.getElementById('btn-reset-progress').addEventListener('click', resetProgress);
    document.getElementById('btn-clear-db').addEventListener('click', clearDatabase);

    /* --- Шаг 8: данные и синхронизация --- */
    document.getElementById('btn-export-json').addEventListener('click', () => ExportImport.exportFullBackup());

    const fileInput = document.getElementById('import-file');
    document.getElementById('btn-import-json').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      const f = fileInput.files[0];
      if (!f) return;
      const okGo = await C.confirmDialog({
        title: 'Импортировать данные?',
        text: 'Текущие прогресс, настройки, достижения, словарик и журнал будут заменены данными из файла. Контент карточек не затрагивается.',
        confirmLabel: 'Импортировать',
      });
      fileInput.value = '';
      if (!okGo) return;
      const res = await ExportImport.importFullBackup(f);
      if (res.success) {
        C.toast('Импорт выполнен. Перезагрузка…', 'success');
        setTimeout(() => location.reload(), 900);
      } else {
        C.toast('Ошибка импорта: ' + res.error, 'danger');
      }
    });

    document.getElementById('btn-qr-sync').addEventListener('click', async () => {
      const json = await ExportImport.exportQRData();
      ExportImport.showQR(json);
    });

    document.getElementById('btn-qr-apply').addEventListener('click', () => {
      C.showModal(`
        <h3>Применить данные синхронизации</h3>
        <p class="setting-hint">Вставьте JSON, скопированный на другом устройстве (или отсканированный из QR).</p>
        <textarea id="qr-paste" class="qr-paste" rows="6" placeholder='{"v":1,"s":{...}}' aria-label="Данные синхронизации"></textarea>
        <div class="session-actions">
          <button class="btn" id="qr-paste-apply" type="button">Применить</button>
          <button class="btn btn-ghost" id="qr-paste-cancel" type="button">Отмена</button>
        </div>`, {
        'qr-paste-apply': async () => {
          const val = document.getElementById('qr-paste').value;
          const res = await ExportImport.importQRData(val);
          if (res.success) {
            C.closeModal();
            C.toast('Применено: ' + res.applied + '. Перезагрузка…', 'success');
            setTimeout(() => location.reload(), 900);
          } else {
            C.toast(res.error, 'danger');
          }
        },
        'qr-paste-cancel': () => C.closeModal(),
      });
    });

    document.getElementById('btn-export-anki').addEventListener('click', openAnkiModal);

    document.getElementById('btn-restore-backup').addEventListener('click', async () => {
      const okGo = await C.confirmDialog({
        title: 'Восстановить из авто-бэкапа?',
        text: 'Прогресс, настройки и достижения будут заменены последней копией из localStorage (обновляется раз в 7 дней).',
        confirmLabel: 'Восстановить',
      });
      if (!okGo) return;
      const res = await Backup.restoreFromBackup();
      if (res.success) {
        C.toast('Восстановлено. Перезагрузка…', 'success');
        setTimeout(() => location.reload(), 900);
      } else {
        C.toast(res.reason === 'no_backup' ? 'Авто-бэкап ещё не создавался' : 'Бэкап повреждён', 'danger');
      }
    });

    /* --- Напоминания --- */
    document.getElementById('reminder-time').addEventListener('change', async (e) => {
      C.settings.reminder_time = e.target.value || '19:00';
      await persistSetting('reminder_time', C.settings.reminder_time);
      Notifications.scheduleReminder(C.settings.reminder_time);
      C.toast('Напоминание на ' + C.settings.reminder_time);
    });
    document.getElementById('btn-enable-notif').addEventListener('click', async () => {
      const perm = await Notifications.requestPermission();
      if (perm === 'granted') C.toast('Уведомления разрешены', 'success');
      else if (perm === 'denied') C.toast('Уведомления заблокированы в настройках браузера', 'danger');
      else C.toast(perm === 'unsupported' ? 'Уведомления не поддерживаются этим браузером' : 'Разрешение не выдано');
    });

    fillAbout();
  }

  async function persistSetting(key, value) {
    const res = await DB.saveSetting(key, value);
    if (res.success) flashSaved();
    else C.toast('Не удалось сохранить настройку: ' + res.error, 'danger');
  }

  let saveNoteTimer = null;
  function flashSaved() {
    const note = document.getElementById('save-note');
    if (!note) return;
    note.textContent = 'Сохранено';
    note.classList.add('saved');
    clearTimeout(saveNoteTimer);
    saveNoteTimer = setTimeout(() => {
      note.textContent = 'Изменения сохраняются автоматически';
      note.classList.remove('saved');
    }, 1600);
  }

  /* ---------- Деструктивные действия ---------- */

  async function resetProgress() {
    const okGo = await C.confirmDialog({
      title: 'Сбросить прогресс?',
      text: 'Будут удалены записи прогресса, журнал ошибок, статистика занятий и достижения. Карточки и настройки останутся на месте.',
      confirmLabel: 'Сбросить',
    });
    if (!okGo) return;
    for (const store of ['progress', 'errors_log', 'study_log', 'achievements']) {
      const res = await DB.clearStore(store);
      if (!res.success) { C.toast('Ошибка при сбросе: ' + res.error, 'danger'); return; }
    }
    C.dropCardCaches();
    await DB.saveSetting('streak', 0);
    await DB.saveSetting('last_study_date', '');
    C.refreshHeaderStats();
    C.toast('Прогресс сброшен', 'success');
  }

  async function clearDatabase() {
    const okGo = await C.confirmDialog({
      title: 'Очистить IndexedDB?',
      text: 'Все 18 хранилищ будут полностью очищены, включая настройки. Контент загрузится заново, запустится онбординг. Совет: сначала сделайте экспорт в .json!',
      confirmLabel: 'Очистить всё',
    });
    if (!okGo) return;
    const res = await DB.clearAllData();
    if (!res.success) { C.toast('Ошибка очистки: ' + res.error, 'danger'); return; }
    // Иначе Backup.checkIntegrity при следующем запуске «воскресит» старый прогресс
    try { localStorage.removeItem('er_backup'); } catch (e) { /* storage недоступен */ }
    C.toast('База очищена. Перезагрузка…', 'success');
    setTimeout(() => location.reload(), 900);
  }

  return { bind, renderSettings, bindSettings, persistSetting };
})();
