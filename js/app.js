/* ==========================================================================
   English Reboot — ядро приложения
   Файл: app.js — общее состояние, мост window.ER для модулей, запуск и загрузка
   контента в IndexedDB, Service Worker и установка PWA, серия и статистика,
   шапка и цель дня, навигация по вкладкам, озвучка, делегирование кликов.
   Части интерфейса вынесены в модули ядра (подключаются ДО app.js):
     app_ui.js       — тема и слои, боковая панель, шапка и меню, тосты, подтверждения
     app_library.js  — грамматика, словарные разделы, карточки, Minimal Pairs, чтение
     app_session.js  — SRS-кнопки, тренажёр, SRS-сессия, логика тестов
     app_progress.js — вкладка «Прогресс»
     app_settings.js — настройки, звук, экспорт Anki/Quizlet, сброс и очистка
   Модули получают состояние и функции ядра только через объект core (ниже).
   ========================================================================== */

(() => {
  'use strict';

  const CONTENT_VERSION = 4; // 4: американская IPA и написание по аудиту (этап 7)
  const VOCAB_VERSION = '1.3.0'; // 1.3.0: американская IPA, написание и слова (этап 7)
  const EXTRA_VERSION = '1.7.0'; // 1.7.0: аудит — IPA, сленг, пары звуков, дубли (этап 7)
  const APP_VERSION = '1.1.0';

  // Каждый раздел — «линия метро»: цвет и буква значка (цвета линий нью-йоркского метро).
  // shape: 'circle' — разделы с карточками, 'diamond' — практика (как экспрессы в метро).
  const TABS = [
    { id: 'today',        title: 'Сегодня',           num: '00', group: null,       glyph: '▶', line: '#F97316' },
    { id: 'grammar',      title: 'Грамматика',        num: '01', group: 'Библиотека', glyph: 'G', line: '#0039A6' },
    { id: 'phrasal',      title: 'Фразовые глаголы',  num: '02', group: 'Библиотека', glyph: 'P', line: '#FF6319' },
    { id: 'collocations', title: 'Коллокации',        num: '03', group: 'Библиотека', glyph: 'C', line: '#6CBE45' },
    { id: 'idioms',       title: 'Идиомы',            num: '04', group: 'Библиотека', glyph: 'I', line: '#B933AD' },
    { id: 'conversation', title: 'Разговорные фразы', num: '05', group: 'Библиотека', glyph: 'T', line: '#EE352E' },
    { id: 'slang',        title: 'Сленг',             num: '06', group: 'Библиотека', glyph: 'S', line: '#FCCC0A', ink: '#111' },
    { id: 'minimal',      title: 'Minimal Pairs',     num: '07', group: 'Библиотека', glyph: 'M', line: '#996633' },
    { id: 'reading',      title: 'Чтение',            num: '08', group: 'Библиотека', glyph: 'R', line: '#00933C' },
    { id: 'personal',     title: 'Моя колода',        num: '09', group: 'Библиотека', glyph: 'D', line: '#808183' },
    { id: 'practice',     title: 'Тренажёр',          num: '10', group: 'Практика', glyph: 'X', line: '#00A1DE', shape: 'diamond' },
    { id: 'ielts',        title: 'IELTS',             num: '11', group: 'Практика', glyph: 'E', line: '#0039A6', shape: 'diamond' },
    { id: 'progress',     title: 'Прогресс',          num: '12', group: 'Я',        glyph: '%', line: '#1B1E24' },
    { id: 'settings',     title: 'Настройки',         num: '13', group: 'Я',        glyph: '⚙', line: '#1B1E24' },
  ];
  const lineBullet = (t, cls = '') =>
    `<span class="line-bullet ${t.shape === 'diamond' ? 'is-diamond' : ''} ${cls}" style="--line:${t.line};--line-ink:${t.ink || '#fff'}" aria-hidden="true"><span>${t.glyph}</span></span>`;

  const LAYERS = [
    { key: 'layer_pos',       offClass: 'layer-pos-off',       title: 'Части речи',        hint: 'Подчёркивание слов по их роли в предложении' },
    { key: 'layer_silent',    offClass: 'layer-silent-off',    title: 'Немые буквы',       hint: 'Буквы, которые не читаются' },
    { key: 'layer_surprise',  offClass: 'layer-surprise-off',  title: 'Неожиданные звуки', hint: 'Где написание расходится со звучанием' },
    { key: 'layer_ipa',       offClass: 'layer-ipa-off',       title: 'IPA-транскрипция',  hint: 'Под каждым словом примера' },
    { key: 'layer_ru',        offClass: 'layer-ru-off',        title: 'Русская транскрипция', hint: 'Как это звучит в США, русскими буквами. Нажми на слово — услышишь его' },
    { key: 'layer_stress',    offClass: 'layer-stress-off',    title: 'Ударение',          hint: 'Выделение ударного слога' },
    { key: 'layer_connected', offClass: 'layer-connected-off', title: 'Connected Speech',  hint: 'Слияние слов в живой речи' },
  ];

  const DEFAULT_SETTINGS = {
    theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    layer_pos: true, layer_silent: true, layer_surprise: true,
    layer_ipa: true, layer_ru: true, layer_stress: true, layer_connected: true,
    tts_rate: 0.7, daily_goal: 20, currentLevel: null, reminder_time: '19:00',
  };

  const MARK_LABEL = { know: 'Знаю', hard: 'Сложно', dontknow: 'Не знаю' };
  const READING_TYPES = { dialog: 'диалог', article: 'статья', notice: 'объявление' };

  const CONTENT_STORES = [
    { store: 'grammar_cards', label: 'Грамматика',        tab: 'grammar' },
    { store: 'phrasal_verbs', label: 'Фразовые глаголы',  tab: 'phrasal' },
    { store: 'collocations',  label: 'Коллокации',        tab: 'collocations' },
    { store: 'idioms',        label: 'Идиомы',            tab: 'idioms' },
    { store: 'conversation',  label: 'Разговорные фразы', tab: 'conversation' },
    { store: 'slang',         label: 'Сленг',             tab: 'slang' },
    { store: 'minimal_pairs', label: 'Minimal Pairs',     tab: 'minimal' },
    { store: 'readings',      label: 'Чтение',            tab: 'reading' },
    { store: 'personal_deck', label: 'Моя колода',        tab: 'personal' },
  ];

  let settings = { ...DEFAULT_SETTINGS };
  let currentTab = 'today';
  let goalCelebrated = false;
  let deferredPrompt = null;
  let goalDay = null;      // дата, к которой относится goalCelebrated
  let moduleScreen = false; // экран занят модулем (claimContent) до следующего switchTab
  let renderToken = 0;     // защита от гонки при быстром переключении вкладок

  const state = {
    filter: 'all',
    currentCardId: null,
    currentStore: null,
    test: { answered: 0, correct: 0, total: 5 },
    vocab: {},
    lazyObserver: null,
    readingRate: 0.7,
    readingText: '',
    currentPair: null,
    inSession: false,
    practiceMode: null,
  };
  let currentSession = null;
  let pairRound = null;

  const VOCAB_STORES = {
    phrasal:      { store: 'phrasal_verbs', kind: 'vocab',   label: 'Фразовые глаголы' },
    collocations: { store: 'collocations',  kind: 'vocab',   label: 'Коллокации' },
    idioms:       { store: 'idioms',        kind: 'vocab',   label: 'Идиомы' },
    conversation: { store: 'conversation',  kind: 'vocab',   label: 'Разговорные фразы' },
    slang:        { store: 'slang',         kind: 'vocab',   label: 'Сленг' },
    minimal:      { store: 'minimal_pairs', kind: 'minimal', label: 'Minimal Pairs' },
    reading:      { store: 'readings',      kind: 'reading', label: 'Чтение' },
    personal:     { store: 'personal_deck', kind: 'vocab',   label: 'Моя колода' },
  };

  let grammarCache = null;
  // Поколение кэшей карточек: растёт при каждом сбросе. Загрузка, начатая до сброса,
  // не записывает в кэш свой (уже устаревший) результат.
  let cacheEpoch = 0;
  const vocabCache = {};

  const RING_CIRCUMFERENCE = 2 * Math.PI * 52;

  /* ---------- Модули ядра (app_*.js) ---------- */
  const { renderGrammar, examplesHtml, openGrammarCard, renderVocabList, bindLazyLoading, pairPlay, pairAnswer, openWordPopup, closeWordPopup, openWordbank, closeWordbank, openVocabCard, openCardAnywhere } = AppLibrary;
  const { ladderButtonHtml, srsButtonsHtml, handleSrsMark, renderPractice, startSessionUI, closeSessionModal, bindSessionModal, handleTestAnswer } = AppSession;
  const { renderSettings, bindSettings, persistSetting } = AppSettings;
  const { renderProgress } = AppProgress;
  const { applyTheme, applyLayer, updateSidebarStats, plural, bindHeader, closeMobileNav, bindKeyboard, toast, confirmDialog, closeModal, escapeHtml, escapeAttr, showDbError } = AppUI;

  /* ---------- Контекст для модулей ядра ---------- */
  // Модули app_*.js получают общее состояние и функции ядра только через этот объект:
  // геттер читает текущее значение (в т.ч. переприсваиваемых let), сеттер — меняет его.
  // Новое C.имя в модуле → добавь сюда геттер (tests/app_modules.test.js это проверяет).
  const core = {
    get APP_VERSION() { return APP_VERSION; },
    get CONTENT_STORES() { return CONTENT_STORES; },
    get LAYERS() { return LAYERS; },
    get MARK_LABEL() { return MARK_LABEL; },
    get READING_TYPES() { return READING_TYPES; },
    get RING_CIRCUMFERENCE() { return RING_CIRCUMFERENCE; },
    get VOCAB_STORES() { return VOCAB_STORES; },
    get addStudyLog() { return addStudyLog; },
    get applyLayer() { return applyLayer; },
    get applyTheme() { return applyTheme; },
    get closeModal() { return closeModal; },
    get closeSessionModal() { return closeSessionModal; },
    get closeWordPopup() { return closeWordPopup; },
    get closeWordbank() { return closeWordbank; },
    get confirmDialog() { return confirmDialog; },
    get currentSession() { return currentSession; }, set currentSession(v) { currentSession = v; },
    get currentStreak() { return currentStreak; },
    get deferredPrompt() { return deferredPrompt; }, set deferredPrompt(v) { deferredPrompt = v; },
    get dropCardCaches() { return dropCardCaches; },
    get ensureGrammarData() { return ensureGrammarData; },
    get ensureVocabData() { return ensureVocabData; },
    get escapeAttr() { return escapeAttr; },
    get escapeHtml() { return escapeHtml; },
    get examplesHtml() { return examplesHtml; },
    get grammarCache() { return grammarCache; },
    get ladderButtonHtml() { return ladderButtonHtml; },
    get lineBullet() { return lineBullet; },
    get openWordbank() { return openWordbank; },
    get pairRound() { return pairRound; }, set pairRound(v) { pairRound = v; },
    get plural() { return plural; },
    get refreshHeaderStats() { return refreshHeaderStats; },
    get runAchievementCheck() { return runAchievementCheck; },
    get sectionHeader() { return sectionHeader; },
    get settings() { return settings; }, set settings(v) { settings = v; },
    get showModal() { return showModal; },
    get speak() { return speak; },
    get srsButtonsHtml() { return srsButtonsHtml; },
    get state() { return state; },
    get switchTab() { return switchTab; },
    get toast() { return toast; },
    get vocabCache() { return vocabCache; },
  };
  [AppLibrary, AppProgress, AppSession, AppSettings, AppUI].forEach((m) => m.bind(core));
  /* ---------- /контекст ---------- */


  /* ---------- Мост для модулей ---------- */

  let markReady;
  const ready = new Promise((resolve) => { markReady = resolve; });

  // Сбросить кэши карточек и перерисовать текущий раздел (после догрузки контента)
  function reloadContent() {
    dropCardCaches();
    // Экран модуля (урок, сцена, лестница) не перерисовываем — ученик посреди задания
    const onList = !state.inSession && !state.currentCardId && !state.practiceMode && !moduleScreen;
    if (onList && currentTab !== 'settings') switchTab(currentTab);
  }

  window.ER = {
    ready,
    reloadContent,
    settings: () => settings,
    contentStores: () => CONTENT_STORES,
    toast,
    escapeHtml,
    persistSetting,
    refreshHeaderStats,
    switchTab,
    collectCards,
    showModal,
    closeModal,
    openCardAnywhere,
    addStudyLog,
    applyOnboarding,
    startSrsSession: () => startSessionUI(),
    // Модуль сам рисует экран в #content (лестница, сцена, импровизация, итог дня):
    // запоздавший асинхронный рендер вкладки не должен его затереть
    claimContent: () => { renderToken++; moduleScreen = true; },
    // Открыть режим тренажёра (лестница, сцены…) — для модулей вне app.js
    openPractice: (mode) => { state.practiceMode = mode || null; return switchTab('practice'); },
    plural,
  };

  async function collectCards(source, count) {
    if (source === 'srs') {
      const due = await SRS.getDueCards();
      return due.slice(0, count).map((c) => ({ cardId: c.cardId, storeName: c.storeName }));
    }
    const res = await DB.getAll(source);
    const cards = ((res.success && res.data) || []).slice().sort(() => Math.random() - 0.5);
    return cards.slice(0, count).map((c) => ({ cardId: c.id, storeName: source }));
  }

  async function addStudyLog(cards, correct, duration) {
    if (!cards) return;
    await DB.saveStudyLog(SRS.todayStr(), cards, correct || 0, duration || 0);
    refreshHeaderStats();
  }

  function showModal(html, handlers = {}) {
    const zone = document.getElementById('modal-zone');
    zone.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-card" role="dialog" aria-modal="true">${html}</div>
      </div>`;
    zone.hidden = false;
    const overlay = zone.querySelector('.modal-overlay');
    requestAnimationFrame(() => overlay.classList.add('show'));
    Object.keys(handlers).forEach((id) => {
      const btn = zone.querySelector('#' + id);
      if (btn) btn.addEventListener('click', handlers[id]);
    });
  }

  async function applyOnboarding(level, goal) {
    settings.currentLevel = level;
    settings.daily_goal = goal;
    // Сохраняем в БД, иначе после перезагрузки уровень и цель терялись
    await persistSetting('currentLevel', level);
    await persistSetting('daily_goal', goal);
    refreshHeaderStats();
    toast('Уровень ' + level + ' сохранён. Добро пожаловать!', 'success');
    // После онбординга — урок дня (с новым уровнем). Если ученик уже ушёл в другой раздел
    // или начал задание, не выдёргиваем его обратно.
    if (currentTab === 'today' && !moduleScreen && !state.inSession) switchTab('today');
  }

  /* ---------- PWA: Service Worker и установка ---------- */

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    if (!location.protocol.startsWith('http')) {
      console.info('[ER] Service Worker недоступен на file:// — для офлайна и установки PWA откройте приложение через локальный сервер (например: python -m http.server 8000) или хостинг.');
      return;
    }
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.info('[ER] Service Worker зарегистрирован'))
      .catch((err) => console.warn('[ER] SW не зарегистрирован:', err));
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'offline') Notifications.showOfflineBanner();
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById('install-btn');
    if (btn) btn.hidden = false;
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    const btn = document.getElementById('install-btn');
    if (btn) btn.hidden = true;
    toast('Приложение установлено 🎉', 'success');
  });

  window.addEventListener('online', () => Notifications.hideOfflineBanner());
  window.addEventListener('offline', () => Notifications.showOfflineBanner());

  /* ---------- Серия занятий ---------- */

  // В БД серия обновляется только при занятии; если пропущено больше дня
  // и заморозки нет — фактическая серия уже 0
  async function currentStreak() {
    const streakRes = await DB.getSetting('streak');
    const streak = streakRes.success && streakRes.data ? Number(streakRes.data) : 0;
    const lastRes = await DB.getSetting('last_study_date');
    const last = lastRes.success ? lastRes.data : '';
    if (!last) return streak;
    const today = SRS.todayStr();
    if (last >= SRS.addDays(today, -1)) return streak;
    const frRes = await DB.getSetting('streak_freeze');
    const freeze = frRes.success && frRes.data ? Number(frRes.data) : 0;
    return freeze > 0 && last >= SRS.addDays(today, -2) ? streak : 0;
  }

  /* ---------- Статистика для достижений ---------- */

  async function gatherStats() {
    const all = await DB.getAllProgress();
    const recs = (all.success && all.data) || [];
    const base = await SRS.getStats();
    const num = async (k) => { const r = await DB.getSetting(k); return r.success && r.data ? Number(r.data) || 0 : 0; };
    const leagueRes = await DB.getSetting('league');
    return {
      ...base,
      streak: await currentStreak(),
      // для PRO-достижений «На волне», «Слушатель», «Эхо», «Золотая лига»
      maxCombo: await num('maxCombo'),
      perfectDictations: await num('perfectDictations'),
      shadowCount: await num('shadowCount'),
      leagueLevel: leagueRes.success && leagueRes.data ? Number(leagueRes.data.level) || 0 : 0,
      grammarMastered: recs.filter((r) => r.storeName === 'grammar_cards' && r.status === 'mastered').length,
      phrasalMastered: recs.filter((r) => r.storeName === 'phrasal_verbs' && r.status === 'mastered').length,
      conversationMastered: recs.filter((r) => r.storeName === 'conversation' && r.status === 'mastered').length,
    };
  }

  async function runAchievementCheck() {
    const fresh = await Achievements.check(await gatherStats());
    fresh.forEach((a, i) => setTimeout(() => Achievements.toast(a), i * 500));
    if (fresh.length) {
      const cnt = await DB.getAllAchievements();
      const el = document.getElementById('ach-counter-text');
      if (el) el.textContent = ((cnt.success && cnt.data) || []).length;
    }
    return fresh;
  }

  /* ---------- Инициализация ---------- */

  async function init() {
    const opened = await DB.initDB();
    if (!opened.success) { showDbError(opened.error); markReady(); }

    Backup.init(window.ER);
    Notifications.init(window.ER);
    ExportImport.init(window.ER);

    // Целостность ДО чтения настроек: восстановление могло их вернуть
    await Backup.checkIntegrity();

    const loaded = await DB.getAllSettings();
    if (loaded.success && loaded.data) settings = { ...DEFAULT_SETTINGS, ...loaded.data };

    applyTheme(settings.theme);
    LAYERS.forEach((l) => applyLayer(l.key));

    Annotate.init(() => settings);
    const ttsOk = TTS.initTTS();
    Dictation.init(window.ER);
    Shadowing.init(window.ER);
    if (window.LadderUI) LadderUI.init(window.ER);
    if (window.TrapsUI) TrapsUI.init();
    if (window.TodayUI) TodayUI.init(window.ER);
    if (window.ScenesUI) ScenesUI.init(window.ER);
    if (window.ImprovUI) ImprovUI.init(window.ER);
    if (window.SpeechUI) await SpeechUI.init(window.ER);
    IELTS.init(window.ER);
    Search.init(window.ER);
    Onboarding.init(window.ER);
    if (!ttsOk) toast('Озвучка недоступна в этом браузере — аудиокнопки скрыты', 'danger');

    renderNav();
    bindHeader();
    bindKeyboard();
    bindContentDelegation();
    bindDocumentCloser();
    bindSessionModal();

    await checkAndSeedContent();
    await checkAndSeedVocab();
    await checkAndSeedExtra();
    await migrateContentAudit();

    const mig = await SRS.migrateProgress();
    if (mig.migrated) toast('Прогресс обновлён до новой схемы: ' + mig.migrated + ' записей');
    await refreshHeaderStats();
    // Счётчик «🗣 вслух сегодня» обновляется сразу после каждой фразы вслух — откуда бы она ни пришла
    const addSpoken = DB.addSpoken;
    DB.addSpoken = async (date, count) => {
      const res = await addSpoken(date, count);
      refreshHeaderStats();
      return res;
    };
    markReady();

    switchTab('today');

    if (await Onboarding.needsOnboarding()) Onboarding.startOnboarding();

    // Шаг 8: PWA, бэкапы, напоминания
    registerSW();
    if (!navigator.onLine) Notifications.showOfflineBanner(); // запуск уже без сети
    Backup.autoBackup();
    Notifications.inAppReminder();
    Notifications.scheduleReminder(settings.reminder_time || '19:00');
  }

  /* ---------- Сидирование ---------- */

  async function seedJobs(jobs, metaKey, version) {
    showSeedProgress();
    let okAll = true;
    for (const [label, arr, store] of jobs) {
      updateSeedProgress(0, arr.length, 'Загрузка: ' + label);
      const res = await DB.seedContent(arr, store, (d, t) => updateSeedProgress(d, t, 'Загрузка: ' + label));
      if (!res.success) { toast('Ошибка загрузки «' + label + '»: ' + res.error, 'danger'); okAll = false; break; }
    }
    if (okAll) {
      await DB.saveCard('content_meta', {
        key: metaKey, value: version, seededAt: new Date().toISOString(),
        count: jobs.reduce((s, j) => s + j[1].length, 0),
      });
    }
    hideSeedProgress();
    return okAll;
  }

  async function checkAndSeedContent() {
    const meta = await DB.getByKey('content_meta', 'content_version');
    const current = meta.success && meta.data ? Number(meta.data.value) : 0;
    if (current >= CONTENT_VERSION) return;
    showSeedProgress();
    updateSeedProgress(0, GRAMMAR_CARDS.length, 'Загрузка грамматики…');
    const res = await DB.seedContent(GRAMMAR_CARDS, 'grammar_cards', (d, t) => updateSeedProgress(d, t, 'Загрузка грамматики…'));
    if (res.success) {
      await DB.saveCard('content_meta', { key: 'content_version', value: CONTENT_VERSION, seededAt: new Date().toISOString(), count: GRAMMAR_CARDS.length });
      dropCardCaches();
    } else toast('Ошибка загрузки грамматики: ' + res.error, 'danger');
    hideSeedProgress();
  }

  async function checkAndSeedVocab() {
    const meta = await DB.getByKey('content_meta', 'vocab_version');
    if (meta.success && meta.data && meta.data.value === VOCAB_VERSION) return;
    if (!window.PHRASAL_CARDS) { toast('content_vocab.js не загрузился', 'danger'); return; }
    const okAll = await seedJobs([
      ['Фразовые глаголы', window.PHRASAL_CARDS, 'phrasal_verbs'],
      ['Коллокации', window.COLLOCATION_CARDS, 'collocations'],
      ['Идиомы', window.IDIOM_CARDS, 'idioms'],
    ], 'vocab_version', VOCAB_VERSION);
    if (okAll) dropCardCaches();
  }

  async function checkAndSeedExtra() {
    const meta = await DB.getByKey('content_meta', 'extra_version');
    if (meta.success && meta.data && meta.data.value === EXTRA_VERSION) return;
    if (!window.SLANG_CARDS || !window.MINIMAL_PAIR_CARDS || !window.READING_CARDS) {
      toast('content_extra.js не загрузился — разделы 5–8 недоступны', 'danger');
      return;
    }
    const okAll = await seedJobs([
      ['Разговорные фразы', window.CONVERSATION_CARDS, 'conversation'],
      ['Сленг', window.SLANG_CARDS, 'slang'],
      ['Minimal Pairs', window.MINIMAL_PAIR_CARDS, 'minimal_pairs'],
      ['Чтение', window.READING_CARDS, 'readings'],
    ], 'extra_version', EXTRA_VERSION);
    if (okAll) dropCardCaches();
  }

  // Этап 7: прогресс после правок контента — дубли объединяются (прогресс переносится),
  // у карточек, ставших другой фразой, прогресс сбрасывается. Один раз (content_migrate.js).
  async function migrateContentAudit() {
    if (!window.ContentMigrate) return;
    const done = await DB.getByKey('content_meta', ContentMigrate.KEY);
    if (done.success && done.data) return;
    const all = await DB.getAllProgress();
    const map = {};
    ((all.success && all.data) || []).forEach((p) => { map[p.cardId] = p; });
    const pl = ContentMigrate.plan(map);
    for (const rec of pl.put) await DB.saveCard('progress', rec);
    for (const id of pl.del) { await DB.deleteCard('progress', id); await DB.deleteCard('errors_log', id); }
    for (const [store, id] of pl.cards) await DB.deleteCard(store, id);
    await DB.saveCard('content_meta', { key: ContentMigrate.KEY, value: true, at: new Date().toISOString() });
  }

  function showSeedProgress() { document.getElementById('seed-progress').classList.remove('hidden'); }
  function hideSeedProgress() { document.getElementById('seed-progress').classList.add('hidden'); }
  function updateSeedProgress(done, total, label) {
    document.getElementById('seed-bar').style.width = (total ? Math.round((done / total) * 100) : 0) + '%';
    document.getElementById('seed-text').textContent = `${label} ${done}/${total}`;
  }

  /* ---------- Данные ---------- */

  async function loadStoreWithProgress(storeName) {
    const cards = await DB.getAll(storeName);
    const prog = await DB.getAllProgress();
    const map = {};
    ((prog.success && prog.data) || []).forEach((p) => { map[p.cardId] = p; });
    return {
      cards: ((cards.success && cards.data) || []).sort((a, b) => a.id.localeCompare(b.id)),
      progress: map,
    };
  }

  // Сбросить кэши карточек всех разделов (сброс прогресса, догрузка контента)
  function dropCardCaches() {
    cacheEpoch++;
    grammarCache = null;
    Object.keys(vocabCache).forEach((k) => delete vocabCache[k]);
  }

  // Если кэш сбросили, пока шла загрузка, её результат устарел (например, прогресс до сброса):
  // в кэш его не пишем и читаем базу заново
  async function ensureGrammarData() {
    while (!grammarCache) {
      const epoch = cacheEpoch;
      const data = await loadStoreWithProgress('grammar_cards');
      if (epoch === cacheEpoch && !grammarCache) grammarCache = data;
    }
    return grammarCache;
  }

  async function ensureVocabData(storeName) {
    while (!vocabCache[storeName]) {
      const epoch = cacheEpoch;
      const data = await loadStoreWithProgress(storeName);
      if (epoch === cacheEpoch && !vocabCache[storeName]) vocabCache[storeName] = data;
    }
    return vocabCache[storeName];
  }

  /* ---------- Шапка: статистика, цель дня ---------- */

  async function refreshHeaderStats() {
    const today = SRS.todayStr();
    const all = await DB.getAllProgress();
    const recs = (all.success && all.data) || [];
    let mastered = 0, toReview = 0;
    for (const r of recs) {
      if (r.status === 'mastered') mastered++;
      if (r.nextReview && String(r.nextReview).slice(0, 10) <= today) toReview++;
    }

    const goal = Number(settings.daily_goal) || 20;
    const logRes = await DB.getStudyLog(today);
    const doneToday = (logRes.success && logRes.data) ? (logRes.data.cardsStudied || 0) : 0;
    const spokenToday = (logRes.success && logRes.data) ? (logRes.data.spoken || 0) : 0;
    const complete = doneToday >= goal;
    // Новый день — снова можно поздравить с целью (раньше — только раз за запуск)
    if (goalDay !== today) { goalDay = today; goalCelebrated = false; }

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('stat-mastered', mastered);
    set('stat-review', toReview);
    set('stat-total', recs.length);
    set('stat-level', settings.currentLevel || '—');
    set('review-count', toReview);
    set('spoken-today', spokenToday); // главная метрика — фразы вслух (этап 6)
    set('spoken-today-word', plural(spokenToday, 'фраза', 'фразы', 'фраз'));

    const streak = await currentStreak();
    set('streak-num', streak);
    set('streak-days', streak + ' ' + plural(streak, 'день', 'дня', 'дней'));

    const cnt = await DB.getAllAchievements();
    set('ach-counter-text', ((cnt.success && cnt.data) || []).length);

    const sideCard = document.getElementById('goal-ring-card');
    if (sideCard) sideCard.classList.toggle('ring-complete', complete);
    updateSidebarStats(Math.min(doneToday, goal), goal, streak);

    if (complete && !goalCelebrated) {
      goalCelebrated = true;
      toast('🎉 Дневная цель достигнута!', 'success');
    }
  }

  /* ---------- Навигация ---------- */

  function renderNav() {
    const nav = document.getElementById('main-nav');
    let lastGroup = null;
    nav.innerHTML = TABS.map((t) => {
      const head = t.group && t.group !== lastGroup ? `<p class="nav-group">${t.group}</p>` : '';
      lastGroup = t.group;
      return `${head}
      <button class="nav-link" data-tab="${t.id}" type="button" style="--line:${t.line}">
        ${lineBullet(t)}<span class="nav-title">${t.title}</span>
      </button>`;
    }).join('');
    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('.nav-link');
      if (!btn) return;
      switchTab(btn.dataset.tab);
      closeMobileNav();
    });
  }

  async function switchTab(tabId) {
    const tab = TABS.find((t) => t.id === tabId);
    if (!tab) return;
    currentTab = tabId;
    moduleScreen = false;
    if (tabId !== 'practice') state.practiceMode = null;
    state.inSession = false;
    currentSession = null;
    state.currentCardId = null;
    state.currentStore = null;
    state.currentPair = null;
    pairRound = null;
    // Остановить то, что продолжало работать от прошлого экрана
    if (window.TTS) TTS.stopSpeaking();
    if (window.Shadowing && Shadowing.stop) Shadowing.stop();
    if (window.LadderUI) LadderUI.stop();
    if (window.ScenesUI) ScenesUI.stop();
    if (window.ImprovUI) ImprovUI.stop();
    if (window.IELTS) IELTS.stop();
    closeWordPopup();

    document.body.style.setProperty('--line', tab.line);
    document.body.dataset.tab = tabId;
    document.querySelectorAll('.nav-link').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === tabId);
    });

    const content = document.getElementById('content');
    content.innerHTML = `
      <div class="section-wrap">
        <div class="section-header"><div class="sk sk-title"></div><div class="sk sk-select"></div></div>
        <div class="vocab-grid">${Array.from({ length: 8 }, () => '<div class="sk sk-tile"></div>').join('')}</div>
      </div>`;
    const myToken = ++renderToken;
    let html;
    try {
      html = await RENDERERS[tab.id](tab);
    } catch (err) {
      console.error('[ER] Ошибка рендера вкладки', tabId, err);
      html = `<div class="section-wrap"><section class="card empty-state"><p class="empty-text">Не удалось открыть раздел. Попробуйте перезагрузить страницу.</p></section></div>`;
    }
    // Пользователь уже ушёл на другую вкладку — не затираем её содержимое
    if (myToken !== renderToken) return;
    content.innerHTML = html;
    bindTabEvents(tabId);
    window.scrollTo(0, 0);
  }

  function sectionHeader(t, filterValue = 'all') {
    return `
      <div class="section-header">
        <h2>${lineBullet(t, 'line-bullet--lg')}<span>${t.title}</span></h2>
        <select class="level-filter" aria-label="Фильтр уровня">
          <option value="all" ${filterValue === 'all' ? 'selected' : ''}>Все уровни</option>
          <option value="A1" ${filterValue === 'A1' ? 'selected' : ''}>A1</option>
          <option value="A2" ${filterValue === 'A2' ? 'selected' : ''}>A2</option>
          <option value="B1" ${filterValue === 'B1' ? 'selected' : ''}>B1</option>
          <option value="B2" ${filterValue === 'B2' ? 'selected' : ''}>B2</option>
        </select>
      </div>`;
  }

  const RENDERERS = {
    today:        () => TodayUI.render(),
    grammar:      renderGrammar,
    phrasal:      (t) => renderVocabList(t, 'phrasal'),
    collocations: (t) => renderVocabList(t, 'collocations'),
    idioms:       (t) => renderVocabList(t, 'idioms'),
    conversation: (t) => renderVocabList(t, 'conversation'),
    slang:        (t) => renderVocabList(t, 'slang'),
    minimal:      (t) => renderVocabList(t, 'minimal'),
    reading:      (t) => renderVocabList(t, 'reading'),
    personal:     (t) => renderVocabList(t, 'personal'),
    practice:     renderPractice,
    ielts:        () => IELTS.render(),
    progress:     renderProgress,
    settings:     renderSettings,
  };

  function bindTabEvents(tabId) {
    if (tabId === 'today') TodayUI.bind();
    if (tabId === 'settings') { bindSettings(); if (window.SpeechUI) SpeechUI.bindSettings(); }
    if (tabId === 'ielts') IELTS.bind();
    if (tabId === 'practice' && state.practiceMode === 'dictation') Dictation.bindSetup();
    if (tabId === 'practice' && state.practiceMode === 'shadowing') Shadowing.bindSetup();
    if (tabId === 'practice' && state.practiceMode === 'ladder') LadderUI.bindSetup();
    if (tabId === 'practice' && state.practiceMode === 'scenes') ScenesUI.bindSetup();
    if (tabId === 'practice' && state.practiceMode === 'improv') ImprovUI.bindSetup();
    if (VOCAB_STORES[tabId]) bindLazyLoading(tabId);
  }

  /* ---------- Аудио ---------- */

  function speak(text, rateOverride) {
    TTS.speak(text, rateOverride || Number(settings.tts_rate) || 0.7);
  }

  /* ---------- Делегирование ---------- */

  function bindContentDelegation() {
    const content = document.getElementById('content');

    content.addEventListener('click', (e) => {
      const mb = e.target.closest('.mode-btn');
      if (mb) {
        state.practiceMode = mb.dataset.mode === 'srs' ? null : mb.dataset.mode;
        switchTab('practice');
        return;
      }
      const lt = e.target.closest('.ladder-train-btn');
      if (lt) { LadderUI.startSingle(lt.dataset.id); return; }
      const ss = e.target.closest('#start-session-btn');
      if (ss) { startSessionUI(); return; }
      const ep = e.target.closest('.error-practice');
      if (ep) { openCardAnywhere(ep.dataset.store, ep.dataset.id); return; }
      const tile = e.target.closest('.topic-tile');
      if (tile) { openGrammarCard(tile.dataset.id); return; }
      const vt = e.target.closest('.vocab-tile');
      if (vt) { openVocabCard(vt.dataset.store, vt.dataset.id); return; }
      const back = e.target.closest('.back-btn');
      if (back) {
        const store = state.currentStore;
        state.currentCardId = null;
        state.currentStore = null;
        state.currentPair = null;
        pairRound = null;
        const key = store && Object.keys(VOCAB_STORES).find((k) => VOCAB_STORES[k].store === store);
        switchTab(key || 'grammar');
        return;
      }
      const audio = e.target.closest('.audio-btn');
      if (audio) { speak(audio.dataset.speech); return; }
      const wt = e.target.closest('.word-token[data-w]');
      if (wt && /[a-z]/i.test(wt.dataset.w)) {
        speak(wt.dataset.w.replace(/[^A-Za-z' -]/g, ''));
        wt.classList.remove('is-speaking'); void wt.offsetWidth; wt.classList.add('is-speaking');
        return;
      }
      const pr = e.target.closest('.play-random');
      if (pr) { pairPlay(); return; }
      const po = e.target.closest('.pair-option');
      if (po) { pairAnswer(po); return; }
      const rw = e.target.closest('.reading-text span.rw');
      if (rw) { openWordPopup(rw); return; }
      const ra = e.target.closest('.read-all-btn');
      if (ra) { speak(state.readingText, state.readingRate); return; }
      const wb = e.target.closest('.open-wordbank-btn');
      if (wb) { openWordbank(); return; }
      const opt = e.target.closest('.test-option');
      if (opt) { handleTestAnswer(opt); return; }
      const srs = e.target.closest('.srs-btn');
      if (srs) { handleSrsMark(srs); return; }
      const edit = e.target.closest('.edit-mark-btn');
      if (edit) {
        const area = document.getElementById('srs-area');
        if (area) {
          const rec = state.currentStore
            ? (vocabCache[state.currentStore] && vocabCache[state.currentStore].progress[state.currentCardId])
            : (grammarCache && grammarCache.progress[state.currentCardId]);
          area.innerHTML = srsButtonsHtml(!rec);
        }
      }
    });

    content.addEventListener('change', (e) => {
      if (e.target.classList.contains('level-filter')) {
        if (currentTab === 'grammar' && !state.currentCardId) {
          state.filter = e.target.value;
          switchTab('grammar');
        } else if (VOCAB_STORES[currentTab] && !state.currentCardId) {
          const v = state.vocab[currentTab];
          v.filter = e.target.value;
          v.limit = 20;
          switchTab(currentTab);
        }
        return;
      }
      if (e.target.classList.contains('reading-speed')) {
        state.readingRate = Number(e.target.value);
      }
    });
  }

  function bindDocumentCloser() {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.word-popup') && !e.target.closest('.reading-text')) closeWordPopup();
    });
  }

  /* ---------- Старт ---------- */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();