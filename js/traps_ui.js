/* ==========================================================================
   English Reboot — Этап 1b: подсветка ловушек русского акцента в интерфейсе
   Файл: traps_ui.js — блок «Ловушки акцента» под фразой: слова с ловушками
   подчёркнуты, чипы ловушек, по клику — объяснение «по-русски vs по-английски»
   и минимальная пара на слух (bad → bed).
   Разметка (traps_us.js) работает по IPA из разметки примеров в IndexedDB,
   поэтому блок рисуется заглушкой placeholder(text), а модуль сам заполняет
   её, когда она появляется в #content (MutationObserver) — шаблонам app.js
   и ladder_ui.js не нужно ничего ждать.
   ========================================================================== */

const TrapsUI = (() => {
  'use strict';

  let lookup = null;
  let loading = null;

  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function ensureLookup() {
    if (lookup) return Promise.resolve(lookup);
    if (!loading) {
      loading = DB.getAll('conversation').then((r) => {
        lookup = AccentTraps.makeLookup((r.success && r.data) || [], window.LEX_US || {});
        return lookup;
      }).catch(() => {
        lookup = AccentTraps.makeLookup([], window.LEX_US || {});
        return lookup;
      });
    }
    return loading;
  }

  // Заглушка для шаблона: заполнится сама
  function placeholder(text, opts) {
    const compact = opts && opts.compact ? ' data-compact="1"' : '';
    return `<div class="traps-block" data-phrase="${esc(text)}"${compact} hidden></div>`;
  }

  function render(block) {
    const text = block.dataset.phrase || '';
    const hits = AccentTraps.findTrapsInPhrase(text, lookup);
    block.dataset.ready = '1';
    if (!hits.length) { block.hidden = true; return; }
    const tokens = text.split(/\s+/).filter(Boolean);
    const byIndex = new Map();
    hits.forEach((h) => { if (!byIndex.has(h.index)) byIndex.set(h.index, []); byIndex.get(h.index).push(h.trap); });
    const order = AccentTraps.TRAPS.map((t) => t.id);
    const used = order.filter((id) => hits.some((h) => h.trap === id));

    const phrase = tokens.map((w, i) => (byIndex.has(i)
      ? `<button class="trap-word" type="button" data-trap="${byIndex.get(i)[0]}" data-traps="${byIndex.get(i).join(' ')}" data-word="${esc(w)}">${esc(w)}</button>`
      : `<span class="trap-plain">${esc(w)}</span>`)).join(' ');
    const chips = used.map((id) => {
      const t = AccentTraps.byId.get(id);
      return `<button class="trap-chip" type="button" data-trap="${id}" title="${esc(t.title)}">${esc(t.short)}</button>`;
    }).join('');

    block.innerHTML = `
      <div class="traps-head"><span class="traps-label">Ловушки акцента</span>
        <span class="traps-hint">нажми на слово или ловушку</span></div>
      ${block.dataset.compact ? '' : `<div class="traps-phrase">${phrase}</div>`}
      <div class="traps-chips">${chips}</div>
      <div class="trap-explain" hidden aria-live="polite"></div>`;
    block.hidden = false;
  }

  function hydrate(root) {
    const blocks = (root || document).querySelectorAll('.traps-block:not([data-ready])');
    if (!blocks.length) return;
    ensureLookup().then(() => blocks.forEach((b) => { if (b.isConnected && !b.dataset.ready) render(b); }));
  }

  /* ---------- Объяснение ловушки ---------- */

  function explain(block, trapId, word) {
    const t = AccentTraps.byId.get(trapId);
    const panel = block.querySelector('.trap-explain');
    if (!t || !panel) return;
    const text = block.dataset.phrase || '';
    const inPhrase = [...new Set(AccentTraps.findTrapsInPhrase(text, lookup)
      .filter((h) => h.trap === trapId).map((h) => h.word.replace(/[^A-Za-z'’-]/g, '')))];
    const pairIdx = Number(panel.dataset.trap === trapId ? panel.dataset.pair || 0 : 0) % t.pairs.length;
    const [a, b] = t.pairs[pairIdx];
    const pairLabel = t.drill === 'same' ? 'звучат почти одинаково' : t.drill === 'contrast' ? 'l в начале и в конце' : 'послушай разницу';
    panel.dataset.trap = trapId;
    panel.dataset.pair = String(pairIdx);
    panel.innerHTML = `
      <p class="trap-title"><b>${esc(t.title)}</b></p>
      <p class="trap-ru">${esc(t.ru)}</p>
      ${inPhrase.length ? `<p class="trap-in">В этой фразе: ${inPhrase.map((w) =>
        `<button class="trap-say" type="button" data-say="${esc(w)}">🔊 ${esc(w)}</button>`).join(' ')}</p>` : ''}
      <div class="trap-pair">
        <button class="btn trap-say-pair" type="button" data-a="${esc(a)}" data-b="${esc(b)}">🔊 ${esc(a)} → ${esc(b)}</button>
        <span class="trap-pair-note">${pairLabel}</span>
        <button class="btn btn-ghost trap-next-pair" type="button">Другая пара</button>
      </div>`;
    panel.hidden = false;
    block.querySelectorAll('.trap-chip, .trap-word').forEach((el) => {
      const on = el.classList.contains('trap-chip') ? el.dataset.trap === trapId
        : (el.dataset.traps || '').split(' ').includes(trapId);
      el.classList.toggle('is-active', on);
    });
  }

  function speak(text, rate) {
    if (window.TTS) TTS.speak(text, rate || 0.7);
  }

  function onClick(e) {
    const block = e.target.closest('.traps-block');
    if (!block) return;
    const word = e.target.closest('.trap-word');
    if (word) {
      // повторный клик по слову листает его ловушки: water → r → w → flap
      const traps = (word.dataset.traps || word.dataset.trap).split(' ');
      const panel = block.querySelector('.trap-explain');
      const cur = panel && !panel.hidden && word.classList.contains('is-active') ? traps.indexOf(panel.dataset.trap) : -1;
      explain(block, traps[(cur + 1) % traps.length], word.dataset.word);
      speak(word.dataset.word.replace(/[^A-Za-z'’ -]/g, ''));
      return;
    }
    const chip = e.target.closest('.trap-chip');
    if (chip) { explain(block, chip.dataset.trap); return; }
    const pair = e.target.closest('.trap-say-pair');
    if (pair) { speak(pair.dataset.a + '. ' + pair.dataset.b + '.', 0.6); return; }
    const say = e.target.closest('.trap-say');
    if (say) { speak(say.dataset.say); return; }
    if (e.target.closest('.trap-next-pair')) {
      const panel = block.querySelector('.trap-explain');
      panel.dataset.pair = String(Number(panel.dataset.pair || 0) + 1);
      explain(block, panel.dataset.trap);
    }
  }

  function init() {
    document.addEventListener('click', onClick);
    const content = document.getElementById('content') || document.body;
    new MutationObserver(() => hydrate(content)).observe(content, { childList: true, subtree: true });
    hydrate(content);
  }

  return { init, placeholder, hydrate, ensureLookup };
})();

if (typeof window !== 'undefined') window.TrapsUI = TrapsUI;
