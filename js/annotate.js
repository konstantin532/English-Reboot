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


  /* ---------- IPA → русская транскрипция (американское произношение) ----------
     Британская IPA из данных переводится в «как слышится в США»:
     ɒ → «а», r после гласной звучит (car → кар), безударное -er → «эр».
     Ударный слог помечается знаком ударения над гласной (ˈ → ́). */
  const RU_MAP = [
    ['tʃ', 'ч'], ['dʒ', 'дж'], ['ts', 'ц'],
    ['eɪ', 'эй'], ['aɪ', 'ай'], ['ɔɪ', 'ой'], ['aʊ', 'ау'], ['əʊ', 'оу'], ['oʊ', 'оу'],
    ['ɪə', 'иэ'], ['eə', 'э'], ['ɛə', 'э'], ['ʊə', 'уэ'],
    ['iː', 'и'], ['uː', 'у'], ['ɑː', 'а'], ['ɔː', 'о'], ['ɜː', 'ё'], ['ɝ', 'ёр'], ['ɚ', 'эр'],
    ['i', 'и'], ['ɪ', 'и'], ['e', 'э'], ['ɛ', 'э'], ['æ', 'э'], ['ʌ', 'а'], ['ɑ', 'а'], ['ɒ', 'а'],
    ['ɔ', 'о'], ['ʊ', 'у'], ['u', 'у'], ['ə', 'э'], ['ɐ', 'а'], ['o', 'о'], ['a', 'а'],
    ['p', 'п'], ['b', 'б'], ['t', 'т'], ['d', 'д'], ['k', 'к'], ['g', 'г'], ['ɡ', 'г'],
    ['f', 'ф'], ['v', 'в'], ['θ', 'с'], ['ð', 'з'], ['s', 'с'], ['z', 'з'], ['ʃ', 'ш'], ['ʒ', 'ж'],
    ['h', 'х'], ['m', 'м'], ['n', 'н'], ['ŋ', 'нг'], ['l', 'л'], ['r', 'р'], ['ɹ', 'р'], ['ɾ', 'д'],
    ['j', 'й'], ['w', 'у'], ['x', 'х'], ['ʔ', ''],
  ];
  const RU_VOWEL = /[аэиоуёыяею]/;
  // Гласные, после которых в американском звучит «р», если в написании есть r
  const R_COLOR = new Set(['ɑː', 'ɔː', 'ɜː', 'ɪə', 'eə', 'ɛə', 'ʊə', 'ə']);
  const IOT = { 'а': 'я', 'э': 'е', 'у': 'ю', 'о': 'ё', 'ё': 'ё' }; // й + гласная

  const R_FORM = { 'ɪə': 'ир', 'eə': 'эр', 'ɛə': 'эр', 'ʊə': 'ур' }; // here → хир, there → зэр

  function ruWord(ipa, word) {
    const src = String(ipa || '').replace(/[/[\]()]/g, '').trim();
    if (!src) return '';
    const w = String(word || '').toLowerCase();
    // Сколько «послегласных» r в написании (car, bird, water, here)
    // минус r, уже записанные в самой IPA (американская IPA: kɑr, ˈdɪnɚ)
    const rCount = Math.max(0, (w.match(/[aeiouy]+r+(?![aeiouy])|[aeiouy]re$/g) || []).length
      - (src.match(/[rɹɝɚ]/g) || []).length);
    // Проход 1: токены IPA
    const toks = [];
    let stressNext = false, i = 0;
    while (i < src.length) {
      const ch = src[i];
      if (ch === 'ˈ') { stressNext = true; i++; continue; }
      if ('ˌː.‿-'.includes(ch)) { i++; continue; }
      const hit = RU_MAP.find(([k]) => src.startsWith(k, i));
      if (!hit) { i++; continue; }
      i += hit[0].length;
      const nextIsR = /^[ː.ˈˌ]*[rɹ]/.test(src.slice(i));
      toks.push({ key: hit[0], ru: hit[1], stress: false, stressMark: stressNext, r: false, rOk: R_COLOR.has(hit[0]) && !nextIsR });
      if (RU_VOWEL.test(hit[1])) stressNext = false;
    }
    for (let k = 0; k < toks.length; k++) if (toks[k].stressMark && !RU_VOWEL.test(toks[k].ru)) { toks[k].stressMark = false; const v = toks.slice(k + 1).find((x) => RU_VOWEL.test(x.ru)); if (v) v.stressMark = true; }
    // «р» получают последние подходящие гласные (water → уотэр, answer → эн­сэр)
    let left = rCount;
    for (let k = toks.length - 1; k >= 0 && left > 0; k--) if (toks[k].rOk) { toks[k].r = true; left--; }
    // Проход 2: сборка
    let out = '';
    toks.forEach((t, k) => {
      let ru = t.r && R_FORM[t.key] ? R_FORM[t.key] : t.ru + (t.r ? 'р' : '');
      // «Bath»-слова: британское ɑː, американское æ (answer, can't, ask, dance, after)
      if (t.key === 'ɑː' && !t.r && /a(s[kpt]|ff?|ft|th|n[tcd]|nce|nsw|ugh|lf)/.test(w) && !/ar/.test(w)) ru = 'э';
      if (t.key === 'ŋ' && toks[k + 1] && /^[kgɡ]$/.test(toks[k + 1].key)) ru = 'н';
      if (out.endsWith('й') && IOT[ru[0]] && !/[аэиоуё]/.test(out.slice(-2, -1))) {
        out = out.slice(0, -1); ru = IOT[ru[0]] + ru.slice(1);
      }
      if (t.stressMark && RU_VOWEL.test(ru)) {
        const v = ru.search(RU_VOWEL);
        ru = ru.slice(0, v + 1) + '́' + ru.slice(v + 1);
      }
      out += ru;
    });
    return out;
  }

  // Фраза: IPA и текст бьются по пробелам; при несовпадении числа слов r-подсказки не используются
  function ruTranscribe(ipa, text) {
    const ip = String(ipa || '').replace(/[/[\]]/g, '').trim().split(/\s+/).filter(Boolean);
    const ws = String(text || '').replace(/[^A-Za-z' -]/g, ' ').trim().split(/\s+/).filter(Boolean);
    return ip.map((x, k) => ruWord(x, ip.length === ws.length ? ws[k] : '')).join(' ');
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
      ` data-pos="${p.pos || ''}" data-w="${escapeAttr(word)}"` +
      (p.ipa ? ` data-ipa="${p.ipa}"` : '') +
      ((p.silent || []).length ? ` data-silent="${p.silent.join(',')}"` : '') +
      ((p.surprise || []).length ? ` data-surprise="${p.surprise.join(',')}"` : '');

    return `<span class="word-token"${dataAttrs}>` +
      `<span class="word-text${p.pos ? ` pos-${p.pos}` : ''}">${inner}</span>` +
      (p.ipa ? `<span class="ipa">${p.ipa}</span><span class="ru-tr">${ruWord(p.ipa, word)}</span>` : '') +
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

  return { init, ruWord, ruTranscribe, renderParts, renderExample, examplesHtml, firstExampleText, splitSyllables };
})();
