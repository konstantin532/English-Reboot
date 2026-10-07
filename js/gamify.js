/* ==========================================================================
   English Reboot — PRO: гамификация и интеграция
   Файл: gamify.js — XP, комбо, челленджи, лига темпов (pacers.js), магазин,
   прогноз, heatmap, Weekly Review, Текст дня, Spaced Dictation,
   AI-разбор ошибок, Anki-импорт, share-колода.
   Подключается к приложению через window.ER и обёртку SRS.saveProgress —
   app.js не изменяется (кроме выбора AMOLED-темы).
   ========================================================================== */

const Gamify = (() => {
  'use strict';

  let ER = null;
  let effectsOn = true;
  const PRO_VERSION = '1.4.0'; // 1.4.0: разметка слов word_marks.js (часть речи, ударение, немые буквы)

  const XP_RULES = {
    newCardKnow: 15, newCardHard: 5,
    reviewKnow: 10, reviewHard: 5, reviewDontKnow: 0,
    dictationCorrect: 20, shadowingComplete: 25,
    testCorrect: 10, perfectSession: 50,
  };

  const RANKS = [
    { min: 0, title: 'Новичок', icon: '🌱' },
    { min: 100, title: 'Ученик', icon: '📚' },
    { min: 300, title: 'Практик', icon: '✏️' },
    { min: 700, title: 'Знаток', icon: '🎯' },
    { min: 1500, title: 'Говорун', icon: '💬' },
    { min: 3000, title: 'Мастер', icon: '⚡' },
    { min: 5000, title: 'Эксперт', icon: '🌟' },
    { min: 10000, title: 'Полиглот', icon: '👑' },
  ];

  const CHALLENGE_TEMPLATES = [
    { id: 'learn_5_new', title: 'Выучи 5 новых слов', icon: '📖', target: 5, type: 'new_cards', xpReward: 30 },
    { id: 'dictation_perfect', title: 'Диктант без ошибок', icon: '✍️', target: 1, type: 'perfect_dictation', xpReward: 30 },
    { id: 'review_10', title: 'Повтори 10 карточек', icon: '🔄', target: 10, type: 'review_cards', xpReward: 30 },
    { id: 'read_4of5', title: 'Прочти текст', icon: '📰', target: 1, type: 'reading_pass', xpReward: 30 },
    { id: 'shadow_3', title: 'Shadowing: 3 фразы', icon: '🎤', target: 3, type: 'shadowing_count', xpReward: 30 },
    { id: 'combo_5', title: 'Серия 5', icon: '🔥', target: 5, type: 'combo_reach', xpReward: 30 },
  ];

  const combo = { current: 0, max: 0, multiplier: 1 };
  let sessionCardShownAt = null;
  let pendingAnswerTime = null;

  /* ---------- Ожидание моста ER ---------- */
  function whenER(cb, tries) {
    if (window.ER) return cb(window.ER);
    if ((tries || 0) > 100) return console.warn('[Gamify] ER не появился');
    setTimeout(() => whenER(cb, (tries || 0) + 1), 50);
  }

  /* ---------- Настройки-хелперы ---------- */
  const getSetting = async (k, dflt) => {
    const r = await DB.getSetting(k);
    return (r.success && r.data !== undefined) ? r.data : dflt;
  };
  const setSetting = (k, v) => DB.saveSetting(k, v);

  /* ---------- XP ---------- */
  async function getTotalXP() { return Number(await getSetting('totalXP', 0)); }

  async function addXP(amount, silent) {
    if (!amount) return;
    const xp = (await getTotalXP()) + amount;
    await setSetting('totalXP', xp);
    const el = document.getElementById('xp-display');
    if (el) el.textContent = xp;
    if (!silent) checkRankUp(xp);
  }

  function rankOf(xp) {
    let cur = RANKS[0];
    for (const r of RANKS) if (xp >= r.min) cur = r;
    const next = RANKS[RANKS.indexOf(cur) + 1] || null;
    return { ...cur, next };
  }

  async function checkRankUp(xp) {
    const prevRank = await getSetting('rank_title', 'Новичок');
    const r = rankOf(xp);
    if (r.title !== prevRank) {
      await setSetting('rank_title', r.title);
      if (ER) {
        ER.toast(`${r.icon} Новый ранг: ${r.title}!`, 'success');
        Effects.playLevelUp();
        Effects.launchConfetti();
      }
    }
  }

  /* ---------- Комбо ---------- */
  function comboReset() { combo.current = 0; combo.multiplier = 1; updateComboUI(); }

  function comboHit() {
    combo.current++;
    combo.multiplier = combo.current >= 15 ? 5 : combo.current >= 10 ? 3 : combo.current >= 5 ? 2 : 1;
    combo.max = Math.max(combo.max, combo.current);
    if (combo.max > Number(combo._maxPersist || 0)) {
      combo._maxPersist = combo.max;
      setSetting('maxCombo', combo.max);
    }
    Effects.playCombo(combo.multiplier);
    updateComboUI();
    checkChallenge('combo_reach', combo.current);
    return combo.multiplier;
  }

  let comboHideTimer = null;
  function updateComboUI() {
    let el = document.getElementById('combo-indicator');
    if (!el) {
      if (combo.current < 3) return;
      el = document.createElement('div');
      el.id = 'combo-indicator';
      el.className = 'combo-indicator';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.innerHTML = '🔥 Комбо <span class="combo-count">0</span> · <span class="combo-mult">x1</span>';
      document.body.appendChild(el);
    }
    clearTimeout(comboHideTimer);
    comboHideTimer = setTimeout(() => { el.style.display = 'none'; }, 6000);
    el.querySelector('.combo-count').textContent = combo.current;
    el.querySelector('.combo-mult').textContent = 'x' + combo.multiplier;
    el.classList.toggle('combo-active', combo.current >= 5);
    el.classList.toggle('combo-hot', combo.current >= 10);
    el.classList.toggle('combo-fire', combo.current >= 15);
    el.style.display = combo.current >= 3 ? 'flex' : 'none';
  }

  /* ---------- Ответ (из SRS-сессии, тестов, диктанта) ---------- */
  async function onAnswer(correct, meta) {
    meta = meta || {};
    if (!correct && meta.mark === 'hard') {
      // «Сложно» — не ошибка: XP поменьше, серия не растёт, но и не сгорает
      await addXP(meta.isNew ? XP_RULES.newCardHard : XP_RULES.reviewHard, true);
      if (meta.source !== 'test') checkChallenge(meta.isNew ? 'new_cards' : 'review_cards', 1);
      return;
    }
    if (correct) {
      Effects.playCorrect();
      Effects.vibrate(50);
      const mult = meta.inSession ? comboHit() : 1;
      const base = meta.isNew ? (meta.mark === 'hard' ? XP_RULES.newCardHard : XP_RULES.newCardKnow)
        : meta.mark === 'hard' ? XP_RULES.reviewHard
        : meta.source === 'dictation' ? XP_RULES.dictationCorrect
        : meta.source === 'test' ? XP_RULES.testCorrect
        : XP_RULES.reviewKnow;
      const xp = base * mult;
      await addXP(xp, true);
      if (meta.source !== 'test') checkChallenge(meta.isNew ? 'new_cards' : 'review_cards', 1);
    } else {
      Effects.playWrong();
      Effects.vibrate([30, 50, 30]);
      comboReset();
    }
  }

  /* ---------- Обёртка SRS.saveProgress ---------- */
  function wrapSRS() {
    const orig = SRS.saveProgress.bind(SRS);
    SRS.saveProgress = async (cardId, storeName, action, answerTime) => {
      const res = await orig(cardId, storeName, action, answerTime !== null && answerTime !== undefined ? answerTime : pendingAnswerTime);
      pendingAnswerTime = null;
      if (res.success) {
        // Геймификация не должна ломать учёбу: раньше любая ошибка здесь
        // (например, необъявленная renderLeagueInto) блокировала кнопки SRS и сессию
        try {
          await onAnswer(action === 'know', {
            inSession: true, isNew: !!res.isNew, mark: action, source: 'session',
          });
        } catch (e) {
          console.warn('[Gamify] onAnswer:', e);
        }
      }
      return res;
    };
  }

  // Тайминг ответа: карточка показана → клик SRS-кнопки
  function trackSessionTiming() {
    const content = document.getElementById('content');
    if (!content) return;
    const mo = new MutationObserver(() => {
      if (content.querySelector('.session-card')) sessionCardShownAt = Date.now();
    });
    mo.observe(content, { childList: true, subtree: true });
    document.addEventListener('click', (e) => {
      if (e.target.closest && e.target.closest('.srs-btn') && sessionCardShownAt) {
        pendingAnswerTime = (Date.now() - sessionCardShownAt) / 1000;
      }
    }, true);
  }

  /* ---------- Челленджи ---------- */
  async function getChallenges() {
    const c = await getSetting('daily_challenges', null);
    const today = SRS.todayStr();
    if (c && c.date === today) return c;
    const pick = [];
    const pool = CHALLENGE_TEMPLATES.slice();
    while (pick.length < 3 && pool.length) {
      pick.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
    }
    const fresh = { date: today, challenges: pick, progress: pick.map(() => 0), completed: pick.map(() => false) };
    await setSetting('daily_challenges', fresh);
    return fresh;
  }

  async function checkChallenge(type, amount) {
    const c = await getChallenges();
    let changed = false;
    c.challenges.forEach((ch, i) => {
      if (ch.type !== type || c.completed[i]) return;
      c.progress[i] = Math.min(ch.target, c.progress[i] + amount);
      if (c.progress[i] >= ch.target) {
        c.completed[i] = true;
        if (ER) {
          ER.toast(`${ch.icon} Челлендж выполнен: ${ch.title} +${ch.xpReward} XP`, 'success');
          Effects.playAchievement();
        }
        addXP(ch.xpReward, true);
      }
      changed = true;
    });
    if (changed) {
      await setSetting('daily_challenges', c);
      renderChallengesInto(c);
    }
  }

  function challengesHtml(c) {
    return `
      <div class="daily-challenges">
        <h3 class="card-title">Челленджи дня</h3>
        ${c.challenges.map((ch, i) => `
          <div class="challenge-card ${c.completed[i] ? 'completed' : ''}">
            <span class="ch-icon" aria-hidden="true">${ch.icon}</span>
            <span class="ch-title">${ch.title}</span>
            <div class="ch-progress-bar"><div class="ch-fill" style="width:${Math.round((c.progress[i] / ch.target) * 100)}%"></div></div>
            <span class="ch-count">${c.progress[i]}/${ch.target}</span>
            <span class="ch-reward">+${ch.xpReward} XP</span>
          </div>`).join('')}
      </div>`;
  }

  let lastChallengesHtml = '';
  function renderChallengesInto(c) {
    const panel = document.querySelector('.practice-panel');
    if (!panel) return;
    const html = challengesHtml(c);
    const existing = panel.querySelector('.daily-challenges');
    if (existing) {
      // Обновление прогресса — заменяем только блок челленджей
      if (html !== lastChallengesHtml) existing.outerHTML = html;
    } else {
      panel.insertAdjacentHTML('afterbegin', html + textOfDayHtml() + spacedDictationHtml());
      bindInjectedButtons(panel);
    }
    lastChallengesHtml = html;
  }

  /* ---------- Текст дня + Spaced Dictation (инъекции в Тренажёр) ---------- */
  function textOfDayHtml() {
    const readings = window.PRO_READINGS || [];
    if (!readings.length) return '';
    const day = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const t = readings[day % readings.length];
    const first = (t.payload.text || '').split(/(?<=[.!?])\s/)[0];
    return `
      <div class="text-of-day" id="text-of-day" role="button" tabindex="0"
           data-id="${t.id}" title="Открыть текст">
        <h3>📰 Текст дня: ${t.payload.title}</h3>
        <p>${first}</p>
        <p style="margin-top:8px;font-size:.85rem;opacity:.85">B2 · клик — читать и отвечать на вопросы</p>
      </div>`;
  }

  function spacedDictationHtml() {
    return `<button class="btn btn-ghost" id="spaced-dictation-btn" type="button" style="margin-top:10px">
      ✍️ Диктант из очереди SRS</button>`;
  }

  function bindInjectedButtons(panel) {
    const tod = panel.querySelector('#text-of-day');
    if (tod && !tod.dataset.bound) {
      tod.dataset.bound = '1';
      const open = async () => {
        const id = tod.dataset.id;
        const r = await DB.getByKey('readings', id);
        if (r.success && r.data) ER.openCardAnywhere('readings', id);
        else ER.toast('Текст ещё загружается — попробуйте через пару секунд');
      };
      tod.addEventListener('click', open);
      tod.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
    }
    const sdb = panel.querySelector('#spaced-dictation-btn');
    if (sdb && !sdb.dataset.bound) {
      sdb.dataset.bound = '1';
      sdb.addEventListener('click', async () => {
        const q = await SRS.getSpacedDictationQueue(SRS.todayStr());
        if (!q.length) { ER.toast('Очередь SRS пуста — возвращайтесь завтра'); return; }
        Dictation.begin('sentence', q);
      });
    }
  }

  /* ---------- Лига темпов (этап 6) ----------
     Раньше: боты с человеческими именами и случайным XP. Теперь — пейсеры
     по фразам вслух с открытым правилом (pacers.js), реплики — в coach.js. */
  async function spokenSectionHtml() {
    if (!window.Pacers) return '';
    const today = SRS.todayStr();
    const r = await DB.getStudyLogRange('0000-00-00', today);
    return Pacers.sectionHtml((r.success && r.data) || [], today);
  }

  /* ---------- Инъекции во вкладку «Прогресс» ---------- */
  async function renderProgressAddons() {
    const overview = document.querySelector('.progress-overview');
    if (!overview || overview.dataset.gamified) return;
    overview.dataset.gamified = '1';
    const card = overview.closest('.card');
    if (!card) return;

    const xp = await getTotalXP();
    const rank = rankOf(xp);
    const next = rank.next;
    const rankHtml = `
      <div class="user-level-display" style="margin-bottom:16px">
        <span class="level-icon" aria-hidden="true">${rank.icon}</span>
        <span class="level-kind">Ранг по опыту (XP)</span>
        <span class="level-title">${rank.title}</span>
        <div class="level-progress"><div class="level-progress-fill" style="width:${next
          ? Math.min(100, Math.round(((xp - rank.min) / (next.min - rank.min)) * 100)) : 100}%"></div></div>
        <p class="level-next">XP: ${xp}${next ? ` · до «${next.title}»: ещё ${next.min - xp} XP` : ' · максимум!'}</p>
      </div>`;
    overview.insertAdjacentHTML('beforebegin', rankHtml);

    overview.insertAdjacentHTML('afterend', await spokenSectionHtml());

    // Магазин: заморозка streak
    const freeze = Number(await getSetting('streak_freeze', 0));
    const shop = document.createElement('div');
    shop.className = 'streak-shop';
    shop.innerHTML = `
      <h3 class="card-title">Магазин</h3>
      <button id="buy-freeze" class="shop-btn" type="button"
        ${xp >= 500 && freeze < 1 ? '' : 'disabled'}>
        🧊 Streak Freeze — 500 XP ${freeze >= 1 ? '(уже есть)' : ''}
      </button>
      <p class="setting-hint">Заморозка сохранит серию, если пропустить день.</p>`;
    card.insertAdjacentElement('beforeend', shop);
    shop.querySelector('#buy-freeze').addEventListener('click', async () => {
      const cur = await getTotalXP();
      if (cur < 500) { ER.toast('Не хватает XP: нужно 500'); return; }
      await setSetting('totalXP', cur - 500);
      await setSetting('streak_freeze', 1);
      document.getElementById('xp-display').textContent = cur - 500;
      ER.toast('Streak Freeze куплен! 🧊', 'success');
      shop.remove();
    });

    // Прогноз
    const f = await SRS.getForecast(SRS.todayStr());
    card.insertAdjacentHTML('beforeend', `
      <div class="forecast-card" style="margin-top:18px">
        <p>При текущем темпе уровень <b>${f.level}</b> будет освоен к:</p>
        <span class="forecast-date">${f.estimatedDate}</span>
        <p class="forecast-detail">Осталось: ${f.remaining} карточек этого уровня · темп ${f.avgPerDay} в день</p>
      </div>`);

    // Heatmap
    const hm = await SRS.getHeatmap();
    card.insertAdjacentHTML('beforeend', `
      <h3 class="card-title" style="margin-top:18px">Освоение по разделам</h3>
      <div class="heatmap-grid">
        ${hm.map((h) => `
          <div class="heatmap-cell ${h.color}" data-store="${h.store}" role="button" tabindex="0"
               title="Клик — открыть раздел">
            <span class="heatmap-percent">${h.percent}%</span>
            <span class="heatmap-label">${h.name} (${h.mastered}/${h.total})</span>
          </div>`).join('')}
      </div>`);
    card.querySelectorAll('.heatmap-cell').forEach((cell) => {
      const open = () => {
        const key = cell.dataset.store;
        const map = { words: 'words', grammar_cards: 'grammar', phrasal_verbs: 'phrasal', collocations: 'collocations',
          idioms: 'idioms', conversation: 'conversation', slang: 'slang',
          minimal_pairs: 'minimal', readings: 'reading' };
        ER.switchTab(map[key] || 'grammar');
      };
      cell.addEventListener('click', open);
      cell.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
    });
  }

  /* ---------- AI-разбор ошибок (паттерны PRO-карточек) ---------- */
  let patternMap = null;

  function buildPatternMap() {
    patternMap = new Map();
    const add = (title, patterns) => {
      if (patterns && patterns.length) patternMap.set(String(title).toLowerCase(), patterns);
    };
    (window.PRO_PHRASAL || []).forEach((c) => add(c.payload.front, c.payload.errorPatterns));
    (window.PRO_COLLOC || []).forEach((c) => add(c.payload.front, c.payload.errorPatterns));
    ((window.PRO_CONTENT && window.PRO_CONTENT.idioms) || []).forEach((c) => add(c.payload.front, c.payload.errorPatterns));
    (window.PRO_GRAMMAR || []).forEach((c) => add(c.payload.title, c.payload.errorPatterns));
  }

  function findOpenCardTitle() {
    const h = document.querySelector('#content .detail-title');
    return h ? h.textContent.trim() : null;
  }

  function explanationHtml(pattern) {
    return `
      <div class="error-explanation" role="status">
        <p class="error-expl">💡 ${pattern.explanation}</p>
        <p class="error-hint">🔑 ${pattern.hint}</p>
      </div>`;
  }

  function bindTestAnswerAnalysis() {
    document.getElementById('content').addEventListener('click', (e) => {
      const btn = e.target.closest('.test-option');
      if (!btn) return;
      setTimeout(() => {
        const q = btn.closest('.test-question');
        if (!q) return;
        const correct = btn.dataset.correct === 'true';
        const openTitle = findOpenCardTitle();
        // XP и звук на тестовых ответах
        if (correct) {
          Effects.playCorrect(); Effects.vibrate(50);
          addXP(XP_RULES.testCorrect, true);
        } else {
          Effects.playWrong(); Effects.vibrate([30, 50, 30]);
        }
        if (!patternMap || !openTitle) return;
        const patterns = patternMap.get(openTitle.toLowerCase());
        if (!patterns || q.querySelector('.error-explanation')) return;
        const answer = btn.textContent.trim().toLowerCase();
        const hit = patterns.find((p) => answer.includes(String(p.trigger).toLowerCase()));
        if (hit) {
          q.querySelector('.test-options').insertAdjacentHTML('afterend', explanationHtml(hit));
          // и в журнал — с паттерном
          const cardId = (window.__erOpenCardId) || null;
          if (cardId) {
            DB.getErrorsLog().then((r) => {
              const rec = ((r.success && r.data) || []).find((x) => x.cardId === cardId);
              DB.saveError(cardId, (rec && rec.storeName) || SRS.storeForCard(cardId),
                ((rec && rec.errorCount) || 0) + 1);
            });
          }
        }
      }, 80);
    });
  }

  // Открытый cardId — из плиток и поиска (для errors_log с паттерном)
  function trackOpenCardId() {
    document.getElementById('content').addEventListener('click', (e) => {
      const t = e.target.closest('.topic-tile, .vocab-tile, .search-result');
      if (t && t.dataset.id) window.__erOpenCardId = t.dataset.id;
    }, true);
  }

  /* ---------- Тест на понимание чтения → челлендж ---------- */
  function watchReadingResults() {
    const content = document.getElementById('content');
    const mo = new MutationObserver(() => {
      const res = document.getElementById('test-result');
      if (!res || res.hidden || res.dataset.counted) return;
      if (!content.querySelector('.reading-text')) return; // грамматические тесты не в счёт
      const m = res.textContent.match(/(\d+)\/(\d+)/);
      if (!m) return;
      res.dataset.counted = '1';
      if (Number(m[1]) / Number(m[2]) >= 0.8) checkChallenge('reading_pass', 1);
    });
    mo.observe(content, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  }

  /* ---------- Weekly Review (воскресенье) ---------- */
  async function maybeWeeklyReview() {
    const now = new Date();
    if (now.getDay() !== 0) return;
    const today = SRS.todayStr();
    const last = await getSetting('lastWeeklyReview', '');
    if (last === today) return;
    // Новому пользователю обзор не нужен (и раньше открывался поверх онбординга)
    if ((await getSetting('onboarding_complete', false)) !== true) return;

    const logs = (await DB.getStudyLogRange(SRS.addDays(today, -6), today)).data || [];
    const totalCards = logs.reduce((s, l) => s + (l.cardsStudied || 0), 0);
    if (!totalCards) return; // за неделю не было занятий — показывать нечего
    await setSetting('lastWeeklyReview', today);
    const totalXP = logs.reduce((s, l) => s + Math.round((l.cardsStudied || 0) * 8), 0);
    const daysActive = logs.filter((l) => (l.cardsStudied || 0) > 0).length;
    const bestCombo = Number(await getSetting('maxCombo', 0));
    const errs = (await DB.getErrorsLog().then((r) => r.data || [])) || [];
    const weak = errs[0];
    const weakName = weak ? (weak.storeName || SRS.storeForCard(weak.cardId) || 'лексику') : '';

    ER.showModal(`
      <div class="weekly-review">
        <h2>📊 Недельный обзор</h2>
        <div class="weekly-stat">
          <div class="weekly-stat-item"><span class="weekly-stat-num">${totalCards}</span><span class="weekly-stat-label">карточек</span></div>
          <div class="weekly-stat-item"><span class="weekly-stat-num">${daysActive}</span><span class="weekly-stat-label">дней</span></div>
          <div class="weekly-stat-item"><span class="weekly-stat-num">${bestCombo}</span><span class="weekly-stat-label">макс. комбо</span></div>
          <div class="weekly-stat-item"><span class="weekly-stat-num">${totalXP}</span><span class="weekly-stat-label">XP</span></div>
        </div>
        <div class="weekly-recommendation">💡 ${weak
          ? `На следующей неделе сфокусируйся на «${weakName}» — там больше всего ошибок (${weak.errorCount}).`
          : 'Отличная неделя — ошибок почти нет. Добавь нагрузку: диктант или shadowing!'}</div>
        <div class="session-actions">
          <button class="btn" id="wr-close" type="button">Продолжить</button>
        </div>
      </div>`, { 'wr-close': () => ER.closeModal() });
  }

  /* ---------- Anki-импорт и share-колода (кнопки в настройках) ---------- */
  function download(filename, text, mime) {
    const blob = new Blob([text], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importAnkiText(file) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim() && l.includes('\t'));
    if (!lines.length) { ER.toast('Не найдено строк с табуляцией', 'danger'); return; }
    let n = Number(await getSetting('anki_seq', 0));
    const existing = await DB.getAll('personal_deck');
    const seen = new Set(((existing.success && existing.data) || [])
      .map((c) => String((c.payload && c.payload.front) || '').toLowerCase()));
    const strip = (v) => String(v || '').replace(/<[^>]*>/g, '').trim(); // Anki экспортирует HTML
    const items = [];
    for (const l of lines) {
      const [rawFront, rawBack] = l.split('\t');
      const front = strip(rawFront);
      if (!front || seen.has(front.toLowerCase())) continue;
      seen.add(front.toLowerCase());
      n++;
      items.push({ id: 'pd_' + String(n).padStart(4, '0'), type: 'personal',
        level: '', tags: ['anki'], audio: true,
        payload: { front, translation: strip(rawBack), examples: [], test: [] } });
    }
    if (!items.length) { ER.toast('Новых карточек нет — все уже в колоде'); return; }
    const r = await DB.bulkPut('personal_deck', items);
    await setSetting('anki_seq', n);
    if (r.success && ER.reloadContent) ER.reloadContent();
    ER.toast(r.success ? `Импортировано ${items.length} карточек — раздел «Моя колода»` : 'Ошибка импорта: ' + r.error,
      r.success ? 'success' : 'danger');
  }

  async function shareDeck() {
    const r = await DB.getAll('personal_deck');
    const deck = (r.success && r.data) || [];
    if (!deck.length) { ER.toast('Личная колода пуста — импортируйте Anki-файл'); return; }
    download('english-reboot-share-deck.json', JSON.stringify({ app: 'English Reboot', deck }, null, 2), 'application/json');
    ER.toast('Колода сохранена файлом — передайте её другу', 'success');
  }

  function injectSettingsButtons() {
    const sec = Array.from(document.querySelectorAll('.settings-section'))
      .find((s) => s.querySelector('#btn-export-json'));
    if (!sec || sec.dataset.pro) return;
    sec.dataset.pro = '1';
    sec.insertAdjacentHTML('beforeend', `
      <button id="btn-import-anki" type="button">📥 Импорт из Anki (текстовый файл)</button>
      <input type="file" id="anki-file" accept=".txt,.csv" style="display:none" aria-label="Файл Anki">
      <button id="btn-share-deck" type="button">📤 Поделиться моей колодой</button>
      <p class="anki-import-hint">Anki-файл: строки вида «front⇥back» (табуляция). Импорт идёт в личную колоду и SRS.</p>`);
    const fi = sec.querySelector('#anki-file');
    sec.querySelector('#btn-import-anki').addEventListener('click', () => fi.click());
    fi.addEventListener('change', () => { if (fi.files[0]) importAnkiText(fi.files[0]); fi.value = ''; });
    sec.querySelector('#btn-share-deck').addEventListener('click', shareDeck);

    // Переключатель эффектов
    const fx = document.createElement('label');
    fx.className = 'switch';
    fx.innerHTML = `<input type="checkbox" id="chk-effects" ${effectsOn ? 'checked' : ''}><span class="switch-ui"></span>`;
    const row = document.createElement('div');
    row.className = 'setting-row';
    row.innerHTML = '<div class="setting-info"><label for="chk-effects">Звуки и вибрация</label><p class="setting-hint">Отклик на ответы (Web Audio + вибрация)</p></div>';
    row.appendChild(fx);
    sec.appendChild(row);
    fx.querySelector('#chk-effects').addEventListener('change', async (e) => {
      effectsOn = e.target.checked; // применяется сразу, без перезагрузки
      await setSetting('effects_enabled', effectsOn);
    });
  }

  /* ---------- Сидирование PRO-контента ---------- */
  async function seedPro() {
    const P = window.PRO_CONTENT;
    if (!P) return;
    const meta = await DB.getByKey('content_meta', 'pro_version');
    if (meta.success && meta.data && meta.data.value === PRO_VERSION) { buildPatternMap(); return; }

    ER.toast('Загрузка PRO-контента B2 (~120 карточек)…');
    const jobs = [
      ['grammar_cards', P.grammar], ['phrasal_verbs', P.phrasal], ['collocations', P.colloc],
      ['idioms', P.idioms], ['minimal_pairs', P.minimal], ['readings', P.readings],
    ];
    for (const [store, arr] of jobs) {
      if (!arr || !arr.length) continue;
      const r = await DB.seedContent(arr, store);
      if (!r.success) { ER.toast('Ошибка загрузки PRO-контента: ' + r.error, 'danger'); return; }
    }
    await DB.saveCard('content_meta', {
      key: 'pro_version', value: PRO_VERSION,
      seededAt: new Date().toISOString(),
      count: jobs.reduce((s, j) => s + (j[1] ? j[1].length : 0), 0),
    });
    buildPatternMap();
    if (ER.reloadContent) ER.reloadContent();
    ER.toast('PRO-контент B2 загружен', 'success');
  }

  /* ---------- Старт ---------- */
  function start(er) {
    ER = er;
    wrapSRS();
    trackSessionTiming();
    trackOpenCardId();
    bindTestAnswerAnalysis();
    watchReadingResults();

    // Инъекции в Тренажёр и Прогресс
    const content = document.getElementById('content');
    const mo = new MutationObserver(async () => {
      const panel = document.querySelector('.practice-panel');
      if (panel && !panel.dataset.chDone) {
        panel.dataset.chDone = '1';
        lastChallengesHtml = '';
        renderChallengesInto(await getChallenges());
      }
      if (document.querySelector('.progress-overview')) renderProgressAddons();
      injectSettingsButtons();
    });
    mo.observe(content, { childList: true, subtree: true });

    // Effects спрашивает «включено?» синхронно — держим значение в переменной
    Effects.setEnabledGetter(() => effectsOn);
    (async () => {
      if (ER.ready) await ER.ready; // БД открыта, базовый контент загружен
      effectsOn = (await getSetting('effects_enabled', true)) !== false;
      const xp = await getTotalXP();
      const el = document.getElementById('xp-display');
      if (el) el.textContent = xp;
      await seedPro();
      maybeWeeklyReview();
    })();
  }

  function init() {
    whenER((er) => start(er));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ---------- Публичные хуки для dictation.js ---------- */
  window.Gamify = {
    onAnswer,
    onDictationItem: (correct) => onAnswer(correct, { source: 'dictation', inSession: true }),
    onDictationFinish: (errors) => {
      if (Number(errors) === 0) {
        checkChallenge('perfect_dictation', 1);
        getSetting('perfectDictations', 0).then((n) => setSetting('perfectDictations', Number(n) + 1));
      }
      addXP(Number(errors) === 0 ? 30 : 10, true);
    },
    onShadowingFinish: (phrases) => {
      addXP(XP_RULES.shadowingComplete, true);
      checkChallenge('shadowing_count', phrases || 1);
      // счётчик для достижения «Эхо»
      getSetting('shadowCount', 0).then((n) => setSetting('shadowCount', Number(n) + 1));
    },
  };

  return { addXP, getChallenges, checkChallenge, rankOf };
})();
