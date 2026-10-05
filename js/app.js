/* ==========================================================================
   English Reboot — Шаг 8 (финал): PWA, экспорт/импорт, бэкапы, a11y
   Файл: app.js — навигация, настройки, все 8 разделов, SRS-сессии,
   прогресс/гамификация, тренажёры, онбординг/поиск/достижения,
   SW-регистрация, установка PWA, офлайн-баннер, экспорт/импорт, Anki.
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
  const vocabCache = {};

  const RING_CIRCUMFERENCE = 2 * Math.PI * 52;

  /* ---------- Мост для модулей ---------- */

  let markReady;
  const ready = new Promise((resolve) => { markReady = resolve; });

  // Сбросить кэши карточек и перерисовать текущий раздел (после догрузки контента)
  function reloadContent() {
    grammarCache = null;
    Object.keys(vocabCache).forEach((k) => delete vocabCache[k]);
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
      grammarCache = null;
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
    if (okAll) Object.keys(vocabCache).forEach((k) => delete vocabCache[k]);
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
    if (okAll) Object.keys(vocabCache).forEach((k) => delete vocabCache[k]);
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

  async function ensureGrammarData() {
    if (grammarCache) return grammarCache;
    grammarCache = await loadStoreWithProgress('grammar_cards');
    return grammarCache;
  }

  async function ensureVocabData(storeName) {
    if (vocabCache[storeName]) return vocabCache[storeName];
    vocabCache[storeName] = await loadStoreWithProgress(storeName);
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

  /* ---------- Грамматика ---------- */

  async function renderGrammar(t) {
    const { cards, progress } = await ensureGrammarData();
    const list = state.filter === 'all' ? cards : cards.filter((c) => c.level === state.filter);
    const tiles = list.map((c) => {
      const mark = progress[c.id] && progress[c.id].mark;
      return `
        <button class="topic-tile" data-id="${c.id}" type="button">
          <span class="topic-num">${c.id.slice(1)}</span>
          <span class="topic-body">
            <span class="topic-title">${c.payload.title}</span>
            <span class="topic-meta">
              <span class="level-badge level-badge--${c.level}">${c.level}</span>
              ${c.tags.slice(0, 2).map((tg) => `<span class="tag-chip">${tg}</span>`).join('')}
              ${mark ? `<span class="mark-chip mark-chip--${mark}">${mark === 'know' ? '✓ ' : '↻ '}${MARK_LABEL[mark]}</span>` : ''}
            </span>
          </span>
        </button>`;
    }).join('');
    const known = cards.filter((c) => progress[c.id]).length;
    return `
      <div class="section-wrap">
        ${sectionHeader(t, state.filter)}
        <p class="list-summary">${known} из ${cards.length} тем имеют отметку · показано ${list.length}</p>
        ${list.length ? `<div class="grammar-grid">${tiles}</div>`
          : '<section class="card empty-state"><p class="empty-text">Нет тем для выбранного уровня.</p></section>'}
      </div>`;
  }

  function examplesHtml(payload) {
    return Annotate.examplesHtml(payload.examples || []);
  }

  function shuffled(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function questionsHtml(test) {
    state.test = { answered: 0, correct: 0, total: test.length };
    return test.map((tst, i) => {
      // Перемешиваем варианты при каждом показе: в контенте правильный ответ
      // слишком часто стоит первым, и его легко «угадать» по позиции
      const opts = shuffled(tst.options.map((opt, j) => ({ opt, ok: j === Number(tst.correct) })));
      return `
      <div class="test-question" data-idx="${i}">
        <p><span class="q-num">${i + 1}.</span> ${tst.q}</p>
        <div class="test-options">
          ${opts.map((o) => `
            <button class="test-option" type="button" data-correct="${o.ok}">${o.opt}</button>`).join('')}
        </div>
      </div>`;
    }).join('') + '<div class="test-result" id="test-result" hidden></div>';
  }

  function statusBadgeHtml(rec) {
    if (!rec) return '';
    if (rec.status === 'mastered') return '<span class="status-badge status-mastered">Изучено</span>';
    if (rec.status === 'relearning' || rec.status === 'lapsed') return '<span class="status-badge status-relearning">На повторении</span>';
    return '<span class="status-badge status-learning">В работе</span>';
  }

  function renderGrammarCard(cardData) {
    const p = cardData.payload;
    const rec = grammarCache && grammarCache.progress[cardData.id];
    return `
      <div class="section-wrap">
        <div class="card-detail">
          <div class="detail-top">
            <button class="btn btn-ghost back-btn" type="button">← Назад к списку</button>
            <span class="topic-meta">
              ${statusBadgeHtml(rec)}
              <span class="level-badge level-badge--${cardData.level}">${cardData.level}</span>
            </span>
          </div>
          <h2 class="detail-title">${p.title}</h2>
          <div class="formula">${escapeHtml(p.formula)}</div>
          <p class="explanation">${p.explanation}</p>
          <h3>Примеры</h3>
          <div class="examples">${examplesHtml(p)}</div>
          <h3>Как НЕ говорить</h3>
          <div class="errors-block">
            ${p.errors.map((er) => `
              <div class="error-item">
                <span class="wrong">✗ ${er.wrong}</span>
                <span class="correct">✓ ${er.correct}</span>
                <p class="error-note">${er.note}</p>
              </div>`).join('')}
          </div>
          <h3>Проверь себя</h3>
          <div class="test-block">
            <p class="test-progress" id="test-progress">Ответлено 0/${p.test.length}</p>
            ${questionsHtml(p.test)}
          </div>
          <div class="srs-area" id="srs-area">${srsButtonsHtml(!rec)}</div>
        </div>
      </div>`;
  }

  function openGrammarCard(id) {
    const cached = grammarCache && grammarCache.cards.find((c) => c.id === id);
    if (!cached) { toast('Карточка не найдена', 'danger'); return; }
    state.currentCardId = id;
    document.getElementById('content').innerHTML = renderGrammarCard(cached);
    window.scrollTo(0, 0);
  }

  /* ---------- Словарные разделы: списки ---------- */

  function vocabTileHtml(c, mark, storeName) {
    let sub = '';
    if (c.type === 'slang') sub = c.payload.full_form;
    else if (c.type === 'conversation') sub = c.payload.category;
    else if (c.type === 'collocation') sub = c.payload.category;
    else if (c.type === 'idiom') sub = c.payload.context;
    else sub = (c.tags && c.tags[0]) || '';
    if (sub.length > 34) sub = sub.slice(0, 33) + '…';
    return `
      <button class="vocab-tile ${c.type === 'slang' ? 'slang-tile' : ''}" data-store="${storeName}" data-id="${c.id}" type="button">
        <span class="tile-front">${c.payload.front}</span>
        ${c.type === 'slang' ? `<span class="tile-full-form">${c.payload.full_form}</span>` : ''}
        <span class="tile-trans">${c.payload.translation || ''}</span>
        <span class="topic-meta">
          ${c.level ? `<span class="level-badge level-badge--${c.level}">${c.level}</span>` : ''}
          ${sub && c.type !== 'slang' ? `<span class="tag-chip">${sub}</span>` : ''}
          ${mark ? `<span class="mark-chip mark-chip--${mark}">${mark === 'know' ? '✓ ' : '↻ '}${MARK_LABEL[mark]}</span>` : ''}
        </span>
      </button>`;
  }

  function minimalTileHtml(c, mark, storeName) {
    const a = c.payload.articulation || '';
    const prev = a.slice(0, 60) + (a.length > 60 ? '…' : '');
    return `
      <button class="vocab-tile" data-store="${storeName}" data-id="${c.id}" type="button">
        <span class="tile-front">${c.payload.front}</span>
        <span class="tile-trans">${prev}</span>
        <span class="topic-meta">
          <span class="level-badge level-badge--${c.level}">${c.level}</span>
          ${mark ? `<span class="mark-chip mark-chip--${mark}">${MARK_LABEL[mark]}</span>` : ''}
        </span>
      </button>`;
  }

  function readingTileHtml(c, mark, storeName) {
    const type = c.payload.reading_type;
    return `
      <button class="vocab-tile" data-store="${storeName}" data-id="${c.id}" type="button">
        <span class="tile-front">${c.payload.title}</span>
        <span class="topic-meta">
          <span class="reading-type-badge ${type}">${READING_TYPES[type] || type}</span>
          <span class="level-badge level-badge--${c.level}">${c.level}</span>
          ${mark ? `<span class="mark-chip mark-chip--${mark}">${MARK_LABEL[mark]}</span>` : ''}
        </span>
      </button>`;
  }

  async function renderVocabList(t, key) {
    const cfg = VOCAB_STORES[key];
    const { cards, progress } = await ensureVocabData(cfg.store);
    const v = state.vocab[key] || (state.vocab[key] = { filter: 'all', limit: 20 });
    const list = v.filter === 'all' ? cards : cards.filter((c) => c.level === v.filter);
    const shown = list.slice(0, v.limit);
    const tileFn = cfg.kind === 'minimal' ? minimalTileHtml : cfg.kind === 'reading' ? readingTileHtml : vocabTileHtml;
    const tiles = shown.map((c) => tileFn(c, progress[c.id] && progress[c.id].mark, cfg.store)).join('');
    const marked = cards.filter((c) => progress[c.id]).length;
    return `
      <div class="section-wrap" data-vocab="${key}">
        ${sectionHeader(t, v.filter)}
        <p class="list-summary">${marked} из ${cards.length} отмечено · показано ${shown.length} из ${list.length}</p>
        ${list.length
          ? `<div class="vocab-grid">${tiles}</div>
             ${shown.length < list.length ? '<div class="list-sentinel">Показать ещё…</div>' : ''}`
          : `<section class="card empty-state"><p class="empty-text">${key === 'personal' && !cards.length
              ? 'Колода пуста. Импортируйте карточки из Anki: Настройки → «Импорт из Anki».'
              : 'Нет карточек для выбранного уровня.'}</p></section>`}
      </div>`;
  }

  function bindLazyLoading(key) {
    const cfg = VOCAB_STORES[key];
    const v = state.vocab[key];
    const grid = document.querySelector('.vocab-grid');
    const sentinel = document.querySelector('.list-sentinel');
    const summary = document.querySelector('.list-summary');
    if (!grid || !sentinel) return;
    let loading = false;
    const loadMore = async () => {
      if (loading) return;
      const data = await ensureVocabData(cfg.store);
      const all = v.filter === 'all' ? data.cards : data.cards.filter((c) => c.level === v.filter);
      if (v.limit >= all.length) { sentinel.remove(); return; }
      loading = true;
      const tileFn = cfg.kind === 'minimal' ? minimalTileHtml : cfg.kind === 'reading' ? readingTileHtml : vocabTileHtml;
      const next = all.slice(v.limit, v.limit + 20);
      v.limit += 20;
      grid.insertAdjacentHTML('beforeend',
        next.map((c) => tileFn(c, data.progress[c.id] && data.progress[c.id].mark, cfg.store)).join(''));
      if (summary) summary.textContent = summary.textContent.replace(/показано \d+/, `показано ${Math.min(v.limit, all.length)}`);
      if (v.limit >= all.length) {
        if (state.lazyObserver) state.lazyObserver.unobserve(sentinel);
        sentinel.remove();
      }
      loading = false;
    };
    if (state.lazyObserver) state.lazyObserver.disconnect();
    if ('IntersectionObserver' in window) {
      state.lazyObserver = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) loadMore(); });
      }, { rootMargin: '400px' });
      state.lazyObserver.observe(sentinel);
    } else {
      sentinel.addEventListener('click', loadMore);
    }
  }

  /* ---------- Карточки: словарь / сленг / разговорные ---------- */

  function renderVocabCard(cardData) {
    const p = cardData.payload;
    const rec = state.currentStore && vocabCache[state.currentStore]
      ? vocabCache[state.currentStore].progress[cardData.id] : null;

    let headHtml;
    if (p.full_form) {
      headHtml = `
        <h2 class="detail-title">${p.front}
          <button class="audio-btn audio-btn--inline" data-speech="${escapeAttr(p.front)}" type="button" title="Прослушать" aria-label="Озвучить">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>
          </button>
        </h2>
        <p class="slang-full-form">= ${p.full_form}</p>
        <div class="ipa-chips">
          <span class="ipa-chip">полная: ${p.ipa_full} <span class="ru-tr">${Annotate.ruTranscribe(p.ipa_full, p.full_form || '')}</span></span>
          <span class="ipa-chip">сокращённая: ${p.ipa_short} <span class="ru-tr">${Annotate.ruTranscribe(p.ipa_short, p.front)}</span></span>
        </div>`;
    } else {
      headHtml = `
        <h2 class="detail-title">${p.front}
          <button class="audio-btn audio-btn--inline" data-speech="${escapeAttr(p.front)}" type="button" title="Прослушать" aria-label="Озвучить">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>
          </button>
        </h2>
        <p class="card-translation">${p.translation || ''}</p>`;
    }

    let extraBlock = '';
    if (p.dialog) extraBlock = `<div class="conversation-dialog">${p.dialog.map((l) => `<p>${String(l).replace(/^\s*[—–-]\s*/, '')}</p>`).join('')}</div>`;
    if (p.context) extraBlock = `<div class="context-note"><span class="context-icon" aria-hidden="true">💡</span><p>${p.context}</p></div>`;
    if (p.category && !p.dialog) extraBlock = `<div class="category-badge">${p.category}</div>`;

    const errorsBlock = p.errors ? `
      <h3>Как НЕ говорить</h3>
      <div class="errors-block">
        ${p.errors.map((er) => `
          <div class="error-item">
            <span class="wrong">✗ ${er.wrong}</span>
            <span class="correct">✓ ${er.correct}</span>
            <p class="error-note">${er.note}</p>
          </div>`).join('')}
      </div>` : '';

    return `
      <div class="section-wrap">
        <div class="card-detail">
          <div class="detail-top">
            <button class="btn btn-ghost back-btn" type="button">← Назад к списку</button>
            <span class="topic-meta">
              ${statusBadgeHtml(rec)}
              ${cardData.level ? `<span class="level-badge level-badge--${cardData.level}">${cardData.level}</span>` : ''}
            </span>
          </div>
          ${headHtml}
          ${extraBlock}
          ${window.TrapsUI && window.Ladder && Ladder.isUsCard(cardData) ? TrapsUI.placeholder(p.front) : ''}
          ${window.Ladder && Ladder.isUsCard(cardData) ? ladderButtonHtml(cardData, rec) : ''}
          ${(p.examples || []).length ? `<h3>Примеры</h3>
          <div class="examples">${examplesHtml(p)}</div>` : ''}
          ${errorsBlock}
          ${(p.test || []).length ? `<h3>Проверь себя</h3>
          <div class="test-block">
            <p class="test-progress" id="test-progress">Ответлено 0/${p.test.length}</p>
            ${questionsHtml(p.test)}
          </div>` : ''}
          <div class="srs-area" id="srs-area">${srsButtonsHtml(!rec)}</div>
        </div>
      </div>`;
  }

  /* ---------- Minimal Pairs ---------- */

  function renderMinimalPairCard(cardData) {
    const p = cardData.payload;
    const rec = state.currentStore && vocabCache[state.currentStore]
      ? vocabCache[state.currentStore].progress[cardData.id] : null;
    const isPair = !!p.word2;
    const pairBlock = isPair ? `
      <div class="pair-words">
        <div class="pair-word">
          <button class="audio-btn" data-speech="${escapeAttr(p.word1)}" type="button" title="Прослушать" aria-label="Озвучить ${p.word1}">🔊</button>
          <span class="pw-text">${p.word1}</span>
          <span class="ipa">${p.ipa1}</span><span class="ru-tr">${Annotate.ruTranscribe(p.ipa1, p.word1)}</span>
        </div>
        <span class="pair-slash">/</span>
        <div class="pair-word">
          <button class="audio-btn" data-speech="${escapeAttr(p.word2)}" type="button" title="Прослушать" aria-label="Озвучить ${p.word2}">🔊</button>
          <span class="pw-text">${p.word2}</span>
          <span class="ipa">${p.ipa2}</span><span class="ru-tr">${Annotate.ruTranscribe(p.ipa2, p.word2)}</span>
        </div>
      </div>
      <h3>Тренажёр на слух</h3>
      <div class="pair-trainer">
        <p class="instruction">${p.audio_test.instruction} До 3 прослушиваний на раунд.</p>
        <button class="play-random" type="button" aria-label="Прослушать случайное слово">🔊</button>
        <div class="pair-options">
          <button class="pair-option" data-word="${escapeAttr(p.word1)}" type="button">${p.word1}</button>
          <button class="pair-option" data-word="${escapeAttr(p.word2)}" type="button">${p.word2}</button>
        </div>
        <div class="pair-feedback" id="pair-feedback" role="status" aria-live="polite"></div>
      </div>` : `
      <div class="ipa-chips"><span class="ipa-chip">${p.ipa1} <span class="ru-tr">${Annotate.ruTranscribe(p.ipa1, p.word1)}</span></span></div>`;

    return `
      <div class="section-wrap">
        <div class="card-detail">
          <div class="detail-top">
            <button class="btn btn-ghost back-btn" type="button">← Назад к списку</button>
            <span class="topic-meta">
              ${statusBadgeHtml(rec)}
              <span class="level-badge level-badge--${cardData.level}">${cardData.level}</span>
            </span>
          </div>
          <h2 class="detail-title">${p.front}</h2>
          ${pairBlock}
          <h3>Разница в звуках</h3>
          <p class="articulation">${p.articulation}</p>
          <h3>Примеры</h3>
          <div class="examples">${examplesHtml(p)}</div>
          <h3>Проверь себя</h3>
          <div class="test-block">
            <p class="test-progress" id="test-progress">Ответлено 0/${p.test.length}</p>
            ${questionsHtml(p.test)}
          </div>
          <div class="srs-area" id="srs-area">${srsButtonsHtml(!rec)}</div>
        </div>
      </div>`;
  }

  function pairPlay() {
    const card = state.currentPair;
    if (!card) return;
    const p = card.payload;
    if (!p.word2) { speak(p.word1); return; }
    if (!pairRound || pairRound.done) {
      pairRound = { target: Math.random() < 0.5 ? p.word1 : p.word2, tries: 1, done: false };
      document.querySelectorAll('.pair-option').forEach((b) => b.classList.remove('correct', 'wrong'));
    } else {
      pairRound.tries++;
    }
    if (pairRound.tries > 3) { revealPair(); return; }
    speak(pairRound.target);
    setPairFeedback('Слушайте… (прослушивание ' + pairRound.tries + ' из 3)', '');
  }

  function pairAnswer(btn) {
    if (!pairRound) { setPairFeedback('Сначала нажмите 🔊', ''); return; }
    if (pairRound.done) { setPairFeedback('Раунд завершён — нажмите 🔊 для нового.', ''); return; }
    const okAns = btn.dataset.word === pairRound.target;
    document.querySelectorAll('.pair-option').forEach((b) => {
      b.classList.toggle('correct', b.dataset.word === pairRound.target);
    });
    if (okAns) {
      pairRound.done = true;
      setPairFeedback('✓ Верно! Это было «' + pairRound.target + '».', 'correct');
    } else {
      btn.classList.add('wrong');
      pairRound.tries++;
      if (pairRound.tries >= 3) revealPair();
      else {
        setPairFeedback('Неверно. Слушайте ещё раз…', 'wrong');
        setTimeout(() => speak(pairRound.target), 600);
      }
    }
  }

  function revealPair() {
    if (!pairRound) return;
    pairRound.done = true;
    document.querySelectorAll('.pair-option').forEach((b) => {
      b.classList.remove('wrong');
      b.classList.toggle('correct', b.dataset.word === pairRound.target);
    });
    setPairFeedback('Это было «' + pairRound.target + '». Нажмите 🔊 для нового раунда.', 'wrong');
  }

  function setPairFeedback(text, cls) {
    const el = document.getElementById('pair-feedback');
    if (!el) return;
    el.textContent = text;
    el.className = 'pair-feedback' + (cls ? ' ' + cls : '');
  }

  /* ---------- Чтение ---------- */

  function renderReadingCard(cardData) {
    const p = cardData.payload;
    const rec = state.currentStore && vocabCache[state.currentStore]
      ? vocabCache[state.currentStore].progress[cardData.id] : null;
    state.readingText = p.text;
    state.readingRate = Number(settings.tts_rate) || 0.7;

    const textHtml = p.lines.map((line) => {
      const spans = line.parts.map((pt) => {
        const clickable = /[a-zA-Z]/.test(pt.word);
        return clickable
          ? `<span class="rw pos-${pt.pos}" data-w="${escapeAttr(pt.word)}" data-ipa="${escapeAttr(pt.ipa)}">${pt.word}</span> `
          : `<span class="punct">${pt.word}</span> `;
      }).join('');
      return `<p class="reading-line">${spans}</p>`;
    }).join('');

    const rateSel = [0.5, 0.7, 1.0].map((r) =>
      `<option value="${r}" ${Math.abs(state.readingRate - r) < 0.05 ? 'selected' : ''}>${r.toFixed(1)}×</option>`).join('');

    return `
      <div class="section-wrap">
        <div class="card-detail">
          <div class="detail-top">
            <button class="btn btn-ghost back-btn" type="button">← Назад к списку</button>
            <span class="topic-meta">
              ${statusBadgeHtml(rec)}
              <span class="reading-type-badge ${p.reading_type}">${READING_TYPES[p.reading_type] || p.reading_type}</span>
              <span class="level-badge level-badge--${cardData.level}">${cardData.level}</span>
            </span>
          </div>
          <h2 class="detail-title">${p.title}</h2>
          <div class="reading-controls">
            <button class="btn read-all-btn" type="button">🔊 Озвучить текст</button>
            <div class="reading-speed-control">
              <label for="reading-rate">Скорость:</label>
              <select id="reading-rate" class="reading-speed" aria-label="Скорость озвучки">${rateSel}</select>
            </div>
            <button class="btn btn-ghost open-wordbank-btn" type="button">📚 Мой словарик</button>
          </div>
          <div class="reading-text" id="reading-text">${textHtml}</div>
          <p class="setting-hint">Кликните по любому слову: произношение и «+ В словарь».</p>
          <h3>Вопросы на понимание</h3>
          <div class="test-block">
            <p class="test-progress" id="test-progress">Ответлено 0/${p.questions.length}</p>
            ${questionsHtml(p.questions)}
          </div>
          <div class="srs-area" id="srs-area">${srsButtonsHtml(!rec)}</div>
        </div>
      </div>`;
  }

  function openWordPopup(spanEl) {
    const word = spanEl.dataset.w || '';
    if (!/[a-zA-Z]/.test(word)) return;
    closeWordPopup();
    const pop = document.createElement('div');
    pop.className = 'word-popup';
    pop.id = 'word-popup';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'Слово ' + word);
    pop.innerHTML = `
      <p class="word">${word}</p>
      ${spanEl.dataset.ipa ? `<p class="ipa">${spanEl.dataset.ipa}</p><p class="ru-tr ru-tr--big">${Annotate.ruWord(spanEl.dataset.ipa, word)}</p>` : ''}
      <div class="word-popup-actions">
        <button class="word-audio" type="button" aria-label="Озвучить">🔊 Слушать</button>
        <button class="add-to-wordbank" type="button">+ В словарь</button>
      </div>`;
    document.body.appendChild(pop);
    const r = spanEl.getBoundingClientRect();
    const left = Math.min(Math.max(8, r.left), window.innerWidth - 215);
    let top = r.bottom + 8;
    if (top + 130 > window.innerHeight) top = Math.max(8, r.top - pop.offsetHeight - 8);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    pop.querySelector('.word-audio').addEventListener('click', () => speak(word));
    pop.querySelector('.add-to-wordbank').addEventListener('click', () => addToWordbank(word));
  }

  function closeWordPopup() {
    const el = document.getElementById('word-popup');
    if (el) el.remove();
  }

  async function addToWordbank(word) {
    const w = word.toLowerCase().replace(/[^a-z'-]/g, '');
    if (!w) return;
    const ex = await DB.getByKey('word_bank', w);
    let rec;
    if (ex.success && ex.data) rec = { ...ex.data, frequency: (ex.data.frequency || 1) + 1 };
    else rec = { word: w, frequency: 1, addedDate: DB.toDateStr(new Date()) };
    const res = await DB.saveCard('word_bank', rec);
    if (res.success) toast('«' + w + '» — в словарике (×' + rec.frequency + ')', 'success');
    else toast('Не удалось добавить: ' + res.error, 'danger');
  }

  async function openWordbank() {
    const zone = document.getElementById('wordbank-modal');
    zone.hidden = false;
    const res = await DB.getAll('word_bank');
    const items = ((res.success && res.data) || []).sort((a, b) => (b.frequency || 0) - (a.frequency || 0));
    zone.innerHTML = `
      <div class="wordbank-overlay" id="wb-overlay">
        <div class="wordbank-content" role="dialog" aria-modal="true" aria-label="Мой словарик">
          <div class="wb-head">
            <h3>Мой словарик</h3>
            <button class="btn btn-ghost" id="wb-close" type="button">Закрыть</button>
          </div>
          ${items.length
            ? items.map((it) => `
                <div class="wordbank-item">
                  <span class="wb-word">${it.word}</span>
                  <span class="wb-right">
                    <span class="freq">×${it.frequency || 1}</span>
                    <button class="btn btn-ghost wb-del" data-word="${escapeAttr(it.word)}" type="button" aria-label="Удалить ${it.word}">Удалить</button>
                  </span>
                </div>`).join('')
            : '<p class="setting-hint">Пока пусто. Слова из текстов «Чтения» появятся здесь.</p>'}
        </div>
      </div>`;
    zone.querySelector('#wb-close').addEventListener('click', closeWordbank);
    zone.querySelector('#wb-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'wb-overlay') closeWordbank();
    });
    zone.querySelectorAll('.wb-del').forEach((b) => b.addEventListener('click', async () => {
      await DB.deleteCard('word_bank', b.dataset.word);
      openWordbank();
    }));
  }

  function closeWordbank() {
    const z = document.getElementById('wordbank-modal');
    z.hidden = true;
    z.innerHTML = '';
  }

  function openVocabCard(storeName, id) {
    const data = vocabCache[storeName];
    const cardData = data && data.cards.find((c) => c.id === id);
    if (!cardData) { toast('Карточка не найдена', 'danger'); return; }
    state.currentCardId = id;
    state.currentStore = storeName;
    const key = Object.keys(VOCAB_STORES).find((k) => VOCAB_STORES[k].store === storeName);
    let html;
    if (VOCAB_STORES[key].kind === 'minimal') {
      state.currentPair = cardData;
      pairRound = null;
      html = renderMinimalPairCard(cardData);
    } else if (VOCAB_STORES[key].kind === 'reading') {
      html = renderReadingCard(cardData);
    } else {
      html = renderVocabCard(cardData);
    }
    document.getElementById('content').innerHTML = html;
    window.scrollTo(0, 0);
  }

  async function openCardAnywhere(storeName, cardId) {
    if (storeName === 'grammar_cards') {
      await ensureGrammarData();
      await switchTab('grammar');
      openGrammarCard(cardId);
      return;
    }
    const key = Object.keys(VOCAB_STORES).find((k) => VOCAB_STORES[k].store === storeName);
    if (!key) { toast('Раздел для карточки не найден', 'danger'); return; }
    await ensureVocabData(storeName);
    await switchTab(key);
    openVocabCard(storeName, cardId);
  }

  /* ---------- SRS-кнопки ---------- */

  // Американская разговорная фраза: вход в лестницу упражнений (ladder_ui.js)
  function ladderButtonHtml(cardData, rec) {
    const step = LadderUI.stepOf(rec);
    const title = Ladder.STEPS[step - 1].title;
    return `
      <div class="ladder-entry">
        <button class="btn-primary ladder-train-btn" data-id="${escapeAttr(cardData.id)}" type="button">🪜 Тренировать: сказать, а не прочитать</button>
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
        <span class="srs-done-label">✓ Отмечено: ${MARK_LABEL[mark]}</span>
        <button class="btn btn-ghost edit-mark-btn" type="button">Изменить</button>
      </div>`;
  }

  async function handleSrsMark(btn) {
    let cardId, storeName;
    if (state.inSession && currentSession) {
      const item = currentSession.cards[currentSession.currentIndex];
      if (!item) return;
      cardId = item.cardId;
      storeName = item.storeName;
    } else {
      cardId = state.currentCardId;
      storeName = state.currentStore || 'grammar_cards';
    }
    if (!cardId) return;
    const mark = btn.dataset.mark;
    document.querySelectorAll('.srs-btn').forEach((b) => { b.disabled = true; });

    const res = await SRS.saveProgress(cardId, storeName, mark);
    if (!res.success) {
      toast('Не удалось сохранить: ' + res.error, 'danger');
      document.querySelectorAll('.srs-btn').forEach((b) => { b.disabled = false; });
      return;
    }
    const cache = storeName === 'grammar_cards' ? grammarCache : vocabCache[storeName];
    if (cache) cache.progress[cardId] = res.data;

    SRS.updateStreak();
    if (!state.inSession) await addStudyLog(1, mark === 'know' ? 1 : 0, 0);
    runAchievementCheck();
    refreshHeaderStats();

    if (state.inSession) {
      if (mark === 'know') currentSession.correctCount++;
      currentSession.currentIndex++;
      setTimeout(advanceSession, 350);
    } else {
      const area = document.getElementById('srs-area');
      if (area) area.innerHTML = srsDoneHtml(mark);
      toast('Отметка сохранена: ' + MARK_LABEL[mark], 'success');
    }
  }

  /* ---------- Тренажёр ---------- */

  async function renderPractice(t) {
    const due = await SRS.getDueCards();
    const relearn = due.filter((c) => c.status === 'relearning' || c.status === 'lapsed').length;
    const modes = `
      <div class="practice-modes" role="tablist" aria-label="Режимы тренажёра">
        <button class="mode-btn ${!state.practiceMode ? 'active' : ''}" data-mode="srs" type="button">🔄 SRS-повторение</button>
        <button class="mode-btn ${state.practiceMode === 'dictation' ? 'active' : ''}" data-mode="dictation" type="button">✍️ Диктант</button>
        <button class="mode-btn ${state.practiceMode === 'shadowing' ? 'active' : ''}" data-mode="shadowing" type="button">🎤 Shadowing</button>
        <button class="mode-btn ${state.practiceMode === 'ladder' ? 'active' : ''}" data-mode="ladder" type="button">🪜 Лестница фраз</button>
        <button class="mode-btn ${state.practiceMode === 'scenes' ? 'active' : ''}" data-mode="scenes" type="button">🎬 Сцены</button>
        <button class="mode-btn ${state.practiceMode === 'improv' ? 'active' : ''}" data-mode="improv" type="button">🎲 Импровизация</button>
      </div>`;

    let panel;
    if (state.practiceMode === 'dictation') {
      panel = Dictation.renderSetup();
    } else if (state.practiceMode === 'shadowing') {
      panel = Shadowing.renderSetup();
    } else if (state.practiceMode === 'ladder') {
      panel = await LadderUI.renderSetup();
    } else if (state.practiceMode === 'scenes') {
      panel = await ScenesUI.renderSetup();
    } else if (state.practiceMode === 'improv') {
      panel = await ImprovUI.renderSetup();
    } else {
      panel = due.length ? `
        <h2 class="detail-title">Повторение</h2>
        <p class="practice-intro">У тебя <b>${due.length}</b> ${plural(due.length, 'карточка', 'карточки', 'карточек')} на повторение${relearn ? ' · ' + relearn + ' требуют особого внимания' : ''}. Жми «Начать»!</p>
        <button class="btn-primary" id="start-session-btn" type="button">Начать повторение</button>
        <p class="practice-alt">Или изучай новые карточки в разделах выше.</p>
      ` : `
        <h2 class="detail-title">Всё повторено!</h2>
        <p class="practice-intro">На сегодня всё. Возвращайся завтра — и не забывай отмечать новые карточки в разделах.</p>
        <p class="practice-alt">Или изучай новые карточки в разделах выше.</p>
      `;
    }

    return `<div class="section-wrap">${sectionHeader(t)}${modes}<div class="card practice-panel">${panel}</div></div>`;
  }

  /* ---------- SRS-сессия ---------- */

  async function startSessionUI() {
    const cards = await SRS.startSession(SRS.todayStr(), 15);
    if (!cards.length) { toast('Нет карточек на повторение'); return; }
    currentSession = {
      cards, currentIndex: 0, correctCount: 0, totalCount: cards.length,
      startedAt: new Date().toISOString(),
    };
    state.inSession = true;
    state.readingRate = Number(settings.tts_rate) || 0.7;
    renderSessionCard();
  }

  function sessionCardContentHtml(cardData) {
    const p = cardData.payload;
    if (cardData.type === 'grammar') {
      return `
        <h2 class="detail-title">${p.title}</h2>
        <div class="formula">${escapeHtml(p.formula)}</div>
        <p class="explanation">${p.explanation}</p>
        <h3>Примеры</h3><div class="examples">${examplesHtml(p)}</div>`;
    }
    if (cardData.type === 'minimal_pair') {
      const words = p.word2 ? `
        <div class="pair-words">
          <div class="pair-word">
            <button class="audio-btn" data-speech="${escapeAttr(p.word1)}" type="button" aria-label="Озвучить ${p.word1}">🔊</button>
            <span class="pw-text">${p.word1}</span><span class="ipa">${p.ipa1}</span><span class="ru-tr">${Annotate.ruTranscribe(p.ipa1, p.word1)}</span>
          </div>
          <span class="pair-slash">/</span>
          <div class="pair-word">
            <button class="audio-btn" data-speech="${escapeAttr(p.word2)}" type="button" aria-label="Озвучить ${p.word2}">🔊</button>
            <span class="pw-text">${p.word2}</span><span class="ipa">${p.ipa2}</span><span class="ru-tr">${Annotate.ruTranscribe(p.ipa2, p.word2)}</span>
          </div>
        </div>` : `<div class="ipa-chips"><span class="ipa-chip">${p.ipa1} <span class="ru-tr">${Annotate.ruTranscribe(p.ipa1, p.word1)}</span></span></div>`;
      return `
        <h2 class="detail-title">${p.front}</h2>
        ${words}
        <p class="articulation">${p.articulation}</p>
        <h3>Примеры</h3><div class="examples">${examplesHtml(p)}</div>`;
    }
    if (cardData.type === 'reading') {
      const paras = escapeHtml(p.text).split('\n').map((l) => `<p class="reading-line">${l}</p>`).join('');
      return `
        <h2 class="detail-title">${p.title}</h2>
        <div class="reading-controls">
          <button class="btn read-all-btn" type="button">🔊 Озвучить текст</button>
          <div class="reading-speed-control">
            <label>Скорость:</label>
            <select class="reading-speed" id="reading-rate" aria-label="Скорость озвучки">
              ${[0.5, 0.7, 1.0].map((r) => `<option value="${r}" ${Math.abs(state.readingRate - r) < 0.05 ? 'selected' : ''}>${r.toFixed(1)}×</option>`).join('')}
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
          <button class="audio-btn audio-btn--inline" data-speech="${escapeAttr(p.front)}" type="button" aria-label="Озвучить">🔊</button>
        </h2>
        <p class="card-translation">${p.translation || ''}</p>`;
    }
    let extra = '';
    if (p.dialog) extra = `<div class="conversation-dialog">${p.dialog.map((l) => `<p>${String(l).replace(/^\s*[—–-]\s*/, '')}</p>`).join('')}</div>`;
    if (p.context) extra = `<div class="context-note"><span class="context-icon" aria-hidden="true">💡</span><p>${p.context}</p></div>`;
    if (p.category && !p.dialog) extra = `<div class="category-badge">${p.category}</div>`;
    return head + extra + ((p.examples || []).length ? `<h3>Примеры</h3><div class="examples">${examplesHtml(p)}</div>` : '');
  }

  async function renderSessionCard() {
    if (!currentSession) return;
    const item = currentSession.cards[currentSession.currentIndex];
    if (!item) { showSessionComplete(); return; }
    const res = await DB.getByKey(item.storeName, item.cardId);
    if (!res.success || !res.data) {
      currentSession.currentIndex++;
      advanceSession();
      return;
    }
    const cardData = res.data;
    if (cardData.type === 'reading') state.readingText = cardData.payload.text;
    const pct = Math.round((currentSession.currentIndex / currentSession.totalCount) * 100);
    const statusLabel = (item.status === 'relearning' || item.status === 'lapsed')
      ? '<span class="status-badge status-relearning">На повторении</span>' : '';

    document.getElementById('content').innerHTML = `
      <div class="section-wrap">
        <div class="session-progress"><div class="session-progress-fill" style="width:${pct}%"></div></div>
        <p class="session-counter" aria-live="polite">Карточка ${currentSession.currentIndex + 1} из ${currentSession.totalCount} · клавиши 1/2/3 — оценка</p>
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
    if (!currentSession) return;
    if (currentSession.currentIndex >= currentSession.totalCount) { showSessionComplete(); return; }
    renderSessionCard();
  }

  function showSessionComplete() {
    const dur = currentSession.startedAt
      ? Math.round((Date.now() - new Date(currentSession.startedAt).getTime()) / 1000) : 0;
    addStudyLog(currentSession.totalCount, currentSession.correctCount, dur);
    runAchievementCheck();

    const zone = document.getElementById('session-complete-modal');
    if (!zone) { currentSession = null; return; }
    const { correctCount, totalCount } = currentSession;
    const percent = totalCount ? Math.round((correctCount / totalCount) * 100) : 0;
    zone.querySelector('.session-result').innerHTML = `
      <p>Пройдено карточек: <strong>${totalCount}</strong></p>
      <p>Ответов «Знаю»: <strong>${correctCount}</strong></p>
      <p>Точность: <strong>${percent}%</strong></p>`;
    zone.hidden = false;
    requestAnimationFrame(() => zone.querySelector('.modal-overlay').classList.add('show'));
    refreshHeaderStats();
  }

  function closeSessionModal() {
    const zone = document.getElementById('session-complete-modal');
    if (zone && !zone.hidden) {
      zone.querySelector('.modal-overlay').classList.remove('show');
      setTimeout(() => { zone.hidden = true; }, 200);
    }
    currentSession = null;
    state.inSession = false;
    refreshHeaderStats();
  }

  function bindSessionModal() {
    const zone = document.getElementById('session-complete-modal');
    if (!zone) return;
    zone.querySelector('#btn-repeat-today').addEventListener('click', async () => {
      closeSessionModal();
      const due = await SRS.getDueCards();
      if (due.length) startSessionUI();
      else toast('Все карточки повторены! Возвращайся завтра.', 'success');
    });
    zone.querySelector('#btn-close-modal').addEventListener('click', () => {
      closeSessionModal();
      switchTab('practice');
    });
  }

  /* ---------- Вкладка «Прогресс» ---------- */

  async function renderProgress(t) {
    const today = SRS.todayStr();
    const stats = await SRS.getStats(today);
    const streak = await currentStreak();
    const allProg = await DB.getAllProgress();
    const recs = (allProg.success && allProg.data) || [];

    const userLv = Achievements.getUserLevel(stats.mastered);
    const levelBlock = `
      <div class="user-level-display">
        <span class="level-icon" aria-hidden="true">${userLv.icon}</span>
        <span class="level-kind">Уровень по изученным карточкам</span>
        <span class="level-title">${userLv.title}</span>
        <div class="level-progress" role="progressbar" aria-valuenow="${userLv.progress}" aria-valuemin="0" aria-valuemax="100">
          <div class="level-progress-fill" style="width:${userLv.progress}%"></div>
        </div>
        <p class="level-next">${userLv.next
          ? `До уровня «${userLv.next.title}»: ещё ${userLv.next.min - stats.mastered} ${plural(userLv.next.min - stats.mastered, 'карточка', 'карточки', 'карточек')} «Изучено»`
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
        <span class="streak-icon" aria-hidden="true">🔥</span><span class="streak-num">${streak}</span><span class="streak-label">дней подряд</span>
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
    for (const cs of CONTENT_STORES) {
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
      <p class="setting-hint">Зелёный — был заход и работа с карточками. Оранжевая рамка — сегодня.</p>`;

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
        ${sectionHeader(t)}
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

  /* ---------- Логика теста ---------- */

  function handleTestAnswer(btn) {
    const qEl = btn.closest('.test-question');
    if (!qEl || qEl.classList.contains('answered')) return;
    qEl.classList.add('answered');
    const isCorrect = btn.dataset.correct === 'true';
    if (isCorrect) state.test.correct += 1;
    state.test.answered += 1;
    qEl.querySelectorAll('.test-option').forEach((b) => {
      b.disabled = true;
      if (b.dataset.correct === 'true') b.classList.add('is-correct');
    });
    if (!isCorrect) btn.classList.add('is-wrong');
    const progressEl = document.getElementById('test-progress');
    if (progressEl) progressEl.textContent = `Ответлено ${state.test.answered}/${state.test.total}`;
    if (state.test.answered === state.test.total) showTestResult();
  }

  function showTestResult() {
    const el = document.getElementById('test-result');
    if (!el) return;
    const { correct, total } = state.test;
    const verdict = correct === total ? 'Отлично! Можно отмечать «Знаю».'
      : correct / total >= 0.6 ? 'Неплохо, но стоит перечитать материал.'
      : 'Стоит вернуться к правилу и примерам.';
    el.innerHTML = `<b>${correct}/${total} правильных</b><span>${verdict}</span>`;
    el.hidden = false;
  }

  /* ---------- Аудио ---------- */

  function speak(text, rateOverride) {
    TTS.speak(text, rateOverride || Number(settings.tts_rate) || 0.7);
  }

  /* ---------- Экспорт Anki/Quizlet: выбор раздела ---------- */

  function openAnkiModal() {
    let picked = null;
    const handlers = {};
    const secsHtml = CONTENT_STORES.map((s) =>
      `<button class="anki-section-btn" id="anki-sec-${s.store}" type="button">${s.label}</button>`).join('');
    handlers['anki-f-anki'] = () => doExport('anki');
    handlers['anki-f-quizlet'] = () => doExport('quizlet');
    handlers['anki-close'] = () => closeModal();
    CONTENT_STORES.forEach((s) => {
      handlers['anki-sec-' + s.store] = () => {
        picked = s.store;
        document.querySelectorAll('.anki-section-btn').forEach((b) => b.classList.remove('selected'));
        document.getElementById('anki-sec-' + s.store).classList.add('selected');
        document.getElementById('anki-hint').textContent = 'Раздел: ' + s.label + '. Выберите формат.';
      };
    });

    showModal(`
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
      if (!picked) { toast('Сначала выберите раздел'); return; }
      const label = CONTENT_STORES.find((s) => s.store === picked).label;
      closeModal();
      if (fmt === 'anki') await ExportImport.exportAnki(picked, label);
      else await ExportImport.exportQuizlet(picked, label);
    }
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

  /* ---------- Настройки ---------- */

  function renderSettings(t) {
    const themeOpt = (v, label) => `<option value="${v}" ${settings.theme === v ? 'selected' : ''}>${label}</option>`;
    const goalOpt = (v) => `<option value="${v}" ${Number(settings.daily_goal) === v ? 'selected' : ''}>${v} карточек</option>`;
    const lvOpt = (v, label) => `<option value="${v}" ${settings.currentLevel === v ? 'selected' : ''}>${label}</option>`;
    return `
      <div class="section-wrap">
        <div class="section-header">
          <h2>${lineBullet(t, 'line-bullet--lg')}<span>${t.title}</span></h2>
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
              <input type="range" id="set-rate" min="0.5" max="1.0" step="0.1" value="${settings.tts_rate}" aria-label="Скорость речи">
              <output id="rate-out">${Number(settings.tts_rate).toFixed(1)}×</output>
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
            <button class="btn-primary" id="btn-sound-test" type="button">🔊 Проверить звук</button>
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
              <span class="pos-verb"><span class="silent-letter">k</span>new</span>
              <span class="pos-art">the</span>
              <span class="pos-noun"><span class="stress">an</span>swer</span>
            </p>
            <p class="preview-ipa ipa">ðə naɪt njuː ði ˈɑːnsə</p>
            <p class="preview-ipa ru-tr">${Annotate.ruTranscribe('ðə naɪt njuː ði ˈɑːnsə', 'the knight knew the answer')}</p>
            <p class="preview-line preview-line--connected">
              I <span class="pos-verb">want</span> <span class="connected">to</span> go
              <span class="connected-note">→ «wanna»</span>
            </p>
          </div>
          <div class="layer-list">
            ${LAYERS.map((l) => `
              <div class="layer-row">
                <div class="setting-info"><label for="chk-${l.key}">${l.title}</label><p class="setting-hint">${l.hint}</p></div>
                <label class="switch">
                  <input type="checkbox" id="chk-${l.key}" data-layer="${l.key}" ${settings[l.key] ? 'checked' : ''}>
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
          <button id="btn-export-json" type="button">📁 Экспорт данных (.json) — полный бэкап</button>
          <button id="btn-import-json" type="button">📥 Импорт данных (.json)</button>
          <input type="file" id="import-file" accept=".json,application/json" hidden aria-label="Файл импорта">
          <button id="btn-qr-sync" type="button">📱 Быстрая синхронизация (QR)</button>
          <button id="btn-qr-apply" type="button">📋 Применить данные синхронизации (вставить)</button>
          <button id="btn-export-anki" type="button">📝 Экспорт в Anki / Quizlet</button>
          <button id="btn-restore-backup" type="button">♻️ Восстановить из авто-бэкапа (localStorage)</button>
          <p class="settings-hint">Авто-бэкап прогресса и настроек сохраняется в браузер раз в 7 дней автоматически.</p>
        </section>
        <section class="settings-section">
          <h3>Напоминания</h3>
          <div class="setting-row">
            <div class="setting-info"><label for="reminder-time">Время напоминания</label>
              <p class="setting-hint">Локальные уведомления работают на Android (Chrome), пока браузер открыт. На iOS доступен только баннер в приложении.</p>
            </div>
            <input type="time" id="reminder-time" value="${settings.reminder_time || '19:00'}" aria-label="Время напоминания">
          </div>
          <button id="btn-enable-notif" type="button">🔔 Разрешить уведомления</button>
        </section>
        <section class="settings-section">
          <h3>О приложении</h3>
          <p class="settings-hint">English Reboot v${APP_VERSION}</p>
          <p class="settings-hint">Карточек в базе: <span id="about-cards">…</span> · Уровни: A1–B2</p>
          <p class="settings-hint">Технологии: HTML, CSS, Vanilla JS, IndexedDB, PWA. Все данные — локально в вашем браузере.</p>
        </section>
      </div>`;
  }

  async function fillAbout() {
    let total = 0;
    for (const cs of CONTENT_STORES) {
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
      <dl class="sound-grid">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${escapeHtml(String(v))}</dd>`).join('')}</dl>`;
  }

  function bindSoundSettings() {
    const mode = document.getElementById('set-tts-mode');
    const voiceSel = document.getElementById('set-voice');
    if (!mode || !voiceSel) return;
    mode.value = TTS.getMode();
    const fillVoices = () => {
      const list = TTS.getAvailableVoices();
      voiceSel.innerHTML = list.length
        ? list.map((v) => `<option value="${escapeAttr(v.voiceURI)}">${TTS.isNatural(v) ? '★ ' : ''}${escapeHtml(v.name)} — ${v.lang}${v.localService ? '' : ' (онлайн)'}</option>`).join('')
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
      settings.theme = e.target.value;
      applyTheme(settings.theme);
      await persistSetting('theme', settings.theme);
    });
    document.getElementById('set-level').addEventListener('change', async (e) => {
      settings.currentLevel = e.target.value || null;
      await persistSetting('currentLevel', settings.currentLevel);
      refreshHeaderStats();
    });
    document.querySelectorAll('[data-layer]').forEach((chk) => {
      chk.addEventListener('change', async () => {
        settings[chk.dataset.layer] = chk.checked;
        applyLayer(chk.dataset.layer);
        await persistSetting(chk.dataset.layer, chk.checked);
      });
    });
    const rate = document.getElementById('set-rate');
    const rateOut = document.getElementById('rate-out');
    rate.addEventListener('input', () => { rateOut.textContent = Number(rate.value).toFixed(1) + '×'; });
    rate.addEventListener('change', async () => {
      settings.tts_rate = Number(rate.value);
      await persistSetting('tts_rate', settings.tts_rate);
    });
    bindSoundSettings();
    document.getElementById('set-goal').addEventListener('change', async (e) => {
      settings.daily_goal = Number(e.target.value);
      await persistSetting('daily_goal', settings.daily_goal);
      refreshHeaderStats();
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
      const okGo = await confirmDialog({
        title: 'Импортировать данные?',
        text: 'Текущие прогресс, настройки, достижения, словарик и журнал будут заменены данными из файла. Контент карточек не затрагивается.',
        confirmLabel: 'Импортировать',
      });
      fileInput.value = '';
      if (!okGo) return;
      const res = await ExportImport.importFullBackup(f);
      if (res.success) {
        toast('Импорт выполнен. Перезагрузка…', 'success');
        setTimeout(() => location.reload(), 900);
      } else {
        toast('Ошибка импорта: ' + res.error, 'danger');
      }
    });

    document.getElementById('btn-qr-sync').addEventListener('click', async () => {
      const json = await ExportImport.exportQRData();
      ExportImport.showQR(json);
    });

    document.getElementById('btn-qr-apply').addEventListener('click', () => {
      showModal(`
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
            closeModal();
            toast('Применено: ' + res.applied + '. Перезагрузка…', 'success');
            setTimeout(() => location.reload(), 900);
          } else {
            toast(res.error, 'danger');
          }
        },
        'qr-paste-cancel': () => closeModal(),
      });
    });

    document.getElementById('btn-export-anki').addEventListener('click', openAnkiModal);

    document.getElementById('btn-restore-backup').addEventListener('click', async () => {
      const okGo = await confirmDialog({
        title: 'Восстановить из авто-бэкапа?',
        text: 'Прогресс, настройки и достижения будут заменены последней копией из localStorage (обновляется раз в 7 дней).',
        confirmLabel: 'Восстановить',
      });
      if (!okGo) return;
      const res = await Backup.restoreFromBackup();
      if (res.success) {
        toast('Восстановлено. Перезагрузка…', 'success');
        setTimeout(() => location.reload(), 900);
      } else {
        toast(res.reason === 'no_backup' ? 'Авто-бэкап ещё не создавался' : 'Бэкап повреждён', 'danger');
      }
    });

    /* --- Напоминания --- */
    document.getElementById('reminder-time').addEventListener('change', async (e) => {
      settings.reminder_time = e.target.value || '19:00';
      await persistSetting('reminder_time', settings.reminder_time);
      Notifications.scheduleReminder(settings.reminder_time);
      toast('Напоминание на ' + settings.reminder_time);
    });
    document.getElementById('btn-enable-notif').addEventListener('click', async () => {
      const perm = await Notifications.requestPermission();
      if (perm === 'granted') toast('Уведомления разрешены', 'success');
      else if (perm === 'denied') toast('Уведомления заблокированы в настройках браузера', 'danger');
      else toast(perm === 'unsupported' ? 'Уведомления не поддерживаются этим браузером' : 'Разрешение не выдано');
    });

    fillAbout();
  }

  async function persistSetting(key, value) {
    const res = await DB.saveSetting(key, value);
    if (res.success) flashSaved();
    else toast('Не удалось сохранить настройку: ' + res.error, 'danger');
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
    settings.theme = next;
    const sel = document.getElementById('set-theme');
    if (sel) sel.value = next;
    const res = await DB.saveSetting('theme', next);
    if (!res.success) toast('Тема применена, но не сохранена: ' + res.error, 'danger');
  }

  function applyLayer(layerKey) {
    const layer = LAYERS.find((l) => l.key === layerKey);
    if (!layer) return;
    document.body.classList.toggle(layer.offClass, settings[layerKey] === false);
  }

  /* ---------- Боковая панель ---------- */

  function updateSidebarStats(done = 0, total = 0, streak = 0) {
    const percent = total > 0 ? Math.min(done / total, 1) : 0;
    document.getElementById('ring-value').style.strokeDashoffset = (RING_CIRCUMFERENCE * (1 - percent)).toFixed(1);
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
    on('wordbank-btn', openWordbank);
    on('ach-counter', () => switchTab('progress'));
    on('install-btn', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const res = await deferredPrompt.userChoice;
      if (res && res.outcome === 'accepted') document.getElementById('install-btn').hidden = true;
      deferredPrompt = null;
    });
    on('logo-link', (e) => {
      e.preventDefault();
      switchTab('today');
      closeMobileNav();
    });
    on('nav-toggle', toggleMobileNav);
    on('nav-backdrop', closeMobileNav);
    on('backup-btn', async () => {
      const okSave = await Backup.createBackup();
      toast(okSave ? 'Резервная копия сохранена в браузер' : 'Не удалось создать копию', okSave ? 'success' : 'danger');
    });
    on('sync-btn', () => {
      switchTab('settings');
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
      if (state.inSession && !typing && !e.ctrlKey && !e.metaKey && !e.altKey && ['1', '2', '3'].includes(e.key)) {
        const map = { '1': '.srs-dontknow', '2': '.srs-hard', '3': '.srs-know' };
        const btn = document.querySelector('#srs-area ' + map[e.key]);
        if (btn && !btn.disabled) btn.click();
      }
      if (e.key === 'Escape') {
        Search.closeSearch();
        closeMobileNav();
        closeModal(false);
        closeWordPopup();
        closeWordbank();
        // Закрываем итоговую модалку, только если она реально открыта —
        // иначе Escape посреди сессии обнулял её и кнопки оценки «умирали»
        const sm = document.getElementById('session-complete-modal');
        if (sm && !sm.hidden) closeSessionModal();
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

  /* ---------- Деструктивные действия ---------- */

  async function resetProgress() {
    const okGo = await confirmDialog({
      title: 'Сбросить прогресс?',
      text: 'Будут удалены записи прогресса, журнал ошибок, статистика занятий и достижения. Карточки и настройки останутся на месте.',
      confirmLabel: 'Сбросить',
    });
    if (!okGo) return;
    for (const store of ['progress', 'errors_log', 'study_log', 'achievements']) {
      const res = await DB.clearStore(store);
      if (!res.success) { toast('Ошибка при сбросе: ' + res.error, 'danger'); return; }
    }
    grammarCache = null;
    Object.keys(vocabCache).forEach((k) => delete vocabCache[k]);
    await DB.saveSetting('streak', 0);
    await DB.saveSetting('last_study_date', '');
    refreshHeaderStats();
    toast('Прогресс сброшен', 'success');
  }

  async function clearDatabase() {
    const okGo = await confirmDialog({
      title: 'Очистить IndexedDB?',
      text: 'Все 18 хранилищ будут полностью очищены, включая настройки. Контент загрузится заново, запустится онбординг. Совет: сначала сделайте экспорт в .json!',
      confirmLabel: 'Очистить всё',
    });
    if (!okGo) return;
    const res = await DB.clearAllData();
    if (!res.success) { toast('Ошибка очистки: ' + res.error, 'danger'); return; }
    // Иначе Backup.checkIntegrity при следующем запуске «воскресит» старый прогресс
    try { localStorage.removeItem('er_backup'); } catch (e) { /* storage недоступен */ }
    toast('База очищена. Перезагрузка…', 'success');
    setTimeout(() => location.reload(), 900);
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

  /* ---------- Старт ---------- */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();