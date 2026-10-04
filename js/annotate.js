/* ==========================================================================
   English Reboot — Шаг 6: слои разметки
   Файл: annotate.js — рендер parts → HTML с классами слоёв.
   Рендерится ПОЛНАЯ структура (все обёртки + data-атрибуты);
   видимость слоёв управляется классами layer-*-off на <body>
   (мгновенное переключение без перерисовки).
   ========================================================================== */

const Annotate = (() => {
  'use strict';

  let getSettings = () => ({});

  function init(settingsGetter) { getSettings = settingsGetter || getSettings; }

  /* ---------- Эвристическая разбивка на слоги ---------- */
  // Вокальные группы = ядра слогов; согласные между ними делятся пополам.
  // Возвращает [{text, start}] или null для односложных/не-слов.
  function splitSyllables(word) {
    if (!/^[a-zA-Z'-]+$/.test(word)) return null;
    const groups = [];
    let i = 0;
    while (i < word.length) {
      if (/[aeiouy]/i.test(word[i])) {
        let j = i;
        while (j < word.length && /[aeiouy]/i.test(word[j])) j++;
        groups.push([i, j]);
        i = j;
      } else i++;
    }
    if (groups.length <= 1) return null;
    const starts = [0];
    for (let g = 1; g < groups.length; g++) {
      const prevEnd = groups[g - 1][1], curStart = groups[g][0];
      starts.push(prevEnd + Math.ceil((curStart - prevEnd) / 2));
    }
    return starts.map((from, s) => ({
      text: word.slice(from, s + 1 < starts.length ? starts[s + 1] : word.length),
      start: from,
    }));
  }

  // Кусок текста с обёртками silent/surprise (surprise приоритетнее)
  function wrapChars(text, baseOffset, silentSet, surpriseSet) {
    let html = '', buf = '', bufType = null;
    const flush = () => {
      if (!buf) return;
      html += bufType === 'silent' ? `<span class="silent-letter">${buf}</span>`
            : bufType === 'surprise' ? `<span class="surprise-sound">${buf}</span>`
            : buf;
      buf = '';
    };
    for (let k = 0; k < text.length; k++) {
      const idx = baseOffset + k;
      const type = surpriseSet.has(idx) ? 'surprise' : silentSet.has(idx) ? 'silent' : null;
      if (type !== bufType) { flush(); bufType = type; }
      buf += text[k];
    }
    flush();
    return html;
  }

  /* ---------- Одно слово ---------- */
  function renderWordToken(p) {
    const word = String(p.word || '');
    const silentSet = new Set(p.silent || []);
    const surpriseSet = new Set(p.surprise || []);
    surpriseSet.forEach((i) => silentSet.delete(i)); // surprise > silent

    // Внутренность word-text: слоги (для stress) × посимвольные обёртки
    let inner;
    const syl = (p.stress !== undefined && p.stress !== null) ? splitSyllables(word) : null;
    if (syl) {
      inner = syl.map((seg, si) => {
        const chunk = wrapChars(seg.text, seg.start, silentSet, surpriseSet);
        return si === Number(p.stress)
          ? `<span class="stress">${chunk}</span>` : chunk;
      }).join('');
    } else {
      inner = wrapChars(word, 0, silentSet, surpriseSet);
    }

    const dataAttrs =
      ` data-pos="${p.pos || ''}"` +
      (p.ipa ? ` data-ipa="${p.ipa}"` : '') +
      ((p.silent || []).length ? ` data-silent="${p.silent.join(',')}"` : '') +
      ((p.surprise || []).length ? ` data-surprise="${p.surprise.join(',')}"` : '');

    return `<span class="word-token"${dataAttrs}>` +
      `<span class="word-text${p.pos ? ` pos-${p.pos}` : ''}">${inner}</span>` +
      (p.ipa ? `<span class="ipa">${p.ipa}</span>` : '') +
      `</span>`;
  }

  function renderParts(parts) {
    return (parts || []).map(renderWordToken).join(' ');
  }

  /* ---------- Пример ---------- */
  function renderExample(ex) {
    return `
      <div class="example">
        <div class="example-text">${renderParts(ex.parts)}</div>
        <button class="audio-btn" data-speech="${escapeAttr(ex.text)}" type="button"
                title="Прослушать" aria-label="Прослушать пример">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>
          </svg>
        </button>
        ${ex.connected
          ? `<p class="connected-text"><span class="connected-label">Слитно:</span> <span class="connected">${ex.connected}</span></p>`
          : ''}
      </div>`;
  }

  function examplesHtml(list) { return (list || []).map(renderExample).join(''); }

  /* ---------- Первый текст карточки (для диктанта/shadowing) ---------- */
  function firstExampleText(card) {
    const p = card.payload || {};
    if (p.examples && p.examples.length) return p.examples[0].text;
    if (p.lines && p.lines.length) return p.lines[0].text;
    if (p.text) return p.text.split('\n')[0];
    return null;
  }

  function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { init, renderParts, renderExample, examplesHtml, firstExampleText, splitSyllables };
})();
