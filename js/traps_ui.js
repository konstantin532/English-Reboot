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
      </div>
      <button class="btn-primary trap-drill-btn" type="button" data-trap="${trapId}">🎧 Тренажёр: 5 пар на слух</button>`;
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
    const drill = e.target.closest('.trap-drill-btn');
    if (drill) { startDrill(drill.dataset.trap); return; }
    if (e.target.closest('.trap-next-pair')) {
      const panel = block.querySelector('.trap-explain');
      panel.dataset.pair = String(Number(panel.dataset.pair || 0) + 1);
      explain(block, panel.dataset.trap);
    }
  }

  /* ---------- Мини-тренажёр пар (модальное окно) ---------- */

  const COACH = {
    ok: ['Слышишь разницу!', 'Точно!', 'Ухо уже американское.', 'Есть!'],
    miss: ['Коварная пара — послушай ещё раз обе.', 'Почти. Сравни медленно.', 'Это и есть ловушка — теперь ты её знаешь.'],
  };
  const pickLine = (k) => COACH[k][Math.floor(Math.random() * COACH[k].length)];
  const drill = { trap: null, rounds: [], i: 0, correct: 0, answered: false };

  async function savePassport(trapId, ok) {
    try {
      const r = await DB.getSetting('accent_passport');
      const next = AccentTraps.recordResult(r.success ? r.data : null, trapId, ok, window.SRS ? SRS.todayStr() : null);
      await DB.saveSetting('accent_passport', next);
    } catch (e) { /* паспорт — не критично для урока */ }
  }

  function startDrill(trapId) {
    if (!window.ER) return;
    drill.trap = AccentTraps.byId.get(trapId);
    drill.rounds = AccentTraps.buildDrill(trapId, { rounds: 5 });
    drill.i = 0; drill.correct = 0; drill.answered = false;
    ER.showModal('<div class="trap-drill" id="trap-drill"></div>', {});
    const root = document.getElementById('trap-drill');
    root.addEventListener('click', onDrillClick);
    renderRound();
  }

  function renderRound() {
    const root = document.getElementById('trap-drill');
    if (!root) return;
    const t = drill.trap;
    if (drill.i >= drill.rounds.length) {
      const n = drill.rounds.length;
      const line = drill.correct === n ? 'Чисто! Эту ловушку ты слышишь.' : drill.correct >= n - 1 ? 'Почти идеально.' : 'Уши настраиваются — повтори завтра, станет легче.';
      root.innerHTML = `
        <h3>${esc(t.title)}</h3>
        <p class="trap-drill-score"><b>${drill.correct} из ${n}</b> — ${line}</p>
        <p class="setting-hint">Результат записан в паспорт акцента.</p>
        <div class="session-actions">
          <button class="btn-primary" id="trap-drill-again" type="button">Ещё 5 пар</button>
          <button class="btn btn-ghost" id="trap-drill-close" type="button">Закрыть</button>
        </div>`;
      return;
    }
    const r = drill.rounds[drill.i];
    drill.answered = false;
    root.innerHTML = `
      <p class="session-counter">${esc(t.title)} · пара ${drill.i + 1} из ${drill.rounds.length}</p>
      <h3 class="trap-drill-q">${esc(r.prompt)}</h3>
      <div class="trap-drill-play">
        <button class="btn-primary" id="trap-drill-play" type="button">▶ Прослушать</button>
        <button class="btn btn-ghost" id="trap-drill-slow" type="button">🐢 Медленно</button>
      </div>
      <div class="trap-drill-options">${r.options.map((o, i) =>
        `<button class="trap-drill-opt" type="button" data-i="${i}">${esc(o)}</button>`).join('')}</div>
      <div class="trap-drill-feedback" id="trap-drill-feedback" aria-live="polite"></div>
      <div class="session-actions"><button class="btn btn-ghost" id="trap-drill-close" type="button">Закончить</button></div>`;
    setTimeout(() => speak(r.play, 0.75), 200);
  }

  function onDrillClick(e) {
    const r = drill.rounds[drill.i];
    if (e.target.closest('#trap-drill-play') && r) { speak(r.play, 0.75); return; }
    if (e.target.closest('#trap-drill-slow') && r) { speak(r.play, 0.5); return; }
    if (e.target.closest('#trap-drill-close')) { ER.closeModal(); return; }
    if (e.target.closest('#trap-drill-again')) { startDrill(drill.trap.id); return; }
    if (e.target.closest('#trap-drill-next')) { drill.i++; renderRound(); return; }
    const opt = e.target.closest('.trap-drill-opt');
    if (opt && r && !drill.answered) {
      drill.answered = true;
      const i = Number(opt.dataset.i);
      const ok = i === r.correct;
      if (ok) drill.correct++;
      document.querySelectorAll('.trap-drill-opt').forEach((b, j) => {
        b.disabled = true;
        if (j === r.correct) b.classList.add('is-correct'); else if (j === i) b.classList.add('is-wrong');
      });
      const [a, b] = r.pair;
      document.getElementById('trap-drill-feedback').innerHTML = `
        <p class="ladder-verdict ${ok ? 'is-ok' : 'is-miss'}"><b>${pickLine(ok ? 'ok' : 'miss')}</b></p>
        <p class="trap-pair"><button class="btn trap-drill-compare" type="button" data-a="${esc(a)}" data-b="${esc(b)}">🔊 ${esc(a)} → ${esc(b)}</button>
          <button class="btn-primary" id="trap-drill-next" type="button">Дальше →</button></p>`;
      savePassport(drill.trap.id, ok);
      return;
    }
    const cmp = e.target.closest('.trap-drill-compare');
    if (cmp) speak(cmp.dataset.a + '. ' + cmp.dataset.b + '.', 0.6);
  }

  function init() {
    document.addEventListener('click', onClick);
    const content = document.getElementById('content') || document.body;
    new MutationObserver(() => hydrate(content)).observe(content, { childList: true, subtree: true });
    hydrate(content);
  }

  return { init, placeholder, hydrate, ensureLookup, startDrill };
})();

if (typeof window !== 'undefined') window.TrapsUI = TrapsUI;
