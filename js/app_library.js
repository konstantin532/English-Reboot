/* ==========================================================================
   English Reboot — разделы библиотеки
   Файл: app_library.js — грамматика, списки словарных разделов, карточки (словарь, сленг, разговорные фразы), Minimal Pairs с тренажёром на слух, чтение со словарём слов и банком слов.
   Вынесено из app.js без изменения логики. Общее состояние и функции ядра —
   через контекст C (app.js → AppLibrary.bind(core)): C.settings, C.state, C.toast…
   ========================================================================== */

const AppLibrary = (() => {
  'use strict';

  let C = null; // контекст ядра (app.js)
  function bind(core) { C = core; }

  /* ---------- Грамматика ---------- */

  async function renderGrammar(t) {
    const { cards, progress } = await C.ensureGrammarData();
    const list = C.state.filter === 'all' ? cards : cards.filter((c) => c.level === C.state.filter);
    const tiles = list.map((c) => {
      const mark = progress[c.id] && progress[c.id].mark;
      return `
        <button class="topic-tile" data-id="${c.id}" type="button">
          <span class="topic-num">${c.id.slice(1)}</span>
          <span class="topic-body">
            <span class="topic-title">${c.payload.title}</span>
            <span class="topic-meta">
              <span class="level-badge level-badge--${c.level}">${c.level}</span>
              ${c.tags.filter((tg) => tg !== c.level).slice(0, 2).map((tg) => `<span class="tag-chip">${tg}</span>`).join('')}
              ${mark ? `<span class="mark-chip mark-chip--${mark}">${mark === 'know' ? '✓ ' : '↻ '}${C.MARK_LABEL[mark]}</span>` : ''}
            </span>
          </span>
        </button>`;
    }).join('');
    const known = cards.filter((c) => progress[c.id]).length;
    return `
      <div class="section-wrap">
        ${C.sectionHeader(t, C.state.filter)}
        <button class="pos-guide-entry pos-guide-btn" data-ch="intro" type="button">
          <span class="pos-guide-entry-title">Как устроен английский</span>
          <span class="pos-guide-entry-hint">Части речи, неправильные глаголы, времена и порядок слов: правило → примеры → импровизация вслух</span>
        </button>
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
    C.state.test = { answered: 0, correct: 0, total: test.length };
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
    const rec = C.grammarCache && C.grammarCache.progress[cardData.id];
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
          <div class="formula">${C.escapeHtml(p.formula)}</div>
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
            <p class="test-progress" id="test-progress">Отвечено 0/${p.test.length}</p>
            ${questionsHtml(p.test)}
          </div>
          <div class="srs-area" id="srs-area">${C.srsButtonsHtml(!rec)}</div>
        </div>
      </div>`;
  }

  function openGrammarCard(id) {
    const cached = C.grammarCache && C.grammarCache.cards.find((c) => c.id === id);
    if (!cached) { C.toast('Карточка не найдена', 'danger'); return; }
    C.state.currentCardId = id;
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
    const irr = c.type === 'phrasal' || storeName === 'phrasal_verbs' ? irrOfPhrasal(c) : null;
    return `
      <button class="vocab-tile ${c.type === 'slang' ? 'slang-tile' : ''}" data-store="${storeName}" data-id="${c.id}" type="button">
        <span class="tile-front">${c.payload.front}</span>
        ${c.type === 'slang' ? `<span class="tile-full-form">${c.payload.full_form}</span>` : ''}
        <span class="tile-trans">${c.payload.translation || ''}</span>
        ${irr ? `<span class="tile-forms" title="Неправильный глагол: формы учить">${irr.base} · ${irr.past} · ${irr.pp}</span>` : ''}
        <span class="topic-meta">
          ${c.level ? `<span class="level-badge level-badge--${c.level}">${c.sublevel || c.level}</span>` : ''}
          ${sub && c.type !== 'slang' ? `<span class="tag-chip">${sub}</span>` : ''}
          ${mark ? `<span class="mark-chip mark-chip--${mark}">${mark === 'know' ? '✓ ' : '↻ '}${C.MARK_LABEL[mark]}</span>` : ''}
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
          ${mark ? `<span class="mark-chip mark-chip--${mark}">${C.MARK_LABEL[mark]}</span>` : ''}
        </span>
      </button>`;
  }

  function readingTileHtml(c, mark, storeName) {
    const type = c.payload.reading_type;
    return `
      <button class="vocab-tile" data-store="${storeName}" data-id="${c.id}" type="button">
        <span class="tile-front">${c.payload.title}</span>
        <span class="topic-meta">
          <span class="reading-type-badge ${type}">${C.READING_TYPES[type] || type}</span>
          <span class="level-badge level-badge--${c.level}">${c.level}</span>
          ${mark ? `<span class="mark-chip mark-chip--${mark}">${C.MARK_LABEL[mark]}</span>` : ''}
        </span>
      </button>`;
  }

  // Фразовые глаголы: глагол в основе неправильный (take off → take – took – taken) или правильный (pick up)
  const irrOfPhrasal = (c) => (window.WordMarks && WordMarks.irregularOf
    ? WordMarks.irregularOf(String(c.payload.front || '').trim().split(/\s+/)[0]) : null);
  const VERB_FILTERS = [['all', 'Все'], ['irr', 'Неправильные'], ['reg', 'Правильные']];
  function filteredCards(key, cards, v) {
    let list = v.filter === 'all' ? cards : cards.filter((c) => c.level === v.filter);
    if (key === 'phrasal' && v.verbs && v.verbs !== 'all') list = list.filter((c) => !!irrOfPhrasal(c) === (v.verbs === 'irr'));
    return list;
  }
  function verbFilterHtml(v) {
    return `<div class="verb-filter" role="group" aria-label="Глагол в основе">
      ${VERB_FILTERS.map(([k, label]) => `<button type="button" class="verb-filter-btn${(v.verbs || 'all') === k ? ' is-active' : ''}${k === 'irr' ? ' verb-filter-btn--irr' : ''}" data-verbs="${k}" aria-pressed="${(v.verbs || 'all') === k}">${label}</button>`).join('')}
    </div>`;
  }

  // Глагол A2: три формы с американской IPA (неправильный — оранжевой двойной линией) или звук окончания -ed
  const VF_LABEL = { irr: ['1-я форма', '2-я · прошлое', "3-я · I've ___"], reg: ['1-я форма', "2-я и 3-я · прошлое, I've ___"] };
  const ED_HINT = { t: 'после глухого звука -ed звучит [т]', d: 'после звонкого звука и гласной -ed звучит [д]', id: 'после t и d -ed звучит [ид] — отдельный слог' };
  function verbFormsHtml(f) {
    const labels = f.kind === 'irr' ? (f.base === 'be' ? ['1-я форма', '2-я · прошлое', '', "3-я · I've ___"] : VF_LABEL.irr) : VF_LABEL.reg;
    const cells = (f.parts || []).map((pt, k) => `<div class="verb-form">${window.Annotate ? Annotate.renderParts([pt]) : C.escapeHtml(pt.word)}<span class="verb-form-label">${labels[k] || ''}</span></div>`).join('');
    const kindLine = f.kind === 'irr'
      ? '<b class="verb-kind verb-kind--irr">Неправильный глагол</b> — прошедшее не по правилу «+ed», формы учить'
      : `<b class="verb-kind">Правильный глагол</b> — прошедшее «+ed»; ${ED_HINT[f.ed] || ''}`;
    return `<div class="verb-forms-block">
      <p class="verb-kind-line">${kindLine} <button class="pos-guide-btn pos-guide-link" data-ch="irregular" type="button">почему так называют?</button></p>
      <div class="verb-forms">${cells}</div>
      ${f.note ? `<p class="verb-note">💡 ${C.escapeHtml(f.note)}</p>` : ''}
    </div>`;
  }

  async function renderVocabList(t, key) {
    const cfg = C.VOCAB_STORES[key];
    const { cards, progress } = await C.ensureVocabData(cfg.store);
    const v = C.state.vocab[key] || (C.state.vocab[key] = { filter: 'all', limit: 20 });
    const list = filteredCards(key, cards, v);
    const shown = list.slice(0, v.limit);
    const tileFn = cfg.kind === 'minimal' ? minimalTileHtml : cfg.kind === 'reading' ? readingTileHtml : vocabTileHtml;
    const tiles = shown.map((c) => tileFn(c, progress[c.id] && progress[c.id].mark, cfg.store)).join('');
    const marked = cards.filter((c) => progress[c.id]).length;
    return `
      <div class="section-wrap" data-vocab="${key}">
        ${C.sectionHeader(t, v.filter)}
        ${key === 'phrasal' ? verbFilterHtml(v) : ''}
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
    const cfg = C.VOCAB_STORES[key];
    const v = C.state.vocab[key];
    const grid = document.querySelector('.vocab-grid');
    const sentinel = document.querySelector('.list-sentinel');
    const summary = document.querySelector('.list-summary');
    if (!grid || !sentinel) return;
    let loading = false;
    const loadMore = async () => {
      if (loading) return;
      const data = await C.ensureVocabData(cfg.store);
      const all = filteredCards(key, data.cards, v);
      if (v.limit >= all.length) { sentinel.remove(); return; }
      loading = true;
      const tileFn = cfg.kind === 'minimal' ? minimalTileHtml : cfg.kind === 'reading' ? readingTileHtml : vocabTileHtml;
      const next = all.slice(v.limit, v.limit + 20);
      v.limit += 20;
      grid.insertAdjacentHTML('beforeend',
        next.map((c) => tileFn(c, data.progress[c.id] && data.progress[c.id].mark, cfg.store)).join(''));
      if (summary) summary.textContent = summary.textContent.replace(/показано \d+/, `показано ${Math.min(v.limit, all.length)}`);
      if (v.limit >= all.length) {
        if (C.state.lazyObserver) C.state.lazyObserver.unobserve(sentinel);
        sentinel.remove();
      }
      loading = false;
    };
    if (C.state.lazyObserver) C.state.lazyObserver.disconnect();
    if ('IntersectionObserver' in window) {
      C.state.lazyObserver = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) loadMore(); });
      }, { rootMargin: '400px' });
      C.state.lazyObserver.observe(sentinel);
    } else {
      sentinel.addEventListener('click', loadMore);
    }
  }

  /* ---------- Карточки: словарь / сленг / разговорные ---------- */

  function renderVocabCard(cardData) {
    const p = cardData.payload;
    const rec = C.state.currentStore && C.vocabCache[C.state.currentStore]
      ? C.vocabCache[C.state.currentStore].progress[cardData.id] : null;

    let headHtml;
    if (p.full_form) {
      headHtml = `
        <h2 class="detail-title">${p.front}
          <button class="audio-btn audio-btn--inline" data-speech="${C.escapeAttr(p.front)}" type="button" title="Прослушать" aria-label="Озвучить">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>
          </button>
        </h2>
        <p class="slang-full-form">= ${p.full_form}</p>
        ${p.translation ? `<p class="card-translation">${C.escapeHtml(p.translation)}</p>` : ''}
        <div class="ipa-chips">
          <span class="ipa-chip">полная: ${p.ipa_full} <span class="ru-tr">${Annotate.ruTranscribe(p.ipa_full, p.full_form || '')}</span></span>
          <span class="ipa-chip">сокращённая: ${p.ipa_short} <span class="ru-tr">${Annotate.ruTranscribe(p.ipa_short, p.front)}</span></span>
        </div>`;
    } else {
      headHtml = `
        <h2 class="detail-title">${p.front}
          <button class="audio-btn audio-btn--inline" data-speech="${C.escapeAttr(p.front)}" type="button" title="Прослушать" aria-label="Озвучить">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>
          </button>
        </h2>
        <p class="card-translation">${p.translation || ''}</p>`;
    }

    let extraBlock = '';
    if (p.dialog) extraBlock = `<div class="conversation-dialog">${p.dialog.map((l) => `<p>${String(l).replace(/^\s*[—–-]\s*/, '')}</p>`).join('')}</div>`;
    if (p.context) extraBlock = `<div class="context-note"><span class="context-icon" aria-hidden="true">💡</span><p>${p.context}</p></div>`;
    if (p.category && !p.dialog) extraBlock = `<div class="category-badge">${cardData.type === 'word' && p.pos ? p.pos + ' · ' : ''}${p.category}</div>`;

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
              ${cardData.level ? `<span class="level-badge level-badge--${cardData.level}">${cardData.sublevel || cardData.level}</span>` : ''}
            </span>
          </div>
          ${headHtml}
          ${extraBlock}
          ${p.forms ? verbFormsHtml(p.forms) : ''}
          ${window.TrapsUI && window.Ladder && Ladder.isUsCard(cardData) ? TrapsUI.placeholder(p.front) : ''}
          ${window.Ladder && Ladder.isUsCard(cardData) ? C.ladderButtonHtml(cardData, rec) : ''}
          ${(p.examples || []).length ? `<h3>Примеры</h3>
          <div class="examples">${examplesHtml(p)}</div>` : ''}
          ${errorsBlock}
          ${(p.test || []).length ? `<h3>Проверь себя</h3>
          <div class="test-block">
            <p class="test-progress" id="test-progress">Отвечено 0/${p.test.length}</p>
            ${questionsHtml(p.test)}
          </div>` : ''}
          <div class="srs-area" id="srs-area">${C.srsButtonsHtml(!rec)}</div>
        </div>
      </div>`;
  }

  /* ---------- Minimal Pairs ---------- */

  function renderMinimalPairCard(cardData) {
    const p = cardData.payload;
    const rec = C.state.currentStore && C.vocabCache[C.state.currentStore]
      ? C.vocabCache[C.state.currentStore].progress[cardData.id] : null;
    const isPair = !!p.word2;
    const pairBlock = isPair ? `
      <div class="pair-words">
        <div class="pair-word">
          <button class="audio-btn" data-speech="${C.escapeAttr(p.word1)}" type="button" title="Прослушать" aria-label="Озвучить ${p.word1}">🔊</button>
          <span class="pw-text">${p.word1}</span>
          <span class="ipa">${p.ipa1}</span><span class="ru-tr">${Annotate.ruTranscribe(p.ipa1, p.word1)}</span>
        </div>
        <span class="pair-slash">/</span>
        <div class="pair-word">
          <button class="audio-btn" data-speech="${C.escapeAttr(p.word2)}" type="button" title="Прослушать" aria-label="Озвучить ${p.word2}">🔊</button>
          <span class="pw-text">${p.word2}</span>
          <span class="ipa">${p.ipa2}</span><span class="ru-tr">${Annotate.ruTranscribe(p.ipa2, p.word2)}</span>
        </div>
      </div>
      <h3>Тренажёр на слух</h3>
      <div class="pair-trainer">
        <p class="instruction">${p.audio_test.instruction} До 3 прослушиваний на раунд.</p>
        <button class="play-random" type="button" aria-label="Прослушать случайное слово">🔊</button>
        <div class="pair-options">
          <button class="pair-option" data-word="${C.escapeAttr(p.word1)}" type="button">${p.word1}</button>
          <button class="pair-option" data-word="${C.escapeAttr(p.word2)}" type="button">${p.word2}</button>
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
            <p class="test-progress" id="test-progress">Отвечено 0/${p.test.length}</p>
            ${questionsHtml(p.test)}
          </div>
          <div class="srs-area" id="srs-area">${C.srsButtonsHtml(!rec)}</div>
        </div>
      </div>`;
  }

  function pairPlay() {
    const card = C.state.currentPair;
    if (!card) return;
    const p = card.payload;
    if (!p.word2) { C.speak(p.word1); return; }
    if (!C.pairRound || C.pairRound.done) {
      C.pairRound = { target: Math.random() < 0.5 ? p.word1 : p.word2, tries: 1, done: false };
      document.querySelectorAll('.pair-option').forEach((b) => b.classList.remove('correct', 'wrong'));
    } else {
      C.pairRound.tries++;
    }
    if (C.pairRound.tries > 3) { revealPair(); return; }
    C.speak(C.pairRound.target);
    setPairFeedback('Слушайте… (прослушивание ' + C.pairRound.tries + ' из 3)', '');
  }

  function pairAnswer(btn) {
    if (!C.pairRound) { setPairFeedback('Сначала нажмите 🔊', ''); return; }
    if (C.pairRound.done) { setPairFeedback('Раунд завершён — нажмите 🔊 для нового.', ''); return; }
    const okAns = btn.dataset.word === C.pairRound.target;
    document.querySelectorAll('.pair-option').forEach((b) => {
      b.classList.toggle('correct', b.dataset.word === C.pairRound.target);
    });
    if (okAns) {
      C.pairRound.done = true;
      setPairFeedback('✓ Верно! Это было «' + C.pairRound.target + '».', 'correct');
    } else {
      btn.classList.add('wrong');
      C.pairRound.tries++;
      if (C.pairRound.tries >= 3) revealPair();
      else {
        setPairFeedback('Неверно. Слушайте ещё раз…', 'wrong');
        // Повтор — только если этот же раунд ещё идёт: за 600 мс ученик мог сменить вкладку
        // (ядро обнуляет pairRound), открыть другую пару или начать новый раунд.
        const round = C.pairRound;
        setTimeout(() => { if (C.pairRound === round && !round.done) C.speak(round.target); }, 600);
      }
    }
  }

  function revealPair() {
    if (!C.pairRound) return;
    C.pairRound.done = true;
    document.querySelectorAll('.pair-option').forEach((b) => {
      b.classList.remove('wrong');
      b.classList.toggle('correct', b.dataset.word === C.pairRound.target);
    });
    setPairFeedback('Это было «' + C.pairRound.target + '». Нажмите 🔊 для нового раунда.', 'wrong');
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
    const rec = C.state.currentStore && C.vocabCache[C.state.currentStore]
      ? C.vocabCache[C.state.currentStore].progress[cardData.id] : null;
    C.state.readingText = p.text;
    C.state.readingRate = Number(C.settings.tts_rate) || 0.7;

    const textHtml = p.lines.map((line) => {
      const spans = line.parts.map((pt) => {
        const clickable = /[a-zA-Z]/.test(pt.word);
        return clickable
          ? `<span class="rw pos-${pt.pos}${pt.irr ? ' pos-irr' : ''}" data-w="${C.escapeAttr(pt.word)}" data-ipa="${C.escapeAttr(pt.ipa)}">${pt.word}</span> `
          : `<span class="punct">${pt.word}</span> `;
      }).join('');
      return `<p class="reading-line">${spans}</p>`;
    }).join('');

    const rateSel = [0.5, 0.7, 1.0].map((r) =>
      `<option value="${r}" ${Math.abs(C.state.readingRate - r) < 0.05 ? 'selected' : ''}>${r.toFixed(1)}×</option>`).join('');

    return `
      <div class="section-wrap">
        <div class="card-detail">
          <div class="detail-top">
            <button class="btn btn-ghost back-btn" type="button">← Назад к списку</button>
            <span class="topic-meta">
              ${statusBadgeHtml(rec)}
              <span class="reading-type-badge ${p.reading_type}">${C.READING_TYPES[p.reading_type] || p.reading_type}</span>
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
            <p class="test-progress" id="test-progress">Отвечено 0/${p.questions.length}</p>
            ${questionsHtml(p.questions)}
          </div>
          <div class="srs-area" id="srs-area">${C.srsButtonsHtml(!rec)}</div>
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
    pop.querySelector('.word-audio').addEventListener('click', () => C.speak(word));
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
    if (res.success) C.toast('«' + w + '» — в словарике (×' + rec.frequency + ')', 'success');
    else C.toast('Не удалось добавить: ' + res.error, 'danger');
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
                    <button class="btn btn-ghost wb-del" data-word="${C.escapeAttr(it.word)}" type="button" aria-label="Удалить ${it.word}">Удалить</button>
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
    const data = C.vocabCache[storeName];
    const cardData = data && data.cards.find((c) => c.id === id);
    if (!cardData) { C.toast('Карточка не найдена', 'danger'); return; }
    C.state.currentCardId = id;
    C.state.currentStore = storeName;
    const key = Object.keys(C.VOCAB_STORES).find((k) => C.VOCAB_STORES[k].store === storeName);
    let html;
    if (C.VOCAB_STORES[key].kind === 'minimal') {
      C.state.currentPair = cardData;
      C.pairRound = null;
      html = renderMinimalPairCard(cardData);
    } else if (C.VOCAB_STORES[key].kind === 'reading') {
      html = renderReadingCard(cardData);
    } else {
      html = renderVocabCard(cardData);
    }
    document.getElementById('content').innerHTML = html;
    window.scrollTo(0, 0);
  }

  async function openCardAnywhere(storeName, cardId) {
    if (storeName === 'grammar_cards') {
      await C.ensureGrammarData();
      await C.switchTab('grammar');
      openGrammarCard(cardId);
      return;
    }
    const key = Object.keys(C.VOCAB_STORES).find((k) => C.VOCAB_STORES[k].store === storeName);
    if (!key) { C.toast('Раздел для карточки не найден', 'danger'); return; }
    await C.ensureVocabData(storeName);
    await C.switchTab(key);
    openVocabCard(storeName, cardId);
  }

  return { bind, renderGrammar, examplesHtml, openGrammarCard, renderVocabList, bindLazyLoading, pairPlay, pairAnswer, openWordPopup, closeWordPopup, openWordbank, closeWordbank, openVocabCard, openCardAnywhere };
})();
