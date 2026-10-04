/* ==========================================================================
   English Reboot — Шаг 7: глобальный поиск
   Файл: search.js — Ctrl+K-оверлей, поиск по всем разделам с релевантностью,
   дебаунс 300 мс, фильтры (уровень/статус/раздел), группировка результатов.
   ========================================================================== */

const Search = (() => {
  'use strict';

  let ER = null;
  let progressMap = {};
  let debounceTimer = null;
  let built = false;

  const SECTIONS = [
    { store: 'grammar_cards', label: 'Грамматика' },
    { store: 'phrasal_verbs', label: 'Фразовые глаголы' },
    { store: 'collocations', label: 'Коллокации' },
    { store: 'idioms', label: 'Идиомы' },
    { store: 'conversation', label: 'Разговорные фразы' },
    { store: 'slang', label: 'Сленг' },
    { store: 'minimal_pairs', label: 'Minimal Pairs' },
    { store: 'readings', label: 'Чтение' },
    { store: 'personal_deck', label: 'Моя колода' },
  ];

  function init(er) { ER = er; }

  // Какие поля карточки участвуют в поиске
  function searchableTexts(card) {
    const p = card.payload || {};
    const out = [];
    if (p.title) out.push(p.title);
    if (p.front) out.push(p.front);
    if (p.translation) out.push(p.translation);
    if (p.full_form) out.push(p.full_form);
    if (p.explanation) out.push(p.explanation);
    if (p.text) out.push(p.text);
    if (p.context) out.push(p.context);
    return out;
  }

  function titleOf(card, store) {
    const p = card.payload || {};
    return p.front || p.title || card.id;
  }

  function subtitleOf(card, store) {
    const p = card.payload || {};
    if (p.formula) return p.formula;
    if (p.full_form) return '= ' + p.full_form + (p.translation ? ' · ' + p.translation : '');
    if (p.translation) return p.translation;
    if (p.reading_type) return ({ dialog: 'диалог', article: 'статья', notice: 'объявление' })[p.reading_type] || p.reading_type;
    if (p.articulation) return p.articulation.slice(0, 60);
    if (p.context) return p.context.slice(0, 60);
    return '';
  }

  // Статус карточки: new | learning | mastered
  function statusOf(cardId) {
    const r = progressMap[cardId];
    if (!r) return 'new';
    if (r.status === 'mastered') return 'mastered';
    return 'learning';
  }

  /* ---------- Ядро поиска ---------- */

  async function searchAll(query, filters = {}) {
    const q = String(query || '').trim().toLowerCase();
    if (q.length < 2) return [];

    const prog = await DB.getAllProgress();
    progressMap = {};
    ((prog.success && prog.data) || []).forEach((r) => { progressMap[r.cardId] = r; });

    const results = [];
    for (const sec of SECTIONS) {
      if (filters.section && filters.section !== 'all' && sec.store !== filters.section) continue;
      const res = await DB.getAll(sec.store);
      const cards = (res.success && res.data) || [];
      for (const card of cards) {
        if (filters.level && filters.level !== 'all' && card.level !== filters.level) continue;
        const st = statusOf(card.id);
        if (filters.status && filters.status !== 'all' && st !== filters.status) continue;

        // Релевантность: точное совпадение поля 10 / начало 8 / содержит 5
        let score = 0;
        for (const text of searchableTexts(card)) {
          const t = text.toLowerCase();
          if (t === q) score = Math.max(score, 10);
          else if (t.startsWith(q)) score = Math.max(score, 8);
          else if (t.includes(q)) score = Math.max(score, 5);
        }
        if (!score) continue;

        results.push({
          cardId: card.id,
          storeName: sec.store,
          title: titleOf(card, sec.store),
          subtitle: subtitleOf(card, sec.store),
          level: card.level || '',
          type: card.type || '',
          status: st,
          score,
        });
      }
    }

    results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
    return results.slice(0, 50);
  }

  function searchDebounced(query, filters, callback) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const results = await searchAll(query, filters);
      callback(results);
    }, 300);
  }

  /* ---------- Интерфейс ---------- */

  function renderResults(results) {
    const zone = document.getElementById('search-results');
    if (!results.length) {
      zone.innerHTML = '<div class="search-empty"><p>Ничего не найдено. Попробуй другой запрос.</p></div>';
      return;
    }
    // Группировка в порядке SECTIONS
    const byStore = {};
    results.forEach((r) => { (byStore[r.storeName] = byStore[r.storeName] || []).push(r); });

    zone.innerHTML = SECTIONS.filter((s) => byStore[s.store]).map((s) => `
      <div class="search-group">
        <p class="search-group-title">${s.label} · ${byStore[s.store].length}</p>
        ${byStore[s.store].map((r) => `
          <div class="search-result" data-store="${r.storeName}" data-id="${r.cardId}" role="button" tabindex="0">
            <span class="result-front">${ER.escapeHtml(r.title)}</span>
            <span class="result-sub">${ER.escapeHtml(r.subtitle)}</span>
            ${r.level ? `<span class="result-level">${r.level}</span>` : ''}
            ${r.status !== 'new' ? `<span class="status-badge status-${r.status === 'mastered' ? 'mastered' : 'learning'}">${r.status === 'mastered' ? '✓' : '↻'}</span>` : ''}
          </div>`).join('')}
      </div>`).join('');

    zone.querySelectorAll('.search-result').forEach((el) => {
      const open = () => {
        closeSearch();
        ER.openCardAnywhere(el.dataset.store, el.dataset.id);
      };
      el.addEventListener('click', open);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });
  }

  function openSearch() {
    const overlay = document.getElementById('search-overlay');
    if (!overlay) return;

    if (!built) {
      overlay.innerHTML = `
        <div class="search-box">
          <input type="text" id="search-input" placeholder="Поиск по всем разделам… (минимум 2 символа)" autocomplete="off">
          <button id="search-close" type="button" aria-label="Закрыть">✕</button>
        </div>
        <div class="search-filters">
          <select id="search-level">
            <option value="all">Все уровни</option>
            <option value="A1">A1</option><option value="A2">A2</option>
            <option value="B1">B1</option><option value="B2">B2</option>
          </select>
          <select id="search-status">
            <option value="all">Все статусы</option>
            <option value="new">Новое</option>
            <option value="learning">В работе</option>
            <option value="mastered">Изучено</option>
          </select>
          <select id="search-section">
            <option value="all">Все разделы</option>
            ${SECTIONS.map((s) => `<option value="${s.store}">${s.label}</option>`).join('')}
          </select>
        </div>
        <div class="search-results" id="search-results">
          <p class="search-hint">Начни вводить для поиска…<br><small>Ctrl+K — открыть, Esc — закрыть</small></p>
        </div>`;

      const input = document.getElementById('search-input');
      const collect = () => ({
        level: document.getElementById('search-level').value,
        status: document.getElementById('search-status').value,
        section: document.getElementById('search-section').value,
      });
      const run = () => {
        const v = input.value;
        if (v.trim().length < 2) {
          document.getElementById('search-results').innerHTML =
            '<p class="search-hint">Начни вводить для поиска…</p>';
          return;
        }
        searchDebounced(v, collect(), renderResults);
      };
      input.addEventListener('input', run);
      ['search-level', 'search-status', 'search-section'].forEach((id) => {
        document.getElementById(id).addEventListener('change', run);
      });
      document.getElementById('search-close').addEventListener('click', closeSearch);
      overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) closeSearch(); });
      built = true;
    }

    overlay.hidden = false;
    setTimeout(() => document.getElementById('search-input').focus(), 30);
  }

  function closeSearch() {
    const overlay = document.getElementById('search-overlay');
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    const input = document.getElementById('search-input');
    if (input) input.value = '';
    document.getElementById('search-results').innerHTML =
      '<p class="search-hint">Начни вводить для поиска…</p>';
  }

  return { init, searchAll, searchDebounced, openSearch, closeSearch };
})();
